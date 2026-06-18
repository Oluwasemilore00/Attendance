import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { QrCode, Users, CheckCircle } from "lucide-react";
import Logo from "../components/Logo";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "", username: "", email: "",
    password: "", confirm_password: "", role: "course_rep",
    admin_identifier: "",
  });
  const [error, setError] = useState("");
  const [details, setDetails] = useState([]);
  const [busy, setBusy] = useState(false);

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setDetails([]); setBusy(true);
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed.");
      setDetails(err.response?.data?.details || []);
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
        <h2 className="auth-panel-title">Join Quick Attendance</h2>
        <p className="auth-panel-text">
          Set up your account in seconds and start running GPS-verified attendance sessions today.
        </p>
        <div className="auth-panel-features">
          <div className="auth-panel-feature">
            <div className="auth-panel-feature-icon"><QrCode size={16} /></div>
            QR code &amp; link sharing
          </div>
          <div className="auth-panel-feature">
            <div className="auth-panel-feature-icon"><Users size={16} /></div>
            Multi-role team support
          </div>
          <div className="auth-panel-feature">
            <div className="auth-panel-feature-icon"><CheckCircle size={16} /></div>
            Exam eligibility reports
          </div>
        </div>
      </div>

      <div className="auth-form-area">
        <div className="auth-form-box">
          <h2>Create your account</h2>
          <p className="subtitle">Fill in the details below to get started.</p>

          <form onSubmit={submit}>
            {error && <div className="alert error">{error}</div>}
            {details.length > 0 && (
              <div className="alert error">
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {details.map((d) => <li key={d}>{d}</li>)}
                </ul>
              </div>
            )}

            <div className="form-group">
              <label>Full Name</label>
              <input value={form.full_name} onChange={upd("full_name")} placeholder="Ada Lovelace" required />
            </div>

            <div className="field-row">
              <div className="form-group">
                <label>Username</label>
                <input value={form.username} onChange={upd("username")} placeholder="ada_l" required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={upd("email")} placeholder="ada@uni.edu" required />
              </div>
            </div>

            <div className="field-row">
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={form.password} onChange={upd("password")} placeholder="••••••••" required />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input type="password" value={form.confirm_password} onChange={upd("confirm_password")} placeholder="••••••••" required />
              </div>
            </div>

            <div className="form-group">
              <label>Role</label>
              <select value={form.role} onChange={upd("role")}>
                <option value="course_rep">Course Representative</option>
                <option value="admin">Administrator</option>
              </select>
              <small className="muted" style={{ fontSize: 12, marginTop: 4, display: "block" }}>
                Super administrator accounts are provisioned by the system.
              </small>
            </div>

            {form.role === "course_rep" && (
              <div className="form-group">
                <label>Administrator's username or email</label>
                <input
                  value={form.admin_identifier}
                  onChange={upd("admin_identifier")}
                  placeholder="The admin you report to"
                  required
                />
                <small className="muted" style={{ fontSize: 12, marginTop: 4, display: "block" }}>
                  Course reps register under an existing administrator.
                </small>
              </div>
            )}

            <button className="btn" style={{ width: "100%", marginTop: 4 }} disabled={busy}>
              {busy ? "Creating account…" : "Create account"}
            </button>

            <p className="muted" style={{ marginTop: 18, textAlign: "center", fontSize: 14 }}>
              Already registered? <Link to="/login">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
