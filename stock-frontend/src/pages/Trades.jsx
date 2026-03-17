// src/pages/Trades.jsx
import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../api/axiosInstance";

export default function Trades() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [take, setTake] = useState(50);

  const getProblemMessage = (e) => {
    // Your backend uses Problem(...) responses often, so prefer detail/title.
    const status = e?.response?.status;
    const detail = e?.response?.data?.detail;
    const title = e?.response?.data?.title;

    if (detail) return detail;
    if (title) return `${title}${status ? ` (HTTP ${status})` : ""}`;
    if (typeof e?.response?.data === "string") return e.response.data;
    return e?.message || "Failed to load trades.";
  };

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      // Uses your TradesController:
      // [HttpGet("me")] => GET /api/trades/me
      const res = await api.get("/api/trades/me");

      const data = Array.isArray(res.data) ? res.data : [];
      // Optional "take" limiting client-side:
      setRows(data.slice(0, take));
    } catch (e) {
      setErr(getProblemMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [take]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <div className="container-fluid py-4" style={{ flex: 1 }}>
        <div className="trades-header">
          <div className="trades-header-left">
            <h4>📈 My Trades</h4>
          </div>

          <div className="trades-controls">
            <div className="trades-pagination">
              <label htmlFor="take-select">Show</label>
              <select
                id="take-select"
                className="form-select form-select-sm"
                style={{ width: 90 }}
                value={take}
                onChange={(e) => setTake(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
              </select>
            </div>

            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={load}
              disabled={loading}
              type="button"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {loading && <div className="alert alert-info">⏳ Loading trades…</div>}
        {err && <div className="alert alert-danger">{err}</div>}

        {!loading && !err && rows.length === 0 && (
          <div className="alert alert-secondary">No trades found. Head to the Trade page to start!</div>
        )}

        {!loading && !err && rows.length > 0 && (
          <div className="card">
            <div className="card-header">Trade History</div>
            <div className="card-body p-0">
              <div className="trades-table">
                <table className="table table-striped table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Side</th>
                      <th className="text-end">Qty</th>
                      <th className="text-end">Price</th>
                      <th>Executed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t, idx) => {
                      const id = t.TradeId ?? t.tradeId ?? idx;
                      const sym = t.Symbol ?? t.symbol ?? "-";
                      const side = t.Side ?? t.side ?? "-";
                      const qty = t.Quantity ?? t.quantity ?? "-";
                      const price = t.PriceAtExecution ?? t.priceAtExecution;
                      const at = t.ExecutedAtUtc ?? t.executedAtUtc;

                      return (
                        <tr key={id}>
                          <td><span className="trade-symbol">{sym}</span></td>
                          <td>
                            <span className={`trade-side-${side.toLowerCase()}`}>
                              {side.toUpperCase()}
                            </span>
                          </td>
                          <td className="text-end">{qty}</td>
                          <td className="text-end">
                            {price == null ? "-" : Number(price).toFixed(4)}
                          </td>
                          <td>{at ? new Date(at).toLocaleString() : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}