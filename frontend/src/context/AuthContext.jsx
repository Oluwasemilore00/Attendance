import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/api/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.clear())
      .finally(() => setLoading(false));
  }, []);

  const persist = (data) => {
    localStorage.setItem("access_token", data.access_token);
    if (data.refresh_token)
      localStorage.setItem("refresh_token", data.refresh_token);
    setUser(data.user);
  };

  const login = async (identifier, password) => {
    const res = await api.post("/api/auth/login", { identifier, password });
    persist(res.data);
    return res.data.user;
  };

  const register = async (payload) => {
    const res = await api.post("/api/auth/register", payload);
    persist(res.data);
    return res.data.user;
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
