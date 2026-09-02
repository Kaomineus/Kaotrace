"use client";

import { useEffect, useMemo, useState } from "react";
import { calcSahmRule, calcYoY, trend, type Observation } from "@/lib/macro";
import { generateNarrative, type MacroState } from "@/lib/narrative";
import DotMatrix from "@/components/DotMatrix";
import ConstellationV2 from "@/components/ConstellationV2";
import RegimeTower from "@/components/RegimeTower";
import LiquidityV2 from "@/components/LiquidityV2";
import HeatGrid from "@/components/HeatGrid";
import TopologyTabs from "@/components/TopologyTabs";

const GREEN = "#1e7a46";
const RED = "#b3382c";

interface SeriesData { seriesId: string; observations: Observation[]; }

async function fetchSeries(id: string): Promise<SeriesData | null> {
  try {
    const res = await fetch(`/api/fred/series?id=${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function zscoreLatest(obs: Observation[], lookback = 24): number {
  const vals = obs.slice(-lookback).map((o) => o.value);
  if (vals.length < 2) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length) || 1;
  return +((vals[vals.length - 1] - mean) / sd).toFixed(2);
}

const fmt = (n: number, d = 2) => (isNaN(n) ? "—" : n.toFixed(d));

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, SeriesData | null>>({});
  const [narrative, setNarrative] = useState<ReturnType<typeof generateNarrative> | null>(null);

  const IDS = ["DGS10", "T10YIE", "T10Y2Y", "UNRATE", "CPIAUCSL", "M2SL", "DTWEXBGS"];

  useEffect(() => {
    (async () => {
      const entries = await Promise.all(IDS.map(async (id) => [id, await fetchSeries(id)] as const));
      setData(Object.fromEntries(entries));
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const obs = (k: string) => data[k]?.observations ?? [];
  const last = (k: string) => { const o = obs(k); return o.length ? o[o.length - 1].value : NaN; };

  const joined = useMemo(() => {
    const a = obs("DGS10"), b = obs("T10YIE"), c = obs("T10Y2Y");
    const n = Math.min(a.length, b.length, c.length);
    const out: { date: string; ry: number; be: number; ts: number }[] = [];
    for (let i = 0; i < n; i++) {
      out.push({ date: a[i].date, ry: +(a[i].value - b[i].value).toFixed(2), be: b[i].value, ts: c[i].value });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const monthly = useMemo(() => joined.filter((_, i) => i % 21 === 0), [joined]);
  const p3d = useMemo(() => monthly.map((p, i) => ({ x: p.date, y: p.ry, z: p.ts, c: i })), [monthly]);

  const ry = joined.length ? joined[joined.length - 1].ry : NaN;
  const ts = last("T10Y2Y");
  const sahm = calcSahmRule(obs("UNRATE"));
  const cpi = calcYoY(obs("CPIAUCSL"));

  useEffect(() => {
    if (!joined.length) return;
    const state: MacroState = {
      realYield: ry,
      termSpread: ts,
      sahmTriggered: sahm.triggered,
      sahmValue: sahm.value,
      cpiYoY: cpi,
      unrateTrend: trend(obs("UNRATE")),
      m2Trend: trend(obs("M2SL")),
      dollarTrend: trend(obs("DTWEXBGS")),
    };
    setNarrative(generateNarrative(state));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const zlist = [
    { name: "REAL YIELD", z: zscoreLatest(joined.map((p) => ({ date: p.date, value: p.ry }))) },
    { name: "BREAKEVEN", z: zscoreLatest(obs("T10YIE")) },
    { name: "TERM SPREAD", z: zscoreLatest(obs("T10Y2Y")) },
    { name: "UNRATE", z: zscoreLatest(obs("UNRATE")) },
    { name: "M2", z: zscoreLatest(obs("M2SL")) },
    { name: "DXY", z: zscoreLatest(obs("DTWEXBGS")) },
  ];
  const biggest = zlist.reduce((m, b) => (Math.abs(b.z) > Math.abs(m.z) ? b : m), zlist[0]);

  const regime = narrative?.regime ?? "…";
  const big = isNaN(ry) ? " ---- " : `${ry >= 0 ? "+" : "-"}${Math.abs(ry).toFixed(2)}%`;
  const confidence = Math.min(90, 40 + (narrative?.rationale.length ?? 0) * 15);

  if (loading) {
    return <div className="p-10 text-center t-label">● BOOTING TERMINAL — FETCHING FRED…</div>;
  }

  return (
    <main className="min-h-screen max-w-[1440px] mx-auto p-3 md:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] tracking-widest uppercase">
        <span>● MAKRODECK · LIVE · FRED · {new Date().toISOString().slice(0, 10)}</span>
        <span className="flex gap-2">
          <span className="t-badge">★ F1 · MACRO TERMINAL</span>
          <span className="t-badge green">CACHE 6H</span>
          <span className="t-badge">120 REQ/MIN</span>
        </span>
      </div>

      <div className="t-panel p-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="t-label">@makrodeck — MACRO REGIME TERMINAL</div>
          <div className="text-[10px] t-muted mt-1 mb-3">
            REAL YIELD (DGS10 − T10YIE) · <span className="t-badge green">● LIVE</span>
          </div>
          <DotMatrix value={big} color={ry >= 0 ? GREEN : RED} dot={5} />
          <div className="text-[10px] t-muted mt-3">
            SAHM {fmt(sahm.value)} · REGIME: {regime.toUpperCase()}
          </div>
        </div>

        <div className="t-panel p-3 min-w-[220px]" style={{ background: "#f7edc4", borderColor: "#8a6d1a" }}>
          <div className="text-[10px] font-bold" style={{ color: "#8a6d1a" }}>★ BIGGEST MOVE · Z24M</div>
          <div className="text-lg font-bold mt-1">{biggest.name}</div>
          <div className="text-[11px]">Z-SCORE {biggest.z}</div>
          <div className="text-[10px] mt-2 pt-1 border-t border-dashed" style={{ borderColor: "#8a6d1a" }}>
            BIAS: {narrative?.bias ?? "…"}
          </div>
        </div>
      </div>

      <ConstellationV2
        points={monthly}
        m2={obs("M2SL")}
        cpi={obs("CPIAUCSL")}
        sahmValue={sahm.value}
        sahmTriggered={sahm.triggered}
        m2Trend={trend(obs("M2SL")).toUpperCase()}
        regime={regime}
        confidence={confidence}
      />

      <div className="grid grid-cols-12 gap-3">
        <RegimeTower className="col-span-12 lg:col-span-4" ry={ry} ts={ts} sahm={sahm.value} cpi={cpi} regime={regime} confidence={confidence} />
        <LiquidityV2 className="col-span-12 lg:col-span-8" m2={obs("M2SL")} />
        <HeatGrid className="col-span-12" ry={joined.map((p) => ({ date: p.date, value: p.ry }))} ts={joined.map((p) => ({ date: p.date, value: p.ts }))} unrate={obs("UNRATE")} cpi={obs("CPIAUCSL")} m2={obs("M2SL")} dxy={obs("DTWEXBGS")} />
        <TopologyTabs className="col-span-12" p3d={p3d} joined={joined} />
      </div>

      <div className="text-[9px] t-muted tracking-widest uppercase flex justify-between">
        <span>DATA: FRED · CACHE 6H · BUILT Rp 0</span>
        <span>WEEK 1/6 · MAKRODECK</span>
      </div>
    </main>
  );
}