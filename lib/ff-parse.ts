export function parseFFNumber(raw: string | null | undefined): number {
  if (raw === null || raw === undefined || raw === "" || raw === "—") return NaN;
  let s = String(raw).trim();
  if (s === "" || s === "N/A") return NaN;
  const neg = s.startsWith("-");
  if (neg || s.startsWith("+")) s = s.slice(1);
  s = s.replace(/[$%]/g, "");
  let mult = 1;
  if (s.endsWith("K") || s.endsWith("k")) { mult = 1e3; s = s.slice(0, -1); }
  else if (s.endsWith("M") || s.endsWith("m")) { mult = 1e6; s = s.slice(0, -1); }
  else if (s.endsWith("B") || s.endsWith("b")) { mult = 1e9; s = s.slice(0, -1); }
  else if (s.endsWith("T") || s.endsWith("t")) { mult = 1e12; s = s.slice(0, -1); }
  const n = parseFloat(s);
  if (isNaN(n)) return NaN;
  return (neg ? -1 : 1) * n * mult;
}