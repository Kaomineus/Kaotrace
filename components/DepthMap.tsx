"use client";

import { useEffect, useMemo, useState } from "react";

const GREEN = "#1e7a46", RED = "#b3382c", GOLD = "#b8860b", INK = "#191919", MUT = "#8a8578", BLUE = "#2c5f8a";

const BINS = 40;
const RANGE = 0.015;
const SNAP_CAP = 60;

interface Level { p: number; q: number; }
interface Processed {
  mid: number; lo: number; binW: number;
  bid: number[]; ask: number[];
  wallsBid: Level[]; wallsAsk: Level[];
  imb: number; t: number;
}

const fmt$ = (v: number) => v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${v.toFixed(0)}`;
const fmtP = (p: number) => p >= 1000 ? p.toFixed(1) : p >= 1 ? p.toFixed(3) : p.toFixed(6);

function process(raw: any): Processed | null {
  const bids = (raw.bids ?? []).slice(0, 500).map((b: string[]) => ({ p: +b[0], q: +b[1] }));
  const asks = (raw.asks ?? []).slice(0, 500).map((a: string[]) => ({ p: +a[0], q: +a[1] }));
  if (!bids.length || !asks.length) return null;
  const mid = (bids[0].p + asks[0].p) / 2;
  const lo = mid * (1 - RANGE), hi = mid * (1 + RANGE);
  const binW = (hi - lo) / BINS;
  const bid = new Array(BINS).fill(0), ask = new Array(BINS).fill(0);
  let sumB = 0, sumA = 0;
  bids.forEach((l) => {
    if (l.p < lo || l.p > hi) return;
    const v = l.q * l.p;
    bid[Math.min(BINS - 1, Math.floor((l.p - lo) / binW))] += v;
    sumB += v;
  });
  asks.forEach((l) => {
    if (l.p < lo || l.p > hi) return;
    const v = l.q * l.p;
    ask[Math.min(BINS - 1, Math.floor((l.p - lo) / binW))] += v;
    sumA += v;
  });
  const wallsBid = bids.map((l) => ({ ...l, q: l.q * l.p })).sort((a, b) => b.q - a.q).slice(0, 5);
  const wallsAsk = asks.map((l) => ({ ...l, q: l.q * l.p })).sort((a, b) => b.q - a.q).slice(0, 5);
  return { mid, lo, binW, bid, ask, wallsBid, wallsAsk, imb: sumB / ((sumB + sumA) || 1), t: Date.now() };
}

export default function DepthMap({ className = "" }: { className?: string }) {
  const [sym, setSym] = useState("BTCUSDT");
  const [input, setInput] = useState("BTCUSDT");
  const [proc, setProc] = useState<Processed | null>(null);
  const [snaps, setSnaps] = useState<number[][]>([]);
  const [auto, setAuto] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setSnaps([]);
    setProc(null);
    const load = async () => {
      try {
        const res = await fetch(`https://api.binance.com/api/v3/depth?symbol=${sym}&limit=500`);
        if (!res.ok) throw new Error(`${res.status}`);
        const p = process(await res.json());
        if (!alive || !p) return;
        setProc(p);
        setSnaps((s) => [...s.slice(-(SNAP_CAP - 1)), p.bid.map((v, i) => v - p.ask[i])]);
      } catch (e: any) {
        if (alive) setErr(String(e?.message ?? e));
      }
    };
    load();
    const id = auto ? setInterval(load, 5000) : undefined;
    return () => { alive = false; if (id) clearInterval(id); };
  }, [sym, auto]);

  const maxBin = useMemo(() => proc ? Math.max(...proc.bid, ...proc.ask, 1) : 1, [proc]);
  const maxHeat = useMemo(() => snaps.flat().reduce((m, v) => Math.max(m, Math.abs(v)), 1), [snaps]);

  const cum = useMemo(() => {
    if (!proc) return null;
    const midIdx = Math.floor((proc.mid - proc.lo) / proc.binW);
    let cb = 0, ca = 0;
    const b: number[] = [], a: number[] = [];
    for (let i = midIdx; i >= 0; i--) { cb += proc.bid[i]; b.unshift(cb); }
    for (let i = midIdx; i < BINS; i++) { ca += proc.ask[i]; a.push(ca); }
    return { b, a, midIdx };
  }, [proc]);

  const active = { background: "#191919", color: "#f6f3ea" };

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ DOM · DEPTH OF MARKET · {sym}</span>
        <span className="flex gap-1 items-center">
          {proc && (
            <span className="t-badge" style={{ color: proc.imb > 0.55 ? GREEN : proc.imb < 0.45 ? RED : GOLD, borderColor: proc.imb > 0.55 ? GREEN : proc.imb < 0.45 ? RED : GOLD }}>
              {proc.imb > 0.55 ? "BID HEAVY" : proc.imb < 0.45 ? "ASK HEAVY" : "BALANCED"} {(proc.imb * 100).toFixed(0)}%
            </span>
          )}
          <button className="t-badge" style={auto ? active : undefined} onClick={() => setAuto(!auto)}>{auto ? "AUTO 5s ✓" : "AUTO OFF"}</button>
          <span className="t-badge gold">{snaps.length} SNAP</span>
        </span>
      </header>

      <div className="flex flex-wrap gap-1 px-3 py-1.5 border-b border-[#2a2a2a]">
        {["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "DOGEUSDT"].map((s) => (
          <button key={s} className="t-badge" style={sym === s ? active : undefined} onClick={() => { setSym(s); setInput(s); }}>{s.replace("USDT", "")}</button>
        ))}
        <form
          className="flex gap-1 ml-auto"
          onSubmit={(e) => { e.preventDefault(); const v = input.trim().toUpperCase(); if (v) setSym(v.endsWith("USDT") ? v : `${v}USDT`); }}
        >
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="SYMBOL…" className="t-badge bg-transparent outline-none w-28" />
          <button className="t-badge" type="submit">GO</button>
        </form>
      </div>

      {err && <div className="p-10 text-center t-label" style={{ color: RED }}>● ERROR: {err}</div>}
      {!proc && !err && <div className="p-10 text-center t-label">● MEMBACA ORDER BOOK 500 LEVEL…</div>}

      {proc && (
        <>
          <div className="grid grid-cols-12">
            <div className="col-span-12 md:col-span-7 p-3 border-r border-[#2a2a2a]">
              <div className="t-label mb-1">■ PROFIL LIMIT ±1.5% · HIJAU = BID · MERAH = ASK</div>
              <div className="space-y-[2px]">
                {proc.bid.map((_, i) => {
                  const price = proc.lo + (i + 0.5) * proc.binW;
                  const isMid = price <= proc.mid && proc.lo + (i + 1.5) * proc.binW > proc.mid;
                  return (
                    <div key={i} className="flex items-center gap-1 h-[9px]" style={{ background: isMid ? "rgba(25,25,25,0.08)" : undefined }}>
                      <span className="w-24 text-right text-[8px]" style={{ color: MUT }}>{fmtP(price)}</span>
                      <span className="flex-1 flex justify-end">
                        <span className="h-full" style={{ width: `${(proc.bid[i] / maxBin) * 100}%`, background: GREEN, opacity: 0.75 }} />
                      </span>
                      <span className="flex-1">
                        <span className="h-full block" style={{ width: `${(proc.ask[i] / maxBin) * 100}%`, background: RED, opacity: 0.75 }} />
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[8px] mt-1" style={{ color: MUT }}>
                <span>← ukuran bid</span>
                <span>mid {fmtP(proc.mid)}</span>
                <span>ukuran ask →</span>
              </div>
            </div>

            <div className="col-span-12 md:col-span-5 p-3 space-y-3">
              <div>
                <div className="t-label mb-1">■ WHALE WALLS · TOP 5 LEVEL</div>
                <div className="grid grid-cols-2 gap-2 text-[9px]">
                  <div className="space-y-1">
                    <div className="font-bold" style={{ color: GREEN }}>BID</div>
                    {proc.wallsBid.map((w, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{fmtP(w.p)}</span>
                        <b style={{ color: GREEN }}>{fmt$(w.q)}</b>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold" style={{ color: RED }}>ASK</div>
                    {proc.wallsAsk.map((w, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{fmtP(w.p)}</span>
                        <b style={{ color: RED }}>{fmt$(w.q)}</b>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-[8px] mt-1" style={{ color: MUT }}>dinding besar = magnet harga sekaligus calon resistance/support intraday · waspada spoofing (dinding bisa ditarik)</div>
              </div>

              {cum && (
                <div>
                  <div className="t-label mb-1">■ KUMULATIF DARI MID</div>
                  <svg viewBox="0 0 300 90" width="100%">
                    {(() => {
                      const maxC = Math.max(...cum.b, ...cum.a, 1);
                      const Xb = (i: number) => 150 - (i / Math.max(1, cum.b.length - 1)) * 145;
                      const Xa = (i: number) => 150 + (i / Math.max(1, cum.a.length - 1)) * 145;
                      const Y = (v: number) => 86 - (v / maxC) * 80;
                      return (
                        <>
                          <path d={cum.b.map((v, i) => `${i ? "L" : "M"}${Xb(cum.b.length - 1 - i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")} fill="none" stroke={GREEN} strokeWidth={1.5} />
                          <path d={cum.a.map((v, i) => `${i ? "L" : "M"}${Xa(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")} fill="none" stroke={RED} strokeWidth={1.5} />
                          <line x1={150} y1={0} x2={150} y2={90} stroke={MUT} strokeDasharray="3 3" />
                        </>
                      );
                    })()}
                  </svg>
                  <div className="text-[8px] text-center" style={{ color: MUT }}>kurva lebih curam = likuiditas tebal di sisi itu</div>
                </div>
              )}

              <div>
                <div className="flex justify-between text-[9px]" style={{ color: MUT }}><span>IMBALANCE ±1.5%</span><span>{(proc.imb * 100).toFixed(1)}% bid</span></div>
                <div className="flex h-2 mt-1">
                  <span style={{ width: `${proc.imb * 100}%`, background: GREEN }} />
                  <span style={{ width: `${(1 - proc.imb) * 100}%`, background: RED }} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-[#2a2a2a]">
            <div className="t-label mb-1">■ HEATMAP DINDING · {snaps.length} SNAPSHOT × 5 DETIK (lama → baru, atas → bawah)</div>
            <div className="space-y-[1px]">
              {snaps.map((s, ri) => (
                <div key={ri} className="flex gap-[1px] h-[6px]">
                  {s.map((v, ci) => (
                    <span
                      key={ci}
                      className="flex-1"
                      style={{
                        background: v >= 0
                          ? `rgba(30,122,70,${0.08 + (Math.abs(v) / maxHeat) * 0.85})`
                          : `rgba(179,56,44,${0.08 + (Math.abs(v) / maxHeat) * 0.85})`,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="text-[8px] mt-1" style={{ color: MUT }}>pita hijau tebal menetap = dinding bid bertahan · pita muncul-hilang = kemungkinan spoofing</div>
          </div>
        </>
      )}

      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px] tracking-wider uppercase" style={{ color: MUT }}>
        500 level per sisi · bin ±1.5% dari mid · refresh 5 detik (toggle auto) · kombinasi: walls + imbalance + heat = baca niat pasar
      </footer>
    </section>
  );
}