import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./dashboard.css";

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

function getUserEmail() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return "user@example.com";
    const parsed = JSON.parse(raw) as { email?: string };
    return parsed.email || "user@example.com";
  } catch {
    return "user@example.com";
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

function Dashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>(
    "all",
  );

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    axios.defaults.headers.common.Authorization = `Bearer ${token}`;

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
        if (axios.isAxiosError(err)) {
          const message =
            typeof err.response?.data?.error === "string"
              ? err.response.data.error
              : "Failed to load tasks.";
          setError(message);
        } else {
          setError("Failed to load tasks.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common.Authorization;
    navigate("/", { replace: true });
  };

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

  const visibleTasks = filteredTasks;

  return (
    <div className="dashboard-page">
      <header className="dashboard-topbar">
        <div className="dashboard-title-wrap">
          <h1>Task Management</h1>
          <p>Welcome back, {getUserEmail()}!</p>
        </div>

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

          <button type="button" className="new-task-btn">
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
                      <button type="button" className="edit-btn">
                        <span className="icon" aria-hidden="true">
                          ✎
                        </span>
                        Edit
                      </button>

                      <button type="button" className="delete-btn">
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
    </div>
  );
}

export default Dashboard;