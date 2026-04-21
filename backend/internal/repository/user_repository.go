package repository

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/probablynotvaish/task-management-system/backend/internal/models"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type UserRepository interface {
	Create(ctx context.Context, user *models.User) error
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	GetByID(ctx context.Context, id string) (*models.User, error)
	FindOrCreateByGoogle(ctx context.Context, googleID, email, name string) (*models.User, error)
}

type MongoUserRepository struct {
	collection *mongo.Collection
}

func NewMongoUserRepository(db *mongo.Database) *MongoUserRepository {
	coll := db.Collection("users")

	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	}

	if _, err := coll.Indexes().CreateOne(context.Background(), indexModel); err != nil {
		slog.Error("failed to create unique index on email", "error", err)
	} else {
		slog.Info("unique index ensured on users.email")
	}

	return &MongoUserRepository{collection: coll}
}

func (r *MongoUserRepository) Create(ctx context.Context, user *models.User) error {
	result, err := r.collection.InsertOne(ctx, user)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return fmt.Errorf("email already exists")
		}
		slog.Error("failed to create user", "error", err)
		return fmt.Errorf("failed to create user: %w", err)
	}

	if oid, ok := result.InsertedID.(bson.ObjectID); ok {
		user.ID = oid
	}

	slog.Info("user created", "id", user.ID.Hex(), "email", user.Email)
	return nil
}

func (r *MongoUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.collection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("user not found")
		}
		slog.Error("failed to get user by email", "email", email, "error", err)
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &user, nil
}

func (r *MongoUserRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	objectID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	var user models.User
	err = r.collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("user not found")
		}
		slog.Error("failed to get user by ID", "id", id, "error", err)
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &user, nil
}

func (r *MongoUserRepository) FindOrCreateByGoogle(ctx context.Context, googleID, email, name string) (*models.User, error) {
	now := time.Now().UTC()

	filter := bson.M{"$or": bson.A{
		bson.M{"google_id": googleID},
		bson.M{"email": email},
	}}

	update := bson.M{
		"$set": bson.M{
			"google_id":  googleID,
			"name":       name,
			"email":      email,
			"updated_at": now,
		},
		"$setOnInsert": bson.M{
			"password":   "",
			"created_at": now,
		},
	}

	opts := options.FindOneAndUpdate().
		SetUpsert(true).
		SetReturnDocument(options.After)

	var user models.User
	err := r.collection.FindOneAndUpdate(ctx, filter, update, opts).Decode(&user)
	if err != nil {
		slog.Error("failed to find or create google user", "email", email, "error", err)
		return nil, fmt.Errorf("failed to find or create user: %w", err)
	}

	slog.Info("google user upserted", "id", user.ID.Hex(), "email", email)
	return &user, nil
}
