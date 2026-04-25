export function formatPriceINRShort(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";

  // 1 Cr = 10,000,000 | 1 L = 100,000
  if (abs >= 10000000) {
    const cr = abs / 10000000;
    return `${sign}₹ ${cr.toFixed(cr >= 10 ? 1 : 2)} Cr`;
  }
  const l = abs / 100000;
  return `${sign}₹ ${l.toFixed(l >= 10 ? 1 : 2)} L`;
}

export function formatINRNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function sqftToSqm(sqft) {
  const n = Number(sqft);
  if (!Number.isFinite(n)) return null;
  return n * 0.092903;
}

