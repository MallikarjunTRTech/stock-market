import React, { useEffect, useState } from "react";
import api from "../api/axiosInstance";

function extractError(e) {
  const data = e?.response?.data;
  const status = e?.response?.status;
  if (!data && !status) return e?.message || "Something went wrong.";
  if (!data || (typeof data === "object" && Object.keys(data).length === 0)) {
    if (status === 409) return "Conflict: this action could not be completed.";
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

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [tradeState, setTradeState] = useState(null);

  async function loadPortfolio() {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/api/portfolio/me");
      setPortfolio(res.data);
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await api.get("/api/portfolio/me");
        if (!mounted) return;
        setPortfolio(res.data);
      } catch (e) {
        if (!mounted) return;
        setErr(extractError(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  function openTrade(symbol, side) {
    setTradeState({ symbol, side, quantity: 1, loading: false });
    setErr("");
    setMsg("");
  }

  function cancelTrade() {
    setTradeState(null);
  }

  const onExecuteTrade = async () => {
    if (!tradeState) return;
    const { symbol, side, quantity } = tradeState;

    if (!quantity || quantity < 1) {
      setErr("Quantity must be at least 1.");
      return;
    }

    setTradeState((prev) => ({ ...prev, loading: true }));
    setErr("");
    setMsg("");

    try {
      const endpoint = side === "Buy" ? "/api/trades/buy" : "/api/trades/sell";
      await api.post(endpoint, { symbol, quantity: Number(quantity) });
      setMsg(`${side} order for ${quantity}x ${symbol} executed successfully!`);
      setTradeState(null);
      await loadPortfolio();
    } catch (e) {
      setErr(extractError(e));
      setTradeState((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="container-fluid portfolio-container px-4">
      <h3 className="portfolio-title">📁 My Portfolio</h3>

      {msg && <div className="alert alert-success">{msg}</div>}

      {loading && (
        <div className="loading-state">
          <div className="spinner-border text-primary" role="status" />
          <p>Loading portfolio...</p>
        </div>
      )}

      {err && <div className="alert alert-danger">{err}</div>}

      {!loading && !err && (!portfolio?.items || portfolio.items.length === 0) && (
        <div className="alert alert-secondary">
          📌 No holdings yet. Visit the <strong>Trade</strong> page to buy your first stock!
        </div>
      )}

      {!loading && !err && portfolio?.items?.length > 0 && (
        <>
          <div className="portfolio-stats">
            <div className="stat-card">
              <span className="stat-card-label">💰 Total Portfolio Value</span>
              <p className="stat-card-value success">
                ${portfolio.totalMarketValue?.toFixed(2) ?? "0.00"}
              </p>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">📊 Total Holdings</span>
              <p className="stat-card-value">
                {portfolio.items.length}{" "}
                {portfolio.items.length === 1 ? "stock" : "stocks"}
              </p>
            </div>
          </div>

          {tradeState && (
            <div className="alert alert-info d-flex align-items-center gap-3 flex-wrap mb-3">
              <span>
                <strong>{tradeState.side}</strong> —{" "}
                <span className="holding-symbol">{tradeState.symbol}</span>
              </span>
              <input
                type="number"
                min={1}
                className="form-control"
                style={{ width: "100px" }}
                value={tradeState.quantity}
                onChange={(e) =>
                  setTradeState((prev) => ({ ...prev, quantity: e.target.value }))
                }
                placeholder="Qty"
              />
              <button
                className={`btn btn-sm ${
                  tradeState.side === "Buy" ? "btn-success" : "btn-danger"
                }`}
                onClick={onExecuteTrade}
                disabled={tradeState.loading}
              >
                {tradeState.loading ? "Processing..." : `Confirm ${tradeState.side}`}
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={cancelTrade}
                disabled={tradeState.loading}
              >
                Cancel
              </button>
            </div>
          )}

          <div className="holdings-card">
            <div className="card-header">📊 Holdings</div>
            <div className="card-body p-0">
              <div className="holdings-table">
                <table>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Company</th>
                      <th>Quantity</th>
                      <th>Current Price</th>
                      <th>Market Value</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.items.map((item, idx) => {
                      const isTrading = tradeState?.symbol === item.symbol;
                      return (
                        <tr key={item.symbol ?? idx}>
                          <td><span className="holding-symbol">{item.symbol}</span></td>
                          <td><span className="holding-company">{item.companyName}</span></td>
                          <td><span className="holding-quantity">{item.quantity}</span></td>
                          <td><span className="holding-price">${item.currentPrice?.toFixed(2)}</span></td>
                          <td><span className="holding-value">${item.marketValue?.toFixed(2)}</span></td>
                          <td>
                            <div className="d-flex gap-2">
                              <button
                                className={`btn btn-sm ${
                                  isTrading && tradeState.side === "Buy"
                                    ? "btn-success"
                                    : "btn-outline-success"
                                }`}
                                onClick={() =>
                                  isTrading && tradeState.side === "Buy"
                                    ? cancelTrade()
                                    : openTrade(item.symbol, "Buy")
                                }
                              >
                                Buy More
                              </button>
                              <button
                                className={`btn btn-sm ${
                                  isTrading && tradeState.side === "Sell"
                                    ? "btn-danger"
                                    : "btn-outline-danger"
                                }`}
                                onClick={() =>
                                  isTrading && tradeState.side === "Sell"
                                    ? cancelTrade()
                                    : openTrade(item.symbol, "Sell")
                                }
                              >
                                Sell ({item.quantity})
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}