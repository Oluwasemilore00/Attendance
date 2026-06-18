import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import PaymentModal from "./components/PaymentModal";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Sessions from "./pages/Sessions";
import Records from "./pages/Records";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Attend from "./pages/Attend";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    const handler = () => setShowUpgrade(true);
    window.addEventListener("upgrade-required", handler);
    return () => window.removeEventListener("upgrade-required", handler);
  }, []);

  return (
    <>
    {showUpgrade && <PaymentModal onClose={() => setShowUpgrade(false)} />}
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/attend/:token" element={<Attend />} />

      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/courses" element={<Protected><Courses /></Protected>} />
      <Route path="/courses/:id" element={<Protected><CourseDetail /></Protected>} />
      <Route path="/sessions" element={<Protected><Sessions /></Protected>} />
      <Route path="/records" element={<Protected><Records /></Protected>} />
      <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/admin" element={<Protected><Admin /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
