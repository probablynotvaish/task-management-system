package repository

import (
	"context"
	"github.com/probablynotvaish/task-management-system/backend/internal/models"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"time"
)

type NotificationRepository interface {
	Create(ctx context.Context, notification *models.Notification) error
	GetUnreadByUserID(ctx context.Context, userID bson.ObjectID) ([]models.Notification, error)
	MarkAsRead(ctx context.Context, notificationID bson.ObjectID) error
}

type mongoNotificationRepo struct {
	collection *mongo.Collection
}

func NewMongoNotificationRepository(db *mongo.Database) NotificationRepository {
	return &mongoNotificationRepo{
		collection: db.Collection("notifications"),
	}
}

func (r *mongoNotificationRepo) Create(ctx context.Context, n *models.Notification) error {
	n.ID = bson.NewObjectID()
	n.CreatedAt = time.Now()
	n.IsRead = false

	_, err := r.collection.InsertOne(ctx, n)
	return err
}

func (r *mongoNotificationRepo) GetUnreadByUserID(ctx context.Context, userID bson.ObjectID) ([]models.Notification, error) {
	filter := bson.M{
		"user_id": userID,
		"is_read": false,
	}

	opts := options.Find().SetSort(bson.M{"created_at": -1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var notifications []models.Notification
	if err = cursor.All(ctx, &notifications); err != nil {
		return nil, err
	}

	return notifications, nil
}

func (r *mongoNotificationRepo) MarkAsRead(ctx context.Context, notificationID bson.ObjectID) error {
	filter := bson.M{"_id": notificationID}
	update := bson.M{"$set": bson.M{"is_read": true}}

	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}
