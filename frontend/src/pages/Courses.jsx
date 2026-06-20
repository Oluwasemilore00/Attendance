import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import GroupBrowser, { buildGroups, buildRepGroups } from "../components/GroupBrowser";
import { Plus, Eye, Trash2, BookOpen, Home, ArrowLeft } from "lucide-react";

function adminKey(c)  { return c.owner_admin_id ?? c.owner_id; }
function repKey(c)    { return c.owner_id; }

export default function Courses() {
  const { user } = useAuth();
  const isRep   = user?.role === "course_rep";
  const isAdmin = user?.role === "admin";
  const isSuper = user?.role === "super_admin";

  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ course_code: "", course_name: "", semester: "2024/2025-1" });
  const [error, setError] = useState("");
  const [selAdmin, setSelAdmin] = useState(null);
  const [selRep,   setSelRep]   = useState(null);

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

  // Group logic
  const adminGroups = useMemo(() => buildGroups(courses, adminKey, repKey), [courses]);

  const repGroups = useMemo(() => {
    const subset = isSuper && selAdmin
      ? courses.filter((c) => (c.owner_admin_id ?? c.owner_id) === selAdmin.id)
      : courses;
    return buildRepGroups(subset);
  }, [courses, isSuper, selAdmin]);

  const displayCourses = useMemo(() => {
    if (isRep) return courses;
    if (selRep) return courses.filter((c) => c.owner_id === selRep.id);
    return [];
  }, [courses, isRep, selRep]);

  // Navigation level
  const level = isRep
    ? "courses"
    : isSuper && !selAdmin
    ? "admins"
    : !selRep
    ? "reps"
    : "courses";

  const goBack = () => {
    if (selRep) { setSelRep(null); return; }
    if (selAdmin) { setSelAdmin(null); }
  };

  const heading =
    level === "admins" ? "Courses"
    : level === "reps"   ? `${selAdmin?.full_name || "Admin"}'s Team`
    : selRep             ? `${selRep.full_name}'s Courses`
    : "Courses";

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{heading}</h1>
          <div className="breadcrumb">
            <Home size={13} /> Dashboard /
            {selAdmin && (
              <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => { setSelAdmin(null); setSelRep(null); }}> Courses</span>
            )}
            {selRep && selAdmin && (
              <><span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setSelRep(null)}> {selAdmin.full_name}</span></>
            )}
            {!selAdmin && !selRep ? " Courses" : selRep ? ` ${selRep.full_name}` : ""}
          </div>
        </div>
        {(selAdmin || selRep) && (
          <button className="btn ghost" onClick={goBack}>
            <ArrowLeft size={15} /> Back
          </button>
        )}
      </div>

      {/* Course rep: create form */}
      {isRep && (
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
      )}

      {/* Super admin → admin list */}
      {level === "admins" && (
        <GroupBrowser
          items={adminGroups.map((g) => ({ ...g, countLabel: "course" }))}
          label="Admin"
          onSelect={(a) => setSelAdmin(a)}
          empty="No courses in the system yet."
        />
      )}

      {/* Admin view OR super admin after selecting an admin → rep list */}
      {level === "reps" && (
        <GroupBrowser
          items={repGroups.map((g) => ({ ...g, countLabel: "course" }))}
          label="Course Rep"
          onSelect={(r) => setSelRep(r)}
          empty="No course reps with courses yet."
        />
      )}

      {/* Courses table */}
      {level === "courses" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              {selRep ? `${selRep.full_name}'s Courses` : "All Courses"}
            </div>
            <span className="muted" style={{ fontSize: 13 }}>{displayCourses.length} course{displayCourses.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Code</th><th>Name</th><th>Semester</th><th>Students</th><th>Sessions</th><th></th></tr>
              </thead>
              <tbody>
                {displayCourses.map((c) => (
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
                      {isRep && (
                        <button className="btn danger small" onClick={() => remove(c.id)}><Trash2 size={13} /> Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
                {displayCourses.length === 0 && (
                  <tr><td colSpan="6" className="muted" style={{ textAlign: "center", padding: "28px 14px" }}>No courses yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
