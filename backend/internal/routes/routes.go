package routes

import (
	"net/http"

	"github.com/probablynotvaish/task-management-system/backend/internal/handlers"
)

func RegisterRoutes(mux *http.ServeMux) {

	mux.HandleFunc("/tasks", handlers.GetTasks)
	mux.HandleFunc("/tasks/create", handlers.CreateTask)
	mux.HandleFunc("/tasks/update", handlers.UpdateTask)
	mux.HandleFunc("/tasks/delete", handlers.DeleteTask)

}
