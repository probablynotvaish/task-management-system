package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/probablynotvaish/task-management-system/backend/internal/middleware"
	"github.com/probablynotvaish/task-management-system/backend/internal/models"
	"github.com/probablynotvaish/task-management-system/backend/internal/service"
	"go.mongodb.org/mongo-driver/v2/bson"
)

// ──────────────────────────────────────────────
// Gemini REST API types
// ──────────────────────────────────────────────

type geminiPart struct {
	Text         string              `json:"text,omitempty"`
	FunctionCall *geminiFunctionCall `json:"functionCall,omitempty"`
	FunctionResp *geminiFunctionResp `json:"functionResponse,omitempty"`
}

type geminiFunctionCall struct {
	Name string         `json:"name"`
	Args map[string]any `json:"args"`
}

type geminiFunctionResp struct {
	Name     string         `json:"name"`
	Response map[string]any `json:"response"`
}

type geminiContent struct {
	Role  string       `json:"role"`
	Parts []geminiPart `json:"parts"`
}

type geminiTool struct {
	FunctionDeclarations []geminiFunctionDecl `json:"functionDeclarations"`
}

type geminiFunctionDecl struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Parameters  map[string]any `json:"parameters"`
}

type geminiRequest struct {
	SystemInstruction *geminiContent  `json:"systemInstruction,omitempty"`
	Contents          []geminiContent `json:"contents"`
	Tools             []geminiTool    `json:"tools,omitempty"`
}

type geminiCandidate struct {
	Content geminiContent `json:"content"`
}

type geminiResponse struct {
	Candidates []geminiCandidate `json:"candidates"`
}

// ──────────────────────────────────────────────
// Handler request / response types
// ──────────────────────────────────────────────

type ChatHistoryMessage struct {
	Role    string `json:"role"`    // "user" | "model"
	Content string `json:"content"`
}

type ChatRequest struct {
	Message string               `json:"message"`
	History []ChatHistoryMessage `json:"history"`
}

type ActionTaken struct {
	Type    string `json:"type"`
	Summary string `json:"summary"`
}

type ChatResponse struct {
	Reply        string        `json:"reply"`
	ActionsTaken []ActionTaken `json:"actions_taken"`
}

// ──────────────────────────────────────────────
// AIHandler
// ──────────────────────────────────────────────

type AIHandler struct {
	taskService *service.TaskService
}

func NewAIHandler(taskService *service.TaskService) *AIHandler {
	return &AIHandler{taskService: taskService}
}

// geminiTools returns the function declarations we expose to Gemini.
func geminiTools() []geminiTool {
	return []geminiTool{
		{
			FunctionDeclarations: []geminiFunctionDecl{
				{
					Name:        "list_tasks",
					Description: "Fetch the user's tasks with optional filters. Returns a list of tasks.",
					Parameters: map[string]any{
						"type": "object",
						"properties": map[string]any{
							"status": map[string]any{
								"type":        "string",
								"description": "Filter by status: to_do, in_progress, completed, archived",
								"enum":        []string{"to_do", "in_progress", "completed", "archived"},
							},
							"priority": map[string]any{
								"type":        "string",
								"description": "Filter by priority: low, medium, high",
								"enum":        []string{"low", "medium", "high"},
							},
							"search": map[string]any{
								"type":        "string",
								"description": "Search tasks by keyword in title or description",
							},
						},
						"required": []string{},
					},
				},
				{
					Name:        "get_task_summary",
					Description: "Get a count of tasks grouped by status (to_do, in_progress, completed, archived). Use this to answer questions like 'how many tasks do I have?' or 'what's my progress?'",
					Parameters: map[string]any{
						"type":       "object",
						"properties": map[string]any{},
						"required":   []string{},
					},
				},
				{
					Name:        "create_task",
					Description: "Create a new task for the user.",
					Parameters: map[string]any{
						"type": "object",
						"properties": map[string]any{
							"title": map[string]any{
								"type":        "string",
								"description": "The task title (required)",
							},
							"description": map[string]any{
								"type":        "string",
								"description": "Optional detailed description of the task",
							},
							"priority": map[string]any{
								"type":        "string",
								"description": "Priority level: low, medium, high (default: medium)",
								"enum":        []string{"low", "medium", "high"},
							},
							"due_date": map[string]any{
								"type":        "string",
								"description": "Optional due date in RFC3339 format (e.g. 2025-01-31T23:59:59Z)",
							},
						},
						"required": []string{"title"},
					},
				},
				{
					Name:        "update_task",
					Description: "Update an existing task. You must first call list_tasks to get the task ID before calling this.",
					Parameters: map[string]any{
						"type": "object",
						"properties": map[string]any{
							"id": map[string]any{
								"type":        "string",
								"description": "The task ID (MongoDB ObjectID hex string)",
							},
							"title": map[string]any{
								"type":        "string",
								"description": "New title for the task",
							},
							"description": map[string]any{
								"type":        "string",
								"description": "New description for the task",
							},
							"status": map[string]any{
								"type":        "string",
								"description": "New status: to_do, in_progress, completed, archived",
								"enum":        []string{"to_do", "in_progress", "completed", "archived"},
							},
							"priority": map[string]any{
								"type":        "string",
								"description": "New priority: low, medium, high",
								"enum":        []string{"low", "medium", "high"},
							},
							"due_date": map[string]any{
								"type":        "string",
								"description": "New due date in RFC3339 format, or empty string to clear",
							},
						},
						"required": []string{"id"},
					},
				},
				{
					Name:        "archive_task",
					Description: "Archive a task (set its status to 'archived'). You must call list_tasks first to get the task ID.",
					Parameters: map[string]any{
						"type": "object",
						"properties": map[string]any{
							"id": map[string]any{
								"type":        "string",
								"description": "The task ID to archive",
							},
						},
						"required": []string{"id"},
					},
				},
			},
		},
	}
}

