import React, { useEffect, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { formatPriceINRShort } from "../utils/formatPrice";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function parseContributions(contributions) {
  if (!contributions) return [];

  // Option B: [{ label, value, impact }, ...]
  if (Array.isArray(contributions)) {
    return contributions
      .map((item) => ({
        label: String(item?.label || "Unknown"),
        value: Number(item?.value) || 0,
      }))
      .filter((x) => x.label && Number.isFinite(x.value));
  }

  // Option A: { "Space Value": 7800000, ... }
  if (typeof contributions === "object") {
    return Object.entries(contributions).map(([label, value]) => ({
      label,
      value: Number(value) || 0,
    }));
  }

  return [];
}

export default function PriceChart({ contributions, viewMode = "value" }) {
  const rows = useMemo(() => parseContributions(contributions), [contributions]);

  const labels = useMemo(() => rows.map((r) => r.label), [rows]);

  const values = useMemo(() => {
    if (!rows.length) return [];
    if (viewMode === "percent") {
      const total = rows.reduce((sum, r) => sum + Math.abs(r.value), 0) || 1;
      return rows.map((r) => (Math.abs(r.value) / total) * 100);
    }
    return rows.map((r) => r.value);
  }, [rows, viewMode]);

  useEffect(() => {
    // Debug log requested for contribution payload inspection.
    console.log("[PriceChart] raw contributions:", contributions);
    console.log("[PriceChart] parsed rows:", rows);
  }, [contributions, rows]);

  const data = useMemo(() => {
    return {
      labels,
      datasets: [
        {
          label: viewMode === "percent" ? "Contribution (%)" : "Contribution (INR)",
          data: values,
          borderColor: "rgba(201,168,76,0.95)",
          borderWidth: 1,
          borderRadius: 10,
          barThickness: 18,
          backgroundColor: (ctx) => {
            const { chart } = ctx;
            const { ctx: c } = chart;
            const right = chart.chartArea?.right || 420;
            const g = c.createLinearGradient(0, 0, right, 0);
            g.addColorStop(0, "#C9A84C");
            g.addColorStop(1, "#E8C96A");
            return g;
          },
        },
      ],
    };
  }, [labels, values, viewMode]);

  const valueLabelPlugin = useMemo(
    () => ({
      id: "valueLabelPlugin",
      afterDatasetsDraw: (chart) => {
        const { ctx } = chart;
        const dataset = chart.data.datasets[0];
        if (!dataset) return;
        const meta = chart.getDatasetMeta(0);
        ctx.save();
        ctx.font = "12px 'DM Sans', sans-serif";
        ctx.fillStyle = "rgba(240,237,232,0.75)";
        ctx.textBaseline = "middle";
        meta.data.forEach((bar, index) => {
          const raw = Number(dataset.data[index]) || 0;
          const text = viewMode === "percent" ? `${raw.toFixed(1)}%` : formatPriceINRShort(raw);
          ctx.fillText(text, bar.x + 10, bar.y);
        });
        ctx.restore();
      },
    }),
    [viewMode]
  );

  const options = useMemo(
    () => ({
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: "easeOutQuart" },
      plugins: {
        legend: { display: false },
        title: { display: false },
        tooltip: {
          backgroundColor: "rgba(10,15,30,0.92)",
          borderColor: "rgba(201,168,76,0.35)",
          borderWidth: 1,
          titleColor: "rgba(255,255,255,0.9)",
          bodyColor: "rgba(255,255,255,0.75)",
          displayColors: false,
          callbacks: {
            label: (context) =>
              viewMode === "percent"
                ? `${Number(context.raw || 0).toFixed(2)}%`
                : `${formatPriceINRShort(Number(context.raw || 0))}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { display: false },
          border: { display: false },
        },
        y: {
          grid: { display: false },
          ticks: {
            color: "rgba(240,237,232,0.65)",
            font: { family: "DM Sans", size: 12, weight: "500" },
          },
          border: { display: false },
        },
      },
      layout: {
        padding: { right: 90, left: 0, top: 6, bottom: 6 },
      },
    }),
    [viewMode]
  );

  if (!rows.length) return null;

  return (
    <div style={{ minHeight: 220, background: "#0D1530", borderRadius: 10, padding: 8 }}>
      <Bar data={data} options={options} plugins={[valueLabelPlugin]} />
    </div>
  );
}
