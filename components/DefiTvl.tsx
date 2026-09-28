"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#1e7a46", "#2c5f8a", "#b8860b", "#b3382c", "#6b4fa0", "#0f766e"];
const GREEN = "#1e7a46", RED = "#b3382c", GOLD = "#b8860b", INK = "#191919", MUT = "#8a8578";

interface ChainNow { name: string; tvl: number; }

const fmtB = (v: number) => `$${(v / 1e9).toFixed(1)}B`;

export default function DefiTvl({ className = "" }: { className?: string }) {
  const [chains, setChains] = useState<ChainNow[] | null>(null);
  const [hist, setHist] = useState<Record<string, Map<number, number>> | null>(null);
  const [globalHist, setGlobalHist] = useState<{ date: number; tvl: number }[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("https://api.llama.fi/chains");
        const json = await res.json();
        const top: ChainNow[] = json
          .filter((c: any) => typeof c.tvl === "number")
          .sort((a: any, b: any) => b.tvl - a.tvl)
          .slice(0, 6)
          .map((c: any) => ({ name: c.name, tvl: c.tvl }));
        const [g, ...hists] = await Promise.all([
          fetch("https://api.llama.fi/v2/historicalChainTvl").then((r) => r.json()),
          ...top.map((t) => fetch(`https://api.llama.fi/v2/historicalChainTvl/${encodeURIComponent(t.name)}`).then((r) => r.json())),
        ]);
        if (!alive) return;
        setChains(top);
        setGlobalHist(g.slice(-90));
        const maps: Record<string, Map<number, number>> = {};
        top.forEach((t, i) => {
          maps[t.name] = new Map(hists[i].map((p: any) => [p.date, p.tvl] as [number, number]));
        });
        setHist(maps);
      } catch (e: any) {
        if (alive) setErr(String(e?.message ?? e));
      }
    })();
    return () => { alive = false; };
  }, []);

  const data = useMemo(() => {
    if (!globalHist || !hist || !chains) return null;
    return globalHist.map((g) => {
      const row: any = { date: new Date(g.date * 1000).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) };
      chains.forEach((c) => { row[c.name] = +((hist[c.name].get(g.date) ?? 0) / 1e9).toFixed(2); });
      return row;
    });
  }, [globalHist, hist, chains]);

  const total = chains ? chains.reduce((s, c) => s + c.tvl, 0) : 0;
  const chg30 = globalHist && globalHist.length > 1
    ? ((globalHist[globalHist.length - 1].tvl - globalHist[0].tvl) / globalHist[0].tvl) * 100
    : 0;

  if (err) return <section className={`t-panel ${className}`}><div className="p-10 text-center t-label" style={{ color: RED }}>● ERROR: {err}</div></section>;
  if (!chains || !data) return <section className={`t-panel ${className}`}><div className="p-10 text-center t-label">● FETCHING DEFILLAMA TVL…</div></section>;

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ DEFI TVL · CHAIN BREAKDOWN · 90D</span>
        <span className="t-badge green">DEFILLAMA · NO KEY</span>
      </header>

      <div className="grid grid-cols-12">
        <div className="col-span-12 md:col-span-8 p-3">
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid stroke="#ddd6c4" strokeDasharray="2 4" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#191919" interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9 }} stroke="#191919" unit="B" />
              <Tooltip contentStyle={{ backgroundColor: "#f6f3ea", border: "1px solid #2a2a2a", fontSize: 10 }} formatter={(v: any, name: any) => [`$${v}B`, name]} />
              {chains.map((c, i) => (
                <Area key={c.name} dataKey={c.name} stackId="1" stroke={COLORS[i]} strokeWidth={1.2} fill={COLORS[i]} fillOpacity={0.35} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 text-[9px]">
            {chains.map((c, i) => (
              <span key={c.name} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5" style={{ background: COLORS[i] }} /> {c.name}
              </span>
            ))}
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 p-3 border-l border-[#2a2a2a] space-y-3 text-[10px]">
          <div className="border-2 p-2 text-center" style={{ borderColor: INK }}>
            <div className="t-label" style={{ color: MUT }}>TOTAL TVL (TOP 6)</div>
            <div className="text-2xl font-bold">{fmtB(total)}</div>
          </div>
          <div className="border border-[#2a2a2a] p-2 flex justify-between">
            <span>PERUBAHAN 90D</span>
            <b style={{ color: chg30 >= 0 ? GREEN : RED }}>{chg30 >= 0 ? "+" : ""}{chg30.toFixed(1)}%</b>
          </div>
          <div className="space-y-1.5">
            <div className="t-label" style={{ color: MUT }}>SHARE PER CHAIN</div>
            {chains.map((c, i) => (
              <div key={c.name} className="flex items-center gap-2">
                <span className="w-20">{c.name}</span>
                <span className="flex-1 h-2" style={{ background: `linear-gradient(90deg, ${COLORS[i]} ${(c.tvl / total) * 100}%, rgba(25,25,25,0.1) 0)` }} />
                <b>{((c.tvl / total) * 100).toFixed(0)}%</b>
              </div>
            ))}
          </div>
          <div className="text-[9px]" style={{ color: MUT }}>
            TVL naik = modal masuk ke on-chain (risk-on kripto) · TVL turun = modal keluar (risk-off) · konfirmasi sinyal likuiditas dari F1
          </div>
        </div>
      </div>

      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px] tracking-wider uppercase" style={{ color: MUT }}>
        sumber: api.llama.fi · stacked area = TVL per chain (miliar USD) · update harian
      </footer>
    </section>
  );
}