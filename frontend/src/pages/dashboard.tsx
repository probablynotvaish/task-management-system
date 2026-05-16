import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../utils/apiError";
import axios from "axios";
import "./dashboard.css";

type Theme = "light" | "dark";

type TaskStatus = "to_do" | "in_progress" | "completed" | "archived";
type TaskPriority = "low" | "medium" | "high";

type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
  created_at: string;
};

type PaginatedTasksResponse = {
  tasks: Task[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

type TaskFormData = {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
};

const defaultForm: TaskFormData = {
  title: "",
  description: "",
  priority: "medium",
  status: "to_do",
  due_date: "",
};

const statusLabel: Record<TaskStatus, string> = {
  to_do: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  archived: "Archived",
};

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

function getStoredEmail(): string {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { email?: string };
    return parsed.email ?? "";
  } catch {
    return "";
  }
}

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

/** Convert ISO/datetime string → "YYYY-MM-DD" for <input type="date"> */
function toDateInputValue(dateString?: string | null) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function Dashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState<string>(getStoredEmail);

  // ─── Theme ─────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme) ?? "light",
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>(
    "all",
  );

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormData>(defaultForm);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // ─── Load tasks + hydrate user email ──────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    axios.defaults.headers.common.Authorization = `Bearer ${token}`;

    // If the email wasn't persisted (e.g. after OAuth callback), fetch it now.
    if (!getStoredEmail()) {
      axios
        .get<{ id: string; email: string }>("/api/me")
        .then(({ data }) => {
          setUserEmail(data.email);
          localStorage.setItem(
            "user",
            JSON.stringify({ id: data.id, email: data.email }),
          );
        })
        .catch(() => {
          // leave userEmail as empty — the fallback display handles it
        });
    }

    const loadTasks = async () => {
      try {
        setLoading(true);
        setError("");

        const { data } = await axios.get<PaginatedTasksResponse>("/api/tasks", {
          params: {
            page: 1,
            page_size: 100,
            sort_by: "created_at",
            sort_dir: "desc",
          },
        });

        setTasks(data.tasks ?? []);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, "Failed to load tasks."));
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [navigate]);

  // ─── Logout ────────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common.Authorization;
    navigate("/", { replace: true });
  };

  // ─── Filters / derived state ───────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, search, statusFilter, priorityFilter]);

  const counts = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter((task) => task.status === "to_do").length,
      inProgress: tasks.filter((task) => task.status === "in_progress").length,
      completed: tasks.filter((task) => task.status === "completed").length,
    };
  }, [tasks]);

  // ─── Modal helpers ─────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingTask(null);
    setForm(defaultForm);
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      due_date: toDateInputValue(task.due_date),
    });
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (formLoading) return;
    setModalOpen(false);
    setEditingTask(null);
    setFormError("");
  };

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ─── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    setFormLoading(true);
    setFormError("");
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
      };
      if (form.due_date)
        payload.due_date = new Date(form.due_date).toISOString();

      const { data: newTask } = await axios.post<Task>("/api/tasks", payload);
      setTasks((prev) => [newTask, ...prev]);
      setModalOpen(false);
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err, "Failed to create task."));
    } finally {
      setFormLoading(false);
    }
  };

  // ─── Update ────────────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!editingTask) return;

    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }

    setFormLoading(true);
    setFormError("");

    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        status: form.status,
      };

      if (form.due_date) {
        payload.due_date = new Date(form.due_date).toISOString();
      } else {
        payload.due_date = null;
      }

      const { data: updated } = await axios.patch<Task>(
        `/api/tasks/${editingTask.id}`,
        payload,
      );

      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

      setModalOpen(false);
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err, "Failed to update task."));
    } finally {
      setFormLoading(false);
    }
  };

  // ─── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    setDeleteError("");

    try {
      await axios.delete(`/api/tasks/${deleteTarget.id}`);
      setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteError(getApiErrorMessage(err, "Failed to delete task."));
    } finally {
      setDeleteLoading(false);
    }
  };

  const visibleTasks = filteredTasks;

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
          <section className="task-grid">
            {visibleTasks.length === 0 ? (
              <div className="state-box">No tasks found.</div>
            ) : (
              visibleTasks.map((task) => {
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

                    <div className={`due-date ${overdue ? "due-overdue" : ""}`}>
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
                        // onClick={() => setDeleteTarget(task)}
                        onClick={() => {
                          setDeleteError("");
                          setDeleteTarget(task);
                        }}
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
        )}
      </main>

      {/* ── Create / Edit Modal ─────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="modal-overlay"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTask ? "Edit Task" : "New Task"}</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={closeModal}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="task-title">Title *</label>
                <input
                  id="task-title"
                  type="text"
                  name="title"
                  placeholder="Task title"
                  value={form.title}
                  onChange={handleFormChange}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="task-desc">Description</label>
                <textarea
                  id="task-desc"
                  name="description"
                  placeholder="What needs to be done?"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="task-priority">Priority</label>
                  <div className="select-wrap">
                    <select
                      id="task-priority"
                      name="priority"
                      value={form.priority}
                      onChange={handleFormChange}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <span className="select-arrow">▾</span>
                  </div>
                </div>

                {editingTask && (
                  <div className="form-group">
                    <label htmlFor="task-status">Status</label>
                    <div className="select-wrap">
                      <select
                        id="task-status"
                        name="status"
                        value={form.status}
                        onChange={handleFormChange}
                      >
                        <option value="to_do">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="archived">Archived</option>
                      </select>
                      <span className="select-arrow">▾</span>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="task-due">Due Date</label>
                  <input
                    id="task-due"
                    type="date"
                    name="due_date"
                    value={form.due_date}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              {formError && <p className="form-error">{formError}</p>}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeModal}
                disabled={formLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={editingTask ? handleUpdate : handleCreate}
                disabled={formLoading}
              >
                {formLoading
                  ? editingTask
                    ? "Saving…"
                    : "Creating…"
                  : editingTask
                    ? "Save Changes"
                    : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ──────────────────────────────────────── */}
      {deleteTarget && (
        <div
          className="modal-overlay"
          onClick={() => !deleteLoading && setDeleteTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-box modal-box-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Delete Task</h2>
            </div>
            <div className="modal-body">
              <p className="delete-confirm-text">
                Are you sure you want to delete{" "}
                <strong>"{deleteTarget.title}"</strong>? This action cannot be
                undone.
              </p>
              {deleteError && <p className="form-error">{deleteError}</p>}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
