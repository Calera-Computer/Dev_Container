package main

import (
	"context"
	"fmt"
	"strings"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/mount"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// Template represents an available app template
type Template struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Image       string `json:"image"`
	Port        string `json:"port"`
}

// LaunchRequest represents the request body for launching a container
type LaunchRequest struct {
	Template string `json:"template"`
}

// getAvailableTemplates returns the list of available templates
func getAvailableTemplates() []Template {
	return []Template{
		{
			ID:          "app_template",
			Name:        "Basic Web App",
			Description: "A simple Go Fiber + React application with health monitoring",
			Image:       "app_template:latest",
			Port:        "8081",
		},
		{
			ID:          "note_template",
			Name:        "Notes App",
			Description: "A note-taking application with CRUD operations",
			Image:       "note_template:latest",
			Port:        "8081",
		},
	}
}

func launchHandler(c *fiber.Ctx) error {
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Parse request body for template selection
	var req LaunchRequest
	if err := c.BodyParser(&req); err != nil {
		// Default to app_template if no template specified or parsing fails
		req.Template = "app_template"
	}

	// Get available templates
	templates := getAvailableTemplates()
	var selectedTemplate *Template
	for _, tmpl := range templates {
		if tmpl.ID == req.Template {
			selectedTemplate = &tmpl
			break
		}
	}

	// Default to first template if not found
	if selectedTemplate == nil {
		selectedTemplate = &templates[0]
	}

	imageName := selectedTemplate.Image
	containerPort := selectedTemplate.Port

	// Check if image exists
	_, _, err = cli.ImageInspectWithRaw(ctx, imageName)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": fmt.Sprintf("Image not found: %s. Please build the %s image first.", imageName, selectedTemplate.Name),
		})
	}

	// Generate a unique ID for the tenant/container BEFORE creation
	tenantID := uuid.New().String()

	natContainerPort := nat.Port(containerPort + "/tcp")

	// Define the container configuration with dynamic labels based on tenantID
	containerConfig := &container.Config{
		Image:        imageName,
		ExposedPorts: nat.PortSet{natContainerPort: struct{}{}},
		Labels: map[string]string{
			"traefik.enable": "true",
			// Define a router for this tenant container using the generated tenantID
			"traefik.http.routers." + tenantID + ".rule": "Host(`" + tenantID + ".localhost`)",
			// Define the service the router will use, pointing to the container's internal port
			"traefik.http.services." + tenantID + ".loadbalancer.server.port": containerPort,
			// Add template information to labels for identification
			"template.id":   selectedTemplate.ID,
			"template.name": selectedTemplate.Name,
		},
	}

	// Define the host configuration with dynamic mounts based on tenantID
	hostConfig := &container.HostConfig{
		// Add volume mounting for data isolation using the generated tenantID
		Mounts: []mount.Mount{
			{
				Type:   mount.TypeVolume,
				Source: "tenant_data_" + tenantID, // Unique volume name based on tenantID
				Target: "/app/data",               // Path inside the container where data is stored
			},
		},
	}

	// Define network configuration to connect to the same network as Traefik
	networkConfig := &network.NetworkingConfig{
		EndpointsConfig: map[string]*network.EndpointSettings{
			"dev_container_default": {}, // Connect to the docker-compose network
		},
	}

	// Create the container with network configuration
	resp, err := cli.ContainerCreate(ctx, containerConfig, hostConfig, networkConfig, nil, "")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	err = cli.ContainerStart(ctx, resp.ID, container.StartOptions{})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message":      fmt.Sprintf("%s container launched!", selectedTemplate.Name),
		"container_id": resp.ID,
		"template":     selectedTemplate,
		"tenant_id":    tenantID,
		// Update the URL to reflect Traefik routing using the tenantID
		"url": fmt.Sprintf("http://%s.localhost", tenantID),
	})
}

