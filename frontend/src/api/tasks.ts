import { api } from "./client";
import type {
  CreateTaskPayload,
  PaginatedTasksResponse,
  Task,
  UpdateTaskPayload,
} from "../types/task";

export async function fetchTasks() {
  const { data } = await api.get<PaginatedTasksResponse>("/api/tasks", {
    params: {
      page: 1,
      page_size: 100,
      sort_by: "created_at",
      sort_dir: "desc",
    },
  });

  return data;
}

export async function createTask(payload: CreateTaskPayload) {
  const { data } = await api.post<Task>("/api/tasks", payload);
  return data;
}

export async function updateTask(taskId: string, payload: UpdateTaskPayload) {
  const { data } = await api.patch<Task>(`/api/tasks/${taskId}`, payload);
  return data;
}

export async function deleteTask(taskId: string) {
  await api.delete(`/api/tasks/${taskId}`);
}