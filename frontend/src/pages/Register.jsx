import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h2>Create your account</h2>
        {error && <div className="alert error">{error}</div>}
        {details.length > 0 && (
          <div className="alert error">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {details.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </div>
        )}

        <label>Full Name</label>
        <input value={form.full_name} onChange={upd("full_name")} required />

        <div className="field-row">
          <div>
            <label>Username</label>
            <input value={form.username} onChange={upd("username")} required />
          </div>
          <div>
            <label>Email</label>
            <input type="email" value={form.email} onChange={upd("email")} required />
          </div>
        </div>

        <div className="field-row">
          <div>
            <label>Password</label>
            <input type="password" value={form.password} onChange={upd("password")} required />
          </div>
          <div>
            <label>Confirm Password</label>
            <input type="password" value={form.confirm_password} onChange={upd("confirm_password")} required />
          </div>
        </div>

        <label>Role</label>
        <select value={form.role} onChange={upd("role")}>
          <option value="course_rep">Course Representative</option>
          <option value="admin">Administrator</option>
        </select>
        <small className="muted">Super administrator accounts are provisioned by the system.</small>

        {form.role === "course_rep" && (
          <>
            <label>Administrator's username or email</label>
            <input
              value={form.admin_identifier}
              onChange={upd("admin_identifier")}
              placeholder="The admin you report to"
              required
            />
            <small className="muted">
              Course reps register under an existing administrator.
            </small>
          </>
        )}

        <button className="btn" style={{ width: "100%", marginTop: 18 }} disabled={busy}>
          {busy ? "Creating…" : "Register"}
        </button>
        <p className="muted" style={{ marginTop: 16, textAlign: "center" }}>
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
