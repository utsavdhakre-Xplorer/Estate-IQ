from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd

from lightgbm import LGBMRegressor
from sklearn.ensemble import RandomForestRegressor, StackingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import FunctionTransformer, LabelEncoder
from xgboost import XGBRegressor


@dataclass(frozen=True)
class CitySpec:
    name: str
    base_price_per_sqft: float
    area_min: int
    area_max: int
    locations: List[str]
    rows: int = 3000


CITY_SPECS: List[CitySpec] = [
    CitySpec(
        name="Mumbai",
        base_price_per_sqft=12000,
        area_min=400,
        area_max=3500,
        locations=[
            "Bandra West", "Andheri East", "Powai", "Juhu", "Worli", "Malad West",
            "Goregaon East", "Kandivali", "Thane West", "Navi Mumbai", "Borivali",
            "Chembur", "Dadar", "Parel", "Lower Parel", "Kurla", "Ghatkopar",
            "Mulund", "Vikhroli", "Santacruz", "Vile Parle", "Jogeshwari",
            "Mira Road", "Vasai", "Dahisar", "Sion", "Wadala", "Matunga",
            "Byculla", "Colaba",
        ],
    ),
    CitySpec(
        name="Delhi",
        base_price_per_sqft=9000,
        area_min=500,
        area_max=4000,
        locations=[
            "Dwarka", "Rohini", "Pitampura", "Janakpuri", "Lajpat Nagar",
            "Vasant Kunj", "Saket", "Greater Kailash", "Hauz Khas", "Defence Colony",
            "Connaught Place", "Karol Bagh", "Rajouri Garden", "Punjabi Bagh",
            "Paschim Vihar", "Mayur Vihar", "Preet Vihar", "Dilshad Garden",
            "Shahdara", "Vivek Vihar", "Noida Sector 62", "Gurgaon DLF",
            "Faridabad", "Ghaziabad", "Noida Extension",
        ],
    ),
    CitySpec(
        name="Bangalore",
        base_price_per_sqft=8500,
        area_min=600,
        area_max=4500,
        locations=[
            "Whitefield", "Koramangala", "Indiranagar", "HSR Layout", "BTM Layout",
            "Electronic City", "Marathahalli", "Sarjapur Road", "Bannerghatta Road",
            "JP Nagar", "Jayanagar", "Malleshwaram", "Rajajinagar", "Yelahanka",
            "Hebbal", "Hennur", "Thanisandra", "Bellandur", "Varthur",
            "KR Puram", "Hoodi", "Brookefield", "Domlur", "Banaswadi", "Nagarbhavi",
        ],
    ),
    CitySpec(
        name="Hyderabad",
        base_price_per_sqft=6000,
        area_min=700,
        area_max=5000,
        locations=[
            "Gachibowli", "Kondapur", "Madhapur", "HITEC City", "Jubilee Hills",
            "Banjara Hills", "Kukatpally", "Miyapur", "Manikonda", "Nallagandla",
            "Tellapur", "Narsingi", "Puppalaguda", "Kokapet", "Khajaguda",
            "Financial District", "Nanakramguda", "Raidurgam", "Hafeezpet", "Bachupally",
        ],
    ),
    CitySpec(
        name="Chennai",
        base_price_per_sqft=5500,
        area_min=600,
        area_max=4000,
        locations=[
            "Adyar", "Velachery", "Anna Nagar", "T Nagar", "Nungambakkam",
            "Besant Nagar", "Mylapore", "Porur", "Ambattur", "Perambur",
            "Tambaram", "Chromepet", "Pallikaranai", "Sholinganallur",
            "Perungudi", "OMR", "ECR", "Medavakkam", "Guduvanchery", "Kelambakkam",
        ],
    ),
    CitySpec(
        name="Pune",
        base_price_per_sqft=6500,
        area_min=500,
        area_max=3500,
        locations=[
            "Kothrud", "Baner", "Wakad", "Hinjewadi", "Aundh", "Viman Nagar",
            "Kalyani Nagar", "Koregaon Park", "Hadapsar", "Undri",
            "Kharadi", "Wagholi", "Nibm Road", "Magarpatta", "Pimple Saudagar",
            "Pimple Nilakh", "Sus Road", "Mahalunge", "Bavdhan", "Pashan",
        ],
    ),
]


