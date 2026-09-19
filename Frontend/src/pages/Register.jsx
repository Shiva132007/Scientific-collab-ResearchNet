import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser, resendVerification, verifyEmail } from "../api/auth";
import "../styles/auth.css";

const ROLES = [
  { value: "Researcher", label: "Researcher", desc: "Submit publications and track projects" },
  { value: "InstitutionAdmin", label: "Institution Admin", desc: "Manage institutional data and departments" },
  { value: "Reviewer", label: "Reviewer", desc: "Review and evaluate submitted work" },
  { value: "SystemAdmin", label: "System Admin", desc: "Full platform access and audit controls" },
];

export default function Register() {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "Researcher" });
  const [otp, setOtp] = useState("");
  const [verificationPending, setVerificationPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (!verificationPending) {
        await registerUser(form);
        setVerificationPending(true);
        setMessage("Account created. Enter the OTP sent to your email.");
        return;
      }

      await verifyEmail(form.email, otp);
      navigate("/login");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((item) => item.msg).join(" "));
      } else if (!err.response) {
        setError("Registration failed because the backend is not reachable. Start or restart the backend server.");
      } else {
        setError("Registration failed. Please check your details.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await resendVerification(form.email);
      setMessage(response.data.message || "Verification OTP resent.");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Could not resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page register-page">
      <div className="auth-layout">
        {/* Brand Panel */}
        <aside className="auth-panel auth-panel--brand">
          <div className="auth-network-visual">
            <div className="auth-node">👩‍🔬</div>
            <div className="auth-node">🏛</div>
            <div className="auth-node">🔗</div>
          </div>
          <p className="dashboard-badge">Join the network</p>
          <h1 className="auth-panel-title">Build your research profile in minutes.</h1>
          <p className="auth-panel-copy">
            Create your account to start collaborating across institutions, publishing research, and tracking cross-disciplinary projects.
          </p>
          <div className="auth-highlights">
            <div className="auth-highlight">
              <span className="auth-highlight-label">⚡ Fast Setup</span>
              <span className="auth-highlight-value">Create your profile in under 2 minutes</span>
            </div>
            <div className="auth-highlight">
              <span className="auth-highlight-label">🔐 Role-Based Access</span>
              <span className="auth-highlight-value">Permissions tailored to your responsibility</span>
            </div>
          </div>
        </aside>

        {/* Register Form */}
        <section className="auth-shell">
          <div className="auth-copy-block">
            <p className="auth-kicker">Get started</p>
            <h2 className="auth-title">Create your account</h2>
            <p className="auth-subtitle">Set up access and start collaborating across institutions.</p>
          </div>
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-field">
              <span>Full Name</span>
              <input
                id="register-fullname"
                type="text"
                name="full_name"
                placeholder="Dr. Alex Morgan"
                value={form.full_name}
                onChange={handleChange}
                required
                autoComplete="name"
                className="auth-input"
              />
            </label>
            <label className="auth-field">
              <span>Email address</span>
              <input
                id="register-email"
                type="email"
                name="email"
                placeholder="researcher@institution.edu"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className="auth-input"
              />
            </label>
            <label className="auth-field">
              <span>Password</span>
              <input
                id="register-password"
                type="password"
                name="password"
                placeholder="Create a secure password (min 6 chars)"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                autoComplete="new-password"
                className="auth-input"
              />
            </label>
            <label className="auth-field">
              <span>Account role</span>
              <select
                id="register-role"
                name="role"
                value={form.role}
                onChange={handleChange}
                className="auth-input"
              >
                {ROLES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            {form.role && (
              <div className="auth-role-desc">
                {ROLES.find(r => r.value === form.role)?.desc}
              </div>
            )}
            {verificationPending && (
              <label className="auth-field">
                <span>Email OTP</span>
                <input
                  id="register-otp"
                  type="text"
                  name="otp"
                  placeholder="Enter the 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  className="auth-input"
                />
              </label>
            )}
            {message && <p className="auth-success" role="status">{message}</p>}
            {error && <p className="auth-error" role="alert">{error}</p>}
            <div className="auth-actions">
              <button id="register-submit" type="submit" disabled={loading} className="auth-button">
                {loading ? "Please wait..." : verificationPending ? "Verify email" : "Create account"}
              </button>
              {verificationPending && (
                <button type="button" disabled={loading} className="auth-button auth-button-secondary" onClick={handleResend}>
                  Resend OTP
                </button>
              )}
              <p className="auth-footer">
                Already have an account? <Link to="/login">Sign in</Link>
              </p>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
