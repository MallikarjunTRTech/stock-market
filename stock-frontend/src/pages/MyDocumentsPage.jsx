// src/pages/MyDocumentsPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const typeIcon = { NationalId: "🆔", Pancard: "💳", Selfie: "🤳" };

const statusMeta = {
  approved:  { color: "#4caf50", bg: "rgba(76,175,80,0.12)"  },
  rejected:  { color: "#f44336", bg: "rgba(244,67,54,0.12)"  },
  pending:   { color: "#ff9800", bg: "rgba(255,152,0,0.12)"  },
  submitted: { color: "#2196f3", bg: "rgba(33,150,243,0.12)" },
};

export default function MyDocumentsPage() {
  const navigate = useNavigate();

  const [docs,        setDocs]        = useState([]);
  const [err,         setErr]         = useState("");
  const [loading,     setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(null); // docId | null
  const [reuploading, setReuploading] = useState(null); // docId | null

  const fileInputRef  = useRef(null); // single hidden file input shared across all rows
  const pendingDocRef = useRef(null); // holds the doc object while file picker is open

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/kyc/documents");
        setDocs(res.data || []);
      } catch (e) {
        setErr(extractError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onView = async (doc) => {
    try {
      setErr("");
      const res  = await api.get(`/api/kyc/documents/${doc.id}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: res.headers["content-type"] });
      const url  = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setErr(extractError(e));
    }
  };

  const onDownload = async (doc) => {
    try {
      setErr("");
      setDownloading(doc.id);
      const res    = await api.get(`/api/kyc/documents/${doc.id}`, { responseType: "blob" });
      const blob   = new Blob([res.data], { type: res.headers["content-type"] });
      const url    = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href     = url;
      anchor.download = doc.originalFileName || `document-${doc.id}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setDownloading(null);
    }
  };

  // Step 1 — user clicks Re-upload: store the doc and open the file picker
  const onReuploadClick = (doc) => {
    pendingDocRef.current      = doc;
    fileInputRef.current.value = ""; // reset so picking the same file again still fires onChange
    fileInputRef.current.click();
  };

  // Step 2 — user picks a file: call PUT /api/kyc/documents/{id}/reupload
  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    const doc  = pendingDocRef.current;
    if (!file || !doc) return;

    try {
      setErr("");
      setReuploading(doc.id);

      const form = new FormData();
      form.append("file", file); // matches IFormFile File in KycDocumentReuploadRequest

      await api.put(`/api/kyc/documents/${doc.id}/reupload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Refresh list so status badge updates immediately
      const res = await api.get("/api/kyc/documents");
      setDocs(res.data || []);
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setReuploading(null);
      pendingDocRef.current = null;
    }
  };

  if (loading) {
    return (
      <div style={pageWrap}>
        <div style={card}>
          <div className="text-center text-muted py-5">Loading documents…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <div style={card}>

        {/* ── Header ── */}
        <div style={headerRow}>
          <div>
            <h4 style={{ color: "#fff", margin: "0 0 4px" }}>📄 My Documents</h4>
            <p style={{ color: "#888", fontSize: "13px", margin: 0 }}>
              Documents uploaded during KYC verification.
            </p>
          </div>
          <button style={btnGhost} onClick={() => navigate("/profile")}>
            ← Back to Profile
          </button>
        </div>

        <hr style={divider} />

        {err && <div className="alert alert-danger py-2 mb-3">{err}</div>}

        {/* Single hidden file input shared by all Re-upload buttons */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          style={{ display: "none" }}
          onChange={onFileChosen}
        />

        {/* ── Empty state ── */}
        {docs.length === 0 ? (
          <div style={emptyBox}>
            <span style={{ fontSize: "44px" }}>📭</span>
            <p style={{ color: "#666", margin: "12px 0 16px" }}>
              No documents uploaded yet.
            </p>
            <button style={btnPrimary} onClick={() => navigate("/kyc")}>
              Go to KYC page to upload →
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {docs.map((doc) => {
              const s             = statusMeta[(doc.status || "").toLowerCase()]
                                    ?? { color: "#aaa", bg: "rgba(255,255,255,0.05)" };
              const isDownloading = downloading === doc.id;
              const isReuploading = reuploading === doc.id;
              const isRejected    = (doc.status || "").toLowerCase() === "rejected";

              return (
                <div key={doc.id} style={docCard}>

                  {/* Left: icon + info */}
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={iconCircle}>
                      {typeIcon[doc.type] ?? "📎"}
                    </div>
                    <div>
                      <div style={{ color: "#e0e0e0", fontWeight: "600", fontSize: "14px" }}>
                        {doc.type}
                      </div>
                      <div style={{ color: "#888", fontSize: "12px", marginTop: "2px" }}>
                        {doc.originalFileName}
                      </div>
                      <div style={{ color: "#666", fontSize: "11px", marginTop: "2px" }}>
                        {new Date(doc.uploadedUtc).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Right: status + actions */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                    <span style={{ ...statusBadge, color: s.color, background: s.bg }}>
                      {doc.status}
                    </span>

                    {/* Rejection reason shown inline under the badge */}
                    {doc.rejectionReason && (
                      <div style={{ color: "#f44336", fontSize: "11px", maxWidth: "160px", textAlign: "right" }}>
                        {doc.rejectionReason}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button
                        style={actionBtn}
                        onClick={() => onView(doc)}
                        title="Open in new tab"
                      >
                        👁️ View
                      </button>

                      <button
                        style={{ ...actionBtn, opacity: isDownloading ? 0.6 : 1 }}
                        onClick={() => onDownload(doc)}
                        disabled={isDownloading}
                        title="Download file"
                      >
                        {isDownloading ? "⏳ Downloading…" : "⬇️ Download"}
                      </button>

                      {/* Re-upload only appears for rejected documents */}
                      {isRejected && (
                        <button
                          style={{
                            ...actionBtn,
                            borderColor: "rgba(244,67,54,0.5)",
                            color: "#f44336",
                            opacity: isReuploading ? 0.6 : 1,
                          }}
                          onClick={() => onReuploadClick(doc)}
                          disabled={isReuploading}
                          title="Replace this rejected document"
                        >
                          {isReuploading ? "⏳ Uploading…" : "🔄 Re-upload"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <hr style={divider} />

        <p style={{ color: "#666", fontSize: "12px", textAlign: "center", margin: 0 }}>
          Documents are reviewed by an admin. Status updates will reflect here.
        </p>
      </div>
    </div>
  );
}

// ── Styles (untouched) ────────────────────────────────────────────────────────

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
  maxWidth: "660px",
  boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
};

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
};

const emptyBox = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "40px 0",
};

const docCard = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "10px",
  gap: "12px",
  flexWrap: "wrap",
};

const iconCircle = {
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  background: "rgba(255,255,255,0.07)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
  flexShrink: 0,
};

const statusBadge = {
  display: "inline-block",
  padding: "3px 12px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: "600",
};

const actionBtn = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "6px",
  color: "#ccc",
  padding: "5px 10px",
  fontSize: "12px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const divider = {
  borderColor: "rgba(255,255,255,0.08)",
  margin: "20px 0",
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
  padding: "7px 16px",
  fontSize: "13px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};