"use client";

import { calcYoY, type Observation } from "@/lib/macro";

const GREEN = "#1e7a46", RED = "#b3382c", GOLD = "#b8860b", INK = "#191919", MUT = "#8a8578";

export default function PolicyPanel({ className = "", dff, pceCore, cpiYoY }: {
  className?: string; dff: Observation[]; pceCore: Observation[]; cpiYoY: number;
}) {
  const pceYoY = calcYoY(pceCore);
  const ffr = dff.length ? dff[dff.length - 1].value : NaN;
  const ffrYearAgo = dff.length > 260 ? dff[dff.length - 261].value : ffr;
  const realRate = ffr - pceYoY;

  const watch: [string, string] =
    pceYoY > 4 ? ["HIKE RISK", RED] :
    pceYoY > 3 ? ["HOLD HIGHER FOR LONGER", GOLD] :
    pceYoY > 2.5 ? ["PIVOT WINDOW TERBUKA", GREEN] :
    ["EASING MODE", GREEN];

  const spark = dff.slice(-1300);
  const W = 340, H = 110, L = 8, R = 8, T = 8, B = 8;
  const lo = Math.min(...spark.map((s) => s.value)) - 0.2;
  const hi = Math.max(...spark.map((s) => s.value)) + 0.2;
  const X = (i: number) => L + (i / (spark.length - 1)) * (W - L - R);
  const Y = (v: number) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
  const path = spark.map((s, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(s.value).toFixed(1)}`).join(" ");

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ POLICY & INFLATION · FED WATCH</span>
        <span className="t-badge" style={{ color: watch[1], borderColor: watch[1] }}>{watch[0]}</span>
      </header>
      <div className="grid grid-cols-2">
        <div className="p-3 border-r border-[#2a2a2a]">
          <div className="t-label" style={{ color: MUT }}>FED FUNDS RATE (DFF)</div>
          <div className="text-2xl font-bold">{isNaN(ffr) ? "—" : ffr.toFixed(2)}%</div>
          <div className="text-[10px]" style={{ color: ffr - ffrYearAgo >= 0 ? GREEN : RED }}>
            {ffr - ffrYearAgo >= 0 ? "▲" : "▼"} {(ffr - ffrYearAgo).toFixed(2)}pp dalam 12 bulan
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="mt-2">
            <path d={path} fill="none" stroke={INK} strokeWidth={1.5} />
            <circle cx={X(spark.length - 1)} cy={Y(ffr)} r={3} fill={INK} />
          </svg>
          <div className="text-[9px]" style={{ color: MUT }}>5 tahun · tiap tangga = siklus hike/cut</div>
        </div>
        <div className="p-3 space-y-2">
          <div className="t-label" style={{ color: MUT }}>INFLASI · YOY</div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-20">CPI</span>
            <span className="flex-1 h-3" style={{ background: `linear-gradient(90deg, ${RED} ${Math.min(100, cpiYoY * 10)}%, rgba(25,25,25,0.1) 0)` }} />
            <b style={{ color: RED }}>{cpiYoY.toFixed(1)}%</b>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-20">CORE PCE</span>
            <span className="flex-1 h-3" style={{ background: `linear-gradient(90deg, ${GOLD} ${Math.min(100, pceYoY * 10)}%, rgba(25,25,25,0.1) 0)` }} />
            <b style={{ color: GOLD }}>{pceYoY.toFixed(1)}%</b>
          </div>
          <div className="border border-[#2a2a2a] p-2 text-[10px] space-y-1">
            <div className="flex justify-between"><span>TARGET FED</span><b>2.0% (core PCE)</b></div>
            <div className="flex justify-between"><span>REAL POLICY RATE</span><b style={{ color: realRate > 0 ? GREEN : RED }}>{realRate >= 0 ? "+" : ""}{realRate.toFixed(2)}pp</b></div>
          </div>
          <div className="text-[9px]" style={{ color: MUT }}>
            Fed menarget CORE PCE, bukan CPI · real rate positif = policy restriktif · gap CPI−PCE lebar = komponen shelter/energi mendistorsi
          </div>
        </div>
      </div>
      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px] tracking-wider uppercase" style={{ color: MUT }}>
        rule: core pce &gt; 4% = hike risk · 3-4% = hold · 2.5-3% = pivot window · &lt; 2.5% = easing
      </footer>
    </section>
  );
}