import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";

import { useDashboard } from "../hooks/useDashboard";
import TaskModal from "../components/tasks/TaskModal";
import DeleteTaskDialog from "../components/tasks/DeleteTaskDialog";
import { statusLabel, type TaskPriority, type TaskStatus } from "../types/task";

type Theme = "light" | "dark";

const statusFilterOptions: Array<{ label: string; value: "all" | TaskStatus }> =
  [
    { label: "All Statuses", value: "all" },
    { label: "Pending", value: "to_do" },
    { label: "In Progress", value: "in_progress" },
    { label: "Completed", value: "completed" },
    { label: "Archived", value: "archived" },
  ];

const priorityFilterOptions: Array<{
  label: string;
  value: "all" | TaskPriority;
}> = [
  { label: "All Priorities", value: "all" },
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
  const navigate = useNavigate();

  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme");
    return stored === "dark" ? "dark" : "light";
  });

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
    userEmail,
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
    promptDelete,
    cancelDelete,
    confirmDelete,
  } = useDashboard(taskQuery);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const counts = useMemo(() => {
    return {
      total: pagination.total,
      pending: tasks.filter((task) => task.status === "to_do").length,
      inProgress: tasks.filter((task) => task.status === "in_progress").length,
      completed: tasks.filter((task) => task.status === "completed").length,
    };
  }, [tasks, pagination.total]);

  return (
    <div className="dashboard-page">
      <header className="dashboard-topbar">
        <div className="dashboard-title-wrap">
          <h1>Task Management</h1>
          <p>Welcome back, {userEmail || "there"}!</p>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            title={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          <button type="button" className="logout-btn" onClick={logout}>
            <span className="icon icon-logout">
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
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="stats-row">
          <article className="stat-card">
            <span className="stat-label">Total Tasks</span>
            <strong className="stat-value">{counts.total}</strong>
          </article>

          <article className="stat-card">
            <span className="stat-label">Pending</span>
            <strong className="stat-value stat-pending">
              {counts.pending}
            </strong>
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
            </span>
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
              {tasks.length === 0 ? (
                <div className="state-box">No tasks found.</div>
              ) : (
                tasks.map((task) => {
                  const overdue = isOverdue(task.due_date);

                  return (
                    <article key={task.id} className="task-card">
                      <div className="task-card-header">
                        <h3>{task.title}</h3>

                        <span
                          className={`flag flag-${task.priority}`}
                          aria-hidden="true"
                        >
                          ⚑
                        </span>
                      </div>

                      <p className="task-desc">{task.description}</p>

                      <div className="task-badges">
                        <span className={`status-pill status-${task.status}`}>
                          {statusLabel[task.status]}
                        </span>
                        <span className="priority-pill">
                          {task.priority.charAt(0).toUpperCase() +
                            task.priority.slice(1)}
                        </span>
                      </div>

                      <div
                        className={`due-date ${overdue ? "due-overdue" : ""}`}
                      >
                        <span className="icon icon-calendar" aria-hidden="true">
                          📅
                        </span>
                        <span>
                          {formatDate(task.due_date)}
                          {overdue ? " (Overdue)" : ""}
                        </span>
                      </div>

                      <div className="task-actions">
                        <button
                          type="button"
                          className="edit-btn"
                          onClick={() => openEditModal(task)}
                        >
                          <span className="icon" aria-hidden="true">
                            ✎
                          </span>
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete-btn"
                          onClick={() => promptDelete(task)}
                          aria-label="Delete task"
                        >
                          <span className="icon" aria-hidden="true">
                            🗑
                          </span>
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </section>

            {/* <div className="pagination-controls">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                Previous
              </button>

              <span>
                Page {page} of {pagination.total_pages || 1}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={loading || page >= (pagination.total_pages || 1)}
              >
                Next
              </button>
            </div> */}
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
      </main>

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
