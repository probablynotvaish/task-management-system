package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"github.com/joho/godotenv"

	"github.com/probablynotvaish/task-management-system/backend/internal/database"
	"github.com/probablynotvaish/task-management-system/backend/internal/handlers"
	"github.com/probablynotvaish/task-management-system/backend/internal/repository"
	"github.com/probablynotvaish/task-management-system/backend/internal/routes"
	"github.com/probablynotvaish/task-management-system/backend/internal/service"
	"github.com/probablynotvaish/task-management-system/backend/pkg/logger"
)

func main() {
	if err := godotenv.Load(); err != nil {
		slog.Warn("could not load .env file, using system environment", "error", err)
	}

	logger.Init()
	slog.Info("starting Task Management System in lambda mode")

	ctx := context.Background()
	db, err := database.Connect(ctx)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}

	userRepo := repository.NewMongoUserRepository(db)
	taskRepo := repository.NewMongoTaskRepository(db)

	userService := service.NewUserService(userRepo)
	taskService := service.NewTaskService(taskRepo)

	authHandler := handlers.NewAuthHandler(userService)
	taskHandler := handlers.NewTaskHandler(taskService)

	mux := http.NewServeMux()
	routes.RegisterRoutes(mux, taskHandler, authHandler)

	adapter := httpadapter.NewV2(mux)
	lambda.Start(adapter.ProxyWithContext)
}