"use client";

import { Fragment, useMemo, useState } from "react";

const GREEN = "#1e7a46", RED = "#b3382c", GOLD = "#b8860b", INK = "#191919", MUT = "#8a8578";

function phi(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

const MUS = [-10, -5, 0, 5, 10, 15, 20, 25];
const SIGS = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95];

export default function KillGrid({ className = "" }: { className?: string }) {
  const [months, setMonths] = useState(12);
  const [muNow, setMuNow] = useState(8);
  const [sigNow, setSigNow] = useState(20);
  const [hover, setHover] = useState<{ mu: number; sig: number; p: number } | null>(null);

  const T = months / 12;
  const prob = (mu: number, sig: number) => {
    const m = mu / 100, s = sig / 100;
    if (s <= 0) return m > 0 ? 1 : 0;
    return phi(((m - (s * s) / 2) * Math.sqrt(T)) / s);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const grid = useMemo(() => MUS.map((mu) => SIGS.map((sig) => prob(mu, sig))), [T]);

  const pNow = prob(muNow, sigNow);
  const verdict: [string, string] = pNow >= 0.6 ? ["SURVIVE", GREEN] : pNow >= 0.45 ? ["WATCH", GOLD] : ["KILLED", RED];
  const muNear = MUS.reduce((a, b) => (Math.abs(b - muNow) < Math.abs(a - muNow) ? b : a));
  const sigNear = SIGS.reduce((a, b) => (Math.abs(b - sigNow) < Math.abs(a - sigNow) ? b : a));

  const cellBg = (p: number) => {
    const base = p >= 0.6 ? GREEN : p >= 0.45 ? GOLD : RED;
    const alpha = Math.round((0.15 + Math.min(0.75, Math.abs(p - 0.5) * 1.6)) * 255).toString(16).padStart(2, "0");
    return { base, bg: `${base}${alpha}` };
  };

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ KILL GRID · μ × σ SURVIVAL MAP</span>
        <span className="t-badge gold">ANALYTIC Φ · INSTANT</span>
      </header>

      <div className="grid grid-cols-12">
        <div className="col-span-12 md:col-span-2 p-3 border-r border-[#2a2a2a] space-y-3 text-[10px]">
          <div className="t-label mb-1">■ PARAMETER</div>
          <Field label="Horizon T (bulan)" value={months} onChange={setMonths} />
          <Field label="μ now (%/th)" value={muNow} onChange={setMuNow} />
          <Field label="σ now (%/th)" value={sigNow} onChange={setSigNow} />
          <div className="border border-[#2a2a2a] p-2 space-y-1">
            <div className="t-label" style={{ color: MUT }}>LEGEND</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3" style={{ background: `${GREEN}99` }} /> ≥60% SURVIVE</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3" style={{ background: `${GOLD}99` }} /> 45–60% WATCH</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3" style={{ background: `${RED}99` }} /> &lt;45% KILLED</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 border-2" style={{ borderColor: INK }} /> posisi μ/σ now</div>
          </div>
        </div>

        <div className="col-span-12 md:col-span-7 p-3">
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: `52px repeat(${SIGS.length}, 1fr)` }}>
            <div />
            {SIGS.map((s) => (
              <div key={s} className="text-center text-[9px] pb-1" style={{ color: MUT }}>σ{s}</div>
            ))}
            {MUS.map((mu, ri) => (
              <Fragment key={mu}>
                <div className="text-[9px] flex items-center justify-end pr-2" style={{ color: MUT }}>
                  μ{mu > 0 ? `+${mu}` : mu}
                </div>
                {SIGS.map((sig, ci) => {
                  const p = grid[ri][ci];
                  const { base, bg } = cellBg(p);
                  const isCur = mu === muNear && sig === sigNear;
                  return (
                    <button
                      key={sig}
                      onMouseEnter={() => setHover({ mu, sig, p })}
                      className="h-8 text-[9px] font-bold"
                      style={{
                        background: bg,
                        color: base,
                        outline: isCur ? `2px solid ${INK}` : undefined,
                        outlineOffset: -2,
                      }}
                    >
                      {(p * 100).toFixed(0)}
                    </button>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="col-span-12 md:col-span-3 p-3 border-l border-[#2a2a2a] space-y-2 text-[10px]">
          <div className="t-label mb-1">■ READOUT</div>
          <div className="border-2 p-2 text-center" style={{ borderColor: verdict[1], color: verdict[1] }}>
            <div className="text-[9px] tracking-widest">VERDICT · μ{muNow} σ{sigNow} · T{months}m</div>
            <div className="text-xl font-bold">{(pNow * 100).toFixed(1)}% {verdict[0]}</div>
          </div>
          {hover && (
            <div className="border border-[#2a2a2a] p-2 space-y-0.5">
              <div className="t-label" style={{ color: MUT }}>HOVER CELL</div>
              <div>μ {hover.mu > 0 ? `+${hover.mu}` : hover.mu}% · σ {hover.sig}%</div>
              <div className="font-bold" style={{ color: cellBg(hover.p).base }}>P(profit) {(hover.p * 100).toFixed(1)}%</div>
            </div>
          )}
          <div className="border border-[#2a2a2a] p-2 space-y-1">
            <div className="t-label" style={{ color: MUT }}>FRONTIER P=50%</div>
            <div>μ = σ²/2 → pada σ{sigNow}% butuh μ ≥ {((sigNow / 100) ** 2 / 2 * 100).toFixed(1)}%/th</div>
            <div style={{ color: MUT }}>di bawah frontier = sel merah</div>
          </div>
        </div>
      </div>

      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px]" style={{ color: MUT }}>
        P(S_T &gt; S0) = Φ((μ − σ²/2)·√T / σ) · GBM closed-form · setiap sel = 1 config yang "di-backtest" analitik
      </footer>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="t-label t-muted mb-1">{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-transparent border border-[#2a2a2a] px-2 py-1.5 text-[12px] font-bold outline-none focus:border-[#1e7a46]"
      />
    </label>
  );
}