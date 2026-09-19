import { useEffect, useState, useMemo } from "react";
import AppShell from "../components/AppShell";
import { getPublications, exportCitation } from "../api/publications";
import { addCitation, removeCitation, getCitationsMade, getCitationsReceived } from "../api/citations";
import { exportToCSV, triggerPDFPrint } from "../utils/exportUtils";
import "./Citations.css";

export default function Citations() {
  const [publications, setPublications] = useState([]);
  const [selectedPub, setSelectedPub] = useState(null);
  const [citationsMade, setCitationsMade] = useState([]);
  const [citationsReceived, setCitationsReceived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    citing_publication_id: "",
    cited_publication_id: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Sidebar search & filter (visible to all roles)
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [sidebarFilterStatus, setSidebarFilterStatus] = useState("");

  const filteredPublications = useMemo(() => {
    return publications.filter((pub) => {
      if (sidebarFilterStatus && pub.status !== sidebarFilterStatus) return false;
      if (sidebarSearch.trim()) {
        const q = sidebarSearch.toLowerCase();
        return pub.title?.toLowerCase().includes(q) || pub.type?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [publications, sidebarSearch, sidebarFilterStatus]);

  const loadPublications = async () => {
    setLoading(true);
    try {
      const res = await getPublications();
      setPublications(res.data);
      if (res.data.length > 0 && !selectedPub) {
        setSelectedPub(res.data[0]);
      }
      setError("");
    } catch {
      setError("Failed to load publication records.");
    } finally {
      setLoading(false);
    }
  };

  const loadCitations = async (pub) => {
    if (!pub) return;
    try {
      const [madeRes, receivedRes] = await Promise.all([
        getCitationsMade(pub.id),
        getCitationsReceived(pub.id),
      ]);
      setCitationsMade(madeRes.data);
      setCitationsReceived(receivedRes.data);
    } catch {
      console.error("Failed to load citation list.");
    }
  };

  useEffect(() => {
    loadPublications();
  }, []);

  useEffect(() => {
    if (selectedPub) {
      loadCitations(selectedPub);
      setForm((prev) => ({
        ...prev,
        citing_publication_id: selectedPub.id.toString(),
      }));
    }
  }, [selectedPub]);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddCitation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (!form.citing_publication_id || !form.cited_publication_id) {
      setError("Please select both citing and cited publications.");
      setSubmitting(false);
      return;
    }

    if (form.citing_publication_id === form.cited_publication_id) {
      setError("A publication cannot cite itself.");
      setSubmitting(false);
      return;
    }

    try {
      await addCitation({
        citing_publication_id: parseInt(form.citing_publication_id),
        cited_publication_id: parseInt(form.cited_publication_id),
      });
      setForm((prev) => ({ ...prev, cited_publication_id: "" }));
      if (selectedPub) {
        await loadCitations(selectedPub);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create citation link");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (citingId, citedId) => {
    if (!window.confirm("Remove this citation connection?")) return;
    try {
      await removeCitation(citingId, citedId);
      if (selectedPub) {
        await loadCitations(selectedPub);
      }
    } catch {
      alert("Failed to remove citation");
    }
  };

  const getPublicationTitle = (id) => {
    const pub = publications.find((p) => p.id === id);
    return pub ? pub.title : `Publication #${id}`;
  };

  const handleExportCSV = () => {
    if (!selectedPub) { alert("Please select a publication first."); return; }
    const allCitations = [
      ...citationsMade.map((c) => ({
        direction: "Cites",
        source: selectedPub.title,
        target: getPublicationTitle(c.cited_publication_id),
      })),
      ...citationsReceived.map((c) => ({
        direction: "Cited By",
        source: getPublicationTitle(c.citing_publication_id),
        target: selectedPub.title,
      })),
    ];
    exportToCSV(`citations_${selectedPub.id}`, allCitations, [
      { label: "Direction", key: "direction" },
      { label: "Source Publication", key: "source" },
      { label: "Target Publication", key: "target" },
    ]);
  };

  const handleExportPDF = () => {
    if (!selectedPub) { alert("Please select a publication first."); return; }
    const headers = ["Direction", "Source", "Target"];
    const rows = [
      ...citationsMade.map((c) => ["Cites", selectedPub.title, getPublicationTitle(c.cited_publication_id)]),
      ...citationsReceived.map((c) => ["Cited By", getPublicationTitle(c.citing_publication_id), selectedPub.title]),
    ];
    triggerPDFPrint(
      `Citation Network — ${selectedPub.title}`,
      headers,
      rows,
      {
        subtitle: `Citation connections for publication: "${selectedPub.title}"`,
        stats: [
          { label: "References Made", value: citationsMade.length },
          { label: "Citations Received", value: citationsReceived.length },
          { label: "Total Connections", value: citationsMade.length + citationsReceived.length },
        ],
      }
    );
  };

  const handleExportFormattedCitation = async (format) => {
    if (!selectedPub) { alert("Please select a publication first."); return; }
    try {
      const res = await exportCitation(selectedPub.id, format);
      const ext = format === "bibtex" ? "bib" : (format === "ris" ? "ris" : "txt");
      const blob = new Blob([res.data], { type: "text/plain;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `citation_${selectedPub.id}_${format}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch {
      alert(`Failed to export citation in ${format.toUpperCase()} format.`);
    }
  };

  return (
    <AppShell>
      <main className="cite-page">
        <header className="cite-header">
          <div>
            <p className="dashboard-badge">Impact Analysis</p>
            <h1 className="cite-title">Citation &amp; Reference Module</h1>
            <p className="cite-subtitle">
              Manage citations between scientific publications, analyze DOI cross-references, and export formatted references.
            </p>
          </div>
          <div className="discover-export-btns" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleExportFormattedCitation(e.target.value);
                  e.target.value = "";
                }
              }}
              className="notif-mark-all-btn"
              style={{ background: "var(--accent-bg)", color: "var(--accent)", border: "1px solid var(--accent-border)", cursor: "pointer" }}
            >
              <option value="">📥 Export Reference...</option>
              <option value="bibtex">BibTeX (.bib)</option>
              <option value="ris">RIS (.ris)</option>
              <option value="apa">APA Citation</option>
              <option value="ieee">IEEE Citation</option>
            </select>
            <button onClick={handleExportCSV} className="notif-mark-all-btn">
              📊 Export CSV
            </button>
            <button onClick={handleExportPDF} className="notif-mark-all-btn">
              🖨️ Export PDF
            </button>
          </div>
        </header>

        {loading ? (
          <p className="pub-loading">Loading records...</p>
        ) : (
          <div className="cite-layout">
            {/* Sidebar List */}
            <aside className="cite-sidebar">
              <h3>Select Publication</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "14px" }}>
                Click a paper to explore its reference network.
              </p>
              {/* Sidebar search controls - visible to all roles */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                <input
                  type="text"
                  placeholder="🔍 Search title or type..."
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--input-bg, var(--bg-tertiary))",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
                <select
                  value={sidebarFilterStatus}
                  onChange={(e) => setSidebarFilterStatus(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--input-bg, var(--bg-tertiary))",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                    width: "100%",
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Published">Published</option>
                  <option value="Archived">Archived</option>
                </select>
                {(sidebarSearch || sidebarFilterStatus) && (
                  <button
                    type="button"
                    onClick={() => { setSidebarSearch(""); setSidebarFilterStatus(""); }}
                    style={{ fontSize: "0.78rem", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
                  >
                    ✕ Reset filter
                  </button>
                )}
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {filteredPublications.length} of {publications.length} publications
                </span>
              </div>
              <div style={{ maxHeight: "420px", overflowY: "auto" }}>
                {filteredPublications.length === 0 && <p className="pub-empty">No publications match your filter.</p>}
                {filteredPublications.map((pub) => (
                  <div
                    key={pub.id}
                    className={`cite-pub-item ${selectedPub?.id === pub.id ? "cite-pub-item--selected" : ""}`}
                    onClick={() => setSelectedPub(pub)}
                  >
                    <h4>{pub.title}</h4>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {pub.type} | {pub.status}
                    </span>
                  </div>
                ))}
              </div>
            </aside>

            {/* Citations Detail Explorer */}
            <section className="cite-detail-panel">
              {selectedPub ? (
                <>
                  <div style={{ marginBottom: "20px" }}>
                    <p className="dashboard-badge" style={{ background: "var(--accent-secondary-bg)" }}>Selected Paper</p>
                    <h2 style={{ marginTop: "10px", color: "var(--text-h)" }}>{selectedPub.title}</h2>
                    <p className="cite-meta">
                      Type: <strong>{selectedPub.type}</strong> | DOI: <strong>{selectedPub.doi || "None"}</strong>
                    </p>
                  </div>

                  {/* Add Citation Form */}
                  <form onSubmit={handleAddCitation} className="cite-form" style={{ background: "var(--surface-soft)" }}>
                    <div className="cite-form-header">
                      <p className="pub-section-label" style={{ fontSize: "0.78rem" }}>Add Connection</p>
                      <h3 style={{ margin: "4px 0" }}>Declare Citation / Reference Link</h3>
                    </div>
                    <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "1fr auto" }}>
                      <select
                        name="cited_publication_id"
                        value={form.cited_publication_id}
                        onChange={handleFormChange}
                        required
                        className="cite-input"
                        style={{ marginBottom: "0" }}
                      >
                        <option value="">Select the paper cited by this publication...</option>
                        {publications
                          .filter((p) => p.id !== selectedPub.id)
                          .map((p) => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                          ))}
                      </select>
                      <button type="submit" disabled={submitting} className="cite-button">
                        {submitting ? "Adding..." : "Add Citation"}
                      </button>
                    </div>
                    {error && <p className="pub-error" style={{ marginTop: "10px", marginBottom: "0" }}>{error}</p>}
                  </form>

                  {/* Citation Grid lists */}
                  <div className="cite-lists-grid">
                    <div className="cite-list-col">
                      <h4>References Made ({citationsMade.length})</h4>
                      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "10px" }}>
                        Papers that this publication cites.
                      </p>
                      {citationsMade.length === 0 ? (
                        <p className="pub-empty" style={{ fontSize: "0.8rem" }}>Cites no other papers.</p>
                      ) : (
                        citationsMade.map((c) => (
                          <div key={c.id} className="cite-link-row">
                            <span>{getPublicationTitle(c.cited_publication_id)}</span>
                            <button
                              onClick={() => handleRemove(c.citing_publication_id, c.cited_publication_id)}
                              className="cite-delete-btn"
                            >
                              &times;
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="cite-list-col">
                      <h4>Citations Received ({citationsReceived.length})</h4>
                      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "10px" }}>
                        Papers that cite this publication.
                      </p>
                      {citationsReceived.length === 0 ? (
                        <p className="pub-empty" style={{ fontSize: "0.8rem" }}>Has not been cited yet.</p>
                      ) : (
                        citationsReceived.map((c) => (
                          <div key={c.id} className="cite-link-row">
                            <span>{getPublicationTitle(c.citing_publication_id)}</span>
                            <button
                              onClick={() => handleRemove(c.citing_publication_id, c.cited_publication_id)}
                              className="cite-delete-btn"
                            >
                              &times;
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className="pub-empty">Please add a publication first.</p>
              )}
            </section>
          </div>
        )}
      </main>
    </AppShell>
  );
}
