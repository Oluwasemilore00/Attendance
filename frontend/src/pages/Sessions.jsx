import { useEffect, useState } from "react";
import api from "../api/client";

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
        setGeoMsg(`Location captured (±${Math.round(pos.coords.accuracy)}m accuracy).`);
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
      <div className="page-head"><h1>Attendance Sessions</h1></div>

      <div className="grid cols-2">
        <div className="card">
          <h3>Create session</h3>
          {error && <div className="alert error">{error}</div>}
          <form onSubmit={create}>
            <label>Course</label>
            <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} required>
              <option value="">Select a course…</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.course_code} — {c.course_name}</option>)}
            </select>

            <label>Title (optional)</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Week 1 Lecture" />

            <div className="field-row">
              <div><label>Start</label><input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
              <div><label>End</label><input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
            </div>

            <label>Allowed radius (metres)</label>
            <input type="number" step="0.5" value={form.allowed_radius} onChange={(e) => setForm({ ...form, allowed_radius: e.target.value })} />

            <div style={{ marginTop: 12 }}>
              <button type="button" className="btn ghost" onClick={capture}>📍 Capture my location</button>
              {form.location_lat && <span className="muted" style={{ marginLeft: 10 }}>{form.location_lat}, {form.location_lng}</span>}
            </div>
            {geoMsg && <div className="muted" style={{ marginTop: 6 }}>{geoMsg}</div>}

            <button className="btn" style={{ marginTop: 16 }}>Create & generate link</button>
          </form>
        </div>

        <div className="card">
          <h3>Session link & QR</h3>
          {!selected && <p className="muted">Create or open a session to view its link and QR code.</p>}
          {selected && (
            <div>
              <p><strong>{selected.course_code}</strong> {selected.title ? `— ${selected.title}` : ""}</p>
              <input readOnly value={selected.attendance_link} onClick={(e) => e.target.select()} />
              <div style={{ textAlign: "center", marginTop: 16 }}>
                {selected.qr_code && <img className="qr-img" src={selected.qr_code} alt="QR code" />}
              </div>
              <p className="muted" style={{ textAlign: "center" }}>Students scan this to sign attendance.</p>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3>All sessions</h3>
        <table>
          <thead><tr><th>Course</th><th>Title</th><th>Window</th><th>Radius</th><th>Records</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td>{s.course_code}</td>
                <td>{s.title || "—"}</td>
                <td className="muted">{new Date(s.start_time).toLocaleString()}</td>
                <td>{s.allowed_radius}m</td>
                <td>{s.record_count}</td>
                <td><span className={`badge ${s.is_active ? "valid" : "rejected"}`}>{s.is_active ? "Active" : s.is_open ? "Open (outside window)" : "Closed"}</span></td>
                <td>
                  <button className="btn ghost small" onClick={() => view(s.id)}>Link</button>{" "}
                  {s.is_open && <button className="btn danger small" onClick={() => close(s.id)}>Close</button>}
                </td>
              </tr>
            ))}
            {sessions.length === 0 && <tr><td colSpan="7" className="muted">No sessions yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
