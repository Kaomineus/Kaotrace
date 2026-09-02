export interface Observation {
  date: string;
  value: number;
}

// Real Yield = DGS10 - T10YIE (atau pakai DFII10 langsung)
export function calcRealYield(nominal10y: number, breakeven: number): number {
  return +(nominal10y - breakeven).toFixed(2);
}

// Sahm Rule: UNRATE naik >0.5pp dari low 12 bulan
export function calcSahmRule(unrate: Observation[]): {
  value: number;
  triggered: boolean;
  trend: string;
} {
  if (unrate.length < 13) return { value: 0, triggered: false, trend: "data insufficient" };
  
  const latest = unrate[unrate.length - 1].value;
  const last12 = unrate.slice(-12);
  const min12 = Math.min(...last12.map(o => o.value));
  const sahm = +(latest - min12).toFixed(2);
  
  return {
    value: sahm,
    triggered: sahm >= 0.5,
    trend: sahm > 0 ? `up ${sahm.toFixed(2)}pp from 12m low` : "stable/declining"
  };
}

// Momentum: delta month-over-month
export function calcMoM(series: Observation[]): number {
  if (series.length < 2) return 0;
  const curr = series[series.length - 1].value;
  const prev = series[series.length - 2].value;
  return +((curr - prev)).toFixed(3);
}

// YoY % change
export function calcYoY(series: Observation[]): number {
  if (series.length < 13) return 0;
  const curr = series[series.length - 1].value;
  const yearAgo = series[series.length - 13].value;
  return +(((curr - yearAgo) / yearAgo) * 100).toFixed(2);
}

// Directional helper
export function trend(series: Observation[], lookback = 3): "up" | "down" | "flat" {
  if (series.length < lookback + 1) return "flat";
  const recent = series.slice(-lookback);
  const diffs = recent.map((o, i) => i === 0 ? 0 : o.value - recent[i - 1].value);
  const sum = diffs.reduce((a, b) => a + b, 0);
  if (sum > 0.05) return "up";
  if (sum < -0.05) return "down";
  return "flat";
}