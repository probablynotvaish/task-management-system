package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/probablynotvaish/task-management-system/backend/internal/database"
	"github.com/probablynotvaish/task-management-system/backend/internal/handler"
	"github.com/probablynotvaish/task-management-system/backend/internal/repository"
	"github.com/probablynotvaish/task-management-system/backend/internal/service"
	"github.com/probablynotvaish/task-management-system/backend/pkg/logger"
	"fmt"
	"net/http"

	"github.com/probablynotvaish/task-management-system/backend/internal/config"
	"github.com/probablynotvaish/task-management-system/backend/internal/routes"
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

	userService := service.NewUserService(userRepo)

	authHandler := handler.NewAuthHandler(userService)

	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/auth/signup", authHandler.Signup)
	mux.HandleFunc("POST /api/auth/login", authHandler.Login)

	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}

	slog.Info("server listening", "port", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		slog.Error("server failed", "error", err)
		os.Exit(1)
	}
	config.ConnectDB()

	routes.RegisterRoutes()

	fmt.Println("Server running on port 8080")

	http.ListenAndServe(":8080", nil)
}

