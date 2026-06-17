import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/courses", label: "Courses" },
  { to: "/sessions", label: "Sessions" },
  { to: "/records", label: "Records" },
  { to: "/analytics", label: "Analytics" },
  { to: "/settings", label: "Settings" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user && ["super_admin", "admin"].includes(user.role);

  const doLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">QA</span>
          <span>Quick Attendance</span>
        </div>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className="nav-item">
              {n.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" className="nav-item">
              Administration
            </NavLink>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <strong>{user?.full_name}</strong>
            <small>{user?.role?.replace("_", " ")}</small>
          </div>
          <button className="btn ghost" onClick={doLogout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
