"use client";

import { useEffect, useMemo, useState } from "react";

const GREEN = "#1e7a46", RED = "#b3382c", GOLD = "#b8860b", INK = "#191919", MUT = "#8a8578", BLUE = "#2c5f8a";

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "LTCUSDT", "UNIUSDT", "ATOMUSDT"];

interface CoinData { sym: string; ret: number[]; perf: number; vol: number; }

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((x, y) => x + y, 0) / n;
  const mb = b.reduce((x, y) => x + y, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma, xb = b[i] - mb;
    num += xa * xb; da += xa * xa; db += xb * xb;
  }
  return num / (Math.sqrt(da * db) || 1);
}

export default function CorrelationGraph({ className = "" }: { className?: string }) {
  const [coins, setCoins] = useState<CoinData[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [thr, setThr] = useState(0.5);
  const [hover, setHover] = useState<number | null>(null);
  const [cell, setCell] = useState<{ i: number; j: number; v: number } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const all: { sym: string; closes: number[] }[] = await Promise.all(
          SYMBOLS.map(async (s) => {
            const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${s}&interval=1d&limit=120`);
            if (!res.ok) throw new Error(`${s} ${res.status}`);
            const raw: any[] = await res.json();
            return { sym: s, closes: raw.map((k: any[]) => +k[4]) as number[] };
          })
        );
        const base = all[0].closes;
        const out: CoinData[] = [];
        for (const c of all) {
          if (c.closes.length !== base.length) continue;
          const ret: number[] = c.closes.slice(1).map((v, i) => (v - c.closes[i]) / c.closes[i]);
          const perf = ((c.closes[c.closes.length - 1] - c.closes[c.closes.length - 31]) / c.closes[c.closes.length - 31]) * 100;
          const mean = ret.reduce((a, b) => a + b, 0) / ret.length;
          const vol = Math.sqrt(ret.reduce((a, b) => a + (b - mean) ** 2, 0) / ret.length) * Math.sqrt(365) * 100;
          out.push({ sym: c.sym, ret, perf, vol });
        }
        if (alive) setCoins(out);
      } catch (e: any) {
        if (alive) setErr(String(e?.message ?? e));
      }
    })();
    return () => { alive = false; };
  }, []);

  const matrix = useMemo(() => {
    if (!coins) return null;
    return coins.map((a, i) => coins.map((b, j) => (i === j ? 1 : pearson(a.ret, b.ret))));
  }, [coins]);

  const W = 700, H = 470, cx = W / 2, cy = H / 2, R = 185;
  const pos = (i: number, n: number) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  };

  const active = { background: "#191919", color: "#f6f3ea" };

  if (err) return <section className={`t-panel ${className}`}><div className="p-10 text-center t-label" style={{ color: RED }}>● ERROR: {err}</div></section>;
  if (!coins || !matrix) return <section className={`t-panel ${className}`}><div className="p-10 text-center t-label">● MENGHITUNG KORELASI 12 COIN…</div></section>;

  const n = coins.length;
  const edges: { i: number; j: number; v: number }[] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (Math.abs(matrix[i][j]) >= thr) edges.push({ i, j, v: matrix[i][j] });

  const hoverTop = hover !== null
    ? coins.map((_, j) => ({ j, v: matrix[hover][j] })).filter((x) => x.j !== hover).sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 5)
    : null;

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ CORRELATION WEB · 12 COIN · 90D DAILY</span>
        <span className="flex gap-1">
          {[0.3, 0.5, 0.7].map((t) => (
            <button key={t} className="t-badge" style={thr === t ? active : undefined} onClick={() => setThr(t)}>
              |ρ|≥{t}
            </button>
          ))}
        </span>
      </header>

      <div className="grid grid-cols-12">
        <div className="col-span-12 md:col-span-7 p-2 relative">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" onMouseLeave={() => setHover(null)}>
            {edges.map((e, idx) => {
              const p1 = pos(e.i, n), p2 = pos(e.j, n);
              const dim = hover !== null && e.i !== hover && e.j !== hover;
              return (
                <line key={idx} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke={e.v >= 0 ? GREEN : RED} strokeWidth={Math.abs(e.v) * 3}
                  strokeOpacity={dim ? 0.08 : 0.25 + Math.abs(e.v) * 0.5} />
              );
            })}
            {coins.map((c, i) => {
              const p = pos(i, n);
              const r = 6 + Math.min(10, c.vol * 0.12);
              return (
                <g key={c.sym} onMouseEnter={() => setHover(i)} className="cursor-pointer">
                  <circle cx={p.x} cy={p.y} r={r} fill={c.perf >= 0 ? GREEN : RED} fillOpacity={0.85} stroke={hover === i ? INK : "none"} strokeWidth={2} />
                  <text x={p.x} y={p.y - r - 4} textAnchor="middle" fontSize={9} fontWeight={700} fill={INK}>
                    {c.sym.replace("USDT", "")}
                  </text>
                </g>
              );
            })}
            <text x={cx} y={cy - 6} textAnchor="middle" fontSize={9} fill={MUT}>node = coin · size = volatilitas anual</text>
            <text x={cx} y={cy + 8} textAnchor="middle" fontSize={9} fill={MUT}>warna = perf 30d · edge = korelasi</text>
          </svg>
        </div>

        <div className="col-span-12 md:col-span-5 p-3 border-l border-[#2a2a2a] space-y-3">
          <div className="t-label">■ HEAT MATRIX ρ</div>
          <div className="grid gap-[1px]" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
            {matrix.map((row, i) =>
              row.map((v, j) => (
                <span
                  key={`${i}-${j}`}
                  onMouseEnter={() => setCell({ i, j, v })}
                  className="h-3 cursor-pointer"
                  style={{ background: i === j ? INK : v >= 0 ? `rgba(30,122,70,${0.15 + Math.abs(v) * 0.8})` : `rgba(179,56,44,${0.15 + Math.abs(v) * 0.8})` }}
                />
              ))
            )}
          </div>
          <div className="text-[10px] min-h-[18px]">
            {cell ? (
              <span>
                <b>{coins[cell.i].sym.replace("USDT", "")} × {coins[cell.j].sym.replace("USDT", "")}</b> · ρ = <b style={{ color: cell.v >= 0 ? GREEN : RED }}>{cell.v.toFixed(2)}</b>
              </span>
            ) : (
              <span style={{ color: MUT }}>hover sel untuk detail pasangan</span>
            )}
          </div>

          {hover !== null && hoverTop && (
            <div className="border border-[#2a2a2a] p-2 space-y-1 text-[10px]">
              <div className="t-label" style={{ color: MUT }}>TOP KORELASI · {coins[hover].sym.replace("USDT", "")}</div>
              {hoverTop.map((t) => (
                <div key={t.j} className="flex items-center gap-2">
                  <span className="w-12">{coins[t.j].sym.replace("USDT", "")}</span>
                  <span className="flex-1 h-2" style={{ background: `linear-gradient(90deg, ${t.v >= 0 ? GREEN : RED} ${Math.abs(t.v) * 100}%, rgba(25,25,25,0.1) 0)` }} />
                  <b style={{ color: t.v >= 0 ? GREEN : RED }}>{t.v.toFixed(2)}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px] tracking-wider uppercase" style={{ color: MUT }}>
        pearson ρ on daily returns 90d · ρ&gt;0.7 = diversifikasi palsu · ρ&lt;0 = kandidat hedge
      </footer>
    </section>
  );
}