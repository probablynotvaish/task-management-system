import { useCallback, useEffect, useState } from "react";
import {
  createTask,
  deleteTask,
  fetchTasks,
  updateTask,
  type FetchTasksParams,
} from "../api/tasks";
import { fetchCurrentUser } from "../api/user";
import { getApiErrorMessage } from "../utils/apiError";
import {
  defaultTaskForm,
  type PaginatedTasksResponse,
  type Task,
  type TaskStatus,
  type TaskFormData,
} from "../types/task";

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

function toDateTimeInputValue(dateString?: string | null) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  
  const timezoneOffset = d.getTimezoneOffset() * 60000;
  const localDate = new Date(d.getTime() - timezoneOffset);
  
  return localDate.toISOString().slice(0, 16);
}

type PaginationState = Omit<PaginatedTasksResponse, "tasks">;

export function useDashboard(query: FetchTasksParams) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    total: 0,
    page: query.page ?? 1,
    page_size: query.page_size ?? 10,
    total_pages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [userEmail, setUserEmail] = useState(getStoredEmail());

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormData>(defaultTaskForm);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchTasks(query);
      setTasks(data.tasks ?? []);
      setPagination({
        total: data.total ?? 0,
        page: data.page ?? query.page ?? 1,
        page_size: data.page_size ?? query.page_size ?? 10,
        total_pages: data.total_pages ?? 1,
      });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to load tasks."));
    } finally {
      setLoading(false);
    }
  }, [
    query.page,
    query.page_size,
    query.status,
    query.priority,
    query.search,
    query.sort_by,
    query.sort_dir,
  ]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (getStoredEmail()) return;

    fetchCurrentUser()
      .then((data) => {
        setUserEmail(data.email);
        localStorage.setItem(
          "user",
          JSON.stringify({ id: data.id, email: data.email, name: data.name }),
        );
      })
      .catch(() => {
        // ignore; fallback display is fine
      });
  }, []);

  const openCreateModal = () => {
    setEditingTask(null);
    setForm(defaultTaskForm);
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
      due_date: toDateTimeInputValue(task.due_date),
      recurrence: task.recurrence?.frequency ?? "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (formLoading) return;
    setModalOpen(false);
    setEditingTask(null);
    setForm(defaultTaskForm);
    setFormError("");
  };

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submitTask = async () => {
    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }

    setFormLoading(true);
    setFormError("");

    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: form.title.trim(),
          description: form.description.trim(),
          priority: form.priority,
          status: form.status,
          due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
          recurrence: form.recurrence ? { frequency: form.recurrence } : null,
        });
      } else {
        await createTask({
          title: form.title.trim(),
          description: form.description.trim(),
          priority: form.priority,
          due_date: form.due_date ? new Date(form.due_date).toISOString() : undefined,
          recurrence: form.recurrence ? { frequency: form.recurrence } : null,
        });
      }

      await loadTasks();
      setModalOpen(false);
      setEditingTask(null);
      setForm(defaultTaskForm);
    } catch (err: unknown) {
      setFormError(
        getApiErrorMessage(
          err,
          editingTask ? "Failed to update task." : "Failed to create task.",
        ),
      );
    } finally {
      setFormLoading(false);
    }
  };

  const setTaskStatus = async (task: Task, newStatus: TaskStatus) => {
  try {
    await updateTask(task.id, {
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: newStatus,
      due_date: task.due_date ?? null,
    });

    if (query.status === "archived" && newStatus !== "archived") {
      await loadTasks();
      return;
    }

    setTasks((prev) => {
      const remaining = prev.filter((t) => t.id !== task.id);
      const updatedTask = { ...task, status: newStatus };

      if (newStatus === "completed") {
        return [...remaining, updatedTask];
      }

      const firstCompletedIndex = remaining.findIndex(
        (t) => t.status === "completed",
      );

      if (firstCompletedIndex === -1) {
        return [...remaining, updatedTask];
      }

      const next = [...remaining];
      next.splice(firstCompletedIndex, 0, updatedTask);
      return next;
    });
  } catch (err: unknown) {
    setError(getApiErrorMessage(err, "Failed to update task status."));
  }
};

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === "completed" ? "to_do" : "completed";
    await setTaskStatus(task, newStatus);
  };

  const promptDelete = (task: Task) => {
    setDeleteError("");
    setDeleteTarget(task);
  };

  const cancelDelete = () => {
    if (deleteLoading) return;
    setDeleteTarget(null);
    setDeleteError("");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    setDeleteError("");

    try {
      await deleteTask(deleteTarget.id);
      await loadTasks();
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteError(getApiErrorMessage(err, "Failed to delete task."));
    } finally {
      setDeleteLoading(false);
    }
  };

  return {
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
    toggleTaskStatus,
    setTaskStatus,
    

    promptDelete,
    cancelDelete,
    confirmDelete,
    refreshTasks: loadTasks,
  };
}