// systemPrompt builds the system instruction for Gemini.
func systemPrompt() string {
	now := time.Now().Format("Monday, 02 January 2006 15:04 MST")
	return fmt.Sprintf(`You are an intelligent task management assistant for an app called Planora.
Today's date and time is: %s

You help users manage their tasks through natural conversation. You can:
- List and search tasks
- Create new tasks
- Update existing tasks (title, description, status, priority, due date)
- Archive tasks
- Provide summaries and insights about their task workload

IMPORTANT RULES:
1. Always be concise and friendly in your responses.
2. When the user asks to see tasks, ALWAYS call list_tasks first, then summarize results clearly.
3. When creating or updating tasks, confirm what you did clearly.
4. For "tasks due this week", call list_tasks without filters, then filter the returned results by due_date client-side in your reasoning.
5. If a user says "archive all completed tasks", first call list_tasks with status=completed, then call archive_task for each one.
6. Task statuses: "to_do" (Pending), "in_progress" (In Progress), "completed" (Completed), "archived" (Archived).
7. Never make up task IDs — always fetch them first using list_tasks.
8. Format task lists as clean bullet points with title, priority, and due date when available.
9. If the user asks something unrelated to tasks, politely redirect them.`, now)
}

// callGemini sends a request to the Gemini API and returns the response.
func callGemini(ctx context.Context, apiKey string, req geminiRequest) (*geminiResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	url := fmt.Sprintf(
		"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=%s",
		apiKey,
	)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("gemini request: %w", err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("gemini error %d: %s", resp.StatusCode, string(raw))
	}

	var gemResp geminiResponse
	if err := json.Unmarshal(raw, &gemResp); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}
	return &gemResp, nil
}

// extractText pulls the text content from the first candidate.
func extractText(resp *geminiResponse) string {
	if len(resp.Candidates) == 0 {
		return "I'm sorry, I couldn't generate a response. Please try again."
	}
	for _, part := range resp.Candidates[0].Content.Parts {
		if part.Text != "" {
			return part.Text
		}
	}
	return ""
}

// extractFunctionCall returns the first function call in the response, if any.
func extractFunctionCall(resp *geminiResponse) *geminiFunctionCall {
	if len(resp.Candidates) == 0 {
		return nil
	}
	for _, part := range resp.Candidates[0].Content.Parts {
		if part.FunctionCall != nil {
			return part.FunctionCall
		}
	}
	return nil
}

// ──────────────────────────────────────────────
// Task tool execution
// ──────────────────────────────────────────────

