import React, { useMemo } from "react";
import { motion } from "framer-motion";

function parseKm(text) {
  if (!text) return null;
  const m = String(text).match(/([\d.]+)\s*km/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function potentialTone(p) {
  const v = String(p || "").toLowerCase();
  if (v.includes("very")) return "emerald";
  if (v.includes("high")) return "emerald";
  if (v.includes("medium")) return "amber";
  if (v.includes("low")) return "rose";
  return "slate";
}

export default function ProximityCards({ proximity }) {
  const items = useMemo(() => {
    if (!proximity) return [];
    return [
      { label: "Metro Proximity", value: proximity["Metro Proximity"], kind: "km" },
      { label: "Business Hub", value: proximity["Business Hub"], kind: "km" },
      { label: "Investment Potential", value: proximity["Investment Potential"], kind: "pill" },
    ];
  }, [proximity]);

  if (!proximity) return null;

  return (
    <div className="proxGrid">
      {items.map((it) => (
        <Card key={it.label} item={it} />
      ))}
    </div>
  );
}

function Card({ item }) {
  const km = item.kind === "km" ? parseKm(item.value) : null;
  const tone = item.kind === "pill" ? potentialTone(item.value) : "cyan";

  const pillClass =
    tone === "emerald" ? "potentialPill potHigh"
      : tone === "amber" ? "potentialPill potMed"
      : tone === "rose" ? "potentialPill potLow"
      : "potentialPill";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="proxCard"
    >
      <div className="proxLabel">{item.label}</div>

      {item.kind === "pill" ? (
        <div style={{ marginTop: 10 }}>
          <span className={pillClass}>
            {item.value || "—"}
          </span>
        </div>
      ) : (
        <div className="proxValue">
          {Number.isFinite(km) ? (
            <>
              {km.toFixed(1)} <span style={{ fontSize: "0.95rem", color: "rgba(240,237,232,0.55)" }}>km</span>
            </>
          ) : (
            item.value || "—"
          )}
        </div>
      )}
    </motion.div>
  );
}

