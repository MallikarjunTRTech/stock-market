import React, { useEffect, useRef, useState } from "react";
import api from "../api/axiosInstance";

const parseError = (e) => {
  const data = e?.response?.data;
  const status = e?.response?.status;
  if (!data && !status) return e?.message || "Something went wrong.";
  if (!data || (typeof data === "object" && Object.keys(data).length === 0)) {
    if (status === 409) return "Already in watchlist.";
    if (status === 404) return "Company not found.";
    if (status === 400) return "Invalid request.";
  }
  if (data?.errors) return Object.values(data.errors).flat().join(" ");
  if (data?.detail) return data.detail;
  if (data?.title) return data.title;
  if (typeof data === "string") return data;
  return e.message || "Something went wrong.";
};

async function fetchStockDetail(companyId) {
  try {
    const res = await api.get(`/api/companies/${companyId}/stocks`);
    const stock = res.data?.stocks?.[0];
    return {
      availableStocks: stock?.availableStocks ?? null,
      currentPrice: stock?.price ?? null,
      initialPrice: stock?.initialPrice ?? null,
    };
  } catch {
    return { availableStocks: null, currentPrice: null, initialPrice: null };
  }
}

export default function Watchlist() {
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [items, setItems] = useState([]);
  const [stockDetails, setStockDetails] = useState({});
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const dropdownRef = useRef(null);

  // ✅ Fixed: added /api prefix
  async function load() {
    const res = await api.get("/api/watchlist");
    const data = res.data || [];
    setItems(data);
    return data;
  }

  async function loadStockDetails(watchlistItems, allCompanies) {
    const details = {};
    await Promise.all(
      watchlistItems.map(async (item) => {
        const company = allCompanies.find(
          (c) => c.symbol?.toUpperCase() === item.symbol?.toUpperCase()
        );
        if (!company?.id) return;
        const detail = await fetchStockDetail(company.id);
        details[item.symbol] = detail;
      })
    );
    setStockDetails(details);
  }

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        const [watchlistData, companiesRes] = await Promise.all([
          load(),
          api.get("/api/companies"),
        ]);
        const allCompanies = companiesRes.data || [];
        setCompanies(allCompanies);
        await loadStockDetails(watchlistData, allCompanies);
      } catch (e) {
        setErr(parseError(e));
      }
    })();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = companies.filter((c) => {
    if (!c.name) return false;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.symbol && c.symbol.toLowerCase().includes(q))
    );
  });

  const selectCompany = (company) => {
    setSelectedCompany(company);
    setSearch(company.name);
    setDropdownOpen(false);
    setErr("");
    setMsg("");
  };

  // ✅ Fixed: added /api prefix
  const add = async () => {
    try {
      setErr("");
      setMsg("");
      if (!selectedCompany?.symbol)
        return setErr("Please select a company from the list.");
      await api.post(`/api/watchlist/${encodeURIComponent(selectedCompany.symbol)}`);
      setMsg("Added to watchlist.");
      setSearch("");
      setSelectedCompany(null);
      const updated = await load();
      await loadStockDetails(updated, companies);
    } catch (e) {
      setErr(parseError(e));
    }
  };

  // ✅ Fixed: added /api prefix
  const remove = async (sym) => {
    try {
      setErr("");
      setMsg("");
      await api.delete(`/api/watchlist/${encodeURIComponent(sym)}`);
      setMsg("Removed.");
      const updated = await load();
      await loadStockDetails(updated, companies);
    } catch (e) {
      setErr(parseError(e));
    }
  };

  function PriceChange({ current, initial }) {
    if (current == null) return <span className="watchlist-price">—</span>;

    const hasInitial = initial != null && initial !== 0;
    const increased = hasInitial ? current > initial : null;
    const decreased = hasInitial ? current < initial : null;

    const arrow = increased ? "▲" : decreased ? "▼" : "●";
    const colorClass = increased
      ? "watchlist-price-up"
      : decreased
      ? "watchlist-price-down"
      : "watchlist-price-neutral";

    const pct =
      hasInitial
        ? (((current - initial) / initial) * 100).toFixed(2)
        : null;

    return (
      <span className={`watchlist-price ${colorClass}`}>
        ${Number(current).toFixed(4)} {arrow}
        {pct != null && (
          <span className="watchlist-price-pct"> ({pct}%)</span>
        )}
      </span>
    );
  }

  return (
    <div className="watchlist-container">
      <h3 className="watchlist-title">⭐ My Watchlist</h3>

      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-danger">{err}</div>}

      <div className="add-symbol-card">
        <div className="card-header">Add Company</div>
        <div className="card-body">
          <div className="add-symbol-input-group">
            <div ref={dropdownRef} style={{ position: "relative", flex: 1 }}>
              <input
                className="form-control"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedCompany(null);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                placeholder="Search by company name or symbol..."
              />

              {dropdownOpen && search && filtered.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    zIndex: 1000,
                    maxHeight: "200px",
                    overflowY: "auto",
                    marginTop: "4px",
                  }}
                >
                  {filtered.map((c) => (
                    <div
                      key={c.id}
                      onMouseDown={() => selectCompany(c)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        cursor: "pointer",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f5f0ff")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "#fff")
                      }
                    >
                      <span style={{ fontWeight: 500 }}>{c.name}</span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "#888",
                          backgroundColor: "#f0f0f0",
                          padding: "2px 8px",
                          borderRadius: "12px",
                        }}
                      >
                        {c.symbol}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="btn btn-primary add-symbol-btn" onClick={add}>
              ➕ Add
            </button>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="watchlist-empty">
          <div className="watchlist-empty-icon">📋</div>
          <p className="watchlist-empty-text">
            Your watchlist is empty. Add stocks to track them!
          </p>
        </div>
      ) : (
        <div className="watchlist-items">
          {items.map((x) => {
            const detail = stockDetails[x.symbol] || {};
            return (
              <div key={x.symbol} className="watchlist-card">
                <div className="watchlist-card-symbol">
                  {x.companyName ?? x.symbol}
                </div>

                <p className="watchlist-card-ticker">{x.symbol}</p>

                <div className="watchlist-card-stats">
                  <div className="watchlist-stat">
                    <span className="watchlist-stat-label">Available Stocks</span>
                    <span className="watchlist-stat-value">
                      {detail.availableStocks != null
                        ? detail.availableStocks.toLocaleString()
                        : "—"}
                    </span>
                  </div>

                  <div className="watchlist-stat">
                    <span className="watchlist-stat-label">Current Price</span>
                    <span className="watchlist-stat-value">
                      <PriceChange
                        current={detail.currentPrice}
                        initial={detail.initialPrice}
                      />
                    </span>
                  </div>
                </div>

                <div className="watchlist-card-added-row">
                  <span className="watchlist-card-label">Added</span>
                  <span className="watchlist-card-added">
                    {new Date(x.createdUtc).toLocaleString()}
                  </span>
                </div>

                <div className="watchlist-card-actions">
                  <button
                    className="watchlist-delete-btn"
                    onClick={() => remove(x.symbol)}
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}