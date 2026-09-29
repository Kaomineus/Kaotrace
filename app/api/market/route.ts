import { NextRequest, NextResponse } from "next/server";

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src");
  const q = req.nextUrl.searchParams.get("q");
  const w = req.nextUrl.searchParams.get("w");

  try {
    if (src === "treasury") {
      const res = await fetchWithTimeout(
        "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/endpoints/accounting/od/deficit?q=record_date:gte:2018-01-01&sort=record_date&fields=record_date,current_month_deficit&format=json"
      );
      if (!res.ok) throw new Error(`treasury ${res.status}`);
      const json = await res.json();
      return NextResponse.json(json, { headers: { "Cache-Control": "public, max-age=21600" } });
    }
    if (src === "gdelt") {
      const res = await fetchWithTimeout(
        `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q ?? "war OR sanctions OR missile")}&mode=timelinevol&timespan=90d&format=json`,
        6000
      );
      if (!res.ok) throw new Error(`gdelt ${res.status}`);
      const json = await res.json();
      return NextResponse.json(json, { headers: { "Cache-Control": "public, max-age=3600" } });
    }
    if (src === "ff") {
      const week = w === "next" ? "nextweek" : "thisweek";
      const res = await fetchWithTimeout(`https://nfs.faireconomy.media/ff_calendar_${week}.json`);
      if (!res.ok) throw new Error(`ff ${res.status}`);
      const json = await res.json();
      return NextResponse.json(json, { headers: { "Cache-Control": "public, max-age=600" } });
    }
    return NextResponse.json({ error: "unknown src" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 502 });
  }
}