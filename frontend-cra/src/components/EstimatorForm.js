import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sqftToSqm } from "../utils/formatPrice";

const CITY_LOCALITIES = {
  Mumbai: ["Bandra West", "Andheri East", "Powai", "Juhu", "Worli", "Malad West",
    "Goregaon East", "Kandivali", "Thane West", "Navi Mumbai", "Borivali", "Chembur",
    "Dadar", "Parel", "Lower Parel", "Kurla", "Ghatkopar", "Mulund", "Vikhroli",
    "Santacruz", "Vile Parle", "Jogeshwari", "Mira Road", "Vasai", "Dahisar",
    "Sion", "Wadala", "Matunga", "Byculla", "Colaba"],
  Delhi: ["Dwarka", "Rohini", "Pitampura", "Janakpuri", "Lajpat Nagar",
    "Vasant Kunj", "Saket", "Greater Kailash", "Hauz Khas", "Defence Colony",
    "Connaught Place", "Karol Bagh", "Rajouri Garden", "Punjabi Bagh",
    "Paschim Vihar", "Mayur Vihar", "Preet Vihar", "Dilshad Garden",
    "Shahdara", "Vivek Vihar", "Noida Sector 62", "Gurgaon DLF",
    "Faridabad", "Ghaziabad", "Noida Extension"],
  Bangalore: ["Whitefield", "Koramangala", "Indiranagar", "HSR Layout", "BTM Layout",
    "Electronic City", "Marathahalli", "Sarjapur Road", "Bannerghatta Road",
    "JP Nagar", "Jayanagar", "Malleshwaram", "Rajajinagar", "Yelahanka",
    "Hebbal", "Hennur", "Thanisandra", "Bellandur", "Varthur",
    "KR Puram", "Hoodi", "Brookefield", "Domlur", "Banaswadi", "Nagarbhavi"],
  Hyderabad: ["Gachibowli", "Kondapur", "Madhapur", "HITEC City", "Jubilee Hills",
    "Banjara Hills", "Kukatpally", "Miyapur", "Manikonda", "Nallagandla",
    "Tellapur", "Narsingi", "Puppalaguda", "Kokapet", "Khajaguda",
    "Financial District", "Nanakramguda", "Raidurgam", "Hafeezpet", "Bachupally"],
  Chennai: ["Adyar", "Velachery", "Anna Nagar", "T Nagar", "Nungambakkam",
    "Besant Nagar", "Mylapore", "Porur", "Ambattur", "Perambur",
    "Tambaram", "Chromepet", "Pallikaranai", "Sholinganallur",
    "Perungudi", "OMR", "ECR", "Medavakkam", "Guduvanchery", "Kelambakkam"],
  Pune: ["Kothrud", "Baner", "Wakad", "Hinjewadi", "Aundh", "Viman Nagar",
    "Kalyani Nagar", "Koregaon Park", "Hadapsar", "Undri",
    "Kharadi", "Wagholi", "Nibm Road", "Magarpatta", "Pimple Saudagar",
    "Pimple Nilakh", "Sus Road", "Mahalunge", "Bavdhan", "Pashan"],
};

const PROPERTY_TYPES = ["Flat", "Villa", "Penthouse"];
const FURNISHING = [
  { key: "Unfurnished", icon: "◻" },
  { key: "Semi-Furnished", icon: "◐" },
  { key: "Fully-Furnished", icon: "◼" },
];

