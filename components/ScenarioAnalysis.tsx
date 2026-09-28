"use client";

import { useState } from "react";

const GREEN = "#1e7a46", RED = "#b3382c", GOLD = "#b8860b", INK = "#191919", MUT = "#8a8578";

interface Asset {
  name: string;
  weight: number;
  sensitivity: Record<string, number>;
}

const SCENARIOS = [
  { id: "FED_CUT", label: "Fed Cut 100bp", desc: "Suku bunga turun agresif → aset risiko rally" },
  { id: "FED_HIKE", label: "Fed Hike 100bp", desc: "Suku bunga naik → aset risiko tertekan" },
  { id: "OIL_SPIKE", label: "Oil Spike +50%", desc: "Inflasi naik → komoditas untung, saham turun" },
  { id: "LIQUIDITY_CRUNCH", label: "Liquidity Crunch", desc: "M2 turun tajam → semua aset jatuh" },
  { id: "RECESSION", label: "Recession (SAHM > 0.5)", desc: "Resesi resmi → defensive win" },
  { id: "GOLDILOCKS", label: "Goldilocks", desc: "Ekonomi sehat, inflasi jinak → semua naik moderat" },
] as const;

const DEFAULT_ASSETS: Asset[] = [
  {
    name: "BTC",
    weight: 40,
    sensitivity: {
      FED_CUT: 25,
      FED_HIKE: -20,
      OIL_SPIKE: -5,
      LIQUIDITY_CRUNCH: -40,
      RECESSION: -30,
      GOLDILOCKS: 15,
    },
  },
  {
    name: "ETH",
    weight: 30,
    sensitivity: {
      FED_CUT: 30,
      FED_HIKE: -25,
      OIL_SPIKE: -8,
      LIQUIDITY_CRUNCH: -45,
      RECESSION: -35,
      GOLDILOCKS: 18,
    },
  },
  {
    name: "Gold",
    weight: 20,
    sensitivity: {
      FED_CUT: 8,
      FED_HIKE: -5,
      OIL_SPIKE: 12,
      LIQUIDITY_CRUNCH: -10,
      RECESSION: 15,
      GOLDILOCKS: 5,
    },
  },
  {
    name: "Cash",
    weight: 10,
    sensitivity: {
      FED_CUT: 0,
      FED_HIKE: 2,
      OIL_SPIKE: 0,
      LIQUIDITY_CRUNCH: 0,
      RECESSION: 5,
      GOLDILOCKS: 0,
    },
  },
];

export default function ScenarioAnalysis({ className = "" }: { className?: string }) {
  const [assets, setAssets] = useState<Asset[]>(DEFAULT_ASSETS);
  const [scenario, setScenario] = useState<(typeof SCENARIOS)[number]["id"]>("FED_CUT");

  const updateAsset = (i: number, field: keyof Asset, val: any) => {
    const next = [...assets];
    next[i] = { ...next[i], [field]: val } as Asset;
    setAssets(next);
  };

  const updateSensitivity = (i: number, scen: string, val: number) => {
    const next = [...assets];
    next[i] = { ...next[i], sensitivity: { ...next[i].sensitivity, [scen]: val } } as Asset;
    setAssets(next);
  };

  const impacts = assets.map((a) => ({
    name: a.name,
    weight: a.weight,
    impact: a.sensitivity[scenario] ?? 0,
    weightedImpact: ((a.weight / 100) * (a.sensitivity[scenario] ?? 0)),
  }));

  const totalImpact = impacts.reduce((s, i) => s + i.weightedImpact, 0);
  const verdict: [string, string] = totalImpact > 10 ? ["BULL", GREEN] : totalImpact < -10 ? ["BEAR", RED] : ["NEUTRAL", GOLD];

  const active = { background: "#191919", color: "#f6f3ea" };

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ SCENARIO ANALYSIS · STRESS TEST PORTOFOLIO</span>
        <span className="t-badge gold">WHAT-IF MACRO SHOCKS</span>
      </header>

      <div className="grid grid-cols-12">
        <div className="col-span-12 md:col-span-3 p-3 border-r border-[#2a2a2a] space-y-3">
          <div className="t-label mb-2">■ SCENARIO</div>
          <div className="space-y-1">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setScenario(s.id)}
                className="w-full text-left p-2 border border-[#2a2a2a] text-[10px]"
                style={scenario === s.id ? active : undefined}
              >
                <div className="font-bold">{s.label}</div>
                <div style={{ color: scenario === s.id ? "#f6f3ea" : MUT }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-12 md:col-span-6 p-3 space-y-3">
          <div className="t-label mb-2">■ PORTOFOLIO + SENSITIVITY</div>
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: "1fr 80px 80px" }}>
            <div className="t-label" style={{ color: MUT }}>ASET</div>
            <div className="t-label text-center" style={{ color: MUT }}>BOBOT %</div>
            <div className="t-label text-center" style={{ color: MUT }}>IMPACT %</div>
            {assets.map((a, i) => (
              <>
                <input
                  key={`name-${i}`}
                  type="text"
                  value={a.name}
                  onChange={(e) => updateAsset(i, "name", e.target.value)}
                  className="bg-transparent border border-[#2a2a2a] px-2 py-1.5 text-[11px] font-bold outline-none focus:border-[#1e7a46]"
                />
                <input
                  key={`weight-${i}`}
                  type="number"
                  value={a.weight}
                  onChange={(e) => updateAsset(i, "weight", +e.target.value)}
                  className="bg-transparent border border-[#2a2a2a] px-2 py-1.5 text-[11px] text-center outline-none"
                />
                <input
                  key={`sens-${i}`}
                  type="number"
                  value={a.sensitivity[scenario] ?? 0}
                  onChange={(e) => updateSensitivity(i, scenario, +e.target.value)}
                  className="bg-transparent border border-[#2a2a2a] px-2 py-1.5 text-[11px] text-center outline-none"
                  style={{ color: (a.sensitivity[scenario] ?? 0) > 0 ? GREEN : RED }}
                />
              </>
            ))}
          </div>
          <div className="text-[9px]" style={{ color: MUT }}>
            sensitivity = estimasi impact % aset terhadap skenario · edit sesuai tesis kamu
          </div>
        </div>

        <div className="col-span-12 md:col-span-3 p-3 border-l border-[#2a2a2a] space-y-2">
          <div className="t-label mb-2">■ IMPACT BREAKDOWN</div>
          <div className="space-y-1.5 text-[10px]">
            {impacts.map((i) => (
              <div key={i.name} className="flex items-center gap-2">
                <span className="flex-1">{i.name}</span>
                <span className="w-12 text-right" style={{ color: i.impact > 0 ? GREEN : i.impact < 0 ? RED : MUT }}>
                  {i.impact > 0 ? "+" : ""}{i.impact.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
          <div className="border-2 p-2 text-center mt-3" style={{ borderColor: verdict[1], color: verdict[1] }}>
            <div className="text-[9px] tracking-widest">VERDICT</div>
            <div className="text-xl font-bold">{totalImpact > 0 ? "+" : ""}{totalImpact.toFixed(1)}% {verdict[0]}</div>
          </div>
          <div className="text-[9px]" style={{ color: MUT }}>
            total = Σ (bobot × sensitivity) · &gt;10% = BULL, &lt;-10% = BEAR
          </div>
        </div>
      </div>

      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px]" style={{ color: MUT }}>
        sensitivity matrix = tesis kamu · ganti angka sesuai keyakinan · ini bukan prediksi, ini stress test
      </footer>
    </section>
  );
}