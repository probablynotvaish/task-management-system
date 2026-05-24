package worker

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/probablynotvaish/task-management-system/backend/internal/models"
	"github.com/probablynotvaish/task-management-system/backend/internal/repository"
	"github.com/robfig/cron/v3"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type Notifier struct {
	db        *mongo.Database
	notifRepo repository.NotificationRepository
	cron      *cron.Cron
}

func NewNotifier(db *mongo.Database, notifRepo repository.NotificationRepository) *Notifier {
	return &Notifier{
		db:        db,
		notifRepo: notifRepo,
		cron:      cron.New(),
	}
}

func (n *Notifier) Start() {
	_, err := n.cron.AddFunc("* * * * *", n.processRealTimeReminders)
	if err != nil {
		slog.Error("failed to schedule cron job", "error", err)
		return
	}
	n.cron.Start()
	slog.Info("Real-time notification worker started (runs every minute)")
}

func (n *Notifier) processRealTimeReminders() {
	ctx := context.Background()
	now := time.Now()

	filter := bson.M{
		"status": bson.M{"$nin": bson.A{"completed", "archived"}},
		"due_date": bson.M{
			"$exists": true,
			"$ne":     nil,
			"$lte":    now,
		},
		"reminder_sent": bson.M{"$ne": true},
	}

	cursor, err := n.db.Collection("tasks").Find(ctx, filter)
	if err != nil {
		slog.Error("failed to query tasks for real-time notifications", "error", err)
		return
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var task models.Task
		if err := cursor.Decode(&task); err != nil {
			continue
		}

		notification := &models.Notification{
			UserID:  task.UserID,
			Title:   "Task Due Now!",
			Message: fmt.Sprintf("Your task '%s' is due right now.", task.Title),
			Type:    "system_alert",
		}

		if err := n.notifRepo.Create(ctx, notification); err != nil {
			slog.Error("failed to create exact-time notification", "task", task.ID.Hex(), "error", err)
			continue
		}

		update := bson.M{"$set": bson.M{"reminder_sent": true}}
		_, err = n.db.Collection("tasks").UpdateOne(ctx, bson.M{"_id": task.ID}, update)

		if err != nil {
			slog.Error("failed to mark task as notified", "task", task.ID.Hex(), "error", err)
		} else {
			slog.Info("real-time notification sent", "user", task.UserID.Hex(), "task", task.Title)
		}
	}
}
