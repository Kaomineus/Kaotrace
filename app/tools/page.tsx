"use client";

import { useState } from "react";
import MonteCarloLattice from "@/components/MonteCarloLattice";
import KillGrid from "@/components/KillGrid";
import VaRRidge from "@/components/VaRRidge";

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
      {tab !== "LATTICE" && tab !== "KILL GRID" && tab !== "VaR RIDGE" && (
        <section className="t-panel">
          <header className="t-head">
            <span className="t-label">■ {tab}</span>
            <span className="t-badge gold">SEGERA</span>
          </header>
          <div className="p-10 text-center t-label">● MODULE {tab} — DIBANGUN CHUNK BERIKUTNYA ●</div>
        </section>
      )}
    </main>
  );
}