// src/pages/Trade.jsx
import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import Navbar from "../components/Navbar";
import api from "../api/axiosInstance";
import "../styles/trade.css";

export default function Trade() {
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  const [selectedStock, setSelectedStock] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Ref to measure input position for portal dropdown
  const inputRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/companies");
        setCompanies(res.data ?? []);
      } catch (e) {
        setErr(getProblemMessage(e));
      } finally {
        setLoadingCompanies(false);
      }
    })();
  }, []);

  // Recalculate dropdown position whenever it opens
  useEffect(() => {
    if (dropdownOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "absolute",
        zIndex: 9999,
        top: "100%",
        left: 0,
        width: "100%",
        maxHeight: "220px",
        overflowY: "auto",
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: "0.375rem",
        listStyle: "none",
        margin: "0.25rem 0 0 0",
        padding: "0.25rem 0",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      });
    }
  }, [dropdownOpen, search]);

  const getProblemMessage = (e) => {
  const status = e?.response?.status;
  const data = e?.response?.data;

  if (!data) return e?.message || "Something went wrong.";

  // ASP.NET ModelState validation errors
  if (data.errors) {
    return Object.values(data.errors).flat().join(" ");
  }

  if (data.detail) return data.detail;
  if (data.title) return `${data.title}${status ? ` (HTTP ${status})` : ""}`;
  if (typeof data === "string") return data;

  return e?.message || "Trade failed.";
};

  const filtered = companies.filter((c) => {
    if (!c.symbol || !c.name) return false;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
    );
  });

  const selectCompany = (company) => {
    setSelectedStock({
      ...company,
      symbol: company.symbol?.trim().toUpperCase(),
    });
    setSearch(company.name);
    setDropdownOpen(false);
    setErr("");
    setMsg("");
  };

  const place = async (side) => {
    setMsg("");
    setErr("");

    if (!selectedStock) {
      setErr("Please select a company from the list.");
      return;
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setErr("Quantity must be >= 1.");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        symbol: selectedStock.symbol?.trim().toUpperCase(),
        quantity: qty,
      };

      const res = await api.post(`/api/trades/${side}`, body);

      const t = res.data || {};
      const shownSide = t.Side ?? t.side ?? side.toUpperCase();
      const shownQty = t.Quantity ?? t.quantity ?? qty;

      setMsg(
        `Success: ${shownSide} ${shownQty} × ${selectedStock.name} (${selectedStock.symbol})`
      );
      setSelectedStock(null);
      setSearch("");
      setQuantity(1);
    } catch (e) {
      setErr(getProblemMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  // Inline dropdown — renders directly below the input
  const DropdownList = () => {
    if (!dropdownOpen || filtered.length === 0) return null;

    return (
      <ul style={dropdownStyle}>
        {filtered.map((c, idx) => (
          <li
            key={`${c.symbol}-${idx}`}
            onMouseDown={() => selectCompany(c)}
            style={{
              padding: "0.5rem 0.75rem",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "#1e293b",
              fontSize: "0.9rem",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "#f1f5f9")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span>{c.name}</span>
            <span
              style={{
                fontSize: "0.75rem",
                color: "#6366f1",
                fontWeight: "600",
              }}
            >
              {c.symbol}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  console.log("company keys:", companies.map(c => Object.keys(c)));
console.log("first company:", companies[0]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />

      <div className="container-fluid py-4" style={{ flex: 1 }}>
        <div className="trade-hero">
          <h3>💱 Buy / Sell Stocks</h3>
        </div>

        {msg && <div className="alert alert-success py-3">✅ {msg}</div>}
        {err && <div className="alert alert-danger py-3">❌ {err}</div>}

        <div className="card trade-card">
          <div className="card-header">Place a Trade</div>
          <div className="card-body">
            <div className="row g-3">

              {/* Company Name searchable dropdown */}
              <div className="col-12 col-md-6">
                <label className="form-label">Company</label>
                <div style={{ position: "relative" }}>
                  <input
                    ref={inputRef}
                    className="form-control"
                    placeholder={
                      loadingCompanies
                        ? "Loading companies..."
                        : "Search by company name or symbol..."
                    }
                    value={search}
                    disabled={loadingCompanies}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSelectedStock(null);
                      setDropdownOpen(true);
                    }}
                    onFocus={() => setDropdownOpen(true)}
                    onBlur={() =>
                      setTimeout(() => setDropdownOpen(false), 200)
                    }
                    autoComplete="off"
                  />

                  {/* Rendered inline — appears directly below input */}
                  <DropdownList />
                </div>

                {selectedStock && (
                  <div className="form-text">
                    Symbol: <strong>{selectedStock.symbol}</strong>
                  </div>
                )}
                {!selectedStock && !loadingCompanies && (
                  <div className="form-text">
                    Type to search and select a company from the list.
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div className="col-12 col-md-6">
                <label className="form-label">Quantity</label>
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                <div className="form-text">Must be at least 1 share.</div>
              </div>

              {/* Action buttons */}
              <div className="col-12">
                <div className="trade-button-group">
                  <button
                    className="btn btn-success"
                    type="button"
                    disabled={submitting || !selectedStock}
                    onClick={() => place("buy")}
                  >
                    {submitting ? "Processing..." : "💰 Buy"}
                  </button>

                  <button
                    className="btn btn-danger"
                    type="button"
                    disabled={submitting || !selectedStock}
                    onClick={() => place("sell")}
                  >
                    {submitting ? "Processing..." : "📉 Sell"}
                  </button>

                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setMsg("");
                      setErr("");
                      setSelectedStock(null);
                      setSearch("");
                      setQuantity(1);
                    }}
                  >
                    🔄 Clear
                  </button>
                </div>
              </div>

              {/* Info box */}
              <div className="col-12">
                <div className="trade-info-box">
                  <small><strong>ℹ️ Backend Response Codes:</strong></small>
                  <ul className="mb-0">
                    <li><strong>404</strong> – Unknown or inactive symbol</li>
                    <li><strong>409</strong> – Fluctuation cooldown (~2 seconds required between trades)</li>
                    <li><strong>422</strong> – Insufficient holdings to sell or missing price data</li>
                  </ul>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div
          className="mt-4 p-3 rounded"
          style={{
            background: "rgba(59,130,246,.08)",
            border: "1px solid rgba(59,130,246,.2)",
          }}
        >
          <small className="text-muted">
            💡 After placing trades, view your executed trades in{" "}
            <code>/trades</code> (My Trades) and your portfolio holdings in{" "}
            <code>/portfolio</code>.
          </small>
        </div>
      </div>
    </div>
    
  );
}