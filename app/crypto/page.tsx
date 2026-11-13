"use client";

import { useState } from "react";
import CoinScreener from "@/components/CoinScreener";
import CandleGrid from "@/components/CandleGrid";
import DepthMap from "@/components/DepthMap";
import OrderBook from "@/components/OrderBook";
import CorrelationGraph from "@/components/CorrelationGraph";
import DefiTvl from "@/components/DefiTvl";
import Sentiment from "@/components/Sentiment";

const TABS = ["SCREENER", "CANDLES", "DOM", "ORDERBOOK", "CORRELATION", "DEFI TVL", "SENTIMENT"] as const;

export default function CryptoPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("SCREENER");
  const active = { background: "#191919", color: "#f6f3ea" };

  return (
    <main className="min-h-screen w-full p-2 md:p-3 space-y-2 md:space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] tracking-widest uppercase">
        <span>● MAKRODECK · F3 · CRYPTO ANALYZER</span>
        <span className="flex gap-2">
          <a href="/" className="t-badge">← F1 MACRO</a>
          <a href="/tools" className="t-badge">F2 QUANT</a>
          <a href="/events" className="t-badge">F4 EVENTS</a>
          <span className="t-badge gold">BINANCE PUBLIC · NO KEY</span>
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className="t-badge" style={tab === t ? active : undefined}>
            {t}
          </button>
        ))}
      </div>

      {tab === "SCREENER" && <CoinScreener />}
      {tab === "CANDLES" && <CandleGrid />}
      {tab === "DOM" && <DepthMap />}
      {tab === "ORDERBOOK" && <OrderBook />}
      {tab === "CORRELATION" && <CorrelationGraph />}
      {tab === "DEFI TVL" && <DefiTvl />}
      {tab === "SENTIMENT" && <Sentiment />}
    </main>
  );
}