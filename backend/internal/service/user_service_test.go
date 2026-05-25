package service_test

import (
	"context"
	"testing"

	"github.com/probablynotvaish/task-management-system/backend/internal/models"
	"github.com/probablynotvaish/task-management-system/backend/internal/service"
	"github.com/probablynotvaish/task-management-system/backend/internal/service/mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.mongodb.org/mongo-driver/v2/bson"
	"golang.org/x/crypto/bcrypt"
)

func TestUserService_Signup(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret")

	t.Run("success", func(t *testing.T) {
		mockRepo := new(mocks.MockUserRepository)
		svc := service.NewUserService(mockRepo)

		name := "Vaishnavi"
		email := "vaish@example.com"
		password := "password123"

		mockRepo.
			On("Create", mock.Anything, mock.MatchedBy(func(user *models.User) bool {
				return user != nil &&
					user.Name == name &&
					user.Email == email &&
					user.Password != password &&
					!user.CreatedAt.IsZero() &&
					!user.UpdatedAt.IsZero()
			})).
			Return(nil)

		resp, err := svc.Signup(context.Background(), name, email, password)

		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.NotEmpty(t, resp.Token)
		assert.NotNil(t, resp.User)
		assert.Equal(t, name, resp.User.Name)
		assert.Equal(t, email, resp.User.Email)
		assert.NotEqual(t, password, resp.User.Password)

		mockRepo.AssertExpectations(t)
	})

	t.Run("validation_errors", func(t *testing.T) {
		testCases := []struct {
			name        string
			inputName   string
			inputEmail  string
			inputPass   string
			wantMessage string
		}{
			{
				name:        "missing_name",
				inputName:   "",
				inputEmail:  "a@example.com",
				inputPass:   "password123",
				wantMessage: "name is required",
			},
			{
				name:        "missing_email",
				inputName:   "A",
				inputEmail:  "",
				inputPass:   "password123",
				wantMessage: "email is required",
			},
			{
				name:        "short_password",
				inputName:   "A",
				inputEmail:  "a@example.com",
				inputPass:   "123",
				wantMessage: "password must be at least 6 characters",
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				mockRepo := new(mocks.MockUserRepository)
				svc := service.NewUserService(mockRepo)

				resp, err := svc.Signup(context.Background(), tc.inputName, tc.inputEmail, tc.inputPass)

				assert.Nil(t, resp)
				assert.EqualError(t, err, tc.wantMessage)
				mockRepo.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
			})
		}
	})
}

func TestUserService_Login(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret")

	t.Run("success", func(t *testing.T) {
		mockRepo := new(mocks.MockUserRepository)
		svc := service.NewUserService(mockRepo)

		userID := bson.NewObjectID()
		email := "vaish@example.com"
		password := "password123"

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		assert.NoError(t, err)

		mockRepo.
			On("GetByEmail", mock.Anything, email).
			Return(&models.User{
				ID:       userID,
				Name:     "Vaishnavi",
				Email:    email,
				Password: string(hashedPassword),
			}, nil)

		resp, err := svc.Login(context.Background(), email, password)

		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.NotEmpty(t, resp.Token)
		assert.NotNil(t, resp.User)
		assert.Equal(t, userID, resp.User.ID)
		assert.Equal(t, email, resp.User.Email)

		mockRepo.AssertExpectations(t)
	})

	t.Run("invalid_credentials", func(t *testing.T) {
		mockRepo := new(mocks.MockUserRepository)
		svc := service.NewUserService(mockRepo)

		email := "vaish@example.com"

		mockRepo.
			On("GetByEmail", mock.Anything, email).
			Return((*models.User)(nil), assert.AnError)

		resp, err := svc.Login(context.Background(), email, "password123")

		assert.Nil(t, resp)
		assert.EqualError(t, err, "invalid email or password")
		mockRepo.AssertExpectations(t)
	})
}

func TestUserService_LoginWithGoogle(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret")

	mockRepo := new(mocks.MockUserRepository)
	svc := service.NewUserService(mockRepo)

	userID := bson.NewObjectID()
	googleID := "google-123"
	email := "vaish@example.com"
	name := "Vaishnavi"

	mockRepo.
		On("FindOrCreateByGoogle", mock.Anything, googleID, email, name).
		Return(&models.User{
			ID:    userID,
			Name:  name,
			Email: email,
		}, nil)

	resp, err := svc.LoginWithGoogle(context.Background(), googleID, email, name)

	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.NotEmpty(t, resp.Token)
	assert.NotNil(t, resp.User)
	assert.Equal(t, userID, resp.User.ID)
	assert.Equal(t, email, resp.User.Email)

	mockRepo.AssertExpectations(t)
}
