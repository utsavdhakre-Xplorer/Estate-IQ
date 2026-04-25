from __future__ import annotations

import asyncio
import logging
import os
import tempfile
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Optional dependency: slowapi (rate limiting). Backend should still boot without it.
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    from slowapi.util import get_remote_address

    _SLOWAPI_AVAILABLE = True
except Exception:  # pragma: no cover
    Limiter = None  # type: ignore[assignment]
    RateLimitExceeded = Exception  # type: ignore[assignment]
    _rate_limit_exceeded_handler = None  # type: ignore[assignment]
    get_remote_address = None  # type: ignore[assignment]
    _SLOWAPI_AVAILABLE = False

load_dotenv()

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("backend")

VERSION = "4.0.0-enterprise"
BUILD_ID = "STACK-V4-2026"

app = FastAPI(title="India Property Predictor - V4 Enterprise ML Backend")

# Enable CORS (do not change per requirements)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting (if slowapi is installed)
if _SLOWAPI_AVAILABLE:
    limiter = Limiter(key_func=get_remote_address)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
else:
    class _NoopLimiter:
        def limit(self, _rule: str):
            def _decorator(fn):
                return fn

            return _decorator

    limiter = _NoopLimiter()

# Executor for CPU-bound prediction
_executor = ThreadPoolExecutor(max_workers=4)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Cache (portable across Windows/Linux)
_CACHE_DIR = os.path.join(tempfile.gettempdir(), "joblib_cache_house_price")
_memory = joblib.Memory(location=_CACHE_DIR, verbose=0)

# In-memory analytics counters
_prediction_counter: Dict[str, Any] = {"total": 0, "by_city": {}, "by_month": {}}


def _artifact_path(filename: str) -> str:
    return os.path.join(BASE_DIR, filename)


def load_resource(filename: str) -> Any:
    path = _artifact_path(filename)
    if os.path.exists(path):
        try:
            return joblib.load(path)
        except Exception:
            logger.exception("Failed loading artifact %s", path)
            return None
    return None


def _artifact_status() -> dict:
    return {
        "model": bool(model),
        "scaler": bool(scaler),
        "city_encoder": bool(city_encoder),
        "location_encoder": bool(location_encoder),
        "features_list": bool(features_list),
        "cities_list": bool(cities_list),
        "locations_list": bool(locations_list),
        "model_metrics": bool(model_metrics),
        "training_profile": bool(training_profile),
        "location_price_index": bool(location_price_index),
        "city_base_prices": bool(city_base_prices),
        "market_trends": bool(market_trends),
        "shap_explainer": bool(shap_explainer),
        "cache_dir": _CACHE_DIR,
    }


# Core ML Artifacts
model = load_resource("model_final.joblib")
scaler = load_resource("scaler.joblib")  # identity transformer for v4
city_encoder = load_resource("city_encoder.joblib")
location_encoder = load_resource("location_encoder.joblib")
features_list = load_resource("features.joblib")
cities_list = load_resource("cities_list.joblib")
locations_list = load_resource("locations_list.joblib")

# New enterprise artifacts
model_metrics = load_resource("model_metrics.joblib") or {}
training_profile = load_resource("training_profile.joblib") or {}
training_stats = load_resource("training_stats.joblib") or {}
location_price_index = load_resource("location_price_index.joblib") or {}
city_base_prices = load_resource("city_base_prices.joblib") or {}
market_trends = load_resource("market_trends.joblib") or {}
shap_explainer = load_resource("shap_explainer.joblib")


