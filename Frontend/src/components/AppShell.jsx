import { useState, useEffect, useRef } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getNotifications, getUnreadCount, markRead, markAllRead } from "../api/notifications";
import GlobalSearchModal from "./GlobalSearchModal";
import FloatingAssistant from "./FloatingAssistant";
import "./AppShell.css";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "⬡" },
  { to: "/discover", label: "Discover", icon: "🌐" },
  { to: "/network", label: "Network Graph", icon: "🕸️" },
  { to: "/publications", label: "Publications", icon: "📄" },
  { to: "/projects", label: "Projects", icon: "🔬" },
  { to: "/conferences", label: "Conferences", icon: "🎙" },
  { to: "/collaborations", label: "Collaborations", icon: "🤝" },
  { to: "/citations", label: "Citations", icon: "🔗" },
  { to: "/institutions", label: "Institutions", icon: "🏛" },
  { to: "/notifications", label: "Notifications", icon: "🔔" },
  { to: "/reports", label: "Reports", icon: "📊" },
  { to: "/profile", label: "My Profile", icon: "👤" },
];

const getRoleColor = (role) => {
  if (role === "SystemAdmin") return "#f59e0b";
  if (role === "InstitutionAdmin") return "#10b981";
  return "#4f7fff";
};

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const dropdownRef = useRef(null);

  const [theme, setTheme] = useState(() => localStorage.getItem("scna_theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("scna_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const fetchNotifSummary = async () => {
    if (!user) return;
    try {
      const [countRes, notifRes] = await Promise.all([
        getUnreadCount(),
        getNotifications(),
      ]);
      setUnreadCount(countRes.data.count);
      setNotifications(notifRes.data.slice(0, 5));
    } catch {
      // Ignore background fetch error
    }
  };

  useEffect(() => {
    fetchNotifSummary();
    const interval = setInterval(fetchNotifSummary, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Real-Time WebSocket Connection
  useEffect(() => {
    if (!user?.id) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/${user.id}`;
    let ws;

    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "notification") {
            fetchNotifSummary();
            setToastMessage(payload.data.title || "New notification received");
            setTimeout(() => setToastMessage(""), 4500);
          }
        } catch {
          // Ignore
        }
      };
    } catch {
      // Ignore WS setup fail
    }

    return () => {
      if (ws) ws.close();
    };
  }, [user?.id]);

  // Keyboard shortcut Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await markRead(id);
      fetchNotifSummary();
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      fetchNotifSummary();
    } catch {
      // Ignore
    }
  };

  const auditItems = (user?.role === "SystemAdmin" || user?.role === "InstitutionAdmin")
    ? [{ to: "/audit", label: "Audit Log", icon: "🛡" }]
    : [];

  const allNavItems = [...NAV_ITEMS, ...auditItems];
  const showFloatingAssistant = location.pathname !== "/assistant";

  return (
    <div className="app-shell">
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="app-toast-banner" onClick={() => navigate("/notifications")}>
          <span>🔔</span>
          <p>{toastMessage}</p>
          <span className="app-toast-arrow">View →</span>
        </div>
      )}

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />

      {/* Top Header */}
      <header className="app-header">
        <div className="app-brand">
          <div className="app-logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="13" stroke="url(#grad)" strokeWidth="1.5"/>
              <circle cx="8" cy="14" r="3.5" fill="url(#grad)"/>
              <circle cx="20" cy="9" r="3.5" fill="url(#grad2)"/>
              <circle cx="20" cy="19" r="3.5" fill="url(#grad3)"/>
              <line x1="11.5" y1="14" x2="16.7" y2="10.5" stroke="rgba(79,127,255,0.6)" strokeWidth="1"/>
              <line x1="11.5" y1="14" x2="16.7" y2="17.5" stroke="rgba(79,127,255,0.6)" strokeWidth="1"/>
              <line x1="16.8" y1="10.5" x2="16.8" y2="17.5" stroke="rgba(124,58,237,0.4)" strokeWidth="1"/>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#4f7fff"/>
                  <stop offset="1" stopColor="#7c3aed"/>
                </linearGradient>
                <linearGradient id="grad2" x1="17" y1="6" x2="23" y2="12" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#06b6d4"/>
                  <stop offset="1" stopColor="#4f7fff"/>
                </linearGradient>
                <linearGradient id="grad3" x1="17" y1="16" x2="23" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7c3aed"/>
                  <stop offset="1" stopColor="#4f7fff"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="app-brand-text">
            <span className="app-eyebrow">Scientific Collaboration</span>
            <span className="app-title">ResearchNet</span>
          </div>
        </div>

        <div className="app-header-right">
          {/* Header Global Search Trigger */}
          <button
            className="app-search-trigger"
            onClick={() => setSearchModalOpen(true)}
            aria-label="Global Search"
          >
            <span>🔍 Search network...</span>
            <span className="app-search-kbd">Ctrl+K</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="app-notif-btn"
            title={theme === "dark" ? "Switch to Day Light Mode" : "Switch to Night Dark Mode"}
            aria-label="Toggle Theme"
            style={{ fontSize: "1.1rem" }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          {/* Notification Bell Dropdown */}
          <div className="app-notif-wrapper" ref={dropdownRef}>
            <button
              className="app-notif-btn"
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              aria-label="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span className="app-notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
              )}
            </button>

            {notifDropdownOpen && (
              <div className="app-notif-dropdown">
                <div className="app-notif-dropdown-header">
                  <strong>Notifications</strong>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="app-notif-mark-all">
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="app-notif-dropdown-list">
                  {notifications.length === 0 ? (
                    <p className="app-notif-empty">No notifications yet.</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`app-notif-item ${!n.is_read ? "app-notif-item--unread" : ""}`}
                      >
                        <div className="app-notif-item-content">
                          <span className="app-notif-item-title">{n.title}</span>
                          {n.message && <p className="app-notif-item-msg">{n.message}</p>}
                          <span className="app-notif-item-time">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {!n.is_read && (
                          <button
                            onClick={(e) => handleMarkRead(n.id, e)}
                            className="app-notif-item-read-btn"
                            title="Mark as read"
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <Link
                  to="/notifications"
                  className="app-notif-dropdown-footer"
                  onClick={() => setNotifDropdownOpen(false)}
                >
                  View all notifications →
                </Link>
              </div>
            )}
          </div>

          <div className="app-user-chip" onClick={() => navigate("/profile")} style={{ cursor: "pointer" }} title="View Profile">
            <div className="app-user-avatar" style={{ background: getRoleColor(user?.role) }}>
              {user?.email?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="app-user-info">
              <span className="app-user-email">{user?.email}</span>
              <span className="app-user-role" style={{ color: getRoleColor(user?.role) }}>
                {user?.role}
              </span>
            </div>
          </div>
          <button onClick={logout} className="app-logout" aria-label="Sign out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Sign out</span>
          </button>
          <button
            className="app-mobile-toggle"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle navigation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileNavOpen ? (
                <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              ) : (
                <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className={`app-nav ${mobileNavOpen ? "app-nav--open" : ""}`} aria-label="Workspace navigation">
        {allNavItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `app-nav-link ${isActive ? "app-nav-link--active" : ""}`}
            onClick={() => setMobileNavOpen(false)}
          >
            <span className="app-nav-icon">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Page Content */}
      <main className="app-content">
        {children}
      </main>

      {showFloatingAssistant && <FloatingAssistant />}
    </div>
  );
}
