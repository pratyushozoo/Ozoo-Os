import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = logged out
  useEffect(() => {
    const token = localStorage.getItem("ozoo_token");
    if (!token) {
      setUser(false);
      return;
    }
    api.me().then(setUser).catch(() => {
      localStorage.removeItem("ozoo_token");
      setUser(false);
    });
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    localStorage.setItem("ozoo_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("ozoo_token");
    setUser(false);
  };

  return <AuthCtx.Provider value={{ user, setUser, login, logout }}>{children}</AuthCtx.Provider>;
}
