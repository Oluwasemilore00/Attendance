import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
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
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h2>Welcome back</h2>
        <p className="muted">Log in to manage your attendance sessions.</p>
        {error && <div className="alert error">{error}</div>}

        <label>Username or Email</label>
        <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />

        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 400 }}>
          <input type="checkbox" style={{ width: "auto" }} checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember me
        </label>

        <button className="btn" style={{ width: "100%", marginTop: 16 }} disabled={busy}>
          {busy ? "Signing in…" : "Log in"}
        </button>
        <p className="muted" style={{ marginTop: 16, textAlign: "center" }}>
          No account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}
