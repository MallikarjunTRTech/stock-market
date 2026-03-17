// src/pages/ProfilePage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../api/axiosInstance";

function extractError(e) {
  const data = e?.response?.data;
  if (!data) return e?.message || "Something went wrong.";
  if (data.errors) return Object.values(data.errors).flat().join(" ");
  if (data.detail) return data.detail;
  if (data.title) return data.title;
  if (typeof data === "string") return data;
  return e?.message || "Something went wrong.";
}

const statusColors = {
  approved:   "#4caf50",
  rejected:   "#f44336",
  pending:    "#ff9800",
  submitted:  "#2196f3",
  notstarted: "#888",
};

function ViewField({ label, value }) {
  return (
    <div style={fieldWrap}>
      <span style={fieldLabel}>{label}</span>
      <span style={fieldValue}>
        {value || <span style={{ color: "#555" }}>—</span>}
      </span>
    </div>
  );
}

function EditField({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <div style={fieldWrap}>
      <span style={{ ...fieldLabel, minWidth: "130px" }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const claims   = useSelector((s) => s.auth.claims);

  const emailFromToken = claims?.email
    ?? claims?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"]
    ?? null;
  const usernameFromToken = claims?.unique_name
    ?? claims?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"]
    ?? null;

  const [profile, setProfile] = useState(null);
  const [err,     setErr]     = useState("");
  const [msg,     setMsg]     = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);

  const [form, setForm] = useState({
    FullName:     "",
    DateOfBirth:  "",
    AddressLine1: "",
    City:         "",
    Country:      "",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/kyc/me");
        setProfile(res.data);
        setForm({
          FullName:     res.data.fullName     || "",
          DateOfBirth:  res.data.dateOfBirth
            ? res.data.dateOfBirth.split("T")[0]
            : "",
          AddressLine1: res.data.addressLine1 || "",
          City:         res.data.city         || "",
          Country:      res.data.country      || "",
        });
      } catch (e) {
        setErr(extractError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSave = async () => {
    try {
      setErr("");
      setMsg("");
      setSaving(true);
      const res = await api.put("/api/kyc/profile", {
        FullName:     form.FullName     || null,
        DateOfBirth:  form.DateOfBirth  || null,
        AddressLine1: form.AddressLine1 || null,
        City:         form.City         || null,
        Country:      form.Country      || null,
      });
      setProfile(res.data);
      setMsg("Profile updated successfully.");
      setEditing(false);
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () => {
    setEditing(false);
    setErr("");
    setMsg("");
    setForm({
      FullName:     profile?.fullName     || "",
      DateOfBirth:  profile?.dateOfBirth
        ? profile.dateOfBirth.split("T")[0]
        : "",
      AddressLine1: profile?.addressLine1 || "",
      City:         profile?.city         || "",
      Country:      profile?.country      || "",
    });
  };

  if (loading) {
    return (
      <div style={pageWrap}>
        <div style={card}>
          <div className="text-center text-muted py-5">Loading profile…</div>
        </div>
      </div>
    );
  }

  const statusKey   = (profile?.status || "notstarted").toLowerCase();
  const statusColor = statusColors[statusKey] ?? "#888";

  return (
    <div style={pageWrap}>
      <div style={card}>

        {/* ── Avatar + Name + Status ── */}
        <div style={avatarSection}>
          <div style={avatarCircle}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="white"
            >
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
          <h4 style={{ margin: "12px 0 4px", color: "#fff" }}>
            {profile?.fullName || usernameFromToken || "Name not set"}
          </h4>
          {emailFromToken && (
            <p style={{ color: "#888", fontSize: "13px", margin: "2px 0 8px" }}>
              {emailFromToken}
            </p>
          )}
          <span style={{ ...statusBadge, backgroundColor: statusColor }}>
            KYC: {profile?.status || "Not Started"}
          </span>
        </div>

        <hr style={divider} />

        {msg && <div className="alert alert-success py-2 mb-3">{msg}</div>}
        {err && <div className="alert alert-danger  py-2 mb-3">{err}</div>}

        {/* ── View or Edit ── */}
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <EditField
              label="Full Name"
              value={form.FullName}
              onChange={(v) => setForm((p) => ({ ...p, FullName: v }))}
              placeholder="John Doe"
            />
            <EditField
              label="Date of Birth"
              type="date"
              value={form.DateOfBirth}
              onChange={(v) => setForm((p) => ({ ...p, DateOfBirth: v }))}
            />
            <EditField
              label="Address"
              value={form.AddressLine1}
              onChange={(v) => setForm((p) => ({ ...p, AddressLine1: v }))}
              placeholder="123 Main Street"
            />
            <EditField
              label="City"
              value={form.City}
              onChange={(v) => setForm((p) => ({ ...p, City: v }))}
              placeholder="New York"
            />
            <EditField
              label="Country"
              value={form.Country}
              onChange={(v) => setForm((p) => ({ ...p, Country: v }))}
              placeholder="US"
            />

            <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
              <button style={btnPrimary} onClick={onSave} disabled={saving}>
                {saving ? "Saving…" : "💾 Save Changes"}
              </button>
              <button style={btnGhost} onClick={onCancel} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <ViewField label="👤 Username"  value={usernameFromToken} />
            <ViewField label="📧 Email"     value={emailFromToken} />
            <ViewField label="📝 Full Name" value={profile?.fullName} />
            <ViewField
              label="📅 Date of Birth"
              value={
                profile?.dateOfBirth
                  ? new Date(profile.dateOfBirth).toLocaleDateString()
                  : null
              }
            />
            <ViewField label="🏠 Address"   value={profile?.addressLine1} />
            <ViewField label="🏙️ City"      value={profile?.city} />
            <ViewField label="🌍 Country"   value={profile?.country} />
            {profile?.submittedUtc && (
              <ViewField
                label="🕐 Submitted At"
                value={new Date(profile.submittedUtc).toLocaleString()}
              />
            )}

            <button
              style={{ ...btnPrimary, marginTop: "8px" }}
              onClick={() => setEditing(true)}
            >
              ✏️ Edit Profile
            </button>
          </div>
        )}

        <hr style={divider} />

        {/* ── Bottom navigation ── */}
        <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
          <button style={btnGhost} onClick={() => navigate("/dashboard")}>
            🏠 Dashboard
          </button>
          <button style={btnGhost} onClick={() => navigate("/my-documents")}>
            📄 My Documents
          </button>
          <button style={btnGhost} onClick={() => navigate("/kyc")}>
            🔄 KYC Page
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pageWrap = {
  display: "flex",
  justifyContent: "center",
  padding: "32px 16px",
};

const card = {
  background: "#1a1a2e",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "16px",
  padding: "36px",
  width: "100%",
  maxWidth: "540px",
  boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
};

const avatarSection = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const avatarCircle = {
  width: "90px",
  height: "90px",
  borderRadius: "50%",
  background:
    "linear-gradient(135deg, var(--accent, #7c6af7) 0%, var(--accent-light, #a78bfa) 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 4px 20px rgba(124,106,247,0.4)",
};

const statusBadge = {
  padding: "4px 14px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: "600",
  color: "#fff",
};

const divider = {
  borderColor: "rgba(255,255,255,0.1)",
  margin: "20px 0",
};

const fieldWrap = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 14px",
  background: "rgba(255,255,255,0.04)",
  borderRadius: "8px",
  gap: "12px",
};

const fieldLabel = {
  color: "#888",
  fontSize: "13px",
  flexShrink: 0,
};

const fieldValue = {
  color: "#e0e0e0",
  fontSize: "14px",
  fontWeight: "500",
  textAlign: "right",
};

const inputStyle = {
  flex: 1,
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: "6px",
  color: "#fff",
  padding: "6px 10px",
  fontSize: "14px",
  outline: "none",
};

const btnPrimary = {
  background:
    "linear-gradient(135deg, var(--accent, #7c6af7), var(--accent-light, #a78bfa))",
  border: "none",
  borderRadius: "8px",
  color: "#fff",
  padding: "9px 20px",
  fontWeight: "600",
  fontSize: "14px",
  cursor: "pointer",
};

const btnGhost = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  color: "#ccc",
  padding: "9px 20px",
  fontSize: "14px",
  cursor: "pointer",
};