package routes

import (
	"net/http"

	"github.com/probablynotvaish/task-management-system/backend/internal/handlers"
	"github.com/probablynotvaish/task-management-system/backend/internal/middleware"
)

func RegisterRoutes(mux *http.ServeMux, taskHandler *handlers.TaskHandler, authHandler *handlers.AuthHandler) {

	// auth routes
	mux.HandleFunc("POST /api/auth/signup", authHandler.Signup)
	mux.HandleFunc("POST /api/auth/login", authHandler.Login)

	// task routes
	mux.Handle("/tasks", middleware.Auth(http.HandlerFunc(taskHandler.GetTasks)))
	mux.Handle("/tasks/create", middleware.Auth(http.HandlerFunc(taskHandler.CreateTask)))
	mux.Handle("/tasks/update", middleware.Auth(http.HandlerFunc(taskHandler.UpdateTask)))
	mux.Handle("/tasks/delete", middleware.Auth(http.HandlerFunc(taskHandler.DeleteTask)))
}
