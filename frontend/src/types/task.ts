export type TaskStatus = "to_do" | "in_progress" | "completed" | "archived";
export type TaskPriority = "low" | "medium" | "high";
export type RecurrenceFrequency = "daily" | "weekdays" | "weekly" | "monthly" | "";

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  until?: string | null;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
  created_at: string;
  recurrence?: RecurrenceRule | null;
  recurrence_parent?: string | null;
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
  recurrence: RecurrenceFrequency;
};

export type CreateTaskPayload = {
  title: string;
  description: string;
  priority: TaskPriority;
  due_date?: string;
  recurrence?: { frequency: RecurrenceFrequency } | null;
};

export type UpdateTaskPayload = {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  recurrence?: { frequency: RecurrenceFrequency } | null;
};

export const defaultTaskForm: TaskFormData = {
  title: "",
  description: "",
  priority: "medium",
  status: "to_do",
  due_date: "",
  recurrence: "",
};

export const statusLabel: Record<TaskStatus, string> = {
  to_do: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  archived: "Archived",
};

export const recurrenceLabel: Record<RecurrenceFrequency, string> = {
  "":         "Does not repeat",
  daily:      "Daily",
  weekdays:   "Weekdays (Mon–Fri)",
  weekly:     "Weekly",
  monthly:    "Monthly",
};