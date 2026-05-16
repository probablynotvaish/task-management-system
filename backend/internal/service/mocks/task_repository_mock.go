package mocks

import (
	"context"

	"github.com/probablynotvaish/task-management-system/backend/internal/models"
	"github.com/stretchr/testify/mock"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type MockTaskRepository struct {
	mock.Mock
}

func (m *MockTaskRepository) List(
	ctx context.Context,
	userID bson.ObjectID,
	filter models.TaskFilter,
) (*models.PaginatedResponse, error) {
	args := m.Called(ctx, userID, filter)

	if args.Get(0) == nil {
		return nil, args.Error(1)
	}

	return args.Get(0).(*models.PaginatedResponse), args.Error(1)
}

func (m *MockTaskRepository) Create(ctx context.Context, task *models.Task) error {
	args := m.Called(ctx, task)
	return args.Error(0)
}

func (m *MockTaskRepository) Update(
	ctx context.Context,
	userID bson.ObjectID,
	task *models.Task,
) error {
	args := m.Called(ctx, userID, task)
	return args.Error(0)
}

func (m *MockTaskRepository) Delete(
	ctx context.Context,
	userID bson.ObjectID,
	taskID bson.ObjectID,
) error {
	args := m.Called(ctx, userID, taskID)
	return args.Error(0)
}

func (m *MockTaskRepository) GetByID(
	ctx context.Context,
	userID bson.ObjectID,
	taskID bson.ObjectID,
) (*models.Task, error) {
	args := m.Called(ctx, userID, taskID)

	if args.Get(0) == nil {
		return nil, args.Error(1)
	}

	return args.Get(0).(*models.Task), args.Error(1)
}