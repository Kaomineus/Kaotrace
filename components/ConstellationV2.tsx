"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Observation } from "@/lib/macro";

const RED = "#b3382c";
const GREEN = "#1e7a46";
const GOLD = "#b8860b";
const PURPLE = "#6b4fa0";
const BLUE = "#2c5f8a";
const INK = "#191919";
const MUT = "#8a8578";
const GRID = "#ddd6c4";

const REG = {
  OVER: { c: GOLD, label: "OVERHEAT" },
  PRE: { c: RED, label: "PRE-RECESSION" },
  GOLD: { c: GREEN, label: "GOLDILOCKS" },
  DEEP: { c: PURPLE, label: "DEEP RECESSION" },
} as const;
type RegKey = keyof typeof REG;

const regimeOf = (ry: number, ts: number): RegKey =>
  ry >= 0 ? (ts < 0 ? "PRE" : "OVER") : ts >= 0 ? "GOLD" : "DEEP";

const FLIPS: Record<RegKey, [string, string]> = {
  PRE: ["ts > 0 → OVERHEAT", "ry < 0 → DEEP REC."],
  OVER: ["ry < 0 → GOLDILOCKS", "ts < 0 → PRE-REC."],
  GOLD: ["ts < 0 → PRE-REC.", "ry > 0 → OVERHEAT"],
  DEEP: ["ts > 0 → GOLDILOCKS", "ry > 0 → PRE-REC."],
};

const CSS = `
@keyframes md-blink { 0%,55% {opacity:1} 56%,100% {opacity:.25} }
.md-blink { animation: md-blink 1.2s steps(1) infinite; }
@keyframes md-pop { from { transform: scale(0); opacity: 0 } to { transform: scale(1); opacity: 1 } }
.md-node { transform-box: fill-box; transform-origin: center; animation: md-pop .4s ease-out backwards; }
@keyframes md-flow { to { stroke-dashoffset: -24 } }
.md-traj { animation: md-flow 1.2s linear infinite; }
@keyframes md-pulse { 0% { transform: scale(.4); opacity: .9 } 100% { transform: scale(2.4); opacity: 0 } }
.md-pulse { transform-box: fill-box; transform-origin: center; animation: md-pulse 2s ease-out infinite; }
`;

interface CPoint { date: string; ry: number; ts: number; }

function CountUp({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 800);
      setV(Math.round(to * k));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{v}%</>;
}

