import DotMatrix from "@/components/DotMatrix";

const GREEN = "#1e7a46", RED = "#b3382c", GOLD = "#b8860b", MUT = "#8a8578";

function Badge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span className="flex items-center gap-1 text-[10px]">
      <span style={{ color: MUT }}>{label}</span>
      <b style={{ color }}>{value}</b>
    </span>
  );
}

export default function TickerStrip({ ry, regime, sahm, cpi, m2Trend, confidence, clock, tab, setTab }: {
  ry: number; regime: string; sahm: number; cpi: number; m2Trend: string;
  confidence: number; clock: string;
  tab: string; setTab: (t: "REGIME" | "LIQUIDITY" | "POLICY" | "TOPOLOGY") => void;
}) {
  const big = isNaN(ry) ? " ---- " : `${ry >= 0 ? "+" : "-"}${Math.abs(ry).toFixed(2)}%`;
  const tabs = ["REGIME", "LIQUIDITY", "POLICY", "TOPOLOGY"] as const;
  const active = { background: "#191919", color: "#f6f3ea" };

  return (
    <div className="t-panel">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5 border-b border-[#2a2a2a]">
        <span className="t-label">● MAKRODECK</span>
        <DotMatrix value={big} color={ry >= 0 ? GREEN : RED} dot={2} />
        <Badge label="REGIME" value={regime.toUpperCase()} color={GOLD} />
        <Badge label="SAHM" value={sahm.toFixed(2)} color={sahm >= 0.5 ? RED : GREEN} />
        <Badge label="CPI" value={`${cpi.toFixed(1)}%`} color={cpi > 4 ? RED : cpi > 3 ? GOLD : GREEN} />
        <Badge label="M2" value={m2Trend} color={m2Trend === "UP" ? GREEN : RED} />
        <Badge label="CONF" value={`${confidence}%`} color={GREEN} />
        <span className="ml-auto t-badge">{clock} WIB</span>
        <a href="/tools" className="t-badge gold">F2 TOOLKIT →</a>
        <a href="/crypto" className="t-badge">F3 CRYPTO →</a>
      </div>
      <div className="flex gap-1 px-3 py-1.5">
        {tabs.map((t) => (
          <button key={t} className="t-badge" style={tab === t ? active : undefined} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <span className="ml-auto text-[9px] tracking-widest uppercase" style={{ color: MUT }}>
          FRED · CACHE 6H · BUILT Rp 0
        </span>
      </div>
    </div>
  );
}