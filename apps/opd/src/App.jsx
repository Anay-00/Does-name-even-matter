import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ReceptionPage from "./pages/ReceptionPage";
import DoctorPage from "./pages/DoctorPage";
import DisplayPage from "./pages/DisplayPage";
import DashboardPage from "./pages/DashboardPage";
import { connectSocket, disconnectSocket, joinDoctor, joinReception, joinHospital } from "./lib/socket";
import { getStoredAuth, setToken, clearToken } from "./lib/api";

function ProtectedRoute({ auth, allowedRoles, children }) {
  if (!auth) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(auth.user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const [auth, setAuth] = useState(getStoredAuth);
  const navigate = useNavigate();

  useEffect(() => {
    if (auth) {
      localStorage.setItem("opd_auth", JSON.stringify(auth));
      // Connect Socket.IO and join relevant rooms
      const socket = connectSocket(auth.token);
      joinHospital(auth.user.hospitalId);
      if (auth.user.role === "doctor") joinDoctor(auth.user.doctorId);
      if (auth.user.role === "receptionist") joinReception(auth.user.hospitalId);
      return () => {}; // don't disconnect on re-render
    } else {
      localStorage.removeItem("opd_auth");
      disconnectSocket();
    }
  }, [auth]);

  function handleLogin(data) {
    /* Store token synchronously BEFORE React re-render so child
       components can read it from localStorage / in-memory cache
       on their very first useEffect call. */
    localStorage.setItem("opd_auth", JSON.stringify(data));
    setToken(data.token);
    setAuth(data);
    if (data.user.role === "receptionist") navigate("/reception");
    else if (data.user.role === "doctor") navigate("/doctor");
  }

  function handleLogout() {
    clearToken();
    setAuth(null);
    disconnectSocket();
    navigate("/");
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          auth ? (
            <Navigate to={auth.user.role === "receptionist" ? "/reception" : "/doctor"} replace />
          ) : (
            <LoginPage onLogin={handleLogin} />
          )
        }
      />
      <Route path="/reception" element={
        <ProtectedRoute auth={auth} allowedRoles={["receptionist"]}>
          <ReceptionPage auth={auth} onLogout={handleLogout} />
        </ProtectedRoute>
      } />
      <Route path="/doctor" element={
        <ProtectedRoute auth={auth} allowedRoles={["doctor"]}>
          <DoctorPage auth={auth} onLogout={handleLogout} />
        </ProtectedRoute>
      } />
      <Route path="/display" element={<DisplayPage />} />
      <Route path="/display/:hospitalId" element={<DisplayPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
