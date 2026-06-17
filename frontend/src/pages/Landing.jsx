import { Link } from "react-router-dom";

const FEATURES = [
  { icon: "📲", title: "Digital Attendance", text: "Create sessions and share a link or QR code in seconds." },
  { icon: "📍", title: "Location Verification", text: "GPS + Haversine checks ensure students are physically present." },
  { icon: "🛡️", title: "Anti-Cheating", text: "One device per session, duplicate detection and fraud flagging." },
  { icon: "📊", title: "Analytics", text: "Per-course and semester reports with exam eligibility tracking." },
];

export default function Landing() {
  return (
    <div className="landing">
      <div className="nav">
        <div className="brand" style={{ color: "#fff" }}>
          <span className="logo">QA</span> Quick Attendance
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/login" className="btn ghost" style={{ color: "#fff", borderColor: "#475569" }}>
            Login
          </Link>
          <Link to="/register" className="btn">Register</Link>
        </div>
      </div>

      <section className="hero">
        <h1>Secure, location-verified attendance for modern campuses.</h1>
        <p>
          Quick Attendance lets course representatives and administrators collect
          attendance digitally while preventing proxy sign-ins through GPS
          verification and device-level anti-cheating safeguards.
        </p>
        <div className="cta">
          <Link to="/register" className="btn">Get started free</Link>
          <Link to="/login" className="btn ghost" style={{ color: "#fff", borderColor: "#475569" }}>
            I have an account
          </Link>
        </div>
      </section>

      <section className="features">
        {FEATURES.map((f) => (
          <div className="feature" key={f.title}>
            <div style={{ fontSize: 28 }}>{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
