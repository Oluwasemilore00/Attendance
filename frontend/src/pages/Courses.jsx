import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

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
      <div className="page-head"><h1>Courses</h1></div>

      <div className="card">
        <h3>Create a course</h3>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={create}>
          <div className="field-row">
            <div>
              <label>Course Code</label>
              <input value={form.course_code} onChange={(e) => setForm({ ...form, course_code: e.target.value })} required />
            </div>
            <div>
              <label>Course Name</label>
              <input value={form.course_name} onChange={(e) => setForm({ ...form, course_name: e.target.value })} required />
            </div>
            <div>
              <label>Semester</label>
              <input value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
            </div>
          </div>
          <button className="btn" style={{ marginTop: 14 }}>Add course</button>
        </form>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>Code</th><th>Name</th><th>Semester</th><th>Students</th><th>Sessions</th><th></th></tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id}>
                <td><Link to={`/courses/${c.id}`}>{c.course_code}</Link></td>
                <td>{c.course_name}</td>
                <td>{c.semester}</td>
                <td>{c.enrolled_count}</td>
                <td>{c.session_count}</td>
                <td>
                  <Link to={`/courses/${c.id}`} className="btn ghost small">Manage</Link>{" "}
                  <button className="btn danger small" onClick={() => remove(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {courses.length === 0 && <tr><td colSpan="6" className="muted">No courses yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
