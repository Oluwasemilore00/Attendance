import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";
import { Download, UserPlus, Trash2, Home, BookOpen } from "lucide-react";

const AVATAR_COLORS = ["#4F46E5", "#059669", "#D97706", "#DB2777", "#0891B2", "#7C3AED"];
const getAvatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

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

  if (!course) return <div className="muted" style={{ padding: 40 }}>Loading…</div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{course.course_code} — {course.course_name}</h1>
          <div className="breadcrumb">
            <Home size={13} /> Dashboard / <BookOpen size={13} /> Courses / {course.course_code}
          </div>
        </div>
        <button className="btn ghost" onClick={download}><Download size={15} /> Export Excel</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Enroll a student</div>
            <div className="card-subtitle">Add students to this course to track their attendance</div>
          </div>
        </div>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={enroll}>
          <div className="field-row">
            <div className="form-group">
              <label>Matric Number</label>
              <input value={form.matric_number} onChange={(e) => setForm({ ...form, matric_number: e.target.value })} placeholder="e.g. 20/0001" required />
            </div>
            <div className="form-group">
              <label>Full Name</label>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Student name" required />
            </div>
            <div className="form-group">
              <label>Department</label>
              <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. Computer Science" />
            </div>
            <div className="form-group">
              <label>Level</label>
              <input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="e.g. 200" />
            </div>
          </div>
          <button className="btn" style={{ marginTop: 4 }}><UserPlus size={15} /> Enroll student</button>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Attendance breakdown</div>
            <div className="card-subtitle">{report?.total_classes || 0} classes held</div>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Matric</th><th>Name</th><th>Attended</th><th>Missed</th><th>Attendance</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {(report?.students || []).map((s) => {
                const pct = s.attendance_percentage;
                const fillClass = pct >= 75 ? "ok" : pct >= 50 ? "warn" : "bad";
                return (
                  <tr key={s.student_id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{s.matric_number}</td>
                    <td>
                      <div className="student-cell">
                        <span className="student-avatar" style={{ background: getAvatarColor(s.student_name) }}>
                          {s.student_name?.[0]?.toUpperCase()}
                        </span>
                        {s.student_name}
                      </div>
                    </td>
                    <td>{s.classes_attended}</td>
                    <td>{s.classes_missed}</td>
                    <td>
                      <div className="progress-bar-wrap">
                        <div className="progress-bar-track">
                          <div className={`progress-bar-fill ${fillClass}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, minWidth: 36 }}>{pct}%</span>
                      </div>
                    </td>
                    <td><span className={`badge ${s.status.toLowerCase().split(" ")[0]}`}>{s.status}</span></td>
                    <td>
                      <button className="btn danger small" onClick={() => unenroll(s.student_id)}>
                        <Trash2 size={13} /> Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
              {(!report?.students || report.students.length === 0) && (
                <tr><td colSpan="7" className="muted" style={{ textAlign: "center", padding: "28px 14px" }}>No students enrolled yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
