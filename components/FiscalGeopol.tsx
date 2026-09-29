"use client";

import { useEffect, useState } from "react";

const GREEN = "#1e7a46", RED = "#b3382c", GOLD = "#b8860b", INK = "#191919", MUT = "#8a8578", BLUE = "#2c5f8a";

type Level = "CALM" | "NORMAL" | "ELEVATED" | "SEVERE";

const RECO: Record<Level, string> = {
  CALM: "SIZE NORMAL · risk budget penuh",
  NORMAL: "SIZE NORMAL · risk budget penuh",
  ELEVATED: "SIZE −25% · stop loss wajib ketat",
  SEVERE: "SIZE −50% · hindari aset beta tinggi",
};

export default function FiscalGeopol({ className = "" }: { className?: string }) {
  const [deficit, setDeficit] = useState<{ date: string; v: number }[] | null>(null);
  const [fredDef, setFredDef] = useState<{ date: string; v: number; unit: "PCT" | "B" }[] | null>(null);
  const [geo, setGeo] = useState<{ t: number; c: number }[] | null>(null);
  const [sh, setSh] = useState<{ vals: number[]; src: string } | null>(null);
  const [manual, setManual] = useState<Level | null>(null);
  const [dbg, setDbg] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const info: string[] = [];
      try {
        const t = await fetch("/api/market?src=treasury").then((r) => r.json());
        const rows = (t?.data ?? []) as any[];
        const mapped = rows.map((r) => ({ date: String(r.record_date).slice(0, 10), v: Number(r.current_month_deficit) / 1e9 })).filter((r) => Number.isFinite(r.v)).slice(-24);
        info.push(`treasury:${mapped.length}`);
        if (alive && mapped.length) setDeficit(mapped);
      } catch { info.push("treasury:err"); }
      try {
        const f = await fetch("/api/fred/series?id=FYFSGDA188S").then((r) => r.json());
        const obs = (f?.observations ?? []) as any[];
        const raw = obs.map((o) => Number(o.value)).filter(Number.isFinite);
        const unit: "PCT" | "B" = raw.length && Math.max(...raw.map(Math.abs)) < 100 ? "PCT" : "B";
        const mapped = obs
          .map((o) => ({ date: String(o.date), v: unit === "PCT" ? Number(o.value) : Number(o.value) / 1000, unit }))
          .filter((d) => Number.isFinite(d.v))
          .slice(-24);
        info.push(`fred:${mapped.length}(${unit})`);
        if (alive && mapped.length) setFredDef(mapped);
      } catch { info.push("fred:err"); }
      try {
        const g = await fetch("/api/market?src=gdelt&q=war%20OR%20sanctions%20OR%20missile").then((r) => r.json());
        const vol = g?.timeline?.volume ?? g?.timeline?.data ?? [];
        const mapped = (vol as any[]).map((p) => ({ t: Date.parse(String(p.date).replace(" ", "T")), c: Number(p.count) })).filter((p) => Number.isFinite(p.c));
        info.push(`gdelt:${mapped.length}`);
        if (alive && mapped.length) setGeo(mapped);
      } catch { info.push("gdelt:err"); }
      for (const id of ["GOLDPMGBD228NLDM", "GOLDAMGBD228NLDM", "DTWEXBGS"]) {
        try {
          const j = await fetch(`/api/fred/series?id=${id}`).then((r) => r.json());
          const vals = ((j?.observations ?? []) as any[]).map((o) => Number(o.value)).filter(Number.isFinite).slice(-90);
          info.push(`${id.slice(0, 4).toLowerCase()}:${vals.length}`);
          if (vals.length > 31) { if (alive) setSh({ vals, src: id }); break; }
        } catch { info.push(`${id.slice(0, 4).toLowerCase()}:err`); }
      }
      if (alive) setDbg(info.join(" · "));
    })();
    return () => { alive = false; };
  }, []);

  let autoBadge: [string, string] = ["PROXY OFFLINE", MUT];
  let autoLevel: Level = "NORMAL";
  let shChg = 0;
  if (geo && geo.length > 37) {
    const last7 = geo.slice(-7).reduce((s, p) => s + p.c, 0) / 7;
    const baseArr = geo.slice(-37, -7);
    const base = baseArr.reduce((s, p) => s + p.c, 0) / Math.max(1, baseArr.length);
    const r = base > 0 ? last7 / base : 1;
    autoLevel = r > 2 ? "SEVERE" : r > 1.4 ? "ELEVATED" : "NORMAL";
    autoBadge = [`GDELT: ${autoLevel}`, autoLevel === "SEVERE" ? RED : autoLevel === "ELEVATED" ? GOLD : GREEN];
  } else if (sh && sh.vals.length > 31) {
    shChg = ((sh.vals[sh.vals.length - 1] - sh.vals[sh.vals.length - 31]) / sh.vals[sh.vals.length - 31]) * 100;
    const sev = sh.src === "DTWEXBGS" ? 6 : 8;
    const elev = sh.src === "DTWEXBGS" ? 3 : 4;
    autoLevel = shChg > sev ? "SEVERE" : shChg > elev ? "ELEVATED" : "NORMAL";
    const nama = sh.src === "DTWEXBGS" ? "DXY" : "EMAS";
    autoBadge = [`${nama} ${shChg >= 0 ? "+" : ""}${shChg.toFixed(1)}%: ${autoLevel}`, autoLevel === "SEVERE" ? RED : autoLevel === "ELEVATED" ? GOLD : GREEN];
  }

  const level: Level = manual ?? autoLevel;
  const finalBadge: [string, string] = manual
    ? [`MANUAL: ${manual}`, manual === "CALM" ? GREEN : manual === "ELEVATED" ? GOLD : RED]
    : autoBadge;

  const defSource = deficit ?? fredDef;
  const isMonthly = deficit !== null;
  const isPct = fredDef !== null && fredDef[0]?.unit === "PCT";
  const fy = defSource && defSource.length ? defSource.slice(-12).reduce((s, d) => s + d.v, 0) : 0;
  const lastDef = defSource && defSource.length ? defSource[defSource.length - 1].v : 0;

  const W = 340, H = 120;
  const maxAbs = defSource && defSource.length ? Math.max(...defSource.map((d) => Math.abs(d.v)), 1e-9) : 1;
  const zero = H / 2;
  const bw = defSource && defSource.length ? (W - 20) / defSource.length : 0;

  const active = { background: "#191919", color: "#f6f3ea" };
  const shColor = sh?.src === "DTWEXBGS" ? BLUE : GOLD;

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ FISCAL & GEOPOLITIK</span>
        <span className="t-badge" style={{ color: finalBadge[1], borderColor: finalBadge[1] }}>{finalBadge[0]}</span>
      </header>
      <div className="grid grid-cols-2">
        <div className="p-3 border-r border-[#2a2a2a]">
          <div className="t-label" style={{ color: MUT }}>
            {defSource
              ? isMonthly ? "DEFISIT BULANAN AS ($B)" : isPct ? "DEFISIT TAHUNAN AS (% PDB · FRED)" : "DEFISIT TAHUNAN AS ($B · FRED)"
              : "DEFISIT AS · MENUNGGU SUMBER"}
          </div>
          {defSource && defSource.length ? (
            <>
              <svg viewBox={`0 0 ${W} ${H}`} width="100%">
                <line x1={10} x2={W - 10} y1={zero} y2={zero} stroke={INK} />
                {defSource.map((d, i) => {
                  const h = (Math.abs(d.v) / maxAbs) * (H / 2 - 6);
                  const x = 10 + i * bw;
                  return d.v <= 0
                    ? <rect key={d.date} x={x + 1} y={zero} width={Math.max(1, bw - 2)} height={h} fill={RED} fillOpacity={0.75} />
                    : <rect key={d.date} x={x + 1} y={zero - h} width={Math.max(1, bw - 2)} height={h} fill={GREEN} fillOpacity={0.75} />;
                })}
              </svg>
              <div className="flex justify-between text-[10px] mt-1">
                <span style={{ color: MUT }}>{isMonthly ? "24 bulan" : "24 tahun"}</span>
                {isPct ? (
                  <span>FY TERAKHIR: <b style={{ color: RED }}>{lastDef.toFixed(1)}% PDB</b></span>
                ) : (
                  <span>AKUMULASI {isMonthly ? "12M" : "12 THN"}: <b style={{ color: RED }}>${Math.abs(fy).toFixed(0)}B {fy <= 0 ? "DEFISIT" : "SURPLUS"}</b></span>
                )}
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-[10px] space-y-1" style={{ color: MUT }}>
              <div>● semua sumber fiscal offline</div>
              <div className="text-[9px]">{dbg || "memeriksa…"}</div>
            </div>
          )}
          <div className="text-[9px] mt-1" style={{ color: MUT }}>defisit &gt; 5% PDB berkelanjutan = supply treasury membanjiri pasar → tekanan ke yield &amp; crowding-out</div>
        </div>

        <div className="p-3 space-y-2">
          <div className="t-label" style={{ color: MUT }}>
            {geo && geo.length > 1 ? "GEOPOLITIK · GDELT NEWS VOLUME 90D" : sh?.src === "DTWEXBGS" ? "SAFE-HAVEN PROXY · DXY 90D (FRED)" : "SAFE-HAVEN PROXY · EMAS 90D (FRED)"}
          </div>
          {geo && geo.length > 1 ? (
            <svg viewBox="0 0 340 70" width="100%">
              {(() => {
                const lo = Math.min(...geo.map((g) => g.c)), hi = Math.max(...geo.map((g) => g.c));
                const X = (i: number) => (i / (geo.length - 1)) * 340;
                const Y = (v: number) => 4 + (1 - (v - lo) / (hi - lo || 1)) * 62;
                return <path d={geo.map((g, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(g.c).toFixed(1)}`).join(" ")} fill="none" stroke={finalBadge[1]} strokeWidth={1.5} />;
              })()}
            </svg>
          ) : sh && sh.vals.length > 1 ? (
            <svg viewBox="0 0 340 70" width="100%">
              {(() => {
                const lo = Math.min(...sh.vals), hi = Math.max(...sh.vals);
                const X = (i: number) => (i / (sh.vals.length - 1)) * 340;
                const Y = (v: number) => 4 + (1 - (v - lo) / (hi - lo || 1)) * 62;
                return <path d={sh.vals.map((g, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(g).toFixed(1)}`).join(" ")} fill="none" stroke={shColor} strokeWidth={1.5} />;
              })()}
            </svg>
          ) : (
            <div className="p-4 text-center text-[10px]" style={{ color: MUT }}>● semua proxy offline</div>
          )}
          <div className="text-[9px]" style={{ color: MUT }}>
            {geo && geo.length > 1
              ? "volume berita konflik 7d vs rata-rata 30d"
              : sh?.src === "DTWEXBGS"
                ? "dolar menguat tajam = flight to safety = pasar mencium risiko"
                : "emas naik tajam = safe-haven bid = pasar mencium risiko"}
          </div>
          <div className="flex flex-wrap gap-1">
            <button className="t-badge" style={manual === null ? active : undefined} onClick={() => setManual(null)}>AUTO</button>
            {(["CALM", "ELEVATED", "SEVERE"] as const).map((m) => (
              <button key={m} className="t-badge" style={manual === m ? active : undefined} onClick={() => setManual(m)}>{m}</button>
            ))}
          </div>
          <div className="border-2 p-2" style={{ borderColor: finalBadge[1], color: finalBadge[1] }}>
            <div className="text-[9px] tracking-widest">REKOMENDASI SIZE</div>
            <div className="text-[10px] font-bold">{RECO[level]}</div>
          </div>
        </div>
      </div>
      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px] tracking-wider uppercase" style={{ color: MUT }}>
        {dbg || "treasury → fred fallback · gdelt → emas → dxy fallback · manual override"}
      </footer>
    </section>
  );
}