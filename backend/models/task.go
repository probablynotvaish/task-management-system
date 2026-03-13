package models

import (
	"time"
)

type TaskStatus string

const (
	StatusPending    TaskStatus = "pending"
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
	ID          int          `json:"id" gorm:"primaryKey"`
	Title       string       `json:"title" gorm:"not null;type:varchar(255)"`
	Description string       `json:"description" gorm:"type:text"`
	Status      TaskStatus   `json:"status" gorm:"type:varchar(20);default:'pending'"`
	Priority    TaskPriority `json:"priority" gorm:"type:varchar(20);default:'medium'"`

	DueDate   *time.Time `json:"due_date"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}
