import { useEffect, useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { useAuth } from "../hooks/useAuth";
import {
  getPublicationReport,
  getResearcherReport,
  getCollaborationReport,
  getInstitutionReport,
  getSavedReports,
  createSavedReport,
  getCsvExportUrl,
  getPdfExportUrl,
} from "../api/reports";
import { getAuditLogs } from "../api/audit";
import { downloadFromBackend } from "../utils/exportUtils";
import "./Reports.css";

/* ── Role helpers ── */
const ROLE_RESEARCHER     = "Researcher";
const ROLE_INST_ADMIN     = "InstitutionAdmin";
const ROLE_SYSTEM_ADMIN   = "SystemAdmin";

function getRoleLabel(role) {
  if (role === ROLE_RESEARCHER)   return { icon: "🔬", text: "Researcher View", cls: "role-tag--researcher" };
  if (role === ROLE_INST_ADMIN)   return { icon: "🏛", text: "Institution Admin", cls: "role-tag--inst-admin" };
  return { icon: "🛡", text: "System Admin", cls: "role-tag--system-admin" };
}

/* Tabs visible per role */
function getTabsForRole(role) {
  const overview   = { id: "overview",       label: "Overview",       icon: "🌐" };
  const pubs       = { id: "publications",   label: "Publications",   icon: "📄" };
  const researchers = { id: "researchers",   label: role === ROLE_RESEARCHER ? "Collaborators" : "Researchers", icon: "👥" };
  const collabs    = { id: "collaborations", label: "Collaborations", icon: "🤝" };
  const insts      = { id: "institutions",   label: role === ROLE_RESEARCHER ? "My Institution" : "Institutions", icon: "🏛" };
  const audit      = { id: "admin_audit",    label: "Audit & Security", icon: "🛡" };

  if (role === ROLE_RESEARCHER) {
    return [overview, pubs, researchers, collabs, insts];
  }
  if (role === ROLE_INST_ADMIN) {
    return [overview, pubs, researchers, collabs, insts, audit];
  }
  // SystemAdmin
  return [overview, pubs, researchers, collabs, insts, audit];
}

/* ── Animated Counter ── */
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);
  useEffect(() => {
    if (!value && value !== 0) return;
    const target = Number(value);
    const duration = 900;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * ease));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

