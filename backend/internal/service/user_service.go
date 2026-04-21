package service

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/probablynotvaish/task-management-system/backend/internal/models"
	"github.com/probablynotvaish/task-management-system/backend/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

type AuthResponse struct {
	Token string       `json:"token"`
	User  *models.User `json:"user"`
}

type UserService struct {
	repo repository.UserRepository
}

func NewUserService(repo repository.UserRepository) *UserService {
	return &UserService{repo: repo}
}

func (s *UserService) Signup(ctx context.Context, name, email, password string) (*AuthResponse, error) {
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	if email == "" {
		return nil, fmt.Errorf("email is required")
	}
	if len(password) < 6 {
		return nil, fmt.Errorf("password must be at least 6 characters")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		slog.Error("failed to hash password", "error", err)
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	now := time.Now().UTC()
	user := &models.User{
		Name:      name,
		Email:     email,
		Password:  string(hashedPassword),
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.repo.Create(ctx, user); err != nil {
		return nil, err
	}

	token, err := generateToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	slog.Info("user signed up", "email", email)
	return &AuthResponse{Token: token, User: user}, nil
}

func (s *UserService) Login(ctx context.Context, email, password string) (*AuthResponse, error) {
	if email == "" {
		return nil, fmt.Errorf("email is required")
	}
	if password == "" {
		return nil, fmt.Errorf("password is required")
	}

	user, err := s.repo.GetByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		slog.Warn("invalid login attempt", "email", email)
		return nil, fmt.Errorf("invalid email or password")
	}

	token, err := generateToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	slog.Info("user logged in", "email", email)
	return &AuthResponse{Token: token, User: user}, nil
}

func (s *UserService) LoginWithGoogle(ctx context.Context, googleID, email, name string) (*AuthResponse, error) {
	user, err := s.repo.FindOrCreateByGoogle(ctx, googleID, email, name)
	if err != nil {
		return nil, fmt.Errorf("google login failed: %w", err)
	}

	token, err := generateToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	slog.Info("user logged in via google", "email", email)
	return &AuthResponse{Token: token, User: user}, nil
}

func generateToken(user *models.User) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "", fmt.Errorf("JWT_SECRET environment variable is not set")
	}

	claims := jwt.MapClaims{
		"user_id": user.ID.Hex(),
		"email":   user.Email,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
