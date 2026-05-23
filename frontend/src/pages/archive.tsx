import "./dashboard.css";
import { useDashboard } from "../hooks/useDashboard";
import DeleteTaskDialog from "../components/tasks/DeleteTaskDialog";

function Archive() {
  const {
    tasks,
    loading,
    error,
    deleteTarget,
    deleteError,
    deleteLoading,
    promptDelete,
    cancelDelete,
    confirmDelete,
    setTaskStatus,
  } = useDashboard({
    page: 1,
    page_size: 50,
    status: "archived",
    sort_by: "created_at",
    sort_dir: "desc",
  });

  return (
    <div className="dashboard-content">
      <div style={{ marginBottom: "30px" }}>
        <h2
          style={{
            fontSize: "24px",
            margin: "0 0 8px 0",
            color: "var(--text-primary)",
          }}
        >
          Archived Tasks
        </h2>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          Tasks you've moved out of your main workflow.
        </p>
      </div>

      {loading && <div className="state-box">Loading archive...</div>}
      {!loading && error && (
        <div className="state-box state-error">{error}</div>
      )}

      {!loading && !error && (
        <>
          <section className="task-grid">
            {tasks.length === 0 ? (
              <div className="state-box">Your archive is empty.</div>
            ) : (
              tasks.map((task) => (
                <article key={task.id} className="task-card">
                  <div className="task-card-header">
                    <h3>{task.title}</h3>
                    <span className="status-pill status-archived">
                      Archived
                    </span>
                  </div>

                  <p className="task-description">{task.description}</p>

                  <div className="task-card-actions">
                    <button
                      type="button"
                      className="edit-button"
                      onClick={() => setTaskStatus(task, "to_do")}
                    >
                      <span className="button-icon" aria-hidden="true">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="9 10 4 15 9 20" />
                          <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                        </svg>
                      </span>
                      <span>Unarchive</span>
                    </button>

                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => promptDelete(task)}
                    >
                      <span className="button-icon" aria-hidden="true">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </span>
                      <span>Delete</span>
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        </>
      )}

      <DeleteTaskDialog
        task={deleteTarget}
        error={deleteError}
        loading={deleteLoading}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default Archive;
