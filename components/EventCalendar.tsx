"use client";

import { useEffect, useMemo, useState } from "react";
import { parseFFNumber } from "@/lib/ff-parse";

const RED = "#b3382c", GOLD = "#b8860b", GREEN = "#1e7a46", INK = "#191919", MUT = "#8a8578", ORANGE = "#c77b30";

interface Ev { title: string; country: string; date: string; impact: string; forecast: string; previous: string; actual: string; }

const IMPACT_COLOR: Record<string, string> = { High: RED, Medium: ORANGE, Low: GOLD, Holiday: MUT };

export default function EventCalendar({ className = "" }: { className?: string }) {
  const [evs, setEvs] = useState<Ev[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [fImp, setFImp] = useState<"ALL" | "High" | "Medium" | "Low">("ALL");
  const [fCty, setFCty] = useState("ALL");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [a, b] = await Promise.all([
          fetch("/api/market?src=ff&w=this").then((r) => r.json()),
          fetch("/api/market?src=ff&w=next").then((r) => r.json()),
        ]);
        if (!Array.isArray(a) || !Array.isArray(b)) throw new Error("feed FF tidak valid (kemungkinan rate-limit upstream)");
        const all = [...a, ...b] as Ev[];
        if (alive) setEvs(all.sort((x, y) => x.date.localeCompare(y.date)));
      } catch (e: any) {
        if (alive) setErr(String(e?.message ?? e));
      }
    })();
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const countries = useMemo(() => ["ALL", ...Array.from(new Set((evs ?? []).map((e) => e.country))).sort()], [evs]);
  const filtered = useMemo(
    () => (evs ?? []).filter((e) => (fImp === "ALL" || e.impact === fImp) && (fCty === "ALL" || e.country === fCty)),
    [evs, fImp, fCty]
  );

  const groups = useMemo(() => {
    const m = new Map<string, Ev[]>();
    filtered.forEach((e) => {
      const day = new Date(e.date).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", timeZone: "Asia/Jakarta" });
      m.set(day, [...(m.get(day) ?? []), e]);
    });
    return Array.from(m.entries());
  }, [filtered]);

  const highCount = (evs ?? []).filter((e) => e.impact === "High").length;
  const releasedCount = (evs ?? []).filter((e) => (e.actual ?? "").trim() !== "").length;

  const cd = (iso: string) => {
    const t = new Date(iso).getTime() - now;
    if (t < 0 || t > 48 * 3600000) return null;
    const h = Math.floor(t / 3600000), m = Math.floor((t % 3600000) / 60000);
    const d = Math.floor(h / 24);
    return d > 0 ? `T-${d}h ${h % 24}j` : `T-${h}j ${m}m`;
  };

  const active = { background: "#191919", color: "#f6f3ea" };

  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ ECONOMIC CALENDAR · 2 MINGGU · WIB</span>
        <span className="flex gap-1 items-center">
          <span className="t-badge" style={{ color: RED, borderColor: RED }}>{highCount} HIGH IMPACT</span>
          <span className="t-badge" style={{ color: GREEN, borderColor: GREEN }}>{releasedCount} RILIS</span>
          <span className="t-badge gold">FOREX FACTORY · NO KEY</span>
        </span>
      </header>

      <div className="flex flex-wrap gap-1 px-3 py-1.5 border-b border-[#2a2a2a]">
        {(["ALL", "High", "Medium", "Low"] as const).map((i) => (
          <button key={i} className="t-badge" style={fImp === i ? active : undefined} onClick={() => setFImp(i)}>
            {i === "ALL" ? "SEMUA" : i.toUpperCase()}
          </button>
        ))}
        <select value={fCty} onChange={(e) => setFCty(e.target.value)} className="t-badge bg-transparent outline-none cursor-pointer">
          {countries.map((c) => (
            <option key={c} value={c} style={{ color: INK }}>{c === "ALL" ? "SEMUA NEGARA" : c}</option>
          ))}
        </select>
      </div>

      <div className="max-h-[520px] overflow-y-auto">
        {err && <div className="p-10 text-center t-label" style={{ color: RED }}>● ERROR: {err}</div>}
        {!evs && !err && <div className="p-10 text-center t-label">● MENGAMBIL KALENDER…</div>}
        {groups.map(([day, list]) => (
          <div key={day}>
            <div className="px-3 py-1 text-[9px] font-bold tracking-widest uppercase sticky top-0" style={{ background: "#efeadd", color: MUT, borderBottom: "1px solid #2a2a2a" }}>
              {day}
            </div>
            {list.map((e, i) => {
              const soon = cd(e.date);
              const hasActual = (e.actual ?? "").trim() !== "";
              const a = parseFFNumber(e.actual), f = parseFFNumber(e.forecast);
              const beat = hasActual && Number.isFinite(a) && Number.isFinite(f) ? a >= f : null;
              return (
                <div
                  key={`${e.date}-${i}`}
                  className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] border-b border-dotted border-[#9a938a] items-center"
                  style={{ background: hasActual ? "rgba(30,122,70,0.06)" : undefined }}
                >
                  <span className="col-span-2 font-bold flex items-center gap-1 flex-wrap">
                    {new Date(e.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB
                    {soon && <span className="t-badge green md-blink" style={{ color: GREEN, borderColor: GREEN }}>{soon}</span>}
                  </span>
                  <span className="col-span-1" style={{ color: MUT }}>{e.country}</span>
                  <span className="col-span-4 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: IMPACT_COLOR[e.impact] ?? MUT }} />
                    <b style={{ color: e.impact === "High" ? RED : INK }}>{e.title}</b>
                  </span>
                  <span className="col-span-2">
                    A: <b style={{ color: beat === null ? MUT : beat ? GREEN : RED }}>{hasActual ? e.actual : "—"}</b>
                  </span>
                  <span className="col-span-3" style={{ color: MUT }}>F: {e.forecast || "—"} · P: {e.previous || "—"}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <footer className="px-3 py-1.5 border-t border-[#2a2a2a] text-[9px] tracking-wider uppercase" style={{ color: MUT }}>
        A = actual (hijau beat · merah miss) · baris kehijauan = sudah rilis · F = forecast · P = previous · pidato/minutes wajar tanpa F/P/A
      </footer>
    </section>
  );
}