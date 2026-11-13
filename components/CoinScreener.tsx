"use client";

import { useEffect, useMemo, useState } from "react";

const GREEN = "#1e7a46", RED = "#b3382c", GOLD = "#b8860b", INK = "#191919", MUT = "#8a8578", BLUE = "#2c5f8a";

interface Ticker { symbol: string; lastPrice: number; pct: number; qvol: number; trades: number; }

const STABLES = ["USDCUSDT", "BUSDUSDT", "FDUSDUSDT", "TUSDUSDT", "USDPUSDT", "DAIUSDT", "EURUSDT", "GBPUSDT"];
const isLev = (s: string) => /UPUSDT$|DOWNUSDT$|BULLUSDT$|BEARUSDT$/.test(s);

const fmtVol = (v: number) => v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${(v / 1e3).toFixed(0)}K`;
const fmtPrice = (p: number) => p >= 1000 ? p.toFixed(1) : p >= 1 ? p.toFixed(3) : p >= 0.01 ? p.toFixed(5) : p.toFixed(8);

export default function CoinScreener({ className = "" }: { className?: string }) {
  const [tickers, setTickers] = useState<Ticker[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [minVol, setMinVol] = useState(10_000_000);
  const [sort, setSort] = useState<"qvol" | "pct" | "move">("qvol");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [spark, setSpark] = useState<number[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("https://api.binance.com/api/v3/ticker/24hr");
        if (!res.ok) throw new Error(`${res.status}`);
        const raw = (await res.json()) as any[];
        const list: Ticker[] = raw
          .filter((t) => t.symbol.endsWith("USDT") && !STABLES.includes(t.symbol) && !isLev(t.symbol))
          .map((t) => ({ symbol: t.symbol, lastPrice: +t.lastPrice, pct: +t.priceChangePercent, qvol: +t.quoteVolume, trades: +t.count }))
          .filter((t) => t.qvol > 0 && t.lastPrice > 0);
        if (alive) setTickers(list);
      } catch (e: any) {
        if (alive) setErr(String(e?.message ?? e));
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!sel) { setSpark(null); return; }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${sel}&interval=1d&limit=90`);
        const raw = await res.json();
        if (alive) setSpark(raw.map((k: any[]) => +k[4]));
      } catch { if (alive) setSpark(null); }
    })();
    return () => { alive = false; };
  }, [sel]);

  const filtered = useMemo(() => {
    if (!tickers) return [];
    return tickers
      .filter((t) => t.qvol >= minVol)
      .filter((t) => q === "" || t.symbol.includes(q.toUpperCase()))
      .sort((a, b) => sort === "qvol" ? b.qvol - a.qvol : sort === "pct" ? b.pct - a.pct : Math.abs(b.pct) - Math.abs(a.pct))
      .slice(0, 60);
  }, [tickers, minVol, q, sort]);

  const maxVol = useMemo(() => filtered.reduce((m, t) => Math.max(m, t.qvol), 1), [filtered]);

  const selTicker = sel ? tickers?.find((t) => t.symbol === sel) : null;
  const perf90 = spark && spark.length > 1 ? ((spark[spark.length - 1] - spark[0]) / spark[0]) * 100 : NaN;
  const volAnn = useMemo(() => {
    if (!spark || spark.length < 10) return NaN;
    const ret = spark.slice(1).map((v, i) => (v - spark[i]) / spark[i]);
    const mean = ret.reduce((a, b) => a + b, 0) / ret.length;
    return Math.sqrt(ret.reduce((a, b) => a + (b - mean) ** 2, 0) / ret.length) * Math.sqrt(365) * 100;
  }, [spark]);
  const rangePos = spark && spark.length ? ((spark[spark.length - 1] - Math.min(...spark)) / ((Math.max(...spark) - Math.min(...spark)) || 1)) * 100 : NaN;

  const active = { background: "#191919", color: "#f6f3ea" };

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ COIN SCREENER · LIKUIDITAS 24 JAM · {filtered.length} COIN</span>
        <span className="flex gap-1 items-center">
          <span className="t-badge gold">BINANCE SPOT · NO KEY</span>
        </span>
      </header>

      <div className="flex flex-wrap gap-1 px-3 py-1.5 border-b border-[#2a2a2a] items-center">
        <span className="text-[9px] mr-1" style={{ color: MUT }}>MIN VOL:</span>
        {[1e6, 1e7, 5e7, 1e8].map((v) => (
          <button key={v} className="t-badge" style={minVol === v ? active : undefined} onClick={() => setMinVol(v)}>
            {v >= 1e8 ? "100M" : v >= 5e7 ? "50M" : v >= 1e7 ? "10M" : "1M"}
          </button>
        ))}
        <span className="text-[9px] ml-3 mr-1" style={{ color: MUT }}>SORT:</span>
        {([["qvol", "VOLUME"], ["pct", "GAIN"], ["move", "MOVE"]] as const).map(([k, l]) => (
          <button key={k} className="t-badge" style={sort === k ? active : undefined} onClick={() => setSort(k)}>{l}</button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="CARI COIN…"
          className="t-badge bg-transparent outline-none ml-auto w-32"
        />
      </div>

      <div className="grid grid-cols-12">
        <div className="col-span-12 md:col-span-8 max-h-[560px] overflow-y-auto">
          {err && <div className="p-10 text-center t-label" style={{ color: RED }}>● ERROR: {err}</div>}
          {!tickers && !err && <div className="p-10 text-center t-label">● SCANNING SELURUH PAIR BINANCE…</div>}
          <div className="grid grid-cols-12 gap-2 px-3 py-1 text-[9px] font-bold sticky top-0" style={{ color: MUT, background: "#efeadd", borderBottom: "1px solid #2a2a2a" }}>
            <span className="col-span-3">COIN</span>
            <span className="col-span-2 text-right">HARGA</span>
            <span className="col-span-2 text-right">24H%</span>
            <span className="col-span-3 text-right">VOL 24H</span>
            <span className="col-span-2 text-right">TRADES</span>
          </div>
          {filtered.map((t) => (
            <div
              key={t.symbol}
              onClick={() => setSel(t.symbol)}
              className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] border-b border-dotted items-center cursor-pointer"
              style={{ borderColor: "#9a938a", background: sel === t.symbol ? "rgba(44,95,138,0.12)" : undefined }}
            >
              <span className="col-span-3 font-bold">{t.symbol.replace("USDT", "")}<span style={{ color: MUT }}>/USDT</span></span>
              <span className="col-span-2 text-right">{fmtPrice(t.lastPrice)}</span>
              <span className="col-span-2 text-right font-bold" style={{ color: t.pct >= 0 ? GREEN : RED }}>
                {t.pct >= 0 ? "+" : ""}{t.pct.toFixed(2)}%
              </span>
              <span className="col-span-3 flex items-center gap-1 justify-end">
                <span className="flex-1 h-2 max-w-[70px]" style={{ background: `linear-gradient(90deg, ${BLUE} ${(t.qvol / maxVol) * 100}%, rgba(25,25,25,0.1) 0)` }} />
                <b>{fmtVol(t.qvol)}</b>
              </span>
              <span className="col-span-2 text-right" style={{ color: MUT }}>{(t.trades / 1000).toFixed(0)}K</span>
            </div>
          ))}
        </div>

        <div className="col-span-12 md:col-span-4 p-3 border-l border-[#2a2a2a] space-y-2 text-[10px]">
          {sel && selTicker ? (
            <>
              <div className="t-label">■ {sel.replace("USDT", "")} · PROFIL LIKUIDITAS</div>
              <div className="border border-[#2a2a2a] p-2 text-center">
                <div className="text-2xl font-bold">{fmtPrice(selTicker.lastPrice)}</div>
                <div className="font-bold" style={{ color: selTicker.pct >= 0 ? GREEN : RED }}>
                  {selTicker.pct >= 0 ? "+" : ""}{selTicker.pct.toFixed(2)}% · {fmtVol(selTicker.qvol)}/24j
                </div>
              </div>
              {spark && spark.length > 1 && (
                <svg viewBox="0 0 300 90" width="100%">
                  {(() => {
                    const lo = Math.min(...spark), hi = Math.max(...spark);
                    const X = (i: number) => (i / (spark.length - 1)) * 300;
                    const Y = (v: number) => 4 + (1 - (v - lo) / (hi - lo || 1)) * 82;
                    return <path d={spark.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")} fill="none" stroke={perf90 >= 0 ? GREEN : RED} strokeWidth={1.5} />;
                  })()}
                </svg>
              )}
              <div className="space-y-1">
                <div className="flex justify-between"><span>PERF 90D</span><b style={{ color: perf90 >= 0 ? GREEN : RED }}>{perf90 >= 0 ? "+" : ""}{perf90.toFixed(1)}%</b></div>
                <div className="flex justify-between"><span>VOLATILITAS ANUAL</span><b style={{ color: GOLD }}>{volAnn.toFixed(0)}%</b></div>
                <div className="flex justify-between"><span>TRADES 24J</span><b>{(selTicker.trades / 1000).toFixed(0)}K</b></div>
              </div>
              <div>
                <div className="flex justify-between text-[9px]" style={{ color: MUT }}><span>POSISI RANGE 90D</span><span>{rangePos.toFixed(0)}%</span></div>
                <div className="relative h-2 mt-1" style={{ background: "rgba(25,25,25,0.1)" }}>
                  <span className="absolute top-[-2px] w-1.5 h-3" style={{ left: `${rangePos}%`, background: INK }} />
                </div>
                <div className="flex justify-between text-[8px]" style={{ color: MUT }}><span>low</span><span>high</span></div>
              </div>
              <div className="text-[9px]" style={{ color: MUT }}>
                vol &gt; $50M/24j = slippage tipis · range pos &gt; 80% = dekat high (rawan profit-taking) · klik baris lain untuk ganti coin
              </div>
            </>
          ) : (
            <div className="p-8 text-center t-label" style={{ color: MUT }}>● klik satu coin untuk profil likuiditas</div>
          )}
        </div>
      </div>

      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px] tracking-wider uppercase" style={{ color: MUT }}>
        quote volume = uang asli yang berputar · filter lev/stable token otomatis · data snapshot 24 jam binance spot
      </footer>
    </section>
  );
}