def _reload_core_artifacts() -> None:
    global model, scaler, city_encoder, location_encoder, features_list, cities_list, locations_list
    global model_metrics, training_profile, training_stats, location_price_index, city_base_prices, market_trends, shap_explainer

    model = load_resource("model_final.joblib")
    scaler = load_resource("scaler.joblib")
    city_encoder = load_resource("city_encoder.joblib")
    location_encoder = load_resource("location_encoder.joblib")
    features_list = load_resource("features.joblib")
    cities_list = load_resource("cities_list.joblib")
    locations_list = load_resource("locations_list.joblib")

    model_metrics = load_resource("model_metrics.joblib") or {}
    training_profile = load_resource("training_profile.joblib") or {}
    training_stats = load_resource("training_stats.joblib") or {}
    location_price_index = load_resource("location_price_index.joblib") or {}
    city_base_prices = load_resource("city_base_prices.joblib") or {}
    market_trends = load_resource("market_trends.joblib") or {}
    shap_explainer = load_resource("shap_explainer.joblib")


@app.on_event("startup")
def _startup_autotrain_if_needed() -> None:
    """
    Production safety: optionally auto-train if the model artifact failed to load.
    Enable with AUTO_TRAIN_ON_STARTUP=1 (recommended for Render if artifacts aren't committed).
    """
    enabled = os.getenv("AUTO_TRAIN_ON_STARTUP", "").strip().lower() in {"1", "true", "yes", "on"}
    if not enabled:
        return

    core_ok = bool(model) and bool(city_encoder) and bool(location_encoder) and bool(features_list)
    if core_ok:
        return

    logger.warning("Core artifacts not ready. AUTO_TRAIN_ON_STARTUP enabled; training model now...")
    try:
        from model_training import train_v4_enterprise_engine

        train_v4_enterprise_engine(seed=42)
        _reload_core_artifacts()
        logger.warning("Auto-training complete. Ready=%s", bool(model) and bool(city_encoder) and bool(location_encoder) and bool(features_list))
    except Exception:
        logger.exception("Auto-training failed; backend will remain degraded.")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 2)
    logger.info(f"[{request_id}] {request.method} {request.url.path} → {response.status_code} ({duration}ms)")
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time"] = f"{duration}ms"
    return response


def format_inr(price: float) -> str:
    if price >= 10_000_000:
        return f"₹ {price / 10_000_000:.2f} Cr"
    if price >= 100_000:
        return f"₹ {price / 100_000:.2f} L"
    return f"₹ {price:,.0f}"


def _safe_city(city: str, fallback_to_mumbai: bool = True) -> str:
    city_name = (city or "Mumbai").strip() or "Mumbai"
    if cities_list and city_name not in cities_list and fallback_to_mumbai:
        return "Mumbai"
    return city_name


def _safe_location(city_name: str, location: str) -> str:
    loc_name = (location or "Regional Avg").strip() or "Regional Avg"
    # keep "Regional Avg" as special bucket for confidence penalty and fallback stats
    return loc_name


def _encode_city(city_name: str) -> int:
    try:
        return int(city_encoder.transform([city_name])[0])
    except Exception:
        return int(city_encoder.transform(["Mumbai"])[0])


def _encode_location(loc_name: str) -> int:
    try:
        return int(location_encoder.transform([loc_name])[0])
    except Exception:
        return 0


def _get_location_index_stats(city_name: str, loc_name: str) -> Optional[dict]:
    if not location_price_index:
        return None
    mean_map = location_price_index.get("mean", {})
    median_map = location_price_index.get("median", {})
    std_map = location_price_index.get("std", {})
    count_map = location_price_index.get("count", {})
    key = (city_name, loc_name)
    if key not in mean_map:
        return None
    return {
        "mean": float(mean_map.get(key)),
        "median": float(median_map.get(key)),
        "std": float(std_map.get(key)) if std_map.get(key) is not None else None,
        "count": int(count_map.get(key)) if count_map.get(key) is not None else None,
    }


def compute_investment_rating(input_data: "PredictionInput", amenity_count: int) -> str:
    score = 0
    if input_data.proximity_score > 7:
        score += 2
    if input_data.builder_grade >= 4:
        score += 2
    if amenity_count > 0:
        score += 1
    if input_data.month in [10, 11, 12]:
        score += 1
    ratings = {
        0: "⭐ Fair",
        1: "⭐⭐ Good",
        2: "⭐⭐ Good",
        3: "⭐⭐⭐ Very Good",
        4: "⭐⭐⭐⭐ Excellent",
        5: "⭐⭐⭐⭐⭐ Premium",
        6: "⭐⭐⭐⭐⭐ Premium",
    }
    return ratings.get(score, "⭐⭐⭐ Very Good")


