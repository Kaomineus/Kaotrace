"use client";

import { useEffect, useMemo, useState } from "react";
import { parseFFNumber } from "@/lib/ff-parse";

const RED = "#b3382c", GREEN = "#1e7a46", GOLD = "#b8860b", INK = "#191919", MUT = "#8a8578", BLUE = "#2c5f8a", ORANGE = "#c77b30";

interface Ev { title: string; country: string; date: string; impact: string; forecast: string; previous: string; actual: string; }
interface Entry { date: string; event: string; country: string; actual: number; consensus: number; surprise: number; impact: string; base: "F" | "P"; }

export default function SurpriseTracker({ className = "" }: { className?: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState("—");
  const [dbg, setDbg] = useState<{ fetched: number; withActual: number; samples: { t: string; a: string; f: string; p: string }[] }>({ fetched: 0, withActual: 0, samples: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [a, b] = await Promise.all([
          fetch("/api/market?src=ff&w=this").then((r) => r.json()),
          fetch("/api/market?src=ff&w=next").then((r) => r.json()),
        ]);
        if (!Array.isArray(a) || !Array.isArray(b)) throw new Error("feed FF tidak valid (kemungkinan rate-limit upstream)");
        let last: Ev[] = [];
        try { last = (await fetch("/api/market?src=ff&w=last").then((r) => r.json())) as Ev[]; } catch { /* lastweek opsional */ }
        const all: Ev[] = [...a, ...b, ...(Array.isArray(last) ? last : [])];

        const withActual = all.filter((e) => (e.actual ?? "").trim() !== "" && Number.isFinite(parseFFNumber(e.actual)));
        const released: Entry[] = withActual
          .map((e) => {
            const act = parseFFNumber(e.actual);
            const fc = parseFFNumber(e.forecast);
            const pv = parseFFNumber(e.previous);
            const base = Number.isFinite(fc) ? fc : Number.isFinite(pv) ? pv : NaN;
            const bTag: "F" | "P" = Number.isFinite(fc) ? "F" : "P";
            return {
              date: e.date.slice(0, 10),
              event: e.title.replace(/\s+/g, " ").trim(),
              country: e.country,
              actual: act,
              consensus: base,
              surprise: act - base,
              impact: e.impact,
              base: bTag,
            };
          })
          .filter((e) => Number.isFinite(e.surprise));

        if (alive) {
          setDbg({
            fetched: all.length,
            withActual: withActual.length,
            samples: withActual.slice(0, 3).map((e) => ({ t: e.title, a: e.actual, f: e.forecast, p: e.previous })),
          });
        }

        const saved: Entry[] = JSON.parse(localStorage.getItem("md_surprise_auto") ?? "[]");
        const keyOf = (e: Entry) => `${e.date}|${e.country}|${e.event}`;
        const existing = new Set(saved.map(keyOf));
        const merged = [...saved];
        released.forEach((e) => {
          const k = keyOf(e);
          if (!existing.has(k)) { merged.push(e); existing.add(k); }
        });
        merged.sort((x, y) => x.date.localeCompare(y.date));
        if (alive) {
          setEntries(merged);
          localStorage.setItem("md_surprise_auto", JSON.stringify(merged));
          setLastSync(new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" }));
        }
      } catch (e: any) {
        if (alive) setErr(String(e?.message ?? e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
  }, []);

  const byEvent = useMemo(() => {
    const m = new Map<string, Entry[]>();
    entries.forEach((e) => m.set(e.event, [...(m.get(e.event) ?? []), e]));
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [entries]);

  const totalBeats = entries.filter((e) => e.surprise > 0).length;
  const totalMisses = entries.filter((e) => e.surprise < 0).length;
  const bias: [string, string] = totalBeats > totalMisses + 2 ? ["BEAT BIAS", GREEN] : totalMisses > totalBeats + 2 ? ["MISS BIAS", RED] : ["BALANCED", GOLD];
  const highImpact = entries.filter((e) => e.impact === "High");

  const months = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => set.add(e.date.slice(0, 7)));
    return Array.from(set).sort().slice(-12);
  }, [entries]);

  const recent = entries.slice().reverse().slice(0, 25);

  if (loading) return <section className={`t-panel ${className}`}><div className="p-10 text-center t-label">● SCANNING FOREX FACTORY RELEASES…</div></section>;
  if (err) return <section className={`t-panel ${className}`}><div className="p-10 text-center t-label" style={{ color: RED }}>● ERROR: {err}</div></section>;

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ SURPRISE TRACKER · AUTO-DETECTED RELEASES</span>
        <span className="flex gap-1 items-center">
          <span className="t-badge">{entries.length} ENTRIES</span>
          <span className="t-badge" style={{ color: bias[1], borderColor: bias[1] }}>{bias[0]}</span>
          <span className="t-badge gold">AUTO · FOREX FACTORY</span>
        </span>
      </header>

      <div className="grid grid-cols-12 gap-3 p-3">
        <div className="col-span-12 md:col-span-3 space-y-2">
          <div className="border border-[#2a2a2a] p-2 text-center">
            <div className="text-[9px]" style={{ color: MUT }}>TOTAL RELEASES</div>
            <div className="text-2xl font-bold">{entries.length}</div>
            <div className="text-[9px]" style={{ color: MUT }}>HIGH IMPACT: <b style={{ color: RED }}>{highImpact.length}</b></div>
          </div>
          <div className="border border-[#2a2a2a] p-2">
            <div className="text-[9px] mb-1" style={{ color: MUT }}>BEAT vs MISS</div>
            <div className="flex h-2">
              <span style={{ width: `${(totalBeats / (entries.length || 1)) * 100}%`, background: GREEN }} />
              <span style={{ width: `${(totalMisses / (entries.length || 1)) * 100}%`, background: RED }} />
            </div>
            <div className="flex justify-between text-[9px] mt-1">
              <span style={{ color: GREEN }}>BEAT {totalBeats}</span>
              <span style={{ color: RED }}>MISS {totalMisses}</span>
            </div>
          </div>
          <div className="border border-dashed border-[#9a938a] p-2 text-[9px] space-y-1" style={{ color: MUT }}>
            <div>DEBUG FEED: fetch {dbg.fetched} · actual terisi {dbg.withActual} · saved {entries.length}</div>
            {dbg.samples.map((s, i) => (
              <div key={i} className="truncate" title={`${s.t} · A:${s.a} F:${s.f} P:${s.p}`}>• {s.t} → A:{s.a || "∅"} F:{s.f || "∅"} P:{s.p || "∅"}</div>
            ))}
          </div>
          <div className="text-[9px] border-t pt-1" style={{ color: MUT, borderColor: "#9a938a" }}>sync {lastSync} WIB · sumber: this+last+next week</div>
        </div>

        <div className="col-span-12 md:col-span-6 space-y-3">
          <div className="t-label">■ HEATMAP SURPRISE PER EVENT (12 BULAN)</div>
          {months.length > 0 ? (
            <div className="space-y-1">
              {byEvent.slice(0, 10).map(([ev, list]) => (
                <div key={ev} className="flex gap-1 items-center">
                  <span className="w-32 text-[9px] font-bold truncate" title={ev}>{ev}</span>
                  <div className="flex gap-[1px] flex-1 h-4">
                    {months.map((m) => {
                      const beats = list.filter((x) => x.date.slice(0, 7) === m && x.surprise > 0).length;
                      const misses = list.filter((x) => x.date.slice(0, 7) === m && x.surprise < 0).length;
                      const net = beats - misses;
                      return (
                        <span
                          key={m}
                          className="flex-1"
                          title={`${ev} ${m}: ${beats}B ${misses}M (net ${net >= 0 ? "+" : ""}${net})`}
                          style={{
                            background: net > 0
                              ? `rgba(30,122,70,${0.15 + Math.min(0.8, net * 0.25)})`
                              : net < 0
                                ? `rgba(179,56,44,${0.15 + Math.min(0.8, -net * 0.25)})`
                                : "rgba(25,25,25,0.05)",
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex gap-[1px] mt-1 text-[8px]" style={{ color: MUT }}>
                <span className="w-32" />
                {months.map((m) => (
                  <span key={m} className="flex-1 text-center">{m.slice(5, 7)}/{m.slice(2, 4)}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-[10px]" style={{ color: MUT }}>● belum ada release dengan actual terdeteksi · lihat DEBUG FEED di kiri</div>
          )}

          <div className="t-label">■ CUMULATIVE NET SURPRISE</div>
          {entries.length > 1 ? <CumulativeChart entries={entries} /> : (
            <div className="p-6 text-center text-[10px]" style={{ color: MUT }}>● butuh minimal 2 release</div>
          )}
        </div>

        <div className="col-span-12 md:col-span-3 space-y-2">
          <div className="t-label">■ LATEST RELEASES ({recent.length})</div>
          <div className="max-h-[460px] overflow-y-auto space-y-1 text-[10px]">
            {recent.map((e, i) => (
              <div key={i} className="border-b border-dotted pb-1" style={{ borderColor: "#9a938a" }}>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: e.impact === "High" ? RED : e.impact === "Medium" ? ORANGE : GOLD }} />
                  <b className="flex-1 truncate">{e.event}</b>
                  <span className="text-[8px]" style={{ color: MUT }}>vs {e.base}</span>
                </div>
                <div className="text-[9px] mt-0.5" style={{ color: MUT }}>{e.country} · {e.date}</div>
                <div className="flex gap-2 text-[9px]">
                  <span>A: <b>{e.actual}</b></span>
                  <span>{e.base}: {e.consensus}</span>
                  <span className="ml-auto" style={{ color: e.surprise >= 0 ? GREEN : RED }}>
                    {e.surprise >= 0 ? "+" : ""}{e.surprise.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px] tracking-wider uppercase" style={{ color: MUT }}>
        auto-detect actual · baseline forecast, fallback previous (label vs F / vs P) · merged localStorage dedupe · no manual input
      </footer>
    </section>
  );
}

function CumulativeChart({ entries }: { entries: Entry[] }) {
  const byEvent = new Map<string, number[]>();
  entries.forEach((e) => byEvent.set(e.event, [...(byEvent.get(e.event) ?? []), e.surprise]));
  const stats = new Map<string, { mean: number; sd: number }>();
  byEvent.forEach((vals, ev) => {
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length) || 1;
    stats.set(ev, { mean: m, sd });
  });

  const cum: { date: string; z: number }[] = [];
  let sum = 0;
  entries.forEach((e) => {
    const s = stats.get(e.event)!;
    sum += (e.surprise - s.mean) / s.sd;
    cum.push({ date: e.date, z: sum });
  });

  const W = 600, H = 160, L = 30, R = 10, T = 10, B = 20;
  const maxZ = Math.max(...cum.map((c) => Math.abs(c.z)), 1);
  const X = (i: number) => L + (i / Math.max(1, cum.length - 1)) * (W - L - R);
  const Y = (v: number) => T + (1 - (v / maxZ + 1) / 2) * (H - T - B);
  const path = cum.map((c, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(c.z).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <line x1={L} y1={Y(0)} x2={W - R} y2={Y(0)} stroke={MUT} strokeDasharray="4 4" />
      <path d={path} fill="none" stroke={BLUE} strokeWidth={1.8} />
      {cum.map((c, i) => (
        <circle key={i} cx={X(i)} cy={Y(c.z)} r={2.5} fill={c.z >= 0 ? GREEN : RED} />
      ))}
      <text x={L - 4} y={Y(maxZ) + 3} fontSize={8} fill={MUT} textAnchor="end">+{maxZ.toFixed(1)}σ</text>
      <text x={L - 4} y={Y(-maxZ) + 3} fontSize={8} fill={MUT} textAnchor="end">-{maxZ.toFixed(1)}σ</text>
      <text x={W / 2} y={H - 4} fontSize={8} fill={MUT} textAnchor="middle">cumulative normalized surprise (σ) · tren = pasar konsisten miss ke arah tertentu</text>
    </svg>
  );
}