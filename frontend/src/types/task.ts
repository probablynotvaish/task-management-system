export type TaskStatus = "to_do" | "in_progress" | "completed" | "archived";
export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
  created_at: string;
};

export type PaginatedTasksResponse = {
  tasks: Task[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type TaskFormData = {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
};

export type CreateTaskPayload = {
  title: string;
  description: string;
  priority: TaskPriority;
  due_date?: string;
};

export type UpdateTaskPayload = {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
};

export const defaultTaskForm: TaskFormData = {
  title: "",
  description: "",
  priority: "medium",
  status: "to_do",
  due_date: "",
};

export const statusLabel: Record<TaskStatus, string> = {
  to_do: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  archived: "Archived",
};