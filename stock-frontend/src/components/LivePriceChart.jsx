// src/components/LivePriceChart.jsx
import React, { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import api from "../api/axiosInstance";

const POLL_INTERVAL = 4000;
const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899"];

function getCurrentHourTs() {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return Math.floor(now.getTime() / 1000);
}

// ── Bucket any candle array into 1h candles ───────────────────────────────────
function bucketToHourly(candles) {
  const buckets = {};
  candles.forEach((c) => {
    // floor the candle's timestamp to its hour
    const d = new Date(c.time * 1000);
    d.setMinutes(0, 0, 0);
    const hTs = Math.floor(d.getTime() / 1000);

    if (!buckets[hTs]) {
      buckets[hTs] = { time: hTs, open: c.open, high: c.high, low: c.low, close: c.close };
    } else {
      buckets[hTs].high  = Math.max(buckets[hTs].high,  c.high);
      buckets[hTs].low   = Math.min(buckets[hTs].low,   c.low);
      buckets[hTs].close = c.close;
    }
  });
  return Object.values(buckets).sort((a, b) => a.time - b.time);
}

export default function LivePriceChart() {
  const chartContainerRef = useRef(null);
  const chartRef          = useRef(null);
  const seriesMapRef      = useRef({});
  const candleMapRef      = useRef({});
  const symbolsRef        = useRef([]);
  const selectedSymbolRef = useRef(null);
  const latestPricesRef   = useRef({});
  const avgBuyPricesRef   = useRef({});

  const [symbols,        setSymbols]        = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [latestPrices,   setLatestPrices]   = useState({});
  const [avgBuyPrices,   setAvgBuyPrices]   = useState({});

  useEffect(() => { symbolsRef.current        = symbols;        }, [symbols]);
  useEffect(() => { selectedSymbolRef.current = selectedSymbol; }, [selectedSymbol]);

  // ── Create chart once ──────────────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width:  chartContainerRef.current.clientWidth,
      height: 340,
      layout: {
        background: { color: "#0d0d1a" },
        textColor:  "#666",
      },
      grid: {
        vertLines: { color: "#13132a" },
        horzLines: { color: "#13132a" },
      },
      crosshair: { mode: 1 },
      rightPriceScale: {
        borderColor:  "#1e1e3a",
        scaleMargins: { top: 0.15, bottom: 0.15 },
      },
      timeScale: {
        borderColor:    "#1e1e3a",
        timeVisible:    true,
        secondsVisible: false,
        tickMarkFormatter: (ts) => {
          const d = new Date(ts * 1000);
          return `${String(d.getHours()).padStart(2, "0")}:00`;
        },
      },
    });

    chartRef.current = chart;

    const ro = new ResizeObserver(() => {
      if (chartContainerRef.current)
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    });
    ro.observe(chartContainerRef.current);

    return () => { ro.disconnect(); chart.remove(); };
  }, []);

  // ── Load history + avg buy prices together on mount ────────────
  useEffect(() => {
    const init = async () => {
      try {
        const [histRes, pricesRes] = await Promise.all([
          api.get("/api/portfolio/holdings/history"),
          api.get("/api/portfolio/holdings/prices"),
        ]);

        const histData      = histRes.data   || [];
        const holdingPrices = pricesRes.data || [];

        const avgMap = {};
        holdingPrices.forEach((h) => {
          avgMap[h.symbol] = Number(h.averageBuyPrice);
        });
        avgBuyPricesRef.current = avgMap;
        setAvgBuyPrices(avgMap);

        if (!histData.length || !chartRef.current) return;

        const syms = histData.map((d) => d.symbol);
        setSymbols(syms);
        setSelectedSymbol(syms[0]);
        symbolsRef.current        = syms;
        selectedSymbolRef.current = syms[0];

        histData.forEach((item) => {
          if (!seriesMapRef.current[item.symbol]) {
            const series = chartRef.current.addSeries(CandlestickSeries, {
              upColor:         "#22c55e",
              downColor:       "#ef4444",
              borderUpColor:   "#22c55e",
              borderDownColor: "#ef4444",
              wickUpColor:     "#22c55e",
              wickDownColor:   "#ef4444",
              visible: item.symbol === syms[0],
            });
            seriesMapRef.current[item.symbol] = series;
          }

          if (item.candles.length > 0) {
            // ── Bucket history into hourly candles ────────────────
            const hourly = bucketToHourly(item.candles);
            seriesMapRef.current[item.symbol].setData(hourly);

            const last = hourly[hourly.length - 1];
            // ── Seed candleMapRef so the live poller continues it ─
            candleMapRef.current[item.symbol]    = { ...last };
            latestPricesRef.current[item.symbol] = last.close;
          }
        });

        chartRef.current.timeScale().fitContent();
      } catch (e) {
        console.error("Init load error:", e);
      }
    };

    init();
  }, []);

  // ── Live polling ───────────────────────────────────────────────
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res      = await api.get("/api/portfolio/holdings/prices");
        const holdings = res.data || [];
        if (!chartRef.current) return;

        const updatedSymbols = holdings.map((h) => h.symbol);
        setSymbols(updatedSymbols);
        symbolsRef.current = updatedSymbols;

        if (!updatedSymbols.includes(selectedSymbolRef.current)) {
          const next = updatedSymbols[0] ?? null;
          setSelectedSymbol(next);
          selectedSymbolRef.current = next;
        }

        Object.keys(seriesMapRef.current).forEach((sym) => {
          if (!updatedSymbols.includes(sym)) {
            chartRef.current.removeSeries(seriesMapRef.current[sym]);
            delete seriesMapRef.current[sym];
            delete candleMapRef.current[sym];
            delete latestPricesRef.current[sym];
            delete avgBuyPricesRef.current[sym];
          }
        });

        if (!holdings.length) {
          setLatestPrices({});
          setAvgBuyPrices({});
          return;
        }

        const nowTs     = getCurrentHourTs();
        const newPrices = {};

        holdings.forEach((h) => {
          const price = Number(h.currentPrice);
          const sym   = h.symbol;

          newPrices[sym] = price;

          if (h.averageBuyPrice != null) {
            avgBuyPricesRef.current[sym] = Number(h.averageBuyPrice);
          }

          if (!seriesMapRef.current[sym]) {
            const series = chartRef.current.addSeries(CandlestickSeries, {
              upColor:         "#22c55e",
              downColor:       "#ef4444",
              borderUpColor:   "#22c55e",
              borderDownColor: "#ef4444",
              wickUpColor:     "#22c55e",
              wickDownColor:   "#ef4444",
              visible: sym === selectedSymbolRef.current,
            });
            seriesMapRef.current[sym] = series;
          }

          const existing = candleMapRef.current[sym];

          if (!existing || existing.time !== nowTs) {
            // ── New hour: open is previous close (or current price if no history) ──
            candleMapRef.current[sym] = {
              time:  nowTs,
              open:  existing?.close ?? price,
              high:  price,
              low:   price,
              close: price,
            };
          } else {
            // ── Same hour: NEVER touch open, only expand high/low and update close ──
            existing.high  = Math.max(existing.high, price);
            existing.low   = Math.min(existing.low,  price);
            existing.close = price;
            // existing.open stays untouched — this is what gives the candle a body
          }

          seriesMapRef.current[sym].update(candleMapRef.current[sym]);
        });

        latestPricesRef.current = newPrices;
        setLatestPrices(newPrices);
        setAvgBuyPrices({ ...avgBuyPricesRef.current });

      } catch (e) {
        console.error("Poll error:", e);
      }
    };

    fetchPrices();
    const id = setInterval(fetchPrices, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // ── Show/hide series on tab switch ────────────────────────────
  useEffect(() => {
    if (!selectedSymbol) return;
    Object.entries(seriesMapRef.current).forEach(([sym, series]) => {
      series.applyOptions({ visible: sym === selectedSymbol });
    });
  }, [selectedSymbol]);

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={{
      background:   "#0d0d1a",
      borderRadius: 14,
      padding:      20,
      marginBottom: 24,
      border:       "1px solid #1e1e3a",
    }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>
            📈 {selectedSymbol ?? "Live Market"}
          </span>
          <span style={{
            background: "#22c55e22", color: "#22c55e",
            fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
          }}>● LIVE</span>
        </div>
        <span style={{ color: "#444", fontSize: 12 }}>1 candle = 1 hour • 24h view</span>
      </div>

      {/* Ticker Cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        {symbols.map((sym, i) => {
          const cur    = latestPrices[sym] ?? 0;
          const avg    = avgBuyPrices[sym] ?? cur;
          const change = cur - avg;
          const pct    = avg ? (change / avg) * 100 : 0;
          const isUp   = change >= 0;
          const isSel  = selectedSymbol === sym;

          return (
            <div
              key={sym}
              onClick={() => setSelectedSymbol(sym)}
              style={{
                background:   "#13132a",
                border:       `1px solid ${isSel ? COLORS[i % COLORS.length] : "#1e1e3a"}`,
                borderRadius: 10,
                padding:      "10px 16px",
                cursor:       "pointer",
                minWidth:     160,
                flex:         "1 1 160px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#aaa", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{sym}</span>
                <span style={{ fontSize: 18, color: isUp ? "#22c55e" : "#ef4444", fontWeight: 900 }}>
                  {isUp ? "▲" : "▼"}
                </span>
              </div>
              <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: "4px 0" }}>
                ${Number(cur).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ color: isUp ? "#22c55e" : "#ef4444", fontSize: 12, fontWeight: 600 }}>
                {isUp ? "+" : ""}{change.toFixed(2)} ({isUp ? "+" : ""}{pct.toFixed(2)}%)
              </div>
              <div style={{ color: "#555", fontSize: 10, marginTop: 4 }}>
                avg buy ${Number(avg).toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Symbol Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {symbols.map((sym, i) => (
          <button
            key={sym}
            onClick={() => setSelectedSymbol(sym)}
            style={{
              background:   selectedSymbol === sym ? COLORS[i % COLORS.length] : "#13132a",
              color:        selectedSymbol === sym ? "#fff" : "#666",
              border:       "none",
              borderRadius: 6,
              padding:      "5px 16px",
              fontSize:     12,
              fontWeight:   700,
              cursor:       "pointer",
            }}
          >
            {sym}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} style={{ width: "100%", borderRadius: 8, overflow: "hidden" }} />
    </div>
  );
}