const AMENITIES = ["Gym", "Pool", "Parking", "Lift", "Security"];

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function EstimatorForm({
  metadata,
  modelReady,
  value,
  setValue,
  loading,
  onSubmit,
  invalidFields,
}) {
  const [advancedOpen, setAdvancedOpen] = useState(true);
  const cities = useMemo(() => {
    const fromApi = metadata?.cities?.length ? metadata.cities : null;
    return fromApi || ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Pune"];
  }, [metadata]);
  const localities = useMemo(() => {
    const fromApi = metadata?.city_localities?.[value.city];
    if (Array.isArray(fromApi) && fromApi.length) return fromApi;
    return CITY_LOCALITIES[value.city] || [];
  }, [metadata, value.city]);

  const sqm = sqftToSqm(value.area_sqft);

  const stepAnim = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="card">
      <div className="formHeader">
        <div>
          <div className="formTitle">Property Estimator</div>
          <div className="formSubtitle">Step-by-step inputs with premium controls.</div>
        </div>
        <div className={`pill ${modelReady ? "" : "pillDanger"}`}>
          {modelReady ? "Ready" : "Awaiting model artifacts"}
        </div>
      </div>

      <div className="stepBlock">
        <motion.div
          variants={stepAnim}
          initial="hidden"
          animate="show"
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="subCard"
        >
          <div className="stepHeader">
            <div className="stepTitle">Step 1 — Property Details</div>
            <div className="stepMeta">Location & Type</div>
          </div>

          <div className="grid2">
            <div className={`field ${invalidFields?.has("city") ? "invalid" : ""}`}>
              <label className="fieldLabel">City</label>
              <select
                value={value.city}
                onChange={(e) =>
                  setValue((p) => ({
                    ...p,
                    city: e.target.value,
                    location: "Regional Avg",
                  }))
                }
              >
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className={`field ${invalidFields?.has("location") ? "invalid" : ""}`}>
              <label className="fieldLabel">Location / Locality</label>
              <select
                value={value.location}
                onChange={(e) => setValue((p) => ({ ...p, location: e.target.value }))}
              >
                <option value="Regional Avg">-- Select Locality --</option>
                {localities.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="fieldLabel">Property Type (UI only)</div>
            <div className="pillToggleRow">
              {PROPERTY_TYPES.map((t) => (
                <Pill
                  key={t}
                  active={value.propertyType === t}
                  onClick={() => setValue((p) => ({ ...p, propertyType: t }))}
                  label={t}
                />
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={stepAnim}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.06, duration: 0.45, ease: "easeOut" }}
          className="subCard"
          style={{ marginTop: 16 }}
        >
          <div className="stepHeader">
            <div className="stepTitle">Step 2 — Size & Configuration</div>
            <div className="stepMeta">Area • BHK • Furnishing</div>
          </div>

          <div className="grid2">
            <div className={`field ${invalidFields?.has("area_sqft") ? "invalid" : ""}`}>
              <label className="fieldLabel">Area (sqft)</label>
              <input
                type="number"
                min={1}
                max={20000}
                value={value.area_sqft}
                onChange={(e) => setValue((p) => ({ ...p, area_sqft: e.target.value === "" ? "" : Number(e.target.value) }))}
                placeholder="1200"
              />
              <div className="helperText">
                {sqm != null ? (
                  <>
                    ≈ <span className="mono">{sqm.toFixed(1)}</span> m²
                  </>
                ) : (
                  "Enter area to see sqm conversion."
                )}
              </div>
            </div>

            <div className="subCard bhkWrap">
              <div className="fieldLabel">BHK</div>
              <div className="bhkRow">
                <StepperButton
                  disabled={loading || value.bhk <= 1}
                  onClick={() => setValue((p) => ({ ...p, bhk: Math.max(1, p.bhk - 1) }))}
                  label="–"
                />
                <motion.div
                  key={value.bhk}
                  initial={{ scale: 0.92, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24 }}
                  className="bhkValue"
                >
                  {value.bhk}
                </motion.div>
                <StepperButton
                  disabled={loading || value.bhk >= 6}
                  onClick={() => setValue((p) => ({ ...p, bhk: Math.min(6, p.bhk + 1) }))}
                  label="+"
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="fieldLabel">Furnishing (UI only)</div>
            <div className="grid3" style={{ marginTop: 10 }}>
              {FURNISHING.map((f) => (
                <IconToggle
                  key={f.key}
                  active={value.furnishing === f.key}
                  onClick={() => setValue((p) => ({ ...p, furnishing: f.key }))}
                  icon={f.icon}
                  label={f.key}
                />
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={stepAnim}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.12, duration: 0.45, ease: "easeOut" }}
          className="subCard"
          style={{ marginTop: 16 }}
        >
          <div className="stepHeader">
            <div className="stepTitle">Step 3 — Amenities</div>
            <div className="stepMeta">Chips (Gym/Pool sent)</div>
          </div>

          <div className="amenitiesRow">
            {AMENITIES.map((a) => (
              <AmenityChip
                key={a}
                label={a}
                active={Boolean(value.amenities[a])}
                onToggle={() => setValue((p) => ({ ...p, amenities: { ...p.amenities, [a]: !p.amenities[a] } }))}
              />
            ))}
          </div>
        </motion.div>

        <motion.div
          variants={stepAnim}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.18, duration: 0.45, ease: "easeOut" }}
          className="subCard"
          style={{ marginTop: 16, padding: 0 }}
        >
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="accordionBtn"
          >
            <div>
              <div className="stepTitle">Step 4 — Advanced Filters</div>
              <div className="stepMeta">Builder grade • Proximity • Market month</div>
            </div>
            <div className="accordionPill">{advancedOpen ? "Collapse" : "Expand"}</div>
          </button>

          <AnimatePresence initial={false}>
            {advancedOpen ? (
              <motion.div
                key="advanced"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                style={{ padding: "0 1rem 1rem" }}
              >
                <div className="grid2">
                  <div className="subCard">
                    <div className="fieldLabel">Builder Grade</div>
                    <div className="starsRow">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const v = i + 1;
                        const active = v <= value.builder_grade;
                        return (
                          <Star
                            key={v}
                            active={active}
                            onClick={() => setValue((p) => ({ ...p, builder_grade: v }))}
                          />
                        );
                      })}
                      <div className="gradeReadout">{value.builder_grade}/5</div>
                    </div>
                  </div>

                  <div className="subCard">
                    <div className="stepHeader" style={{ marginBottom: 0 }}>
                      <div className="fieldLabel" style={{ marginBottom: 0 }}>Proximity Score</div>
                      <div className="pill">{Number(value.proximity_score).toFixed(1)}</div>
                    </div>
                    <div className="rangeWrap">
                      <input
                        type="range"
                        min={1}
                        max={10}
                        step={0.5}
                        value={value.proximity_score}
                        onChange={(e) => setValue((p) => ({ ...p, proximity_score: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div className="fieldLabel">Market Month</div>
                  <div className="monthRow">
                    {months.map((m, idx) => {
                      const v = idx + 1;
                      return (
                        <Pill
                          key={m}
                          active={value.month === v}
                          onClick={() => setValue((p) => ({ ...p, month: v }))}
                          label={m}
                          compact
                        />
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>

        <motion.button
          type="button"
          onClick={onSubmit}
          disabled={loading || !modelReady}
          whileHover={loading ? undefined : { y: -1 }}
          whileTap={loading ? undefined : { scale: 0.985 }}
          transition={{ type: "spring", stiffness: 450, damping: 26 }}
          className="estimateBtn"
        >
          <div className="estimateBtnInner">
            {loading ? (
              <>
                <Spinner />
                <span>Analyzing...</span>
              </>
            ) : (
              <span>Estimate Price →</span>
            )}
          </div>
        </motion.button>

        {!modelReady ? (
          <div className="warningBanner" style={{ marginTop: 14 }}>
            Model Not Ready. Start backend and ensure artifacts are trained (run `python model_training.py` in `backend/`).
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Pill({ label, active, onClick, compact }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`pillBtn ${active ? "pillBtnActive" : ""}`}
      style={compact ? { padding: "6px 12px", fontSize: "0.8rem" } : undefined}
    >
      {label}
    </motion.button>
  );
}

function StepperButton({ label, onClick, disabled }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      className="bhkBtn"
    >
      {label}
    </motion.button>
  );
}

function IconToggle({ active, onClick, icon, label }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.985 }}
      className={`pillBtn ${active ? "pillBtnActive" : ""}`}
      style={{
        width: "100%",
        borderRadius: 12,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span className="mono" style={{ opacity: 0.9 }}>{icon}</span>
      <span style={{ marginLeft: 10, flex: 1, textAlign: "left" }}>{label}</span>
    </motion.button>
  );
}

function AmenityChip({ label, active, onToggle }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      animate={{ scale: active ? 1.04 : 1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 520, damping: 26 }}
      className={`amenityChip ${active ? "amenityChipActive" : ""}`}
    >
      <span className="amenityMark">{active ? "✓" : "+"}</span>
      {label}
    </motion.button>
  );
}

function Star({ active, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      className="starBtn"
      aria-label="Set builder grade"
    >
      <span className={active ? "starActive" : ""}>★</span>
    </motion.button>
  );
}

function Spinner() {
  return (
    <motion.div
      className="spinner"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
    />
  );
}

