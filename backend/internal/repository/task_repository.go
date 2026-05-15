package repository

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"math"

	"github.com/probablynotvaish/task-management-system/backend/internal/models"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var ErrTaskNotFound = errors.New("task not found")

type TaskRepository interface {
	List(ctx context.Context, userID bson.ObjectID, filter models.TaskFilter) (*models.PaginatedResponse, error)
	Create(ctx context.Context, task *models.Task) error
	Update(ctx context.Context, userID bson.ObjectID, task *models.Task) error
	Delete(ctx context.Context, userID bson.ObjectID, taskID bson.ObjectID) error
	GetByID(ctx context.Context, userID bson.ObjectID, taskID bson.ObjectID) (*models.Task, error)
}

type MongoTaskRepository struct {
	collection *mongo.Collection
}

func NewMongoTaskRepository(db *mongo.Database) *MongoTaskRepository {
	coll := db.Collection("tasks")

	repo := &MongoTaskRepository{collection: coll}
	repo.ensureIndexes()

	return repo
}

func (r *MongoTaskRepository) ensureIndexes() {
	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "user_id", Value: 1},
				{Key: "status", Value: 1},
			},
		},
		{
			Keys: bson.D{
				{Key: "user_id", Value: 1},
				{Key: "priority", Value: 1},
			},
		},
		{
			Keys: bson.D{
				{Key: "user_id", Value: 1},
				{Key: "due_date", Value: 1},
			},
		},
		{
			Keys: bson.D{
				{Key: "user_id", Value: 1},
				{Key: "created_at", Value: -1},
			},
		},
	}

	if _, err := r.collection.Indexes().CreateMany(context.Background(), indexes); err != nil {
		slog.Error("failed to create task indexes", "error", err)
	} else {
		slog.Info("task collection indexes ensured")
	}
}

func (r *MongoTaskRepository) List(ctx context.Context, userID bson.ObjectID, filter models.TaskFilter) (*models.PaginatedResponse, error) {
	query := bson.M{"user_id": userID}

	if filter.Status != "" {
		query["status"] = filter.Status
	}
	if filter.Priority != "" {
		query["priority"] = filter.Priority
	}

	total, err := r.collection.CountDocuments(ctx, query)
	if err != nil {
		slog.Error("failed to count tasks", "error", err)
		return nil, fmt.Errorf("failed to count tasks: %w", err)
	}

	skip := int64((filter.Page - 1) * filter.PageSize)
	limit := int64(filter.PageSize)

	sortField := filter.SortBy
	if sortField == "" {
		sortField = "created_at"
	}
	sortDir := filter.SortDir
	if sortDir == 0 {
		sortDir = -1
	}

	findOpts := options.Find().
		SetSkip(skip).
		SetLimit(limit).
		SetSort(bson.D{{Key: sortField, Value: sortDir}})

	cursor, err := r.collection.Find(ctx, query, findOpts)
	if err != nil {
		slog.Error("failed to find tasks", "error", err)
		return nil, fmt.Errorf("failed to find tasks: %w", err)
	}
	defer cursor.Close(ctx)

	tasks := make([]models.Task, 0)
	if err := cursor.All(ctx, &tasks); err != nil {
		slog.Error("failed to decode tasks", "error", err)
		return nil, fmt.Errorf("failed to decode tasks: %w", err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(filter.PageSize)))

	return &models.PaginatedResponse{
		Tasks:      tasks,
		Total:      total,
		Page:       filter.Page,
		PageSize:   filter.PageSize,
		TotalPages: totalPages,
	}, nil
}

func (r *MongoTaskRepository) Create(ctx context.Context, task *models.Task) error {
	result, err := r.collection.InsertOne(ctx, task)
	if err != nil {
		slog.Error("failed to create task", "error", err)
		return fmt.Errorf("failed to create task: %w", err)
	}

	if oid, ok := result.InsertedID.(bson.ObjectID); ok {
		task.ID = oid
	}

	slog.Info("task created", "id", task.ID.Hex(), "user_id", task.UserID.Hex())
	return nil
}

func (r *MongoTaskRepository) Update(ctx context.Context, userID bson.ObjectID, task *models.Task) error {
	filter := bson.M{
		"_id":     task.ID,
		"user_id": userID,
	}

	update := bson.M{
		"$set": bson.M{
			"title":       task.Title,
			"description": task.Description,
			"status":      task.Status,
			"priority":    task.Priority,
			"due_date":    task.DueDate,
		},
	}

	result, err := r.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		slog.Error("failed to update task", "error", err)
		return fmt.Errorf("failed to update task: %w", err)
	}

	if result.MatchedCount == 0 {
		return ErrTaskNotFound
	}

	slog.Info("task updated", "id", task.ID.Hex())
	return nil
}

func (r *MongoTaskRepository) Delete(ctx context.Context, userID bson.ObjectID, taskID bson.ObjectID) error {
	filter := bson.M{
		"_id":     taskID,
		"user_id": userID,
	}

	result, err := r.collection.DeleteOne(ctx, filter)
	if err != nil {
		slog.Error("failed to delete task", "error", err)
		return fmt.Errorf("failed to delete task: %w", err)
	}

	if result.DeletedCount == 0 {
		return ErrTaskNotFound
	}

	slog.Info("task deleted", "id", taskID.Hex())
	return nil
}

func (r *MongoTaskRepository) GetByID(ctx context.Context, userID bson.ObjectID, taskID bson.ObjectID) (*models.Task, error) {
	filter := bson.M{
		"_id":     taskID,
		"user_id": userID,
	}

	var task models.Task
	if err := r.collection.FindOne(ctx, filter).Decode(&task); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrTaskNotFound
		}
		slog.Error("failed to get task", "error", err)
		return nil, fmt.Errorf("failed to get task: %w", err)
	}

	return &task, nil
}
