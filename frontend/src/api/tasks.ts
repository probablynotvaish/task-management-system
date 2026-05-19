import { api } from "./client";
import type {
  CreateTaskPayload,
  PaginatedTasksResponse,
  TaskPriority,
  TaskStatus,
  UpdateTaskPayload,
} from "../types/task";

export type FetchTasksParams = {
  page?: number;
  page_size?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
};

export async function fetchTasks(params: FetchTasksParams = {}) {
  const { data } = await api.get<PaginatedTasksResponse>("/api/tasks", {
    params,
  });
  return data;
}

export async function createTask(payload: CreateTaskPayload) {
  const { data } = await api.post("/api/tasks", payload);
  return data;
}

export async function updateTask(taskId: string, payload: UpdateTaskPayload) {
  const { data } = await api.patch(`/api/tasks/${taskId}`, payload);
  return data;
}

export async function deleteTask(taskId: string) {
  await api.delete(`/api/tasks/${taskId}`);
}