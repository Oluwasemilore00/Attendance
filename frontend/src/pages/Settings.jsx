import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

function Section({ title, children }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export default function Settings() {
  const { user, setUser } = useAuth();
  const [msg, setMsg] = useState(null);
  const [profile, setProfile] = useState({ full_name: "", email: "" });
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [threshold, setThreshold] = useState("");

  const isAdmin = user && ["super_admin", "admin"].includes(user.role);

  useEffect(() => {
    if (user) {
      setProfile({ full_name: user.full_name, email: user.email });
      setUsername(user.username);
    }
    api.get("/api/users/settings").then((r) => setThreshold(r.data.attendance_threshold));
  }, [user]);

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const r = await api.patch("/api/users/me/profile", profile);
      setUser(r.data.user); flash("success", "Profile updated.");
    } catch (err) { flash("error", err.response?.data?.error || "Failed."); }
  };
  const saveUsername = async (e) => {
    e.preventDefault();
    try {
      const r = await api.patch("/api/users/me/username", { username });
      setUser(r.data.user); flash("success", "Username updated.");
    } catch (err) { flash("error", err.response?.data?.error || "Failed."); }
  };
  const savePassword = async (e) => {
    e.preventDefault();
    try {
      await api.patch("/api/users/me/password", pw);
      setPw({ current_password: "", new_password: "", confirm_password: "" });
      flash("success", "Password changed.");
    } catch (err) { flash("error", err.response?.data?.details?.join(" ") || err.response?.data?.error || "Failed."); }
  };
  const saveThreshold = async (e) => {
    e.preventDefault();
    try {
      const r = await api.patch("/api/users/settings", { attendance_threshold: Number(threshold) });
      setThreshold(r.data.attendance_threshold); flash("success", "Threshold updated.");
    } catch (err) { flash("error", err.response?.data?.error || "Failed."); }
  };

  return (
    <div>
      <div className="page-head"><h1>Settings</h1></div>
      {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}

      <div className="grid cols-2">
        <Section title="Profile">
          <form onSubmit={saveProfile}>
            <label>Full Name</label>
            <input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
            <label>Email</label>
            <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            <button className="btn" style={{ marginTop: 14 }}>Save profile</button>
          </form>
        </Section>

        <Section title="Username">
          <form onSubmit={saveUsername}>
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
            <button className="btn" style={{ marginTop: 14 }}>Update username</button>
          </form>
        </Section>

        <Section title="Change password">
          <form onSubmit={savePassword}>
            <label>Current password</label>
            <input type="password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} />
            <label>New password</label>
            <input type="password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} />
            <label>Confirm new password</label>
            <input type="password" value={pw.confirm_password} onChange={(e) => setPw({ ...pw, confirm_password: e.target.value })} />
            <button className="btn" style={{ marginTop: 14 }}>Change password</button>
          </form>
        </Section>

        {isAdmin && (
          <Section title="Exam eligibility threshold">
            <form onSubmit={saveThreshold}>
              <label>Minimum attendance % required</label>
              <input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
              <button className="btn" style={{ marginTop: 14 }}>Save threshold</button>
            </form>
          </Section>
        )}
      </div>
    </div>
  );
}
