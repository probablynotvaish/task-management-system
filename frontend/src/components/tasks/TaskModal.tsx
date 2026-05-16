import type { ChangeEvent } from "react";
import type { Task, TaskFormData } from "../../types/task";

type Props = {
  open: boolean;
  editingTask: Task | null;
  form: TaskFormData;
  formError: string;
  formLoading: boolean;
  onClose: () => void;
  onChange: (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  onSubmit: () => void;
};

export default function TaskModal({
  open,
  editingTask,
  form,
  formError,
  formLoading,
  onClose,
  onChange,
  onSubmit,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onClick={() => !formLoading && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingTask ? "Edit Task" : "New Task"}</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close modal"
            disabled={formLoading}
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
              value={form.title}
              onChange={onChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="task-description">Description</label>
            <textarea
              id="task-description"
              name="description"
              value={form.description}
              onChange={onChange}
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
                  onChange={onChange}
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
                    onChange={onChange}
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
                onChange={onChange}
              />
            </div>
          </div>

          {formError && <p className="form-error">{formError}</p>}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={formLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onSubmit}
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
  );
}