package service

import (
	"context"
	"errors"
	"log/slog"

	"github.com/probablynotvaish/task-management-system/backend/internal/models"
	"github.com/probablynotvaish/task-management-system/backend/internal/repository"
	"go.mongodb.org/mongo-driver/v2/bson"
)

var (
	ErrTitleRequired  = errors.New("title is required")
	ErrTaskIDRequired = errors.New("task ID is required")
	ErrTaskNotFound   = errors.New("task not found")
)

type TaskService struct {
	repo repository.TaskRepository
}

func NewTaskService(repo repository.TaskRepository) *TaskService {
	return &TaskService{repo: repo}
}

func (s *TaskService) ListTasks(ctx context.Context, userID bson.ObjectID, filter models.TaskFilter) (*models.PaginatedResponse, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PageSize < 1 {
		filter.PageSize = 10
	}
	if filter.PageSize > 100 {
		filter.PageSize = 100
	}

	allowedSortFields := map[string]bool{
		"created_at": true,
		"due_date":   true,
		"priority":   true,
		"status":     true,
		"title":      true,
	}
	if filter.SortBy == "" || !allowedSortFields[filter.SortBy] {
		filter.SortBy = "created_at"
	}

	if filter.SortDir != 1 && filter.SortDir != -1 {
		filter.SortDir = -1
	}

	return s.repo.List(ctx, userID, filter)
}

func (s *TaskService) CreateTask(ctx context.Context, userID bson.ObjectID, dto models.TaskDTO) (*models.Task, error) {
	if dto.Title == "" {
		return nil, ErrTitleRequired
	}

	task := dto.ToTask(userID)

	if err := s.repo.Create(ctx, &task); err != nil {
		return nil, err
	}

	slog.Info("task created via service", "id", task.ID.Hex())
	return &task, nil
}

func (s *TaskService) UpdateTask(ctx context.Context, userID bson.ObjectID, task *models.Task) error {
	if task.ID.IsZero() {
		return ErrTaskIDRequired
	}
	task.ReminderSent = false
	return s.repo.Update(ctx, userID, task)
}

func (s *TaskService) DeleteTask(ctx context.Context, userID bson.ObjectID, taskID bson.ObjectID) error {
	return s.repo.Delete(ctx, userID, taskID)
}