export default function ConstellationV2({
  className = "", points, m2, cpi, sahmValue, sahmTriggered, m2Trend, regime, confidence,
}: {
  className?: string;
  points: CPoint[];
  m2: Observation[];
  cpi: Observation[];
  sahmValue: number;
  sahmTriggered: boolean;
  m2Trend: string;
  regime: string;
  confidence: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [clock, setClock] = useState("");
  const [flipAlert, setFlipAlert] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState("—");
  const [view, setView] = useState({ x: 0, y: 0, w: 760, h: 470 });
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ px: number; py: number; vx: number; vy: number } | null>(null);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const prev = localStorage.getItem("md_regime");
    if (prev && prev !== regime) {
      setFlipAlert(`${prev} → ${regime.toUpperCase()}`);
      setTimeout(() => setFlipAlert(null), 8000);
    }
    localStorage.setItem("md_regime", regime);
    setLastScan(localStorage.getItem("md_lastscan") ?? "—");
    localStorage.setItem("md_lastscan", new Date().toLocaleString("id-ID"));
  }, [regime]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = e.deltaY > 0 ? 1.15 : 0.87;
      setView((v) => {
        const nw = Math.min(760 * 2, Math.max(760 * 0.25, v.w * f));
        const nh = nw * (470 / 760);
        const rect = el.getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * v.w + v.x;
        const my = ((e.clientY - rect.top) / rect.height) * v.h + v.y;
        return { x: mx - ((mx - v.x) / v.w) * nw, y: my - ((my - v.y) / v.h) * nh, w: nw, h: nh };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const scaleView = (f: number) =>
    setView((v) => {
      const nw = Math.min(760 * 2, Math.max(760 * 0.25, v.w * f));
      const nh = nw * (470 / 760);
      const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
      return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
    });

  const enriched = useMemo(() => {
    const m2m = new Map<string, number>();
    m2.forEach((o) => m2m.set(o.date.slice(0, 7), o.value));
    const cpiM = new Map<string, number>();
    cpi.forEach((o) => cpiM.set(o.date.slice(0, 7), o.value));
    const months = [...m2m.keys()].sort();
    const m2mom = new Map<string, number>();
    for (let i = 1; i < months.length; i++) {
      const a = m2m.get(months[i - 1])!, b = m2m.get(months[i])!;
      m2mom.set(months[i], +(((b - a) / a) * 100).toFixed(2));
    }
    const cpiYoy = new Map<string, number>();
    for (const [k, v] of cpiM) {
      const [y, m] = k.split("-").map(Number);
      const prev = cpiM.get(`${y - 1}-${String(m).padStart(2, "0")}`);
      if (prev) cpiYoy.set(k, +(((v - prev) / prev) * 100).toFixed(1));
    }
    return points.map((p, i, arr) => ({
      ...p,
      m2mom: m2mom.get(p.date.slice(0, 7)) ?? 0,
      cpi: cpiYoy.get(p.date.slice(0, 7)) ?? 0,
      reg: regimeOf(p.ry, p.ts),
      yearLabel: i === 0 || arr[i - 1].date.slice(0, 4) !== p.date.slice(0, 4) ? p.date.slice(0, 4) : "",
    }));
  }, [points, m2, cpi]);

  if (!enriched.length) {
    return <section className={`t-panel ${className}`}><div className="p-10 text-center t-label">● MENUNGGU DATA…</div></section>;
  }

  const W = 760, H = 470, L = 46, R = 16, T = 16, B = 34;
  const tsArr = enriched.map((p) => p.ts), ryArr = enriched.map((p) => p.ry);
  const tsMin = Math.min(...tsArr), tsMax = Math.max(...tsArr);
  const ryMin = Math.min(...ryArr), ryMax = Math.max(...ryArr);
  const px = (tsMax - tsMin) * 0.12 || 0.5, py = (ryMax - ryMin) * 0.12 || 0.5;
  const X = (v: number) => L + ((v - (tsMin - px)) / ((tsMax + px) - (tsMin - px))) * (W - L - R);
  const Y = (v: number) => H - B - ((v - (ryMin - py)) / ((ryMax + py) - (ryMin - py))) * (H - T - B);
  const rad = (p: (typeof enriched)[number]) => 4.5 + Math.min(5, Math.abs(p.m2mom) * 1.8);

  const count: Record<RegKey, number> = { OVER: 0, PRE: 0, GOLD: 0, DEEP: 0 };
  enriched.forEach((p) => count[p.reg]++);
  let hubReg: RegKey = "PRE", bn = 0;
  (Object.keys(count) as RegKey[]).forEach((k) => { if (count[k] > bn) { bn = count[k]; hubReg = k; } });
  const hubPts = enriched.filter((p) => p.reg === hubReg);
  const hubX = hubPts.reduce((a, p) => a + X(p.ts), 0) / hubPts.length;
  const hubY = hubPts.reduce((a, p) => a + Y(p.ry), 0) / hubPts.length;

  const n = enriched.length;
  const dist = {
    bull: Math.round((count.GOLD / n) * 100),
    neut: Math.round((count.OVER / n) * 100),
    bear: Math.round(((count.PRE + count.DEEP) / n) * 100),
  };

  const d = enriched.map((p, i) => `${i ? "L" : "M"}${X(p.ts).toFixed(1)},${Y(p.ry).toFixed(1)}`).join(" ");
  const now = enriched[enriched.length - 1];
  const cur = now.reg;

  return (
    <section className={`t-panel ${className}`}>
      <style>{CSS}</style>
      <header className="t-head">
        <span className="t-label">■ MACRO CONSTELLATION v2 · MIROFISH FORCE GRAPH</span>
        <span className="flex items-center gap-2">
          <span className="t-badge green md-blink">● SCANNING</span>
          <span className="t-badge">{clock} WIB</span>
        </span>
      </header>

      <div className="relative grid grid-cols-12">
        {flipAlert && (
          <div className="absolute left-1/2 top-2 -translate-x-1/2 z-10 px-3 py-1.5 text-[10px] font-bold"
            style={{ background: "#f7edc4", border: "1px solid #8a6d1a", color: "#8a6d1a" }}>
            ★ REGIME FLIP: {flipAlert}
          </div>
        )}

        <div className="col-span-3 md:col-span-2 p-3 border-r border-[#2a2a2a] text-[10px] space-y-1.5">
          <div className="t-label mb-2">■ LEGEND</div>
          {(Object.keys(REG) as RegKey[]).map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: REG[k].c }} />
              <span>{REG[k].label}</span>
            </div>
          ))}
          <div className="pt-1" style={{ color: MUT }}>─╌ MISSION PATH</div>
          <div style={{ color: MUT }}>◎ CLUSTER HUB</div>
          <div style={{ color: MUT }}>○ HALO = CPI &gt; 4%</div>
          <div style={{ color: MUT }}>SIZE = M2 MoM</div>
        </div>

        <div className="col-span-9 md:col-span-7 p-2 relative">
          <div className="absolute right-3 top-3 z-10 flex gap-1">
            <button className="t-badge" onClick={() => scaleView(0.8)}>+</button>
            <button className="t-badge" onClick={() => scaleView(1.25)}>−</button>
            <button className="t-badge" onClick={() => setView({ x: 0, y: 0, w: W, h: H })}>RESET</button>
          </div>
          <svg
            ref={svgRef}
            viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
            width="100%"
            className="cursor-grab active:cursor-grabbing select-none"
            style={{ touchAction: "none" }}
            onMouseLeave={() => { setHover(null); drag.current = null; }}
            onPointerDown={(e) => {
              drag.current = { px: e.clientX, py: e.clientY, vx: view.x, vy: view.y };
            }}
            onPointerMove={(e) => {
              const dc = drag.current;
              if (!dc || !svgRef.current) return;
              const rect = svgRef.current.getBoundingClientRect();
              const dx = ((e.clientX - dc.px) / rect.width) * view.w;
              const dy = ((e.clientY - dc.py) / rect.height) * view.h;
              const nx = dc.vx - dx;
              const ny = dc.vy - dy;
              setView((v) => ({ ...v, x: nx, y: ny }));
            }}
            onPointerUp={() => (drag.current = null)}
          >
            {[0.25, 0.5, 0.75].map((f) => (
              <g key={f} stroke={GRID} strokeDasharray="2 4">
                <line x1={L} x2={W - R} y1={T + (H - T - B) * f} y2={T + (H - T - B) * f} />
                <line y1={T} y2={H - B} x1={L + (W - L - R) * f} x2={L + (W - L - R) * f} />
              </g>
            ))}
            {tsMin < 0 && tsMax > 0 && <line x1={X(0)} x2={X(0)} y1={T} y2={H - B} stroke={MUT} strokeDasharray="4 4" />}
            {ryMin < 0 && ryMax > 0 && <line x1={L} x2={W - R} y1={Y(0)} y2={Y(0)} stroke={MUT} strokeDasharray="4 4" />}

            <text x={L + 8} y={T + 14} fontSize={9} fill={MUT}>PRE-RECESSION</text>
            <text x={W - R - 8} y={T + 14} fontSize={9} fill={MUT} textAnchor="end">OVERHEAT</text>
            <text x={L + 8} y={H - B - 8} fontSize={9} fill={MUT}>DEEP RECESSION</text>
            <text x={W - R - 8} y={H - B - 8} fontSize={9} fill={MUT} textAnchor="end">GOLDILOCKS</text>
            <text x={14} y={T + 6} fontSize={9} fill={MUT}>↑ REAL YIELD</text>
            <text x={W / 2} y={H - B + 20} fontSize={9} fill={MUT} textAnchor="middle">TERM SPREAD →</text>
            <text x={L} y={H - B + 20} fontSize={9} fill={INK}>{tsMin.toFixed(1)}</text>
            <text x={W - R} y={H - B + 20} fontSize={9} fill={INK} textAnchor="end">{tsMax.toFixed(1)}</text>
            <text x={L - 8} y={T + 10} fontSize={9} fill={INK} textAnchor="end">{ryMax.toFixed(1)}</text>
            <text x={L - 8} y={H - B} fontSize={9} fill={INK} textAnchor="end">{ryMin.toFixed(1)}</text>

            <path d={d} fill="none" stroke={BLUE} strokeWidth={2} strokeDasharray="6 6" className="md-traj" />

            {enriched.map((p, i) => (
              <g key={p.date} className="md-node" style={{ animationDelay: `${i * 15}ms` }} onMouseEnter={() => setHover(i)}>
                {p.cpi > 4 && <circle cx={X(p.ts)} cy={Y(p.ry)} r={rad(p) + 4} fill="none" stroke={REG[p.reg].c} strokeOpacity={0.5} />}
                <circle cx={X(p.ts)} cy={Y(p.ry)} r={rad(p)} fill={REG[p.reg].c} fillOpacity={0.85} />
                {p.yearLabel !== "" && (
                  <text x={X(p.ts) + 7} y={Y(p.ry) - 7} fontSize={9} fill={BLUE} fontWeight={700}>{p.yearLabel}</text>
                )}
              </g>
            ))}

            <g pointerEvents="none">
              <circle cx={hubX} cy={hubY} r={14} fill="none" stroke={REG[hubReg].c} strokeWidth={1.5} />
              <circle cx={hubX} cy={hubY} r={19} fill="none" stroke={REG[hubReg].c} strokeOpacity={0.4} />
              <text x={hubX + 22} y={hubY + 3} fontSize={9} fill={REG[hubReg].c} fontWeight={700}>HUB {bn}mo</text>
            </g>

            <g pointerEvents="none">
              <circle className="md-pulse" cx={X(now.ts)} cy={Y(now.ry)} r={9} fill="none" stroke={RED} strokeWidth={1.5} />
              <circle className="md-pulse" style={{ animationDelay: "1s" }} cx={X(now.ts)} cy={Y(now.ry)} r={9} fill="none" stroke={RED} />
              <circle cx={X(now.ts)} cy={Y(now.ry)} r={5} fill={RED} />
              <text x={X(now.ts) + 12} y={Y(now.ry) + 3} fontSize={10} fontWeight={700} fill={RED}>NOW {now.date}</text>
            </g>

            {hover !== null && (
              <g transform={`translate(${X(enriched[hover].ts) > W - 180 ? X(enriched[hover].ts) - 165 : X(enriched[hover].ts) + 12},${Math.max(10, Y(enriched[hover].ry) - 62)})`} pointerEvents="none">
                <rect width="155" height="56" fill="#f6f3ea" stroke="#2a2a2a" />
                <text x="7" y="15" fontSize={10} fontWeight="700" fill={INK}>{enriched[hover].date}</text>
                <text x="7" y="30" fontSize={10} fill={INK}>TS {enriched[hover].ts.toFixed(2)} · RY {enriched[hover].ry.toFixed(2)}</text>
                <text x="7" y="45" fontSize={10} fill={INK}>M2 {enriched[hover].m2mom}% · CPI {enriched[hover].cpi}%</text>
              </g>
            )}
          </svg>
        </div>

        <div className="col-span-12 md:col-span-3 p-3 border-l border-[#2a2a2a] space-y-2 text-[11px]">
          <div className="px-2 py-2 text-center" style={{ background: "#191919", color: "#f6f3ea" }}>
            <div className="text-[9px] tracking-widest">● NOW</div>
            <div className="font-bold">{now.date}</div>
          </div>
          <div className="border border-[#2a2a2a] p-2 text-center">
            <div className="text-[9px] tracking-widest" style={{ color: MUT }}>REGIME NODE</div>
            <div className="font-bold" style={{ color: REG[cur].c }}>{REG[cur].label}</div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between"><span>SAHM</span><b style={{ color: sahmTriggered ? RED : INK }}>{sahmValue.toFixed(2)}{sahmTriggered ? " ⚠" : ""}</b></div>
            <div className="flex justify-between"><span>M2</span><b>{m2Trend}</b></div>
            <div className="flex justify-between"><span>CONFIDENCE</span><b><CountUp to={confidence} /></b></div>
          </div>
          <div className="border-2 p-2 text-center space-y-0.5" style={{ borderColor: REG[cur].c, color: REG[cur].c }}>
            <div className="text-[9px] tracking-widest">NEXT FLIP</div>
            <div>{FLIPS[cur][0]}</div>
            <div>{FLIPS[cur][1]}</div>
          </div>
          <div className="text-[9px] text-center" style={{ color: MUT }}>
            BULL {dist.bull}% · NEUT {dist.neut}% · BEAR {dist.bear}%
          </div>
        </div>
      </div>

      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px] tracking-wider uppercase flex justify-between" style={{ color: MUT }}>
        <span>X: TERM SPREAD · Y: REAL YIELD · hover = detail · SCROLL = ZOOM · DRAG = PAN</span>
        <span>LAST SCAN {lastScan} · NEXT 6H</span>
      </footer>
    </section>
  );
}