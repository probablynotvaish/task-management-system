package service_test

import (
	"context"
	"errors"
	"testing"

	"github.com/probablynotvaish/task-management-system/backend/internal/models"
	"github.com/probablynotvaish/task-management-system/backend/internal/service"
	"github.com/probablynotvaish/task-management-system/backend/internal/service/mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.mongodb.org/mongo-driver/v2/bson"
)

func TestTaskService_CreateTask(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		mockRepo := new(mocks.MockTaskRepository)
		svc := service.NewTaskService(mockRepo)

		userID := bson.NewObjectID()
		dto := models.TaskDTO{
			Title:       "Write tests",
			Description: "Add backend unit tests",
			Priority:    models.PriorityHigh,
		}

		mockRepo.
			On("Create", mock.Anything, mock.MatchedBy(func(task *models.Task) bool {
				return task != nil &&
					task.Title == dto.Title &&
					task.Description == dto.Description &&
					task.Priority == dto.Priority &&
					task.Status == models.StatusToDo &&
					task.UserID == userID &&
					!task.CreatedAt.IsZero()
			})).
			Return(nil)

		task, err := svc.CreateTask(context.Background(), userID, dto)

		assert.NoError(t, err)
		assert.NotNil(t, task)
		assert.Equal(t, dto.Title, task.Title)
		assert.Equal(t, dto.Description, task.Description)
		assert.Equal(t, dto.Priority, task.Priority)
		assert.Equal(t, models.StatusToDo, task.Status)
		assert.Equal(t, userID, task.UserID)
		assert.False(t, task.CreatedAt.IsZero())

		mockRepo.AssertExpectations(t)
	})

	t.Run("validation_error_when_title_missing", func(t *testing.T) {
		mockRepo := new(mocks.MockTaskRepository)
		svc := service.NewTaskService(mockRepo)

		dto := models.TaskDTO{
			Description: "Missing title",
			Priority:    models.PriorityLow,
		}

		task, err := svc.CreateTask(context.Background(), bson.NewObjectID(), dto)

		assert.Nil(t, task)
		assert.ErrorIs(t, err, service.ErrTitleRequired)
		mockRepo.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
	})
}

func TestTaskService_ListTasks_NormalizesFilter(t *testing.T) {
	mockRepo := new(mocks.MockTaskRepository)
	svc := service.NewTaskService(mockRepo)

	userID := bson.NewObjectID()

	input := models.TaskFilter{
		Page:     0,
		PageSize: 500,
		SortBy:   "bad_field",
		SortDir:  0,
		Status:   models.StatusInProgress,
		Priority: models.PriorityHigh,
	}

	expected := models.TaskFilter{
		Page:     1,
		PageSize: 100,
		SortBy:   "created_at",
		SortDir:  -1,
		Status:   models.StatusInProgress,
		Priority: models.PriorityHigh,
	}

	mockRepo.
		On("List", mock.Anything, userID, expected).
		Return(&models.PaginatedResponse{
			Tasks:      []models.Task{},
			Total:      0,
			Page:       1,
			PageSize:   100,
			TotalPages: 0,
		}, nil)

	resp, err := svc.ListTasks(context.Background(), userID, input)

	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, int64(0), resp.Total)
	assert.Equal(t, 1, resp.Page)
	assert.Equal(t, 100, resp.PageSize)

	mockRepo.AssertExpectations(t)
}

func TestTaskService_UpdateTask(t *testing.T) {
	t.Run("validation_error_when_id_missing", func(t *testing.T) {
		mockRepo := new(mocks.MockTaskRepository)
		svc := service.NewTaskService(mockRepo)

		task := &models.Task{
			Title: "No ID task",
		}

		err := svc.UpdateTask(context.Background(), bson.NewObjectID(), task)

		assert.ErrorIs(t, err, service.ErrTaskIDRequired)
		mockRepo.AssertNotCalled(t, "Update", mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("success", func(t *testing.T) {
		mockRepo := new(mocks.MockTaskRepository)
		svc := service.NewTaskService(mockRepo)

		userID := bson.NewObjectID()
		taskID := bson.NewObjectID()
		task := &models.Task{
			ID:    taskID,
			Title: "Update me",
		}

		mockRepo.
			On("Update", mock.Anything, userID, task).
			Return(nil)

		err := svc.UpdateTask(context.Background(), userID, task)

		assert.NoError(t, err)
		mockRepo.AssertExpectations(t)
	})
}

func TestTaskService_DeleteTask(t *testing.T) {
	mockRepo := new(mocks.MockTaskRepository)
	svc := service.NewTaskService(mockRepo)

	userID := bson.NewObjectID()
	taskID := bson.NewObjectID()

	mockRepo.
		On("Delete", mock.Anything, userID, taskID).
		Return(nil)

	err := svc.DeleteTask(context.Background(), userID, taskID)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestTaskService_ListTasks_RepoError(t *testing.T) {
	mockRepo := new(mocks.MockTaskRepository)
	svc := service.NewTaskService(mockRepo)

	userID := bson.NewObjectID()

	filter := models.TaskFilter{
		Page:     1,
		PageSize: 10,
		SortBy:   "created_at",
		SortDir:  -1,
	}

	mockRepo.
		On("List", mock.Anything, userID, filter).
		Return((*models.PaginatedResponse)(nil), errors.New("db down"))

	resp, err := svc.ListTasks(context.Background(), userID, filter)

	assert.Nil(t, resp)
	assert.EqualError(t, err, "db down")
	mockRepo.AssertExpectations(t)
}
