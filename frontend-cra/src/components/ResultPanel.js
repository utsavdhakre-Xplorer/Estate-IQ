import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { jsPDF } from "jspdf";
import LoadingSkeleton from "./LoadingSkeleton";
import PriceChart from "./PriceChart";
import ProximityCards from "./ProximityCards";
import { formatPriceINRShort, formatINRNumber } from "../utils/formatPrice";

function useCountUp(target, enabled) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const to = Number(target) || 0;
    const from = fromRef.current;
    const duration = 900;
    startRef.current = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (to - from) * eased;
      setValue(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [target, enabled]);

  return value;
}

export default function ResultPanel({
  loading,
  result,
  requestSnapshot,
  onDownload,
}) {
  const hasResult = Boolean(result);
  const animated = useCountUp(result?.predicted_price, hasResult && !loading);
  const [contribView, setContribView] = useState("value");

  const priceRangeText = useMemo(() => {
    if (!result?.price_range) return null;
    return `${formatPriceINRShort(result.price_range.min)} — ${formatPriceINRShort(result.price_range.max)}`;
  }, [result]);

  const confidence = Number(result?.confidence_score);
  const pricePerSqft = useMemo(() => {
    const price = Number(result?.predicted_price);
    const area = Number(requestSnapshot?.area_sqft);
    if (!Number.isFinite(price) || !Number.isFinite(area) || area <= 0) return null;
    return price / area;
  }, [result, requestSnapshot]);

  return (
    <AnimatePresence initial={false}>
      {(loading || hasResult) ? (
        <motion.section
          key="result"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 18 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="card"
        >
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <>
              <div className="resultTop">
                <div>
                  <div className="priceKicker">AI-Estimated Market Value</div>
                  <div className="priceValue">
                    {formatPriceINRShort(animated)}
                  </div>
                  {pricePerSqft != null ? (
                    <div className="pricePerSqft">
                      ₹ {formatINRNumber(pricePerSqft)} / sqft
                    </div>
                  ) : null}
                  {priceRangeText ? (
                    <div className="priceRange">
                      Range: <span className="mono">{priceRangeText}</span>
                    </div>
                  ) : null}
                </div>

                <div className="resultActions">
                  <div className="confidencePill">
                    {Number.isFinite(confidence) ? `${confidence.toFixed(1)}% Confidence` : "Confidence —"}
                  </div>
                  <button
                    onClick={onDownload}
                    className="btnGhostGold"
                  >
                    Download Report
                  </button>
                </div>
              </div>

              <div className="resultGrid">
                <div className="subCard">
                  <div className="stepHeader">
                    <div className="stepTitle">Price Contribution Breakdown</div>
                    <button
                      type="button"
                      className="btnGhost"
                      style={{ padding: "6px 10px", fontSize: "0.78rem" }}
                      onClick={() => setContribView((v) => (v === "value" ? "percent" : "value"))}
                    >
                      {contribView === "value" ? "Value View" : "% View"}
                    </button>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <PriceChart contributions={result?.contributions} viewMode={contribView} />
                  </div>
                </div>

                <div style={{ display: "grid", gap: 16 }}>
                  <div className="subCard">
                    <div className="stepTitle">Proximity Analytics</div>
                    <div style={{ marginTop: 12 }}>
                      <ProximityCards proximity={result?.proximity_analysis} />
                    </div>
                  </div>

                  {result?.market_insights ? (
                    <div className="subCard marketInsightsCard">
                      <div className="stepTitle">Market Insights</div>
                      <div className="marketInsightsGrid">
                        <InsightItem
                          label="vs City Avg"
                          value={result.market_insights.vs_city_avg || "—"}
                          tone={String(result.market_insights.vs_city_avg || "").trim().startsWith("-") ? "down" : "up"}
                        />
                        <InsightItem label="Season" value={result.market_insights.season || "—"} />
                        <InsightItem label="Investment" value={result.market_insights.investment_rating || "—"} />
                        <InsightItem
                          label="Price Trend"
                          value={result.market_insights.price_trend === "Rising" ? "↑ Rising" : "→ Stable"}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="subCard">
                    <div className="stepTitle">Property Summary</div>
                    <div className="chipRow">
                      <Chip label="City" value={requestSnapshot?.city || result?.features?.City} />
                      <Chip label="BHK" value={String(requestSnapshot?.bhk ?? result?.features?.BHK ?? "—")} />
                      <Chip label="Area" value={`${formatINRNumber(requestSnapshot?.area_sqft)} sqft`} />
                      <Chip label="Grade" value={String(requestSnapshot?.builder_grade ?? "—")} />
                      <Chip label="Month" value={String(requestSnapshot?.month ?? "—")} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}

function InsightItem({ label, value, tone }) {
  const cls = tone === "down" ? "insightValueDown" : tone === "up" ? "insightValueUp" : "";
  return (
    <div className="insightItem">
      <div className="insightLabel">{label}</div>
      <div className={`insightValue ${cls}`}>{value}</div>
    </div>
  );
}

function Chip({ label, value }) {
  return (
    <div className="chip">
      <strong>{label}:</strong> <span>{value || "—"}</span>
    </div>
  );
}

export function buildPdfReport({ result, snapshot }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pad = 46;

  doc.setFillColor(10, 15, 30);
  doc.rect(0, 0, 595, 842, "F");

  doc.setTextColor(201, 168, 76);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("EstateIQ — Valuation Report", pad, 70);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Precision Property Valuation Powered by AI", pad, 92);

  doc.setDrawColor(201, 168, 76);
  doc.setLineWidth(1);
  doc.line(pad, 110, 595 - pad, 110);

  doc.setFont("courier", "bold");
  doc.setFontSize(18);
  doc.setTextColor(201, 168, 76);
  doc.text(`${formatPriceINRShort(result?.predicted_price)}`, pad, 155);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(220, 220, 220);
  if (result?.price_range) {
    doc.text(
      `Range: ${formatPriceINRShort(result.price_range.min)} — ${formatPriceINRShort(result.price_range.max)}`,
      pad,
      176
    );
  }
  if (result?.confidence_score != null) {
    doc.text(`Confidence: ${Number(result.confidence_score).toFixed(1)}%`, pad, 194);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("Inputs", pad, 235);
  doc.setFont("helvetica", "normal");
  const lines = [
    `City: ${snapshot?.city || "—"}`,
    `Location: ${snapshot?.location || "—"}`,
    `Area: ${snapshot?.area_sqft || "—"} sqft`,
    `BHK: ${snapshot?.bhk || "—"}`,
    `Gym: ${snapshot?.gym ? "Yes" : "No"}`,
    `Pool: ${snapshot?.pool ? "Yes" : "No"}`,
    `Builder Grade: ${snapshot?.builder_grade ?? "—"}`,
    `Proximity Score: ${snapshot?.proximity_score ?? "—"}`,
    `Month: ${snapshot?.month ?? "—"}`,
  ];
  lines.forEach((t, i) => doc.text(t, pad, 258 + i * 16));

  doc.setFont("helvetica", "bold");
  doc.text("Proximity", pad, 420);
  doc.setFont("helvetica", "normal");
  const prox = result?.proximity_analysis || {};
  doc.text(`Metro Proximity: ${prox["Metro Proximity"] || "—"}`, pad, 444);
  doc.text(`Business Hub: ${prox["Business Hub"] || "—"}`, pad, 460);
  doc.text(`Investment Potential: ${prox["Investment Potential"] || "—"}`, pad, 476);

  doc.setTextColor(180, 180, 180);
  doc.setFontSize(9);
  doc.text(
    "System-generated valuation. Not a legal appraisal.",
    pad,
    812
  );

  return doc;
}

