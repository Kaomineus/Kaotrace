"use client";

import { useState } from "react";
import EventCalendar from "@/components/EventCalendar";
import SurpriseTracker from "@/components/SurpriseTracker";

const TABS = ["CALENDAR", "SURPRISE", "EVENT STUDY"] as const;

export default function EventsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("CALENDAR");
  const active = { background: "#191919", color: "#f6f3ea" };

  return (
    <main className="min-h-screen w-full p-2 md:p-3 space-y-2 md:space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] tracking-widest uppercase">
        <span>● MAKRODECK · F4 · EVENT TERMINAL</span>
        <span className="flex gap-2">
          <a href="/" className="t-badge">← F1 MACRO</a>
          <a href="/tools" className="t-badge">F2 QUANT</a>
          <a href="/crypto" className="t-badge">F3 CRYPTO</a>
          <span className="t-badge gold">FOREX FACTORY · NO KEY</span>
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className="t-badge" style={tab === t ? active : undefined}>
            {t}
          </button>
        ))}
      </div>

      {tab === "CALENDAR" && <EventCalendar />}
      {tab === "SURPRISE" && <SurpriseTracker />}
      {tab !== "CALENDAR" && tab !== "SURPRISE" && (
        <section className="t-panel">
          <header className="t-head">
            <span className="t-label">■ {tab}</span>
            <span className="t-badge gold">SEGERA</span>
          </header>
          <div className="p-10 text-center t-label">● MODULE {tab} — CHUNK BERIKUTNYA ●</div>
        </section>
      )}
    </main>
  );
}