func (h *AIHandler) executeTool(ctx context.Context, userID bson.ObjectID, fnCall *geminiFunctionCall) (map[string]any, *ActionTaken, error) {
	args := fnCall.Args

	getString := func(key string) string {
		v, _ := args[key].(string)
		return v
	}

	switch fnCall.Name {

	case "list_tasks":
		filter := models.TaskFilter{
			Status:   models.TaskStatus(getString("status")),
			Priority: models.TaskPriority(getString("priority")),
			Search:   getString("search"),
			Page:     1,
			PageSize: 50,
			SortBy:   "created_at",
			SortDir:  -1,
		}
		result, err := h.taskService.ListTasks(ctx, userID, filter)
		if err != nil {
			return nil, nil, err
		}
		// Serialize tasks to a plain map for Gemini
		tasksData := make([]map[string]any, 0, len(result.Tasks))
		for _, t := range result.Tasks {
			td := map[string]any{
				"id":          t.ID.Hex(),
				"title":       t.Title,
				"description": t.Description,
				"status":      string(t.Status),
				"priority":    string(t.Priority),
				"created_at":  t.CreatedAt.Format(time.RFC3339),
			}
			if t.DueDate != nil {
				td["due_date"] = t.DueDate.Format(time.RFC3339)
			}
			tasksData = append(tasksData, td)
		}
		return map[string]any{
			"tasks": tasksData,
			"total": result.Total,
		}, nil, nil

	case "get_task_summary":
		statuses := []models.TaskStatus{
			models.StatusToDo,
			models.StatusInProgress,
			models.StatusCompleted,
			models.StatusArchived,
		}
		summary := map[string]any{}
		for _, s := range statuses {
			r, err := h.taskService.ListTasks(ctx, userID, models.TaskFilter{
				Status: s, Page: 1, PageSize: 1,
			})
			if err != nil {
				continue
			}
			summary[string(s)] = r.Total
		}
		return map[string]any{"summary": summary}, nil, nil

	case "create_task":
		title := getString("title")
		if title == "" {
			return map[string]any{"error": "title is required"}, nil, nil
		}
		priority := models.TaskPriority(getString("priority"))
		if priority == "" {
			priority = models.PriorityMedium
		}
		dto := models.TaskDTO{
			Title:       title,
			Description: getString("description"),
			Priority:    priority,
		}
		if ds := getString("due_date"); ds != "" {
			t, err := time.Parse(time.RFC3339, ds)
			if err == nil {
				dto.DueDate = &t
			}
		}
		task, err := h.taskService.CreateTask(ctx, userID, dto)
		if err != nil {
			return map[string]any{"error": err.Error()}, nil, nil
		}
		action := &ActionTaken{
			Type:    "create",
			Summary: fmt.Sprintf("Created task: \"%s\" [%s priority]", task.Title, task.Priority),
		}
		return map[string]any{"success": true, "task_id": task.ID.Hex(), "title": task.Title}, action, nil

	case "update_task":
		id := getString("id")
		if id == "" {
			return map[string]any{"error": "id is required"}, nil, nil
		}
		objectID, err := bson.ObjectIDFromHex(id)
		if err != nil {
			return map[string]any{"error": "invalid task ID"}, nil, nil
		}

		// Fetch existing task first
		existing, err := h.taskService.ListTasks(ctx, userID, models.TaskFilter{Page: 1, PageSize: 100})
		if err != nil {
			return map[string]any{"error": "failed to fetch task"}, nil, nil
		}
		var found *models.Task
		for i := range existing.Tasks {
			if existing.Tasks[i].ID == objectID {
				found = &existing.Tasks[i]
				break
			}
		}
		if found == nil {
			return map[string]any{"error": "task not found"}, nil, nil
		}

		// Apply updates
		if v := getString("title"); v != "" {
			found.Title = v
		}
		if v := getString("description"); v != "" {
			found.Description = v
		}
		if v := getString("status"); v != "" {
			found.Status = models.TaskStatus(v)
		}
		if v := getString("priority"); v != "" {
			found.Priority = models.TaskPriority(v)
		}
		if ds, ok := args["due_date"]; ok {
			dsStr, _ := ds.(string)
			if dsStr == "" {
				found.DueDate = nil
			} else {
				t, err := time.Parse(time.RFC3339, dsStr)
				if err == nil {
					found.DueDate = &t
				}
			}
		}

		if err := h.taskService.UpdateTask(ctx, userID, found); err != nil {
			return map[string]any{"error": err.Error()}, nil, nil
		}
		action := &ActionTaken{
			Type:    "update",
			Summary: fmt.Sprintf("Updated task: \"%s\"", found.Title),
		}
		return map[string]any{"success": true, "title": found.Title}, action, nil

	case "archive_task":
		id := getString("id")
		if id == "" {
			return map[string]any{"error": "id is required"}, nil, nil
		}
		objectID, err := bson.ObjectIDFromHex(id)
		if err != nil {
			return map[string]any{"error": "invalid task ID"}, nil, nil
		}

		// Fetch and update
		existing, err := h.taskService.ListTasks(ctx, userID, models.TaskFilter{Page: 1, PageSize: 100})
		if err != nil {
			return map[string]any{"error": "failed to fetch tasks"}, nil, nil
		}
		var found *models.Task
		for i := range existing.Tasks {
			if existing.Tasks[i].ID == objectID {
				found = &existing.Tasks[i]
				break
			}
		}
		if found == nil {
			return map[string]any{"error": "task not found"}, nil, nil
		}

		found.Status = models.StatusArchived
		if err := h.taskService.UpdateTask(ctx, userID, found); err != nil {
			return map[string]any{"error": err.Error()}, nil, nil
		}
		action := &ActionTaken{
			Type:    "archive",
			Summary: fmt.Sprintf("Archived task: \"%s\"", found.Title),
		}
		return map[string]any{"success": true, "title": found.Title}, action, nil

	default:
		return map[string]any{"error": "unknown function"}, nil, nil
	}
}

