import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ShieldCheck } from "lucide-react";

/**
 * Modal for a course rep to select or change their admin.
 * When `blocking` is true there is no close button — they must pick one.
 */
export default function ChangeAdminModal({ blocking = false, onClose }) {
  const { setUser } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/api/users/admins").then((r) => setAdmins(r.data.admins));
  }, []);

  const confirm = async () => {
    if (!selected) return;
    setBusy(true);
    setErr("");
    try {
      const res = await api.patch("/api/users/me/admin", { admin_id: selected });
      setUser(res.data.user);
      onClose?.();
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to update admin.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog" style={{ maxWidth: 440 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 6, fontSize: 20 }}>
            {blocking ? "Select your admin" : "Change admin"}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
            {blocking
              ? "Your previous admin's account was deleted. Please choose a new admin to continue using the app."
              : "Choose the admin you want to be registered under."}
          </p>
        </div>

        {err && <div className="alert error" style={{ marginBottom: 12 }}>{err}</div>}

        {admins.length === 0 ? (
          <p className="muted" style={{ fontSize: 14 }}>No admins available. Please contact the system administrator.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {admins.map((a) => (
              <label key={a.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                border: `2px solid ${selected === a.id ? "var(--primary, #4F46E5)" : "var(--border)"}`,
                borderRadius: 8, cursor: "pointer",
                background: selected === a.id ? "var(--primary-light, #EEF2FF)" : "var(--bg-card, #fff)",
                transition: "border-color 0.15s, background 0.15s",
              }}>
                <input
                  type="radio"
                  name="admin"
                  value={a.id}
                  checked={selected === a.id}
                  onChange={() => setSelected(a.id)}
                  style={{ display: "none" }}
                />
                <span style={{
                  width: 36, height: 36, borderRadius: "50%", background: "#4F46E5",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 14, flexShrink: 0,
                }}>
                  {a.full_name?.[0]?.toUpperCase()}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.full_name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>@{a.username}</div>
                </div>
                {selected === a.id && (
                  <ShieldCheck size={18} color="#4F46E5" style={{ marginLeft: "auto" }} />
                )}
              </label>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          {!blocking && (
            <button className="btn ghost" onClick={onClose}>Cancel</button>
          )}
          <button
            className="btn"
            disabled={!selected || busy}
            onClick={confirm}
          >
            {busy ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
