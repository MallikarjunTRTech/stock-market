// src/pages/KycPage.jsx
import React, { useEffect, useRef, useState } from "react"; // ← added useRef
import api from "../api/axiosInstance";

function extractError(e) {
  const data = e?.response?.data;
  const status = e?.response?.status;

  if (!data && !status) return e?.message || "Something went wrong.";

  if (!data || (typeof data === "object" && Object.keys(data).length === 0)) {
    if (status === 409) return "A document of this type has already been uploaded.";
    if (status === 400) return "Invalid request. Please check your inputs.";
    if (status === 403) return "You are not allowed to perform this action.";
    if (status === 404) return "Resource not found.";
    if (status === 500) return "Server error. Please try again later.";
  }

  if (data.errors) return Object.values(data.errors).flat().join(" ");
  if (data.detail) return data.detail;
  if (data.title) return data.title;
  if (typeof data === "string") return data;
  return e?.message || "Something went wrong.";
}

const REQUIRED_DOC_TYPES = ["NationalId", "Pancard", "Selfie"];

export default function KycPage() {
  const [profile, setProfile] = useState(null);
  const [docs, setDocs] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    FullName: "",
    DateOfBirth: "",
    AddressLine1: "",
    City: "",
    Country: "",
  });

  const [docType, setDocType] = useState("NationalId");
  const [file, setFile] = useState(null);

  // ── NEW ──────────────────────────────────────────────────────────────────
  const [reuploading, setReuploading] = useState(null); // docId | null
  const fileInputRef  = useRef(null);  // hidden file input for re-upload
  const pendingDocRef = useRef(null);  // doc waiting for file pick
  // ─────────────────────────────────────────────────────────────────────────

  const uploadedTypes = docs.map((d) => d.type);
  const allDocsUploaded = REQUIRED_DOC_TYPES.every((t) =>
    uploadedTypes.includes(t)
  );
  const currentTypeAlreadyUploaded = uploadedTypes.includes(docType);

  async function loadAll() {
    try {
      const [p, d] = await Promise.all([
        api.get("/api/kyc/me"),
        api.get("/api/kyc/documents"),
      ]);
      setProfile(p.data);
      setDocs(d.data || []);

      const pr = p.data;
      setForm({
        FullName: pr.fullName || "",
        DateOfBirth: pr.dateOfBirth || "",
        AddressLine1: pr.addressLine1 || "",
        City: pr.city || "",
        Country: pr.country || "",
      });
    } catch (e) {
      setErr(extractError(e));
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        await loadAll();
      } catch (e) {
        setErr(extractError(e));
      }
    })();
  }, []);

  const onSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setErr("");
      setMsg("");
      const res = await api.put("/api/kyc/profile", {
        FullName: form.FullName || null,
        DateOfBirth: form.DateOfBirth || null,
        AddressLine1: form.AddressLine1 || null,
        City: form.City || null,
        Country: form.Country || null,
      });
      setProfile(res.data);
      setMsg("KYC profile saved.");
    } catch (e2) {
      setErr(extractError(e2));
    }
  };

  const onUpload = async (e) => {
    e.preventDefault();
    try {
      setErr("");
      setMsg("");

      if (!file) {
        setErr("Please choose a file.");
        return;
      }

      setUploading(true);

      const fd = new FormData();
      fd.append("Type", docType);
      fd.append("File", file);

      await api.post("/api/kyc/documents", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMsg(`Document uploaded successfully.`);
      setFile(null);
      const fileInput = document.getElementById("file-input");
      if (fileInput) fileInput.value = "";
      await loadAll();
    } catch (e2) {
      setErr(extractError(e2));
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async () => {
    try {
      setErr("");
      setMsg("");
      const res = await api.post("/api/kyc/submit");
      setMsg(`Submitted. Status: ${res.data.status}`);
      await loadAll();
    } catch (e2) {
      setErr(extractError(e2));
    }
  };

  // ── NEW: open hidden file picker for the rejected doc ────────────────────
  const onReuploadClick = (doc) => {
    pendingDocRef.current      = doc;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  // ── NEW: fires after user picks a file ───────────────────────────────────
  const onFileChosen = async (e) => {
    const chosenFile = e.target.files?.[0];
    const doc        = pendingDocRef.current;
    if (!chosenFile || !doc) return;

    try {
      setErr("");
      setMsg("");
      setReuploading(doc.id);

      const form = new FormData();
      form.append("file", chosenFile);

      await api.put(`/api/kyc/documents/${doc.id}/reupload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMsg(`${doc.type} re-uploaded successfully.`);
      await loadAll();
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setReuploading(null);
      pendingDocRef.current = null;
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="kyc-container">
      <h3 className="kyc-title">📋 KYC Verification</h3>

      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-danger">{err}</div>}

      {/* ── NEW: single hidden file input for re-uploads ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        style={{ display: "none" }}
        onChange={onFileChosen}
      />

      <div className="row g-3">
        <div className="col-md-6">
          <div className="kyc-card">
            <div className="card-header">My KYC Profile</div>
            <div className="card-body">
              {profile && (
                <div className="mb-2">
                  <span
                    className={`kyc-status-badge ${(
                      profile.status || ""
                    ).toLowerCase()}`}
                  >
                    Status: {profile.status}
                  </span>
                  {profile.submittedUtc && (
                    <small className="text-muted ms-2">
                      Submitted:{" "}
                      {new Date(profile.submittedUtc).toLocaleString()}
                    </small>
                  )}
                </div>
              )}

              <form onSubmit={onSaveProfile}>
                <div className="profile-field">
                  <label className="profile-field-label">Full Name</label>
                  <input
                    className="form-control"
                    value={form.FullName}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, FullName: e.target.value }))
                    }
                    placeholder="John Doe"
                  />
                </div>

                <div className="profile-field">
                  <label className="profile-field-label">Date of Birth</label>
                  <input
                    className="form-control"
                    placeholder="1990-01-31"
                    value={form.DateOfBirth}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, DateOfBirth: e.target.value }))
                    }
                  />
                  <small className="form-text">
                    Format: <code>YYYY-MM-DD</code>
                  </small>
                </div>

                <div className="profile-field">
                  <label className="profile-field-label">Address Line 1</label>
                  <input
                    className="form-control"
                    value={form.AddressLine1}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, AddressLine1: e.target.value }))
                    }
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="row">
                  <div className="col">
                    <div className="profile-field">
                      <label className="profile-field-label">City</label>
                      <input
                        className="form-control"
                        value={form.City}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, City: e.target.value }))
                        }
                        placeholder="New York"
                      />
                    </div>
                  </div>
                  <div className="col">
                    <div className="profile-field">
                      <label className="profile-field-label">Country</label>
                      <input
                        className="form-control"
                        placeholder="US"
                        value={form.Country}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, Country: e.target.value }))
                        }
                      />
                      <small className="form-text">
                        2-letter code (e.g., US, CA, UK)
                      </small>
                    </div>
                  </div>
                </div>

                <button className="btn btn-primary mt-4" type="submit">
                  💾 Save Profile
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="kyc-card">
            <div className="card-header">Upload KYC Documents</div>
            <div className="card-body">
              {allDocsUploaded ? (
                <div className="alert alert-success">
                  ✅ All required documents have been uploaded. No further
                  uploads needed.
                </div>
              ) : (
                <fieldset disabled={uploading}>
                  <form onSubmit={onUpload}>
                    <div className="mb-3">
                      <label className="form-label">Document Type</label>
                      <select
                        className="form-select"
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                      >
                        <option value="NationalId">
                          🆔 National ID{" "}
                          {uploadedTypes.includes("NationalId") ? "✅" : ""}
                        </option>
                        <option value="Pancard">
                          💳 Pancard{" "}
                          {uploadedTypes.includes("Pancard") ? "✅" : ""}
                        </option>
                        <option value="Selfie">
                          🤳 Selfie{" "}
                          {uploadedTypes.includes("Selfie") ? "✅" : ""}
                        </option>
                      </select>

                      {currentTypeAlreadyUploaded && (
                        <small className="text-warning mt-1 d-block">
                          ⚠️ You have already uploaded a{" "}
                          <strong>{docType}</strong> document. Uploading again
                          will be rejected by the server.
                        </small>
                      )}
                    </div>

                    <div className="mb-3">
                      <label className="form-label">
                        File (jpg/png/pdf, max 10MB)
                      </label>
                      <div className="document-upload">
                        <input
                          type="file"
                          className="form-control"
                          onChange={(e) =>
                            setFile(e.target.files?.[0] || null)
                          }
                          id="file-input"
                        />
                        <label
                          htmlFor="file-input"
                          style={{ marginBottom: 0, cursor: "pointer" }}
                        >
                          📤 Click to upload or drag file here
                        </label>
                      </div>
                    </div>

                    <button
                      className="btn btn-success"
                      type="submit"
                      disabled={uploading || currentTypeAlreadyUploaded}
                    >
                      {uploading ? "Uploading..." : "✅ Upload Document"}
                    </button>
                  </form>
                </fieldset>
              )}

              <hr />

              <div className="submit-section">
                <button
                  className="btn btn-warning submit-btn"
                  onClick={onSubmit}
                >
                  🚀 Submit KYC for Review
                </button>
                <small className="text-muted d-block mt-2">
                  Upload required documents (National ID, Pancard, Selfie)
                  before submitting.
                </small>
              </div>
            </div>
          </div>

          <div className="kyc-card mt-3">
            <div className="card-header">My Documents</div>
            <div className="card-body">
              {docs.length === 0 ? (
                <div className="text-muted">No documents uploaded yet.</div>
              ) : (
                <div className="documents-table">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Status</th>
                        <th>File</th>
                        <th>Uploaded</th>
                        <th /> {/* ── NEW: action column ── */}
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map((d) => {
                        const isRejected    = (d.status || "").toLowerCase() === "rejected";
                        const isReuploading = reuploading === d.id;

                        return (
                          <tr key={d.id}>
                            <td>
                              <span className="doc-type">{d.type}</span>
                            </td>
                            <td>
                              <span
                                className={`doc-status ${(d.status || "").toLowerCase()}`}
                              >
                                {d.status}
                              </span>
                              {d.rejectionReason && (
                                <div className="text-danger small mt-1">
                                  {d.rejectionReason}
                                </div>
                              )}
                            </td>
                            <td className="small">{d.originalFileName}</td>
                            <td className="small">
                              {new Date(d.uploadedUtc).toLocaleString()}
                            </td>

                            {/* ── NEW: re-upload button, only for rejected docs ── */}
                            <td className="text-end">
                              {isRejected && (
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  disabled={isReuploading}
                                  onClick={() => onReuploadClick(d)}
                                  title="Replace this rejected document"
                                >
                                  {isReuploading ? "⏳ Uploading…" : "🔄 Re-upload"}
                                </button>
                              )}
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <small className="text-muted">
                Admin will review and accept/reject each document.
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}