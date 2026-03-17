// src/components/ProtectedRoute.jsx
import React from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

/**
 * Usage:
 * <ProtectedRoute> <MyPage/> </ProtectedRoute>
 * <ProtectedRoute roles={["Admin"]}> <AdminPage/> </ProtectedRoute>
 */
export default function ProtectedRoute({ children, roles }) {
  const token = useSelector((s) => s.auth.token);
  const userRoles = useSelector((s) => s.auth.roles);

  if (!token) return <Navigate to="/login" replace />;

  // Optional role-based authorization
  if (roles && roles.length > 0) {
    const ok = roles.some((r) => userRoles.includes(r));
    if (!ok) return <Navigate to="/" replace />;
  }

  return children;
}