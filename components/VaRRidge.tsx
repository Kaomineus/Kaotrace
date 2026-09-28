"use client";

import { useEffect, useRef, useState } from "react";

const GREEN = "#1e7a46", RED = "#b3382c", GOLD = "#b8860b", INK = "#191919", MUT = "#8a8578";

interface Asset {
  name: string;
  weight: number;
  mean: number;
  vol: number;
}

function normalPDF(x: number, mu: number, sigma: number): number {
  return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
}

const DEFAULT_ASSETS: Asset[] = [
  { name: "BTC", weight: 40, mean: 80, vol: 60 },
  { name: "ETH", weight: 30, mean: 100, vol: 70 },
  { name: "Gold", weight: 30, mean: 5, vol: 15 },
];

export default function VaRRidge({ className = "" }: { className?: string }) {
  const [assets, setAssets] = useState<Asset[]>(DEFAULT_ASSETS);
  const [corr, setCorr] = useState<number[][]>([
    [1.0, 0.8, 0.1],
    [0.8, 1.0, 0.1],
    [0.1, 0.1, 1.0],
  ]);
  const [months, setMonths] = useState(1);
  const plotRef = useRef<HTMLDivElement>(null);

  const T = months / 12;
  const weights = assets.map((a) => a.weight / 100);
  const means = assets.map((a) => a.mean / 100);
  const vols = assets.map((a) => a.vol / 100);

  const portMean = means.reduce((s, m, i) => s + weights[i] * m, 0);
  let portVar = 0;
  for (let i = 0; i < assets.length; i++) {
    for (let j = 0; j < assets.length; j++) {
      portVar += weights[i] * weights[j] * vols[i] * vols[j] * corr[i][j];
    }
  }
  const portVol = Math.sqrt(portVar);

  const muT = portMean * T;
  const sigmaT = portVol * Math.sqrt(T);

  const var5 = muT - 1.645 * sigmaT;
  const var1 = muT - 2.326 * sigmaT;
  const cvar5 = muT - (normalPDF(1.645, 0, 1) / 0.05) * sigmaT;

  useEffect(() => {
    let cancelled = false;
    let plotly: any = null;

    import("plotly.js-dist-min").then((mod: any) => {
      if (cancelled || !plotRef.current) return;
      plotly = mod.default ?? mod;

      const xMin = muT - 3 * sigmaT;
      const xMax = muT + 3 * sigmaT;
      const N = 200;
      const x = Array.from({ length: N }, (_, i) => xMin + (i / (N - 1)) * (xMax - xMin));
      const y = x.map((xi) => normalPDF(xi, muT, sigmaT));
      const yVar5 = x.map((xi) => (xi <= var5 ? normalPDF(xi, muT, sigmaT) : 0));
      const yMax = Math.max(...y);

      plotly.newPlot(
        plotRef.current,
        [
          {
            x, y, type: "scatter", mode: "lines", fill: "tozeroy",
            line: { color: MUT, width: 2 }, fillcolor: "rgba(138,133,120,0.2)",
            hoverinfo: "skip",
          },
          {
            x, y: yVar5, type: "scatter", mode: "lines", fill: "tozeroy",
            line: { color: RED, width: 0 }, fillcolor: "rgba(179,56,44,0.5)",
            hoverinfo: "skip",
          },
        ],
        {
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          margin: { l: 40, r: 20, t: 20, b: 40 },
          xaxis: { title: "Return Portofolio (%)", gridcolor: "#ddd6c4", zerolinecolor: INK, zeroline: true },
          yaxis: { title: "Density", showgrid: false },
          shapes: [
            { type: "line", x0: muT, x1: muT, y0: 0, y1: yMax * 0.9, line: { color: INK, width: 2, dash: "dash" } },
            { type: "line", x0: var5, x1: var5, y0: 0, y1: yMax * 0.9, line: { color: GOLD, width: 2, dash: "dash" } },
            { type: "line", x0: var1, x1: var1, y0: 0, y1: yMax * 0.9, line: { color: RED, width: 2, dash: "dash" } },
          ],
          annotations: [
            { x: muT, y: yMax * 0.92, text: `Mean ${(muT * 100).toFixed(1)}%`, showarrow: false, font: { size: 9, color: INK } },
            { x: var5, y: yMax * 0.92, text: `VaR 5% ${(var5 * 100).toFixed(1)}%`, showarrow: false, font: { size: 9, color: GOLD } },
            { x: var1, y: yMax * 0.92, text: `VaR 1% ${(var1 * 100).toFixed(1)}%`, showarrow: false, font: { size: 9, color: RED } },
          ],
          font: { family: "IBM Plex Mono, monospace", color: INK },
          showlegend: false,
        },
        { displayModeBar: false, responsive: true }
      );
    });

    return () => {
      cancelled = true;
      if (plotly && plotRef.current) plotly.purge(plotRef.current);
    };
  }, [muT, sigmaT, var5, var1]);

  const updateAsset = (i: number, field: keyof Asset, val: number | string) => {
    const next = [...assets];
    next[i] = { ...next[i], [field]: val } as Asset;
    setAssets(next);
  };

  const updateCorr = (i: number, j: number, val: number) => {
    const next = corr.map((row) => [...row]);
    next[i][j] = val;
    next[j][i] = val;
    setCorr(next);
  };

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ VaR RIDGE · PORTFOLIO TAIL RISK</span>
        <span className="t-badge gold">PARAMETRIC · NORMAL</span>
      </header>

      <div className="grid grid-cols-12">
        <div className="col-span-12 md:col-span-3 p-3 border-r border-[#2a2a2a] space-y-3 text-[10px]">
          <div className="t-label mb-1">■ PORTOFOLIO</div>
          {assets.map((a, i) => (
            <div key={i} className="space-y-1 border border-[#2a2a2a] p-2">
              <input
                type="text"
                value={a.name}
                onChange={(e) => updateAsset(i, "name", e.target.value)}
                className="w-full bg-transparent border border-[#2a2a2a] px-2 py-1 text-[11px] font-bold outline-none focus:border-[#1e7a46]"
              />
              <div className="grid grid-cols-3 gap-1">
                <div>
                  <div className="t-label t-muted">Bobot %</div>
                  <input type="number" value={a.weight} onChange={(e) => updateAsset(i, "weight", +e.target.value)} className="w-full bg-transparent border border-[#2a2a2a] px-1 py-0.5 text-[10px] outline-none" />
                </div>
                <div>
                  <div className="t-label t-muted">μ %/th</div>
                  <input type="number" value={a.mean} onChange={(e) => updateAsset(i, "mean", +e.target.value)} className="w-full bg-transparent border border-[#2a2a2a] px-1 py-0.5 text-[10px] outline-none" />
                </div>
                <div>
                  <div className="t-label t-muted">σ %/th</div>
                  <input type="number" value={a.vol} onChange={(e) => updateAsset(i, "vol", +e.target.value)} className="w-full bg-transparent border border-[#2a2a2a] px-1 py-0.5 text-[10px] outline-none" />
                </div>
              </div>
            </div>
          ))}
          <div>
            <div className="t-label t-muted mb-1">Horizon (bulan)</div>
            <input type="number" value={months} onChange={(e) => setMonths(+e.target.value)} className="w-full bg-transparent border border-[#2a2a2a] px-2 py-1 text-[11px] font-bold outline-none focus:border-[#1e7a46]" />
          </div>
        </div>

        <div className="col-span-12 md:col-span-6 p-3">
          <div ref={plotRef} style={{ height: 360 }} />
          <div className="mt-2 border border-[#2a2a2a] p-2">
            <div className="t-label mb-1">MATRIKS KORELASI</div>
            <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${assets.length}, 1fr)` }}>
              {corr.map((row, i) =>
                row.map((c, j) => (
                  <input
                    key={`${i}-${j}`}
                    type="number"
                    step="0.1"
                    value={c}
                    disabled={i === j}
                    onChange={(e) => updateCorr(i, j, +e.target.value)}
                    className="w-full bg-transparent border border-[#2a2a2a] px-1 py-0.5 text-[10px] text-center outline-none disabled:bg-[#2a2a2a] disabled:text-white"
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col-span-12 md:col-span-3 p-3 border-l border-[#2a2a2a] space-y-2 text-[10px]">
          <div className="t-label mb-1">■ METRIK RISIKO</div>
          <div className="border border-[#2a2a2a] p-2 space-y-1">
            <div className="flex justify-between"><span>Expected Return</span><b style={{ color: GREEN }}>{(muT * 100).toFixed(2)}%</b></div>
            <div className="flex justify-between"><span>Volatility</span><b>{(sigmaT * 100).toFixed(2)}%</b></div>
            <div className="flex justify-between"><span>Sharpe (rf=0)</span><b>{(muT / sigmaT).toFixed(2)}</b></div>
          </div>
          <div className="border-2 p-2 space-y-1" style={{ borderColor: GOLD }}>
            <div className="flex justify-between"><span>VaR 5%</span><b style={{ color: GOLD }}>{(var5 * 100).toFixed(2)}%</b></div>
            <div className="flex justify-between"><span>VaR 1%</span><b style={{ color: RED }}>{(var1 * 100).toFixed(2)}%</b></div>
            <div className="flex justify-between"><span>CVaR 5%</span><b style={{ color: RED }}>{(cvar5 * 100).toFixed(2)}%</b></div>
          </div>
          <div className="border border-[#2a2a2a] p-2 space-y-1">
            <div className="t-label" style={{ color: MUT }}>INTERPRETASI</div>
            <div>VaR 5% = 95% yakin loss ≤ {(Math.abs(var5) * 100).toFixed(1)}% dalam {months} bulan</div>
            <div>CVaR 5% = rata-rata loss kalau sudah melewati VaR 5%</div>
          </div>
        </div>
      </div>

      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px]" style={{ color: MUT }}>
        VaR parametric (normal) · σ_T = σ·√T · ekor merah = P(R &lt; VaR 5%) · plot dimuat client-side (dynamic import)
      </footer>
    </section>
  );
}