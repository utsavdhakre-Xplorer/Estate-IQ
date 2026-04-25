/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0F1E",
        gold: "#C9A84C",
        cyan: "#00D4FF",
      },
      fontFamily: {
        heading: ['"Playfair Display"', "ui-serif", "Georgia", "serif"],
        body: ['"DM Sans"', "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", '"Liberation Mono"', '"Courier New"', "monospace"],
      },
      boxShadow: {
        glowGold: "0 0 0 1px rgba(201,168,76,0.35), 0 0 32px rgba(201,168,76,0.18)",
        glowCyan: "0 0 0 1px rgba(0,212,255,0.25), 0 0 28px rgba(0,212,255,0.18)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-40%)" },
          "100%": { transform: "translateX(40%)" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        shimmer: "shimmer 5s ease-in-out infinite",
        floaty: "floaty 6s ease-in-out infinite",
        pulseGlow: "pulseGlow 2.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

