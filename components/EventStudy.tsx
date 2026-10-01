"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchKlines, type Candle } from "@/lib/binance";

const RED = "#b3382c", GREEN = "#1e7a46", GOLD = "#b8860b", INK = "#191919", MUT = "#8a8578", BLUE = "#2c5f8a";

interface Entry { date: string; event: string; country: string; actual: number; consensus: number; surprise: number; impact: string; }

const nextDay = (iso: string) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default function EventStudy({ className = "" }: { className?: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [btc, setBtc] = useState<Map<string, number> | null>(null);
  const [eth, setEth] = useState<Map<string, number> | null>(null);
  const [onlyHigh, setOnlyHigh] = useState(true);

  useEffect(() => {
    setEntries(JSON.parse(localStorage.getItem("md_surprise_auto") ?? "[]"));
    let alive = true;
    (async () => {
      try {
        const [b, e] = await Promise.all([
          fetchKlines("BTCUSDT", "1d", 500),
          fetchKlines("ETHUSDT", "1d", 500),
        ]);
        const toRet = (cs: Candle[]) => {
          const m = new Map<string, number>();
          for (let i = 1; i < cs.length; i++) {
            const d = new Date(cs[i].t).toISOString().slice(0, 10);
            m.set(d, ((cs[i].c - cs[i - 1].c) / cs[i - 1].c) * 100);
          }
          return m;
        };
        if (alive) { setBtc(toRet(b)); setEth(toRet(e)); }
      } catch { /* binance offline */ }
    })();
    return () => { alive = false; };
  }, []);

  const rows = useMemo(() => {
    if (!btc || !eth) return [];
    return entries
      .filter((e) => !onlyHigh || e.impact === "High")
      .map((e) => ({
        ...e,
        d0b: btc.get(e.date) ?? NaN,
        d1b: btc.get(nextDay(e.date)) ?? NaN,
        d0e: eth.get(e.date) ?? NaN,
      }))
      .filter((r) => Number.isFinite(r.d0b))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, btc, eth, onlyHigh]);

  const stats = useMemo(() => {
    if (!btc || !rows.length) return null;
    const all = Array.from(btc.values());
    const base = all.reduce((a, b) => a + Math.abs(b), 0) / all.length;
    const ev = rows.reduce((a, r) => a + Math.abs(r.d0b), 0) / rows.length;
    const max = rows.reduce((m, r) => (Math.abs(r.d0b) > Math.abs(m.d0b) ? r : m), rows[0]);
    return { base, ev, ratio: ev / (base || 1), max };
  }, [btc, rows]);

  const W = 760, H = 190, L = 34, R = 10, T = 12, B = 24;
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.d0b)), 1);
  const zero = T + (H - T - B) / 2;
  const bw = rows.length ? (W - L - R) / rows.length : 0;
  const Y = (v: number) => (Math.abs(v) / maxAbs) * ((H - T - B) / 2);

  const active = { background: "#191919", color: "#f6f3ea" };

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ EVENT STUDY · CRYPTO REACTION · {rows.length} RELEASES</span>
        <span className="flex gap-1">
          <button className="t-badge" style={onlyHigh ? active : undefined} onClick={() => setOnlyHigh(true)}>HIGH SAJA</button>
          <button className="t-badge" style={!onlyHigh ? active : undefined} onClick={() => setOnlyHigh(false)}>SEMUA</button>
          <span className="t-badge gold">BINANCE 1D · NO KEY</span>
        </span>
      </header>

      {!entries.length ? (
        <div className="p-10 text-center t-label">● belum ada release tersimpan · buka tab SURPRISE dulu untuk auto-sync</div>
      ) : !btc ? (
        <div className="p-10 text-center t-label">● MENGAMBIL KLINE BINANCE…</div>
      ) : (
        <>
          <div className="grid grid-cols-12 gap-3 p-3">
            <div className="col-span-12 md:col-span-3 grid grid-cols-2 md:grid-cols-1 gap-2 text-[10px]">
              <div className="border border-[#2a2a2a] p-2 text-center">
                <div className="text-[9px]" style={{ color: MUT }}>BASELINE |MOVE| BTC</div>
                <div className="text-lg font-bold">{stats ? stats.base.toFixed(2) : "0.00"}%</div>
                <div className="text-[9px]" style={{ color: MUT }}>hari biasa</div>
              </div>
              <div className="border border-[#2a2a2a] p-2 text-center">
                <div className="text-[9px]" style={{ color: MUT }}>EVENT |MOVE| BTC</div>
                <div className="text-lg font-bold" style={{ color: GOLD }}>{stats ? stats.ev.toFixed(2) : "0.00"}%</div>
                <div className="text-[9px]" style={{ color: MUT }}>hari rilis</div>
              </div>
              <div className="border-2 p-2 text-center" style={{ borderColor: stats && stats.ratio > 1.3 ? RED : GREEN, color: stats && stats.ratio > 1.3 ? RED : GREEN }}>
                <div className="text-[9px] tracking-widest">VOL MULTIPLIER</div>
                <div className="text-xl font-bold">{stats ? stats.ratio.toFixed(2) : "0.00"}×</div>
              </div>
              {stats && (
                <div className="border border-[#2a2a2a] p-2 text-[9px]">
                  <div style={{ color: MUT }}>MAX SHOCK</div>
                  <b>{stats.max.event}</b>
                  <div>{stats.max.date} · BTC {stats.max.d0b >= 0 ? "+" : ""}{stats.max.d0b.toFixed(2)}%</div>
                </div>
              )}
            </div>

            <div className="col-span-12 md:col-span-9">
              <div className="t-label mb-1">■ BTC MOVE D0 PER RELEASE (warna = arah surprise)</div>
              <svg viewBox={`0 0 ${W} ${H}`} width="100%">
                <line x1={L} x2={W - R} y1={zero} y2={zero} stroke={INK} />
                {rows.map((r, i) => {
                  const h = Y(r.d0b);
                  const x = L + i * bw;
                  return (
                    <rect
                      key={`${r.date}-${r.event}`}
                      x={x + 1} y={r.d0b >= 0 ? zero - h : zero}
                      width={Math.max(1.5, bw - 2)} height={h}
                      fill={r.surprise >= 0 ? GREEN : RED} fillOpacity={0.8}
                    >
                      <title>{r.date} {r.event} · surprise {r.surprise.toFixed(2)} · BTC {r.d0b.toFixed(2)}%</title>
                    </rect>
                  );
                })}
                <text x={L - 4} y={T + 6} fontSize={8} fill={MUT} textAnchor="end">+{maxAbs.toFixed(1)}%</text>
                <text x={L - 4} y={H - B} fontSize={8} fill={MUT} textAnchor="end">-{maxAbs.toFixed(1)}%</text>
                <text x={W / 2} y={H - 6} fontSize={8} fill={MUT} textAnchor="middle">hijau = beat (actual &gt; forecast) · merah = miss · tinggi = |move| BTC hari rilis</text>
              </svg>
            </div>
          </div>

          <div className="px-3 pb-3">
            <div className="t-label mb-1">■ TABEL REAKSI (15 TERAKHIR)</div>
            <div className="grid grid-cols-12 gap-2 px-2 py-1 text-[9px] font-bold" style={{ color: MUT }}>
              <span className="col-span-2">TANGGAL</span>
              <span className="col-span-4">EVENT</span>
              <span className="col-span-2 text-right">SURPRISE</span>
              <span className="col-span-1 text-right">BTC D0</span>
              <span className="col-span-1 text-right">BTC D+1</span>
              <span className="col-span-2 text-right">ETH D0</span>
            </div>
            {rows.slice(-15).reverse().map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-2 py-1 text-[10px] border-b border-dotted items-center" style={{ borderColor: "#9a938a" }}>
                <span className="col-span-2">{r.date}</span>
                <span className="col-span-4 truncate"><b>{r.event}</b> <span style={{ color: MUT }}>({r.country})</span></span>
                <span className="col-span-2 text-right font-bold" style={{ color: r.surprise >= 0 ? GREEN : RED }}>
                  {r.surprise >= 0 ? "+" : ""}{r.surprise.toFixed(2)}
                </span>
                <span className="col-span-1 text-right" style={{ color: r.d0b >= 0 ? GREEN : RED }}>{r.d0b >= 0 ? "+" : ""}{r.d0b.toFixed(2)}</span>
                <span className="col-span-1 text-right" style={{ color: r.d1b >= 0 ? GREEN : RED }}>{Number.isFinite(r.d1b) ? `${r.d1b >= 0 ? "+" : ""}${r.d1b.toFixed(2)}` : "—"}</span>
                <span className="col-span-2 text-right" style={{ color: r.d0e >= 0 ? GREEN : RED }}>{r.d0e >= 0 ? "+" : ""}{r.d0e.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px] tracking-wider uppercase" style={{ color: MUT }}>
        deskriptif bukan prediktif · multiplier &gt; 1.3× = hari rilis benar-benar menggerakkan pasar · cocokkan dengan posisi kamu di F2 money mgmt
      </footer>
    </section>
  );
}