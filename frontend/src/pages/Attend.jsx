import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";
import { CheckCircle, XCircle, Loader, AlertCircle, MapPin } from "lucide-react";
import Logo from "../components/Logo";

function getDeviceId() {
  let id = localStorage.getItem("qa_device_id");
  if (!id) {
    const seed = [
      navigator.userAgent, navigator.language,
      screen.width, screen.height, screen.colorDepth,
      new Date().getTimezoneOffset(),
    ].join("|");
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    id = `${Math.abs(hash).toString(16)}-${crypto.randomUUID?.() || Date.now()}`;
    localStorage.setItem("qa_device_id", id);
  }
  return id;
}

export default function Attend() {
  const { token } = useParams();
  const [session, setSession] = useState(null);
  const [form, setForm] = useState({ full_name: "", matric_number: "" });
  const [coords, setCoords] = useState(null);
  const [geo, setGeo] = useState({ state: "pending", msg: "Waiting for location…" });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/api/attendance/session/${token}`)
      .then((r) => setSession(r.data.session))
      .catch(() => setSession(false));
  }, [token]);

  const locate = () => {
    setGeo({ state: "pending", msg: "Locating you…" });
    if (!navigator.geolocation) return setGeo({ state: "err", msg: "Geolocation unsupported." });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGeo({ state: "ok", msg: `Location locked (±${Math.round(pos.coords.accuracy)}m).` });
      },
      () => setGeo({ state: "err", msg: "Location blocked. Enable GPS to sign attendance." }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => { locate(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!coords) return locate();
    setBusy(true);
    setResult(null);
    try {
      const res = await api.post(`/api/attendance/session/${token}/submit`, {
        ...form,
        device_id: getDeviceId(),
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      setResult({ ok: true, msg: res.data.message, flagged: res.data.flagged });
    } catch (err) {
      setResult({ ok: false, msg: err.response?.data?.error || "Submission failed." });
    } finally {
      setBusy(false);
    }
  };

  if (session === false) {
    return (
      <div className="attend-wrap">
        <div className="attend-card">
          <h2>Session not found</h2>
          <p className="muted">This attendance link is invalid or has expired.</p>
        </div>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="attend-wrap">
        <div className="attend-card">
          <p className="muted">Loading session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="attend-wrap">
      <div className="attend-card">
        <div className="attend-brand">
          <div className="brand" style={{ color: "#0F172A" }}>
            <Logo size={34} /> Quick Attendance
          </div>
        </div>

        <h2 style={{ marginBottom: 4 }}>{session.course_code}</h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: 16 }}>
          {session.course_name}{session.title ? ` · ${session.title}` : ""}
        </p>

        {!session.is_active && (
          <div className="alert error">This session is closed and no longer accepting attendance.</div>
        )}

        {session.is_active && !result && (
          <form onSubmit={submit}>
            <div className={`geo-status ${geo.state}`}>
              {geo.state === "ok"      && <CheckCircle  size={15} />}
              {geo.state === "pending" && <Loader       size={15} />}
              {geo.state === "err"     && <AlertCircle  size={15} />}
              <span style={{ flex: 1 }}>{geo.msg}</span>
              {geo.state === "err" && (
                <button type="button" className="btn small" onClick={locate}><MapPin size={13} /> Retry</button>
              )}
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label>Full Name</label>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Your name" required />
            </div>
            <div className="form-group">
              <label>Matric Number</label>
              <input value={form.matric_number} onChange={(e) => setForm({ ...form, matric_number: e.target.value })} placeholder="e.g. 20/0001" required />
            </div>
            <div className="form-group">
              <label>Course Code</label>
              <input value={session.course_code} readOnly />
            </div>

            <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
              You must be within {session.allowed_radius}m of the class. Your device and location are recorded to prevent fraud.
            </p>
            <button className="btn" style={{ width: "100%" }} disabled={busy || !coords}>
              {busy ? "Submitting…" : "Sign attendance"}
            </button>
          </form>
        )}

        {result && (
          <div className={`alert ${result.ok ? "success" : "error"}`} style={{ marginTop: 16, flexDirection: "column", gap: 6 }}>
            <strong style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {result.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {result.ok ? "Attendance recorded" : "Not recorded"}
            </strong>
            <p style={{ margin: 0, fontSize: 13 }}>{result.msg}</p>
            {result.flagged && (
              <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>Note: your submission was flagged for review.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
