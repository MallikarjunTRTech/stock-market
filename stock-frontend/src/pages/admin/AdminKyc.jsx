// src/pages/admin/AdminKyc.jsx
import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";

export default function AdminKyc() {
  const [status, setStatus] = useState("");
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);

  const [note, setNote] = useState("");
  const [decisions, setDecisions] = useState({});

  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function loadList() {
    try {
      setErr("");
      const res = await api.get("/api/admin/kyc", {
        params: { status: status || undefined, take: 200 },
      });
      setItems(res.data || []);
    } catch (e) {
      setErr(extractError(e));
    }
  }

  async function loadProfile(kycProfileId) {
    try {
      setErr("");
      const res = await api.get(`/api/admin/kyc/${kycProfileId}`);
      setSelected(res.data);
      setNote("");
      setDecisions({});
    } catch (e) {
      setErr(extractError(e));
    }
  }

  function extractError(e) {
    const data = e?.response?.data;
    if (!data) return e?.message || "Something went wrong.";
    if (data.errors) return Object.values(data.errors).flat().join(" ");
    if (data.detail) return data.detail;
    if (data.title) return data.title;
    if (typeof data === "string") return data;
    return e?.message || "Something went wrong.";
  }

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        await loadList();
      } catch (e) {
        setErr(extractError(e));
      }
    })();
  }, []);

  const applyDecision = (docId, field, value) => {
    setDecisions((p) => ({
      ...p,
      [docId]: { ...(p[docId] || {}), [field]: value },
    }));
  };

  const buildRequest = () => {
    const docDecisions = Object.entries(decisions).map(([docId, d]) => ({
      DocumentId: docId,
      Status: d.Status || "Accepted",
      RejectionReason: d.RejectionReason || null,
    }));

    return {
      Note: note || null,
      DocumentDecisions: docDecisions.length ? docDecisions : null,
    };
  };

  const approve = async () => {
    try {
      setErr("");
      setMsg("");
      await api.post(`/api/admin/kyc/${selected.id}/approve`, buildRequest());
      setMsg("Approved.");
      await loadProfile(selected.id);
      await loadList();
    } catch (e) {
      setErr(extractError(e));
    }
  };

  const reject = async () => {
    try {
      setErr("");
      setMsg("");
      await api.post(`/api/admin/kyc/${selected.id}/reject`, buildRequest());
      setMsg("Rejected.");
      await loadProfile(selected.id);
      await loadList();
    } catch (e) {
      setErr(extractError(e));
    }
  };

  // ── Download: fetches as blob + triggers save dialog, also viewable on open ──
  const downloadDoc = async (docId) => {
    try {
      setErr("");
      const res = await api.get(`/api/admin/kyc/documents/${docId}/download`, {
        responseType: "blob",
      });

      const disposition = res.headers["content-disposition"] || "";
      const match = disposition.match(/filename[^;=\n]*=["']?([^"';\n]+)["']?/i);
      const filename = match ? match[1].trim() : `document-${docId}`;

      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(extractError(e));
    }
  };

  return (
    <div className="admin-container">
      <h3 className="admin-title">
        <span className="admin-badge">Admin</span>
        KYC Verification
      </h3>

      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-danger">{err}</div>}

      <div className="row g-3">
        <div className="col-md-5">
          <div className="kyc-queue-card">
            <div className="card-header">KYC Queue</div>
            <div className="card-body p-0">
              <div className="kyc-filter p-3">
                <label className="kyc-filter-label">Filter by Status</label>
                <select
                  className="kyc-filter-select"
                  value={status}
                  onChange={async (e) => {
                    setStatus(e.target.value);
                    setTimeout(loadList, 0);
                  }}
                >
                  <option value="">(all)</option>
                  <option value="NotStarted">NotStarted</option>
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div style={{ paddingLeft: "1rem", paddingRight: "1rem" }}>
                <button
                  className="btn btn-outline-secondary btn-sm w-100 mb-2"
                  onClick={loadList}
                >
                  🔄 Refresh List
                </button>
              </div>

              {items.length === 0 ? (
                <div className="text-muted p-3">No profiles found.</div>
              ) : (
                <div className="kyc-queue-list">
                  {items.map((x) => (
                    <div key={x.kycProfileId} className="kyc-queue-item">
                      <div className="kyc-queue-item-info">
                        <h6 className="kyc-queue-item-id">User: {x.userName}</h6>
                        <p className="kyc-queue-item-meta">
                          {x.status} • {new Date(x.createdUtc).toLocaleString()}
                        </p>
                      </div>
                      <button
                        className="btn btn-primary kyc-queue-item-btn"
                        onClick={() => loadProfile(x.kycProfileId)}
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-7">
          <div className="kyc-profile-card">
            <div className="card-header">Selected Profile</div>
            <div className="card-body">
              {!selected ? (
                <div className="text-muted">
                  👈 Select a KYC profile from the left to review.
                </div>
              ) : (
                <>
                  <div className="kyc-profile-header">
                    <span
                      className={`kyc-status-badge ${(selected.status || "").toLowerCase()}`}
                    >
                      Status: {selected.status}
                    </span>
                    <small className="text-muted">User: {selected.userName}</small>
                  </div>

                  <div className="kyc-profile-info">
                    <div className="kyc-profile-field">
                      <span className="kyc-profile-field-label">Full Name</span>
                      <span className="kyc-profile-field-value">{selected.fullName || "-"}</span>
                    </div>
                    <div className="kyc-profile-field">
                      <span className="kyc-profile-field-label">Date of Birth</span>
                      <span className="kyc-profile-field-value">{selected.dateOfBirth || "-"}</span>
                    </div>
                    <div className="kyc-profile-field">
                      <span className="kyc-profile-field-label">Address</span>
                      <span className="kyc-profile-field-value">{selected.addressLine1 || "-"}</span>
                    </div>
                    <div className="kyc-profile-field">
                      <span className="kyc-profile-field-label">City</span>
                      <span className="kyc-profile-field-value">{selected.city || "-"}</span>
                    </div>
                    <div className="kyc-profile-field">
                      <span className="kyc-profile-field-label">Country</span>
                      <span className="kyc-profile-field-value">{selected.country || "-"}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Admin Note (optional)</label>
                    <textarea
                      className="kyc-note-textarea"
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add any notes about this KYC submission..."
                    />
                  </div>

                  <div className="kyc-documents-table">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Current Status</th>
                          <th>Decision</th>
                          <th>Reason (if rejected)</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {(selected.documents || []).map((d) => (
                          <tr key={d.id}>
                            <td>
                              <span className="kyc-doc-type">{d.type}</span>
                            </td>
                            <td>{d.status}</td>
                            <td style={{ minWidth: 170 }}>
                              <select
                                className="form-select form-select-sm"
                                value={decisions[d.id]?.Status || ""}
                                onChange={(e) =>
                                  applyDecision(d.id, "Status", e.target.value)
                                }
                              >
                                <option value="">(no change)</option>
                                <option value="Accepted">✅ Accepted</option>
                                <option value="Rejected">❌ Rejected</option>
                              </select>
                            </td>
                            <td>
                              <input
                                className="form-control form-control-sm"
                                value={decisions[d.id]?.RejectionReason || ""}
                                onChange={(e) =>
                                  applyDecision(d.id, "RejectionReason", e.target.value)
                                }
                                placeholder="Why reject?"
                              />
                            </td>

                            {/* ── Only this <td> changed ── */}
                            <td className="text-end">
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                style={{ color: "black" }}
                                title="Download & view document"
                                onClick={() => downloadDoc(d.id)}
                              >
                                ⬇️ Download & View
                              </button>
                            </td>

                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="kyc-actions">
                    <button className="btn btn-success kyc-action-btn" onClick={approve}>
                      ✅ Approve
                    </button>
                    <button className="btn btn-danger kyc-action-btn" onClick={reject}>
                      ❌ Reject
                    </button>
                  </div>

                  <small className="text-muted d-block mt-2">
                    Your backend will block approval unless all documents are
                    Accepted (depending on your KycService rules).
                  </small>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}