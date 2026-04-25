import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import HeroHeader from "./components/HeroHeader";
import EstimatorForm from "./components/EstimatorForm";
import ResultPanel from "./components/ResultPanel";
import HistoryPanel from "./components/HistoryPanel";
import { ToastHost } from "./components/Toast";
import { getHealth, getMetadata, predictPrice } from "./utils/api";
import { pushHistory, loadHistory } from "./utils/storage";

const initialValue = () => ({
  city: "Mumbai",
  location: "",
  propertyType: "Flat", // UI only
  furnishing: "Semi-Furnished", // UI only
  area_sqft: 1200,
  bhk: 2,
  amenities: { Gym: true, Pool: false, Parking: false, Lift: false, Security: false },
  builder_grade: 3,
  proximity_score: 7.5,
  month: new Date().getMonth() + 1,
});

export default function App() {
  const [metadata, setMetadata] = useState(null);
  const [modelReady, setModelReady] = useState(true);
  const [value, setValue] = useState(initialValue);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [requestSnapshot, setRequestSnapshot] = useState(null);

  const [history, setHistory] = useState(() => loadHistory());
  const [toasts, setToasts] = useState([]);
  const toastSeq = useRef(1);

  const [invalidSet, setInvalidSet] = useState(new Set());

  const addToast = useCallback((type, title, message) => {
    const id = `${Date.now()}_${toastSeq.current++}`;
    setToasts((prev) => [{ id, type, title, message, ttlMs: 3200 }, ...prev].slice(0, 4));
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [h, m] = await Promise.all([getHealth(), getMetadata()]);
        if (!alive) return;
        setMetadata(m);
        setModelReady(Boolean(h?.ok));
      } catch (e) {
        if (!alive) return;
        setModelReady(false);
        addToast("error", "Backend not reachable.", "Start the server on localhost:8000.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [addToast]);

  const validate = useCallback(() => {
    const bad = new Set();
    const area = Number(value.area_sqft);
    const bhk = Number(value.bhk);
    if (!Number.isFinite(area) || area < 1 || area > 20000) bad.add("area_sqft");
    if (!Number.isFinite(bhk) || bhk < 1 || bhk > 20) bad.add("bhk");
    if (!value.city) bad.add("city");
    // location optional
    if (Number(value.builder_grade) < 1 || Number(value.builder_grade) > 5) bad.add("builder_grade");
    if (Number(value.proximity_score) < 1 || Number(value.proximity_score) > 10) bad.add("proximity_score");
    if (Number(value.month) < 1 || Number(value.month) > 12) bad.add("month");
    setInvalidSet(bad);
    return bad.size === 0;
  }, [value]);

  const buildPayload = useCallback(() => {
    return {
      area_sqft: Number(value.area_sqft),
      bhk: Number(value.bhk),
      gym: Boolean(value.amenities.Gym),
      pool: Boolean(value.amenities.Pool),
      city: value.city,
      location: value.location || "Regional Avg",
      builder_grade: Number(value.builder_grade),
      proximity_score: Number(value.proximity_score),
      month: Number(value.month),
    };
  }, [value]);

  const onSubmit = useCallback(async () => {
    if (!validate()) {
      addToast("error", "Check your inputs.", "Some fields are invalid. Please correct and retry.");
      return;
    }
    if (!modelReady) {
      addToast("error", "Model Not Ready.", "Train artifacts and restart backend.");
      return;
    }

    setLoading(true);
    const payload = buildPayload();
    setRequestSnapshot(payload);

    try {
      const data = await predictPrice(payload);
      setResult(data);
      addToast("success", "Price estimated successfully!", "Valuation updated.");

      const entry = {
        id: `${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        ...payload,
        predicted_price: data?.predicted_price,
      };
      const next = pushHistory(entry);
      setHistory(next);
    } catch (e) {
      addToast("error", "Prediction failed.", "Backend not reachable. Start the server.");
    } finally {
      setLoading(false);
    }
  }, [validate, addToast, buildPayload, modelReady]);

  const onReuse = useCallback((item) => {
    setValue((p) => ({
      ...p,
      city: item.city || p.city,
      location: item.location || "",
      area_sqft: Number(item.area_sqft) || p.area_sqft,
      bhk: Math.max(1, Math.min(6, Number(item.bhk) || p.bhk)),
      builder_grade: Number(item.builder_grade) || p.builder_grade,
      proximity_score: Number(item.proximity_score) || p.proximity_score,
      month: Number(item.month) || p.month,
      amenities: {
        ...p.amenities,
        Gym: Boolean(item.gym),
        Pool: Boolean(item.pool),
      },
    }));
    addToast("success", "Loaded estimate inputs.", "You can re-run valuation instantly.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [addToast]);

  const onDownload = useCallback(() => {
    window.print();
    addToast("success", "Print dialog opened.", "Use Save as PDF to download the report.");
  }, [addToast]);

  return (
    <div className="appRoot">
      <ToastHost toasts={toasts} onDismiss={dismissToast} />

      <HeroHeader modelReady={modelReady} />

      {!modelReady ? (
        <div className="container">
          <div className="warningBanner">
            <div className="warningBannerTitle">Model Not Ready</div>
            <div className="muted">
              `GET /health` indicates the backend isn’t ready. Start backend and ensure training artifacts exist.
            </div>
          </div>
        </div>
      ) : null}

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="container mainLayout"
      >
        <EstimatorForm
          metadata={metadata}
          modelReady={modelReady}
          value={value}
          setValue={setValue}
          loading={loading}
          onSubmit={onSubmit}
          invalidFields={invalidSet}
        />

        <ResultPanel
          loading={loading}
          result={result}
          requestSnapshot={requestSnapshot}
          onDownload={onDownload}
        />
      </motion.main>

      <HistoryPanel items={history} onReuse={onReuse} />

      <footer className="container footer">
        <div className="dividerGold" />
        <div style={{ marginTop: 18 }}>
          EstateIQ © 2025 · AI-Powered Real Estate Valuation
        </div>
      </footer>
    </div>
  );
}

