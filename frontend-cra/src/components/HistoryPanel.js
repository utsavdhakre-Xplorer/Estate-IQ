import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatPriceINRShort } from "../utils/formatPrice";

export default function HistoryPanel({ items, onReuse }) {
  const [open, setOpen] = useState(true);

  const list = useMemo(() => items || [], [items]);

  return (
    <div className="container historyWrap">
      <div className="card" style={{ padding: "1.5rem" }}>
        <div className="historyHeader">
          <div>
            <div className="historyTitle">Recent Estimates</div>
            <div className="muted" style={{ marginTop: 4 }}>Stored locally (last 5).</div>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="btnGhost"
          >
            {open ? "Collapse" : "Expand"}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div style={{ marginTop: 16 }}>
                {list.length === 0 ? (
                  <div className="subCard muted">
                    No estimates yet. Run your first valuation above.
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {list.map((it) => (
                      <motion.div
                        key={it.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ type: "spring", stiffness: 420, damping: 30 }}
                        className="historyItem"
                      >
                        <div>
                          <div className="historyPlace">
                            {it.location && it.location !== "Regional Avg"
                              ? `${it.location}, ${it.city}`
                              : it.city}
                          </div>
                          <div className="historyMeta">
                            {it.timestamp}
                            <span style={{ padding: "0 10px", color: "rgba(240,237,232,0.25)" }}>•</span>
                            {it.bhk} BHK • {it.area_sqft} sqft • Grade {it.builder_grade}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div className="historyPrice">
                            {formatPriceINRShort(it.predicted_price)}
                          </div>
                          <button
                            onClick={() => onReuse(it)}
                            className="reuseBtn"
                          >
                            Re-use
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

