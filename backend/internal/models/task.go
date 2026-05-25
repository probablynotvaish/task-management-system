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

// RecurrenceFrequency defines how often a recurring task repeats.
type RecurrenceFrequency string

const (
	RecurrenceNone     RecurrenceFrequency = ""
	RecurrenceDaily    RecurrenceFrequency = "daily"
	RecurrenceWeekdays RecurrenceFrequency = "weekdays"
	RecurrenceWeekly   RecurrenceFrequency = "weekly"
	RecurrenceMonthly  RecurrenceFrequency = "monthly"
)

// RecurrenceRule holds the repeat schedule for a task.
type RecurrenceRule struct {
	Frequency RecurrenceFrequency `bson:"frequency" json:"frequency"`
	// Until is an optional end-date for the recurrence; nil means repeat forever.
	Until *time.Time `bson:"until,omitempty" json:"until,omitempty"`
}

type Task struct {
	ID bson.ObjectID `bson:"_id,omitempty" json:"id"`

	Title       string       `bson:"title" json:"title"`
	Description string       `bson:"description" json:"description"`
	Status      TaskStatus   `bson:"status" json:"status"`
	Priority    TaskPriority `bson:"priority" json:"priority"`

	DueDate      *time.Time    `bson:"due_date,omitempty" json:"due_date"`
	CreatedAt    time.Time     `bson:"created_at" json:"created_at"`
	UserID       bson.ObjectID `bson:"user_id"`
	ReminderSent bool          `bson:"reminder_sent" json:"reminder_sent"`

	// Recurrence holds the repeat rule, if this is a recurring task.
	Recurrence *RecurrenceRule `bson:"recurrence,omitempty" json:"recurrence,omitempty"`
	// RecurrenceParent is the ID of the original (parent) recurring task, set on child occurrences.
	RecurrenceParent *bson.ObjectID `bson:"recurrence_parent,omitempty" json:"recurrence_parent,omitempty"`
}

type TaskDTO struct {
	Title       string          `bson:"title" json:"title"`
	Description string          `bson:"description" json:"description"`
	Priority    TaskPriority    `bson:"priority" json:"priority"`
	DueDate     *time.Time      `bson:"due_date,omitempty" json:"due_date,omitempty"`
	Recurrence  *RecurrenceRule `bson:"recurrence,omitempty" json:"recurrence,omitempty"`
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
		Recurrence:  dto.Recurrence,
	}
}

type TaskFilter struct {
	Status   TaskStatus   `json:"status"`
	Priority TaskPriority `json:"priority"`
	Search   string       `json:"search"`
	Page     int          `json:"page"`
	PageSize int          `json:"page_size"`
	SortBy   string       `json:"sort_by"`
	SortDir  int          `json:"sort_dir"`
}

type PaginatedResponse struct {
	Tasks      []Task `json:"tasks"`
	Total      int64  `json:"total"`
	Page       int    `json:"page"`
	PageSize   int    `json:"page_size"`
	TotalPages int    `json:"total_pages"`
}
