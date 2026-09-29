"use client";

import { useMemo } from "react";
import type { Observation } from "@/lib/macro";

const GREEN = "#1e7a46", RED = "#b3382c", GOLD = "#b8860b", MUT = "#8a8578";

function monthly(obs: Observation[], count = 24): { ym: string; v: number }[] {
  const byMonth = new Map<string, number>();
  obs.forEach((o) => byMonth.set(o.date.slice(0, 7), o.value));
  return Array.from(byMonth.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-count)
    .map(([ym, v]) => ({ ym, v }));
}

function rollingZ(vals: number[]): number[] {
  return vals.map((v, i) => {
    const w = vals.slice(Math.max(0, i - 23), i + 1);
    const m = w.reduce((a, b) => a + b, 0) / w.length;
    const sd = Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / w.length) || 1;
    return Math.max(-3, Math.min(3, (v - m) / sd));
  });
}

export default function HeatGrid({ className = "", ry, ts, unrate, cpi, m2, dxy }: {
  className?: string;
  ry: Observation[]; ts: Observation[]; unrate: Observation[];
  cpi: Observation[]; m2: Observation[]; dxy: Observation[];
}) {
  const rows = [
    { key: "RY", label: "REAL YIELD", obs: ry, signal: (z: number) => (z > 1.5 ? ["TIGHT", RED] : z < -1 ? ["EASY", GREEN] : ["FLAT", GOLD]) },
    { key: "TS", label: "TERM SPREAD", obs: ts, signal: (z: number) => (z > 1 ? ["STEEP", GREEN] : z < -1 ? ["INVERTED", RED] : ["FLAT", GOLD]) },
    { key: "SAHM", label: "SAHM RULE", obs: unrate, signal: (z: number) => (z > 1 ? ["RISK", RED] : ["SAFE", GREEN]) },
    { key: "CPI", label: "CPI YOY", obs: cpi, signal: (z: number) => (z > 1.5 ? ["HOT", RED] : z < -1 ? ["COOL", GREEN] : ["WARM", GOLD]) },
    { key: "M2", label: "M2", obs: m2, signal: (z: number) => (z > 0.5 ? ["LIQ+", GREEN] : z < -0.5 ? ["LIQ-", RED] : ["FLAT", GOLD]) },
    { key: "DXY", label: "USD INDEX", obs: dxy, signal: (z: number) => (z > 1.5 ? ["RISK-", RED] : z < -1 ? ["RISK+", GREEN] : ["NEUTRAL", GOLD]) },
  ];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data = useMemo(() => rows.map((r) => {
    const mo = monthly(r.obs);
    const z = rollingZ(mo.map((m) => m.v));
    const cur = z.length ? z[z.length - 1] : 0;
    return { ...r, mo, z, cur, sig: r.signal(cur) as [string, string] };
  }), [ry, ts, unrate, cpi, m2, dxy]);

  const ticks = data[0]?.mo ?? [];
  const COLS = "92px 1fr 64px 84px";

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ MACRO HEAT MATRIX · EVOLUSI Z-SCORE 24 BULAN</span>
        <span className="t-badge gold">Z-SCORE MATRIX</span>
      </header>
      <div className="p-3 space-y-1 heat-scan">
        <div className="grid gap-1" style={{ gridTemplateColumns: COLS }}>
          <span />
          <span className="flex gap-[1px]">
            {ticks.map((t) => (
              <span key={t.ym} className="flex-1 text-center text-[8px]" style={{ color: MUT }}>
                {t.ym.endsWith("-01") ? `'${t.ym.slice(2, 4)}` : ""}
              </span>
            ))}
          </span>
          <span className="text-[8px] text-right" style={{ color: MUT }}>Z NOW</span>
          <span className="text-[8px] text-center" style={{ color: MUT }}>SIGNAL</span>
        </div>
        {data.map((r) => (
          <div key={r.key} className="grid gap-1 items-center" style={{ gridTemplateColumns: COLS }}>
            <span className="text-[9px] font-bold">{r.label}</span>
            <span className="flex gap-[1px] h-4">
              {r.z.map((z, i) => (
                <span
                  key={i}
                  className={i === r.z.length - 1 ? "flex-1 tile tile-live" : "flex-1 tile"}
                  title={`${r.mo[i]?.ym} · z ${z.toFixed(2)}`}
                  style={{
                    background: z >= 0 ? `rgba(30,122,70,${0.12 + (Math.abs(z) / 3) * 0.85})` : `rgba(179,56,44,${0.12 + (Math.abs(z) / 3) * 0.85})`,
                  }}
                />
              ))}
            </span>
            <span className="text-[10px] font-bold text-right" style={{ color: r.cur >= 0 ? GREEN : RED }}>
              {r.cur >= 0 ? "+" : ""}{r.cur.toFixed(2)}
            </span>
            <span className="text-[9px] font-bold text-center border py-0.5" style={{ color: r.sig[1], borderColor: r.sig[1] }}>
              {r.sig[0]}
            </span>
          </div>
        ))}
      </div>
      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px] tracking-wider uppercase" style={{ color: MUT }}>
        tiap tile = z-score bulan itu vs 24 bulan sebelumnya · hijau = ekstrem tinggi · merah = ekstrem rendah · pekat = |z| besar · tile berdenyut = bulan live
      </footer>
    </section>
  );
}