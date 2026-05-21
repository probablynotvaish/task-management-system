package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"github.com/rs/cors"
	"github.com/joho/godotenv"
	"github.com/probablynotvaish/task-management-system/backend/internal/database"
	"github.com/probablynotvaish/task-management-system/backend/internal/repository"
	"github.com/probablynotvaish/task-management-system/backend/internal/routes"
	"github.com/probablynotvaish/task-management-system/backend/internal/service"
	"github.com/probablynotvaish/task-management-system/backend/pkg/logger"

	"github.com/probablynotvaish/task-management-system/backend/internal/handlers"
)

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

	userService := service.NewUserService(userRepo)
	taskService := service.NewTaskService(taskRepo)

	authHandler := handlers.NewAuthHandler(userService)

	taskHandler := handlers.NewTaskHandler(taskService)

	mux := http.NewServeMux()

	routes.RegisterRoutes(mux, taskHandler, authHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	c := cors.New(cors.Options{
	AllowedOrigins: []string{
		"https://task-management-system-sigma-roan.vercel.app",
	},
	AllowedMethods: []string{
		"GET",
		"POST",
		"PUT",
		"DELETE",
		"OPTIONS",
	},
	AllowedHeaders: []string{"*"},
	AllowCredentials: true,
})

handler := c.Handler(mux)

slog.Info("server listening", "port", port)

if err := http.ListenAndServe(":"+port, handler); err != nil {
	slog.Error("server failed", "error", err)
	os.Exit(1)
}
}