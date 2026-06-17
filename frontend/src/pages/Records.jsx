import { useEffect, useState } from "react";
import api from "../api/client";

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

  const enrollStudent = async (r) => {
    if (!confirm(`Enroll ${r.student_name} (${r.matric_number}) in ${r.course_code}?`)) return;
    await api.post(`/api/attendance/records/${r.id}/enroll`);
    load();
  };

  return (
    <div>
      <div className="page-head"><h1>Attendance Records</h1></div>
      <div className="card">
        <div className="field-row" style={{ alignItems: "flex-end" }}>
          <div>
            <label>Search (name or matric)</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
          </div>
          <div>
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="valid">Valid</option>
              <option value="flagged">Flagged</option>
              <option value="invalidated">Invalidated</option>
            </select>
          </div>
          <div style={{ flex: "0 0 auto" }}><button className="btn" onClick={load}>Filter</button></div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>Matric</th><th>Name</th><th>Distance</th><th>Device</th><th>IP</th><th>Time</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{r.matric_number}</td>
                <td>{r.student_name}</td>
                <td>{r.distance_m != null ? `${r.distance_m}m` : "—"}</td>
                <td className="muted" title={r.device_id}>{r.device_id?.slice(0, 8)}…</td>
                <td className="muted">{r.ip_address}</td>
                <td className="muted">{new Date(r.timestamp).toLocaleString()}</td>
                <td>
                  <span className={`badge ${r.attendance_status}`}>{r.attendance_status}</span>
                  {r.flag_reason && <div className="muted" style={{ fontSize: 11 }}>{r.flag_reason}</div>}
                </td>
                <td>
                  {r.is_enrolled === false && (
                    <button className="btn small" onClick={() => enrollStudent(r)}>Enroll</button>
                  )}{" "}
                  {r.attendance_status !== "valid" && <button className="btn ghost small" onClick={() => setRecordStatus(r.id, "valid")}>Approve</button>}
                  {r.attendance_status === "valid" && <button className="btn danger small" onClick={() => setRecordStatus(r.id, "invalidated")}>Void</button>}
                </td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan="8" className="muted">No records found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
