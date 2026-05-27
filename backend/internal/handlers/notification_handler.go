package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/probablynotvaish/task-management-system/backend/internal/middleware" // <-- Imported your middleware
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

// GetUnread godoc
// @Summary List unread user notifications
// @Description Retrieve all unread notifications for the authenticated user.
// @Tags Notifications
// @Produce json
// @Success 200 {array} models.Notification
// @Failure 401 {object} map[string]string "error: unauthorized"
// @Failure 500 {string} string "Failed to fetch notifications"
// @Security Bearer
// @Router /api/notifications [get]
func (h *NotificationHandler) GetUnread(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"error": "unauthorized"}`))
		return
	}

	notifications, err := h.repo.GetUnreadByUserID(r.Context(), userID)
	if err != nil {
		http.Error(w, "Failed to fetch notifications", http.StatusInternalServerError)
		return
	}

	if notifications == nil {
		notifications = []models.Notification{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifications)
}

// MarkAsRead godoc
// @Summary Mark a notification as read
// @Description Update the notification status to read.
// @Tags Notifications
// @Produce json
// @Param id path string true "Notification ID"
// @Success 200 {object} map[string]string "status: success"
// @Failure 400 {string} string "Invalid notification ID or ID is required"
// @Failure 500 {string} string "Failed to update notification"
// @Security Bearer
// @Router /api/notifications/{id}/read [put]
func (h *NotificationHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	if idStr == "" {
		http.Error(w, "Notification ID is required", http.StatusBadRequest)
		return
	}

	objID, err := bson.ObjectIDFromHex(idStr)
	if err != nil {
		http.Error(w, "Invalid notification ID", http.StatusBadRequest)
		return
	}

	if err := h.repo.MarkAsRead(r.Context(), objID); err != nil {
		http.Error(w, "Failed to update notification", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "success"}`))
}
