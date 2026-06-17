import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";

export default function CourseDetail() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [report, setReport] = useState(null);
  const [form, setForm] = useState({ matric_number: "", full_name: "", department: "", level: "" });
  const [error, setError] = useState("");

  const load = () => {
    api.get(`/api/courses/${id}`).then((r) => setCourse(r.data.course));
    api.get(`/api/analytics/course/${id}`).then((r) => setReport(r.data));
  };
  useEffect(() => { load(); }, [id]);

  const enroll = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/api/courses/${id}/students`, form);
      setForm({ matric_number: "", full_name: "", department: "", level: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not enroll student.");
    }
  };

  const unenroll = async (sid) => {
    await api.delete(`/api/courses/${id}/students/${sid}`);
    load();
  };

  const download = () => {
    window.open(`${import.meta.env.VITE_API_BASE || ""}/api/reports/course/${id}/excel`, "_blank");
  };

  if (!course) return <div>Loading…</div>;

  return (
    <div>
      <div className="page-head">
        <h1>{course.course_code} — {course.course_name}</h1>
        <button className="btn ghost" onClick={download}>Export Excel</button>
      </div>

      <div className="card">
        <h3>Enroll a student</h3>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={enroll}>
          <div className="field-row">
            <div><label>Matric Number</label><input value={form.matric_number} onChange={(e) => setForm({ ...form, matric_number: e.target.value })} required /></div>
            <div><label>Full Name</label><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
            <div><label>Department</label><input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            <div><label>Level</label><input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} /></div>
          </div>
          <button className="btn" style={{ marginTop: 14 }}>Enroll</button>
        </form>
      </div>

      <div className="card">
        <h3>Attendance breakdown ({report?.total_classes || 0} classes held)</h3>
        <table>
          <thead>
            <tr><th>Matric</th><th>Name</th><th>Attended</th><th>Missed</th><th>%</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {(report?.students || []).map((s) => (
              <tr key={s.student_id}>
                <td>{s.matric_number}</td>
                <td>{s.student_name}</td>
                <td>{s.classes_attended}</td>
                <td>{s.classes_missed}</td>
                <td>{s.attendance_percentage}%</td>
                <td><span className={`badge ${s.status.toLowerCase().split(" ")[0]}`}>{s.status}</span></td>
                <td><button className="btn danger small" onClick={() => unenroll(s.student_id)}>Remove</button></td>
              </tr>
            ))}
            {(!report?.students || report.students.length === 0) && (
              <tr><td colSpan="7" className="muted">No students enrolled yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
