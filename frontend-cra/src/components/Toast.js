import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function ToastHost({ toasts, onDismiss }) {
  return (
    <div className="toastHost">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast.ttlMs) return;
    const id = setTimeout(() => onDismiss(toast.id), toast.ttlMs);
    return () => clearTimeout(id);
  }, [toast, onDismiss]);

  const isError = toast.type === "error";
  const accent = isError ? "rgba(255,77,109,0.9)" : "rgba(0,212,255,0.9)";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className="toastItem"
      role="status"
      aria-live="polite"
    >
      <div
        className="toastBar"
        style={{ background: accent, boxShadow: `0 0 20px ${accent}` }}
      />
      <div className="toastBody">
        <div>
          <div className="toastTitle">{toast.title}</div>
          {toast.message ? (
            <div className="toastMsg">{toast.message}</div>
          ) : null}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="toastClose"
        >
          Close
        </button>
      </div>
    </motion.div>
  );
}

