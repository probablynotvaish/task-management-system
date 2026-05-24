import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useNotifications } from "../../hooks/useNotifications";
import "./layout.css";

type Theme = "light" | "dark";

function MainLayout() {
  const navigate = useNavigate();

  // --- ADDED THIS: Hooking up our new notification logic ---
  const { notifications, unreadCount, readNotification } = useNotifications();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  // --------------------------------------------------------

  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "light";
  });

  const [userName, setUserName] = useState("");

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setUserName(parsed.name || parsed.email);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Planora</h2> {/* <-- Updated from Taskora just in case! */}
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="icon" aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="6" height="6" rx="1" />
                <path d="m3 17 2 2 4-4" />
                <path d="M13 6h8" />
                <path d="M13 12h8" />
                <path d="M13 18h8" />
              </svg>
            </span>
            All Tasks
          </NavLink>

          <NavLink
            to="/calendar"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="icon" aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            Calendar
          </NavLink>

          <NavLink
            to="/archive"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="icon" aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
            </span>
            Archive
          </NavLink>
        </nav>
      </aside>

      <div className="main-wrapper">
        <header className="layout-topbar">
          <div className="topbar-welcome">
            <p>Welcome back, {userName || "there"}!</p>
          </div>

          <div className="topbar-actions">
            {/* --- ADDED THIS: NOTIFICATION BELL WIDGET --- */}
            <div className="notification-wrapper">
              <button
                type="button"
                className="bell-btn"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>

                {unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount}</span>
                )}
              </button>

              {isNotifOpen && (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <h4>Notifications</h4>
                  </div>
                  <div className="notif-body">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">You're all caught up!</div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className="notif-item"
                          onClick={() => readNotification(notif.id)}
                        >
                          <p className="notif-title">{notif.title}</p>
                          <p className="notif-message">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* ------------------------------------------- */}

            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

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
          </div>
        </header>

        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
