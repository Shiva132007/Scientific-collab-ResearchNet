import { useEffect, useState, useMemo } from "react";
import AppShell from "../components/AppShell";
import Pagination from "../components/Pagination";
import { getAuditLogs } from "../api/audit";
import "./Audit.css";

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [tableFilter, setTableFilter] = useState("ALL");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let ignore = false;
    getAuditLogs(200)
      .then((res) => {
        if (!ignore) {
          setLogs(res.data);
          setError("");
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.response?.data?.detail || "Access Denied: You do not have administrative permissions to view audit trails.");
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const getActionBadgeClass = (action) => {
    if (action.includes("CREATE") || action.includes("ADD")) return "audit-action-badge--create";
    if (action.includes("UPDATE") || action.includes("ASSIGN")) return "audit-action-badge--update";
    if (action.includes("DELETE") || action.includes("REMOVE")) return "audit-action-badge--delete";
    return "audit-action-badge--default";
  };

  const formatTimestamp = (isoStr) => {
    return new Date(isoStr).toLocaleString();
  };

  // Extract unique tables for filter
  const uniqueTables = useMemo(() => {
    const tables = new Set(logs.map((l) => l.table_name).filter(Boolean));
    return Array.from(tables);
  }, [logs]);

  // Statistics calculation
  const stats = useMemo(() => {
    let createCount = 0;
    let updateCount = 0;
    let deleteCount = 0;

    logs.forEach((l) => {
      if (l.action.includes("CREATE") || l.action.includes("ADD")) createCount++;
      else if (l.action.includes("UPDATE") || l.action.includes("ASSIGN")) updateCount++;
      else if (l.action.includes("DELETE") || l.action.includes("REMOVE")) deleteCount++;
    });

    return { total: logs.length, createCount, updateCount, deleteCount };
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchSearch =
        !searchTerm ||
        l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.table_name && l.table_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.details && l.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.user_id && String(l.user_id).includes(searchTerm));

      const matchAction =
        actionFilter === "ALL" ||
        (actionFilter === "CREATE" && (l.action.includes("CREATE") || l.action.includes("ADD"))) ||
        (actionFilter === "UPDATE" && (l.action.includes("UPDATE") || l.action.includes("ASSIGN"))) ||
        (actionFilter === "DELETE" && (l.action.includes("DELETE") || l.action.includes("REMOVE")));

      const matchTable = tableFilter === "ALL" || l.table_name === tableFilter;

      return matchSearch && matchAction && matchTable;
    });
  }, [logs, searchTerm, actionFilter, tableFilter]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, actionFilter, tableFilter]);

  // Paginated Logs
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  return (
    <AppShell>
      <main className="audit-page">
        <header className="audit-header">
          <div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span className="dashboard-badge" style={{ background: "#fde8e8", color: "#9b1c1c" }}>Admin & Compliance</span>
              <span className="admin-role-tag admin-role-tag--admin">🛡 Restrict Access</span>
            </div>
            <h1 className="audit-title">System Audit Log</h1>
            <p className="audit-subtitle">
              Verify platform operations, search audit trails, and review security compliance across all modules.
            </p>
          </div>
        </header>

        {loading ? (
          <p className="pub-loading" style={{ textAlign: "center", padding: "40px" }}>Loading administrative audit trails...</p>
        ) : error ? (
          <div className="audit-log-panel" style={{ borderColor: "#fecaca", textAlign: "center", padding: "40px" }}>
            <p className="pub-error" style={{ fontSize: "1.1rem" }}>{error}</p>
          </div>
        ) : (
          <>
            {/* Audit Stats Header */}
            <div className="analytics-summary-cards">
              <div className="analytics-card">
                <span className="analytics-card-title">Total Audit Entries</span>
                <span className="analytics-card-num">{stats.total}</span>
                <span className="analytics-card-sub">Recorded Log Events</span>
              </div>
              <div className="analytics-card" style={{ borderColor: "#10b981" }}>
                <span className="analytics-card-title">Creations</span>
                <span className="analytics-card-num" style={{ color: "#10b981" }}>{stats.createCount}</span>
                <span className="analytics-card-sub">Records Created</span>
              </div>
              <div className="analytics-card" style={{ borderColor: "#3b82f6" }}>
                <span className="analytics-card-title">Modifications</span>
                <span className="analytics-card-num" style={{ color: "#3b82f6" }}>{stats.updateCount}</span>
                <span className="analytics-card-sub">Updates & Assignments</span>
              </div>
              <div className="analytics-card" style={{ borderColor: "#ef4444" }}>
                <span className="analytics-card-title">Deletions</span>
                <span className="analytics-card-num" style={{ color: "#ef4444" }}>{stats.deleteCount}</span>
                <span className="analytics-card-sub">Removals Logged</span>
              </div>
            </div>

            <section className="audit-log-panel">
              {/* Search & Filter Controls */}
              <div className="filter-bar-container">
                <div className="filter-bar-header">
                  <div className="filter-bar-title"><span>🔍</span> Search & Filter Audit Logs</div>
                  <span className="filter-results-counter">Showing {filteredLogs.length} of {logs.length} entries</span>
                </div>
                <div className="filter-controls-grid">
                  <div className="filter-search-box">
                    <span className="filter-search-icon">🔍</span>
                    <input
                      type="text"
                      placeholder="Search action, table, user ID, details..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      className="filter-search-input"
                    />
                  </div>
                  <select
                    value={actionFilter}
                    onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
                    className="filter-select"
                  >
                    <option value="ALL">All Action Categories</option>
                    <option value="CREATE">Create / Add Actions</option>
                    <option value="UPDATE">Update / Assign Actions</option>
                    <option value="DELETE">Delete / Remove Actions</option>
                  </select>
                  <select
                    value={tableFilter}
                    onChange={(e) => { setTableFilter(e.target.value); setCurrentPage(1); }}
                    className="filter-select"
                  >
                    <option value="ALL">All Tables</option>
                    {uniqueTables.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {(searchTerm || actionFilter !== "ALL" || tableFilter !== "ALL") && (
                    <button type="button" onClick={() => { setSearchTerm(""); setActionFilter("ALL"); setTableFilter("ALL"); setCurrentPage(1); }} className="filter-reset-btn">✕ Reset Filters</button>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 12px 0" }}>
                <h2>Activity Trail ({filteredLogs.length} of {logs.length})</h2>
                <span className="dashboard-badge">Live System Logs</span>
              </div>

              {filteredLogs.length === 0 ? (
                <p className="pub-empty">No activity logs matching your search criteria.</p>
              ) : (
                <>
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Action Code</th>
                        <th>Source Table</th>
                        <th>Record ID</th>
                        <th>Operation Details</th>
                        <th>User ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLogs.map((log) => (
                        <tr key={log.id}>
                          <td style={{ whiteSpace: "nowrap" }}>{formatTimestamp(log.created_at)}</td>
                          <td>
                            <span className={`audit-action-badge ${getActionBadgeClass(log.action)}`}>
                              {log.action}
                            </span>
                          </td>
                          <td><code>{log.table_name || "N/A"}</code></td>
                          <td>{log.record_id || "N/A"}</td>
                          <td style={{ color: "var(--text-h)", fontWeight: "500" }}>{log.details || "No details"}</td>
                          <td><code>{log.user_id ? `User #${log.user_id}` : "System"}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <Pagination
                    currentPage={currentPage}
                    totalItems={filteredLogs.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                    pageSizeOptions={[5, 10, 20, 50]}
                  />
                </>
              )}
            </section>
          </>
        )}
      </main>
    </AppShell>
  );
}
