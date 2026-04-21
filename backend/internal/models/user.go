package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type User struct {
	ID        bson.ObjectID `bson:"_id,omitempty"        json:"id"`
	Name      string        `bson:"name"                 json:"name"`
	Email     string        `bson:"email"                json:"email"`
	Password  string        `bson:"password"             json:"-"`
	GoogleID  string        `bson:"google_id,omitempty"  json:"google_id,omitempty"`
	CreatedAt time.Time     `bson:"created_at"           json:"created_at"`
	UpdatedAt time.Time     `bson:"updated_at"           json:"updated_at"`
}
