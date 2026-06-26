import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MapPin, ShieldCheck, BarChart2 } from "lucide-react";
import Logo from "../components/Logo";
import PasswordInput from "../components/PasswordInput";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(identifier, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-panel-brand">
          <Logo size={36} />
          Quick Attendance
        </div>
        <h2 className="auth-panel-title">Welcome back!</h2>
        <p className="auth-panel-text">
          Track attendance with GPS verification and real-time analytics — all in one place.
        </p>
        <div className="auth-panel-features">
          <div className="auth-panel-feature">
            <div className="auth-panel-feature-icon"><MapPin size={16} /></div>
            Location-verified sign-ins
          </div>
          <div className="auth-panel-feature">
            <div className="auth-panel-feature-icon"><ShieldCheck size={16} /></div>
            Anti-proxy fraud detection
          </div>
          <div className="auth-panel-feature">
            <div className="auth-panel-feature-icon"><BarChart2 size={16} /></div>
            Real-time attendance analytics
          </div>
        </div>
      </div>

      <div className="auth-form-area">
        <div className="auth-form-box">
          <h2>Sign in</h2>
          <p className="subtitle">Enter your credentials to access your dashboard.</p>

          <form onSubmit={submit}>
            {error && <div className="alert error">{error}</div>}

            <div className="form-group">
              <label>Username or Email</label>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <button className="btn" style={{ width: "100%", marginTop: 20 }} disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>

            <p className="muted" style={{ marginTop: 18, textAlign: "center", fontSize: 14 }}>
              No account? <Link to="/register">Create one</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
