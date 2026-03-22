package routes

import (
	"net/http"

	"github.com/probablynotvaish/task-management-system/backend/internal/handlers"
	"github.com/probablynotvaish/task-management-system/backend/internal/handler"
)

func RegisterRoutes(mux *http.ServeMux, taskHandler *handlers.TaskHandler, authHandler *handler.AuthHandler) {

	// auth routes
	mux.HandleFunc("POST /api/auth/signup", authHandler.Signup)
	mux.HandleFunc("POST /api/auth/login", authHandler.Login)

	// task routes
	mux.HandleFunc("/tasks", taskHandler.GetTasks)
	mux.HandleFunc("/tasks/create", taskHandler.CreateTask)
	mux.HandleFunc("/tasks/update", taskHandler.UpdateTask)
	mux.HandleFunc("/tasks/delete", taskHandler.DeleteTask)
}