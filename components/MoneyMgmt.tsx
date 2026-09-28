"use client";

import { useState } from "react";

const GREEN = "#1e7a46", RED = "#b3382c", GOLD = "#b8860b", INK = "#191919", MUT = "#8a8578";

function Field({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="block">
      <div className="t-label t-muted mb-1">{label}</div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-transparent border border-[#2a2a2a] px-2 py-1.5 text-[12px] font-bold outline-none focus:border-[#1e7a46]"
        />
        {suffix && <span className="text-[9px] whitespace-nowrap" style={{ color: MUT }}>{suffix}</span>}
      </div>
    </label>
  );
}

function Readout({ label, value, color, big }: { label: string; value: string; color?: string; big?: boolean }) {
  return (
    <div className="border border-[#2a2a2a] p-2">
      <div className="t-label" style={{ color: MUT }}>{label}</div>
      <div className={big ? "text-xl font-bold" : "text-[12px] font-bold"} style={{ color: color ?? INK }}>{value}</div>
    </div>
  );
}

export default function MoneyMgmt({ className = "" }: { className?: string }) {
  const [balance, setBalance] = useState(10000);
  const [riskPct, setRiskPct] = useState(1);
  const riskAmt = (balance * riskPct) / 100;

  const [entry, setEntry] = useState(100);
  const [stop, setStop] = useState(92);
  const riskPerUnit = Math.abs(entry - stop);
  const units = riskPerUnit > 0 ? riskAmt / riskPerUnit : 0;
  const posValue = units * entry;
  const lev = balance > 0 ? posValue / balance : 0;

  const [instrument, setInstrument] = useState<"FOREX_STD" | "GOLD" | "JPY">("FOREX_STD");
  const [slPips, setSlPips] = useState(30);
  const pipValue = instrument === "JPY" ? 6.7 : 10;
  const lots = slPips > 0 ? riskAmt / (slPips * pipValue) : 0;

  const [winRate, setWinRate] = useState(45);
  const [payoff, setPayoff] = useState(2);
  const p = winRate / 100, q = 1 - p, b = payoff;
  const kelly = b > 0 ? (b * p - q) / b : 0;
  const kellyVerdict: [string, string] = kelly <= 0 ? ["NO EDGE — KILLED", RED] : kelly < 0.1 ? ["THIN EDGE", GOLD] : ["REAL EDGE", GREEN];

  const instTabs: { k: typeof instrument; label: string }[] = [
    { k: "FOREX_STD", label: "FOREX XXX/USD" },
    { k: "GOLD", label: "GOLD XAU/USD" },
    { k: "JPY", label: "USD/JPY" },
  ];
  const active = { background: "#191919", color: "#f6f3ea" };

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ MONEY MANAGEMENT · POSITION SIZING DESK</span>
        <span className="t-badge gold">RISK FIRST · PROFIT SECOND</span>
      </header>

      <div className="px-3 pt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="BALANCE (USD)" value={balance} onChange={setBalance} />
        <Field label="RISK PER TRADE" value={riskPct} onChange={setRiskPct} suffix="%" />
        <div className="border-2 p-2" style={{ borderColor: riskPct > 2 ? RED : GREEN }}>
          <div className="t-label" style={{ color: MUT }}>RISK AMOUNT</div>
          <div className="text-xl font-bold" style={{ color: riskPct > 2 ? RED : GREEN }}>${riskAmt.toFixed(2)}</div>
        </div>
        <div className="border border-[#2a2a2a] p-2">
          <div className="t-label" style={{ color: MUT }}>RULE</div>
          <div className="text-[10px] font-bold" style={{ color: riskPct > 2 ? RED : MUT }}>
            {riskPct > 2 ? "⚠ >2% = zona ruin" : "✓ ≤2% = disiplin pro"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-0 mt-3 border-t border-[#2a2a2a]">
        <div className="col-span-12 md:col-span-4 p-3 space-y-3 border-r border-[#2a2a2a]">
          <div className="t-label">■ POSITION SIZER (saham/crypto)</div>
          <Field label="ENTRY PRICE" value={entry} onChange={setEntry} />
          <Field label="STOP LOSS" value={stop} onChange={setStop} />
          <div className="grid grid-cols-2 gap-2">
            <Readout label="UNITS" value={units.toFixed(4)} big />
            <Readout label="POS VALUE" value={`$${posValue.toFixed(0)}`} big />
          </div>
          <Readout label="LEVERAGE TERPAKAI" value={`${lev.toFixed(2)}×`} color={lev > 1 ? RED : GREEN} />
          <div className="h-2 flex gap-[2px]">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className="flex-1" style={{ background: i < Math.min(10, Math.round(lev * 5)) ? (lev > 1 ? RED : GREEN) : "rgba(25,25,25,0.1)" }} />
            ))}
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 p-3 space-y-3 border-r border-[#2a2a2a]">
          <div className="t-label">■ FOREX / GOLD LOT SIZE</div>
          <div className="flex flex-wrap gap-1">
            {instTabs.map((t) => (
              <button key={t.k} className="t-badge" style={instrument === t.k ? active : undefined} onClick={() => setInstrument(t.k)}>
                {t.label}
              </button>
            ))}
          </div>
          <Field label="STOP LOSS (PIPS)" value={slPips} onChange={setSlPips} />
          <div className="text-[10px]" style={{ color: MUT }}>pip value / lot standar: ${pipValue.toFixed(2)}</div>
          <div className="grid grid-cols-2 gap-2">
            <Readout label="LOT" value={lots.toFixed(2)} big color={GREEN} />
            <Readout label="MINI LOT" value={(lots * 10).toFixed(1)} big />
          </div>
          <Readout label="RISK CHECK" value={`$${(lots * slPips * pipValue).toFixed(2)} / trade`} color={GOLD} />
        </div>

        <div className="col-span-12 md:col-span-4 p-3 space-y-3">
          <div className="t-label">■ KELLY CRITERION</div>
          <Field label="WIN RATE" value={winRate} onChange={setWinRate} suffix="%" />
          <Field label="PAYOFF (avg win / avg loss)" value={payoff} onChange={setPayoff} suffix="R" />
          <div className="border-2 p-2 text-center" style={{ borderColor: kellyVerdict[1], color: kellyVerdict[1] }}>
            <div className="text-[9px] tracking-widest">VERDICT</div>
            <div className="font-bold">{kellyVerdict[0]}</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Readout label="FULL" value={`${(kelly * 100).toFixed(1)}%`} color={kelly > 0 ? GREEN : RED} />
            <Readout label="HALF" value={`${(kelly * 50).toFixed(1)}%`} color={GOLD} />
            <Readout label="QUARTER" value={`${(kelly * 25).toFixed(1)}%`} />
          </div>
          <div className="text-[9px]" style={{ color: MUT }}>
            f* = (b·p − q) / b · praktik sehat: pakai HALF atau QUARTER Kelly — full Kelly terlalu agresif untuk estimasi win rate yang noisy.
          </div>
        </div>
      </div>

      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px] tracking-wider uppercase" style={{ color: MUT }}>
        sizing dulu, entry kemudian · lot/units turun otomatis kalau stop dijauhkan · kelly ≤ 0 = sistem tidak punya edge
      </footer>
    </section>
  );
}