import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

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

  return (
    <div>
      <div className="page-head"><h1>User Administration</h1></div>
      {msg && <div className="alert error">{msg}</div>}
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Active</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name}</td>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>
                  <select value={u.role} onChange={(e) => update(u.id, { role: e.target.value })} disabled={u.id === user.id}>
                    {user.role === "super_admin" && <option value="super_admin">Super Admin</option>}
                    <option value="admin">Admin</option>
                    <option value="course_rep">Course Rep</option>
                  </select>
                </td>
                <td>
                  <button className={`btn small ${u.is_active ? "danger" : ""}`} disabled={u.id === user.id}
                    onClick={() => update(u.id, { is_active: !u.is_active })}>
                    {u.is_active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
