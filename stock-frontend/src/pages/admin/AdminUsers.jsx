// src/pages/admin/AdminUsers.jsx
import React, { useState } from "react";
import api from "../../api/axiosInstance";

/**
 * Admin: make user admin
 * POST /api/admin/users/{email}/make-admin
 */
export default function AdminUsers() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const makeAdmin = async (e) => {
    e.preventDefault();
    try {
      setErr("");
      setMsg("");
      const em = email.trim();
      const res = await api.post(`/api/admin/users/${encodeURIComponent(em)}/make-admin`);
      setMsg(res.data?.message || "User promoted to admin.");
    } catch (e2) {
      setErr(e2?.response?.data?.detail || e2?.response?.data || e2.message || "Failed");
    }
  };

  return (
    <div className="admin-container">
      <h3 className="admin-title">
        <span className="admin-badge">Admin</span>
        User Management
      </h3>

      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-danger">{err}</div>}

      <div className="row">
        <div className="col-md-6">
          <div className="admin-users-card">
            <div className="card-header">Promote User to Admin</div>
            <div className="card-body">
              <form onSubmit={makeAdmin} className="admin-form">
                <div className="admin-form-group">
                  <label className="admin-form-label">User Email</label>
                  <input
                    className="form-control admin-form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <button className="admin-submit-btn" type="submit">
                  🔑 Make Admin
                </button>
              </form>

              <div className="admin-form-hint">
                This endpoint ensures the Admin role exists and assigns it to the target user.
                User must log in again to receive the Admin role claim.
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="admin-users-card">
            <div className="card-header">How It Works</div>
            <div className="card-body">
              <p className="mb-2" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 500 }}>
                <strong>Admin promotion flow:</strong>
              </p>
              <ol style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.8 }}>
                <li>New user registers via <code>/login</code> (default role: User)</li>
                <li>Admin logs in and gets JWT token</li>
                <li>Admin uses <strong>Authorize</strong> button in Swagger with the token</li>
                <li>Admin calls this endpoint to promote user</li>
                <li>User must log in again to get new JWT with Admin role claim</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}