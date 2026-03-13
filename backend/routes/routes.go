package routes

import (
	"net/http"

	"github.com/probablynotvaish/task-management-system/backend/handlers"
)

func RegisterRoutes() {

	http.HandleFunc("/tasks", handlers.GetTasks)
	http.HandleFunc("/tasks/create", handlers.CreateTask)
	http.HandleFunc("/tasks/update", handlers.UpdateTask)
	http.HandleFunc("/tasks/delete", handlers.DeleteTask)

}
