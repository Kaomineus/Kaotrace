"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchKlines, type Candle } from "@/lib/binance";

const GREEN = "#1e7a46", RED = "#b3382c", GOLD = "#b8860b", INK = "#191919", MUT = "#8a8578";

const SYMBOLS = ["BTCUSDT", "ETHUSDT"] as const;
const INTERVALS = ["1h", "4h", "1d"] as const;

export default function CandleGrid({ className = "" }: { className?: string }) {
  const [symbol, setSymbol] = useState<(typeof SYMBOLS)[number]>("BTCUSDT");
  const [interval, setInterval_] = useState<(typeof INTERVALS)[number]>("1h");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [tick, setTick] = useState("");

  useEffect(() => {
    let alive = true;
    setErr(null);
    setCandles([]);
    fetchKlines(symbol, interval)
      .then((c) => { if (alive) setCandles(c); })
      .catch((e) => { if (alive) setErr(String(e?.message ?? e)); });

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`);
    ws.onmessage = (e) => {
      const k = JSON.parse(e.data)?.k;
      if (!k) return;
      const c: Candle = { t: k.t, o: +k.o, h: +k.h, l: +k.l, c: +k.c, v: +k.v };
      setTick(new Date().toLocaleTimeString("id-ID"));
      setCandles((prev) => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        if (last.t === c.t) return [...prev.slice(0, -1), c];
        return [...prev.slice(1), c];
      });
    };
    return () => { alive = false; ws.close(); };
  }, [symbol, interval]);

  const levels = useMemo(() => {
    if (candles.length < 12) return { res: [] as number[], sup: [] as number[] };
    const wins = 5;
    const pivH: number[] = [], pivL: number[] = [];
    for (let i = wins; i < candles.length - wins; i++) {
      let isH = true, isL = true;
      for (let j = i - wins; j <= i + wins; j++) {
        if (candles[j].h > candles[i].h) isH = false;
        if (candles[j].l < candles[i].l) isL = false;
      }
      if (isH) pivH.push(candles[i].h);
      if (isL) pivL.push(candles[i].l);
    }
    const price = candles[candles.length - 1].c;
    return {
      res: pivH.filter((p) => p > price).sort((a, b) => a - b).slice(0, 4),
      sup: pivL.filter((p) => p < price).sort((a, b) => b - a).slice(0, 4),
    };
  }, [candles]);

  const active = { background: "#191919", color: "#f6f3ea" };
  const cur = hover !== null ? candles[hover] : candles[candles.length - 1];
  const chg = cur ? ((cur.c - cur.o) / cur.o) * 100 : 0;

  const W = 940, H = 440, L = 10, R = 74, T = 14, PRICE_H = 300, VOL_TOP = 330, VOL_H = 80;

  let body = null;
  if (err) {
    body = <div className="p-10 text-center t-label" style={{ color: RED }}>● ERROR: {err} · coba symbol lain / cek koneksi</div>;
  } else if (!candles.length) {
    body = <div className="p-10 text-center t-label">● FETCHING BINANCE KLINES…</div>;
  } else {
    const n = candles.length;
    const cw = (W - L - R) / n;
    const bw = Math.max(1.5, cw * 0.6);
    const hi = Math.max(...candles.map((c) => c.h), ...levels.res);
    const lo = Math.min(...candles.map((c) => c.l), ...levels.sup);
    const Y = (p: number) => T + (1 - (p - lo) / (hi - lo || 1)) * PRICE_H;
    const vmax = Math.max(...candles.map((c) => c.v));
    const last = candles[n - 1];

    body = (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = (e.target as SVGSVGElement).closest("svg")!.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const idx = Math.floor((px - L) / cw);
          setHover(idx >= 0 && idx < n ? idx : null);
        }}
      >
        {levels.res.map((p, i) => (
          <g key={`r${i}`}>
            <line x1={L} x2={W - R} y1={Y(p)} y2={Y(p)} stroke={RED} strokeDasharray="4 4" strokeOpacity={0.6} />
            <text x={W - R + 4} y={Y(p) + 3} fontSize={8} fill={RED}>R{i + 1} {p.toFixed(0)}</text>
          </g>
        ))}
        {levels.sup.map((p, i) => (
          <g key={`s${i}`}>
            <line x1={L} x2={W - R} y1={Y(p)} y2={Y(p)} stroke={GREEN} strokeDasharray="4 4" strokeOpacity={0.6} />
            <text x={W - R + 4} y={Y(p) + 3} fontSize={8} fill={GREEN}>S{i + 1} {p.toFixed(0)}</text>
          </g>
        ))}

        {candles.map((c, i) => {
          const x = L + i * cw + cw / 2;
          const up = c.c >= c.o;
          const col = up ? GREEN : RED;
          const yO = Y(c.o), yC = Y(c.c);
          return (
            <g key={c.t}>
              <line x1={x} x2={x} y1={Y(c.h)} y2={Y(c.l)} stroke={col} strokeWidth={0.8} />
              <rect x={x - bw / 2} y={Math.min(yO, yC)} width={bw} height={Math.max(1, Math.abs(yO - yC))} fill={col} />
              <rect x={x - bw / 2} y={VOL_TOP + VOL_H - (c.v / vmax) * VOL_H} width={bw} height={(c.v / vmax) * VOL_H} fill={col} fillOpacity={0.35} />
            </g>
          );
        })}

        <line x1={L} x2={W - R} y1={Y(last.c)} y2={Y(last.c)} stroke={INK} strokeDasharray="2 3" />
        <rect x={W - R + 2} y={Y(last.c) - 8} width={70} height={16} fill={INK} />
        <text x={W - R + 37} y={Y(last.c) + 4} textAnchor="middle" fontSize={9} fontWeight={700} fill="#f6f3ea">
          {last.c.toFixed(2)}
        </text>

        {hover !== null && candles[hover] && (
          <line x1={L + hover * cw + cw / 2} x2={L + hover * cw + cw / 2} y1={T} y2={VOL_TOP + VOL_H} stroke={MUT} strokeDasharray="2 3" />
        )}
      </svg>
    );
  }

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ CANDLE GRID · {symbol} · {interval.toUpperCase()}</span>
        <span className="flex gap-1 items-center">
          {SYMBOLS.map((s) => (
            <button key={s} className="t-badge" style={symbol === s ? active : undefined} onClick={() => setSymbol(s)}>
              {s.replace("USDT", "")}
            </button>
          ))}
          {INTERVALS.map((iv) => (
            <button key={iv} className="t-badge" style={interval === iv ? active : undefined} onClick={() => setInterval_(iv)}>
              {iv}
            </button>
          ))}
          <span className="t-badge green md-blink">● WS LIVE {tick}</span>
        </span>
      </header>

      <div className="px-3 py-1.5 border-b border-[#2a2a2a] text-[10px] flex flex-wrap gap-4">
        {cur && (
          <>
            <span>O <b>{cur.o.toFixed(2)}</b></span>
            <span>H <b>{cur.h.toFixed(2)}</b></span>
            <span>L <b>{cur.l.toFixed(2)}</b></span>
            <span>C <b style={{ color: chg >= 0 ? GREEN : RED }}>{cur.c.toFixed(2)}</b></span>
            <span style={{ color: chg >= 0 ? GREEN : RED }}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</span>
            <span>VOL <b>{(cur.v / 1000).toFixed(1)}K</b></span>
          </>
        )}
      </div>

      <div className="p-2">{body}</div>

      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px] tracking-wider uppercase flex justify-between" style={{ color: MUT }}>
        <span>R/S = pivot swing 5-bar · binance public api · no key</span>
        <span>ws kline stream · zero latency feel</span>
      </footer>
    </section>
  );
}