// ──────────────────────────────────────────────
// HTTP handler
// ──────────────────────────────────────────────

func (h *AIHandler) Chat(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	if req.Message == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "message is required"})
		return
	}

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "AI service not configured"})
		return
	}

	// Build conversation history for Gemini
	contents := make([]geminiContent, 0, len(req.History)+1)
	for _, msg := range req.History {
		contents = append(contents, geminiContent{
			Role:  msg.Role,
			Parts: []geminiPart{{Text: msg.Content}},
		})
	}
	// Add the current user message
	contents = append(contents, geminiContent{
		Role:  "user",
		Parts: []geminiPart{{Text: req.Message}},
	})

	sysPrompt := systemPrompt()
	gemReq := geminiRequest{
		SystemInstruction: &geminiContent{
			Parts: []geminiPart{{Text: sysPrompt}},
		},
		Contents: contents,
		Tools:    geminiTools(),
	}

	var actionsTaken []ActionTaken

	// Agentic loop: Gemini may request multiple tool calls before giving a final answer
	for range 5 { // max 5 tool-call iterations
		gemResp, err := callGemini(r.Context(), apiKey, gemReq)
		if err != nil {
			slog.Error("gemini call failed", "error", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "AI service error: " + err.Error()})
			return
		}

		fnCall := extractFunctionCall(gemResp)
		if fnCall == nil {
			// No more function calls — final text answer
			reply := extractText(gemResp)
			if reply == "" {
				reply = "I processed your request successfully."
			}
			writeJSON(w, http.StatusOK, ChatResponse{
				Reply:        reply,
				ActionsTaken: actionsTaken,
			})
			return
		}

		// Execute the tool
		slog.Info("AI executing tool", "function", fnCall.Name, "args", fnCall.Args)
		toolResult, action, err := h.executeTool(r.Context(), userID, fnCall)
		if err != nil {
			toolResult = map[string]any{"error": err.Error()}
		}
		if action != nil {
			actionsTaken = append(actionsTaken, *action)
		}

		// Append model's function call + tool result to conversation
		gemReq.Contents = append(gemReq.Contents,
			// Model's turn (the function call it made)
			geminiContent{
				Role:  "model",
				Parts: []geminiPart{{FunctionCall: fnCall}},
			},
			// Tool result turn
			geminiContent{
				Role: "user",
				Parts: []geminiPart{{
					FunctionResp: &geminiFunctionResp{
						Name:     fnCall.Name,
						Response: toolResult,
					},
				}},
			},
		)
	}

	writeJSON(w, http.StatusOK, ChatResponse{
		Reply:        "I've completed your request.",
		ActionsTaken: actionsTaken,
	})
}
