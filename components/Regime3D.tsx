"use client";

import { useEffect, useRef } from "react";

export interface P3D { x: string; y: number; z: number; c: number; }

export default function Regime3D({ points }: { points: P3D[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let plotly: any = null;
    
    // @ts-ignore - plotly tidak bundle types

    import("plotly.js-dist-min").then((mod: any) => {
      if (cancelled || !ref.current || points.length === 0) return;
      plotly = mod.default ?? mod;
      plotly.newPlot(
        ref.current,
        [
          {
            type: "scatter3d",
            mode: "lines+markers",
            x: points.map((p) => p.x),
            y: points.map((p) => p.y),
            z: points.map((p) => p.z),
            marker: { size: 3.5, color: points.map((p) => p.c), colorscale: "RdYlGn" },
            line: { color: "#2c5f8a", width: 1.2 },
          },
        ],
        {
          paper_bgcolor: "rgba(0,0,0,0)",
          margin: { l: 0, r: 0, t: 0, b: 0 },
          scene: {
            bgcolor: "rgba(0,0,0,0)",
            xaxis: { title: { text: "TIME", font: { size: 8 } }, showbackground: false, tickfont: { size: 8 } },
            yaxis: { title: { text: "REAL YIELD", font: { size: 8 } }, gridcolor: "#ddd6c4", tickfont: { size: 8 } },
            zaxis: { title: { text: "10Y-2Y", font: { size: 8 } }, gridcolor: "#ddd6c4", tickfont: { size: 8 } },
          },
          font: { family: "IBM Plex Mono, monospace", color: "#191919" },
          showlegend: false,
        },
        { displayModeBar: false, responsive: true }
      );
    });

    return () => {
      cancelled = true;
      if (plotly && ref.current) plotly.purge(ref.current);
    };
  }, [points]);

  return <div ref={ref} style={{ height: 360, width: "100%" }} />;
}