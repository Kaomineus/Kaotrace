"use client";

import { useMemo, useState } from "react";

const GREEN = "#1e7a46", RED = "#b3382c", GOLD = "#b8860b", INK = "#191919", MUT = "#8a8578";

function cdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}
const pdf = (x: number) => Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);

function bs(S: number, K: number, T: number, r: number, sig: number, type: "CALL" | "PUT") {
  if (T <= 0 || sig <= 0) {
    const intrinsic = type === "CALL" ? Math.max(S - K, 0) : Math.max(K - S, 0);
    return { price: intrinsic, delta: type === "CALL" ? (S > K ? 1 : 0) : S < K ? -1 : 0, gamma: 0, vega: 0, theta: 0, rho: 0 };
  }
  const sqT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + (sig * sig) / 2) * T) / (sig * sqT);
  const d2 = d1 - sig * sqT;
  const disc = Math.exp(-r * T);
  const price = type === "CALL" ? S * cdf(d1) - K * disc * cdf(d2) : K * disc * cdf(-d2) - S * cdf(-d1);
  const delta = type === "CALL" ? cdf(d1) : cdf(d1) - 1;
  const gamma = pdf(d1) / (S * sig * sqT);
  const vega = (S * pdf(d1) * sqT) / 100;
  const theta = type === "CALL"
    ? (-S * pdf(d1) * sig / (2 * sqT) - r * K * disc * cdf(d2)) / 365
    : (-S * pdf(d1) * sig / (2 * sqT) + r * K * disc * cdf(-d2)) / 365;
  const rho = type === "CALL" ? (K * T * disc * cdf(d2)) / 100 : (-K * T * disc * cdf(-d2)) / 100;
  return { price, delta, gamma, vega, theta, rho };
}

