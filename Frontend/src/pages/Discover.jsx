import { useState, useEffect } from "react";
import AppShell from "../components/AppShell";
import Pagination from "../components/Pagination";
import { discoverResearchers, getInstitutions, getDepartments } from "../api/researchers";
import { sendCollaborationRequest } from "../api/collaboration_requests";
import { exportToCSV, triggerPDFPrint } from "../utils/exportUtils";
import { useAuth } from "../hooks/useAuth";
import "./Discover.css";

export default function Discover() {
  const { user } = useAuth();
  const [researchers, setResearchers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterInstitution, setFilterInstitution] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Proposal modal
  const [requestModal, setRequestModal] = useState(null); // { targetUserId, title, type: "project_invite" | "coauthor_invite" }
  const [requestMessage, setRequestMessage] = useState("");
  const [requestSuccess, setRequestSuccess] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  const fetchResearchers = async () => {
    setLoading(true);
    try {
      const [resRes, instRes, deptRes] = await Promise.all([
        discoverResearchers({
          query: searchTerm || undefined,
          institution_id: filterInstitution ? parseInt(filterInstitution) : undefined,
          department_id: filterDepartment ? parseInt(filterDepartment) : undefined,
        }),
        getInstitutions(),
        getDepartments(),
      ]);
      setResearchers(resRes.data);
      setInstitutions(instRes.data);
      setDepartments(deptRes.data);
      setError("");
    } catch {
      setError("Failed to fetch researcher directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchResearchers();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, filterInstitution, filterDepartment]);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!requestModal) return;
    setSendingRequest(true);
    setError("");
    setRequestSuccess("");

    try {
      await sendCollaborationRequest({
        to_user_id: requestModal.targetUserId,
        request_type: requestModal.type,
        message: requestMessage,
      });
      setRequestSuccess("Collaboration proposal sent successfully!");
      setTimeout(() => {
        setRequestModal(null);
        setRequestMessage("");
        setRequestSuccess("");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send proposal.");
    } finally {
      setSendingRequest(false);
    }
  };

  const handleExportCSV = () => {
    exportToCSV("researchers_directory", researchers, [
      { label: "ID", key: "id" },
      { label: "Full Name", key: "full_name" },
      { label: "Institution", key: "institution_name" },
      { label: "Department", key: "department_name" },
      { label: "Research Interests", key: "research_interests" },
      { label: "Skills", key: "skills" },
      { label: "ORCID iD", key: "orcid_id" },
      { label: "Publications", key: "publication_count" },
      { label: "Projects", key: "project_count" },
    ]);
  };

  const handleExportPDF = () => {
    const headers = ["Full Name", "Institution", "Department", "Interests", "Publications", "Projects"];
    const rows = researchers.map((r) => [
      r.full_name,
      r.institution_name || "N/A",
      r.department_name || "N/A",
      r.research_interests || "N/A",
      String(r.publication_count || 0),
      String(r.project_count || 0),
    ]);
    const uniqueInsts = new Set(researchers.map((r) => r.institution_name).filter(Boolean)).size;
    triggerPDFPrint(
      "Researcher Directory Report",
      headers,
      rows,
      {
        subtitle: "All researchers across institutions with skills, interests, and activity metrics.",
        stats: [
          { label: "Researchers", value: researchers.length },
          { label: "Institutions", value: uniqueInsts },
          { label: "Avg Publications", value: researchers.length ? Math.round(researchers.reduce((s, r) => s + (r.publication_count || 0), 0) / researchers.length) : 0 },
        ],
      }
    );
  };

  const paginatedResearchers = researchers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <AppShell>
      <div className="discover-page">
        <header className="discover-header">
          <div>
            <span className="dashboard-badge">Global Directory</span>
            <h1 className="discover-title">Discover Researchers</h1>
            <p className="discover-subtitle">
              Browse researchers across institutions, search by domain expertise or skills, and initiate collaboration proposals.
            </p>
          </div>
          <div className="discover-export-btns">
            <button onClick={handleExportCSV} className="notif-mark-all-btn">
              📊 Export CSV
            </button>
            <button onClick={handleExportPDF} className="notif-mark-all-btn">
              🖨️ Export PDF
            </button>
          </div>
        </header>

        {/* Filter Controls */}
        <div className="discover-filters-bar">
          <input
            type="text"
            placeholder="🔍 Search name, skills, interests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-select"
            style={{ flex: 2, minWidth: "200px" }}
          />

          <select
            value={filterInstitution}
            onChange={(e) => setFilterInstitution(e.target.value)}
            className="filter-select"
          >
            <option value="">All Institutions</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>

          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="filter-select"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>

          {(searchTerm || filterInstitution || filterDepartment) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterInstitution("");
                setFilterDepartment("");
              }}
              className="filter-reset-btn"
            >
              ✕ Reset
            </button>
          )}
        </div>

        {error && <p className="pub-error">{error}</p>}

        {loading ? (
          <p className="pub-loading">Searching researcher directory...</p>
        ) : (
          <>
            <div className="discover-grid">
              {paginatedResearchers.length === 0 ? (
                <p className="pub-empty">No researchers found matching the filter criteria.</p>
              ) : (
                paginatedResearchers.map((r) => (
                  <div key={r.id} className="discover-card">
                    <div className="discover-card-top">
                      <div className="discover-avatar">
                        {r.full_name?.[0]?.toUpperCase() || "R"}
                      </div>
                      <div className="discover-info">
                        <h3>{r.full_name}</h3>
                        <p className="discover-inst">
                          🏛 {r.institution_name || "Independent Researcher"}
                          {r.department_name && ` • ${r.department_name}`}
                        </p>
                      </div>
                    </div>

                    {r.bio && <p className="discover-bio">"{r.bio}"</p>}

                    {r.research_interests && (
                      <div className="discover-tags">
                        <strong className="discover-tag-label">Interests:</strong>
                        {r.research_interests.split(",").slice(0, 4).map((tag, idx) => (
                          <span key={idx} className="profile-tag">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    {r.skills && (
                      <div className="discover-tags">
                        <strong className="discover-tag-label">Skills:</strong>
                        {r.skills.split(",").slice(0, 4).map((skill, idx) => (
                          <span key={idx} className="profile-tag profile-tag--skill">
                            {skill.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="discover-card-footer">
                      <div className="discover-metrics">
                        <span>📄 {r.publication_count} papers</span>
                        <span>🔬 {r.project_count} projects</span>
                      </div>

                      {user?.id !== r.user_id && (
                        <button
                          onClick={() =>
                            setRequestModal({
                              targetUserId: r.user_id,
                              title: r.full_name,
                              type: "project_invite",
                            })
                          }
                          className="proj-action-btn proj-edit-btn"
                          style={{
                            borderColor: "var(--accent-border)",
                            color: "var(--accent)",
                            background: "var(--accent-bg)",
                          }}
                        >
                          📩 Collaborate
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {researchers.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={researchers.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[6, 12, 24]}
              />
            )}
          </>
        )}

        {/* Collaboration Proposal Modal */}
        {requestModal && (
          <div className="collab-modal-overlay" onClick={() => setRequestModal(null)}>
            <div className="collab-modal" onClick={(e) => e.stopPropagation()}>
              <div className="collab-modal-header">
                <h3>Propose Collaboration</h3>
                <button onClick={() => setRequestModal(null)} className="collab-modal-close">
                  ✕
                </button>
              </div>

              {requestSuccess ? (
                <div className="collab-modal-success">{requestSuccess}</div>
              ) : (
                <form onSubmit={handleSendRequest} className="collab-modal-form">
                  <p className="collab-modal-target">
                    Recipient: <strong>{requestModal.title}</strong>
                  </p>

                  <label className="collab-modal-label">
                    <span>Request Category:</span>
                    <select
                      value={requestModal.type}
                      onChange={(e) => setRequestModal({ ...requestModal, type: e.target.value })}
                      className="proj-input"
                    >
                      <option value="project_invite">Project Team Invitation / Request</option>
                      <option value="coauthor_invite">Co-Authorship Proposal</option>
                    </select>
                  </label>

                  <label className="collab-modal-label">
                    <span>Proposal Message:</span>
                    <textarea
                      rows={4}
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                      placeholder="Introduce your research project, interests, or proposed joint paper topic..."
                      className="collab-textarea"
                      required
                    />
                  </label>

                  {error && <p className="pub-error">{error}</p>}

                  <div className="collab-modal-actions">
                    <button
                      type="button"
                      onClick={() => setRequestModal(null)}
                      className="proj-action-btn proj-cancel-btn"
                    >
                      Cancel
                    </button>
                    <button type="submit" disabled={sendingRequest} className="collab-button">
                      {sendingRequest ? "Sending..." : "Send Proposal"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
