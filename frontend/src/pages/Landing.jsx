import { Link } from "react-router-dom";
import { Smartphone, MapPin, ShieldCheck, BarChart2, Zap } from "lucide-react";
import Logo from "../components/Logo";

const FEATURES = [
  { Icon: Smartphone, title: "Digital Attendance", text: "Create sessions and share a link or QR code in seconds." },
  { Icon: MapPin,     title: "Location Verification", text: "GPS + Haversine checks ensure students are physically present." },
  { Icon: ShieldCheck, title: "Anti-Cheating", text: "One device per session, duplicate detection and fraud flagging." },
  { Icon: BarChart2,  title: "Analytics", text: "Per-course and semester reports with exam eligibility tracking." },
];

export default function Landing() {
  return (
    <div className="landing">
      <div className="landing-nav">
        <div className="brand">
          <Logo size={36} />
          <span>Quick Attendance</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/login" className="btn ghost-white">Login</Link>
          <Link to="/register" className="btn">Register</Link>
        </div>
      </div>

      <section className="hero">
        <div className="hero-tag">
          <Zap size={12} /> Secure attendance for modern campuses
        </div>
        <h1>Attendance that actually knows who's in the room.</h1>
        <p>
          Quick Attendance lets course representatives and administrators collect
          attendance digitally while preventing proxy sign-ins through GPS
          verification and device-level anti-cheating safeguards.
        </p>
        <div className="hero-cta">
          <Link to="/register" className="btn">Get started free</Link>
          <Link to="/login" className="btn ghost-white">I have an account</Link>
        </div>
      </section>

      <section className="features">
        {FEATURES.map(({ Icon, title, text }) => (
          <div className="feature" key={title}>
            <div className="feature-icon"><Icon size={22} /></div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
