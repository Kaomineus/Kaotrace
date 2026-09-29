"use client";

import { useEffect, useMemo, useState } from "react";
import type { Observation } from "@/lib/macro";

const GREEN = "#1e7a46", RED = "#b3382c", GOLD = "#b8860b", INK = "#191919", MUT = "#8a8578";

function Spark({ vals, color }: { vals: number[]; color: string }) {
  const W = 200, H = 60;
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const X = (i: number) => (i / (vals.length - 1)) * W;
  const Y = (v: number) => 4 + (1 - (v - lo) / (hi - lo || 1)) * (H - 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <path d={vals.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

function VixDial({ v }: { v: number }) {
  const W = 160, H = 92, cx = 80, cy = 84, r = 62;
  const arc = (a: number, b: number) => {
    const a1 = Math.PI + (a / 40) * Math.PI, a2 = Math.PI + (b / 40) * Math.PI;
    return `M ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(a2)} ${cy + r * Math.sin(a2)}`;
  };
  const ang = Math.PI + (Math.min(40, Math.max(0, v)) / 40) * Math.PI;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <path d={arc(0, 15)} stroke={GREEN} strokeWidth={10} fill="none" />
      <path d={arc(15, 20)} stroke={GREEN} strokeWidth={10} fill="none" opacity={0.55} />
      <path d={arc(20, 30)} stroke={GOLD} strokeWidth={10} fill="none" />
      <path d={arc(30, 40)} stroke={RED} strokeWidth={10} fill="none" />
      <line x1={cx} y1={cy} x2={cx + (r - 10) * Math.cos(ang)} y2={cy + (r - 10) * Math.sin(ang)} stroke={INK} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={4} fill={INK} />
    </svg>
  );
}

export default function RiskAppetite({ className = "", vix, oas, ndq }: {
  className?: string; vix: Observation[]; oas: Observation[]; ndq: Observation[];
}) {
  const [djia, setDjia] = useState<number[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/fred/series?id=DJIA")
      .then((r) => r.json())
      .then((j) => { if (alive) setDjia((j?.observations ?? []).map((o: any) => o.value as number)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const ratio = useMemo(() => {
    if (!djia || ndq.length < 130 || djia.length < 130) return null;
    const n = 130;
    const nd = ndq.slice(-n).map((o) => o.value);
    const dj = djia.slice(-n);
    return nd.map((v, i) => v / dj[i]);
  }, [djia, ndq]);

  const vixNow = vix.length ? vix[vix.length - 1].value : NaN;
  const oasNow = oas.length ? oas[oas.length - 1].value : NaN;
  const rTrend = ratio && ratio.length > 22 ? ((ratio[ratio.length - 1] - ratio[ratio.length - 22]) / ratio[ratio.length - 22]) * 100 : NaN;

  const vixZone: [string, string] = vixNow < 15 ? ["COMPLACENT", GREEN] : vixNow < 20 ? ["NORMAL", GREEN] : vixNow < 30 ? ["ELEVATED", GOLD] : ["STRESS", RED];
  const oasZone: [string, string] = oasNow < 3.5 ? ["TIGHT", GREEN] : oasNow < 5 ? ["NORMAL", GREEN] : oasNow < 7 ? ["WIDENING", GOLD] : ["CRISIS", RED];
  const rZone: [string, string] = isNaN(rTrend) ? ["NO DATA", MUT] : rTrend > 2 ? ["RISK-ON", GREEN] : rTrend < -2 ? ["RISK-OFF", RED] : ["SIDEWAYS", GOLD];

  const score =
    (vixNow < 20 ? 1 : vixNow < 30 ? 0 : -1) +
    (oasNow < 5 ? 1 : oasNow < 7 ? 0 : -1) +
    (isNaN(rTrend) ? 0 : rTrend > 2 ? 1 : rTrend < -2 ? -1 : 0);
  const composite: [string, string] = score >= 2 ? ["RISK-ON", GREEN] : score <= -2 ? ["RISK-OFF", RED] : ["NEUTRAL", GOLD];

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ RISK APPETITE · VIX + CREDIT + GROWTH/DEFENSIVE</span>
        <span className="t-badge" style={{ color: composite[1], borderColor: composite[1] }}>COMPOSITE: {composite[0]}</span>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-4">
        <div className="p-3 border-r border-[#2a2a2a]">
          <div className="t-label" style={{ color: MUT }}>VIX</div>
          <div className="text-xl font-bold">{isNaN(vixNow) ? "—" : vixNow.toFixed(1)}</div>
          <VixDial v={vixNow} />
          <div className="text-[9px] font-bold" style={{ color: vixZone[1] }}>{vixZone[0]}</div>
        </div>
        <div className="p-3 border-r border-[#2a2a2a]">
          <div className="t-label" style={{ color: MUT }}>HY CREDIT SPREAD (OAS)</div>
          <div className="text-xl font-bold">{isNaN(oasNow) ? "—" : oasNow.toFixed(2)}%</div>
          {oas.length > 30 && <Spark vals={oas.slice(-250).map((o) => o.value)} color={oasZone[1]} />}
          <div className="text-[9px] font-bold" style={{ color: oasZone[1] }}>{oasZone[0]}</div>
        </div>
        <div className="p-3 border-r border-[#2a2a2a]">
          <div className="t-label" style={{ color: MUT }}>GROWTH / DEFENSIVE</div>
          <div className="text-xl font-bold">{isNaN(rTrend) ? "—" : `${rTrend >= 0 ? "+" : ""}${rTrend.toFixed(1)}%`}</div>
          {ratio && <Spark vals={ratio} color={rZone[1]} />}
          <div className="text-[9px] font-bold" style={{ color: rZone[1] }}>NDQ vs DJIA · 1M · {rZone[0]}</div>
        </div>
        <div className="p-3 flex flex-col justify-center items-center gap-2">
          <div className="t-label" style={{ color: MUT }}>COMPOSITE</div>
          <div className="text-2xl font-bold" style={{ color: composite[1] }}>{score >= 0 ? "+" : ""}{score}</div>
          <div className="flex gap-1">
            {[-1, 0, 1].map((s) => (
              <span key={s} className="w-3 h-3" style={{ background: score > s ? GREEN : "rgba(25,25,25,0.15)" }} />
            ))}
          </div>
          <div className="text-[9px] text-center" style={{ color: MUT }}>vix + credit + flow = 3 saksi risk appetite</div>
        </div>
      </div>
      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px] tracking-wider uppercase" style={{ color: MUT }}>
        vixcls + bamlh0a0hym2 + nasdaq100 + djia (fred) · ndq/djia naik = uang pilih growth · score ≥2 risk-on · ≤-2 risk-off
      </footer>
    </section>
  );
}