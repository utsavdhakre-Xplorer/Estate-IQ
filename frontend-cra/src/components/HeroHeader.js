import React, { useMemo } from "react";
import { motion } from "framer-motion";

export default function HeroHeader({ modelReady }) {
  const particles = useMemo(() => {
    // Deterministic “particles”
    const list = [];
    for (let i = 0; i < 18; i += 1) {
      const left = (i * 7.7) % 100;
      const top = (i * 13.9) % 60;
      const size = 2 + (i % 4);
      const delay = (i % 7) * 0.25;
      const dur = 4.8 + (i % 5) * 0.9;
      const cyan = i % 3 === 0;
      list.push({ left, top, size, delay, dur, cyan });
    }
    return list;
  }, []);

  return (
    <div className="heroBar">
      <div className="particleLayer">
        {particles.map((p, idx) => (
          <motion.div
            key={idx}
            className=""
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              position: "absolute",
              borderRadius: 999,
              background: p.cyan ? "rgba(0,212,255,0.9)" : "rgba(201,168,76,0.9)",
              boxShadow: p.cyan
                ? "0 0 18px rgba(0,212,255,0.35)"
                : "0 0 18px rgba(201,168,76,0.25)",
              opacity: 0.55,
            }}
            animate={{ y: [0, -12, 0], opacity: [0.3, 0.7, 0.3] }}
            transition={{
              duration: p.dur,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="container"
      >
        <div className="heroBarInner">
          <div className="brand">
            <div className="brandLogo">
              <span>E</span>
            </div>
            <div>
              <div className="brandTitle">EstateIQ</div>
              <div className="brandTagline">Precision Property Valuation Powered by AI</div>
            </div>
          </div>

          <div className="pillRow">
            <div className={`pill ${modelReady ? "" : "pillDanger"}`}>
              {modelReady ? "Model Online" : "Model Not Ready"}
            </div>
            <div className="pill pillGold">
              Backend: <span className="mono">:8000</span>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="container heroIntro">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.65, ease: "easeOut" }}
          className="heroPanel"
        >
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="heroHeadline">
              Luxury-grade insights.<span className="gold"> Instantly.</span>
            </div>
            <div className="heroSub">
              Calibrated for Indian real-estate pricing. Enter your property profile,
              refine with advanced signals, and receive a confidence-backed valuation
              with explainable contributions.
            </div>
          </div>

          <div className="heroShimmer" aria-hidden="true" />
        </motion.div>
      </div>
    </div>
  );
}

