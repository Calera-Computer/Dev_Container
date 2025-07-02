package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/google/uuid"
)

// Note represents a note item
type Note struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// NotesStore handles note persistence
type NotesStore struct {
	dataDir string
}

func NewNotesStore(dataDir string) *NotesStore {
	os.MkdirAll(dataDir, 0755)
	return &NotesStore{dataDir: dataDir}
}

func (ns *NotesStore) getNotesFile() string {
	return filepath.Join(ns.dataDir, "notes.json")
}

func (ns *NotesStore) loadNotes() ([]Note, error) {
	file := ns.getNotesFile()
	data, err := ioutil.ReadFile(file)
	if err != nil {
		if os.IsNotExist(err) {
			return []Note{}, nil
		}
		return nil, err
	}

	var notes []Note
	err = json.Unmarshal(data, &notes)
	return notes, err
}

func (ns *NotesStore) saveNotes(notes []Note) error {
	data, err := json.MarshalIndent(notes, "", "  ")
	if err != nil {
		return err
	}
	return ioutil.WriteFile(ns.getNotesFile(), data, 0644)
}

func (ns *NotesStore) getAllNotes() ([]Note, error) {
	return ns.loadNotes()
}

func (ns *NotesStore) createNote(title, content string) (*Note, error) {
	notes, err := ns.loadNotes()
	if err != nil {
		return nil, err
	}

	note := Note{
		ID:        uuid.New().String(),
		Title:     title,
		Content:   content,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	notes = append(notes, note)
	err = ns.saveNotes(notes)
	return &note, err
}

func (ns *NotesStore) updateNote(id, title, content string) (*Note, error) {
	notes, err := ns.loadNotes()
	if err != nil {
		return nil, err
	}

	for i, note := range notes {
		if note.ID == id {
			notes[i].Title = title
			notes[i].Content = content
			notes[i].UpdatedAt = time.Now()
			err = ns.saveNotes(notes)
			return &notes[i], err
		}
	}

	return nil, fmt.Errorf("note not found")
}

func (ns *NotesStore) deleteNote(id string) error {
	notes, err := ns.loadNotes()
	if err != nil {
		return err
	}

	for i, note := range notes {
		if note.ID == id {
			notes = append(notes[:i], notes[i+1:]...)
			return ns.saveNotes(notes)
		}
	}

	return fmt.Errorf("note not found")
}

var notesStore *NotesStore

func main() {
	app := fiber.New()

	// Initialize notes store
	notesStore = NewNotesStore("/app/data")

	// API routes
	app.Get("/api/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"message": "Notes app is running!",
		})
	})

	app.Get("/api/info", func(c *fiber.Ctx) error {
		notes, _ := notesStore.getAllNotes()
		return c.JSON(fiber.Map{
			"app":         "Notes App",
			"version":     "1.0.0",
			"message":     "A simple note-taking application with CRUD operations.",
			"total_notes": len(notes),
		})
	})

	// Notes CRUD API
	app.Get("/api/notes", func(c *fiber.Ctx) error {
		notes, err := notesStore.getAllNotes()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"notes": notes})
	})

	app.Post("/api/notes", func(c *fiber.Ctx) error {
		var req struct {
			Title   string `json:"title"`
			Content string `json:"content"`
		}

		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		if req.Title == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Title is required"})
		}

		note, err := notesStore.createNote(req.Title, req.Content)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}

		return c.Status(201).JSON(fiber.Map{"note": note})
	})

	app.Put("/api/notes/:id", func(c *fiber.Ctx) error {
		id := c.Params("id")
		var req struct {
			Title   string `json:"title"`
			Content string `json:"content"`
		}

		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		if req.Title == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Title is required"})
		}

		note, err := notesStore.updateNote(id, req.Title, req.Content)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(fiber.Map{"note": note})
	})

	app.Delete("/api/notes/:id", func(c *fiber.Ctx) error {
		id := c.Params("id")

		err := notesStore.deleteNote(id)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(fiber.Map{"message": "Note deleted successfully"})
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
