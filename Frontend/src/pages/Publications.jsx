import { useEffect, useState, useMemo } from "react";
import {
  getPublications,
  createPublication,
  updatePublication,
  updatePublicationStatus,
  deletePublication,
  uploadPublicationFile,
  lookupDoi,
  exportCitation,
} from "../api/publications";
import { getResearchers, getInstitutions } from "../api/researchers";
import { sendCollaborationRequest } from "../api/collaboration_requests";
import AppShell from "../components/AppShell";
import Pagination from "../components/Pagination";
import { useAuth } from "../hooks/useAuth";
import { exportToCSV, triggerPDFPrint } from "../utils/exportUtils";
import "./Publications.css";

const STATUSES = ["Draft", "Submitted", "Published", "Archived"];
const TYPES = ["Journal", "ConferencePaper", "Book", "Patent", "Report"];
const statusClass = (status) => (status || "all").toLowerCase();
const API_BASE_URL = "http://127.0.0.1:8000";

const getFileHref = (fileUrl) => {
  if (!fileUrl) return "";
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  return `${API_BASE_URL}${fileUrl}`;
};

export default function Publications() {
  const { user } = useAuth();
  const [publications, setPublications] = useState([]);
  const [researchers, setResearchers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterVisibility, setFilterVisibility] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all, mine, institutional

  // Request modal state
  const [requestModal, setRequestModal] = useState(null); // { type, targetUserId, relatedId, title, selectableTargets }
  const [requestMessage, setRequestMessage] = useState("");
  const [requestSuccess, setRequestSuccess] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  const handleSendCollaborationRequest = async (e) => {
    e.preventDefault();
    if (!requestModal) return;
    setError("");
    setRequestSuccess("");
    setSendingRequest(true);

    try {
      await sendCollaborationRequest({
        to_user_id: requestModal.targetUserId,
        request_type: requestModal.type,
        related_id: requestModal.relatedId,
        message: requestMessage,
      });
      setRequestSuccess("Co-authorship proposal sent successfully!");
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

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [form, setForm] = useState({
    title: "",
    type: "Journal",
    status: "Draft",
    abstract: "",
    doi: "",
    visible_to_others: false,
  });

  const [editingPubId, setEditingPubId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    type: "Journal",
    status: "Draft",
    abstract: "",
    doi: "",
    visible_to_others: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [uploadFiles, setUploadFiles] = useState({});
  const [uploadingPubId, setUploadingPubId] = useState(null);
  const [fetchingDoi, setFetchingDoi] = useState(false);

  const handleDoiLookup = async () => {
    if (!form.doi.trim()) {
      alert("Please enter a DOI string first.");
      return;
    }
    setFetchingDoi(true);
    setError("");
    try {
      const res = await lookupDoi(form.doi.trim());
      const data = res.data;
      setForm((prev) => ({
        ...prev,
        title: data.title || prev.title,
        abstract: data.abstract || prev.abstract,
        type: data.type === "Conference Paper" ? "ConferencePaper" : (data.type === "Technical Report" ? "Report" : (TYPES.includes(data.type) ? data.type : "Journal")),
      }));
    } catch (err) {
      setError(err.response?.data?.detail || "Could not fetch DOI metadata from CrossRef.");
    } finally {
      setFetchingDoi(false);
    }
  };

  const handleExportSingleCitation = async (pub, format) => {
    try {
      const res = await exportCitation(pub.id, format);
      const ext = format === "bibtex" ? "bib" : (format === "ris" ? "ris" : "txt");
      const blob = new Blob([res.data], { type: "text/plain;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `citation_${pub.id}_${format}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch {
      alert(`Failed to export citation in ${format.toUpperCase()} format.`);
    }
  };

  const statusCounts = STATUSES.map((status) => ({
    status,
    count: publications.filter((publication) => publication.status === status).length,
  }));

  const refreshPublications = async (status = "") => {
    setLoading(true);
    try {
      const [pubRes, resRes, instRes] = await Promise.all([
        getPublications(status || undefined),
        getResearchers(),
        getInstitutions(),
      ]);
      setPublications(pubRes.data);
      setResearchers(resRes.data);
      setInstitutions(instRes.data);
      setError("");
    } catch {
      setError("Failed to load publications or reference data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    Promise.all([
      getPublications(filterStatus || undefined),
      getResearchers(),
      getInstitutions(),
    ])
      .then(([pubRes, resRes, instRes]) => {
        if (!active) return;
        setPublications(pubRes.data);
        setResearchers(resRes.data);
        setInstitutions(instRes.data);
        setError("");
      })
      .catch(() => {
        if (!active) return;
        setError("Failed to load publications or reference data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filterStatus]);

  const handleFormChange = (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: val });
  };

  const handleEditFormChange = (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setEditForm({ ...editForm, [e.target.name]: val });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        ...form,
        doi: form.doi.trim() === "" ? null : form.doi,
        abstract: form.abstract.trim() === "" ? null : form.abstract,
      };
      await createPublication(payload);
      setForm({ title: "", type: "Journal", status: "Draft", abstract: "", doi: "", visible_to_others: false });
      await refreshPublications(filterStatus);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create publication");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (pub) => {
    setEditingPubId(pub.id);
    setEditForm({
      title: pub.title || "",
      type: pub.type || "Journal",
      status: pub.status || "Draft",
      abstract: pub.abstract || "",
      doi: pub.doi || "",
      visible_to_others: pub.visible_to_others || false,
    });
  };

  const handleCancelEdit = () => {
    setEditingPubId(null);
    setEditForm({
      title: "",
      type: "Journal",
      status: "Draft",
      abstract: "",
      doi: "",
      visible_to_others: false,
    });
  };

  const handleSaveEdit = async (id) => {
    try {
      const payload = {
        ...editForm,
        doi: editForm.doi.trim() === "" ? null : editForm.doi,
        abstract: editForm.abstract.trim() === "" ? null : editForm.abstract,
      };
      await updatePublication(id, payload);
      setEditingPubId(null);
      await refreshPublications(filterStatus);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save publication updates.");
    }
  };

  const handleToggleVisibility = async (pub) => {
    try {
      await updatePublication(pub.id, {
        visible_to_others: !pub.visible_to_others,
      });
      await refreshPublications(filterStatus);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to toggle publication visibility.");
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updatePublicationStatus(id, newStatus);
      await refreshPublications(filterStatus);
    } catch {
      setError("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this publication?")) return;
    try {
      await deletePublication(id);
      await refreshPublications(filterStatus);
    } catch {
      setError("Failed to delete publication");
    }
  };

  const handleUploadFileChange = (publicationId, file) => {
    setUploadFiles({
      ...uploadFiles,
      [publicationId]: file,
    });
  };

  const handleFileUpload = async (e, publicationId) => {
    e.preventDefault();
    const file = uploadFiles[publicationId];

    if (!file) {
      alert("Please choose a PDF, DOC, DOCX, or TXT file to upload.");
      return;
    }

    setUploadingPubId(publicationId);
    setError("");

    try {
      await uploadPublicationFile(publicationId, file);
      setUploadFiles({
        ...uploadFiles,
        [publicationId]: null,
      });
      await refreshPublications(filterStatus);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to upload publication file.");
    } finally {
      setUploadingPubId(null);
    }
  };

  const getResearcherName = (id) => {
    const res = researchers.find((r) => r.id === id);
    return res ? res.full_name : `Researcher #${id}`;
  };

  const getAuthorNames = (pub) => {
    if (!pub.authors || pub.authors.length === 0) return "No authors listed";
    return pub.authors
      .map((a) => (a.researcher?.full_name ? a.researcher.full_name : getResearcherName(a.researcher_id)))
      .join(", ");
  };

  const currentUserResearcher = researchers.find((r) => r.user_id === user?.id);
  const currentUserResearcherId = currentUserResearcher?.id;
  const currentUserInstitutionId = currentUserResearcher?.institution_id || (user?.role === "InstitutionAdmin" ? institutions[0]?.id : null);

  const canManagePublication = (pub) => {
    if (user?.role === "SystemAdmin") return true;
    if (pub.uploaded_by === user?.id) return true;

    if (user?.role === "InstitutionAdmin") {
      const uploaderRes = researchers.find((r) => r.user_id === pub.uploaded_by);
      if (uploaderRes && uploaderRes.institution_id === currentUserInstitutionId) return true;
    }

    const isCoAuthor = pub.authors?.some((a) => a.researcher_id === currentUserResearcherId);
    return isCoAuthor;
  };

  const filteredPublications = useMemo(() => {
    let result = publications.filter((pub) => {
      if (activeTab === "mine") {
        const isUploader = pub.uploaded_by === user?.id;
        const isCoAuthor = pub.authors?.some((a) => a.researcher_id === currentUserResearcherId);
        if (!isUploader && !isCoAuthor) return false;
      }
      if (activeTab === "institutional") {
        const uploaderRes = researchers.find((r) => r.user_id === pub.uploaded_by);
        if (uploaderRes?.institution_id !== currentUserInstitutionId) return false;
      }
      if (filterType && pub.type !== filterType) {
        return false;
      }
      if (filterVisibility === "public" && !pub.visible_to_others) {
        return false;
      }
      if (filterVisibility === "private" && pub.visible_to_others) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const titleMatch = pub.title?.toLowerCase().includes(q);
        const abstractMatch = pub.abstract?.toLowerCase().includes(q);
        const doiMatch = pub.doi?.toLowerCase().includes(q);
        const typeMatch = pub.type?.toLowerCase().includes(q);
        const authorMatch = pub.authors?.some((a) =>
          (a.researcher?.full_name || getResearcherName(a.researcher_id))
            .toLowerCase()
            .includes(q)
        );
        if (!titleMatch && !abstractMatch && !doiMatch && !typeMatch && !authorMatch) {
          return false;
        }
      }
      return true;
    });

    if (sortBy) {
      result = [...result].sort((a, b) => {
        if (sortBy === "title_asc") return (a.title || "").localeCompare(b.title || "");
        if (sortBy === "title_desc") return (b.title || "").localeCompare(a.title || "");
        if (sortBy === "type_asc") return (a.type || "").localeCompare(b.type || "");
        if (sortBy === "status_asc") return (a.status || "").localeCompare(b.status || "");
        return 0;
      });
    }

    return result;
  }, [publications, activeTab, user?.id, currentUserResearcherId, currentUserInstitutionId, researchers, filterType, filterVisibility, searchTerm, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, activeTab, searchTerm, filterType, filterVisibility, sortBy]);

  const paginatedPublications = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPublications.slice(start, start + pageSize);
  }, [filteredPublications, currentPage, pageSize]);

  const handleExportCSV = () => {
    exportToCSV("publications_catalog", publications, [
      { label: "ID", key: "id" },
      { label: "Title", key: "title" },
      { label: "Type", key: "type" },
      { label: "Status", key: "status" },
      { label: "DOI", key: "doi" },
      { label: "Abstract", key: "abstract" },
      { label: "Publication Date", key: "publication_date" },
    ]);
  };

  const handleExportPDF = () => {
    const headers = ["Title", "Type", "Status", "DOI", "Publication Date"];
    const rows = publications.map((p) => [
      p.title,
      p.type || "N/A",
      p.status,
      p.doi || "N/A",
      p.publication_date || "N/A",
    ]);
    const typesCount = [...new Set(publications.map((p) => p.type).filter(Boolean))].length;
    const publishedCount = publications.filter((p) => p.status === "Published").length;
    triggerPDFPrint(
      "Publications Catalog Report",
      headers,
      rows,
      {
        subtitle: "Complete record of all tracked publications across the research network.",
        stats: [
          { label: "Total Publications", value: publications.length },
          { label: "Published", value: publishedCount },
          { label: "Publication Types", value: typesCount },
        ],
      }
    );
  };

  return (
    <AppShell>
      <div className="publications-container">
        <header className="publications-header">
          <div>
            <span className="dashboard-badge">Resource Library</span>
            <h1 className="publications-title">Publication Management</h1>
            <p className="publications-subtitle">
              Track journal papers, conference papers, books, patents, technical reports, DOI records, and publication status history.
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

        <section className="publication-summary" aria-label="Publication status summary">
          <div className="publication-summary-card">
            <span>Total records</span>
            <strong>{publications.length}</strong>
          </div>
          {statusCounts.map(({ status, count }) => (
            <div className={`publication-summary-card publication-summary-card--${statusClass(status)}`} key={status}>
              <span>{status}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </section>

        {/* Dynamic Navigation Tabs */}
        <nav className="publications-tabs" aria-label="Publication groups">
          <button
            onClick={() => setActiveTab("all")}
            className={`publications-tab-btn ${activeTab === "all" ? "publications-tab-btn--active" : ""}`}
          >
            All Publications
          </button>
          <button
            onClick={() => setActiveTab("mine")}
            className={`publications-tab-btn ${activeTab === "mine" ? "publications-tab-btn--active" : ""}`}
          >
            My Publications
          </button>
          {currentUserInstitutionId && (
            <button
              onClick={() => setActiveTab("institutional")}
              className={`publications-tab-btn ${activeTab === "institutional" ? "publications-tab-btn--active" : ""}`}
            >
              Institutional Publications
            </button>
          )}
        </nav>

        {/* Add Publication Form */}
        <form onSubmit={handleCreate} className="publication-form">
          <div className="publication-form-header">
            <div>
              <p className="pub-section-label">New record</p>
              <h2>Add publication</h2>
            </div>
          </div>
          <input
            name="title"
            placeholder="Title"
            value={form.title}
            onChange={handleFormChange}
            required
            className="pub-input"
          />
          <div className="pub-row">
            <select name="type" value={form.type} onChange={handleFormChange} className="pub-input">
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              name="status"
              value={form.status}
              onChange={handleFormChange}
              className={`pub-input pub-status-control pub-status-control--${statusClass(form.status)}`}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="pub-row">
            <input
              name="doi"
              placeholder="DOI (e.g. 10.1038/s41586-020-2649-2)"
              value={form.doi}
              onChange={handleFormChange}
              className="pub-input"
            />
            <button
              type="button"
              onClick={handleDoiLookup}
              disabled={fetchingDoi}
              className="pub-button"
              style={{ width: "auto", whiteSpace: "nowrap", background: "var(--accent-secondary, #10b981)", minWidth: "160px" }}
            >
              {fetchingDoi ? "Fetching..." : "⚡ Auto-Fill via DOI"}
            </button>
          </div>
          <textarea
            name="abstract"
            placeholder="Abstract"
            value={form.abstract}
            onChange={handleFormChange}
            className="pub-input"
            rows={3}
          />
          
          <label className="pub-checkbox-container">
            <input
              type="checkbox"
              name="visible_to_others"
              checked={form.visible_to_others}
              onChange={handleFormChange}
            />
            <span>Visible to others (Public Record)</span>
          </label>

          {error && <p className="pub-error">{error}</p>}
          <button type="submit" disabled={submitting} className="pub-button">
            {submitting ? "Creating..." : "Create publication"}
          </button>
        </form>

        {/* Search & Filter Controls */}
        <div className="filter-bar-container">
          <div className="filter-bar-header">
            <div className="filter-bar-title">
              <span>🔍</span> Filter & Search Publications
            </div>
            <span className="filter-results-counter">
              Showing {filteredPublications.length} of {publications.length} records
            </span>
          </div>

          <div className="filter-controls-grid">
            <div className="filter-search-box">
              <span className="filter-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search title, abstract, DOI, type, author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-search-input"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="">All Types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              value={filterVisibility}
              onChange={(e) => setFilterVisibility(e.target.value)}
              className="filter-select"
            >
              <option value="">All Visibilities</option>
              <option value="public">Public Records</option>
              <option value="private">Private Records</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="">Sort By (Default)</option>
              <option value="title_asc">Title (A - Z)</option>
              <option value="title_desc">Title (Z - A)</option>
              <option value="type_asc">Format Type</option>
              <option value="status_asc">Status</option>
            </select>

            {(searchTerm || filterStatus || filterType || filterVisibility || sortBy) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setFilterStatus("");
                  setFilterType("");
                  setFilterVisibility("");
                  setSortBy("");
                }}
                className="filter-reset-btn"
              >
                ✕ Reset Filters
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="pub-loading">Loading publications...</p>
        ) : (
          <div className="publication-list-container">
            {filteredPublications.length === 0 ? (
              <p className="pub-empty">No publications found in this tab.</p>
            ) : (
              <>
                <div className="publication-list">
                  {paginatedPublications.map((pub) => {
                    const editable = canManagePublication(pub);
                    const isEditing = editingPubId === pub.id;

                    return (
                      <div key={pub.id} className="publication-card">
                        {isEditing ? (
                          /* Inline Edit Mode */
                          <div className="pub-edit-form">
                            <h3 style={{ marginBottom: "14px" }}>Edit Publication Details</h3>
                            <div className="pub-edit-fields">
                              <input
                                name="title"
                                value={editForm.title}
                                onChange={handleEditFormChange}
                                required
                                className="pub-input"
                                placeholder="Title"
                              />
                              <div className="pub-row">
                                <select
                                  name="type"
                                  value={editForm.type}
                                  onChange={handleEditFormChange}
                                  className="pub-input"
                                >
                                  {TYPES.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                                <select
                                  name="status"
                                  value={editForm.status}
                                  onChange={handleEditFormChange}
                                  className="pub-input"
                                >
                                  {STATUSES.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              </div>
                              <input
                                name="doi"
                                value={editForm.doi}
                                onChange={handleEditFormChange}
                                className="pub-input"
                                placeholder="DOI (optional)"
                              />
                              <textarea
                                name="abstract"
                                value={editForm.abstract}
                                onChange={handleEditFormChange}
                                className="pub-input"
                                placeholder="Abstract"
                                rows={3}
                              />
                              <label className="pub-checkbox-container">
                                <input
                                  type="checkbox"
                                  name="visible_to_others"
                                  checked={editForm.visible_to_others}
                                  onChange={handleEditFormChange}
                                />
                                <span>Visible to others (Public Record)</span>
                              </label>
                            </div>

                            <div className="proj-edit-actions">
                              <button
                                onClick={() => handleSaveEdit(pub.id)}
                                className="proj-action-btn proj-save-btn"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="proj-action-btn proj-cancel-btn"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Display Mode */
                          <>
                            <div className="pub-card-header">
                              <div>
                                <div className="pub-badge-row">
                                  <span className={`pub-badge ${pub.visible_to_others ? "pub-badge--public" : "pub-badge--private"}`}>
                                    {pub.visible_to_others ? "🌐 Public" : "🔒 Private"}
                                  </span>
                                  <span className={`pub-badge pub-badge--${pub.status?.toLowerCase()}`}>
                                    {pub.status}
                                  </span>
                                </div>
                                <h3 style={{ marginTop: "8px" }}>{pub.title}</h3>
                              </div>
                            </div>

                            <p className="pub-meta">
                              Type: <strong>{pub.type}</strong> {pub.doi && <>| DOI: <strong>{pub.doi}</strong></>}
                            </p>
                            
                            <p className="pub-meta" style={{ marginTop: "-8px", color: "var(--text)" }}>
                              Authors: <strong>{getAuthorNames(pub)}</strong>
                            </p>

                            {pub.abstract && <p className="pub-abstract">{pub.abstract}</p>}

                            <div className="pub-file-panel">
                              <div>
                                <span className="pub-file-label">Attached file</span>
                                {pub.file_url ? (
                                  <a href={getFileHref(pub.file_url)} target="_blank" rel="noopener noreferrer">
                                    Open document
                                  </a>
                                ) : (
                                  <strong>No file uploaded</strong>
                                )}
                              </div>

                              {editable && (
                                <form onSubmit={(e) => handleFileUpload(e, pub.id)} className="pub-upload-form">
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                                    onChange={(e) => handleUploadFileChange(pub.id, e.target.files?.[0] || null)}
                                    className="pub-file-input"
                                  />
                                  <button
                                    type="submit"
                                    disabled={uploadingPubId === pub.id}
                                    className="pub-upload-btn"
                                  >
                                    {uploadingPubId === pub.id ? "Uploading..." : pub.file_url ? "Replace File" : "Upload File"}
                                  </button>
                                </form>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="pub-actions">
                              {!editable && pub.uploaded_by && pub.uploaded_by !== user?.id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRequestModal({
                                      type: "coauthor_invite",
                                      targetUserId: pub.uploaded_by,
                                      relatedId: pub.id,
                                      title: pub.title,
                                    });
                                    setRequestMessage(`Hi, I'd like to collaborate as a co-author on your publication "${pub.title}".`);
                                  }}
                                  className="pub-edit-btn"
                                  style={{ borderColor: "var(--accent-border)", color: "var(--accent)", background: "var(--accent-bg)" }}
                                >
                                  🤝 Propose Co-Authorship
                                </button>
                              )}
                              {editable && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const targets = researchers.filter(r => r.user_id && r.user_id !== user?.id);
                                      if (targets.length === 0) {
                                        alert("No other registered researchers found.");
                                        return;
                                      }
                                      setRequestModal({
                                        type: "coauthor_invite",
                                        targetUserId: targets[0].user_id,
                                        relatedId: pub.id,
                                        title: pub.title,
                                        selectableTargets: targets,
                                      });
                                      setRequestMessage(`Hi! I'd like to invite you as a co-author on our publication "${pub.title}".`);
                                    }}
                                    className="pub-edit-btn"
                                    style={{ borderColor: "var(--accent-border)", color: "var(--accent)" }}
                                  >
                                    📩 Invite Co-Author
                                  </button>
                                  <select
                                    value={pub.status}
                                    onChange={(e) => handleStatusChange(pub.id, e.target.value)}
                                    className={`pub-status-select pub-status-control pub-status-control--${statusClass(pub.status)}`}
                                  >
                                    {STATUSES.map((s) => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleExportSingleCitation(pub, e.target.value);
                                        e.target.value = "";
                                      }
                                    }}
                                    className="pub-edit-btn"
                                    style={{ background: "var(--bg-tertiary)", cursor: "pointer", color: "var(--text-primary)" }}
                                  >
                                    <option value="">📥 Export Citation...</option>
                                    <option value="bibtex">BibTeX (.bib)</option>
                                    <option value="ris">RIS (.ris)</option>
                                    <option value="apa">APA Reference</option>
                                    <option value="ieee">IEEE Reference</option>
                                  </select>
                                  <button
                                    onClick={() => handleStartEdit(pub)}
                                    className="pub-edit-btn"
                                  >
                                    ✏️ Edit Details
                                  </button>
                                  <button
                                    onClick={() => handleToggleVisibility(pub)}
                                    className="pub-edit-btn"
                                  >
                                    {pub.visible_to_others ? "🔒 Make Private" : "🌐 Make Public"}
                                  </button>
                                  <button
                                    onClick={() => handleDelete(pub.id)}
                                    className="pub-delete-btn"
                                  >
                                    🗑️ Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredPublications.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[5, 10, 20]}
                />
              </>
            )}
          </div>
        )}

        {requestModal && (
          <div className="collab-modal-overlay" onClick={() => setRequestModal(null)}>
            <div className="collab-modal" onClick={(e) => e.stopPropagation()}>
              <div className="collab-modal-header">
                <h3>Propose Co-Authorship</h3>
                <button type="button" onClick={() => setRequestModal(null)} className="collab-modal-close">✕</button>
              </div>
              {requestSuccess ? (
                <div className="collab-modal-success">{requestSuccess}</div>
              ) : (
                <form onSubmit={handleSendCollaborationRequest} className="collab-modal-form">
                  <p className="collab-modal-target">Publication: <strong>{requestModal.title}</strong></p>

                  {requestModal.selectableTargets && (
                    <label className="collab-modal-label">
                      <span>Select Recipient Researcher:</span>
                      <select
                        value={requestModal.targetUserId}
                        onChange={(e) => setRequestModal({ ...requestModal, targetUserId: parseInt(e.target.value) })}
                        className="pub-input"
                        required
                      >
                        {requestModal.selectableTargets.map((r) => (
                          <option key={r.id} value={r.user_id}>
                            {r.full_name} ({r.user?.email || `Researcher #${r.id}`})
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="collab-modal-label">
                    <span>Proposal Message:</span>
                    <textarea
                      rows={4}
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                      placeholder="Write a brief proposal message..."
                      className="collab-textarea"
                      required
                    />
                  </label>
                  {error && <p className="pub-error">{error}</p>}
                  <div className="collab-modal-actions">
                    <button type="button" onClick={() => setRequestModal(null)} className="pub-edit-btn">
                      Cancel
                    </button>
                    <button type="submit" disabled={sendingRequest} className="pub-button" style={{ width: "auto" }}>
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
