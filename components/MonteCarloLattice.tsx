"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const GREEN = "#1e7a46", RED = "#b3382c", GOLD = "#b8860b", INK = "#191919", MUT = "#8a8578";

const WORKER_SRC = `
function randn() {
  var u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
self.onmessage = function (e) {
  var d = e.data;
  var steps = 12;
  var T = d.months / 12;
  var dt = T / steps;
  var finals = [];
  var paths = [];
  for (var i = 0; i < d.n; i++) {
    var s = d.s0;
    var row = [s];
    for (var t = 1; t <= steps; t++) {
      var z = randn();
      s = s * Math.exp((d.mu - 0.5 * d.sigma * d.sigma) * dt + d.sigma * Math.sqrt(dt) * z);
      row.push(s);
    }
    finals.push(s);
    paths.push(row);
  }
  finals.sort(function (a, b) { return a - b; });
  var q = function (p) { return +finals[Math.floor(p * (finals.length - 1))].toFixed(2); };
  var sample = paths.filter(function (_, i) { return i < 200; });
  self.postMessage({
    finals: finals,
    sample: sample,
    stats: { p5: q(0.05), p25: q(0.25), p50: q(0.5), p75: q(0.75), p95: q(0.95) }
  });
};
`;

interface Stats { p5: number; p25: number; p50: number; p75: number; p95: number; }

function CountUp({ to, suffix = "", decimals = 0, duration = 1200 }: { to: number; suffix?: string; decimals?: number; duration?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      setV(+(to * k).toFixed(decimals));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, decimals]);
  return <>{v}{suffix}</>;
}

