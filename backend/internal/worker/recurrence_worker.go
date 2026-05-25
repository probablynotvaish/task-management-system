package worker

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/probablynotvaish/task-management-system/backend/internal/models"
	"github.com/probablynotvaish/task-management-system/backend/internal/repository"
)

// nextDueDate computes the first occurrence that falls strictly after `from`
// according to the given recurrence frequency.
func nextDueDate(from time.Time, freq models.RecurrenceFrequency) *time.Time {
	var next time.Time
	switch freq {
	case models.RecurrenceDaily:
		next = from.AddDate(0, 0, 1)
	case models.RecurrenceWeekly:
		next = from.AddDate(0, 0, 7)
	case models.RecurrenceMonthly:
		next = from.AddDate(0, 1, 0)
	case models.RecurrenceWeekdays:
		// Advance by 1 day, then skip over any weekend days.
		next = from.AddDate(0, 0, 1)
		for next.Weekday() == time.Saturday || next.Weekday() == time.Sunday {
			next = next.AddDate(0, 0, 1)
		}
	default:
		return nil
	}
	return &next
}

// RecurrenceWorker creates new task occurrences for completed recurring tasks.
type RecurrenceWorker struct {
	taskRepo repository.TaskRepository
}

// NewRecurrenceWorker returns a RecurrenceWorker backed by taskRepo.
func NewRecurrenceWorker(taskRepo repository.TaskRepository) *RecurrenceWorker {
	return &RecurrenceWorker{taskRepo: taskRepo}
}

// Process is the cron callback — meant to be registered in the Notifier's cron scheduler.
func (rw *RecurrenceWorker) Process() {
	ctx := context.Background()

	tasks, err := rw.taskRepo.ListRecurring(ctx)
	if err != nil {
		slog.Error("recurrence worker: failed to list recurring tasks", "error", err)
		return
	}

	now := time.Now()
	spawned := 0

	for _, task := range tasks {
		if task.Recurrence == nil || task.Recurrence.Frequency == models.RecurrenceNone {
			continue
		}

		// Respect the optional Until bound.
		if task.Recurrence.Until != nil && now.After(*task.Recurrence.Until) {
			slog.Info("recurrence worker: skipping expired recurrence", "task", task.Title)
			continue
		}

		// Determine the parent ID: if this task already IS a child occurrence, use its
		// own RecurrenceParent; otherwise use the task's own ID.
		parentID := task.ID
		if task.RecurrenceParent != nil {
			parentID = *task.RecurrenceParent
		}

		// Skip if a pending occurrence already exists for this parent.
		has, err := rw.taskRepo.HasPendingOccurrence(ctx, parentID)
		if err != nil {
			slog.Error("recurrence worker: HasPendingOccurrence failed", "task", task.ID.Hex(), "error", err)
			continue
		}
		if has {
			continue
		}

		// Compute the due date for the next occurrence.
		var baseDate time.Time
		if task.DueDate != nil {
			baseDate = *task.DueDate
		} else {
			baseDate = task.CreatedAt
		}
		nextDate := nextDueDate(baseDate, task.Recurrence.Frequency)
		if nextDate == nil {
			continue
		}

		// Only spawn if the next occurrence is still in the future.
		// This prevents older completed ancestors from re-creating occurrences
		// that have already been handled by a more recent child task.
		if !nextDate.After(now) {
			continue
		}

		newTask := &models.Task{
			Title:            task.Title,
			Description:      task.Description,
			Status:           models.StatusToDo,
			Priority:         task.Priority,
			DueDate:          nextDate,
			CreatedAt:        now,
			UserID:           task.UserID,
			Recurrence:       task.Recurrence,
			RecurrenceParent: &parentID,
		}

		if err := rw.taskRepo.Create(ctx, newTask); err != nil {
			slog.Error("recurrence worker: failed to create next occurrence",
				"parent", parentID.Hex(), "error", err)
			continue
		}

		slog.Info("recurrence worker: spawned next occurrence",
			"parent", parentID.Hex(),
			"new_task", newTask.ID.Hex(),
			"due", fmt.Sprintf("%s", nextDate.Format(time.RFC1123)),
		)
		spawned++
	}

	if spawned > 0 {
		slog.Info("recurrence worker: done", "spawned", spawned)
	}
}
