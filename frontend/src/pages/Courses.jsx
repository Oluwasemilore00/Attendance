import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { Plus, Eye, Trash2, BookOpen, Home } from "lucide-react";

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ course_code: "", course_name: "", semester: "2024/2025-1" });
  const [error, setError] = useState("");

  const load = () => api.get("/api/courses").then((r) => setCourses(r.data.courses));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/api/courses", form);
      setForm({ course_code: "", course_name: "", semester: form.semester });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create course.");
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this course and all its sessions?")) return;
    await api.delete(`/api/courses/${id}`);
    load();
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Courses</h1>
          <div className="breadcrumb"><Home size={13} /> Dashboard / Courses</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Create a course</div>
            <div className="card-subtitle">Add a new course to track attendance for</div>
          </div>
        </div>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={create}>
          <div className="field-row">
            <div className="form-group">
              <label>Course Code</label>
              <input value={form.course_code} onChange={(e) => setForm({ ...form, course_code: e.target.value })} placeholder="e.g. CS101" required />
            </div>
            <div className="form-group">
              <label>Course Name</label>
              <input value={form.course_name} onChange={(e) => setForm({ ...form, course_name: e.target.value })} placeholder="e.g. Intro to Computing" required />
            </div>
            <div className="form-group">
              <label>Semester</label>
              <input value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
            </div>
          </div>
          <button className="btn" style={{ marginTop: 4 }}><Plus size={15} /> Add course</button>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">All Courses</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Code</th><th>Name</th><th>Semester</th><th>Students</th><th>Sessions</th><th></th></tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/courses/${c.id}`} style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <BookOpen size={14} style={{ color: "var(--primary)" }} />{c.course_code}
                    </Link>
                  </td>
                  <td>{c.course_name}</td>
                  <td><span style={{ fontSize: 12, color: "var(--muted)" }}>{c.semester}</span></td>
                  <td><strong>{c.enrolled_count}</strong></td>
                  <td><strong>{c.session_count}</strong></td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <Link to={`/courses/${c.id}`} className="btn ghost small"><Eye size={13} /> Manage</Link>
                    <button className="btn danger small" onClick={() => remove(c.id)}><Trash2 size={13} /> Delete</button>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr><td colSpan="6" className="muted" style={{ textAlign: "center", padding: "28px 14px" }}>No courses yet. Create one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
