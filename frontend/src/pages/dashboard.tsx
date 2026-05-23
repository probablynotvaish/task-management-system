import { useEffect, useMemo, useState } from "react";
import "./dashboard.css";

import { useDashboard } from "../hooks/useDashboard";
import TaskModal from "../components/tasks/TaskModal";
import DeleteTaskDialog from "../components/tasks/DeleteTaskDialog";
import { type TaskPriority, type TaskStatus } from "../types/task";

const statusFilterOptions: Array<{ label: string; value: "all" | TaskStatus }> =
  [
    { label: "Status", value: "all" },
    { label: "Pending", value: "to_do" },
    { label: "In Progress", value: "in_progress" },
    { label: "Completed", value: "completed" },
    { label: "Archived", value: "archived" },
  ];

const priorityFilterOptions: Array<{
  label: string;
  value: "all" | TaskPriority;
}> = [
  { label: "Priorities", value: "all" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

function isOverdue(dateString?: string | null) {
  if (!dateString) return false;
  const due = new Date(dateString);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  return (
    due.getTime() <
    new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  );
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function Dashboard() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>(
    "all",
  );
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, priorityFilter]);

  const taskQuery = {
    page,
    page_size: pageSize,
    search: search.trim() || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    priority: priorityFilter === "all" ? undefined : priorityFilter,
    sort_by: "created_at",
    sort_dir: "desc" as const,
  };

  const {
    tasks,
    pagination,
    loading,
    error,
    modalOpen,
    editingTask,
    form,
    formError,
    formLoading,
    deleteTarget,
    deleteError,
    deleteLoading,
    openCreateModal,
    openEditModal,
    closeModal,
    handleFormChange,
    submitTask,
    toggleTaskStatus,
    promptDelete,
    cancelDelete,
    confirmDelete,
  } = useDashboard(taskQuery);

  const counts = useMemo(() => {
    return {
      total: pagination.total,
      pending: tasks.filter((task) => task.status === "to_do").length,
      inProgress: tasks.filter((task) => task.status === "in_progress").length,
      completed: tasks.filter((task) => task.status === "completed").length,
    };
  }, [tasks, pagination.total]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (a.status !== "completed" && b.status === "completed") return -1;
      return 0;
    });
  }, [tasks]);

  return (
    <div className="dashboard-content">
      <section className="stats-row">
        <article className="stat-card">
          <span className="stat-label">Total Tasks</span>
          <strong className="stat-value">{counts.total}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Pending</span>
          <strong className="stat-value stat-pending">{counts.pending}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">In Progress</span>
          <strong className="stat-value stat-progress">
            {counts.inProgress}
          </strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Completed</span>
          <strong className="stat-value stat-completed">
            {counts.completed}
          </strong>
        </article>
      </section>

      <section className="toolbar-card">
        <div className="search-box">
          <span className="search-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="select-wrap">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | TaskStatus)
            }
          >
            {statusFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="select-arrow">▾</span>
        </div>

        <div className="select-wrap">
          <select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as "all" | TaskPriority)
            }
          >
            {priorityFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="select-arrow">▾</span>
        </div>

        <button
          type="button"
          className="new-task-btn"
          onClick={openCreateModal}
        >
          <span className="icon" aria-hidden="true">
            +
          </span>{" "}
          New Task
        </button>
      </section>

      {loading && <div className="state-box">Loading tasks...</div>}
      {!loading && error && (
        <div className="state-box state-error">{error}</div>
      )}

      {!loading && !error && (
        <>
          <section className="task-grid">
            {sortedTasks.length === 0 ? (
              <div className="state-box">No tasks found.</div>
            ) : (
              sortedTasks.map((task) => {
                const hasDueDate = Boolean(task.due_date);
                const overdue = hasDueDate ? isOverdue(task.due_date) : false;
                const isCompleted = task.status === "completed";

                return (
                  <article
                    key={task.id}
                    className={`task-card ${isCompleted ? "task-completed" : ""}`}
                  >
                    <div className="task-card-header">
                      <div className="task-title-wrap">
                        <input
                          type="checkbox"
                          className="task-checkbox"
                          checked={isCompleted}
                          onChange={() => toggleTaskStatus(task)}
                        />
                        <h3>{task.title}</h3>
                      </div>
                      <span
                        className={`priority-badge priority-${task.priority}`}
                      >
                        <span className="priority-icon" aria-hidden="true">
                          <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M5 3c0-.55.45-1 1-1h10.59c.45 0 .88.18 1.2.49l2.72 2.72c.31.31.49.74.49 1.2V18c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1V3zm2 1v13h12V7.41L15.59 4H7zm0 1.5h8v2H7v-2zm0 4h8v2H7v-2z" />
                          </svg>
                        </span>
                        <span>{task.priority}</span>
                      </span>
                    </div>

                    <p className="task-description">{task.description}</p>

                    {hasDueDate && (
                      <div
                        className={`due-date ${overdue ? "due-overdue" : ""}`}
                      >
                        <span className="due-date-icon" aria-hidden="true">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="4" width="18" height="17" rx="3" />
                            <line x1="8" y1="2.5" x2="8" y2="6" />
                            <line x1="16" y1="2.5" x2="16" y2="6" />
                            <line x1="3" y1="9" x2="21" y2="9" />
                          </svg>
                        </span>
                        <span>
                          {formatDate(task.due_date)}
                          {overdue ? " (Overdue)" : ""}
                        </span>
                      </div>
                    )}

                    <div className="task-card-actions">
                      <button
                        type="button"
                        className="edit-button"
                        onClick={() => openEditModal(task)}
                      >
                        <span className="button-icon" aria-hidden="true">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </span>
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => promptDelete(task)}
                      >
                        <span className="button-icon" aria-hidden="true">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                        </span>
                        <span>Delete</span>
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </section>

          <div className="pagination-controls">
            <button
              type="button"
              className="pagination-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              ← Previous
            </button>
            <span className="pagination-status">
              Page {page} of {pagination.total_pages || 1}
            </span>
            <button
              type="button"
              className="pagination-btn"
              onClick={() => setPage((p) => p + 1)}
              disabled={loading || page >= (pagination.total_pages || 1)}
            >
              Next →
            </button>
          </div>
        </>
      )}

      <TaskModal
        open={modalOpen}
        editingTask={editingTask}
        form={form}
        formError={formError}
        formLoading={formLoading}
        onClose={closeModal}
        onChange={handleFormChange}
        onSubmit={submitTask}
      />
      <DeleteTaskDialog
        task={deleteTarget}
        error={deleteError}
        loading={deleteLoading}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default Dashboard;
