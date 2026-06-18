import { useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import api from "../api/client";
import { Download, Home } from "lucide-react";

const AVATAR_COLORS = ["#4F46E5", "#059669", "#D97706", "#DB2777", "#0891B2", "#7C3AED"];
const getAvatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const PIE_COLORS = ["#16A34A", "#EF4444"];
const FONT = { fontFamily: "'Poppins', sans-serif", fontSize: 12 };

export default function Analytics() {
  const [semester, setSemester] = useState("2024/2025-1");
  const [courses, setCourses] = useState([]);
  const [sem, setSem] = useState(null);

  const load = () => {
    api.get("/api/analytics/courses").then((r) => setCourses(r.data.courses));
    api.get("/api/analytics/semester", { params: { semester } }).then((r) => setSem(r.data));
  };
  useEffect(() => { load(); }, [semester]);

  const download = () => {
    window.open(`${import.meta.env.VITE_API_BASE || ""}/api/reports/semester/excel?semester=${encodeURIComponent(semester)}`, "_blank");
  };

  const pieData = sem
    ? [{ name: "Eligible", value: sem.eligible.length }, { name: "Ineligible", value: sem.ineligible.length }]
    : [];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Analytics</h1>
          <div className="breadcrumb"><Home size={13} /> Dashboard / Analytics</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input value={semester} onChange={(e) => setSemester(e.target.value)} style={{ width: 160 }} />
          <button className="btn ghost" onClick={download}><Download size={15} /> Export semester</button>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Avg attendance by course</div>
              <div className="card-subtitle">Percentage across all sessions</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={courses} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="course_code" tick={FONT} />
              <YAxis domain={[0, 100]} tick={FONT} />
              <Tooltip contentStyle={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, borderRadius: 8 }} />
              <Bar dataKey="average_attendance" name="Avg %" fill="#4F46E5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Exam eligibility</div>
              <div className="card-subtitle">Threshold: {sem?.threshold ?? "—"}%</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Legend wrapperStyle={FONT} />
              <Tooltip contentStyle={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Semester rankings</div>
            <div className="card-subtitle">{semester}</div>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Matric</th><th>Name</th><th>Attended</th><th>Held</th><th>Overall %</th><th>Eligible</th></tr>
            </thead>
            <tbody>
              {(sem?.students || []).map((s, i) => {
                const pct = s.overall_percentage;
                const fillClass = pct >= 75 ? "ok" : pct >= 50 ? "warn" : "bad";
                return (
                  <tr key={s.student_id}>
                    <td>
                      <span style={{ fontWeight: 800, color: i === 0 ? "#D97706" : i === 1 ? "#64748B" : "var(--ink)" }}>
                        {i + 1}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{s.matric_number}</td>
                    <td>
                      <div className="student-cell">
                        <span className="student-avatar" style={{ background: getAvatarColor(s.student_name) }}>
                          {s.student_name?.[0]?.toUpperCase()}
                        </span>
                        {s.student_name}
                      </div>
                    </td>
                    <td>{s.total_sessions_attended}</td>
                    <td>{s.total_sessions_held}</td>
                    <td>
                      <div className="progress-bar-wrap">
                        <div className="progress-bar-track">
                          <div className={`progress-bar-fill ${fillClass}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, minWidth: 36 }}>{pct}%</span>
                      </div>
                    </td>
                    <td><span className={`badge ${s.eligible ? "valid" : "rejected"}`}>{s.eligible ? "Eligible" : "Not eligible"}</span></td>
                  </tr>
                );
              })}
              {(!sem?.students || sem.students.length === 0) && (
                <tr><td colSpan="7" className="muted" style={{ textAlign: "center", padding: "28px 14px" }}>No data for this semester.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
