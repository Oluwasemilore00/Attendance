import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  BookOpen, CalendarCheck, Radio, TrendingUp,
  Plus, ClipboardList, BarChart2, Home,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ courses: 0, sessions: 0, active: 0 });
  const [overview, setOverview] = useState(null);
  const firstName = user?.full_name?.split(" ")[0] || "there";

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
        <div>
          <h1>Welcome back, {firstName}</h1>
          <div className="breadcrumb"><Home size={13} /> Dashboard</div>
        </div>
        <Link to="/sessions" className="btn"><Plus size={16} /> New session</Link>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 22 }}>
        <div className="stat-card blue">
          <div className="stat-card-icon"><BookOpen size={20} /></div>
          <div className="stat-card-label">Courses</div>
          <div className="stat-value">{stats.courses}</div>
          <div className="stat-trend"><TrendingUp size={12} /> Active this semester</div>
        </div>
        <div className="stat-card green">
          <div className="stat-card-icon"><CalendarCheck size={20} /></div>
          <div className="stat-card-label">Total Sessions</div>
          <div className="stat-value">{stats.sessions}</div>
          <div className="stat-trend"><TrendingUp size={12} /> All time</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-card-icon"><Radio size={20} /></div>
          <div className="stat-card-label">Active Now</div>
          <div className="stat-value">{stats.active}</div>
          <div className="stat-trend">
            {stats.active > 0 ? "Session in progress" : "No active sessions"}
          </div>
        </div>
        <div className="stat-card pink">
          <div className="stat-card-icon"><BarChart2 size={20} /></div>
          <div className="stat-card-label">Avg Attendance</div>
          <div className="stat-value">{overview ? `${overview.overall_average}%` : "—"}</div>
          <div className="stat-trend"><TrendingUp size={12} /> Across all courses</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Quick Actions</div>
            <div className="card-subtitle">Jump to the most common tasks</div>
          </div>
        </div>
        <div className="grid cols-2">
          <Link to="/courses" className="btn ghost"><BookOpen size={15} /> Manage courses</Link>
          <Link to="/sessions" className="btn ghost"><CalendarCheck size={15} /> Create session</Link>
          <Link to="/records" className="btn ghost"><ClipboardList size={15} /> Review records</Link>
          <Link to="/analytics" className="btn ghost"><BarChart2 size={15} /> View analytics</Link>
        </div>
      </div>
    </div>
  );
}
