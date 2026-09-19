import { useState, useEffect } from "react";
import AppShell from "../components/AppShell";
import { getMyProfile, updateMyProfile, getInstitutions, getDepartments, lookupOrcid } from "../api/researchers";
import { changePassword } from "../api/auth";
import "./Profile.css";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Profile Edit Form
  const [editForm, setEditForm] = useState({
    full_name: "",
    bio: "",
    research_interests: "",
    skills: "",
    orcid_id: "",
    institution_id: "",
    department_id: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [syncingOrcid, setSyncingOrcid] = useState(false);

  const handleOrcidSync = async () => {
    if (!editForm.orcid_id.trim()) {
      alert("Please enter a valid ORCID iD first (e.g. 0000-0002-1825-0097).");
      return;
    }
    setSyncingOrcid(true);
    setError("");
    try {
      const res = await lookupOrcid(editForm.orcid_id.trim());
      const data = res.data;
      setEditForm((prev) => ({
        ...prev,
        full_name: data.full_name || prev.full_name,
        bio: data.bio || prev.bio,
        research_interests: data.research_interests || prev.research_interests,
        skills: data.skills || prev.skills,
      }));
      setSuccess("Profile details populated from ORCID public database!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not fetch profile details from ORCID.");
    } finally {
      setSyncingOrcid(false);
    }
  };

  // Password Form
  const [pwForm, setPwForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profRes, instRes, deptRes] = await Promise.all([
        getMyProfile(),
        getInstitutions(),
        getDepartments(),
      ]);
      setProfile(profRes.data);
      setInstitutions(instRes.data);
      setDepartments(deptRes.data);

      setEditForm({
        full_name: profRes.data.full_name || "",
        bio: profRes.data.bio || "",
        research_interests: profRes.data.research_interests || "",
        skills: profRes.data.skills || "",
        orcid_id: profRes.data.orcid_id || "",
        institution_id: profRes.data.institution_id || "",
        department_id: profRes.data.department_id || "",
      });
      setError("");
    } catch {
      setError("Failed to load researcher profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...editForm,
        institution_id: editForm.institution_id ? parseInt(editForm.institution_id) : null,
        department_id: editForm.department_id ? parseInt(editForm.department_id) : null,
      };
      const res = await updateMyProfile(payload);
      setProfile(res.data);
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError("New passwords do not match.");
      return;
    }

    if (pwForm.new_password.length < 6) {
      setPwError("New password must be at least 6 characters long.");
      return;
    }

    setChangingPw(true);
    try {
      await changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwSuccess("Password changed successfully!");
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
      setTimeout(() => setPwSuccess(""), 3000);
    } catch (err) {
      setPwError(err.response?.data?.detail || "Failed to change password.");
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <AppShell>
      <div className="profile-page">
        <header className="profile-header">
          <div>
            <span className="dashboard-badge">Personal Workspace</span>
            <h1 className="profile-title">Researcher Profile</h1>
            <p className="profile-subtitle">
              Manage your academic profile details, research interests, credentials, and account security.
            </p>
          </div>
        </header>

        {loading ? (
          <p className="pub-loading">Loading profile details...</p>
        ) : (
          <>
            {/* Top Identity Card */}
            <div className="profile-card-top">
              <div className="profile-avatar">
                {profile?.full_name?.[0]?.toUpperCase() || "R"}
              </div>
              <div className="profile-identity">
                <h2>{profile?.full_name}</h2>
                <p className="profile-email">
                  ✉️ {profile?.email} • <span className="profile-role-badge">{profile?.role}</span>
                </p>
                <div className="profile-tags-inline">
                  {profile?.institution_name && (
                    <span className="profile-badge-tag">🏛 {profile.institution_name}</span>
                  )}
                  {profile?.department_name && (
                    <span className="profile-badge-tag">🔬 {profile.department_name}</span>
                  )}
                  {profile?.orcid_id && (
                    <span className="profile-badge-tag profile-badge-tag--orcid">
                      🆔 ORCID: {profile.orcid_id}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats Bar */}
              <div className="profile-stats-grid">
                <div className="profile-stat-box">
                  <span className="profile-stat-num">{profile?.publication_count || 0}</span>
                  <span className="profile-stat-label">Publications</span>
                </div>
                <div className="profile-stat-box">
                  <span className="profile-stat-num">{profile?.project_count || 0}</span>
                  <span className="profile-stat-label">Projects</span>
                </div>
                <div className="profile-stat-box">
                  <span className="profile-stat-num">{profile?.collaboration_count || 0}</span>
                  <span className="profile-stat-label">Collaborations</span>
                </div>
              </div>
            </div>

            {/* Profile Tabs */}
            <nav className="profile-tabs">
              <button
                className={`profile-tab ${activeTab === "overview" ? "profile-tab--active" : ""}`}
                onClick={() => setActiveTab("overview")}
              >
                👤 Overview & Bio
              </button>
              <button
                className={`profile-tab ${activeTab === "edit" ? "profile-tab--active" : ""}`}
                onClick={() => setActiveTab("edit")}
              >
                ✏️ Edit Profile
              </button>
              <button
                className={`profile-tab ${activeTab === "security" ? "profile-tab--active" : ""}`}
                onClick={() => setActiveTab("security")}
              >
                🔒 Account Security
              </button>
            </nav>

            {/* Tab 1: Overview */}
            {activeTab === "overview" && (
              <div className="profile-tab-content">
                <div className="profile-section">
                  <h3>Biography</h3>
                  <p className="profile-bio-text">
                    {profile?.bio || "No biography provided yet. Click 'Edit Profile' to add your bio."}
                  </p>
                </div>

                <div className="profile-two-col">
                  <div className="profile-section">
                    <h3>Research Interests</h3>
                    <div className="profile-skill-tags">
                      {profile?.research_interests ? (
                        profile.research_interests.split(",").map((tag, idx) => (
                          <span key={idx} className="profile-tag">
                            {tag.trim()}
                          </span>
                        ))
                      ) : (
                        <p className="pub-empty">No research interests listed.</p>
                      )}
                    </div>
                  </div>

                  <div className="profile-section">
                    <h3>Skills & Expertise</h3>
                    <div className="profile-skill-tags">
                      {profile?.skills ? (
                        profile.skills.split(",").map((skill, idx) => (
                          <span key={idx} className="profile-tag profile-tag--skill">
                            {skill.trim()}
                          </span>
                        ))
                      ) : (
                        <p className="pub-empty">No skills listed.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Edit Profile */}
            {activeTab === "edit" && (
              <div className="profile-tab-content">
                <form onSubmit={handleUpdateProfile} className="profile-form">
                  {error && <p className="pub-error">{error}</p>}
                  {success && <p className="collab-modal-success">{success}</p>}

                  <div className="profile-form-row">
                    <label>
                      <span>Full Name:</span>
                      <input
                        type="text"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        required
                        className="proj-input"
                      />
                    </label>
                    <label>
                      <span>ORCID iD:</span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input
                          type="text"
                          placeholder="e.g. 0000-0002-1825-0097"
                          value={editForm.orcid_id}
                          onChange={(e) => setEditForm({ ...editForm, orcid_id: e.target.value })}
                          className="proj-input"
                          style={{ flex: 1, marginBottom: 0 }}
                        />
                        <button
                          type="button"
                          onClick={handleOrcidSync}
                          disabled={syncingOrcid}
                          className="pub-button"
                          style={{ width: "auto", whiteSpace: "nowrap", background: "var(--accent-secondary, #10b981)", minWidth: "100px" }}
                        >
                          {syncingOrcid ? "Syncing..." : "🆔 Sync"}
                        </button>
                      </div>
                    </label>
                  </div>

                  <div className="profile-form-row">
                    <label>
                      <span>Institution:</span>
                      <select
                        value={editForm.institution_id}
                        onChange={(e) => setEditForm({ ...editForm, institution_id: e.target.value })}
                        className="proj-input"
                      >
                        <option value="">Select Institution...</option>
                        {institutions.map((inst) => (
                          <option key={inst.id} value={inst.id}>{inst.name}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>Department:</span>
                      <select
                        value={editForm.department_id}
                        onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}
                        className="proj-input"
                      >
                        <option value="">Select Department...</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label>
                    <span>Biography:</span>
                    <textarea
                      rows={4}
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder="Share a brief overview of your academic background and ongoing research..."
                      className="collab-textarea"
                    />
                  </label>

                  <div className="profile-form-row">
                    <label>
                      <span>Research Interests (comma separated):</span>
                      <input
                        type="text"
                        placeholder="Artificial Intelligence, Quantum Computing, Bioinformatics"
                        value={editForm.research_interests}
                        onChange={(e) => setEditForm({ ...editForm, research_interests: e.target.value })}
                        className="proj-input"
                      />
                    </label>
                    <label>
                      <span>Skills & Methodology (comma separated):</span>
                      <input
                        type="text"
                        placeholder="Python, PyTorch, Data Analysis, LaTeX"
                        value={editForm.skills}
                        onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                        className="proj-input"
                      />
                    </label>
                  </div>

                  <button type="submit" disabled={savingProfile} className="collab-button" style={{ alignSelf: "flex-start" }}>
                    {savingProfile ? "Saving Profile..." : "Save Profile Changes"}
                  </button>
                </form>
              </div>
            )}

            {/* Tab 3: Security */}
            {activeTab === "security" && (
              <div className="profile-tab-content">
                <form onSubmit={handleChangePassword} className="profile-form" style={{ maxWidth: "480px" }}>
                  <h3>Change Password</h3>
                  {pwError && <p className="pub-error">{pwError}</p>}
                  {pwSuccess && <p className="collab-modal-success">{pwSuccess}</p>}

                  <label>
                    <span>Current Password:</span>
                    <input
                      type="password"
                      required
                      value={pwForm.current_password}
                      onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                      className="proj-input"
                    />
                  </label>

                  <label>
                    <span>New Password:</span>
                    <input
                      type="password"
                      required
                      value={pwForm.new_password}
                      onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                      className="proj-input"
                    />
                  </label>

                  <label>
                    <span>Confirm New Password:</span>
                    <input
                      type="password"
                      required
                      value={pwForm.confirm_password}
                      onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                      className="proj-input"
                    />
                  </label>

                  <button type="submit" disabled={changingPw} className="collab-button">
                    {changingPw ? "Updating Password..." : "Update Password"}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
