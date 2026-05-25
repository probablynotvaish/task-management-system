package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/probablynotvaish/task-management-system/backend/internal/database"
	"github.com/probablynotvaish/task-management-system/backend/internal/handlers"
	"github.com/probablynotvaish/task-management-system/backend/internal/repository"
	"github.com/probablynotvaish/task-management-system/backend/internal/routes"
	"github.com/probablynotvaish/task-management-system/backend/internal/service"
	"github.com/probablynotvaish/task-management-system/backend/internal/worker"
	"github.com/probablynotvaish/task-management-system/backend/pkg/logger"
	"github.com/rs/cors"
)

func allowedOrigins() []string {
	raw := os.Getenv("ALLOWED_ORIGINS")
	if raw == "" {
		return []string{"http://localhost:5173"}
	}
	origins := []string{}
	for _, o := range strings.Split(raw, ",") {
		if trimmed := strings.TrimSpace(o); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}

func main() {
	if err := godotenv.Load(); err != nil {
		slog.Warn("could not load .env file, using system environment", "error", err)
	}

	logger.Init()

	slog.Info("starting Task Management System")

	ctx := context.Background()
	db, err := database.Connect(ctx)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer database.Disconnect(ctx, db)

	userRepo := repository.NewMongoUserRepository(db)
	taskRepo := repository.NewMongoTaskRepository(db)
	notifRepo := repository.NewMongoNotificationRepository(db)

	userService := service.NewUserService(userRepo)
	taskService := service.NewTaskService(taskRepo)

	authHandler := handlers.NewAuthHandler(userService)
	taskHandler := handlers.NewTaskHandler(taskService)
	notifHandler := handlers.NewNotificationHandler(notifRepo)
	aiHandler := handlers.NewAIHandler(taskService)

	notificationWorker := worker.NewNotifier(db, notifRepo)
	notificationWorker.Start()

	mux := http.NewServeMux()
	routes.RegisterRoutes(mux, taskHandler, authHandler, notifHandler, aiHandler)

	origins := allowedOrigins()
	slog.Info("CORS allowed origins", "origins", origins)

	c := cors.New(cors.Options{
		AllowedOrigins: origins,
		AllowedMethods: []string{
			"GET",
			"POST",
			"PUT",
			"PATCH",
			"DELETE",
			"OPTIONS",
		},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "Accept"},
		AllowCredentials: true,
	})

	handler := c.Handler(mux)

	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = os.Getenv("PORT")
	}
	if port == "" {
		port = "8080"
	}

	slog.Info("server listening", "port", port)

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		slog.Error("server failed", "error", err)
		os.Exit(1)
	}
}