import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../api/client";
import { Filter, CheckCircle, XCircle, Home, UserPlus, ArrowLeft, BookOpen } from "lucide-react";

const NOT_ENROLLED_REASON = "Student is not enrolled in this course.";

const AVATAR_COLORS = ["#4F46E5", "#059669", "#D97706", "#DB2777", "#0891B2", "#7C3AED"];
const getAvatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

export default function Records() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const ownerFilter = urlParams.get("owner") || "";
  const ownerName = urlParams.get("owner_name") || "";

  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);

  const load = () => {
    const params = {};
    if (status) params.status = status;
    if (search) params.search = search;
    if (ownerFilter) params.owner_id = ownerFilter;
    api.get("/api/attendance/records", { params }).then((r) => setRecords(r.data.records));
  };
  useEffect(() => { load(); }, [status, ownerFilter]);

  // Reset selected course when owner filter changes
  useEffect(() => { setSelectedCourse(null); }, [ownerFilter]);

  const setRecordStatus = async (id, newStatus) => {
    await api.patch(`/api/attendance/records/${id}`, { attendance_status: newStatus });
    load();
  };

  const enrollAndApprove = async (r) => {
    try {
      await api.post(`/api/courses/${r.course_id}/students`, {
        matric_number: r.matric_number,
        full_name: r.student_name,
      });
    } catch (err) {
      // 409 = already enrolled by a parallel action — that's fine, continue to approve
      if (err.response?.status !== 409) throw err;
    }
    await api.patch(`/api/attendance/records/${r.id}`, {
      attendance_status: "valid",
      flag_reason: null,
    });
    load();
  };

  // Group all records by course
  const courseGroups = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      if (!r.course_id) return;
      if (!map[r.course_id]) {
        map[r.course_id] = {
          course_id: r.course_id,
          course_code: r.course_code,
          course_name: r.course_name,
          records: [],
        };
      }
      map[r.course_id].records.push(r);
    });
    return Object.values(map).sort((a, b) =>
      (a.course_code || "").localeCompare(b.course_code || "")
    );
  }, [records]);

  const displayRecords = selectedCourse
    ? records.filter((r) => r.course_id === selectedCourse.course_id)
    : [];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>
            {selectedCourse
              ? `${selectedCourse.course_code} — ${selectedCourse.course_name}`
              : ownerName
              ? `${ownerName}'s Records`
              : "Attendance Records"}
          </h1>
          <div className="breadcrumb">
            <Home size={13} /> Dashboard /
            {ownerName && <><Link to="/admin"> Administration</Link> /</>}
            {selectedCourse
              ? <> <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setSelectedCourse(null)}>Records</span> / {selectedCourse.course_code}</>
              : " Records"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {selectedCourse && (
            <button className="btn ghost" onClick={() => setSelectedCourse(null)}>
              <ArrowLeft size={15} /> All Courses
            </button>
          )}
          {!selectedCourse && ownerName && (
            <Link to="/admin" className="btn ghost">
              <ArrowLeft size={15} /> Back to Admin
            </Link>
          )}
        </div>
      </div>

      {ownerName && !selectedCourse && (
        <div className="alert info" style={{ marginBottom: 16 }}>
          Showing attendance records for <strong>{ownerName}</strong> only.
        </div>
      )}

      {/* Course grid view */}
      {!selectedCourse && (
        <>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Filter records</div>
            </div>
            <div className="field-row" style={{ alignItems: "flex-end" }}>
              <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                <label>Search name or matric</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && load()}
                  placeholder="Start typing…"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">All statuses</option>
                  <option value="valid">Valid</option>
                  <option value="flagged">Flagged</option>
                  <option value="invalidated">Invalidated</option>
                </select>
              </div>
              <div style={{ flex: "0 0 auto", paddingBottom: 1 }}>
                <button className="btn" onClick={load}><Filter size={15} /> Filter</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Courses</div>
              <span className="muted" style={{ fontSize: 13 }}>
                {courseGroups.length} course{courseGroups.length !== 1 ? "s" : ""}
              </span>
            </div>
            {courseGroups.length === 0 ? (
              <p className="muted" style={{ padding: "28px 20px", textAlign: "center" }}>
                No records found.
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14, padding: "16px 20px" }}>
                {courseGroups.map((g) => {
                  const flagged = g.records.filter((r) => r.attendance_status === "flagged").length;
                  return (
                    <div
                      key={g.course_id}
                      onClick={() => setSelectedCourse(g)}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        padding: "16px 18px",
                        cursor: "pointer",
                        transition: "box-shadow 0.15s, transform 0.15s",
                        background: "var(--bg-card, #fff)",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(79,70,229,0.13)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <span style={{
                          width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center",
                          justifyContent: "center", background: "var(--primary-light, #EEF2FF)", flexShrink: 0,
                        }}>
                          <BookOpen size={18} color="#4F46E5" />
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{g.course_code}</div>
                          <div className="muted" style={{ fontSize: 12, lineHeight: 1.3 }}>{g.course_name}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span className="badge valid" style={{ fontSize: 11 }}>
                          {g.records.length} record{g.records.length !== 1 ? "s" : ""}
                        </span>
                        {flagged > 0 && (
                          <span className="badge flagged" style={{ fontSize: 11 }}>
                            {flagged} flagged
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Course detail table */}
      {selectedCourse && (
        <>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Filter records</div>
            </div>
            <div className="field-row" style={{ alignItems: "flex-end" }}>
              <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                <label>Search name or matric</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && load()}
                  placeholder="Start typing…"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">All statuses</option>
                  <option value="valid">Valid</option>
                  <option value="flagged">Flagged</option>
                  <option value="invalidated">Invalidated</option>
                </select>
              </div>
              <div style={{ flex: "0 0 auto", paddingBottom: 1 }}>
                <button className="btn" onClick={load}><Filter size={15} /> Filter</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Results</div>
              <span className="muted" style={{ fontSize: 13 }}>{displayRecords.length} record{displayRecords.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Matric</th><th>Name</th><th>Distance</th><th>Device</th><th>IP</th><th>Time</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {displayRecords.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{r.matric_number}</td>
                      <td>
                        <div className="student-cell">
                          <span className="student-avatar" style={{ background: getAvatarColor(r.student_name) }}>
                            {r.student_name?.[0]?.toUpperCase()}
                          </span>
                          {r.student_name}
                        </div>
                      </td>
                      <td>{r.distance_m != null ? `${r.distance_m}m` : "—"}</td>
                      <td className="muted" title={r.device_id} style={{ fontSize: 12 }}>{r.device_id?.slice(0, 8)}…</td>
                      <td className="muted" style={{ fontSize: 12 }}>{r.ip_address}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{new Date(r.timestamp).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${r.attendance_status}`}>{r.attendance_status}</span>
                        {r.flag_reason && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{r.flag_reason}</div>}
                      </td>
                      <td style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {r.flag_reason === NOT_ENROLLED_REASON && r.attendance_status !== "valid" && (
                          <button className="btn small" style={{ background: "var(--ok)" }} onClick={() => enrollAndApprove(r)}>
                            <UserPlus size={13} /> Enroll
                          </button>
                        )}
                        {r.attendance_status !== "valid" && r.flag_reason !== NOT_ENROLLED_REASON && (
                          <button className="btn ghost small" onClick={() => setRecordStatus(r.id, "valid")}>
                            <CheckCircle size={13} /> Approve
                          </button>
                        )}
                        {r.attendance_status === "valid" && (
                          <button className="btn danger small" onClick={() => setRecordStatus(r.id, "invalidated")}>
                            <XCircle size={13} /> Void
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {displayRecords.length === 0 && (
                    <tr><td colSpan="8" className="muted" style={{ textAlign: "center", padding: "28px 14px" }}>No records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
