import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, VotingRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import r2_score
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor

# Dataset URLs
CITY_DATASETS = {
    "Mumbai": "https://raw.githubusercontent.com/Rakesh1121/Mumbai-House-Price-Prediction/master/Mumbai1.csv",
}

def engineer_features(df):
    """V3 Advanced Feature Engineering - Stabilized."""
    df['sqrt'] = pd.to_numeric(df['sqrt'], errors='coerce')
    df['price'] = pd.to_numeric(df['price'], errors='coerce')
    df = df.dropna(subset=['sqrt', 'price'])
    
    # Remove extreme outliers to prevent model instability
    df = df[df['price'] < 500000000] # Cap at 50Cr
    df = df[df['sqrt'] < 10000] # Cap at 10k sqft
    
    df['bhk_density'] = df['sqrt'] / df['bhk'].replace(0, 1)
    df['amenity_count'] = df['Gymnasium'] + df['Swimming Pool']
    
    # Simulated V3 Features (Ensuring proper types)
    np.random.seed(42)
    df['builder_grade'] = np.random.randint(1, 6, size=len(df))
    df['proximity_score'] = np.random.uniform(1, 10, size=len(df))
    df['month'] = np.random.randint(1, 13, size=len(df))
    
    return df

def train_v3_stabilized_model():
    print("🚀 Training Stabilized V3 Enterprise Engine...")
    
    try:
        df_raw = pd.read_csv(CITY_DATASETS["Mumbai"])
        df = engineer_features(df_raw)
    except Exception as e:
        print(f"❌ Error fetching data: {e}")
        return

    cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune']
    multipliers = {'Mumbai': 1.0, 'Delhi': 0.85, 'Bangalore': 0.8, 'Hyderabad': 0.65, 'Chennai': 0.6, 'Pune': 0.7}
    
    all_dfs = []
    for city in cities:
        temp = df.copy()
        temp['city'] = city
        temp['price'] = temp['price'] * multipliers[city]
        all_dfs.append(temp)
    
    df_combined = pd.concat(all_dfs, ignore_index=True)
    
    le_city = LabelEncoder()
    df_combined['city_encoded'] = le_city.fit_transform(df_combined['city'])
    
    le_loc = LabelEncoder()
    df_combined['location_encoded'] = le_loc.fit_transform(df_combined['location'].astype(str))
    
    features = ['sqrt', 'bhk', 'city_encoded', 'location_encoded', 'amenity_count', 'bhk_density', 'builder_grade', 'proximity_score', 'month']
    X = df_combined[features]
    y = df_combined['price']

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)

    # Use VotingRegressor for more stable ensemble results with mixed simulated data
    estimators = [
        ('rf', RandomForestRegressor(n_estimators=100, random_state=42)),
        ('xgb', XGBRegressor(n_estimators=100, learning_rate=0.05, random_state=42)),
        ('lgbm', LGBMRegressor(n_estimators=100, learning_rate=0.05, random_state=42, verbose=-1))
    ]
    
    ensemble_model = VotingRegressor(estimators=estimators)

    print("🧬 Training Stable Ensemble...")
    ensemble_model.fit(X_train, y_train)
    
    score = ensemble_model.score(X_test, y_test)
    print(f"✅ V3 Stabilized Performance -> R2: {score:.4f}")

    # Export to root backend dir directly
    joblib.dump(ensemble_model, 'model_final.joblib')
    joblib.dump(scaler, 'scaler.joblib')
    joblib.dump(le_city, 'city_encoder.joblib')
    joblib.dump(le_loc, 'location_encoder.joblib')
    joblib.dump(features, 'features.joblib')
    joblib.dump(df_combined['location'].unique().tolist(), 'locations_list.joblib')
    joblib.dump(df_combined['city'].unique().tolist(), 'cities_list.joblib')
    
    print("📦 Artifacts exported to root.")

if __name__ == "__main__":
    train_v3_stabilized_model()
