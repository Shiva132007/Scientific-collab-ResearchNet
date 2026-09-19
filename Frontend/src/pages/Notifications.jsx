import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import Pagination from "../components/Pagination";
import { getNotifications, markRead, markAllRead } from "../api/notifications";
import { getIncomingRequests, acceptRequest, declineRequest } from "../api/collaboration_requests";
import "./Notifications.css";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [notifRes, reqRes] = await Promise.all([
        getNotifications(),
        getIncomingRequests(),
      ]);
      setNotifications(notifRes.data);
      setRequests(reqRes.data);
      setError("");
    } catch {
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markRead(id);
      await loadData(false);
    } catch {
      setError("Failed to mark notification as read.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      await loadData(false);
    } catch {
      setError("Failed to mark all notifications as read.");
    }
  };

  const handleAcceptRequest = async (id) => {
    setActionLoading(`accept-${id}`);
    try {
      await acceptRequest(id);
      await loadData(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to accept request.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineRequest = async (id) => {
    setActionLoading(`decline-${id}`);
    try {
      await declineRequest(id);
      await loadData(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to decline request.");
    } finally {
      setActionLoading(null);
    }
  };

  // Filter items
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.is_read;
    if (activeTab === "requests") return n.type === "request";
    return true;
  });

  const pendingRequests = requests.filter((r) => r.status === "pending");

  const startIdx = (page - 1) * pageSize;
  const paginatedNotifications = filteredNotifications.slice(startIdx, startIdx + pageSize);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <AppShell>
      <div className="notif-page">
        <header className="notif-header">
          <div>
            <span className="dashboard-badge">Communication Center</span>
            <h1 className="notif-title">Notifications & Requests</h1>
            <p className="notif-subtitle">
              Manage your activity updates, invitation responses, and incoming collaboration requests.
            </p>
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="notif-mark-all-btn">
              ✓ Mark all as read ({unreadCount})
            </button>
          )}
        </header>

        {/* Pending Requests Banner / Section if any */}
        {pendingRequests.length > 0 && (
          <section className="notif-requests-banner" aria-labelledby="incoming-requests-heading">
            <div className="notif-requests-banner-header">
              <h2 id="incoming-requests-heading">
                📬 Pending Collaboration Requests ({pendingRequests.length})
              </h2>
            </div>
            <div className="notif-requests-grid">
              {pendingRequests.map((req) => (
                <div key={req.id} className="notif-request-card">
                  <div className="notif-request-card-info">
                    <span className="notif-type-tag">
                      {req.request_type === "project_invite" ? "🏗️ Project Collaboration" : "📝 Co-Authorship Proposal"}
                    </span>

                    {/* Sender name — prominently displayed */}
                    <p className="notif-request-sender">
                      <strong>From:</strong> {req.from_user_name || `User #${req.from_user_id}`}
                    </p>

                    {/* Related project / publication title */}
                    {req.related_title && (
                      <p className="notif-request-related">
                        <strong>{req.request_type === "project_invite" ? "Project:" : "Publication:"}</strong>{" "}
                        {req.related_title}
                      </p>
                    )}

                    <span className="notif-request-time">
                      Received {new Date(req.created_at).toLocaleDateString()}
                    </span>

                    {/* Their message / proposal */}
                    {req.message && <p className="notif-request-msg">"{req.message}"</p>}
                  </div>
                  <div className="notif-request-card-actions">
                    <button
                      onClick={() => handleAcceptRequest(req.id)}
                      disabled={actionLoading === `accept-${req.id}`}
                      className="notif-btn-accept"
                    >
                      {actionLoading === `accept-${req.id}` ? "Accepting..." : "✓ Accept"}
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(req.id)}
                      disabled={actionLoading === `decline-${req.id}`}
                      className="notif-btn-decline"
                    >
                      {actionLoading === `decline-${req.id}` ? "Declining..." : "✕ Decline"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}


        <nav className="notif-tabs" aria-label="Notification Filters">
          {[
            ["all", `All (${notifications.length})`],
            ["unread", `Unread (${unreadCount})`],
            ["requests", `Invitations (${notifications.filter((n) => n.type === "request").length})`],
          ].map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setPage(1);
              }}
              className={`notif-tab ${activeTab === tab ? "notif-tab--active" : ""}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {error && <p className="pub-error">{error}</p>}

        {loading ? (
          <p className="pub-loading">Loading notifications...</p>
        ) : (
          <div className="notif-container">
            {filteredNotifications.length === 0 ? (
              <div className="notif-empty-state">
                <span style={{ fontSize: "2.5rem" }}>🔔</span>
                <p>No notifications to display.</p>
              </div>
            ) : (
              <div className="notif-list">
                {paginatedNotifications.map((n) => (
                  <article
                    key={n.id}
                    className={`notif-card ${!n.is_read ? "notif-card--unread" : ""}`}
                  >
                    <div className="notif-card-icon">
                      {n.type === "request" && "📬"}
                      {n.type === "accepted" && "✅"}
                      {n.type === "declined" && "❌"}
                      {n.type === "info" && "ℹ️"}
                      {!["request", "accepted", "declined", "info"].includes(n.type) && "🔔"}
                    </div>

                    <div className="notif-card-content">
                      <div className="notif-card-header">
                        <h3>{n.title}</h3>
                        <span className="notif-time">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>
                      {n.message && <p className="notif-card-body">{n.message}</p>}
                    </div>

                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="notif-card-read-btn"
                        title="Mark as read"
                      >
                        Mark Read
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}

            {filteredNotifications.length > 0 && (
              <Pagination
                currentPage={page}
                totalItems={filteredNotifications.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[5, 10, 20]}
              />
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
