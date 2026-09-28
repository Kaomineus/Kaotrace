"use client";

import { useState } from "react";
import MonteCarloLattice from "@/components/MonteCarloLattice";
import KillGrid from "@/components/KillGrid";
import VaRRidge from "@/components/VaRRidge";
import MoneyMgmt from "@/components/MoneyMgmt";
import ScenarioAnalysis from "@/components/ScenarioAnalysis";
import BlackScholes from "@/components/BlackScholes";

const TABS = ["LATTICE", "KILL GRID", "VaR RIDGE", "MONEY MGMT", "SCENARIO", "BLACK-SCHOLES"] as const;

export default function ToolsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("LATTICE");
  const active = { background: "#191919", color: "#f6f3ea" };

  return (
    <main className="min-h-screen max-w-[1440px] mx-auto p-3 md:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] tracking-widest uppercase">
        <span>● MAKRODECK · F2 · QUANT TOOLKIT</span>
        <span className="flex gap-2">
          <a href="/" className="t-badge">← F1 MACRO</a>
          <span className="t-badge gold">100% CLIENT-SIDE</span>
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className="t-badge" style={tab === t ? active : undefined}>
            {t}
          </button>
        ))}
      </div>

      {tab === "LATTICE" && <MonteCarloLattice />}
      {tab === "KILL GRID" && <KillGrid />}
      {tab === "VaR RIDGE" && <VaRRidge />}
      {tab === "MONEY MGMT" && <MoneyMgmt />}
      {tab === "SCENARIO" && <ScenarioAnalysis />}
      {tab === "BLACK-SCHOLES" && <BlackScholes />}
    </main>
  );
}