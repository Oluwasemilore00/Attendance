import { useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import api from "../api/client";

const COLORS = ["#16a34a", "#dc2626"];

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
        <h1>Analytics</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={semester} onChange={(e) => setSemester(e.target.value)} style={{ width: 160 }} />
          <button className="btn ghost" onClick={download}>Export semester</button>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>Average attendance by course</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={courses}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="course_code" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="average_attendance" name="Avg %" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Exam eligibility (threshold {sem?.threshold}%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3>Semester rankings</h3>
        <table>
          <thead><tr><th>#</th><th>Matric</th><th>Name</th><th>Attended</th><th>Held</th><th>Overall %</th><th>Eligible</th></tr></thead>
          <tbody>
            {(sem?.students || []).map((s, i) => (
              <tr key={s.student_id}>
                <td>{i + 1}</td>
                <td>{s.matric_number}</td>
                <td>{s.student_name}</td>
                <td>{s.total_sessions_attended}</td>
                <td>{s.total_sessions_held}</td>
                <td>{s.overall_percentage}%</td>
                <td><span className={`badge ${s.eligible ? "valid" : "rejected"}`}>{s.eligible ? "Eligible" : "Not eligible"}</span></td>
              </tr>
            ))}
            {(!sem?.students || sem.students.length === 0) && <tr><td colSpan="7" className="muted">No data for this semester.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
