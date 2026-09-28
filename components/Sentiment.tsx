"use client";

import { useEffect, useState } from "react";

const RED = "#b3382c", GOLD = "#b8860b", GREEN = "#1e7a46", MUT = "#8a8578", INK = "#191919";

interface FngPoint { value: string; classification: string; timestamp: string; }
interface Stablecoin { symbol: string; name: string; circulating: number; }

const classify = (v: number): [string, string] =>
  v < 25 ? ["EXTREME FEAR", RED] :
  v < 45 ? ["FEAR", GOLD] :
  v < 55 ? ["NEUTRAL", MUT] :
  v < 75 ? ["GREED", GREEN] :
  ["EXTREME GREED", GREEN];

export default function Sentiment({ className = "" }: { className?: string }) {
  const [fng, setFng] = useState<FngPoint[] | null>(null);
  const [stab, setStab] = useState<Stablecoin[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [fngRes, stabRes] = await Promise.all([
          fetch("https://api.alternative.me/fng/?limit=30"),
          fetch("https://stablecoins.llama.fi/stablecoins"),
        ]);
        if (!fngRes.ok || !stabRes.ok) throw new Error(`HTTP ${fngRes.status}/${stabRes.status}`);
        const fngJson = await fngRes.json();
        const stabJson = await stabRes.json();
        if (!alive) return;
        setFng(fngJson.data.slice().reverse());
        const topSyms = ["USDT", "USDC", "DAI", "FDUSD", "USDe", "PYUSD"];
        const top: Stablecoin[] = (stabJson.peggedAssets ?? [])
          .filter((s: any) => topSyms.includes(s.symbol) || (s.circulating?.peggedUSD ?? 0) > 1e9)
          .map((s: any) => ({
            symbol: s.symbol as string,
            name: s.name as string,
            circulating: (s.circulating?.peggedUSD ?? 0) as number,
          }))
          .sort((a: Stablecoin, b: Stablecoin) => b.circulating - a.circulating)
          .slice(0, 6);
        setStab(top);
      } catch (e: any) {
        if (alive) setErr(String(e?.message ?? e));
      }
    })();
    return () => { alive = false; };
  }, []);

  const current = fng?.[fng.length - 1];
  const [cls, clsCol] = current ? classify(+current.value) : ["…", MUT];

  const stabTotal = stab ? stab.reduce((s, c) => s + c.circulating, 0) : 0;

  if (err) return <section className={`t-panel ${className}`}><div className="p-10 text-center t-label" style={{ color: RED }}>● ERROR: {err}</div></section>;
  if (!fng || !stab || !current) return <section className={`t-panel ${className}`}><div className="p-10 text-center t-label">● FETCHING SENTIMENT…</div></section>;

  const W = 300, H = 160;
  const cx = W / 2, cy = H - 10, r = 110;

  const arcPath = (start: number, end: number) => {
    const a1 = Math.PI + (start / 100) * Math.PI;
    const a2 = Math.PI + (end / 100) * Math.PI;
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };

  const needleAngle = Math.PI + (+current.value / 100) * Math.PI;
  const nx = cx + (r - 15) * Math.cos(needleAngle);
  const ny = cy + (r - 15) * Math.sin(needleAngle);

  const hist = fng.slice(-30);
  const val = +current.value;

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ MARKET SENTIMENT · FEAR & GREED + STABLECOIN</span>
        <span className="flex gap-1">
          <span className="t-badge green md-blink">● LIVE</span>
          <span className="t-badge gold">ALTERNATIVE.ME + DEFILLAMA</span>
        </span>
      </header>

      <div className="grid grid-cols-12">
        <div className="col-span-12 md:col-span-4 p-3 border-r border-[#2a2a2a]">
          <div className="t-label mb-2">■ FEAR & GREED INDEX</div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%">
            <path d={arcPath(0, 25)} stroke={RED} strokeWidth={14} fill="none" />
            <path d={arcPath(25, 45)} stroke={GOLD} strokeWidth={14} fill="none" />
            <path d={arcPath(45, 55)} stroke={MUT} strokeWidth={14} fill="none" />
            <path d={arcPath(55, 75)} stroke={GREEN} strokeWidth={14} fill="none" />
            <path d={arcPath(75, 100)} stroke={GREEN} strokeWidth={14} fill="none" opacity={0.6} />

            {[0, 25, 50, 75, 100].map((v) => {
              const a = Math.PI + (v / 100) * Math.PI;
              const x = cx + (r + 12) * Math.cos(a);
              const y = cy + (r + 12) * Math.sin(a);
              return <text key={v} x={x} y={y} fontSize={8} fill={MUT} textAnchor="middle">{v}</text>;
            })}

            <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={INK} strokeWidth={2.5} />
            <circle cx={cx} cy={cy} r={5} fill={INK} />

            <text x={cx} y={cy - 20} textAnchor="middle" fontSize={32} fontWeight={700} fill={clsCol}>{current.value}</text>
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={clsCol} letterSpacing="2">
              {cls}
            </text>
          </svg>

          <div className="mt-3">
            <div className="t-label mb-1" style={{ color: MUT }}>HISTORY 30D</div>
            <div className="flex gap-[1px] h-4">
              {hist.map((h, i) => {
                const [, col] = classify(+h.value);
                return <span key={i} className="flex-1" style={{ background: col }} />;
              })}
            </div>
            <div className="flex justify-between text-[8px] mt-1" style={{ color: MUT }}>
              <span>30d ago</span>
              <span>today</span>
            </div>
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 p-3 border-r border-[#2a2a2a]">
          <div className="t-label mb-2">■ STABLECOIN MARKET</div>
          <div className="border-2 p-2 text-center mb-3" style={{ borderColor: INK }}>
            <div className="t-label" style={{ color: MUT }}>TOTAL STABLECOIN MCAP</div>
            <div className="text-2xl font-bold">${(stabTotal / 1e9).toFixed(1)}B</div>
          </div>
          <div className="space-y-1.5">
            <div className="t-label" style={{ color: MUT }}>TOP STABLECOINS</div>
            {stab.map((s) => (
              <div key={s.symbol} className="flex items-center gap-2 text-[10px]">
                <span className="w-12 font-bold">{s.symbol}</span>
                <span className="flex-1 h-2" style={{ background: `linear-gradient(90deg, ${GREEN} ${(s.circulating / stabTotal) * 100}%, rgba(25,25,25,0.1) 0)` }} />
                <b>${(s.circulating / 1e9).toFixed(1)}B</b>
              </div>
            ))}
          </div>
          <div className="text-[9px] mt-3" style={{ color: MUT }}>
            stablecoin mcap naik = likuiditas kering di pinggir (dry powder) · biasanya precursor rally crypto
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 p-3 space-y-3 text-[10px]">
          <div className="t-label">■ SENTIMENT READOUT</div>
          <div className="border-2 p-2" style={{ borderColor: clsCol, color: clsCol }}>
            <div className="text-[9px] tracking-widest">MOOD PASAR</div>
            <div className="text-xl font-bold">{cls}</div>
            <div className="mt-1 text-[10px]" style={{ color: INK }}>
              {val < 25 && "Panic selling · sejarah: zona ini sering jadi titik balik bullish"}
              {val >= 25 && val < 45 && "Hati-hati tapi ada diskon · accumulation zone klasik"}
              {val >= 45 && val < 55 && "Sideways wait-and-see · belum ada sinyal kuat"}
              {val >= 55 && val < 75 && "Trend bullish · tapi mulai awasi euforia"}
              {val >= 75 && "Extreme euphoria · sejarah: zona ini rawan koreksi tajam"}
            </div>
          </div>
          <div className="border border-[#2a2a2a] p-2 space-y-1">
            <div className="t-label" style={{ color: MUT }}>BIAS SIGNAL</div>
            <div>● F&G: <b style={{ color: clsCol }}>{cls}</b> ({current.value})</div>
            <div>● Stablecoin liquidity: <b style={{ color: stabTotal > 1.5e11 ? GREEN : GOLD }}>{(stabTotal / 1e9).toFixed(0)}B</b></div>
            <div className="pt-1 border-t border-dashed" style={{ borderColor: "#9a938a" }}>
              <b style={{ color: clsCol }}>
                {val < 25 && stabTotal > 1.5e11 && "★ STRONG BUY ZONE — panic + dry powder"}
                {val < 25 && stabTotal <= 1.5e11 && "◆ CONTRARIAN BUY — konfirmasi on-chain"}
                {val >= 25 && val < 55 && "◆ WAIT — belum ada edge jelas"}
                {val >= 55 && val < 75 && "◆ HOLD / TRAIL STOP"}
                {val >= 75 && "⚠ TAKE PROFIT ZONE — euphoria tinggi"}
              </b>
            </div>
          </div>
          <div className="text-[9px]" style={{ color: MUT }}>
            F&G alone = noise · kombinasi stablecoin mcap = konteks likuiditas · konfirmasi dari F1 (M2) + F2 (VaR)
          </div>
        </div>
      </div>

      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px] tracking-wider uppercase" style={{ color: MUT }}>
        alternative.me fng (vol, momentum, social, dominance, survey) · defillama stablecoins · no key
      </footer>
    </section>
  );
}