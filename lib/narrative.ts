export interface MacroState {
  realYield: number;
  termSpread: number;    // T10Y2Y
  sahmTriggered: boolean;
  sahmValue: number;
  cpiYoY: number;
  unrateTrend: "up" | "down" | "flat";
  m2Trend: "up" | "down" | "flat";
  dollarTrend: "up" | "down" | "flat";
}

export interface NarrativeOutput {
  regime: string;
  bias: string;
  rationale: string[];
  caution: string | null;
}

export function generateNarrative(s: MacroState): NarrativeOutput {
  const reasons: string[] = [];

  // Rule 1: Pre-recession
  if (s.termSpread < 0 && s.unrateTrend === "up") {
    reasons.push(
      `Kurve yield terbalik (${s.termSpread.toFixed(2)}%) + pengangguran naik = sinyal pre-recession klasik`
    );
  }

  // Rule 2: Sahm triggered
  if (s.sahmTriggered) {
    reasons.push(
      `Sahm Rule triggered (naik ${s.sahmValue.toFixed(2)}pp dari low 12-bulan) — resesi historis sudah dimulai`
    );
  }

  // Rule 3: Real yield restrictive
  if (s.realYield > 2) {
    reasons.push(
      `Real yield tinggi (${s.realYield.toFixed(2)}%) menekan valuasi aset berisiko`
    );
  }

  // Rule 4: Liquidity regime
  if (s.m2Trend === "up" && s.dollarTrend === "down") {
    reasons.push(`Likuiditas global naik + USD melemah = risk-on`);
  } else if (s.m2Trend === "down" && s.dollarTrend === "up") {
    reasons.push(`Likuiditas global ketat + USD menguat = risk-off`);
  }

  // Determine regime
  let regime = "Neutral";
  let bias = "Sideways / wait-and-see";

  const recessionSignals = [s.termSpread < 0, s.sahmTriggered, s.unrateTrend === "up"].filter(Boolean).length;
  const easingSignals = [s.realYield < 1, s.m2Trend === "up"].filter(Boolean).length;

  if (recessionSignals >= 2) {
    regime = "Pre-Recession";
    bias = "Defensive: Long obligasi & emas, hindari cyclicals";
  } else if (s.sahmTriggered) {
    regime = "Recession";
    bias = "Ultra-defensive: cash, emas, Treasury long-duration";
  } else if (easingSignals >= 2 && s.cpiYoY < 3) {
    regime = "Goldilocks / Disinflasi";
    bias = "Risk-on moderat: saham growth, crypto, emerging";
  } else if (s.realYield > 2.5 && s.cpiYoY > 4) {
    regime = "Stagflation risk";
    bias = "Emas & komoditas > ekuitas > obligasi nominal";
  }

  let caution: string | null = null;
  if (s.cpiYoY > 4) caution = "Inflasi masih panas — The Fed belum bisa pivot agresif.";
  else if (s.sahmValue > 0.3 && !s.sahmTriggered) caution = "Dekati ambang Sahm — pantau UNRATE ketat.";

  return { regime, bias, rationale: reasons, caution };
}