// deleteHandler handles DELETE requests to stop and remove containers
func deleteHandler(c *fiber.Ctx) error {
	containerID := c.Params("containerID")
	if containerID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Container ID is required"})
	}

	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Check if container exists
	_, err = cli.ContainerInspect(ctx, containerID)
	if err != nil {
		if client.IsErrNotFound(err) {
			return c.Status(404).JSON(fiber.Map{"error": "Container not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Stop the container (with a timeout of 10 seconds)
	timeout := 10
	err = cli.ContainerStop(ctx, containerID, container.StopOptions{Timeout: &timeout})
	if err != nil {
		// Container might already be stopped, log but continue
		fmt.Printf("Warning: Failed to stop container %s: %v\n", containerID, err)
	}

	// Remove the container
	err = cli.ContainerRemove(ctx, containerID, container.RemoveOptions{Force: true})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Failed to remove container: %v", err)})
	}

	return c.JSON(fiber.Map{
		"message":      "Container deleted successfully",
		"container_id": containerID,
	})
}

// listContainersHandler returns a list of containers created by this orchestrator
func listContainersHandler(c *fiber.Ctx) error {
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// List all containers (including stopped ones)
	containers, err := cli.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Filter containers created by this orchestrator (they should have traefik labels)
	var orchestratorContainers []fiber.Map
	for _, container := range containers {
		// Check if this container has our orchestrator's traefik labels
		hasOrchLabel := false
		tenantID := ""
		templateID := ""
		templateName := ""
		for key, value := range container.Labels {
			if strings.HasPrefix(key, "traefik.http.routers.") && strings.Contains(value, ".localhost") {
				hasOrchLabel = true
				// Extract tenant ID from the router name
				parts := strings.Split(key, ".")
				if len(parts) >= 4 {
					tenantID = parts[3]
				}
			}
			if key == "template.id" {
				templateID = value
			}
			if key == "template.name" {
				templateName = value
			}
		}

		if hasOrchLabel {
			// Extract the URL from labels
			url := ""
			if tenantID != "" {
				url = fmt.Sprintf("http://%s.localhost", tenantID)
			}

			orchestratorContainers = append(orchestratorContainers, fiber.Map{
				"id":            container.ID[:12], // Short ID for display
				"full_id":       container.ID,
				"image":         container.Image,
				"state":         container.State,
				"status":        container.Status,
				"names":         container.Names,
				"url":           url,
				"tenant_id":     tenantID,
				"template_id":   templateID,
				"template_name": templateName,
			})
		}
	}

	return c.JSON(fiber.Map{
		"containers": orchestratorContainers,
	})
}

// templatesHandler returns available templates
func templatesHandler(c *fiber.Ctx) error {
	templates := getAvailableTemplates()
	return c.JSON(fiber.Map{
		"templates": templates,
	})
}

// containerControlHandler handles start/stop/restart operations
func containerControlHandler(c *fiber.Ctx) error {
	containerID := c.Params("containerID")
	action := c.Params("action")

	if containerID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Container ID is required"})
	}

	if action != "start" && action != "stop" && action != "restart" {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid action. Use start, stop, or restart"})
	}

	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Check if container exists
	_, err = cli.ContainerInspect(ctx, containerID)
	if err != nil {
		if client.IsErrNotFound(err) {
			return c.Status(404).JSON(fiber.Map{"error": "Container not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	switch action {
	case "start":
		err = cli.ContainerStart(ctx, containerID, container.StartOptions{})
	case "stop":
		timeout := 10
		err = cli.ContainerStop(ctx, containerID, container.StopOptions{Timeout: &timeout})
	case "restart":
		timeout := 10
		err = cli.ContainerRestart(ctx, containerID, container.StopOptions{Timeout: &timeout})
	}

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Failed to %s container: %v", action, err)})
	}

	return c.JSON(fiber.Map{
		"message":      fmt.Sprintf("Container %sed successfully", action),
		"container_id": containerID,
		"action":       action,
	})
}

// containerLogsHandler fetches container logs
func containerLogsHandler(c *fiber.Ctx) error {
	containerID := c.Params("containerID")

	if containerID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Container ID is required"})
	}

	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Check if container exists
	_, err = cli.ContainerInspect(ctx, containerID)
	if err != nil {
		if client.IsErrNotFound(err) {
			return c.Status(404).JSON(fiber.Map{"error": "Container not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Get container logs
	logOptions := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Tail:       "100", // Last 100 lines
		Timestamps: true,
	}

	logs, err := cli.ContainerLogs(ctx, containerID, logOptions)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Failed to get logs: %v", err)})
	}
	defer logs.Close()

	// Read logs content
	logBytes := make([]byte, 8192) // Read up to 8KB of logs
	n, err := logs.Read(logBytes)
	if err != nil && err.Error() != "EOF" {
		return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Failed to read logs: %v", err)})
	}

	logContent := string(logBytes[:n])
	if logContent == "" {
		logContent = "No logs available"
	}

	return c.JSON(fiber.Map{
		"logs":         logContent,
		"container_id": containerID,
	})
}

// containerInspectHandler returns detailed container information
func containerInspectHandler(c *fiber.Ctx) error {
	containerID := c.Params("containerID")

	if containerID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Container ID is required"})
	}

	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Get detailed container information
	containerInfo, err := cli.ContainerInspect(ctx, containerID)
	if err != nil {
		if client.IsErrNotFound(err) {
			return c.Status(404).JSON(fiber.Map{"error": "Container not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Create a simplified version of container details for frontend
	details := fiber.Map{
		"id":               containerInfo.ID,
		"name":             containerInfo.Name,
		"state":            containerInfo.State,
		"config":           containerInfo.Config,
		"created":          containerInfo.Created,
		"path":             containerInfo.Path,
		"args":             containerInfo.Args,
		"image":            containerInfo.Image,
		"platform":         containerInfo.Platform,
		"mount_label":      containerInfo.MountLabel,
		"process_label":    containerInfo.ProcessLabel,
		"restart_count":    containerInfo.RestartCount,
		"driver":           containerInfo.Driver,
		"mounts":           containerInfo.Mounts,
		"network_settings": containerInfo.NetworkSettings,
		"log_path":         containerInfo.LogPath,
	}

	return c.JSON(fiber.Map{
		"details":      details,
		"container_id": containerID,
	})
}

func main() {
	app := fiber.New()

	// Enable CORS for frontend
	app.Use(func(c *fiber.Ctx) error {
		c.Set("Access-Control-Allow-Origin", "*")
		c.Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		c.Set("Access-Control-Allow-Headers", "Content-Type")

		if c.Method() == "OPTIONS" {
			return c.SendStatus(200)
		}

		return c.Next()
	})

	app.Post("/launch", launchHandler)
	app.Post("/api/launch", launchHandler)
	app.Delete("/api/launch/:containerID", deleteHandler)
	app.Get("/api/containers", listContainersHandler)
	app.Get("/api/templates", templatesHandler)

	// New container control endpoints
	app.Post("/api/containers/:containerID/:action", containerControlHandler)
	app.Get("/api/containers/:containerID/logs", containerLogsHandler)
	app.Get("/api/containers/:containerID/inspect", containerInspectHandler)

	app.Listen(":8080")
}
