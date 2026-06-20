import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { UserCheck, UserX, Home, ShieldCheck, ClipboardList } from "lucide-react";

const AVATAR_COLORS = ["#4F46E5", "#059669", "#D97706", "#DB2777", "#0891B2", "#7C3AED"];
const getAvatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const ROLE_LABEL = { super_admin: "Super Admin", admin: "Admin", course_rep: "Course Rep" };

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState("");

  const load = () => api.get("/api/users").then((r) => setUsers(r.data.users)).catch(() => {});
  useEffect(() => { load(); }, []);

  const update = async (id, patch) => {
    try {
      await api.patch(`/api/users/${id}`, patch);
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || "Failed.");
    }
  };

  const isSuper = user.role === "super_admin";

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>User Administration</h1>
          <div className="breadcrumb"><Home size={13} /> Dashboard / <ShieldCheck size={13} /> Administration</div>
        </div>
      </div>

      <p className="muted" style={{ marginBottom: 20, fontSize: 14 }}>
        {isSuper
          ? "You can see and manage every account on the system."
          : "You can see and manage the course representatives registered under you."}
      </p>

      {msg && <div className="alert error" style={{ marginBottom: 16 }}>{msg}</div>}

      <div className="card">
        <div className="card-header">
          <div className="card-title">All users</div>
          <span className="muted" style={{ fontSize: 13 }}>{users.length} account{users.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Username</th><th>Email</th>
                <th>Role</th><th>Under admin</th><th>Active</th><th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="student-cell">
                      <span className="student-avatar" style={{ background: getAvatarColor(u.full_name) }}>
                        {u.full_name?.[0]?.toUpperCase()}
                      </span>
                      <span style={{ fontWeight: 600 }}>{u.full_name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{u.username}</td>
                  <td style={{ fontSize: 13 }}>{u.email}</td>
                  <td>
                    {isSuper ? (
                      <select
                        value={u.role}
                        onChange={(e) => update(u.id, { role: e.target.value })}
                        disabled={u.id === user.id}
                        style={{ width: "auto", minWidth: 130 }}
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="admin">Admin</option>
                        <option value="course_rep">Course Rep</option>
                      </select>
                    ) : (
                      <span className="badge valid">{ROLE_LABEL[u.role] || u.role}</span>
                    )}
                  </td>
                  <td className="muted" style={{ fontSize: 13 }}>{u.admin_username || "—"}</td>
                  <td>
                    <button
                      className={`btn small ${u.is_active ? "danger" : "success"}`}
                      disabled={u.id === user.id}
                      onClick={() => update(u.id, { is_active: !u.is_active })}
                    >
                      {u.is_active ? <><UserX size={13} /> Disable</> : <><UserCheck size={13} /> Enable</>}
                    </button>
                  </td>
                  <td>
                    {u.id !== user.id && u.role !== "super_admin" && (
                      <Link
                        to={`/records?owner=${u.id}&owner_name=${encodeURIComponent(u.full_name)}`}
                        className="btn ghost small"
                      >
                        <ClipboardList size={13} /> Records
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan="7" className="muted" style={{ textAlign: "center", padding: "28px 14px" }}>No users to show.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
