import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import {
  LayoutDashboard, BookOpen, CalendarCheck, ClipboardList,
  BarChart2, Settings, ShieldCheck, LogOut, Menu, X,
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
  const [open, setOpen] = useState(false);
  const isAdmin = user && ["super_admin", "admin"].includes(user.role);
  const initials = user?.full_name?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  const close = () => setOpen(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const doLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="app-shell">
      {/* Mobile top bar */}
      <header className="topbar">
        <button className="topbar-hamburger" onClick={() => setOpen(o => !o)} aria-label="Open menu">
          <Menu size={22} color="#fff" />
        </button>
        <div className="brand" style={{ color: "#fff" }}>
          <Logo size={30} />
          <span>Quick Attendance</span>
        </div>
      </header>

      {/* Backdrop */}
      {open && <div className="sidebar-backdrop" onClick={close} />}

      <aside className={`sidebar${open ? " open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand">
            <Logo size={38} />
            <span>Quick Attendance</span>
          </div>
          <button className="sidebar-close-btn" onClick={close} aria-label="Close menu">
            <X size={18} color="rgba(255,255,255,0.7)" />
          </button>
        </div>

        <nav>
          <span className="nav-section-label">Main Menu</span>
          {NAV.map(({ to, label, Icon, color }) => (
            <NavLink key={to} to={to} className="nav-item" onClick={close}>
              <span className={`nav-icon-wrap ${color}`}><Icon size={16} /></span>
              {label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <span className="nav-section-label">System</span>
              <NavLink to="/admin" className="nav-item" onClick={close}>
                <span className="nav-icon-wrap purple"><ShieldCheck size={16} /></span>
                Administration
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt={user.full_name} className="user-avatar" style={{ objectFit: "cover" }} />
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
