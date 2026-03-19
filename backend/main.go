package main

import (
	"fmt"
	"net/http"

	"github.com/probablynotvaish/task-management-system/backend/config"
	"github.com/probablynotvaish/task-management-system/backend/routes"
)

func main() {

	config.ConnectDB()

	routes.RegisterRoutes()

	fmt.Println("Server running on port 8080")

	http.ListenAndServe(":8080", nil)
}
