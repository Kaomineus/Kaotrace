"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Observation } from "@/lib/macro";

const GREEN = "#1e7a46", RED = "#b3382c", MUT = "#8a8578";

function FlagDot(props: any) {
  const { cx, cy, up, label } = props;
  if (cx == null || cy == null) return null;
  return (
    <g>
      <line x1={cx} y1={cy} x2={cx} y2={cy - 34} stroke={up ? GREEN : RED} strokeDasharray="3 3" />
      <rect x={cx - 36} y={cy - 52} width={72} height={18} fill="#f6f3ea" stroke={up ? GREEN : RED} />
      <text x={cx} y={cy - 39} textAnchor="middle" fontSize={9} fontWeight={700} fill={up ? GREEN : RED}>
        {up ? "▲" : "▼"} {label}
      </text>
      <circle cx={cx} cy={cy} r={3.5} fill={up ? GREEN : RED} />
    </g>
  );
}

export default function LiquidityV2({ className = "", m2 }: { className?: string; m2: Observation[] }) {
  const mom = useMemo(
    () => m2.slice(1).map((o, i) => ({ date: o.date, v: +(((o.value - m2[i].value) / m2[i].value) * 100).toFixed(2) })),
    [m2]
  );

  const flags = useMemo(() => {
    const level = new Map(m2.map((o) => [o.date, o.value]));
    const sm = mom.map((_, i) => {
      const a = mom[Math.max(0, i - 2)]?.v ?? 0, b = mom[Math.max(0, i - 1)]?.v ?? 0, c = mom[i]?.v ?? 0;
      return (a + b + c) / 3;
    });
    const out: { date: string; up: boolean; label: string; y: number }[] = [];
    for (let i = 1; i < sm.length; i++) {
      if ((sm[i - 1] <= 0 && sm[i] > 0.05) || (sm[i - 1] >= 0 && sm[i] < -0.05)) {
        out.push({ date: mom[i].date, up: sm[i] > 0, label: mom[i].date.slice(0, 7), y: level.get(mom[i].date) ?? 0 });
      }
    }
    return out.slice(-6);
  }, [mom, m2]);

  const lastMom = mom.length ? mom[mom.length - 1].v : 0;
  const yoy = m2.length > 13 ? +(((m2[m2.length - 1].value - m2[m2.length - 13].value) / m2[m2.length - 13].value) * 100).toFixed(1) : 0;
  const lastFlip = flags.length ? flags[flags.length - 1].label : "—";

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ LIQUIDITY CURVE · M2SL</span>
        <span className="t-badge green">▲ M2</span>
      </header>
      <div className="p-3">
        <ResponsiveContainer width="100%" height={230}>
          <AreaChart data={m2} margin={{ top: 30, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid stroke="#ddd6c4" strokeDasharray="2 4" />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#191919" interval="preserveStartEnd" />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9 }} stroke="#191919" />
            <Tooltip contentStyle={{ backgroundColor: "#f6f3ea", border: "1px solid #2a2a2a", fontSize: 10 }} />
            <Area dataKey="value" stroke={GREEN} strokeWidth={1.5} fill="#1e7a4622" />
            {flags.map((f) => (
              <ReferenceDot key={f.date} x={f.date} y={f.y} r={0} shape={<FlagDot up={f.up} label={f.label} />} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-[2px] mt-2 h-2.5">
          {mom.slice(-120).map((m) => (
            <span key={m.date} className="flex-1" style={{ background: m.v >= 0 ? GREEN : RED, opacity: 0.25 + Math.min(0.75, Math.abs(m.v) * 0.8) }} />
          ))}
        </div>
        <div className="text-[9px] mt-1" style={{ color: MUT }}>merah = M2 kontraksi · hijau = ekspansi (per bulan)</div>
      </div>
      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[10px] flex justify-between" style={{ color: MUT }}>
        <span>MoM {lastMom >= 0 ? "+" : ""}{lastMom}%</span>
        <span>YOY {yoy >= 0 ? "+" : ""}{yoy}%</span>
        <span>FLIP TERAKHIR: {lastFlip}</span>
      </footer>
    </section>
  );
}