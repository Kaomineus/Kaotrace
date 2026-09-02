const RED = "#b3382c", GREEN = "#1e7a46", GOLD = "#b8860b", INK = "#191919", MUT = "#8a8578";
const clamp = (n: number) => Math.max(0, Math.min(10, n));

function Dial({ value }: { value: number }) {
  const angle = -90 + (value / 100) * 180;
  return (
    <div className="flex items-center justify-center gap-2">
      <span className="text-[9px] font-bold" style={{ color: RED }}>RED</span>
      <svg width="150" height="86" viewBox="0 0 140 80">
        <path d="M 15 70 A 55 55 0 0 1 70 15" fill="none" stroke={RED} strokeOpacity="0.3" strokeWidth="8" />
        <path d="M 70 15 A 55 55 0 0 1 125 70" fill="none" stroke={GREEN} strokeOpacity="0.3" strokeWidth="8" />
        <g transform={`rotate(${angle} 70 70)`}>
          <line x1="70" y1="70" x2="70" y2="24" stroke={INK} strokeWidth="2.5" />
        </g>
        <circle cx="70" cy="70" r="4" fill={INK} />
        <text x="70" y="52" textAnchor="middle" fontSize="15" fontWeight="700" fill={INK}>{value}%</text>
      </svg>
      <span className="text-[9px] font-bold" style={{ color: GREEN }}>GREEN</span>
    </div>
  );
}

function Card({ label, value, status, fill, color }: { label: string; value: string; status: string; fill: number; color: string }) {
  return (
    <div className="border border-[#2a2a2a] p-2">
      <div className="t-label" style={{ color: MUT }}>{label}</div>
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-[9px] tracking-widest mb-1.5" style={{ color }}>{status}</div>
      <div className="flex gap-[2px]">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className="h-2 flex-1" style={{ background: i < fill ? color : "rgba(25,25,25,0.1)" }} />
        ))}
      </div>
    </div>
  );
}

export default function RegimeTower({ className = "", ry, ts, sahm, cpi, regime, confidence }: {
  className?: string; ry: number; ts: number; sahm: number; cpi: number; regime: string; confidence: number;
}) {
  const ryC = ry > 2 ? RED : ry >= 0 ? GOLD : GREEN;
  const tsC = ts < 0 ? RED : ts < 0.5 ? GOLD : GREEN;
  const saC = sahm >= 0.5 ? RED : sahm >= 0.3 ? GOLD : GREEN;
  const cpC = cpi > 4 ? RED : cpi > 3 ? GOLD : GREEN;

  const risks = [
    { cond: "SAHM > 0.50", out: "RECESSION", prox: Math.min(1, sahm / 0.5), now: sahm.toFixed(2) },
    { cond: "TS > 0", out: "NORMALIZATION", prox: ts >= 0 ? 1 : Math.max(0, 1 + ts), now: ts.toFixed(2) },
    { cond: "RY < 1.00", out: "RISK-ON WINDOW", prox: ry <= 1 ? 1 : Math.max(0, 1 - (ry - 1) / 3), now: ry.toFixed(2) },
  ];

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ REGIME CONTROL TOWER</span>
        <span className="t-badge gold">{regime.toUpperCase()}</span>
      </header>
      <div className="p-3 space-y-3">
        <Dial value={confidence} />
        <div className="grid grid-cols-2 gap-2">
          <Card label="REAL YIELD" value={`${ry.toFixed(2)}%`} status={ry > 2 ? "RESTRICTIVE" : ry >= 0 ? "NEUTRAL" : "ACCOMMODATIVE"} fill={clamp(Math.round(((ry + 2) / 6) * 10))} color={ryC} />
          <Card label="TERM SPREAD" value={ts.toFixed(2)} status={ts < 0 ? "INVERTED" : ts < 0.5 ? "FLATTENING" : "NORMAL"} fill={clamp(Math.round(((ts + 1) / 2) * 10))} color={tsC} />
          <Card label="SAHM RULE" value={sahm.toFixed(2)} status={sahm >= 0.5 ? "TRIGGERED" : sahm >= 0.3 ? "WATCH" : "SAFE"} fill={clamp(Math.round((sahm / 0.8) * 10))} color={saC} />
          <Card label="CPI YOY" value={`${cpi.toFixed(1)}%`} status={cpi > 4 ? "HOT" : cpi > 3 ? "WARM" : cpi > 2 ? "COOLING" : "COOL"} fill={clamp(Math.round((cpi / 8) * 10))} color={cpC} />
        </div>
        <div className="border border-[#2a2a2a] p-2">
          <div className="t-label mb-2" style={{ color: MUT }}>NEXT REGIME RISK</div>
          <div className="space-y-1.5 text-[10px]">
            {risks.map((r) => (
              <div key={r.cond} className="flex items-center gap-2">
                <span className="flex-1">if <b>{r.cond}</b> → {r.out}</span>
                <span className="w-16 text-right" style={{ color: MUT }}>{r.now}</span>
                <span className="flex w-14 gap-[2px]">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span key={i} className="h-1.5 flex-1" style={{ background: i < Math.round(r.prox * 6) ? GOLD : "rgba(25,25,25,0.1)" }} />
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}