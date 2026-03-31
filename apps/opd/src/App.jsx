import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ReceptionPage from "./pages/ReceptionPage";
import DoctorPage from "./pages/DoctorPage";
import DisplayPage from "./pages/DisplayPage";

function getStoredAuth() {
  try {
    const raw = localStorage.getItem("opd_auth");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

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
    } else {
      localStorage.removeItem("opd_auth");
    }
  }, [auth]);

  function handleLogin(data) {
    setAuth(data);
    if (data.user.role === "opd_receptionist") navigate("/reception");
    else if (data.user.role === "doctor") navigate("/doctor");
  }

  function handleLogout() {
    setAuth(null);
    navigate("/");
  }

  return (
    <Routes>
      <Route path="/" element={auth ? <Navigate to={auth.user.role === "opd_receptionist" ? "/reception" : "/doctor"} replace /> : <LoginPage onLogin={handleLogin} />} />
      <Route path="/reception" element={
        <ProtectedRoute auth={auth} allowedRoles={["opd_receptionist"]}>
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
