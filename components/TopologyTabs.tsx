"use client";

import { useMemo, useState } from "react";
import Regime3D from "@/components/Regime3D";

const RED = "#b3382c", INK = "#191919", MUT = "#8a8578", FILL = "#e8e3d5", STROKE = "#2a2a2a";

function Row({ k, v, c }: { k: string; v: string; c?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="uppercase tracking-wider">{k}</span>
      <span className="flex-1 border-b border-dotted border-[#9a938a]" />
      <span className="font-bold" style={{ color: c ?? INK }}>{v}</span>
    </div>
  );
}

function Ridge({ joined }: { joined: { date: string; ry: number }[] }) {
  const stats = useMemo(() => {
    const byYear = new Map<string, number[]>();
    joined.forEach((p) => {
      const y = p.date.slice(0, 4);
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y)!.push(p.ry);
    });
    const years = [...byYear.keys()].sort().slice(-6).map((y) => {
      const vals = byYear.get(y)!;
      return { y, vals, tail: vals.filter((v) => v < 0).length / vals.length };
    });
    const all = joined.map((p) => p.ry);
    const sorted = [...all].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const avg = all.reduce((a, b) => a + b, 0) / all.length;
    const tailMass = (all.filter((v) => v < 0).length / all.length) * 100;
    const peak = years.reduce((m, yr) => (yr.tail > m.tail ? yr : m), years[0]);
    return { years, median, avg, tailMass, peak };
  }, [joined]);

  if (!stats.years.length) return <div className="p-10 text-center t-label">● MENUNGGU DATA…</div>;

  const W = 760, L = 44, R = 12, T = 30, B = 26, rowH = 40, amp = 54, BINS = 48, lo = -3, hi = 6;
  const H = T + (stats.years.length - 1) * rowH + amp + B;
  const X = (v: number) => L + ((v - lo) / (hi - lo)) * (W - L - R);

  return (
    <div className="grid grid-cols-12">
      <div className="col-span-4 md:col-span-2 p-3 border-r border-[#2a2a2a] text-[10px] space-y-1.5">
        <div className="t-label mb-2">■ RIDGE SCAN</div>
        <Row k="YEARS" v={String(stats.years.length)} />
        <Row k="TAIL MASS" v={`${stats.tailMass.toFixed(0)}%`} c={RED} />
        <Row k="MEDIAN RY" v={`${stats.median >= 0 ? "+" : ""}${stats.median.toFixed(1)}`} />
        <Row k="AVG RY" v={`${stats.avg >= 0 ? "+" : ""}${stats.avg.toFixed(1)}`} />
        <Row k="TAIL PEAK" v={`'${stats.peak.y.slice(2)}`} c={RED} />
      </div>

      <div className="col-span-8 md:col-span-10 p-2">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%">
          {stats.years.map((yr, idx) => {
            const base = T + idx * rowH + amp;
            const counts = new Array(BINS).fill(0);
            yr.vals.forEach((v) => {
              const b = Math.min(BINS - 1, Math.max(0, Math.floor(((v - lo) / (hi - lo)) * BINS)));
              counts[b]++;
            });
            const max = Math.max(...counts, 1);
            const dens = counts.map((c, i) => ((counts[i - 1] ?? 0) + c * 2 + (counts[i + 1] ?? 0)) / 4 / max);
            const pts = dens.map((dv, i) => `${X(lo + ((i + 0.5) / BINS) * (hi - lo)).toFixed(1)},${(base - dv * amp).toFixed(1)}`);
            const full = `M${X(lo)},${base} L${pts.join(" L")} L${X(hi)},${base} Z`;
            const tailPts = dens.map((dv, i) => {
              const c = lo + ((i + 0.5) / BINS) * (hi - lo);
              return `${X(c).toFixed(1)},${(c <= 0 ? base - dv * amp : base).toFixed(1)}`;
            });
            const tail = `M${X(lo)},${base} L${tailPts.join(" L")} L${X(0)},${base} Z`;
            return (
              <g key={yr.y}>
                <path d={full} fill={FILL} stroke={STROKE} strokeWidth={1} />
                <path d={tail} fill={RED} fillOpacity={0.5} />
                <text x={4} y={base - 2} fontSize={9} fontWeight={700} fill={yr.tail > 0.15 ? RED : MUT}>'{yr.y.slice(2)}</text>
              </g>
            );
          })}

          <line x1={X(stats.median)} x2={X(stats.median)} y1={T - 6} y2={H - B + 4} stroke={INK} strokeDasharray="4 4" />
          <rect x={X(stats.median) - 48} y={6} width={96} height={14} fill={INK} />
          <text x={X(stats.median)} y={16} textAnchor="middle" fontSize={8} fontWeight={700} fill="#f6f3ea">
            NOW MEDIAN {stats.median >= 0 ? "+" : ""}{stats.median.toFixed(1)}
          </text>

          {[-2, 0, 2, 4, 6].map((t) => (
            <text key={t} x={X(t)} y={H - 8} fontSize={8} fill={MUT} textAnchor="middle">{t}</text>
          ))}
          <text x={W - R} y={H - 8} fontSize={8} fill={MUT} textAnchor="end">REAL YIELD % →</text>
        </svg>
      </div>
    </div>
  );
}

export default function TopologyTabs({ className = "", p3d, joined }: {
  className?: string;
  p3d: { x: string; y: number; z: number; c: number }[];
  joined: { date: string; ry: number }[];
}) {
  const [tab, setTab] = useState<"3D" | "RIDGE">("RIDGE");
  const active = { background: "#191919", color: "#f6f3ea" };
  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ TAIL REGIME RIDGE · RY LANDSCAPE</span>
        <span className="flex gap-1">
          <button className="t-badge" style={tab === "3D" ? active : undefined} onClick={() => setTab("3D")}>3D</button>
          <button className="t-badge" style={tab === "RIDGE" ? active : undefined} onClick={() => setTab("RIDGE")}>RIDGE</button>
        </span>
      </header>
      <div className="p-3">
        {tab === "3D" ? <Regime3D points={p3d} /> : <Ridge joined={joined} />}
      </div>
      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px]" style={{ color: MUT }}>
        {tab === "3D"
          ? "drag untuk rotate · warna = urutan waktu"
          : "every ridge = one year · ekor merah = % hari ry<0 (crisis tail) · gunung geser kanan = hawkish"}
      </footer>
    </section>
  );
}