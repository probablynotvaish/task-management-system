package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/probablynotvaish/task-management-system/backend/internal/models"
	"github.com/probablynotvaish/task-management-system/backend/internal/repository"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type NotificationHandler struct {
	repo repository.NotificationRepository
}

func NewNotificationHandler(repo repository.NotificationRepository) *NotificationHandler {
	return &NotificationHandler{repo: repo}
}

// GET /api/notifications
func (h *NotificationHandler) GetUnread(w http.ResponseWriter, r *http.Request) {
	// 1. Extract the User ID from your auth context (from the JWT middleware)
	// Example: userID := r.Context().Value("userID").(bson.ObjectID)
	userID := r.Context().Value("userID").(bson.ObjectID)

	notifications, err := h.repo.GetUnreadByUserID(r.Context(), userID)
	if err != nil {
		http.Error(w, "Failed to fetch notifications", http.StatusInternalServerError)
		return
	}

	// Return empty array instead of null if there are no notifications
	if notifications == nil {
		notifications = []models.Notification{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifications)
}

// PUT /api/notifications/{id}/read
func (h *NotificationHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	// Extract the notification ID from the URL path
	// Example (if using a router like Chi or Gorilla): idStr := chi.URLParam(r, "id")
	// For this example, assume you got the idStr:
	idStr := "extracted_id_from_url"

	objID, err := bson.ObjectIDFromHex(idStr)
	if err != nil {
		http.Error(w, "Invalid notification ID", http.StatusBadRequest)
		return
	}

	if err := h.repo.MarkAsRead(r.Context(), objID); err != nil {
		http.Error(w, "Failed to update notification", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "success"}`))
}
