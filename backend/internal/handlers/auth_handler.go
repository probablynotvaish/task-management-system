package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"github.com/probablynotvaish/task-management-system/backend/internal/service"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type AuthHandler struct {
	userService *service.UserService
}

func NewAuthHandler(userService *service.UserService) *AuthHandler {
	return &AuthHandler{userService: userService}
}

type signupRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Signup(w http.ResponseWriter, r *http.Request) {
	var req signupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	result, err := h.userService.Signup(r.Context(), req.Name, req.Email, req.Password)
	if err != nil {
		slog.Warn("signup failed", "error", err)
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusCreated, result)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	result, err := h.userService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		slog.Warn("login failed", "error", err)
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func googleOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  "http://localhost:8080/api/auth/google/callback",
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}
}

func generateState() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (h *AuthHandler) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	state, err := generateState()
	if err != nil {
		slog.Error("failed to generate oauth state", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		MaxAge:   300,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
	})

	url := googleOAuthConfig().AuthCodeURL(state)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

type googleUserInfo struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

func (h *AuthHandler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}

	stateCookie, err := r.Cookie("oauth_state")
	if err != nil || stateCookie.Value != r.URL.Query().Get("state") {
		slog.Warn("oauth state mismatch")
		http.Redirect(w, r, frontendURL+"/?error=invalid_state", http.StatusTemporaryRedirect)
		return
	}
	http.SetCookie(w, &http.Cookie{Name: "oauth_state", MaxAge: -1, Path: "/"})

	code := r.URL.Query().Get("code")
	if code == "" {
		slog.Warn("oauth callback missing code")
		http.Redirect(w, r, frontendURL+"/?error=missing_code", http.StatusTemporaryRedirect)
		return
	}

	oauthToken, err := googleOAuthConfig().Exchange(context.Background(), code)
	if err != nil {
		slog.Error("failed to exchange oauth code", "error", err)
		http.Redirect(w, r, frontendURL+"/?error=token_exchange_failed", http.StatusTemporaryRedirect)
		return
	}

	client := googleOAuthConfig().Client(context.Background(), oauthToken)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		slog.Error("failed to fetch google user info", "error", err)
		http.Redirect(w, r, frontendURL+"/?error=userinfo_failed", http.StatusTemporaryRedirect)
		return
	}
	defer resp.Body.Close()

	var info googleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		slog.Error("failed to decode google user info", "error", err)
		http.Redirect(w, r, frontendURL+"/?error=userinfo_decode_failed", http.StatusTemporaryRedirect)
		return
	}

	result, err := h.userService.LoginWithGoogle(r.Context(), info.ID, info.Email, info.Name)
	if err != nil {
		slog.Error("google login service error", "error", err)
		http.Redirect(w, r, frontendURL+"/?error=login_failed", http.StatusTemporaryRedirect)
		return
	}

	redirectURL := fmt.Sprintf("%s/auth/callback?token=%s", frontendURL, result.Token)
	http.Redirect(w, r, redirectURL, http.StatusTemporaryRedirect)
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		slog.Error("failed to write JSON response", "error", err)
	}
}
