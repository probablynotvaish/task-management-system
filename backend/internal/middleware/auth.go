package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type contextKey string

const (
	UserIDKey    contextKey = "user_id"
	UserEmailKey contextKey = "user_email"
	UserNameKey  contextKey = "user_name"
)

func writeJSONError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"error": message,
	})
}

func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			writeJSONError(w, http.StatusUnauthorized, "authorization header is required")
			// http.Error(w, `{"error":"authorization header is required"}`, http.StatusUnauthorized)
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			writeJSONError(w, http.StatusUnauthorized, "invalid authorization header format")
			// http.Error(w, `{"error":"invalid authorization header format"}`, http.StatusUnauthorized)
			return
		}

		tokenString := parts[1]

		token, err := parseToken(tokenString)
		if err != nil {
			slog.Warn("invalid token", "error", err)
			writeJSONError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			writeJSONError(w, http.StatusUnauthorized, "invalid token claims")
			return
		}

		userIDStr, ok := claims["user_id"].(string)
		if !ok {
			writeJSONError(w, http.StatusUnauthorized, "user_id missing or invalid")
			return
		}

		userID, err := bson.ObjectIDFromHex(userIDStr)
		if err != nil {
			writeJSONError(w, http.StatusUnauthorized, "invalid user_id format")
			return
		}

		email, _ := claims["email"].(string)
		name, _ := claims["name"].(string)

		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		ctx = context.WithValue(ctx, UserEmailKey, email)
		ctx = context.WithValue(ctx, UserNameKey, name)

		slog.Debug("request authenticated", "user_id", userID, "email", email)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func parseToken(tokenString string) (*jwt.Token, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return nil, fmt.Errorf("JWT_SECRET environment variable is not set")
	}

	return jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})
}

func GetUserID(ctx context.Context) (bson.ObjectID, bool) {
	userID, ok := ctx.Value(UserIDKey).(bson.ObjectID)
	return userID, ok
}

func GetUserEmail(ctx context.Context) string {
	email, _ := ctx.Value(UserEmailKey).(string)
	return email
}

func GetUserName(ctx context.Context) string {
    name, _ := ctx.Value(UserNameKey).(string)
    return name
}