import { useEffect, useState } from "react";
import api from "../api/client";
import { Filter, CheckCircle, XCircle, Home, UserPlus } from "lucide-react";

const NOT_ENROLLED_REASON = "Student is not enrolled in this course.";

const AVATAR_COLORS = ["#4F46E5", "#059669", "#D97706", "#DB2777", "#0891B2", "#7C3AED"];
const getAvatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

export default function Records() {
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const load = () => {
    const params = {};
    if (status) params.status = status;
    if (search) params.search = search;
    api.get("/api/attendance/records", { params }).then((r) => setRecords(r.data.records));
  };
  useEffect(() => { load(); }, [status]);

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
    await api.patch(`/api/attendance/records/${r.id}`, { attendance_status: "valid" });
    load();
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Attendance Records</h1>
          <div className="breadcrumb"><Home size={13} /> Dashboard / Records</div>
        </div>
      </div>

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
          <span className="muted" style={{ fontSize: 13 }}>{records.length} record{records.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Matric</th><th>Name</th><th>Distance</th><th>Device</th><th>IP</th><th>Time</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {records.map((r) => (
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
                    {r.flag_reason === NOT_ENROLLED_REASON && (
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
              {records.length === 0 && (
                <tr><td colSpan="8" className="muted" style={{ textAlign: "center", padding: "28px 14px" }}>No records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
