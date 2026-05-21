// package database

// import (
// 	"context"
// 	"fmt"
// 	"log/slog"
// 	"os"

// 	"go.mongodb.org/mongo-driver/v2/mongo"
// 	"go.mongodb.org/mongo-driver/v2/mongo/options"
// )

// func Connect(ctx context.Context) (*mongo.Database, error) {
// 	uri := os.Getenv("MONGODB_URI")
// 	if uri == "" {
// 		return nil, fmt.Errorf("MONGODB_URI environment variable is not set")
// 	}

// 	dbName := os.Getenv("MONGODB_DATABASE")
// 	if dbName == "" {
// 		return nil, fmt.Errorf("MONGODB_DATABASE environment variable is not set")
// 	}

// 	slog.Info("connecting to MongoDB", "database", dbName)

// 	clientOpts := options.Client().ApplyURI(uri)
// 	client, err := mongo.Connect(clientOpts)
// 	if err != nil {
// 		return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
// 	}

// 	if err := client.Ping(ctx, nil); err != nil {
// 		return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
// 	}

// 	slog.Info("successfully connected to MongoDB", "database", dbName)

// 	return client.Database(dbName), nil
// }

// func Disconnect(ctx context.Context, db *mongo.Database) {
// 	if err := db.Client().Disconnect(ctx); err != nil {
// 		slog.Error("error disconnecting from MongoDB", "error", err)
// 		return
// 	}
// 	slog.Info("disconnected from MongoDB")
// }

package database

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func Connect(parentCtx context.Context) (*mongo.Database, error) {
	// uri := os.Getenv("MONGODB_URI")
	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		return nil, fmt.Errorf("MONGODB_URI environment variable is not set")
	}

	dbName := os.Getenv("MONGODB_DATABASE")
	if dbName == "" {
		return nil, fmt.Errorf("MONGODB_DATABASE environment variable is not set")
	}

	slog.Info("connecting to MongoDB", "database", dbName)

	clientOpts := options.Client().
		ApplyURI(uri).
		SetConnectTimeout(10 * time.Second).
		SetTimeout(10 * time.Second)

	client, err := mongo.Connect(clientOpts)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	pingCtx, cancelPing := context.WithTimeout(parentCtx, 10*time.Second)
	defer cancelPing()

	if err := client.Ping(pingCtx, nil); err != nil {
		_ = client.Disconnect(context.Background())
		return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	slog.Info("successfully connected to MongoDB", "database", dbName)

	return client.Database(dbName), nil
}

func Disconnect(ctx context.Context, db *mongo.Database) {
	if db == nil {
		return
	}

	if err := db.Client().Disconnect(ctx); err != nil {
		slog.Error("error disconnecting from MongoDB", "error", err)
		return
	}

	slog.Info("disconnected from MongoDB")
}