export default function MonteCarloLattice() {
  const [s0, setS0] = useState(100);
  const [mu, setMu] = useState(8);
  const [sigma, setSigma] = useState(20);
  const [months, setMonths] = useState(12);
  const [n, setN] = useState(10000);
  const [busy, setBusy] = useState(false);
  const [sample, setSample] = useState<number[][] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  const run = () => {
    setBusy(true);
    setSample(null);
    setStats(null);
    const blob = new Blob([WORKER_SRC], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const w = new Worker(url);
    w.onmessage = (e) => {
      setSample(e.data.sample);
      setStats(e.data.stats);
      setBusy(false);
      w.terminate();
      URL.revokeObjectURL(url);
    };
    w.postMessage({ s0, mu: mu / 100, sigma: sigma / 100, months, n });
  };

  const bins = useMemo(() => {
    if (!sample) return null;
    const finals = sample.map((p) => p[p.length - 1]);
    const all = finals;
    const min = Math.min(...all), max = Math.max(...all);
    const pad = (max - min) * 0.05;
    const lo = min - pad, hi = max + pad;
    const NBINS = 40;
    const size = (hi - lo) / NBINS;
    const counts = new Array(NBINS).fill(0);
    finals.forEach((v) => {
      const b = Math.min(NBINS - 1, Math.max(0, Math.floor((v - lo) / size)));
      counts[b]++;
    });
    const maxC = Math.max(...counts, 1);
    const s0Bin = Math.min(NBINS - 1, Math.max(0, Math.floor((s0 - lo) / size)));
    const loss = finals.filter((v) => v < s0).length;
    const lossPct = (loss / finals.length) * 100;
    return { lo, hi, size, counts, maxC, s0Bin, NBINS, lossPct, profitPct: 100 - lossPct };
  }, [sample, s0]);

  return (
    <section className="t-panel">
      <header className="t-head">
        <span className="t-label">■ PROBABILITY LATTICE · MONTE CARLO</span>
        <span className="flex gap-2 items-center">
          {busy && <span className="t-badge green md-blink">● SIMULATING</span>}
          <span className="t-badge">{new Intl.NumberFormat('id-ID').format(n)} SIMS</span>
        </span>
      </header>

      <div className="grid grid-cols-12">
        <div className="col-span-12 md:col-span-2 p-3 border-r border-[#2a2a2a] space-y-3 text-[10px]">
          <div className="t-label mb-1">■ INPUT</div>
          <Field label="S0 (harga awal)" value={s0} onChange={setS0} />
          <Field label="μ (return %/th)" value={mu} onChange={setMu} />
          <Field label="σ (vol %/th)" value={sigma} onChange={setSigma} />
          <Field label="Horizon (bulan)" value={months} onChange={setMonths} />
          <Field label="N (jumlah sims)" value={n} onChange={setN} />
          <button
            onClick={run}
            disabled={busy}
            className="w-full border-2 px-3 py-2 text-[11px] font-bold tracking-widest disabled:opacity-50"
            style={{ borderColor: GREEN, color: GREEN }}
          >
            {busy ? "● JALAN…" : "▶ RUN LATTICE"}
          </button>
        </div>

        <div className="col-span-12 md:col-span-8 p-2">
          <Lattice sample={sample} bins={bins} s0={s0} />
        </div>

        <div className="col-span-12 md:col-span-2 p-3 border-l border-[#2a2a2a] text-[11px] space-y-2">
          <div className="t-label mb-2">■ LIVE STATS</div>
          {stats ? (
            <>
              <div className="border border-[#2a2a2a] p-2">
                <div className="t-label" style={{ color: MUT }}>P5</div>
                <div className="text-lg font-bold" style={{ color: RED }}>{stats.p5}</div>
              </div>
              <div className="border border-[#2a2a2a] p-2">
                <div className="t-label" style={{ color: MUT }}>MEDIAN</div>
                <div className="text-lg font-bold">{stats.p50}</div>
              </div>
              <div className="border border-[#2a2a2a] p-2">
                <div className="t-label" style={{ color: MUT }}>P95</div>
                <div className="text-lg font-bold" style={{ color: GREEN }}>{stats.p95}</div>
              </div>
              {bins && (
                <div className="border-2 p-2 text-center" style={{ borderColor: GOLD, color: GOLD }}>
                  <div className="text-[9px] tracking-widest">EV / SIM</div>
                  <div className="font-bold">+{((stats.p50 / s0 - 1) * 100).toFixed(1)}%</div>
                </div>
              )}
            </>
          ) : (
            <div className="text-[10px]" style={{ color: MUT }}>● Klik RUN LATTICE untuk mulai simulasi</div>
          )}
        </div>
      </div>

      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px] tracking-wider uppercase flex justify-between" style={{ color: MUT }}>
        <span>GBM · {sample ? `${sample.length} path visible (dari ${n})` : "menunggu input"}</span>
        <span>web worker · zero freeze</span>
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

function Lattice({ sample, bins, s0 }: { sample: number[][] | null; bins: any; s0: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"idle" | "falling" | "done">("idle");

  useEffect(() => {
    if (!sample) { setPhase("idle"); return; }
    setPhase("falling");
    const t = setTimeout(() => setPhase("done"), 2400);
    return () => clearTimeout(t);
  }, [sample]);

  const W = 760, H = 480, L = 40, R = 40, T = 20, B = 40;

  if (!sample || !bins) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={10} fill={MUT} fontFamily="IBM Plex Mono, monospace" letterSpacing="3">
          ● INPUT PARAMETER · KLIK RUN LATTICE ●
        </text>
        <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke={INK} strokeWidth={1} />
        <line x1={L} y1={T} x2={L} y2={H - B} stroke={INK} strokeWidth={1} />
      </svg>
    );
  }

  const { counts, maxC, s0Bin, NBINS, lo, hi, lossPct, profitPct } = bins;
  const chartW = W - L - R;
  const chartH = H - T - B;
  const binW = chartW / NBINS;
  const s0X = L + s0Bin * binW + binW / 2;

  const finalPrice = sample.map((p) => p[p.length - 1]);
  const minP = Math.min(...finalPrice), maxP = Math.max(...finalPrice);
  const priceToX = (p: number) => L + ((p - lo) / (hi - lo)) * chartW;

  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
        <defs>
          <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={MUT} stopOpacity="0.5" />
            <stop offset="100%" stopColor={MUT} stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GREEN} stopOpacity="0.7" />
            <stop offset="100%" stopColor={GREEN} stopOpacity="0.15" />
          </linearGradient>
        </defs>

        <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke={INK} strokeWidth={1.5} />
        <line x1={s0X} y1={T} x2={s0X} y2={H - B} stroke={INK} strokeDasharray="4 4" />
        <text x={s0X} y={T - 6} textAnchor="middle" fontSize={9} fill={INK} fontWeight="700" fontFamily="IBM Plex Mono, monospace">
          S0 = {s0}
        </text>
        <text x={s0X - 8} y={T + 14} textAnchor="end" fontSize={9} fill={RED} fontWeight="700" fontFamily="IBM Plex Mono, monospace">
          LOSS {lossPct.toFixed(0)}%
        </text>
        <text x={s0X + 8} y={T + 14} fontSize={9} fill={GREEN} fontWeight="700" fontFamily="IBM Plex Mono, monospace">
          PROFIT {profitPct.toFixed(0)}%
        </text>

        {counts.map((c: number, i: number) => {
          const x = L + i * binW;
          const barH = (c / maxC) * (chartH * 0.5);
          const inProfit = i >= s0Bin;
          return (
            <rect
              key={i}
              x={x + 1}
              y={H - B - barH}
              width={binW - 2}
              height={barH}
              fill={inProfit ? "url(#greenGrad)" : "url(#histGrad)"}
              stroke={inProfit ? GREEN : MUT}
              strokeWidth={0.5}
              style={{
                transformOrigin: `${x + binW / 2}px ${H - B}px`,
                transform: phase === "done" ? "scaleY(1)" : "scaleY(0)",
                transition: `transform 0.6s cubic-bezier(.3,1.6,.4,1) ${i * 15}ms`,
              }}
            />
          );
        })}

        {phase === "falling" && sample.map((path, idx) => {
          const fp = path[path.length - 1];
          const targetX = priceToX(fp);
          const delay = (idx * 6) % 1600;
          return (
            <circle key={idx} r={1.8} fill={fp >= s0 ? GREEN : RED} opacity={0.7}>
              <animate attributeName="cy" from={T + 10} to={H - B - 4} dur="2s" begin={`${delay}ms`} fill="freeze" />
              <animate attributeName="cx" from={s0X} to={targetX} dur="2s" begin={`${delay}ms`} fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" values={`${s0X};${targetX}`} />
              <animate attributeName="opacity" from="0.8" to="0" dur="2s" begin={`${delay + 1800}ms`} fill="freeze" />
            </circle>
          );
        })}

        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const price = lo + f * (hi - lo);
          const x = L + f * chartW;
          return (
            <g key={f}>
              <line x1={x} y1={H - B} x2={x} y2={H - B + 4} stroke={INK} />
              <text x={x} y={H - B + 16} textAnchor="middle" fontSize={8} fill={MUT} fontFamily="IBM Plex Mono, monospace">
                {price.toFixed(0)}
              </text>
            </g>
          );
        })}
        <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={9} fill={MUT} fontFamily="IBM Plex Mono, monospace">
          HARGA AKHIR (setelah {Math.round((sample[0].length - 1) * (12 / 12))} bulan)
        </text>
      </svg>
    </div>
  );
}