import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { useAuth } from "../hooks/useAuth";
import { getDashboardStats } from "../api/dashboard";
import AnalyticsCharts from "../components/AnalyticsCharts";
import "./Dashboard.css";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const getRoleColor = (role) => {
  if (role === "SystemAdmin") return "#f59e0b";
  if (role === "InstitutionAdmin") return "#10b981";
  return "#4f7fff";
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const displayName = user?.email?.split("@")[0] ?? "User";

  useEffect(() => {
    let active = true;
    getDashboardStats()
      .then((res) => { if (active) { setStats(res.data); setError(""); } })
      .catch(() => { if (active) setError("Failed to load dashboard statistics."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <AppShell>
      <div className="dashboard-page">
        {/* Hero Section */}
        <section className="dashboard-hero">
          <div className="dashboard-hero-content">
            <div className="dashboard-greeting-eyebrow">
              <span className="dashboard-badge">Workspace Overview</span>
              <span className="dashboard-time-chip">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </span>
            </div>
            <h2 className="dashboard-welcome-text">
              {getGreeting()}, <span>{displayName}</span> 👋
            </h2>
            <p className="dashboard-copy">
              Your unified research management platform. Track publications, manage collaboration networks, and analyze institutional research activity — all in one place.
            </p>
            <div className="dashboard-actions">
              <Link to="/publications" className="dashboard-link-button dashboard-link-button--primary">
                📄 Manage Publications
              </Link>
              <Link to="/projects" className="dashboard-link-button dashboard-link-button--secondary">
                🔬 Track Projects
              </Link>
              <Link to="/reports" className="dashboard-link-button dashboard-link-button--secondary">
                📊 View Reports
              </Link>
            </div>
          </div>

          <div className="dashboard-meta">
            <div className="dashboard-stat">
              <span className="dashboard-stat-label">Signed in as</span>
              <span className="dashboard-stat-value">{user?.email}</span>
            </div>
            <div className="dashboard-stat">
              <span className="dashboard-stat-label">System Role</span>
              <span className="dashboard-stat-value" style={{ color: getRoleColor(user?.role) }}>
                {user?.role}
              </span>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="dashboard-panel" style={{ textAlign: "center", padding: "48px" }}>
            <div className="pub-loading">Loading workspace statistics...</div>
          </div>
        ) : error ? (
          <div className="dashboard-panel" style={{ textAlign: "center", padding: "48px" }}>
            <p className="pub-error">{error}</p>
          </div>
        ) : (
          <>
            {/* Researcher View */}
            {stats.role === "Researcher" && stats.researcher_stats && (
              <>
                <section className="dashboard-section">
                  <div className="dashboard-section-header">
                    <div>
                      <span className="dashboard-badge">Key Indicators</span>
                      <h2>Your Research Activity</h2>
                    </div>
                  </div>
                  <div className="module-grid">
                    <article className="module-card">
                      <div>
                        <h3>Publications</h3>
                        <p>Journals, papers, patents and reports you have authored.</p>
                      </div>
                      <div className="module-card-value">{stats.researcher_stats.publications_count}</div>
                    </article>
                    <article className="module-card">
                      <div>
                        <h3>Active Projects</h3>
                        <p>Research projects and collaborations you're assigned to.</p>
                      </div>
                      <div className="module-card-value">{stats.researcher_stats.projects_count}</div>
                    </article>
                    <article className="module-card">
                      <div>
                        <h3>Conferences</h3>
                        <p>Scientific events registered and presentations scheduled.</p>
                      </div>
                      <div className="module-card-value">{stats.researcher_stats.conferences_count}</div>
                    </article>
                  </div>
                </section>

                <AnalyticsCharts />

                <div className="dashboard-lower-grid">
                  <div className="dashboard-panel">
                    <div className="dashboard-section-header">
                      <div>
                        <span className="dashboard-badge">Network</span>
                        <h2>Your Active Projects</h2>
                      </div>
                    </div>
                    <div className="metric-list">
                      {stats.researcher_stats.projects.length === 0 ? (
                        <p className="pub-empty">No projects assigned yet.</p>
                      ) : stats.researcher_stats.projects.map((proj) => (
                        <div className="metric-row" key={proj.id}>
                          <span>{proj.title}</span>
                          <strong style={{ textTransform: "capitalize", color: "#10b981" }}>{proj.status}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="dashboard-panel">
                    <div className="dashboard-section-header">
                      <div>
                        <span className="dashboard-badge">Events</span>
                        <h2>Upcoming Conferences</h2>
                      </div>
                    </div>
                    <div className="timeline-list">
                      {stats.researcher_stats.conferences.length === 0 ? (
                        <p className="pub-empty">No conference registrations yet.</p>
                      ) : stats.researcher_stats.conferences.map((conf) => (
                        <div className="timeline-row" key={conf.id}>
                          <span className="timeline-row-badge">{conf.acronym || "CONF"}</span>
                          <div>
                            <p>{conf.name}</p>
                            <small>{conf.location || "Location TBD"}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Institution Admin View */}
            {stats.role === "InstitutionAdmin" && stats.institution_stats && (
              <>
                <section className="dashboard-section">
                  <div className="dashboard-section-header">
                    <div>
                      <span className="dashboard-badge">Institutional Overview</span>
                      <h2>Analytics Summary</h2>
                    </div>
                  </div>
                  <div className="module-grid">
                    <article className="module-card">
                      <div>
                        <h3>Departments</h3>
                        <p>Academic departments registered in your institution.</p>
                      </div>
                      <div className="module-card-value">{stats.institution_stats.departments_count}</div>
                    </article>
                    <article className="module-card">
                      <div>
                        <h3>Publications</h3>
                        <p>Publications authored by researchers in your organization.</p>
                      </div>
                      <div className="module-card-value">{stats.institution_stats.publications_count}</div>
                    </article>
                    <article className="module-card">
                      <div>
                        <h3>Active Projects</h3>
                        <p>Ongoing funded research projects managed by your institution.</p>
                      </div>
                      <div className="module-card-value">{stats.institution_stats.active_projects_count}</div>
                    </article>
                  </div>
                </section>

                <div className="dashboard-lower-grid">
                  <div className="dashboard-panel">
                    <div className="dashboard-section-header">
                      <div>
                        <span className="dashboard-badge">Structure</span>
                        <h2>Departments</h2>
                      </div>
                    </div>
                    <div className="metric-list">
                      {stats.institution_stats.departments.length === 0 ? (
                        <p className="pub-empty">No departments registered.</p>
                      ) : stats.institution_stats.departments.map((dep) => (
                        <div className="metric-row" key={dep.id}>
                          <span>{dep.name}</span>
                          <small style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>{dep.description || "No description"}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="dashboard-panel">
                    <div className="dashboard-section-header">
                      <div>
                        <span className="dashboard-badge">Grants</span>
                        <h2>Active Research Projects</h2>
                      </div>
                    </div>
                    <div className="metric-list">
                      {stats.institution_stats.projects.length === 0 ? (
                        <p className="pub-empty">No active projects.</p>
                      ) : stats.institution_stats.projects.map((proj) => (
                        <div className="metric-row" key={proj.id}>
                          <span>{proj.title}</span>
                          <strong style={{ color: "#10b981" }}>${proj.budget?.toLocaleString()}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* System Admin View */}
            {(stats.role === "SystemAdmin" || (!stats.researcher_stats && !stats.institution_stats)) && stats.admin_stats && (
              <>
                <section className="dashboard-section">
                  <div className="dashboard-section-header">
                    <div>
                      <span className="dashboard-badge">Platform Overview</span>
                      <h2>System Statistics</h2>
                    </div>
                  </div>
                  <div className="module-grid">
                    <article className="module-card">
                      <div>
                        <h3>Total Accounts</h3>
                        <p>Registered users across all roles on the platform.</p>
                      </div>
                      <div className="module-card-value">{stats.admin_stats.total_users}</div>
                    </article>
                    <article className="module-card">
                      <div>
                        <h3>Publications Tracked</h3>
                        <p>Total records in the central publication repository.</p>
                      </div>
                      <div className="module-card-value">{stats.admin_stats.total_publications}</div>
                    </article>
                    <article className="module-card">
                      <div>
                        <h3>Active Projects</h3>
                        <p>Total scientific research projects registered.</p>
                      </div>
                      <div className="module-card-value">{stats.admin_stats.total_projects}</div>
                    </article>
                  </div>
                </section>

                <AnalyticsCharts />

                <div className="dashboard-panel">
                  <div className="dashboard-section-header">
                    <div>
                      <span className="dashboard-badge" style={{ background: "var(--danger-bg)", color: "#fca5a5", borderColor: "var(--danger-border)" }}>
                        🛡 Security & Compliance
                      </span>
                      <h2>Recent Audit Activity</h2>
                    </div>
                  </div>
                  <div className="metric-list">
                    {stats.admin_stats.recent_logs.length === 0 ? (
                      <p className="pub-empty">No recent logs recorded.</p>
                    ) : stats.admin_stats.recent_logs.map((log) => (
                      <div className="audit-metric-row" key={log.id}>
                        <strong style={{ color: "#7ca8ff", fontSize: "0.82rem" }}>{log.action}</strong>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          <code>{log.table_name || "N/A"}</code>
                        </span>
                        <span style={{ color: "var(--text)", fontSize: "0.83rem" }}>{log.details || "No details provided"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