function Field({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="block">
      <div className="t-label t-muted mb-1">{label}</div>
      <div className="flex items-center gap-1">
        <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-transparent border border-[#2a2a2a] px-2 py-1.5 text-[12px] font-bold outline-none focus:border-[#1e7a46]" />
        {suffix && <span className="text-[9px] whitespace-nowrap" style={{ color: MUT }}>{suffix}</span>}
      </div>
    </label>
  );
}

export default function BlackScholes({ className = "" }: { className?: string }) {
  const [S, setS] = useState(100);
  const [K, setK] = useState(100);
  const [days, setDays] = useState(30);
  const [rate, setRate] = useState(4);
  const [vol, setVol] = useState(30);
  const [type, setType] = useState<"CALL" | "PUT">("CALL");

  const T = days / 365;
  const g = bs(S, K, T, rate / 100, vol / 100, type);
  const moneyness = S > K ? (type === "CALL" ? "ITM" : "OTM") : S < K ? (type === "CALL" ? "OTM" : "ITM") : "ATM";
  const mColor = moneyness === "ITM" ? GREEN : moneyness === "OTM" ? RED : GOLD;

  const curve = useMemo(() => {
    const lo = S * 0.6, hi = S * 1.4;
    return Array.from({ length: 80 }, (_, i) => {
      const x = lo + (i / 79) * (hi - lo);
      return { x, p: bs(x, K, T, rate / 100, vol / 100, type).price, pay: type === "CALL" ? Math.max(x - K, 0) : Math.max(K - x, 0) };
    });
  }, [S, K, T, rate, vol, type]);

  const W = 760, H = 340, L = 46, R = 16, Tm = 16, B = 30;
  const xLo = S * 0.6, xHi = S * 1.4;
  const yHi = Math.max(...curve.map((c) => Math.max(c.p, c.pay))) * 1.15 || 1;
  const X = (v: number) => L + ((v - xLo) / (xHi - xLo)) * (W - L - R);
  const Y = (v: number) => H - B - (v / yHi) * (H - Tm - B);
  const pathP = curve.map((c, i) => `${i ? "L" : "M"}${X(c.x).toFixed(1)},${Y(c.p).toFixed(1)}`).join(" ");
  const pathPay = curve.map((c, i) => `${i ? "L" : "M"}${X(c.x).toFixed(1)},${Y(c.pay).toFixed(1)}`).join(" ");

  const active = { background: "#191919", color: "#f6f3ea" };

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ BLACK-SCHOLES · OPTION PRICING DESK</span>
        <span className="flex gap-1">
          <button className="t-badge" style={type === "CALL" ? active : undefined} onClick={() => setType("CALL")}>CALL</button>
          <button className="t-badge" style={type === "PUT" ? active : undefined} onClick={() => setType("PUT")}>PUT</button>
        </span>
      </header>

      <div className="grid grid-cols-12">
        <div className="col-span-12 md:col-span-3 p-3 border-r border-[#2a2a2a] space-y-3 text-[10px]">
          <div className="t-label mb-1">■ INPUT</div>
          <Field label="SPOT (S)" value={S} onChange={setS} />
          <Field label="STRIKE (K)" value={K} onChange={setK} />
          <Field label="EXPIRY" value={days} onChange={setDays} suffix="hari" />
          <Field label="RISK-FREE (r)" value={rate} onChange={setRate} suffix="%/th" />
          <Field label="VOLATILITY (σ)" value={vol} onChange={setVol} suffix="%/th" />
          <div className="border-2 p-2 text-center" style={{ borderColor: mColor, color: mColor }}>
            <div className="text-[9px] tracking-widest">MONEYNESS</div>
            <div className="font-bold">{moneyness}</div>
          </div>
        </div>

        <div className="col-span-12 md:col-span-6 p-3">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%">
            <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke={INK} />
            <line x1={L} y1={Tm} x2={L} y2={H - B} stroke={INK} />
            <line x1={X(K)} y1={Tm} x2={X(K)} y2={H - B} stroke={MUT} strokeDasharray="4 4" />
            <text x={X(K)} y={Tm + 10} fontSize={8} fill={MUT} textAnchor="middle">K={K}</text>
            <path d={pathPay} fill="none" stroke={MUT} strokeWidth={1.5} strokeDasharray="5 4" />
            <path d={pathP} fill="none" stroke={type === "CALL" ? GREEN : RED} strokeWidth={2} />
            <circle cx={X(S)} cy={Y(g.price)} r={4} fill={type === "CALL" ? GREEN : RED} />
            <text x={X(S) + 8} y={Y(g.price) - 6} fontSize={9} fontWeight={700} fill={type === "CALL" ? GREEN : RED}>
              {g.price.toFixed(2)}
            </text>
            {[0, 0.5, 1].map((f) => (
              <text key={f} x={X(xLo + f * (xHi - xLo))} y={H - B + 14} fontSize={8} fill={MUT} textAnchor="middle">
                {(xLo + f * (xHi - xLo)).toFixed(0)}
              </text>
            ))}
            <text x={W / 2} y={H - 6} fontSize={8} fill={MUT} textAnchor="middle">SPOT → · solid = harga sekarang · dashed = payoff expiry</text>
          </svg>
        </div>

        <div className="col-span-12 md:col-span-3 p-3 border-l border-[#2a2a2a] space-y-2 text-[10px]">
          <div className="t-label mb-1">■ PRICE & GREEKS</div>
          <div className="border-2 p-2 text-center" style={{ borderColor: type === "CALL" ? GREEN : RED, color: type === "CALL" ? GREEN : RED }}>
            <div className="text-[9px] tracking-widest">{type} PRICE</div>
            <div className="text-2xl font-bold">{g.price.toFixed(2)}</div>
          </div>
          <div className="border border-[#2a2a2a] p-2 space-y-1">
            <div className="flex justify-between"><span>DELTA Δ</span><b>{g.delta.toFixed(3)}</b></div>
            <div className="flex justify-between"><span>GAMMA Γ</span><b>{g.gamma.toFixed(4)}</b></div>
            <div className="flex justify-between"><span>VEGA ν (/1%σ)</span><b>{g.vega.toFixed(3)}</b></div>
            <div className="flex justify-between"><span>THETA θ (/hari)</span><b style={{ color: RED }}>{g.theta.toFixed(3)}</b></div>
            <div className="flex justify-between"><span>RHO ρ (/1%r)</span><b>{g.rho.toFixed(3)}</b></div>
          </div>
          <div className="text-[9px] space-y-1" style={{ color: MUT }}>
            <div>Δ = perubahan harga opsi per +$1 spot</div>
            <div>θ = time decay per hari (musuh buyer)</div>
            <div>ν = sensitivitas ke perubahan vol</div>
          </div>
        </div>
      </div>

      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px]" style={{ color: MUT }}>
        C = S·N(d1) − K·e^(−rT)·N(d2) · d1 = (ln(S/K) + (r + σ²/2)T) / (σ√T) · closed-form, zero dependency
      </footer>
    </section>
  );
}