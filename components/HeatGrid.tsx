import type { Observation } from "@/lib/macro";

const GREEN = "#1e7a46", RED = "#b3382c", GOLD = "#b8860b", MUT = "#8a8578", INK = "#191919";

const last = (a: Observation[]) => (a.length ? a[a.length - 1].value : NaN);
const ago = (a: Observation[], n: number) => (a.length > n ? a[a.length - 1 - n].value : NaN);

function z24(a: Observation[]): number {
  const vals = a.slice(-24).map((o) => o.value);
  if (vals.length < 2) return 0;
  const mean = vals.reduce((x, y) => x + y, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((x, y) => x + (y - mean) ** 2, 0) / vals.length) || 1;
  return +((vals[vals.length - 1] - mean) / sd).toFixed(2);
}

function arrow(a: Observation[], n: number, goodUp: boolean) {
  const d = last(a) - ago(a, n);
  if (isNaN(d) || Math.abs(d) < 1e-9) return { s: "▬", c: MUT };
  const up = d > 0;
  return { s: up ? "▲" : "▼", c: up === goodUp ? GREEN : RED };
}

export default function HeatGrid({ className = "", ry, ts, unrate, cpi, m2, dxy }: {
  className?: string; ry: Observation[]; ts: Observation[]; unrate: Observation[];
  cpi: Observation[]; m2: Observation[]; dxy: Observation[];
}) {
  const cpiY = (cpi.map((o, i) => i < 12 ? null : ({ date: o.date, value: +(((o.value - cpi[i - 12].value) / cpi[i - 12].value) * 100).toFixed(2) } as Observation))).filter(Boolean) as Observation[];

  const rows = [
    { name: "REAL YIELD", level: last(ry).toFixed(2), a3: arrow(ry, 3, false), a12: arrow(ry, 12, false), z: z24(ry), sig: last(ry) > 2 ? ["TIGHT", RED] : last(ry) > 0 ? ["MID", GOLD] : ["EASY", GREEN] },
    { name: "TERM SPREAD", level: last(ts).toFixed(2), a3: arrow(ts, 3, true), a12: arrow(ts, 12, true), z: z24(ts), sig: last(ts) < 0 ? ["WARN", RED] : last(ts) < 0.5 ? ["FLAT", GOLD] : ["NORM", GREEN] },
    { name: "SAHM RULE", level: last(unrate).toFixed(2), a3: arrow(unrate, 3, false), a12: arrow(unrate, 12, false), z: z24(unrate), sig: last(unrate) >= 0.5 ? ["RISK", RED] : last(unrate) >= 0.3 ? ["WATCH", GOLD] : ["SAFE", GREEN] },
    { name: "CPI YOY", level: `${last(cpiY).toFixed(1)}%`, a3: arrow(cpiY, 3, false), a12: arrow(cpiY, 12, false), z: z24(cpiY), sig: last(cpiY) > 4 ? ["HOT", RED] : last(cpiY) > 3 ? ["WARM", GOLD] : ["COOL", GREEN] },
    { name: "M2", level: last(m2) > ago(m2, 1) ? "UP" : "DOWN", a3: arrow(m2, 3, true), a12: arrow(m2, 12, true), z: z24(m2), sig: z24(m2) > 0.5 ? ["LIQ+", GREEN] : z24(m2) < -0.5 ? ["LIQ−", RED] : ["FLAT", GOLD] },
    { name: "USD INDEX", level: last(dxy) > ago(dxy, 1) ? "UP" : "DOWN", a3: arrow(dxy, 3, false), a12: arrow(dxy, 12, false), z: z24(dxy), sig: z24(dxy) < -0.5 ? ["RISK+", GREEN] : z24(dxy) > 0.5 ? ["RISK−", RED] : ["FLAT", GOLD] },
  ] as const;

  const COLS = "1.3fr 0.8fr 0.6fr 0.7fr 0.7fr 0.8fr";

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ MACRO HEAT GRID</span>
        <span className="t-badge gold">Z-SCORE MATRIX</span>
      </header>
      <div className="p-3 text-[10px]">
        <div className="grid gap-2 pb-1.5 t-label" style={{ gridTemplateColumns: COLS, color: MUT }}>
          <span>INDICATOR</span><span>LEVEL</span><span>3M MOM</span><span>12M YOY</span><span>Z24M</span><span>SIGNAL</span>
        </div>
        {rows.map((r) => (
          <div key={r.name} className="grid gap-2 items-center py-1.5 border-t border-dashed border-[#9a938a]">
            <div style={{ gridColumn: "1", gridRow: "1" }} />
          </div>
        ))}
        <div className="space-y-0">
          {rows.map((r) => (
            <div key={r.name} className="grid gap-2 items-center py-1.5 border-t border-dashed border-[#9a938a]" style={{ gridTemplateColumns: COLS }}>
              <span className="font-bold">{r.name}</span>
              <span>{r.level}</span>
              <span style={{ color: r.a3.c }}>{r.a3.s}</span>
              <span style={{ color: r.a12.c }}>{r.a12.s}</span>
              <span className="px-1 text-center font-bold" style={{ color: "#f6f3ea", background: r.z >= 0 ? GREEN : RED }}>{r.z >= 0 ? "+" : ""}{r.z}</span>
              <span className="text-center font-bold border px-1" style={{ color: r.sig[1], borderColor: r.sig[1] }}>{r.sig[0]}</span>
            </div>
          ))}
        </div>
      </div>
      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px]" style={{ color: MUT }}>
        GREEN = risk-on support · RED = risk-off stress · ▲▼ = arah perubahan (warna = dukung/tidak dukung risk-on)
      </footer>
    </section>
  );
}