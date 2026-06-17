import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ courses: 0, sessions: 0, active: 0 });
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/api/courses"),
      api.get("/api/sessions"),
      api.get("/api/analytics/courses"),
    ]).then(([c, s, a]) => {
      setStats({
        courses: c.data.courses.length,
        sessions: s.data.sessions.length,
        active: s.data.sessions.filter((x) => x.is_open).length,
      });
      setOverview(a.data);
    });
  }, []);

  return (
    <div>
      <div className="page-head">
        <h1>Welcome, {user?.full_name?.split(" ")[0]} 👋</h1>
        <Link to="/sessions" className="btn">+ New attendance session</Link>
      </div>

      <div className="grid cols-3">
        <div className="card"><div className="stat-label">Courses</div><div className="stat">{stats.courses}</div></div>
        <div className="card"><div className="stat-label">Total sessions</div><div className="stat">{stats.sessions}</div></div>
        <div className="card"><div className="stat-label">Active now</div><div className="stat">{stats.active}</div></div>
        <div className="card">
          <div className="stat-label">Avg attendance</div>
          <div className="stat">{overview ? `${overview.overall_average}%` : "—"}</div>
        </div>
      </div>

      <div className="card">
        <h3>Quick actions</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link to="/courses" className="btn ghost">Manage courses</Link>
          <Link to="/sessions" className="btn ghost">Create session</Link>
          <Link to="/records" className="btn ghost">Review records</Link>
          <Link to="/analytics" className="btn ghost">View analytics</Link>
        </div>
      </div>
    </div>
  );
}
