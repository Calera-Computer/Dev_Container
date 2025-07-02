package main

import (
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
)

func main() {
	app := fiber.New()

	// API routes
	app.Get("/api/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"message": "Hello from your containerized app!",
		})
	})

	app.Get("/api/info", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"app":     "Containerized App Template",
			"version": "1.0.0",
			"message": "This is your own isolated instance.",
		})
	})

	// Serve static files from frontend_dist
	app.Use("/", filesystem.New(filesystem.Config{
		Root:   http.Dir("./frontend_dist"),
		Browse: false,
		Index:  "index.html",
	}))

	// Catch-all route for SPA (Single Page Application) support
	app.Get("/*", func(c *fiber.Ctx) error {
		return c.SendFile("./frontend_dist/index.html")
	})

	app.Listen(":8081")
}
