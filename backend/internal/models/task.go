package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type TaskStatus string

const (
	StatusToDo       TaskStatus = "to_do"
	StatusInProgress TaskStatus = "in_progress"
	StatusCompleted  TaskStatus = "completed"
	StatusArchived   TaskStatus = "archived"
)

type TaskPriority string

const (
	PriorityLow    TaskPriority = "low"
	PriorityMedium TaskPriority = "medium"
	PriorityHigh   TaskPriority = "high"
)

type Task struct {
	ID bson.ObjectID `bson:"_id,omitempty" json:"id"`

	Title       string       `bson:"title" json:"title"`
	Description string       `bson:"description" json:"description"`
	Status      TaskStatus   `bson:"status" json:"status"`
	Priority    TaskPriority `bson:"priority" json:"priority"`

	DueDate   *time.Time    `bson:"due_date,omitempty" json:"due_date"`
	CreatedAt time.Time     `bson:"created_at" json:"created_at"`
	UserID    bson.ObjectID `bson:"user_id"`
}

type TaskDTO struct {
	Title       string       `bson:"title" json:"title"`
	Description string       `bson:"description" json:"description"`
	Priority    TaskPriority `bson:"priority" json:"priority"`
	DueDate     *time.Time   `bson:"due_date,omitempty" json:"due_date,omitempty"`
}

func (dto TaskDTO) ToTask(userID bson.ObjectID) Task {
	return Task{
		Title:       dto.Title,
		Description: dto.Description,
		Status:      StatusToDo,
		Priority:    dto.Priority,
		DueDate:     dto.DueDate,
		CreatedAt:   time.Now(),
		UserID:      userID,
	}
}