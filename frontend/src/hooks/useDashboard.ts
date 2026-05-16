import { useCallback, useEffect, useState } from "react";
import { createTask, deleteTask, fetchTasks, updateTask } from "../api/tasks";
import { fetchCurrentUser } from "../api/user";
import { getApiErrorMessage } from "../utils/apiError";
import {
  defaultTaskForm,
  type Task,
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

function toDateInputValue(dateString?: string | null) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function useDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
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
      const data = await fetchTasks();
      setTasks(data.tasks ?? []);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to load tasks."));
    } finally {
      setLoading(false);
    }
  }, []);

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
          JSON.stringify({ id: data.id, email: data.email }),
        );
      })
      .catch(() => {
        // ignore; the page already has a fallback display
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
      due_date: toDateInputValue(task.due_date),
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
        const updated = await updateTask(editingTask.id, {
          title: form.title.trim(),
          description: form.description.trim(),
          priority: form.priority,
          status: form.status,
          due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        });

        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await createTask({
          title: form.title.trim(),
          description: form.description.trim(),
          priority: form.priority,
          due_date: form.due_date ? new Date(form.due_date).toISOString() : undefined,
        });

        setTasks((prev) => [created, ...prev]);
      }

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
      setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteError(getApiErrorMessage(err, "Failed to delete task."));
    } finally {
      setDeleteLoading(false);
    }
  };

  return {
    tasks,
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
  };
}