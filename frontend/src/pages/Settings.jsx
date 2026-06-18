import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Save, Home, Camera, Zap, ExternalLink } from "lucide-react";

function Section({ title, subtitle, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{title}</div>
          {subtitle && <div className="card-subtitle">{subtitle}</div>}
        </div>
      </div>
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
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const initials = user?.full_name?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  const isAdmin = user && ["super_admin", "admin"].includes(user.role);

  useEffect(() => {
    if (user) {
      setProfile({ full_name: user.full_name, email: user.email });
      setUsername(user.username);
    }
    api.get("/api/users/settings").then((r) => setThreshold(r.data.attendance_threshold));
  }, [user]);

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };

  const onAvatarFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 120;
        const ratio = Math.min(MAX / img.width, MAX / img.height);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        setAvatarPreview(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const saveAvatar = async () => {
    setAvatarBusy(true);
    try {
      const res = await api.patch("/api/users/me/avatar", { profile_picture: avatarPreview });
      setUser(res.data.user);
      setAvatarPreview(null);
      flash("success", "Profile picture updated.");
    } catch (err) {
      flash("error", err.response?.data?.error || "Failed to save picture.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarBusy(true);
    try {
      const res = await api.patch("/api/users/me/avatar", { profile_picture: null });
      setUser(res.data.user);
      setAvatarPreview(null);
      flash("success", "Profile picture removed.");
    } catch {
      flash("error", "Failed to remove picture.");
    } finally {
      setAvatarBusy(false);
    }
  };

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
  const openPortal = async () => {
    setPortalBusy(true);
    try {
      const res = await api.post("/api/payments/portal");
      window.location.href = res.data.url;
    } catch (err) {
      flash("error", err.response?.data?.error || "Could not open billing portal.");
    } finally {
      setPortalBusy(false);
    }
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
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <div className="breadcrumb"><Home size={13} /> Dashboard / Settings</div>
        </div>
      </div>
      {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}

      {/* Profile picture card */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Profile picture</div>
            <div className="card-subtitle">Shows next to your name in the sidebar</div>
          </div>
        </div>
        <div className="avatar-upload">
          <div className="avatar-upload-preview">
            {(avatarPreview || user?.profile_picture) ? (
              <img
                src={avatarPreview || user.profile_picture}
                alt="Preview"
                className="avatar-preview-img"
              />
            ) : (
              <div className="avatar-preview-initial">{initials}</div>
            )}
            <label className="avatar-upload-btn" title="Choose photo">
              <Camera size={14} />
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onAvatarFile} style={{ display: "none" }} />
            </label>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
              Upload a JPEG or PNG. It will be resized to 120×120 px.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {avatarPreview && (
                <button className="btn" disabled={avatarBusy} onClick={saveAvatar}>
                  <Save size={14} /> {avatarBusy ? "Saving…" : "Save picture"}
                </button>
              )}
              {user?.profile_picture && !avatarPreview && (
                <button className="btn danger" disabled={avatarBusy} onClick={removeAvatar}>
                  {avatarBusy ? "Removing…" : "Remove picture"}
                </button>
              )}
              {avatarPreview && (
                <button className="btn ghost" onClick={() => setAvatarPreview(null)}>Cancel</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription card */}
      <div className={`card plan-card ${user?.plan === "pro" ? "plan-pro" : "plan-free"}`}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="plan-icon"><Zap size={20} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {user?.plan === "pro" ? "Pro plan" : "Free plan"}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
              {user?.plan === "pro"
                ? "Unlimited courses and sessions — thanks for subscribing!"
                : "You're on the free tier: 1 course, 1 session."}
            </div>
          </div>
          {user?.plan === "pro" ? (
            <button className="btn ghost" disabled={portalBusy} onClick={openPortal}>
              <ExternalLink size={14} /> {portalBusy ? "Opening…" : "Manage subscription"}
            </button>
          ) : (
            <button className="btn" onClick={() => window.dispatchEvent(new CustomEvent("upgrade-required"))}>
              <Zap size={14} /> Upgrade to Pro
            </button>
          )}
        </div>
      </div>

      <div className="grid cols-2">
        <Section title="Profile" subtitle="Update your name and email address">
          <form onSubmit={saveProfile}>
            <div className="form-group">
              <label>Full Name</label>
              <input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            </div>
            <button className="btn" style={{ marginTop: 4 }}><Save size={15} /> Save profile</button>
          </form>
        </Section>

        <Section title="Username" subtitle="Change how you sign in">
          <form onSubmit={saveUsername}>
            <div className="form-group">
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <button className="btn" style={{ marginTop: 4 }}><Save size={15} /> Update username</button>
          </form>
        </Section>

        <Section title="Change password" subtitle="Use a strong password of 8+ characters">
          <form onSubmit={savePassword}>
            <div className="form-group">
              <label>Current password</label>
              <input type="password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} placeholder="••••••••" />
            </div>
            <div className="form-group">
              <label>New password</label>
              <input type="password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} placeholder="••••••••" />
            </div>
            <div className="form-group">
              <label>Confirm new password</label>
              <input type="password" value={pw.confirm_password} onChange={(e) => setPw({ ...pw, confirm_password: e.target.value })} placeholder="••••••••" />
            </div>
            <button className="btn" style={{ marginTop: 4 }}><Save size={15} /> Change password</button>
          </form>
        </Section>

        {isAdmin && (
          <Section title="Exam eligibility threshold" subtitle="Minimum attendance % for exam eligibility">
            <div className="alert info" style={{ marginBottom: 16 }}>
              Students below this threshold will be marked as ineligible for exams in the Analytics page.
            </div>
            <form onSubmit={saveThreshold}>
              <div className="form-group">
                <label>Minimum attendance %</label>
                <input type="number" min="0" max="100" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
              </div>
              <button className="btn" style={{ marginTop: 4 }}><Save size={15} /> Save threshold</button>
            </form>
          </Section>
        )}
      </div>
    </div>
  );
}