def _confidence_breakdown(city_name: str, loc_name: str, area_sqft: float) -> Tuple[float, dict]:
    base = float(model_metrics.get("confidence_score", 0.0) or 0.0)

    location_penalty = 0.0
    if (loc_name == "Regional Avg") or (_get_location_index_stats(city_name, loc_name) is None):
        location_penalty = -2.5

    area_penalty = 0.0
    p10 = float(training_profile.get("area_sqft_p10", 0.0) or 0.0)
    p90 = float(training_profile.get("area_sqft_p90", 0.0) or 0.0)
    if p10 and p90 and (area_sqft < p10 or area_sqft > p90):
        area_penalty = -1.5

    adjusted = max(0.0, min(100.0, base + location_penalty + area_penalty))
    breakdown = {"base": round(base, 1), "location_penalty": location_penalty, "area_penalty": area_penalty}
    return round(adjusted, 1), breakdown


class PredictionInput(BaseModel):
    # Backward compatible schema (do not change fields)
    area_sqft: float = Field(..., gt=0, le=20000)
    bhk: int = Field(..., ge=1, le=20)
    gym: bool = False
    pool: bool = False
    city: str = Field(default="", max_length=80)
    location: str = Field(default="", max_length=120)
    builder_grade: int = Field(default=3, ge=1, le=5)
    proximity_score: float = Field(default=7.0, ge=1.0, le=10.0)
    month: int = Field(default=6, ge=1, le=12)


class ContributionItem(BaseModel):
    label: str
    value: float
    impact: str  # "positive" or "negative"


class PredictionOutput(BaseModel):
    predicted_price: float
    predicted_price_formatted: str
    price_per_sqft: float
    features: dict
    contributions: List[ContributionItem]
    confidence_score: float
    confidence_breakdown: dict
    price_range: dict
    proximity_analysis: dict
    market_insights: dict
    comparable_stats: dict
    prediction_id: str


class BatchInput(BaseModel):
    requests: List[PredictionInput] = Field(..., max_length=10)  # for OpenAPI; enforced in code too


FEATURE_LABELS = {
    "sqrt": "Space Value",
    "bhk": "BHK Configuration",
    "city_encoded": "City Premium",
    "location_encoded": "Locality Factor",
    "amenity_count": "Amenities",
    "bhk_density": "Space Efficiency",
    "builder_grade": "Builder Premium",
    "proximity_score": "Location Access",
    "month": "Market Timing",
}


@_memory.cache
def _cached_predict_numeric(X_values_tuple: Tuple[float, ...]) -> float:
    # X_values_tuple represents one row of features in correct order.
    X = np.array([X_values_tuple], dtype=float)
    return float(model.predict(X)[0])


