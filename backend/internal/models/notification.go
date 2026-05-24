package models

import (
	"time"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type Notification struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    bson.ObjectID `bson:"user_id" json:"user_id"`
	Title     string        `bson:"title" json:"title"`
	Message   string        `bson:"message" json:"message"`
	Type      string        `bson:"type" json:"type"` // e.g., "daily_digest", "system_alert"
	IsRead    bool          `bson:"is_read" json:"is_read"`
	CreatedAt time.Time     `bson:"created_at" json:"created_at"`
}