FEATURES: List[str] = [
    "sqrt",
    "bhk",
    "city_encoded",
    "location_encoded",
    "amenity_count",
    "bhk_density",
    "builder_grade",
    "proximity_score",
    "month",
]


def _out_path(name: str) -> str:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, name)


def generate_city_aware_synthetic_data(seed: int = 42) -> Tuple[pd.DataFrame, Dict[str, float]]:
    rng = np.random.default_rng(seed)

    city_base_prices: Dict[str, float] = {spec.name: float(spec.base_price_per_sqft) for spec in CITY_SPECS}
    all_rows: List[pd.DataFrame] = []

    for spec in CITY_SPECS:
        n = spec.rows

        # Core property attributes
        area_sqft = rng.integers(spec.area_min, spec.area_max + 1, size=n).astype(float)
        bhk = np.clip(np.round(area_sqft / rng.uniform(500, 750, size=n)), 1, 6).astype(int)

        gym = rng.random(size=n) < 0.55
        pool = rng.random(size=n) < 0.35
        amenity_count = gym.astype(int) + pool.astype(int)

        builder_grade = rng.integers(1, 6, size=n).astype(int)  # 1..5
        proximity_score = rng.uniform(1, 10, size=n).astype(float)  # 1..10
        month = rng.integers(1, 13, size=n).astype(int)

        location = rng.choice(spec.locations, size=n, replace=True)

        # City+location pricing
        base_price = area_sqft * spec.base_price_per_sqft

        # locality premium: +/-20% around city average (on base_price scale)
        loc_names = np.array(spec.locations, dtype=object)
        loc_multiplier = rng.normal(loc=1.0, scale=0.07, size=len(loc_names))
        loc_multiplier = np.clip(loc_multiplier, 0.80, 1.20)
        loc_mult_map = dict(zip(loc_names, loc_multiplier))
        loc_mult = np.vectorize(loc_mult_map.get, otypes=[float])(location)
        location_premium = (loc_mult - 1.0) * base_price

        builder_premium = (builder_grade - 1) * 0.08 * base_price
        amenity_premium = amenity_count * 0.03 * base_price
        proximity_premium = (proximity_score - 5.0) * 0.02 * base_price

        seasonal_factor = np.ones(n, dtype=float)
        seasonal_factor[np.isin(month, [10, 11, 12])] = 1.05
        seasonal_factor[np.isin(month, [5, 6])] = 0.97

        noise = rng.normal(loc=1.0, scale=0.04, size=n)
        noise = np.clip(noise, 0.85, 1.20)

        final_price = (base_price + location_premium + builder_premium + amenity_premium + proximity_premium) * seasonal_factor * noise

        df_city = pd.DataFrame(
            {
                "city": spec.name,
                "location": location.astype(str),
                "sqrt": area_sqft,
                "bhk": bhk,
                "Gymnasium": gym.astype(int),
                "Swimming Pool": pool.astype(int),
                "amenity_count": amenity_count,
                "builder_grade": builder_grade,
                "proximity_score": proximity_score,
                "month": month,
                "price": final_price.astype(float),
            }
        )
        all_rows.append(df_city)

    df_combined = pd.concat(all_rows, ignore_index=True)

    # Derived engineered features (must match inference)
    df_combined["bhk_density"] = df_combined["sqrt"] / df_combined["bhk"].replace(0, 1)

    # Hard sanity caps (avoid pathological tails)
    df_combined = df_combined[df_combined["sqrt"].between(200, 8000)]
    df_combined = df_combined[df_combined["price"].between(500_000, 500_000_000)]

    return df_combined.reset_index(drop=True), city_base_prices


def compute_training_stats(df: pd.DataFrame) -> dict:
    stats: dict = {}
    for city, g in df.groupby("city"):
        stats[city] = {
            "mean_price": float(g["price"].mean()),
            "std_price": float(g["price"].std(ddof=0)),
            "min_price": float(g["price"].min()),
            "max_price": float(g["price"].max()),
            "sample_count": int(len(g)),
        }
    return stats


