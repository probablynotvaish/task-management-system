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
	// "0 8 * * *" runs at exactly 8:00 AM every day.
	// TIP: Change this to "* * * * *" if you want it to run every 60 seconds to test it!
	_, err := n.cron.AddFunc("0 8 * * *", n.processDailyDigests)
	if err != nil {
		slog.Error("failed to schedule cron job", "error", err)
		return
	}
	n.cron.Start()
	slog.Info("in-app notification cron worker started")
}

func (n *Notifier) processDailyDigests() {
	ctx := context.Background()
	now := time.Now()
	
	// Define "Today" from Midnight to Midnight
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	// Find tasks due today that are NOT completed or archived
	filter := bson.M{
		"status": bson.M{"$nin": []bson.A{{"completed", "archived"}}},
		"due_date": bson.M{
			"$gte": startOfDay,
			"$lt":  endOfDay,
		},
	}

	cursor, err := n.db.Collection("tasks").Find(ctx, filter)
	if err != nil {
		slog.Error("failed to query tasks for notifications", "error", err)
		return
	}
	defer cursor.Close(ctx)

	// Count tasks per user
	tasksCountByUser := make(map[bson.ObjectID]int)
	for cursor.Next(ctx) {
		var task models.Task
		if err := cursor.Decode(&task); err == nil {
			tasksCountByUser[task.UserID]++
		}
	}

	// Create a notification for each user who has tasks due
	for userID, count := range tasksCountByUser {
		message := fmt.Sprintf("Good morning! You have %d tasks due today. Let's get things done!", count)
		if count == 1 {
			message = "Good morning! You have 1 task due today. Let's get it done!"
		}

		notification := &models.Notification{
			UserID:  userID,
			Title:   "Daily Digest",
			Message: message,
			Type:    "daily_digest",
		}

		if err := n.notifRepo.Create(ctx, notification); err != nil {
			slog.Error("failed to create notification", "user", userID.Hex(), "error", err)
		} else {
			slog.Info("notification created", "user", userID.Hex(), "tasks", count)
		}
	}
}