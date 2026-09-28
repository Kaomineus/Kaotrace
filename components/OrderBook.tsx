"use client";

import { useEffect, useState } from "react";

const GREEN = "#1e7a46", RED = "#b3382c", GOLD = "#b8860b", INK = "#191919", MUT = "#8a8578";

const SYMBOLS = ["BTCUSDT", "ETHUSDT"] as const;

interface Trade { p: number; q: number; m: boolean; T: number; }

export default function OrderBook({ className = "" }: { className?: string }) {
  const [symbol, setSymbol] = useState<(typeof SYMBOLS)[number]>("BTCUSDT");
  const [bids, setBids] = useState<[number, number][]>([]);
  const [asks, setAsks] = useState<[number, number][]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    setBids([]); setAsks([]); setTrades([]);
    const s = symbol.toLowerCase();
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${s}@depth20@1000ms/${s}@trade`);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      const d = msg.data ?? msg;
      if (d.e === "trade") {
        setTrades((prev) => [{ p: +d.p, q: +d.q, m: d.m, T: d.T }, ...prev].slice(0, 40));
      } else if (d.bids && d.asks) {
        setBids(d.bids.map((b: string[]) => [+b[0], +b[1]] as [number, number]));
        setAsks(d.asks.map((a: string[]) => [+a[0], +a[1]] as [number, number]));
      }
    };
    return () => ws.close();
  }, [symbol]);

  const bestBid = bids[0]?.[0] ?? NaN;
  const bestAsk = asks[0]?.[0] ?? NaN;
  const spread = bestAsk - bestBid;
  const bps = (spread / bestAsk) * 1e4;
  const bidSum = bids.slice(0, 10).reduce((s, b) => s + b[1], 0);
  const askSum = asks.slice(0, 10).reduce((s, a) => s + a[1], 0);
  const imb = bidSum + askSum > 0 ? (bidSum / (bidSum + askSum)) * 100 : 50;
  const last = trades[0];

  const askCums: number[] = [];
  let ca = 0;
  asks.slice(0, 10).forEach((a) => { ca += a[1]; askCums.push(ca); });
  const bidCums: number[] = [];
  let cb = 0;
  bids.slice(0, 10).forEach((b) => { cb += b[1]; bidCums.push(cb); });
  const maxCum = Math.max(ca, cb, 1);

  const active = { background: "#191919", color: "#f6f3ea" };
  const qd = symbol === "BTCUSDT" ? 3 : 2;

  const Row = ({ price, qty, cum, side }: { price: number; qty: number; cum: number; side: "bid" | "ask" }) => (
    <div className="relative grid grid-cols-2 px-2 py-[3px] text-[10px]">
      <span
        className="absolute inset-y-0 right-0"
        style={{ width: `${(cum / maxCum) * 100}%`, background: side === "bid" ? "rgba(30,122,70,0.18)" : "rgba(179,56,44,0.18)" }}
      />
      <span className="relative font-bold" style={{ color: side === "bid" ? GREEN : RED }}>{price.toFixed(2)}</span>
      <span className="relative text-right">{qty.toFixed(qd)}</span>
    </div>
  );

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ ORDERBOOK LADDER + TAPE · {symbol}</span>
        <span className="flex gap-1 items-center">
          {SYMBOLS.map((s) => (
            <button key={s} className="t-badge" style={symbol === s ? active : undefined} onClick={() => setSymbol(s)}>
              {s.replace("USDT", "")}
            </button>
          ))}
          <span className="t-badge green md-blink">● WS DEPTH+TRADE</span>
        </span>
      </header>

      <div className="grid grid-cols-12">
        <div className="col-span-12 md:col-span-5 border-r border-[#2a2a2a]">
          <div className="grid grid-cols-2 px-2 py-1 text-[9px] t-label" style={{ color: MUT }}>
            <span>HARGA</span><span className="text-right">QTY</span>
          </div>
          <div className="border-b border-[#2a2a2a]">
            {[...asks.slice(0, 10)].reverse().map((a, i) => (
              <Row key={`a${i}`} price={a[0]} qty={a[1]} cum={askCums[asks.slice(0, 10).length - 1 - i] ?? 0} side="ask" />
            ))}
          </div>
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#2a2a2a]" style={{ background: "#f7edc4" }}>
            <span className="text-[11px] font-bold">{last ? last.p.toFixed(2) : "—"}</span>
            <span className="text-[9px]" style={{ color: GOLD }}>
              SPREAD {spread.toFixed(2)} · {bps.toFixed(1)} bps
            </span>
          </div>
          <div>
            {bids.slice(0, 10).map((b, i) => (
              <Row key={`b${i}`} price={b[0]} qty={b[1]} cum={bidCums[i]} side="bid" />
            ))}
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 border-r border-[#2a2a2a]">
          <div className="px-2 py-1 text-[9px] t-label" style={{ color: MUT }}>■ TAPE · TIME & SALES</div>
          <div className="max-h-[420px] overflow-hidden">
            {trades.map((t, i) => (
              <div key={`${t.T}-${i}`} className="grid grid-cols-3 px-2 py-[3px] text-[10px]" style={{ opacity: 1 - i * 0.02 }}>
                <span style={{ color: MUT }}>{new Date(t.T).toLocaleTimeString("id-ID")}</span>
                <span className="font-bold" style={{ color: t.m ? RED : GREEN }}>{t.p.toFixed(2)}</span>
                <span className="text-right">{t.q.toFixed(qd)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 md:col-span-3 p-3 space-y-3 text-[10px]">
          <div className="t-label">■ BOOK IMBALANCE</div>
          <div className="flex h-3">
            <span style={{ width: `${imb}%`, background: GREEN }} />
            <span style={{ width: `${100 - imb}%`, background: RED }} />
          </div>
          <div className="flex justify-between">
            <span style={{ color: GREEN }}>BID {imb.toFixed(0)}%</span>
            <span style={{ color: RED }}>ASK {(100 - imb).toFixed(0)}%</span>
          </div>
          <div className="border border-[#2a2a2a] p-2 space-y-1">
            <div className="flex justify-between"><span>BID 10 DEPTH</span><b>{bidSum.toFixed(qd)}</b></div>
            <div className="flex justify-between"><span>ASK 10 DEPTH</span><b>{askSum.toFixed(qd)}</b></div>
            <div className="flex justify-between"><span>SPREAD</span><b style={{ color: GOLD }}>{bps.toFixed(1)} bps</b></div>
          </div>
          <div className="text-[9px]" style={{ color: MUT }}>
            imbalance &gt; 60% bid = dinding beli tebal (support jangka pendek) · tape merah beruntun = tekanan jual agresif
          </div>
        </div>
      </div>

      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px] tracking-wider uppercase" style={{ color: MUT }}>
        binance combined stream · depth20 @1s + trade tick · m=true = seller agresif (merah)
      </footer>
    </section>
  );
}