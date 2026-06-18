import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import {
  LayoutDashboard, BookOpen, CalendarCheck, ClipboardList,
  BarChart2, Settings, ShieldCheck, LogOut,
} from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "Dashboard",  Icon: LayoutDashboard, color: "blue"   },
  { to: "/courses",   label: "Courses",    Icon: BookOpen,         color: "green"  },
  { to: "/sessions",  label: "Sessions",   Icon: CalendarCheck,    color: "orange" },
  { to: "/records",   label: "Records",    Icon: ClipboardList,    color: "pink"   },
  { to: "/analytics", label: "Analytics",  Icon: BarChart2,        color: "teal"   },
  { to: "/settings",  label: "Settings",   Icon: Settings,         color: "blue"   },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user && ["super_admin", "admin"].includes(user.role);
  const initials = user?.full_name?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  const doLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <Logo size={38} />
            <span>Quick Attendance</span>
          </div>
        </div>

        <nav>
          <span className="nav-section-label">Main Menu</span>
          {NAV.map(({ to, label, Icon, color }) => (
            <NavLink key={to} to={to} className="nav-item">
              <span className={`nav-icon-wrap ${color}`}><Icon size={16} /></span>
              {label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <span className="nav-section-label">System</span>
              <NavLink to="/admin" className="nav-item">
                <span className="nav-icon-wrap purple"><ShieldCheck size={16} /></span>
                Administration
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            {user?.profile_picture ? (
              <img
                src={user.profile_picture}
                alt={user.full_name}
                className="user-avatar"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div className="user-avatar">{initials}</div>
            )}
            <div className="user-chip-info">
              <div className="user-chip-name">{user?.full_name}</div>
              <div className="user-chip-role">{user?.role?.replace("_", " ")}</div>
            </div>
          </div>
          <button className="btn ghost-white" onClick={doLogout} style={{ width: "100%" }}>
            <LogOut size={15} /> Log out
          </button>
        </div>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
