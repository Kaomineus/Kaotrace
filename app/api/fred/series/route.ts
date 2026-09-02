import { NextRequest, NextResponse } from "next/server";

// Cache in-memory sederhana (akan diganti Redis/Supabase fase 2)
const cache = new Map<string, { data: any; expires: number }>();
const TTL_MS = 1000 * 60 * 60 * 6; // 6 jam

export async function GET(req: NextRequest) {
  const seriesId = req.nextUrl.searchParams.get("id");
  if (!seriesId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // Hit cache dulu
  const cached = cache.get(seriesId);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json({ seriesId, ...cached.data, cached: true });
  }

  // Fetch FRED
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing FRED_API_KEY" }, { status: 500 });
  }

  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1000`;
  
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data = await res.json();
    
    if (!data.observations) {
      return NextResponse.json({ error: "Invalid FRED response" }, { status: 502 });
    }

    const cleaned = data.observations
      .filter((o: any) => o.value !== ".")
      .map((o: any) => ({ date: o.date, value: parseFloat(o.value) }))
      .reverse();

    const payload = { observations: cleaned, fetchedAt: Date.now() };
    cache.set(seriesId, { data: payload, expires: Date.now() + TTL_MS });

    return NextResponse.json({ seriesId, ...payload, cached: false });
  } catch (err) {
    return NextResponse.json({ error: "FRED fetch failed" }, { status: 502 });
  }
}