def _sync_predict(input_data: PredictionInput) -> Dict[str, Any]:
    if not model or not city_encoder or not location_encoder or not features_list:
        raise HTTPException(status_code=500, detail="Models not trained or loaded correctly")

    city_name = _safe_city(input_data.city, fallback_to_mumbai=True)
    loc_name = _safe_location(city_name, input_data.location)

    amenity_count = (1 if input_data.gym else 0) + (1 if input_data.pool else 0)
    bhk_density = float(input_data.area_sqft) / max(int(input_data.bhk), 1)

    city_encoded = _encode_city(city_name)
    loc_encoded = _encode_location(loc_name)

    data = {
        "sqrt": float(input_data.area_sqft),
        "bhk": int(input_data.bhk),
        "city_encoded": city_encoded,
        "location_encoded": loc_encoded,
        "amenity_count": int(amenity_count),
        "bhk_density": float(bhk_density),
        "builder_grade": int(input_data.builder_grade),
        "proximity_score": float(input_data.proximity_score),
        "month": int(input_data.month),
    }

    df_input = pd.DataFrame([data])
    for col in features_list:
        if col not in df_input.columns:
            df_input[col] = 0
    df_input = df_input[list(features_list)]

    # v4 training uses unscaled features; scaler is identity (kept for compatibility)
    X = df_input.values.astype(float)

    prediction = _cached_predict_numeric(tuple(map(float, X[0])))
    if not np.isfinite(prediction):
        raise HTTPException(status_code=500, detail="Non-finite prediction produced")

    # Confidence (from metrics + input penalties)
    confidence_score, confidence_breakdown = _confidence_breakdown(city_name, loc_name, float(input_data.area_sqft))

    # SHAP contributions (top 5)
    contributions: List[ContributionItem] = []
    if shap_explainer is not None:
        try:
            shap_vals = shap_explainer.shap_values(df_input)
            shap_arr = np.array(shap_vals)
            if shap_arr.ndim == 2:
                shap_arr = shap_arr[0]
            items = []
            for i, feat in enumerate(list(df_input.columns)):
                label = FEATURE_LABELS.get(feat, feat)
                val = float(shap_arr[i]) if i < len(shap_arr) else 0.0
                items.append(
                    ContributionItem(label=label, value=round(val, 2), impact="positive" if val >= 0 else "negative")
                )
            items.sort(key=lambda x: abs(x.value), reverse=True)
            contributions = items[:5]
        except Exception:
            logger.exception("SHAP contribution computation failed")

    # Price range
    price_range = {
        "min": round(prediction * 0.94, 2),
        "max": round(prediction * 1.06, 2),
        "min_formatted": format_inr(prediction * 0.94),
        "max_formatted": format_inr(prediction * 1.06),
    }

    proximity_analysis = {
        "Metro Proximity": f"{round(10.5 - input_data.proximity_score, 1)} km",
        "Business Hub": f"{round(12 - input_data.proximity_score, 1)} km",
        "Investment Potential": "Very High" if input_data.proximity_score > 8 else "High",
    }

    # Insights / comps
    city_base_price = float(city_base_prices.get(city_name, 0) or 0)
    your_price_sqft = float(prediction / max(float(input_data.area_sqft), 1.0))
    vs_city_avg = None
    if city_base_price > 0:
        vs_city_avg = f"{round(((your_price_sqft / city_base_price) - 1) * 100, 1)}%"
        if not vs_city_avg.startswith("-"):
            vs_city_avg = f"+{vs_city_avg}"

    season = (
        "Peak Season 🔥"
        if input_data.month in [10, 11, 12]
        else ("Off Season" if input_data.month in [5, 6, 7] else "Normal Season")
    )

    market_insights = {
        "city_avg_price_sqft": city_base_price,
        "your_price_sqft": round(your_price_sqft, 2),
        "vs_city_avg": vs_city_avg,
        "season": season,
        "investment_rating": compute_investment_rating(input_data, amenity_count),
        "price_trend": "Rising" if input_data.proximity_score > 7 else "Stable",
    }

    loc_stats = _get_location_index_stats(city_name, loc_name)
    if loc_stats is not None and loc_stats.get("mean"):
        comparable_stats = {
            "locality_avg_price": loc_stats["mean"],
            "locality_median_price": loc_stats["median"],
            "your_vs_locality_avg": f"{round(((prediction - loc_stats['mean']) / loc_stats['mean']) * 100, 1)}%",
            "properties_in_area": loc_stats["count"],
            "price_std": loc_stats["std"],
        }
    else:
        comparable_stats = {"locality_avg_price": None, "note": "Locality data unavailable"}

    # Update counters
    _prediction_counter["total"] += 1
    _prediction_counter["by_city"][city_name] = _prediction_counter["by_city"].get(city_name, 0) + 1
    _prediction_counter["by_month"][str(input_data.month)] = _prediction_counter["by_month"].get(str(input_data.month), 0) + 1

    prediction_id = str(uuid.uuid4())

    return {
        "predicted_price": round(prediction, 2),
        "predicted_price_formatted": format_inr(prediction),
        "price_per_sqft": round(your_price_sqft, 2),
        "features": {
            "City": city_name,
            "Location": loc_name,
            "Builder Grade": f"Tier {input_data.builder_grade}",
            "BHK": input_data.bhk,
            "Area": f"{input_data.area_sqft} sqft",
        },
        "contributions": contributions,
        "confidence_score": confidence_score,
        "confidence_breakdown": confidence_breakdown,
        "price_range": price_range,
        "proximity_analysis": proximity_analysis,
        "market_insights": market_insights,
        "comparable_stats": comparable_stats,
        "prediction_id": prediction_id,
    }