/* ── Bar Chart ── */
function BarChart({ items, total, colorScheme = "blue" }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  if (!items || Object.keys(items).length === 0)
    return <p className="pub-empty">No distribution data available.</p>;

  const entries = Object.entries(items);
  const maxVal  = Math.max(...entries.map(([, v]) => Number(v) || 0), 1);

  const gradients = {
    blue:   "linear-gradient(90deg,#4f7fff 0%,#7c3aed 100%)",
    green:  "linear-gradient(90deg,#10b981 0%,#06b6d4 100%)",
    purple: "linear-gradient(90deg,#8b5cf6 0%,#ec4899 100%)",
    amber:  "linear-gradient(90deg,#f59e0b 0%,#f97316 100%)",
    rose:   "linear-gradient(90deg,#f43f5e 0%,#fb923c 100%)",
    teal:   "linear-gradient(90deg,#06b6d4 0%,#10b981 100%)",
  };

  return (
    <div className="analytics-chart-container" ref={ref}>
      {entries.map(([label, count], idx) => {
        const val  = Number(count) || 0;
        const pct  = total > 0 ? Math.round((val / total) * 100) : Math.round((val / maxVal) * 100);
        const barW = Math.max(Math.round((val / maxVal) * 100), 2);
        return (
          <div className="analytics-bar-item" key={label || idx}>
            <div className="analytics-bar-header">
              <span className="analytics-bar-label">{label || "Unspecified"}</span>
              <span className="analytics-bar-values">
                <strong>{val.toLocaleString()}</strong>
                <span className="bar-pct"> ({pct}%)</span>
              </span>
            </div>
            <div className="analytics-bar-track">
              <div
                className="analytics-bar-fill"
                style={{
                  width: visible ? `${barW}%` : "0%",
                  background: gradients[colorScheme] || gradients.blue,
                  transitionDelay: `${idx * 60}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutRing({ segments, size = 140 }) {
  const r  = 52; const cx = size / 2; const cy = size / 2;
  const C  = 2 * Math.PI * r;
  const [drawn, setDrawn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 100); return () => clearTimeout(t); }, []);
  const total  = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let runningOffset = 0;
  const circles = segments.map((seg, i) => {
    const dash = (seg.value / total) * C;
    const offset = runningOffset;
    runningOffset += dash;
    return (
      <circle key={i} cx={cx} cy={cy} r={r} fill="none"
        stroke={seg.color} strokeWidth="14"
        strokeDasharray={`${drawn ? dash : 0} ${C}`}
        strokeDashoffset={-offset} strokeLinecap="round"
        style={{ transition: `stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1) ${i * 120}ms` }}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-ring">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
      {circles}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#e8f0fc" fontSize="20" fontWeight="800" fontFamily="Space Grotesk,sans-serif">
        {total.toLocaleString()}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#6b84a8" fontSize="9" fontWeight="600" letterSpacing="1">TOTAL</text>
    </svg>
  );
}

/* ── Stat Pill ── */
function StatPill({ icon, label, value, color, sub }) {
  return (
    <div className="stat-pill" style={{ "--pill-color": color }}>
      <div className="stat-pill-icon">{icon}</div>
      <div className="stat-pill-body">
        <div className="stat-pill-value"><AnimatedNumber value={value} /></div>
        <div className="stat-pill-label">{label}</div>
        {sub && <div className="stat-pill-sub">{sub}</div>}
      </div>
    </div>
  );
}

/* ── Role context banner ── */
function RoleContextBanner({ role }) {
  const messages = {
    [ROLE_RESEARCHER]: {
      icon: "🔬",
      title: "Researcher Analytics",
      desc: "You are viewing analytics scoped to your own research activity — your publications, projects, and collaboration network.",
      color: "#4f7fff",
    },
    [ROLE_INST_ADMIN]: {
      icon: "🏛",
      title: "Institution Analytics",
      desc: "You are viewing analytics scoped to your institution — department breakdowns, researcher activity, and partnership data.",
      color: "#10b981",
    },
    [ROLE_SYSTEM_ADMIN]: {
      icon: "🛡",
      title: "Platform-Wide Analytics",
      desc: "You are viewing global analytics across all institutions, researchers, publications, and collaborations on the platform.",
      color: "#f59e0b",
    },
  };
  const msg = messages[role] || messages[ROLE_SYSTEM_ADMIN];
  return (
    <div className="role-context-banner" style={{ "--banner-color": msg.color }}>
      <span className="role-context-icon">{msg.icon}</span>
      <div>
        <strong>{msg.title}</strong>
        <p>{msg.desc}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
export default function Reports() {
  const { user } = useAuth();
  const role     = user?.role || ROLE_RESEARCHER;
  const isAdmin  = role === ROLE_SYSTEM_ADMIN || role === ROLE_INST_ADMIN;

  const tabs = getTabsForRole(role);
  const roleTag = getRoleLabel(role);

  const [activeTab, setActiveTab] = useState("overview");
  const [reportData, setReportData]         = useState(null);
  const [auditData, setAuditData]           = useState([]);
  const [savedReports, setSavedReports]     = useState([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");

  const [overviewData, setOverviewData]       = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError]     = useState("");

  const [saveTitle, setSaveTitle]     = useState("");
  const [savingReport, setSavingReport] = useState(false);

  // Saved reports search — visible to all roles
  const [savedReportSearch, setSavedReportSearch] = useState("");
  const filteredSavedReports = useMemo(() => {
    if (!savedReportSearch.trim()) return savedReports;
    const q = savedReportSearch.toLowerCase();
    return savedReports.filter(
      (rep) => rep.title?.toLowerCase().includes(q) || rep.type?.toLowerCase().includes(q)
    );
  }, [savedReports, savedReportSearch]);

  // Inline audit search for Reports audit preview — visible to all roles
  const [auditPreviewSearch, setAuditPreviewSearch] = useState("");
  const filteredAuditPreview = useMemo(() => {
    if (!auditPreviewSearch.trim()) return auditData;
    const q = auditPreviewSearch.toLowerCase();
    return auditData.filter(
      (l) => l.action?.toLowerCase().includes(q) ||
             l.details?.toLowerCase().includes(q) ||
             l.table_name?.toLowerCase().includes(q)
    );
  }, [auditData, auditPreviewSearch]);

  /* ── Load overview (all 4 in parallel) ── */
  useEffect(() => {
    setOverviewLoading(true);
    Promise.all([
      getPublicationReport().catch(() => null),
      getResearcherReport().catch(() => null),
      getCollaborationReport().catch(() => null),
      getInstitutionReport().catch(() => null),
    ]).then(([pub, res, col, inst]) => {
      setOverviewData({
        publications:   pub?.data   || null,
        researchers:    res?.data   || null,
        collaborations: col?.data   || null,
        institutions:   inst?.data  || null,
      });
      setOverviewError("");
    }).catch(() => setOverviewError("Failed to load overview analytics."))
      .finally(() => setOverviewLoading(false));
  }, []);

  /* ── Per-tab fetch ── */
  const fetchReportData = async (type) => {
    if (type === "overview") return;
    setLoading(true);
    setReportData(null);
    setError("");
    try {
      if (type === "admin_audit") {
        const res = await getAuditLogs(100);
        setAuditData(res.data);
      } else {
        let res;
        if (type === "publications")    res = await getPublicationReport();
        else if (type === "researchers")    res = await getResearcherReport();
        else if (type === "collaborations") res = await getCollaborationReport();
        else if (type === "institutions")   res = await getInstitutionReport();
        setReportData(res.data);
      }
    } catch {
      setError(`Failed to load data for ${type}.`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedReports = async () => {
    try { const res = await getSavedReports(); setSavedReports(res.data); } catch { /* silent */ }
  };

  useEffect(() => { fetchReportData(activeTab); }, [activeTab]);
  useEffect(() => { fetchSavedReports(); }, []);

  const handleSaveReport = async (e) => {
    e.preventDefault();
    if (!saveTitle) return;
    setSavingReport(true);
    try {
      await createSavedReport({ title: saveTitle, type: activeTab, query_params: JSON.stringify({ type: activeTab }) });
      setSaveTitle("");
      await fetchSavedReports();
    } catch { alert("Failed to save report configuration"); }
    finally { setSavingReport(false); }
  };

  const [exportLoading, setExportLoading] = useState(""); // "csv" | "pdf" | ""

  const handleDownloadCsv = async () => {
    setExportLoading("csv");
    try {
      await downloadFromBackend(
        getCsvExportUrl(activeTab),
        `${activeTab}_report_${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch {
      alert("CSV export failed. Please check your connection and try again.");
    } finally {
      setExportLoading("");
    }
  };

  const handleDownloadPdf = async () => {
    setExportLoading("pdf");
    try {
      await downloadFromBackend(
        getPdfExportUrl(activeTab),
        `${activeTab}_report_${new Date().toISOString().slice(0, 10)}.pdf`
      );
    } catch {
      alert("PDF export failed. Please check your connection and try again.");
    } finally {
      setExportLoading("");
    }
  };

  /* ── Overview Panel ── */
  const renderOverviewPanel = () => {
    if (overviewLoading) return (
      <div className="overview-loading">
        <div className="loading-spinner" />
        <p>Loading all analytics…</p>
      </div>
    );
    if (overviewError) return <p className="pub-error">{overviewError}</p>;
    if (!overviewData) return null;

    const { publications: pub, researchers: res, collaborations: col, institutions: inst } = overviewData;

    /* Labels that change per role */
    const resLabel  = role === ROLE_RESEARCHER ? "Collaborators" : res?.label_override || "Researchers";
    const instLabel = role === ROLE_RESEARCHER ? "My Institution" : "Institutions";
    const instCount = role === ROLE_RESEARCHER
      ? (inst?.total_institutions > 0 ? 1 : 0)
      : inst?.total_institutions || 0;

    const donutSegments = [
      { label: "Publications",   value: pub?.total_publications   || 0, color: "#4f7fff" },
      { label: resLabel,          value: res?.total_researchers    || 0, color: "#10b981" },
      { label: "Collaborations", value: col?.total_collaborations || 0, color: "#8b5cf6" },
      { label: instLabel,         value: instCount,                      color: "#f59e0b" },
    ];

    return (
      <div className="overview-panel">
        {/* Hero row */}
        <div className="overview-hero">
          <div className="overview-hero-left">
            <div>
              <span className="dashboard-badge">Live Snapshot</span>
              <h2 style={{ marginTop: 8 }}>All Analytics at a Glance</h2>
              <p style={{ color: "var(--text-muted)", marginTop: 6, fontSize: "0.9rem" }}>
                Real-time aggregates scoped to your role.
              </p>
            </div>
            <div className="overview-stat-pills">
              <StatPill icon="📄" label="Publications"   value={pub?.total_publications   || 0} color="#4f7fff" sub="total tracked" />
              <StatPill icon="👥" label={resLabel}        value={res?.total_researchers    || 0} color="#10b981" sub={role === ROLE_RESEARCHER ? "network" : "profiles"} />
              <StatPill icon="🤝" label="Collaborations" value={col?.total_collaborations || 0} color="#8b5cf6" sub="partnerships" />
              <StatPill icon="🏛" label={instLabel}       value={instCount}                      color="#f59e0b" sub="organizations" />
            </div>
          </div>
          <div className="overview-donut-wrapper">
            <DonutRing segments={donutSegments} size={160} />
            <div className="donut-legend">
              {donutSegments.map(s => (
                <div className="donut-legend-item" key={s.label}>
                  <span className="donut-legend-dot" style={{ background: s.color }} />
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4-graph grid */}
        <div className="overview-graphs-grid">
          {pub && (
            <div className="overview-graph-card">
              <div className="overview-graph-card-header">
                <span className="ov-card-icon" style={{ background: "rgba(79,127,255,0.15)", color: "#4f7fff" }}>📄</span>
                <div><h4>Publications</h4><span className="ov-card-sub">{pub.total_publications} records</span></div>
              </div>
              <div className="ov-section-label">Format Breakdown</div>
              <BarChart items={pub.type_counts} total={pub.total_publications} colorScheme="blue" />
              <div className="ov-section-label" style={{ marginTop: 16 }}>Status Distribution</div>
              <BarChart items={pub.status_counts} total={pub.total_publications} colorScheme="teal" />
            </div>
          )}

          {res && (
            <div className="overview-graph-card">
              <div className="overview-graph-card-header">
                <span className="ov-card-icon" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>👥</span>
                <div><h4>{resLabel}</h4><span className="ov-card-sub">{res.total_researchers} {role === ROLE_RESEARCHER ? "co-researchers" : "profiles"}</span></div>
              </div>
              {Object.keys(res.department_counts || {}).length > 0 && (
                <>
                  <div className="ov-section-label">By Department</div>
                  <BarChart items={res.department_counts} total={res.total_researchers} colorScheme="green" />
                </>
              )}
              {res.skills_summary?.length > 0 && (
                <>
                  <div className="ov-section-label" style={{ marginTop: 14 }}>Top Skills</div>
                  <div className="skills-cloud-container">
                    {res.skills_summary.slice(0, 10).map(s => <span key={s} className="skill-bubble">{s}</span>)}
                  </div>
                </>
              )}
            </div>
          )}

          {col && (
            <div className="overview-graph-card">
              <div className="overview-graph-card-header">
                <span className="ov-card-icon" style={{ background: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}>🤝</span>
                <div><h4>Collaborations</h4><span className="ov-card-sub">{col.total_collaborations} partnerships</span></div>
              </div>
              <div className="ov-section-label">Type Breakdown</div>
              <BarChart items={col.type_counts} total={col.total_collaborations} colorScheme="purple" />
            </div>
          )}

          {inst && (
            <div className="overview-graph-card">
              <div className="overview-graph-card-header">
                <span className="ov-card-icon" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>🏛</span>
                <div><h4>{instLabel}</h4><span className="ov-card-sub">{inst.total_departments} departments</span></div>
              </div>
              <div className="ov-section-label">Researchers</div>
              <BarChart
                items={inst.researcher_counts_by_institution}
                total={Object.values(inst.researcher_counts_by_institution || {}).reduce((a, b) => a + b, 0)}
                colorScheme="amber"
              />
            </div>
          )}
        </div>

        {/* Quick-dive buttons */}
        <div className="overview-quick-actions">
          {tabs.filter(t => t.id !== "overview").map(t => (
            <button key={t.id} className="ov-quick-btn" onClick={() => setActiveTab(t.id)}>
              <span>{t.icon}</span>
              <span>Deep Dive: {t.label}</span>
              <span className="ov-arrow">→</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  /* ── Return ── */
  return (
    <AppShell>
      <main className="reports-page">
        {/* Header */}
        <header className="reports-header">
          <div className="reports-header-content">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span className="dashboard-badge">Business Intelligence & Analytics</span>
                <span className={`admin-role-tag ${roleTag.cls}`}>{roleTag.icon} {roleTag.text}</span>
              </div>
              <h1 className="reports-title">Reports & Visual Analytics</h1>
              <p className="reports-subtitle">
                {role === ROLE_RESEARCHER
                  ? "Your personal research analytics — publications, collaborators, and project activity."
                  : role === ROLE_INST_ADMIN
                  ? "Institution-scoped analytics — departments, researcher output, and partnerships."
                  : "Platform-wide analytics — all institutions, researchers, publications, and audit logs."}
              </p>
            </div>
            {isAdmin && (
              <div className="admin-quick-hub">
                <Link to="/audit" className="admin-hub-link">🛡 Full Audit Logs</Link>
              </div>
            )}
          </div>
        </header>

        {/* Role Context Banner */}
        <RoleContextBanner role={role} />

        <div className="reports-grid">
          {/* Sidebar */}
          <aside className="reports-sidebar">
            <h3>Analytics Categories</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "14px" }}>
              Showing data scoped to your <strong style={{ color: "var(--text-h)" }}>{roleTag.text}</strong>.
            </p>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`report-tab-btn ${activeTab === t.id ? "report-tab-btn--active" : ""}`}
              >
                <span style={{ marginRight: "8px" }}>{t.icon}</span>
                {t.label}
                {t.id === "overview" && <span className="tab-new-badge">ALL</span>}
              </button>
            ))}
          </aside>

          {/* Content */}
          <section className="reports-content-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h2 style={{ textTransform: "capitalize", display: "flex", alignItems: "center", gap: "8px" }}>
                {activeTab === "overview"
                  ? "Platform Overview"
                  : `${tabs.find(t => t.id === activeTab)?.label || activeTab} Analytics`}
              </h2>
              <span className="dashboard-badge" style={{ background: "var(--accent-secondary-bg)" }}>
                {activeTab === "overview" ? "🌐 All Data" : "📊 Live Graphs"}
              </span>
            </div>

            {/* Overview */}
            {activeTab === "overview" && renderOverviewPanel()}

            {/* Individual tab */}
            {activeTab !== "overview" && (
              <>
                {loading ? (
                  <div className="overview-loading">
                    <div className="loading-spinner" />
                    <p>Generating analytics…</p>
                  </div>
                ) : error ? (
                  <p className="pub-error">{error}</p>
                ) : (
                  <div className="report-data-display">

                    {/* Publications */}
                    {activeTab === "publications" && reportData && (
                      <div>
                        <div className="analytics-summary-cards">
                          <div className="analytics-card">
                            <span className="analytics-card-title">
                              {role === ROLE_RESEARCHER ? "My Publications" : "Total Tracked"}
                            </span>
                            <span className="analytics-card-num"><AnimatedNumber value={reportData.total_publications} /></span>
                            <span className="analytics-card-sub">Publications</span>
                          </div>
                          <div className="analytics-card">
                            <span className="analytics-card-title">Types</span>
                            <span className="analytics-card-num"><AnimatedNumber value={Object.keys(reportData.type_counts || {}).length} /></span>
                            <span className="analytics-card-sub">Format Categories</span>
                          </div>
                        </div>
                        <div className="analytics-graph-section">
                          <h4 className="graph-section-title">📊 Publication Format Breakdown</h4>
                          <BarChart items={reportData.type_counts} total={reportData.total_publications} colorScheme="blue" />
                        </div>
                        <div className="analytics-graph-section" style={{ marginTop: 16 }}>
                          <h4 className="graph-section-title">📈 Status Distribution</h4>
                          <BarChart items={reportData.status_counts} total={reportData.total_publications} colorScheme="green" />
                        </div>
                      </div>
                    )}

                    {/* Researchers / Collaborators */}
                    {activeTab === "researchers" && reportData && (
                      <div>
                        <div className="analytics-summary-cards">
                          <div className="analytics-card">
                            <span className="analytics-card-title">
                              {role === ROLE_RESEARCHER ? "My Collaborators" : role === ROLE_INST_ADMIN ? "Institution Researchers" : "Active Profiles"}
                            </span>
                            <span className="analytics-card-num"><AnimatedNumber value={reportData.total_researchers} /></span>
                            <span className="analytics-card-sub">{role === ROLE_RESEARCHER ? "Co-researchers" : "Researchers"}</span>
                          </div>
                          <div className="analytics-card">
                            <span className="analytics-card-title">Departments</span>
                            <span className="analytics-card-num"><AnimatedNumber value={Object.keys(reportData.department_counts || {}).length} /></span>
                            <span className="analytics-card-sub">Active Units</span>
                          </div>
                        </div>
                        {Object.keys(reportData.department_counts || {}).length > 0 && (
                          <div className="analytics-graph-section">
                            <h4 className="graph-section-title">🏛 Department Distribution</h4>
                            <BarChart items={reportData.department_counts} total={reportData.total_researchers} colorScheme="purple" />
                          </div>
                        )}
                        <div className="analytics-graph-section" style={{ marginTop: 16 }}>
                          <h4 className="graph-section-title">💡 Skills & Expertise</h4>
                          {!reportData.skills_summary?.length ? (
                            <p className="pub-empty">No skills registered.</p>
                          ) : (
                            <div className="skills-cloud-container">
                              {reportData.skills_summary.map(s => <span key={s} className="skill-bubble">{s}</span>)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Collaborations */}
                    {activeTab === "collaborations" && reportData && (
                      <div>
                        <div className="analytics-summary-cards">
                          <div className="analytics-card">
                            <span className="analytics-card-title">
                              {role === ROLE_RESEARCHER ? "My Institution's Partnerships" : role === ROLE_INST_ADMIN ? "Institution Partnerships" : "Total Partnerships"}
                            </span>
                            <span className="analytics-card-num"><AnimatedNumber value={reportData.total_collaborations} /></span>
                            <span className="analytics-card-sub">Collaborations</span>
                          </div>
                        </div>
                        <div className="analytics-graph-section">
                          <h4 className="graph-section-title">🤝 Partnership Type Breakdown</h4>
                          <BarChart items={reportData.type_counts} total={reportData.total_collaborations} colorScheme="amber" />
                        </div>
                      </div>
                    )}

                    {/* Institutions */}
                    {activeTab === "institutions" && reportData && (
                      <div>
                        <div className="analytics-summary-cards">
                          <div className="analytics-card">
                            <span className="analytics-card-title">
                              {role === ROLE_RESEARCHER ? "My Institution" : "Organizations"}
                            </span>
                            <span className="analytics-card-num"><AnimatedNumber value={reportData.total_institutions} /></span>
                            <span className="analytics-card-sub">Institutions</span>
                          </div>
                          <div className="analytics-card">
                            <span className="analytics-card-title">Departments</span>
                            <span className="analytics-card-num"><AnimatedNumber value={reportData.total_departments} /></span>
                            <span className="analytics-card-sub">Structural Units</span>
                          </div>
                        </div>
                        <div className="analytics-graph-section">
                          <h4 className="graph-section-title">🏢 Researchers per Institution</h4>
                          <BarChart
                            items={reportData.researcher_counts_by_institution}
                            total={Object.values(reportData.researcher_counts_by_institution || {}).reduce((a, b) => a + b, 0)}
                            colorScheme="rose"
                          />
                        </div>
                      </div>
                    )}

                    {/* Admin Audit (admins only) */}
                    {activeTab === "admin_audit" && isAdmin && (
                      <div>
                        <div className="admin-audit-header-panel">
                          <h3>🛡 Security Audit & System Traceability</h3>
                          <p>Comprehensive log of all database mutations, creation events, and role modifications.</p>
                        </div>
                        <div className="analytics-summary-cards" style={{ marginTop: 16 }}>
                          <div className="analytics-card" style={{ borderColor: "#f59e0b" }}>
                            <span className="analytics-card-title">Logged Actions</span>
                            <span className="analytics-card-num" style={{ color: "#f59e0b" }}><AnimatedNumber value={auditData.length} /></span>
                            <span className="analytics-card-sub">Total Operations</span>
                          </div>
                        </div>
                        <div className="analytics-graph-section" style={{ marginTop: 20 }}>
                          <h4 className="graph-section-title">⚡ Recent Audit Trail</h4>
                          {/* Audit search — available to all roles */}
                          <div style={{ marginBottom: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
                            <input
                              type="text"
                              placeholder="🔍 Filter audit actions, tables, details..."
                              value={auditPreviewSearch}
                              onChange={(e) => setAuditPreviewSearch(e.target.value)}
                              style={{
                                flex: 1,
                                padding: "8px 12px",
                                borderRadius: "8px",
                                border: "1px solid var(--border)",
                                background: "var(--bg-tertiary)",
                                color: "var(--text-primary)",
                                fontSize: "0.85rem",
                              }}
                            />
                            {auditPreviewSearch && (
                              <button type="button" onClick={() => setAuditPreviewSearch("")} className="filter-reset-btn" style={{ whiteSpace: "nowrap" }}>✕ Reset</button>
                            )}
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                              {filteredAuditPreview.length} of {auditData.length}
                            </span>
                          </div>
                          {filteredAuditPreview.length === 0 ? (
                            <p className="pub-empty">No audit logs match your filter.</p>
                          ) : (
                            <div className="audit-mini-list">
                              {filteredAuditPreview.slice(0, 8).map((log) => (
                                <div className="audit-mini-item" key={log.id}>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <strong style={{ color: "var(--accent)" }}>{log.action}</strong>
                                    <small style={{ color: "var(--text-muted)" }}>{new Date(log.created_at).toLocaleString()}</small>
                                  </div>
                                  <div style={{ fontSize: "0.85rem", color: "var(--text-h)", marginTop: 4 }}>{log.details}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ marginTop: 14 }}>
                            <Link to="/audit" className="report-export-btn report-export-btn--pdf" style={{ textDecoration: "none", fontSize: "0.9rem" }}>
                              🔍 Open Advanced Audit Page →
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Export actions */}
                    {activeTab !== "admin_audit" && (
                      <div className="report-export-actions">
                        <button
                          onClick={handleDownloadCsv}
                          disabled={exportLoading === "csv"}
                          className="report-export-btn report-export-btn--csv"
                        >
                          {exportLoading === "csv" ? "⏳ Downloading..." : "💾 Export to CSV"}
                        </button>
                        <button
                          onClick={handleDownloadPdf}
                          disabled={exportLoading === "pdf"}
                          className="report-export-btn report-export-btn--pdf"
                        >
                          {exportLoading === "pdf" ? "⏳ Generating..." : "📄 Export PDF Summary"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        {/* Saved Reports */}
        <section className="reports-saved-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>Saved Report Configurations</h3>
            <span className="dashboard-badge">My Templates</span>
          </div>
          <form onSubmit={handleSaveReport} style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <input
              placeholder="Name this report setup..."
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              required
              className="proj-input"
              style={{ flex: "1", marginBottom: "0" }}
            />
            <button type="submit" disabled={savingReport} className="proj-button" style={{ background: "var(--accent-secondary, #10b981)" }}>
              {savingReport ? "Saving..." : "Save Config"}
            </button>
          </form>

          {/* Saved reports search — visible to all roles */}
          {savedReports.length > 0 && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "12px" }}>
              <input
                type="text"
                placeholder="🔍 Search saved reports by title or type..."
                value={savedReportSearch}
                onChange={(e) => setSavedReportSearch(e.target.value)}
                className="proj-input"
                style={{ flex: "1", marginBottom: "0" }}
              />
              {savedReportSearch && (
                <button type="button" onClick={() => setSavedReportSearch("")} className="filter-reset-btn">✕</button>
              )}
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {filteredSavedReports.length} of {savedReports.length}
              </span>
            </div>
          )}

          <div className="saved-reports-list">
            {filteredSavedReports.length === 0 && savedReports.length === 0 && <p className="pub-empty">No configurations saved yet.</p>}
            {filteredSavedReports.length === 0 && savedReports.length > 0 && <p className="pub-empty">No saved reports match your search.</p>}
            {filteredSavedReports.map((rep) => (
              <div key={rep.id} className="saved-report-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{rep.title}</strong>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginLeft: "8px", textTransform: "capitalize" }}>
                    ({rep.type} configuration)
                  </span>
                </div>
                <button onClick={() => setActiveTab(rep.type)} className="proj-assign-btn">
                  Generate Graph
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