def compute_market_trends(df: pd.DataFrame) -> dict:
    # avg price by (city, month) normalized to city mean => used by /market/trends
    city_month = df.groupby(["city", "month"])["price"].mean().reset_index()
    out: dict = {"months": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], "city_trends": {}}
    for city, g in city_month.groupby("city"):
        mean_city = df[df["city"] == city]["price"].mean()
        trend = []
        for m in range(1, 13):
            val = g[g["month"] == m]["price"].mean()
            idx = float(val / mean_city) if pd.notna(val) and mean_city > 0 else 1.0
            trend.append(round(idx, 4))
        out["city_trends"][city] = trend
    return out


def train_v4_enterprise_engine(seed: int = 42) -> None:
    print("Training V4 Enterprise Engine (Synthetic Multi-City + StackingRegressor)...")

    df_combined, city_base_prices = generate_city_aware_synthetic_data(seed=seed)

    # Encoders
    le_city = LabelEncoder()
    df_combined["city_encoded"] = le_city.fit_transform(df_combined["city"].astype(str))

    le_loc = LabelEncoder()
    df_combined["location_encoded"] = le_loc.fit_transform(df_combined["location"].astype(str))

    # Features/target
    X_df = df_combined[FEATURES].copy()
    y = df_combined["price"].astype(float)

    # Split while keeping meta for per-city metrics + confidence band logic
    X_train_df, X_test_df, y_train, y_test, meta_train, meta_test = train_test_split(
        X_df, y, df_combined[["city", "location", "sqrt"]], test_size=0.2, random_state=42, shuffle=True
    )

    # Keep features unscaled (better for SHAP consistency on raw feature space).
    # We still persist an identity transformer as `scaler.joblib` for backward compatibility.
    scaler = FunctionTransformer(validate=False)
    X_train = X_train_df.values
    X_test = X_test_df.values

    base_estimators = [
        (
            "rf",
            RandomForestRegressor(
                n_estimators=200,
                max_depth=12,
                min_samples_split=5,
                min_samples_leaf=2,
                max_features="sqrt",
                random_state=42,
                n_jobs=-1,
            ),
        ),
        (
            "xgb",
            XGBRegressor(
                n_estimators=300,
                learning_rate=0.03,
                max_depth=7,
                subsample=0.85,
                colsample_bytree=0.85,
                reg_alpha=0.1,
                reg_lambda=1.0,
                random_state=42,
            ),
        ),
        (
            "lgbm",
            LGBMRegressor(
                n_estimators=300,
                learning_rate=0.03,
                max_depth=8,
                num_leaves=63,
                subsample=0.85,
                colsample_bytree=0.85,
                reg_alpha=0.1,
                reg_lambda=1.0,
                random_state=42,
                verbose=-1,
            ),
        ),
    ]

    meta_learner = Ridge(alpha=1.0)

    ensemble_model = StackingRegressor(
        estimators=base_estimators,
        final_estimator=meta_learner,
        cv=5,
        passthrough=False,
        n_jobs=-1,
    )

    print("Training stacking ensemble...")
    ensemble_model.fit(X_train, y_train)

    print("Evaluating model...")
    y_pred = ensemble_model.predict(X_test)

    mae = mean_absolute_error(y_test, y_pred)
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2 = r2_score(y_test, y_pred)
    mape = float(np.mean(np.abs((y_test.values - y_pred) / y_test.values)) * 100)

    # Per-city metrics
    city_metrics: dict = {}
    for city in sorted(meta_test["city"].unique().tolist()):
        mask = meta_test["city"] == city
        if int(mask.sum()) > 0:
            y_true_c = y_test[mask]
            y_pred_c = y_pred[mask.values]
            city_metrics[city] = {
                "r2": round(r2_score(y_true_c, y_pred_c), 4),
                "mae": round(mean_absolute_error(y_true_c, y_pred_c), 2),
                "mape": round(float(np.mean(np.abs((y_true_c.values - y_pred_c) / y_true_c.values)) * 100), 2),
            }

    metrics = {
        "r2": round(float(r2), 4),
        "mae": round(float(mae), 2),
        "rmse": round(float(rmse), 2),
        "mape": round(float(mape), 2),
        "confidence_score": round(float((1 - mape / 100) * 100), 1),
        "city_metrics": city_metrics,
        "train_samples": int(len(X_train_df)),
        "test_samples": int(len(X_test_df)),
        "trained_at": datetime.now().isoformat(),
        "base_models": ["RandomForest(200)", "XGBoost(300)", "LightGBM(300)"],
        "meta_learner": "Ridge(alpha=1.0)",
        "engine": "v4_stacking_ensemble",
    }

    # Cross-validation (quick health signal)
    try:
        cv_r2 = cross_val_score(ensemble_model, X_train, y_train, cv=5, scoring="r2", n_jobs=-1)
        metrics["cv_r2_mean"] = round(float(cv_r2.mean()), 4)
        metrics["cv_r2_std"] = round(float(cv_r2.std(ddof=0)), 4)
    except Exception:
        metrics["cv_r2_mean"] = None
        metrics["cv_r2_std"] = None

    # Training stats (per-city) + percentiles for confidence adjustment
    training_stats = compute_training_stats(df_combined)
    area_p10, area_p90 = np.percentile(df_combined["sqrt"].values, [10, 90])
    training_profile = {
        "area_sqft_p10": float(area_p10),
        "area_sqft_p90": float(area_p90),
        "cities": sorted(df_combined["city"].unique().tolist()),
        "samples_by_city": df_combined["city"].value_counts().to_dict(),
    }

    # Location price index (analytics)
    location_price_index = (
        df_combined.groupby(["city", "location"])["price"]
        .agg(["mean", "median", "std", "count"])
        .round(2)
        .to_dict()
    )

    # Market trends (city seasonal indices)
    market_trends = compute_market_trends(df_combined)

    # SHAP explainer (TreeExplainer on RF base estimator)
    print("Computing SHAP explainer (RF TreeExplainer)...")
    shap_explainer = None
    try:
        import shap  # noqa: F401

        rf_fitted = ensemble_model.named_estimators_.get("rf")
        if rf_fitted is None and hasattr(ensemble_model, "estimators_") and ensemble_model.estimators_:
            rf_fitted = ensemble_model.estimators_[0]

        if rf_fitted is not None:
            shap_explainer = shap.TreeExplainer(rf_fitted)
    except Exception as e:
        print(f"SHAP explainer could not be created: {e}")

    # Persist artifacts
    print("Saving artifacts...")
    joblib.dump(ensemble_model, _out_path("model_final.joblib"))
    joblib.dump(scaler, _out_path("scaler.joblib"))
    joblib.dump(le_city, _out_path("city_encoder.joblib"))
    joblib.dump(le_loc, _out_path("location_encoder.joblib"))
    joblib.dump(FEATURES, _out_path("features.joblib"))
    joblib.dump(sorted(df_combined["location"].unique().tolist()), _out_path("locations_list.joblib"))
    joblib.dump(sorted(df_combined["city"].unique().tolist()), _out_path("cities_list.joblib"))

    joblib.dump(training_stats, _out_path("training_stats.joblib"))
    joblib.dump(metrics, _out_path("model_metrics.joblib"))
    joblib.dump(location_price_index, _out_path("location_price_index.joblib"))
    joblib.dump(city_base_prices, _out_path("city_base_prices.joblib"))
    joblib.dump(training_profile, _out_path("training_profile.joblib"))
    joblib.dump(market_trends, _out_path("market_trends.joblib"))

    if shap_explainer is not None:
        joblib.dump(shap_explainer, _out_path("shap_explainer.joblib"))

    print("Done.")
    print(f"   Train samples: {metrics['train_samples']} | Test samples: {metrics['test_samples']}")
    print(f"   R2: {metrics['r2']} | MAE: {metrics['mae']} | RMSE: {metrics['rmse']} | MAPE: {metrics['mape']}")
    print(f"   Confidence score: {metrics['confidence_score']}")


if __name__ == "__main__":
    train_v4_enterprise_engine(seed=42)