@app.get("/")
@limiter.limit("60/minute")
def read_root(request: Request):
    return {
        "status": "active",
        "engine": "v4_stacking_ensemble",
        "version": VERSION,
        "build_id": BUILD_ID,
        "cities": cities_list or [],
        "artifact_status": _artifact_status(),
    }


@app.get("/health")
@limiter.limit("60/minute")
def health(request: Request):
    ok = bool(model) and bool(city_encoder) and bool(location_encoder) and bool(features_list)
    return {
        "ok": ok,
        "status": "ready" if ok else "degraded",
        "version": VERSION,
        "build_id": BUILD_ID,
        "artifacts": _artifact_status(),
    }


@app.get("/metadata")
@limiter.limit("60/minute")
def metadata(request: Request):
    return {
        "cities": cities_list or [],
        "locations": locations_list or [],
        "features": features_list or [],
        "version": VERSION,
        "build_id": BUILD_ID,
    }


@app.get("/model_info")
@limiter.limit("60/minute")
def get_model_info(request: Request):
    metrics = {
        "r2": model_metrics.get("r2"),
        "mae": model_metrics.get("mae"),
        "rmse": model_metrics.get("rmse"),
        "mape": model_metrics.get("mape"),
        "confidence_score": model_metrics.get("confidence_score"),
    }
    return {
        "engine": "v4_stacking_ensemble",
        "version": VERSION,
        "build_id": BUILD_ID,
        "metrics": metrics,
        "city_metrics": model_metrics.get("city_metrics", {}),
        "features": features_list or [],
        "trained_at": model_metrics.get("trained_at"),
        "train_samples": model_metrics.get("train_samples"),
        "test_samples": model_metrics.get("test_samples"),
        "scaling": "Identity(FunctionTransformer)",
        "base_models": model_metrics.get("base_models", []),
        "meta_learner": model_metrics.get("meta_learner"),
    }


@app.post("/predict", response_model=PredictionOutput)
@limiter.limit("30/minute")
async def predict(request: Request, input_data: PredictionInput):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _sync_predict, input_data)


@app.post("/predict/batch")
@limiter.limit("5/minute")
async def predict_batch(request: Request, batch: BatchInput):
    max_batch = int(os.getenv("MAX_BATCH_SIZE", "10"))
    if len(batch.requests) > max_batch:
        raise HTTPException(status_code=400, detail=f"Too many requests. Max batch size is {max_batch}.")

    loop = asyncio.get_event_loop()
    tasks = [loop.run_in_executor(_executor, _sync_predict, req) for req in batch.requests]
    return await asyncio.gather(*tasks)


@app.get("/analytics")
@limiter.limit("60/minute")
def analytics(request: Request):
    # City-wise average prices from location index (mean values)
    heatmap: Dict[str, Dict[str, float]] = {}
    top5: Dict[str, List[dict]] = {}
    if location_price_index:
        mean_map = location_price_index.get("mean", {})
        for (city, loc), mean_price in mean_map.items():
            heatmap.setdefault(city, {})[loc] = float(mean_price)
        for city, loc_map in heatmap.items():
            items = [{"location": k, "avg_price": v} for k, v in loc_map.items()]
            items.sort(key=lambda x: x["avg_price"], reverse=True)
            top5[city] = items[:5]

    return {
        "predictions_served": _prediction_counter,
        "model_metrics": model_metrics,
        "city_base_prices": city_base_prices,
        "top5_expensive_localities": top5,
        "price_heatmap": heatmap,
    }


