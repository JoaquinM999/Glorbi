export function fmtLarge(n) {
  if (!n || isNaN(n)) return "$0";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function fmtUsd(n, decimals = 2) {
  if (n == null || isNaN(n)) return "$0.00";
  const sign = n >= 0 ? "+" : "";
  return `${sign}$${n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function fmtPct(n, decimals = 1) {
  if (n == null || isNaN(n)) return "0%";
  return `${n >= 0 ? "+" : ""}${n.toFixed(decimals)}%`;
}

export function fgColor(value) {
  if (value <= 24) return { color: "#EF4444", label: "Miedo Extremo" };
  if (value <= 44) return { color: "#F97316", label: "Miedo" };
  if (value <= 54) return { color: "#EAB308", label: "Neutral" };
  if (value <= 74) return { color: "#84CC16", label: "Codicia" };
  return { color: "#22C55E", label: "Codicia Extrema" };
}