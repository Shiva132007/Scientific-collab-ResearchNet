import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import Pagination from "../components/Pagination";
import { useAuth } from "../hooks/useAuth";
import {
  getCollaborations,
  createCollaboration,
  deleteCollaboration,
} from "../api/collaborations";
import { addAuthor, getPublications, removeAuthor } from "../api/publications";
import {
  assignProjectMember,
  getProjects,
  removeProjectMember,
} from "../api/projects";
import { getInstitutions, getResearchers } from "../api/researchers";
import { sendCollaborationRequest } from "../api/collaboration_requests";
import { exportToCSV, triggerPDFPrint } from "../utils/exportUtils";
import "./Collaborations.css";

const COLLAB_TYPES = [
  "Institutional Partnership",
  "Joint Venture",
  "Research Initiative",
  "Exchange Program",
];

const COLLAB_STATUSES = ["Active", "Completed", "Terminated"];
const PROJECT_ROLES = ["Lead Investigator", "Researcher", "Contributor"];

const emptyCollaborationForm = {
  title: "",
  description: "",
  type: "Institutional Partnership",
  status: "Active",
  start_date: "",
  end_date: "",
  institution_1_id: "",
  institution_2_id: "",
};

export default function Collaborations() {
  const { user } = useAuth();
  const [collaborations, setCollaborations] = useState([]);
  const [publications, setPublications] = useState([]);
  const [projects, setProjects] = useState([]);
  const [researchers, setResearchers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("overview");
  const [submittingAction, setSubmittingAction] = useState("");

  const [collaborationForm, setCollaborationForm] = useState(emptyCollaborationForm);
  const [authorForms, setAuthorForms] = useState({});
  const [assignmentForms, setAssignmentForms] = useState({});

  // Request modal state
  const [requestModal, setRequestModal] = useState(null); // { type: 'project_invite', targetUserId, relatedId, title }
  const [requestMessage, setRequestMessage] = useState("");
  const [requestSuccess, setRequestSuccess] = useState("");

  const handleSendCollaborationRequest = async (e) => {
    e.preventDefault();
    if (!requestModal) return;
    setError("");
    setRequestSuccess("");
    setSubmittingAction("request");

    try {
      await sendCollaborationRequest({
        to_user_id: requestModal.targetUserId,
        request_type: requestModal.type,
        related_id: requestModal.relatedId,
        message: requestMessage,
      });
      setRequestSuccess("Collaboration request sent successfully!");
      setTimeout(() => {
        setRequestModal(null);
        setRequestMessage("");
        setRequestSuccess("");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send collaboration request.");
    } finally {
      setSubmittingAction("");
    }
  };

  // Search & filter states – Co-authors section
  const [coauthorSearch, setCoauthorSearch] = useState("");
  const [coauthorStatusFilter, setCoauthorStatusFilter] = useState("");

  // Search & filter states – Projects/Teams section
  const [projectSearch, setProjectSearch] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState("");

  // Search & filter states – Institutional Collaborations section
  const [collabSearch, setCollabSearch] = useState("");
  const [collabTypeFilter, setCollabTypeFilter] = useState("");
  const [collabStatusFilter, setCollabStatusFilter] = useState("");
  const [collabSortBy, setCollabSortBy] = useState("");

  // Separate pagination states for all 3 sections
  const [coauthorPage, setCoauthorPage] = useState(1);
  const [coauthorPageSize, setCoauthorPageSize] = useState(5);

  const [projectPage, setProjectPage] = useState(1);
  const [projectPageSize, setProjectPageSize] = useState(5);

  const [collabPage, setCollabPage] = useState(1);
  const [collabPageSize, setCollabPageSize] = useState(5);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [collabRes, pubRes, projRes, resRes, instRes] = await Promise.all([
        getCollaborations(),
        getPublications(),
        getProjects(),
        getResearchers(),
        getInstitutions(),
      ]);
      setCollaborations(collabRes.data);
      setPublications(pubRes.data);
      setProjects(projRes.data);
      setResearchers(resRes.data);
      setInstitutions(instRes.data);
      setError("");
    } catch {
      setError("Failed to load collaboration management data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    Promise.all([
      getCollaborations(),
      getPublications(),
      getProjects(),
      getResearchers(),
      getInstitutions(),
    ])
      .then(([collabRes, pubRes, projRes, resRes, instRes]) => {
        if (!active) return;
        setCollaborations(collabRes.data);
        setPublications(pubRes.data);
        setProjects(projRes.data);
        setResearchers(resRes.data);
        setInstitutions(instRes.data);
        setError("");
      })
      .catch(() => {
        if (!active) return;
        setError("Failed to load collaboration management data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const researcherById = useMemo(
    () => new Map(researchers.map((researcher) => [researcher.id, researcher])),
    [researchers],
  );

  const institutionById = useMemo(
    () => new Map(institutions.map((institution) => [institution.id, institution])),
    [institutions],
  );

  const currentUserResearcher = researchers.find((researcher) => researcher.user_id === user?.id);
  const currentUserResearcherId = currentUserResearcher?.id;
  const currentUserInstitutionId =
    currentUserResearcher?.institution_id ||
    (user?.role === "InstitutionAdmin" ? institutions[0]?.id : null);

  const publicationAuthorCount = publications.reduce(
    (total, publication) => total + (publication.authors?.length || 0),
    0,
  );

  const projectAssignmentCount = projects.reduce(
    (total, project) => total + (project.members?.length || 0),
    0,
  );

  const activeProjects = projects.filter((project) => project.status === "Active").length;
  const activeCollaborations = collaborations.filter(
    (collaboration) => collaboration.status === "Active",
  ).length;

  const getResearcherName = (id) => researcherById.get(id)?.full_name || `Researcher #${id}`;
  const getInstitutionName = (id) => institutionById.get(id)?.name || "Not assigned";

  const canManagePublication = (publication) => {
    if (user?.role === "SystemAdmin") return true;
    if (publication.uploaded_by === user?.id) return true;

    if (user?.role === "InstitutionAdmin") {
      const uploader = researchers.find((researcher) => researcher.user_id === publication.uploaded_by);
      if (uploader?.institution_id === currentUserInstitutionId) return true;
    }

    return publication.authors?.some(
      (author) => author.researcher_id === currentUserResearcherId,
    );
  };

  const canManageProject = (project) => {
    if (user?.role === "SystemAdmin") return true;
    if (project.created_by === user?.id) return true;
    if (user?.role === "InstitutionAdmin" && project.institution_id === currentUserInstitutionId) {
      return true;
    }

    return project.members?.some(
      (member) =>
        member.researcher_id === currentUserResearcherId &&
        member.role === "Lead Investigator",
    );
  };

  const handleCollaborationChange = (e) => {
    setCollaborationForm({
      ...collaborationForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateCollaboration = async (e) => {
    e.preventDefault();
    setError("");

    if (!collaborationForm.institution_1_id || !collaborationForm.institution_2_id) {
      setError("Please select both collaborating institutions.");
      return;
    }

    if (collaborationForm.institution_1_id === collaborationForm.institution_2_id) {
      setError("Collaboration must be between two different institutions.");
      return;
    }

    setSubmittingAction("collaboration");
    try {
      await createCollaboration({
        ...collaborationForm,
        institution_1_id: parseInt(collaborationForm.institution_1_id, 10),
        institution_2_id: parseInt(collaborationForm.institution_2_id, 10),
        start_date: collaborationForm.start_date || null,
        end_date: collaborationForm.end_date || null,
      });
      setCollaborationForm(emptyCollaborationForm);
      await loadData(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create collaboration record.");
    } finally {
      setSubmittingAction("");
    }
  };

  const handleDeleteCollaboration = async (id) => {
    if (!window.confirm("Delete this institutional collaboration record?")) return;

    try {
      await deleteCollaboration(id);
      await loadData(false);
    } catch {
      setError("Failed to delete collaboration record.");
    }
  };

  const handleAuthorFormChange = (publicationId, field, value) => {
    setAuthorForms({
      ...authorForms,
      [publicationId]: {
        ...authorForms[publicationId],
        [field]: value,
      },
    });
  };

  const handleAddAuthor = async (e, publication) => {
    e.preventDefault();
    const form = authorForms[publication.id] || {};
    if (!form.researcher_id) {
      setError("Please select a researcher to add as a co-author.");
      return;
    }

    setSubmittingAction(`author-${publication.id}`);
    setError("");

    try {
      await addAuthor(publication.id, {
        researcher_id: parseInt(form.researcher_id, 10),
        author_order: form.author_order
          ? parseInt(form.author_order, 10)
          : (publication.authors?.length || 0) + 1,
        is_corresponding_author: Boolean(form.is_corresponding_author),
      });
      setAuthorForms({
        ...authorForms,
        [publication.id]: {
          researcher_id: "",
          author_order: "",
          is_corresponding_author: false,
        },
      });
      await loadData(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add co-author.");
    } finally {
      setSubmittingAction("");
    }
  };

  const handleRemoveAuthor = async (publicationId, researcherId) => {
    if (!window.confirm("Remove this co-author from the publication?")) return;

    try {
      await removeAuthor(publicationId, researcherId);
      await loadData(false);
    } catch {
      setError("Failed to remove co-author.");
    }
  };

  const handleAssignmentFormChange = (projectId, field, value) => {
    setAssignmentForms({
      ...assignmentForms,
      [projectId]: {
        ...assignmentForms[projectId],
        [field]: value,
      },
    });
  };

  const handleAssignProjectMember = async (e, project) => {
    e.preventDefault();
    const form = assignmentForms[project.id] || {};
    if (!form.researcher_id) {
      setError("Please select a researcher to assign to the project.");
      return;
    }

    setSubmittingAction(`project-${project.id}`);
    setError("");

    try {
      await assignProjectMember(project.id, {
        researcher_id: parseInt(form.researcher_id, 10),
        role: form.role || "Contributor",
      });
      setAssignmentForms({
        ...assignmentForms,
        [project.id]: { researcher_id: "", role: "Contributor" },
      });
      await loadData(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to assign project member.");
    } finally {
      setSubmittingAction("");
    }
  };

  const handleRemoveProjectMember = async (projectId, researcherId) => {
    if (!window.confirm("Remove this researcher from the project team?")) return;

    try {
      await removeProjectMember(projectId, researcherId);
      await loadData(false);
    } catch {
      setError("Failed to remove project member.");
    }
  };

  const getAvailableAuthors = (publication) => {
    const assignedIds = new Set(publication.authors?.map((author) => author.researcher_id));
    return researchers.filter((researcher) => !assignedIds.has(researcher.id));
  };

  const getAvailableProjectMembers = (project) => {
    const assignedIds = new Set(project.members?.map((member) => member.researcher_id));
    return researchers.filter((researcher) => !assignedIds.has(researcher.id));
  };

  useEffect(() => {
    setCoauthorPage(1);
  }, [coauthorSearch, coauthorStatusFilter, activeView]);

  useEffect(() => {
    setProjectPage(1);
  }, [projectSearch, projectStatusFilter, activeView]);

  useEffect(() => {
    setCollabPage(1);
  }, [collabSearch, collabTypeFilter, collabStatusFilter, collabSortBy, activeView]);

  const filteredCoauthorPublications = useMemo(() => {
    return publications.filter((pub) => {
      if (coauthorStatusFilter && pub.status !== coauthorStatusFilter) return false;
      if (coauthorSearch.trim()) {
        const q = coauthorSearch.toLowerCase();
        const titleMatch = pub.title?.toLowerCase().includes(q);
        const authorMatch = pub.authors?.some((a) =>
          (a.researcher?.full_name || researcherById.get(a.researcher_id)?.full_name || "").toLowerCase().includes(q)
        );
        if (!titleMatch && !authorMatch) return false;
      }
      return true;
    });
  }, [publications, coauthorSearch, coauthorStatusFilter, researcherById]);

  const paginatedCoauthorPublications = useMemo(() => {
    const start = (coauthorPage - 1) * coauthorPageSize;
    return filteredCoauthorPublications.slice(start, start + coauthorPageSize);
  }, [filteredCoauthorPublications, coauthorPage, coauthorPageSize]);

  const filteredCollabProjects = useMemo(() => {
    return projects.filter((proj) => {
      if (projectStatusFilter && proj.status !== projectStatusFilter) return false;
      if (projectSearch.trim()) {
        const q = projectSearch.toLowerCase();
        const titleMatch = proj.title?.toLowerCase().includes(q);
        const memberMatch = proj.members?.some((m) =>
          (m.researcher?.full_name || researcherById.get(m.researcher_id)?.full_name || "").toLowerCase().includes(q)
        );
        if (!titleMatch && !memberMatch) return false;
      }
      return true;
    });
  }, [projects, projectSearch, projectStatusFilter, researcherById]);

  const paginatedCollabProjects = useMemo(() => {
    const start = (projectPage - 1) * projectPageSize;
    return filteredCollabProjects.slice(start, start + projectPageSize);
  }, [filteredCollabProjects, projectPage, projectPageSize]);

  const filteredCollaborations = useMemo(() => {
    let result = collaborations.filter((c) => {
      if (collabTypeFilter && c.type !== collabTypeFilter) return false;
      if (collabStatusFilter && c.status !== collabStatusFilter) return false;
      if (collabSearch.trim()) {
        const q = collabSearch.toLowerCase();
        const titleMatch = c.title?.toLowerCase().includes(q);
        const descMatch = c.description?.toLowerCase().includes(q);
        const inst1Match = institutionById.get(c.institution_1_id)?.name?.toLowerCase().includes(q);
        const inst2Match = institutionById.get(c.institution_2_id)?.name?.toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !inst1Match && !inst2Match) return false;
      }
      return true;
    });
    if (collabSortBy === "title_asc") result = [...result].sort((a,b) => (a.title||"").localeCompare(b.title||""));
    if (collabSortBy === "title_desc") result = [...result].sort((a,b) => (b.title||"").localeCompare(a.title||""));
    if (collabSortBy === "status_asc") result = [...result].sort((a,b) => (a.status||"").localeCompare(b.status||""));
    return result;
  }, [collaborations, collabSearch, collabTypeFilter, collabStatusFilter, collabSortBy, institutionById]);

  const paginatedCollaborations = useMemo(() => {
    const start = (collabPage - 1) * collabPageSize;
    return filteredCollaborations.slice(start, start + collabPageSize);
  }, [filteredCollaborations, collabPage, collabPageSize]);

  const handleExportCSV = () => {
    exportToCSV("collaborations_catalog", collaborations, [
      { label: "ID", key: "id" },
      { label: "Title", key: "title" },
      { label: "Type", key: "type" },
      { label: "Status", key: "status" },
      { label: "Institution 1 ID", key: "institution_1_id" },
      { label: "Institution 2 ID", key: "institution_2_id" },
      { label: "Start Date", key: "start_date" },
      { label: "End Date", key: "end_date" },
    ]);
  };

  const handleExportPDF = () => {
    const headers = ["Title", "Type", "Status", "Institution 1", "Institution 2", "Start Date", "End Date"];
    const rows = collaborations.map((c) => [
      c.title,
      c.type || "N/A",
      c.status,
      getInstitutionName(c.institution_1_id),
      getInstitutionName(c.institution_2_id),
      c.start_date || "N/A",
      c.end_date || "N/A",
    ]);
    triggerPDFPrint(
      "Institutional Collaborations Report",
      headers,
      rows,
      {
        subtitle: "All institutional partnerships and collaborative agreements in the network.",
        stats: [
          { label: "Total Collaborations", value: collaborations.length },
          { label: "Active", value: activeCollaborations },
          { label: "Institutions Linked", value: institutions.length },
        ],
      }
    );
  };

  return (
    <AppShell>
      <main className="collab-page">
        <header className="collab-header">
          <div>
            <p className="dashboard-badge">Collaboration Management</p>
            <h1 className="collab-title">Collaboration Management</h1>
            <p className="collab-subtitle">
              Coordinate co-author records, research projects, institutional collaborations,
              team management, and project assignments in one workspace.
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

        <section className="collab-summary" aria-label="Collaboration summary">
          <div className="collab-summary-card">
            <span>Co-author records</span>
            <strong>{publicationAuthorCount}</strong>
          </div>
          <div className="collab-summary-card">
            <span>Research projects</span>
            <strong>{projects.length}</strong>
          </div>
          <div className="collab-summary-card">
            <span>Institutional links</span>
            <strong>{collaborations.length}</strong>
          </div>
          <div className="collab-summary-card">
            <span>Team assignments</span>
            <strong>{projectAssignmentCount}</strong>
          </div>
          <div className="collab-summary-card">
            <span>Active work</span>
            <strong>{activeProjects + activeCollaborations}</strong>
          </div>
        </section>

        <nav className="collab-tabs" aria-label="Collaboration management areas">
          {[
            ["overview", "Overview"],
            ["coauthors", "Co-authors"],
            ["projects", "Projects and Teams"],
            ["institutions", "Institutional Collaborations"],
          ].map(([view, label]) => (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
              className={`collab-tab-btn ${activeView === view ? "collab-tab-btn--active" : ""}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {error && <p className="pub-error">{error}</p>}

        {loading ? (
          <p className="pub-loading">Loading collaboration management data...</p>
        ) : (
          <>
            {(activeView === "overview" || activeView === "coauthors") && (
              <section className="collab-section" aria-labelledby="coauthors-heading">
                <div className="collab-section-header">
                  <div>
                    <p className="pub-section-label">Co-author records</p>
                    <h2 id="coauthors-heading">Publication author teams</h2>
                  </div>
                </div>

                <div className="filter-bar-container">
                  <div className="filter-bar-header">
                    <div className="filter-bar-title"><span>🔍</span> Filter Co-author Publications</div>
                    <span className="filter-results-counter">Showing {filteredCoauthorPublications.length} of {publications.length}</span>
                  </div>
                  <div className="filter-controls-grid">
                    <div className="filter-search-box">
                      <span className="filter-search-icon">🔍</span>
                      <input type="text" placeholder="Search title or author name..." value={coauthorSearch} onChange={(e) => setCoauthorSearch(e.target.value)} className="filter-search-input" />
                    </div>
                    <select value={coauthorStatusFilter} onChange={(e) => setCoauthorStatusFilter(e.target.value)} className="filter-select">
                      <option value="">All Statuses</option>
                      <option value="Draft">Draft</option>
                      <option value="Submitted">Submitted</option>
                      <option value="Published">Published</option>
                      <option value="Archived">Archived</option>
                    </select>
                    {(coauthorSearch || coauthorStatusFilter) && (
                      <button type="button" onClick={() => { setCoauthorSearch(""); setCoauthorStatusFilter(""); }} className="filter-reset-btn">✕ Reset</button>
                    )}
                  </div>
                </div>

                <div className="collab-list">
                  {filteredCoauthorPublications.length === 0 && (
                    <p className="pub-empty">No publications match your filter criteria.</p>
                  )}
                  {paginatedCoauthorPublications.map((publication) => {
                    const editable = canManagePublication(publication);
                    const availableAuthors = getAvailableAuthors(publication);

                    return (
                      <article key={publication.id} className="collab-record">
                        <div className="collab-record-header">
                          <div>
                            <div className="collab-badge-row">
                              <span className="collab-badge">{publication.status || "Draft"}</span>
                              <span className="collab-badge collab-badge--soft">
                                {publication.type || "Publication"}
                              </span>
                            </div>
                            <h3>{publication.title}</h3>
                          </div>
                        </div>

                        <div className="collab-chip-list">
                          {publication.authors?.length ? (
                            publication.authors
                              .slice()
                              .sort((a, b) => (a.author_order || 99) - (b.author_order || 99))
                              .map((author) => (
                                <span key={author.id} className="collab-chip">
                                  <span>
                                    {author.author_order ? `${author.author_order}. ` : ""}
                                    {(author.researcher?.full_name ? author.researcher.full_name : getResearcherName(author.researcher_id))}
                                    {author.is_corresponding_author ? " - corresponding" : ""}
                                  </span>
                                  {editable && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveAuthor(publication.id, author.researcher_id)
                                      }
                                      className="collab-chip-remove"
                                      title="Remove co-author"
                                    >
                                      x
                                    </button>
                                  )}
                                </span>
                              ))
                          ) : (
                            <p className="collab-muted">No co-authors recorded yet.</p>
                          )}
                        </div>

                        {editable && (
                          <form
                            className="collab-inline-form"
                            onSubmit={(e) => handleAddAuthor(e, publication)}
                          >
                            <select
                              value={authorForms[publication.id]?.researcher_id || ""}
                              onChange={(e) =>
                                handleAuthorFormChange(
                                  publication.id,
                                  "researcher_id",
                                  e.target.value,
                                )
                              }
                              className="collab-input"
                              required
                            >
                              <option value="">Select co-author...</option>
                              {availableAuthors.map((researcher) => (
                                <option key={researcher.id} value={researcher.id}>
                                  {researcher.full_name} - {getInstitutionName(researcher.institution_id)}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="1"
                              placeholder="Order"
                              value={authorForms[publication.id]?.author_order || ""}
                              onChange={(e) =>
                                handleAuthorFormChange(
                                  publication.id,
                                  "author_order",
                                  e.target.value,
                                )
                              }
                              className="collab-input collab-input--small"
                            />
                            <label className="collab-check">
                              <input
                                type="checkbox"
                                checked={
                                  authorForms[publication.id]?.is_corresponding_author || false
                                }
                                onChange={(e) =>
                                  handleAuthorFormChange(
                                    publication.id,
                                    "is_corresponding_author",
                                    e.target.checked,
                                  )
                                }
                              />
                              <span>Corresponding</span>
                            </label>
                            <button
                              type="submit"
                              className="collab-button"
                              disabled={
                                submittingAction === `author-${publication.id}` ||
                                availableAuthors.length === 0
                              }
                            >
                              {submittingAction === `author-${publication.id}`
                                ? "Adding..."
                                : "Add Co-author"}
                            </button>
                          </form>
                        )}
                      </article>
                    );
                  })}
                </div>

                <Pagination
                  currentPage={coauthorPage}
                  totalItems={filteredCoauthorPublications.length}
                  pageSize={coauthorPageSize}
                  onPageChange={setCoauthorPage}
                  onPageSizeChange={setCoauthorPageSize}
                  pageSizeOptions={[5, 10, 20]}
                />
              </section>
            )}

            {(activeView === "overview" || activeView === "projects") && (
              <section className="collab-section" aria-labelledby="projects-heading">
                <div className="collab-section-header">
                  <div>
                    <p className="pub-section-label">Research projects</p>
                    <h2 id="projects-heading">Team management and assignments</h2>
                  </div>
                </div>

                <div className="filter-bar-container">
                  <div className="filter-bar-header">
                    <div className="filter-bar-title"><span>🔍</span> Filter Projects & Teams</div>
                    <span className="filter-results-counter">Showing {filteredCollabProjects.length} of {projects.length}</span>
                  </div>
                  <div className="filter-controls-grid">
                    <div className="filter-search-box">
                      <span className="filter-search-icon">🔍</span>
                      <input type="text" placeholder="Search project title or member name..." value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} className="filter-search-input" />
                    </div>
                    <select value={projectStatusFilter} onChange={(e) => setProjectStatusFilter(e.target.value)} className="filter-select">
                      <option value="">All Statuses</option>
                      <option value="Proposed">Proposed</option>
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                    {(projectSearch || projectStatusFilter) && (
                      <button type="button" onClick={() => { setProjectSearch(""); setProjectStatusFilter(""); }} className="filter-reset-btn">✕ Reset</button>
                    )}
                  </div>
                </div>

                <div className="collab-list">
                  {filteredCollabProjects.length === 0 && (
                    <p className="pub-empty">No projects match your filter criteria.</p>
                  )}
                  {paginatedCollabProjects.map((project) => {
                    const editable = canManageProject(project);
                    const availableMembers = getAvailableProjectMembers(project);
                    const isMember = project.members?.some((m) => m.researcher_id === currentUserResearcherId);

                    return (
                      <article key={project.id} className="collab-record">
                        <div className="collab-record-header">
                          <div>
                            <div className="collab-badge-row">
                              <span className="collab-badge">{project.status || "Proposed"}</span>
                              <span className="collab-badge collab-badge--soft">
                                {getInstitutionName(project.institution_id)}
                              </span>
                            </div>
                            <h3>{project.title}</h3>
                          </div>
                          {!isMember && project.created_by && project.created_by !== user?.id && (
                            <button
                              type="button"
                              className="collab-button collab-button--soft"
                              onClick={() => {
                                setRequestModal({
                                  type: "project_invite",
                                  targetUserId: project.created_by,
                                  relatedId: project.id,
                                  title: project.title,
                                });
                                setRequestMessage(`Hi, I'd like to collaborate on your project "${project.title}".`);
                              }}
                            >
                              📩 Request to Join
                            </button>
                          )}
                        </div>

                        {project.description && (
                          <p className="collab-description">{project.description}</p>
                        )}

                        <div className="collab-chip-list">
                          {project.members?.length ? (
                            project.members.map((member) => (
                              <span key={member.id} className="collab-chip">
                                <span>
                                  {(member.researcher?.full_name ? member.researcher.full_name : getResearcherName(member.researcher_id))}
                                  <small>{member.role}</small>
                                </span>
                                {editable && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveProjectMember(project.id, member.researcher_id)
                                    }
                                    className="collab-chip-remove"
                                    title="Remove project member"
                                  >
                                    x
                                  </button>
                                )}
                              </span>
                            ))
                          ) : (
                            <p className="collab-muted">No project team members assigned yet.</p>
                          )}
                        </div>

                        {editable && (
                          <form
                            className="collab-inline-form"
                            onSubmit={(e) => handleAssignProjectMember(e, project)}
                          >
                            <select
                              value={assignmentForms[project.id]?.researcher_id || ""}
                              onChange={(e) =>
                                handleAssignmentFormChange(
                                  project.id,
                                  "researcher_id",
                                  e.target.value,
                                )
                              }
                              className="collab-input"
                              required
                            >
                              <option value="">Assign researcher...</option>
                              {availableMembers.map((researcher) => (
                                <option key={researcher.id} value={researcher.id}>
                                  {researcher.full_name} - {getInstitutionName(researcher.institution_id)}
                                </option>
                              ))}
                            </select>
                            <select
                              value={assignmentForms[project.id]?.role || "Contributor"}
                              onChange={(e) =>
                                handleAssignmentFormChange(project.id, "role", e.target.value)
                              }
                              className="collab-input collab-input--medium"
                            >
                              {PROJECT_ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="collab-button"
                              disabled={
                                submittingAction === `project-${project.id}` ||
                                availableMembers.length === 0
                              }
                            >
                              {submittingAction === `project-${project.id}`
                                ? "Assigning..."
                                : "Assign"}
                            </button>
                          </form>
                        )}
                      </article>
                    );
                  })}
                </div>

                <Pagination
                  currentPage={projectPage}
                  totalItems={filteredCollabProjects.length}
                  pageSize={projectPageSize}
                  onPageChange={setProjectPage}
                  onPageSizeChange={setProjectPageSize}
                  pageSizeOptions={[5, 10, 20]}
                />
              </section>
            )}

            {(activeView === "overview" || activeView === "institutions") && (
              <section className="collab-section" aria-labelledby="institutions-heading">
                <div className="collab-section-header">
                  <div>
                    <p className="pub-section-label">Institutional collaborations</p>
                    <h2 id="institutions-heading">Formal collaboration records</h2>
                  </div>
                </div>

                <form className="collab-form" onSubmit={handleCreateCollaboration}>
                  <input
                    name="title"
                    placeholder="Collaboration title"
                    value={collaborationForm.title}
                    onChange={handleCollaborationChange}
                    required
                    className="collab-input"
                  />
                  <textarea
                    name="description"
                    placeholder="Agreement details"
                    value={collaborationForm.description}
                    onChange={handleCollaborationChange}
                    className="collab-input"
                    rows={3}
                  />
                  <div className="collab-row">
                    <select
                      name="type"
                      value={collaborationForm.type}
                      onChange={handleCollaborationChange}
                      className="collab-input"
                    >
                      {COLLAB_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <select
                      name="status"
                      value={collaborationForm.status}
                      onChange={handleCollaborationChange}
                      className="collab-input"
                    >
                      {COLLAB_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="collab-row">
                    <select
                      name="institution_1_id"
                      value={collaborationForm.institution_1_id}
                      onChange={handleCollaborationChange}
                      required
                      className="collab-input"
                    >
                      <option value="">First institution...</option>
                      {institutions.map((institution) => (
                        <option key={institution.id} value={institution.id}>
                          {institution.name}
                        </option>
                      ))}
                    </select>
                    <select
                      name="institution_2_id"
                      value={collaborationForm.institution_2_id}
                      onChange={handleCollaborationChange}
                      required
                      className="collab-input"
                    >
                      <option value="">Second institution...</option>
                      {institutions.map((institution) => (
                        <option key={institution.id} value={institution.id}>
                          {institution.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="collab-row">
                    <input
                      name="start_date"
                      type="date"
                      value={collaborationForm.start_date}
                      onChange={handleCollaborationChange}
                      className="collab-input"
                    />
                    <input
                      name="end_date"
                      type="date"
                      value={collaborationForm.end_date}
                      onChange={handleCollaborationChange}
                      className="collab-input"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingAction === "collaboration"}
                    className="collab-button"
                  >
                    {submittingAction === "collaboration"
                      ? "Saving..."
                      : "Add Collaboration"}
                  </button>
                </form>

                {/* Search & Filter Controls for Institutional Collaborations */}
                <div className="filter-bar-container">
                  <div className="filter-bar-header">
                    <div className="filter-bar-title"><span>🔍</span> Filter Institutional Collaborations</div>
                    <span className="filter-results-counter">Showing {filteredCollaborations.length} of {collaborations.length}</span>
                  </div>
                  <div className="filter-controls-grid">
                    <div className="filter-search-box">
                      <span className="filter-search-icon">🔍</span>
                      <input type="text" placeholder="Search title, description, institution name..." value={collabSearch} onChange={(e) => setCollabSearch(e.target.value)} className="filter-search-input" />
                    </div>
                    <select value={collabTypeFilter} onChange={(e) => setCollabTypeFilter(e.target.value)} className="filter-select">
                      <option value="">All Types</option>
                      {COLLAB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={collabStatusFilter} onChange={(e) => setCollabStatusFilter(e.target.value)} className="filter-select">
                      <option value="">All Statuses</option>
                      {COLLAB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={collabSortBy} onChange={(e) => setCollabSortBy(e.target.value)} className="filter-select">
                      <option value="">Sort By (Default)</option>
                      <option value="title_asc">Title (A - Z)</option>
                      <option value="title_desc">Title (Z - A)</option>
                      <option value="status_asc">Status</option>
                    </select>
                    {(collabSearch || collabTypeFilter || collabStatusFilter || collabSortBy) && (
                      <button type="button" onClick={() => { setCollabSearch(""); setCollabTypeFilter(""); setCollabStatusFilter(""); setCollabSortBy(""); }} className="filter-reset-btn">✕ Reset Filters</button>
                    )}
                  </div>
                </div>

                <div className="collab-list">
                  {filteredCollaborations.length === 0 && (
                    <p className="pub-empty">No institutional collaborations match your filter.</p>
                  )}
                  {paginatedCollaborations.map((collaboration) => (
                    <article key={collaboration.id} className="collab-record">
                      <div className="collab-record-header">
                        <div>
                          <div className="collab-badge-row">
                            <span className="collab-badge">{collaboration.status}</span>
                            <span className="collab-badge collab-badge--soft">
                              {collaboration.type}
                            </span>
                          </div>
                          <h3>{collaboration.title}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCollaboration(collaboration.id)}
                          className="collab-chip-remove"
                          title="Delete collaboration record"
                          style={{ padding: "4px 8px", fontSize: "0.85rem" }}
                        >
                          Delete
                        </button>
                      </div>

                      {collaboration.description && (
                        <p className="collab-description">{collaboration.description}</p>
                      )}

                      <p className="collab-meta">
                        Partners: <strong>{getInstitutionName(collaboration.institution_1_id)}</strong> ↔{" "}
                        <strong>{getInstitutionName(collaboration.institution_2_id)}</strong>
                      </p>

                      {(collaboration.start_date || collaboration.end_date) && (
                        <p className="collab-meta" style={{ marginTop: "-8px" }}>
                          Timeline: {collaboration.start_date || "?"} to {collaboration.end_date || "?"}
                        </p>
                      )}
                    </article>
                  ))}
                </div>

                <Pagination
                  currentPage={collabPage}
                  totalItems={filteredCollaborations.length}
                  pageSize={collabPageSize}
                  onPageChange={setCollabPage}
                  onPageSizeChange={setCollabPageSize}
                  pageSizeOptions={[5, 10, 20]}
                />
              </section>
            )}
          </>
        )}

        {/* Send Collaboration Request Modal */}
        {requestModal && (
          <div className="collab-modal-overlay" onClick={() => setRequestModal(null)}>
            <div className="collab-modal" onClick={(e) => e.stopPropagation()}>
              <div className="collab-modal-header">
                <h3>Send Collaboration Request</h3>
                <button
                  type="button"
                  className="collab-modal-close"
                  onClick={() => setRequestModal(null)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendCollaborationRequest} className="collab-modal-form">
                <p className="collab-modal-target">
                  Target: <strong>{requestModal.title}</strong>
                </p>

                {requestSuccess ? (
                  <p className="collab-modal-success">{requestSuccess}</p>
                ) : (
                  <>
                    <label className="collab-modal-label">
                      <span>Message / Introduction:</span>
                      <textarea
                        rows="4"
                        value={requestMessage}
                        onChange={(e) => setRequestMessage(e.target.value)}
                        placeholder="Write a short message explaining why you'd like to collaborate..."
                        className="collab-textarea"
                      />
                    </label>

                    <div className="collab-modal-actions">
                      <button
                        type="button"
                        onClick={() => setRequestModal(null)}
                        className="collab-button collab-button--soft"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="collab-button"
                        disabled={submittingAction === "request"}
                      >
                        {submittingAction === "request" ? "Sending..." : "Send Request"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
