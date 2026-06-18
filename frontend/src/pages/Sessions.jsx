import { useEffect, useState } from "react";
import api from "../api/client";
import { MapPin, Plus, Link2, X, QrCode, Home } from "lucide-react";

function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function Sessions() {
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const now = new Date();
  const [form, setForm] = useState({
    course_id: "",
    title: "",
    start_time: toLocalInput(now),
    end_time: toLocalInput(new Date(now.getTime() + 2 * 3600 * 1000)),
    allowed_radius: 3,
    location_lat: "",
    location_lng: "",
  });
  const [geoMsg, setGeoMsg] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    api.get("/api/courses").then((r) => setCourses(r.data.courses));
    api.get("/api/sessions").then((r) => setSessions(r.data.sessions));
  };
  useEffect(() => { load(); }, []);

  const capture = () => {
    setGeoMsg("Locating…");
    if (!navigator.geolocation) return setGeoMsg("Geolocation not supported.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          location_lat: pos.coords.latitude.toFixed(6),
          location_lng: pos.coords.longitude.toFixed(6),
        }));
        setGeoMsg(`Captured (±${Math.round(pos.coords.accuracy)}m accuracy).`);
      },
      () => setGeoMsg("Could not get location. Allow location access."),
      { enableHighAccuracy: true }
    );
  };

  const create = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.location_lat) return setError("Capture the class location first.");
    try {
      const payload = {
        ...form,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
      };
      const res = await api.post("/api/sessions", payload, {
        headers: { "X-Frontend-URL": window.location.origin },
      });
      setSelected(res.data.session);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create session.");
    }
  };

  const close = async (id) => {
    await api.post(`/api/sessions/${id}/close`);
    load();
  };

  const view = async (id) => {
    const res = await api.get(`/api/sessions/${id}`, {
      headers: { "X-Frontend-URL": window.location.origin },
    });
    setSelected(res.data.session);
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Attendance Sessions</h1>
          <div className="breadcrumb"><Home size={13} /> Dashboard / Sessions</div>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Create session</div>
              <div className="card-subtitle">Set up a new attendance window</div>
            </div>
          </div>
          {error && <div className="alert error">{error}</div>}
          <form onSubmit={create}>
            <div className="form-group">
              <label>Course</label>
              <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} required>
                <option value="">Select a course…</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.course_code} — {c.course_name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Title (optional)</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Week 1 Lecture" />
            </div>

            <div className="field-row">
              <div className="form-group">
                <label>Start</label>
                <input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div className="form-group">
                <label>End</label>
                <input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label>Allowed radius (metres)</label>
              <input type="number" step="0.5" value={form.allowed_radius} onChange={(e) => setForm({ ...form, allowed_radius: e.target.value })} />
            </div>

            <div style={{ marginTop: 4, marginBottom: 8 }}>
              <button type="button" className="btn ghost" onClick={capture}><MapPin size={15} /> Capture my location</button>
              {form.location_lat && (
                <span className="muted" style={{ marginLeft: 10, fontSize: 12 }}>{form.location_lat}, {form.location_lng}</span>
              )}
            </div>
            {geoMsg && <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>{geoMsg}</div>}

            <button className="btn"><Plus size={15} /> Create &amp; generate link</button>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Session link &amp; QR</div>
              <div className="card-subtitle">Share with students to sign attendance</div>
            </div>
          </div>
          {!selected && (
            <div style={{ textAlign: "center", padding: "36px 20px", border: "2px dashed var(--border)", borderRadius: 10 }}>
              <QrCode size={44} style={{ color: "var(--muted)", marginBottom: 12 }} />
              <p className="muted" style={{ fontSize: 13 }}>Create or open a session to view its link and QR code.</p>
            </div>
          )}
          {selected && (
            <div>
              <p style={{ fontWeight: 600, marginBottom: 12 }}>
                {selected.course_code}{selected.title ? ` — ${selected.title}` : ""}
              </p>
              <div className="form-group">
                <label>Attendance link</label>
                <input readOnly value={selected.attendance_link} onClick={(e) => e.target.select()} />
              </div>
              <div style={{ textAlign: "center", marginTop: 16 }}>
                {selected.qr_code && <img className="qr-img" src={selected.qr_code} alt="QR code" />}
              </div>
              <p className="muted" style={{ textAlign: "center", fontSize: 13, marginTop: 10 }}>Students scan this to sign attendance.</p>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">All sessions</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Course</th><th>Title</th><th>Window</th><th>Radius</th><th>Records</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.course_code}</td>
                  <td>{s.title || <span className="muted">—</span>}</td>
                  <td className="muted" style={{ fontSize: 12 }}>{new Date(s.start_time).toLocaleString()}</td>
                  <td>{s.allowed_radius}m</td>
                  <td><strong>{s.record_count}</strong></td>
                  <td>
                    <span className={`badge ${s.is_active ? "active-session" : "closed-session"}`}>
                      {s.is_active ? "Active" : s.is_open ? "Open" : "Closed"}
                    </span>
                  </td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button className="btn ghost small" onClick={() => view(s.id)}><Link2 size={13} /> Link</button>
                    {s.is_open && <button className="btn danger small" onClick={() => close(s.id)}><X size={13} /> Close</button>}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr><td colSpan="7" className="muted" style={{ textAlign: "center", padding: "28px 14px" }}>No sessions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
