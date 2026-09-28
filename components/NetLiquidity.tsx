"use client";

import { useMemo } from "react";
import type { Observation } from "@/lib/macro";

const GREEN = "#1e7a46", RED = "#b3382c", GOLD = "#b8860b", INK = "#191919", MUT = "#8a8578";

export default function NetLiquidity({ className = "", walcl, tga, rrp, m2 }: {
  className?: string; walcl: Observation[]; tga: Observation[]; rrp: Observation[]; m2: Observation[];
}) {
  const series = useMemo(() => {
    if (!walcl.length || !tga.length || !rrp.length) return null;
    const tgaMap = new Map(tga.map((o) => [o.date, o.value]));
    const rrpMap = new Map(rrp.map((o) => [o.date, o.value]));
    const nearest = (map: Map<string, number>, date: string): number | null => {
      if (map.has(date)) return map.get(date)!;
      const t = new Date(date).getTime();
      let best: number | null = null, bd = 8 * 86400000;
      map.forEach((v, d) => {
        const diff = Math.abs(new Date(d).getTime() - t);
        if (diff < bd) { bd = diff; best = v; }
      });
      return best;
    };
    const out: { date: string; net: number }[] = [];
    walcl.forEach((w) => {
      const t = nearest(tgaMap, w.date), r = nearest(rrpMap, w.date);
      if (t === null || r === null) return;
      out.push({ date: w.date, net: w.value / 1000 - t / 1000 - r });
    });
    return out.slice(-260);
  }, [walcl, tga, rrp]);

  const m2yoy = useMemo(() => {
    if (m2.length < 60) return null;
    const full = m2.map((o, i, arr) => {
      const prev = arr[Math.max(0, i - 52)];
      return { date: o.date, v: ((o.value - prev.value) / prev.value) * 100 };
    });
    return full.slice(-260);
  }, [m2]);

  if (!series || !m2yoy || !series.length) {
    return <section className={`t-panel ${className}`}><div className="p-10 text-center t-label">● MENUNGGU DATA NET LIQ…</div></section>;
  }

  const last = series[series.length - 1].net;
  const yoy = ((last - series[Math.max(0, series.length - 53)].net) / series[Math.max(0, series.length - 53)].net) * 100;
  const mom = ((last - series[Math.max(0, series.length - 5)].net) / series[Math.max(0, series.length - 5)].net) * 100;
  const m2Now = m2yoy[m2yoy.length - 1].v;
  const gap = yoy - m2Now;
  const verdict: [string, string] = Math.abs(gap) < 2 ? ["KONVERGEN · SEHAT", GREEN] : gap > 0 ? ["NET LIQ LEADS", GOLD] : ["M2 LEADS · WASPADAI", RED];

  const W = 760, H = 250, L = 40, R = 40, T = 12, B = 18;
  const lo = Math.min(...series.map((s) => s.net)) * 0.98;
  const hi = Math.max(...series.map((s) => s.net)) * 1.02;
  const mLo = Math.min(...m2yoy.map((m) => m.v)) - 1;
  const mHi = Math.max(...m2yoy.map((m) => m.v)) + 1;
  const X = (i: number) => L + (i / (series.length - 1)) * (W - L - R);
  const Y = (v: number) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
  const YM = (v: number) => T + (1 - (v - mLo) / (mHi - mLo || 1)) * (H - T - B);
  const pathNet = series.map((s, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(s.net).toFixed(1)}`).join(" ");
  const pathM2 = m2yoy.map((m, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${YM(m.v).toFixed(1)}`).join(" ");

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ NET LIQUIDITY · FED BS − TGA − RRP</span>
        <span className="t-badge" style={{ color: verdict[1], borderColor: verdict[1] }}>{verdict[0]}</span>
      </header>
      <div className="p-2">
        <svg viewBox={`0 0 ${W} ${H + 22}`} width="100%">
          <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke={INK} />
          <path d={pathNet} fill="none" stroke={INK} strokeWidth={2} />
          <path d={pathM2} fill="none" stroke={GOLD} strokeWidth={1.2} strokeDasharray="5 4" />
          <circle cx={X(series.length - 1)} cy={Y(last)} r={3.5} fill={INK} />
          <text x={L - 4} y={T + 8} fontSize={8} fill={MUT} textAnchor="end">${(hi / 1000).toFixed(1)}T</text>
          <text x={L - 4} y={H - B} fontSize={8} fill={MUT} textAnchor="end">${(lo / 1000).toFixed(1)}T</text>
          <text x={W - R + 4} y={T + 8} fontSize={8} fill={GOLD}>+{mHi.toFixed(0)}%</text>
          <text x={W - R + 4} y={H - B} fontSize={8} fill={GOLD}>{mLo.toFixed(0)}%</text>
          {series.map((s, i) => {
            if (i < 4) return null;
            const d = s.net - series[i - 4].net;
            return <rect key={s.date} x={X(i)} y={H + 4} width={(W - L - R) / series.length + 0.5} height={10} fill={d >= 0 ? GREEN : RED} fillOpacity={0.7} />;
          })}
          <text x={W / 2} y={H + 20} fontSize={8} fill={MUT} textAnchor="middle">hitam = net liquidity ($T) · emas dashed = M2 YoY (%) · strip = MoM net liq</text>
        </svg>
      </div>
      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px] tracking-wider uppercase flex flex-wrap gap-4" style={{ color: MUT }}>
        <span>NOW <b style={{ color: INK }}>${(last / 1000).toFixed(2)}T</b></span>
        <span>YOY <b style={{ color: yoy >= 0 ? GREEN : RED }}>{yoy >= 0 ? "+" : ""}{yoy.toFixed(1)}%</b></span>
        <span>MOM <b style={{ color: mom >= 0 ? GREEN : RED }}>{mom >= 0 ? "+" : ""}{mom.toFixed(1)}%</b></span>
        <span>M2 YOY <b style={{ color: GOLD }}>{m2Now >= 0 ? "+" : ""}{m2Now.toFixed(1)}%</b></span>
      </footer>
    </section>
  );
}