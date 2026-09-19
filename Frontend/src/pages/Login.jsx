import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser, loginUser, verifyLoginOtp } from "../api/auth";
import { useAuth } from "../hooks/useAuth";
import "../styles/auth.css";

export default function Login() {
    const [form, setForm] = useState({ email: "", password: "" });
    const [otp, setOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const { setUser } = useAuth();
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
            if (!otpSent) {
                const response = await loginUser(form.email, form.password);
                setOtpSent(true);
                setMessage(response.data.message || "OTP sent to your email.");
                return;
            }

            const response = await verifyLoginOtp(form.email, otp);
            localStorage.setItem("token", response.data.access_token);
            const profile = await getCurrentUser();
            setUser(profile.data);
            navigate("/dashboard");
        } catch (err) {
            const detail = err.response?.data?.detail;
            setError(typeof detail === "string" ? detail : "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page login-page">
            <div className="auth-layout">
                {/* Brand Panel */}
                <aside className="auth-panel auth-panel--brand">
                    <div className="auth-network-visual">
                        <div className="auth-node">🔬</div>
                        <div className="auth-node">🏛</div>
                        <div className="auth-node">📄</div>
                        <div className="auth-node">🤝</div>
                    </div>
                    <p className="dashboard-badge">Scientific Collaboration Network</p>
                    <h1 className="auth-panel-title">Manage research at institutional scale.</h1>
                    <p className="auth-panel-copy">
                        Sign in to access your workspace, coordinate cross-institutional research, track publications, and analyze collaboration networks.
                    </p>
                    <div className="auth-highlights">
                        <div className="auth-highlight">
                            <span className="auth-highlight-label">🔒 Secure Access</span>
                            <span className="auth-highlight-value">Role-based dashboard with audit trails</span>
                        </div>
                        <div className="auth-highlight">
                            <span className="auth-highlight-label">🌐 Connected Teams</span>
                            <span className="auth-highlight-value">Cross-institutional collaboration tracking</span>
                        </div>
                        <div className="auth-highlight">
                            <span className="auth-highlight-label">📊 Live Analytics</span>
                            <span className="auth-highlight-value">Real-time reports and publication metrics</span>
                        </div>
                    </div>
                </aside>

                {/* Login Form */}
                <section className="auth-shell">
                    <div className="auth-copy-block">
                        <p className="auth-kicker">Welcome back</p>
                        <h2 className="auth-title">Sign in to ResearchNet</h2>
                        <p className="auth-subtitle">Access your workspace and manage your research collaboration network.</p>
                    </div>
                    <form onSubmit={handleSubmit} className="auth-form">
                        <label className="auth-field">
                            <span>Email address</span>
                            <input
                                id="login-email"
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
                                id="login-password"
                                type="password"
                                name="password"
                                placeholder="Enter your password"
                                value={form.password}
                                onChange={handleChange}
                                required
                                autoComplete="current-password"
                                className="auth-input"
                            />
                        </label>
                        {otpSent && (
                            <label className="auth-field">
                                <span>Login OTP</span>
                                <input
                                    id="login-otp"
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
                            <button id="login-submit" type="submit" disabled={loading} className="auth-button">
                                {loading ? "Authenticating..." : otpSent ? "Verify OTP" : "Send login OTP"}
                            </button>
                            <p className="auth-footer">
                                Don't have an account? <Link to="/register">Create one &rarr;</Link>
                            </p>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
}
