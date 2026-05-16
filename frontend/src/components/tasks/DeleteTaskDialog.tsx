import type { Task } from "../../types/task";

type Props = {
  task: Task | null;
  error: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteTaskDialog({
  task,
  error,
  loading,
  onCancel,
  onConfirm,
}: Props) {
  if (!task) return null;

  return (
    <div
      className="modal-overlay"
      onClick={() => !loading && onCancel()}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-box modal-box-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Delete Task</h2>
        </div>

        <div className="modal-body">
          <p className="delete-confirm-text">
            Are you sure you want to delete <strong>"{task.title}"</strong>?
            This action cannot be undone.
          </p>
          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}