@app.get("/city/{city_name}/locations")
@limiter.limit("60/minute")
def city_locations(request: Request, city_name: str):
    city = _safe_city(city_name, fallback_to_mumbai=False)
    if not cities_list or city not in cities_list:
        raise HTTPException(status_code=404, detail="City not found")

    rows: List[dict] = []
    mean_map = location_price_index.get("mean", {}) if location_price_index else {}
    for (c, loc), mean_price in mean_map.items():
        if c != city:
            continue
        avg_price = float(mean_price)
        base_sqft = float(city_base_prices.get(city, 0) or 0)
        rows.append({"location": loc, "avg_price": avg_price, "price_per_sqft": base_sqft})

    rows.sort(key=lambda x: x["avg_price"], reverse=True)
    return rows


@app.get("/city/{city_name}/stats")
@limiter.limit("60/minute")
def city_stats(request: Request, city_name: str):
    city = _safe_city(city_name, fallback_to_mumbai=False)
    if not cities_list or city not in cities_list:
        raise HTTPException(status_code=404, detail="City not found")

    # Aggregate from location index if available
    mean_map = location_price_index.get("mean", {}) if location_price_index else {}
    vals = [float(v) for (c, _), v in mean_map.items() if c == city]
    avg_price = float(np.mean(vals)) if vals else None
    min_price = float(np.min(vals)) if vals else None
    max_price = float(np.max(vals)) if vals else None

    base_sqft = float(city_base_prices.get(city, 0) or 0)
    top_locations = city_locations(request, city)[:5]
    total_locations = int(len(vals))
    cm = (model_metrics.get("city_metrics", {}) or {}).get(city, {})

    return {
        "city": city,
        "avg_price": avg_price,
        "price_per_sqft": base_sqft,
        "total_locations": total_locations,
        "price_range": {"min": min_price, "max": max_price},
        "top_locations": top_locations,
        "model_accuracy": {"r2": cm.get("r2"), "mape": cm.get("mape")},
    }


@app.get("/compare")
@limiter.limit("60/minute")
async def compare(
    request: Request,
    city1: str,
    city2: str,
    area_sqft: float,
    bhk: int,
):
    c1 = _safe_city(city1, fallback_to_mumbai=False)
    c2 = _safe_city(city2, fallback_to_mumbai=False)
    if not cities_list or c1 not in cities_list or c2 not in cities_list:
        raise HTTPException(status_code=404, detail="One or both cities not found")

    inp1 = PredictionInput(area_sqft=area_sqft, bhk=bhk, city=c1)
    inp2 = PredictionInput(area_sqft=area_sqft, bhk=bhk, city=c2)

    loop = asyncio.get_event_loop()
    r1, r2 = await asyncio.gather(
        loop.run_in_executor(_executor, _sync_predict, inp1),
        loop.run_in_executor(_executor, _sync_predict, inp2),
    )

    p1 = float(r1["predicted_price"])
    p2 = float(r2["predicted_price"])
    cheaper_city = r1["features"]["City"] if p1 < p2 else r2["features"]["City"]
    diff_abs = abs(p1 - p2)
    diff_pct = round((diff_abs / max(min(p1, p2), 1.0)) * 100, 2)

    return {
        "city1": {"city": r1["features"]["City"], "predicted_price": p1, "price_per_sqft": r1["price_per_sqft"]},
        "city2": {"city": r2["features"]["City"], "predicted_price": p2, "price_per_sqft": r2["price_per_sqft"]},
        "difference": {"absolute": round(diff_abs, 2), "percentage": f"{diff_pct}%", "cheaper_city": cheaper_city},
    }


@app.get("/market/trends")
@limiter.limit("60/minute")
def market_trends_endpoint(request: Request):
    return market_trends or {"months": [], "city_trends": {}}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
