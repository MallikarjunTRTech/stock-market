// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import LoginRegisterPage from "./pages/LoginRegisterPage";
import DashboardPage from "./pages/DashboardPage";
import Companies from "./pages/Companies";
import KycPage from "./pages/KycPage";
import Portfolio from "./pages/Portfolio";
import Watchlist from "./pages/Watchlist";
import ProfilePage      from "./pages/ProfilePage";
import MyDocumentsPage  from "./pages/MyDocumentsPage";

// Trades pages (separate)
import Trade from "./pages/Trade";   // buy/sell (has Navbar inside)
import Trades from "./pages/Trades"; // view (has Navbar inside)

// Admin pages
import AdminKyc from "./pages/admin/AdminKyc";
import AdminUsers from "./pages/admin/AdminUsers";

// Layout wrapper for pages that do NOT include Navbar themselves
function Shell({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div className="container-fluid py-4" style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginRegisterPage />} />

      {/* Pages using Shell (Navbar provided here) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Shell>
              <DashboardPage />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/companies"
        element={
          <ProtectedRoute>
            <Shell>
              <Companies />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/kyc"
        element={
          <ProtectedRoute>
            <Shell>
              <KycPage />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/portfolio"
        element={
          <ProtectedRoute>
            <Shell>
              <Portfolio />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/watchlist"
        element={
          <ProtectedRoute>
            <Shell>
              <Watchlist />
            </Shell>
          </ProtectedRoute>
        }
      />

      {/* Trades routes: pages already include Navbar internally */}
      <Route
        path="/trade"
        element={
          <ProtectedRoute>
            <Trade />
          </ProtectedRoute>
        }
      />

      <Route
        path="/trades"
        element={
          <ProtectedRoute>
            <Trades />
          </ProtectedRoute>
        }
      />

      {/* Admin */}
      <Route
        path="/admin/kyc"
        element={
          <ProtectedRoute roles={["Admin"]}>
            <Shell>
              <AdminKyc />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={["Admin"]}>
            <Shell>
              <AdminUsers />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route path="/profile"      element={<ProfilePage />} />
      <Route path="/my-documents" element={<MyDocumentsPage />} />

      <Route path="*" element={<div className="p-4">Not found</div>} />
    </Routes>
  );
}