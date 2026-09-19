import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import Pagination from "../components/Pagination";
import {
  createInstitution,
  deleteInstitution,
  getInstitutions,
  updateInstitution,
} from "../api/institutions";
import { exportToCSV, triggerPDFPrint } from "../utils/exportUtils";
import "./Institutions.css";

const EMPTY_FORM = {
  name: "",
  type: "",
  address: "",
  website: "",
};

const normalizeOptional = (value) => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const buildPayload = (form) => ({
  name: form.name.trim(),
  type: normalizeOptional(form.type),
  address: normalizeOptional(form.address),
  website: normalizeOptional(form.website),
});

const formatWebsite = (website) => {
  if (!website) return "";
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
};

import { useAuth } from "../hooks/useAuth";

export default function Institutions() {
  const { user } = useAuth();
  const isAdmin = user?.role === "SystemAdmin" || user?.role === "InstitutionAdmin";
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingInstitutionId, setEditingInstitutionId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortBy, setSortBy] = useState("");


  const typeSummary = useMemo(() => {
    const counts = institutions.reduce((acc, institution) => {
      const type = institution.type || "Unspecified";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 4);
  }, [institutions]);

  const loadInstitutions = async () => {
    setLoading(true);
    try {
      const response = await getInstitutions();
      setInstitutions(response.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load institutions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    getInstitutions()
      .then((response) => {
        if (!active) return;
        setInstitutions(response.data);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.detail || "Failed to load institutions.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEditFormChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await createInstitution(buildPayload(form));
      setForm(EMPTY_FORM);
      await loadInstitutions();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create institution.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (institution) => {
    setEditingInstitutionId(institution.id);
    setEditForm({
      name: institution.name || "",
      type: institution.type || "",
      address: institution.address || "",
      website: institution.website || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingInstitutionId(null);
    setEditForm(EMPTY_FORM);
  };

  const handleSaveEdit = async (id) => {
    try {
      await updateInstitution(id, buildPayload(editForm));
      setEditingInstitutionId(null);
      setEditForm(EMPTY_FORM);
      await loadInstitutions();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to save institution updates.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this institution?")) return;

    try {
      await deleteInstitution(id);
      await loadInstitutions();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete institution.");
    }
  };

  const availableTypes = useMemo(() => {
    const types = new Set(institutions.map((i) => i.type).filter(Boolean));
    return Array.from(types).sort();
  }, [institutions]);

  const filteredInstitutions = useMemo(() => {
    let result = institutions.filter((inst) => {
      if (filterType && inst.type !== filterType) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const nameMatch = inst.name?.toLowerCase().includes(q);
        const typeMatch = inst.type?.toLowerCase().includes(q);
        const addressMatch = inst.address?.toLowerCase().includes(q);
        const websiteMatch = inst.website?.toLowerCase().includes(q);
        if (!nameMatch && !typeMatch && !addressMatch && !websiteMatch) return false;
      }
      return true;
    });
    if (sortBy === "name_asc") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "name_desc") result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    if (sortBy === "type_asc") result = [...result].sort((a, b) => (a.type || "").localeCompare(b.type || ""));
    if (sortBy === "id_asc") result = [...result].sort((a, b) => a.id - b.id);
    return result;
  }, [institutions, searchTerm, filterType, sortBy]);

  const paginatedInstitutions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInstitutions.slice(start, start + pageSize);
  }, [filteredInstitutions, currentPage, pageSize]);

  const handleExportCSV = () => {
    exportToCSV("institutions_directory", institutions, [
      { label: "ID", key: "id" },
      { label: "Name", key: "name" },
      { label: "Type", key: "type" },
      { label: "Address", key: "address" },
      { label: "Website", key: "website" },
    ]);
  };

  const handleExportPDF = () => {
    const headers = ["Name", "Type", "Address", "Website"];
    const rows = institutions.map((i) => [
      i.name,
      i.type || "Unspecified",
      i.address || "N/A",
      i.website || "N/A",
    ]);
    const uniqueTypes = [...new Set(institutions.map((i) => i.type).filter(Boolean))].length;
    triggerPDFPrint(
      "Institution Directory Report",
      headers,
      rows,
      {
        subtitle: "Complete directory of all research institutions, universities, and partner organizations.",
        stats: [
          { label: "Institutions", value: institutions.length },
          { label: "Institution Types", value: uniqueTypes },
          { label: "Filtered Results", value: filteredInstitutions.length },
        ],
      }
    );
  };

  return (
    <AppShell>
      <main className="institutions-page">
        <header className="institutions-header">
          <div>
            <p className="dashboard-badge">Research Directory</p>
            <h1 className="institutions-title">Institution Management</h1>
            <p className="institutions-subtitle">
              Maintain universities, labs, institutes, and partner organizations that anchor researchers,
              departments, projects, and collaborations across the network.
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

        <section className="institution-summary" aria-label="Institution summary">
          <div className="institution-summary-card">
            <span>Total institutions</span>
            <strong>{institutions.length}</strong>
          </div>
          {typeSummary.map(([type, count]) => (
            <div className="institution-summary-card" key={type}>
              <span>{type}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </section>

        {isAdmin && (
          <form onSubmit={handleCreate} className="institution-form">
            <div className="institution-form-header">
              <p className="pub-section-label">New institution</p>
              <h2>Add Institution</h2>
            </div>

            <div className="institution-row">
              <input
                name="name"
                placeholder="Institution name"
                value={form.name}
                onChange={handleFormChange}
                required
                className="institution-input"
              />
              <input
                name="type"
                placeholder="Type (University, Research Lab, Industry Partner)"
                value={form.type}
                onChange={handleFormChange}
                className="institution-input"
              />
            </div>

            <textarea
              name="address"
              placeholder="Address"
              value={form.address}
              onChange={handleFormChange}
              className="institution-input"
              rows={3}
            />

            <input
              name="website"
              placeholder="Website URL"
              value={form.website}
              onChange={handleFormChange}
              className="institution-input"
            />

            {error && <p className="pub-error">{error}</p>}
            <button type="submit" disabled={submitting} className="institution-button">
              {submitting ? "Adding..." : "Add Institution"}
            </button>
          </form>
        )}


        {loading ? (
          <p className="pub-loading">Loading institutions...</p>
        ) : (
          <div className="institution-list-container">
            {/* Search & Filter Controls */}
            <div className="filter-bar-container">
              <div className="filter-bar-header">
                <div className="filter-bar-title"><span>🔍</span> Filter & Search Institutions</div>
                <span className="filter-results-counter">Showing {filteredInstitutions.length} of {institutions.length} institutions</span>
              </div>
              <div className="filter-controls-grid">
                <div className="filter-search-box">
                  <span className="filter-search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search name, type, address, website..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="filter-search-input"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                  className="filter-select"
                >
                  <option value="">All Types</option>
                  {availableTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                  className="filter-select"
                >
                  <option value="">Sort By (Default)</option>
                  <option value="name_asc">Name (A - Z)</option>
                  <option value="name_desc">Name (Z - A)</option>
                  <option value="type_asc">Type (A - Z)</option>
                  <option value="id_asc">ID (Oldest First)</option>
                </select>
                {(searchTerm || filterType || sortBy) && (
                  <button type="button" onClick={() => { setSearchTerm(""); setFilterType(""); setSortBy(""); setCurrentPage(1); }} className="filter-reset-btn">✕ Reset Filters</button>
                )}
              </div>
            </div>

            {filteredInstitutions.length === 0 ? (
              <p className="pub-empty">No institutions match your filter criteria.</p>
            ) : (
              <>
                <div className="institution-list">
                  {paginatedInstitutions.map((institution) => {
                    const isEditing = editingInstitutionId === institution.id;
                    const websiteHref = formatWebsite(institution.website);

                    return (
                      <article key={institution.id} className="institution-card">
                        {isEditing ? (
                          <div className="institution-edit-form">
                            <div className="institution-card-header">
                              <div>
                                <p className="pub-section-label">Edit record</p>
                                <h3>Institution Details</h3>
                              </div>
                            </div>

                            <div className="institution-edit-fields">
                              <div className="institution-row">
                                <input
                                  name="name"
                                  placeholder="Institution name"
                                  value={editForm.name}
                                  onChange={handleEditFormChange}
                                  required
                                  className="institution-input"
                                />
                                <input
                                  name="type"
                                  placeholder="Type"
                                  value={editForm.type}
                                  onChange={handleEditFormChange}
                                  className="institution-input"
                                />
                              </div>
                              <textarea
                                name="address"
                                placeholder="Address"
                                value={editForm.address}
                                onChange={handleEditFormChange}
                                className="institution-input"
                                rows={3}
                              />
                              <input
                                name="website"
                                placeholder="Website URL"
                                value={editForm.website}
                                onChange={handleEditFormChange}
                                className="institution-input"
                              />
                            </div>

                            <div className="institution-actions">
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(institution.id)}
                                className="institution-save-btn"
                              >
                                Save Changes
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="institution-cancel-btn"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="institution-card-header">
                              <div>
                                <span className="institution-type">
                                  {institution.type || "Unspecified"}
                                </span>
                                <h3>{institution.name}</h3>
                              </div>
                              <span className="institution-id">ID {institution.id}</span>
                            </div>

                            <div className="institution-details">
                              <p>
                                <span>Address</span>
                                <strong>{institution.address || "No address recorded"}</strong>
                              </p>
                              <p>
                                <span>Website</span>
                                {institution.website ? (
                                  <a href={websiteHref} target="_blank" rel="noopener noreferrer">
                                    {institution.website}
                                  </a>
                                ) : (
                                  <strong>No website recorded</strong>
                                )}
                              </p>
                            </div>

                            {isAdmin && (
                              <div className="institution-actions">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(institution)}
                                  className="institution-edit-btn"
                                >
                                  Edit Details
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(institution.id)}
                                  className="institution-delete-btn"
                                >
                                  Delete
                                </button>
                              </div>
                            )}

                          </>
                        )}
                      </article>
                    );
                  })}
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredInstitutions.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[5, 10, 20]}
                />
              </>
            )}
          </div>
        )}
      </main>
    </AppShell>
  );
}
