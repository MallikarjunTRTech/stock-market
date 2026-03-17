// src/pages/DashboardPage.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axiosInstance";
import LivePriceChart from "../components/LivePriceChart";

export default function DashboardPage() {
  const [summary, setSummary] = useState([]);
  const [trades, setTrades] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        const [s, t] = await Promise.all([
          api.get("/portfolio/summary"),
          api.get("/reports/trades", { params: { take: 10 } }),
        ]);
        setSummary((s.data || []).filter(r => r.netQuantity > 0)); 
        setTrades(t.data || []);
      } catch (e) {
        setErr(e?.response?.data?.detail || e.message || "Failed to load dashboard");
      }
    })();
  }, []);

  return (
    <div className="dashboard-container">
      <h3 className="dashboard-title">📊 Dashboard</h3>
      {err && <div className="alert alert-danger">{err}</div>}

      {/* Live Candlestick Chart */}
      <LivePriceChart />

      {/* Recent Trades — full width below chart */}
      <div style={{
        background: "#0f0f1a",
        border: "1px solid #1e1e3a",
        borderRadius: 14,
        padding: 20,
        marginBottom: 24,
      }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
          🕐 Recent Trades
        </div>
        {trades.length === 0 ? (
          <div style={{ color: "#555" }}>No trades yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "#555", borderBottom: "1px solid #1e1e3a" }}>
                <th style={{ textAlign: "left", padding: "6px 10px" }}>Symbol</th>
                <th style={{ textAlign: "left", padding: "6px 10px" }}>Side</th>
                <th style={{ textAlign: "right", padding: "6px 10px" }}>Qty</th>
                <th style={{ textAlign: "right", padding: "6px 10px" }}>Price</th>
                <th style={{ textAlign: "right", padding: "6px 10px" }}>Total</th>
                <th style={{ textAlign: "right", padding: "6px 10px" }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => {
                const isBuy = t.side.toLowerCase() === "buy";
                return (
                  <tr
                    key={t.id}
                    style={{
                      borderBottom: "1px solid #13132a",
                      background: i % 2 === 0 ? "#0f0f1a" : "#11111f",
                    }}
                  >
                    <td style={{ padding: "8px 10px", color: "#fff", fontWeight: 700 }}>
                      {t.symbol}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{
                        background: isBuy ? "#22c55e22" : "#ef444422",
                        color: isBuy ? "#22c55e" : "#ef4444",
                        padding: "2px 10px",
                        borderRadius: 20,
                        fontWeight: 700,
                        fontSize: 11,
                      }}>
                        {isBuy ? "▲ BUY" : "▼ SELL"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", color: "#ccc", textAlign: "right" }}>
                      {t.quantity}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#ccc", textAlign: "right" }}>
                      ${Number(t.price).toFixed(2)}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#fff", fontWeight: 600, textAlign: "right" }}>
                      ${(t.quantity * t.price).toFixed(2)}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#555", textAlign: "right" }}>
                      {new Date(t.executedAtUtc).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Portfolio Summary */}
      <div style={{
        background: "#0f0f1a",
        border: "1px solid #1e1e3a",
        borderRadius: 14,
        padding: 20,
      }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
          💼 Portfolio Summary
        </div>
        {summary.length === 0 ? (
          <div style={{ color: "#555" }}>No holdings yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "#555", borderBottom: "1px solid #1e1e3a" }}>
                <th style={{ textAlign: "left", padding: "6px 10px" }}>Symbol</th>
                <th style={{ textAlign: "right", padding: "6px 10px" }}>Net Qty</th>
                <th style={{ textAlign: "right", padding: "6px 10px" }}>Avg Buy</th>
                <th style={{ textAlign: "right", padding: "6px 10px" }}>Buy Cost</th>
                <th style={{ textAlign: "right", padding: "6px 10px" }}>Sell Proceeds</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((r, i) => (
                <tr
                  key={r.symbol}
                  style={{
                    borderBottom: "1px solid #13132a",
                    background: i % 2 === 0 ? "#0f0f1a" : "#11111f",
                  }}
                >
                  <td style={{ padding: "8px 10px", color: "#fff", fontWeight: 700 }}>{r.symbol}</td>
                  <td style={{ padding: "8px 10px", color: "#ccc", textAlign: "right" }}>{r.netQuantity}</td>
                  <td style={{ padding: "8px 10px", color: "#ccc", textAlign: "right" }}>${Number(r.avgBuyPrice).toFixed(2)}</td>
                  <td style={{ padding: "8px 10px", color: "#ccc", textAlign: "right" }}>${Number(r.totalBuyCost).toFixed(2)}</td>
                  <td style={{ padding: "8px 10px", color: "#22c55e", textAlign: "right" }}>${Number(r.totalSellProceeds).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}