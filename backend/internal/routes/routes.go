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
	mux.HandleFunc("GET /api/auth/google", authHandler.GoogleLogin)
	mux.HandleFunc("GET /api/auth/google/callback", authHandler.GoogleCallback)
	mux.Handle("GET /api/me", middleware.Auth(http.HandlerFunc(authHandler.GetMe)))

	// task routes
	mux.Handle("GET /api/tasks", middleware.Auth(http.HandlerFunc(taskHandler.GetTasks)))
	mux.Handle("POST /api/tasks", middleware.Auth(http.HandlerFunc(taskHandler.CreateTask)))
	mux.Handle("PATCH /api/tasks/{id}", middleware.Auth(http.HandlerFunc(taskHandler.UpdateTask)))
	mux.Handle("DELETE /api/tasks/{id}", middleware.Auth(http.HandlerFunc(taskHandler.DeleteTask)))
}
