# Real-Estate Price Predictor 🏠🎯

## Introduction
**Real-Estate Price Predictor** is a full-stack machine learning project developed to assist users in estimating the price of real estate properties based on various features such as location, size, and property characteristics. This project provides hands-on experience in building an ML-powered application from scratch — right from data processing to model training, backend development, frontend design, and cloud deployment.

## Tech Stack Used
- **Backend:** Python 🐍, FastAPI ⚡
- **Machine Learning:** Scikit-Learn (Random Forest Regressor) 🤖
- **Frontend:** React.js ⚛️, Chart.js 📊
- **Styling:** CSS (Modern 3D/Glassmorphism design) 🎨
## Deployment 🌐
The project is configured for cloud deployment:
- **Frontend (Vercel)**: Best for React. See [vercel.json](./frontend-cra/vercel.json).
- **Backend (Render)**: Best for FastAPI. See [render.yaml](./backend/render.yaml).

For detailed deployment steps, refer to the [Deployment Plan](./deployment_plan.md).

## Features
- **Price Prediction:** Estimated market value based on Area, Bedrooms, Bathrooms, Age, and Location.
- **Interactive Visualizations:**
  - **Feature Distribution:** Bar chart showing input feature spreads.
  - **Prediction Trends:** Line chart tracking historical predictions.
- **Modern UI:** Dark/Light mode toggle with a sleek 3D dashboard design.
- **Optimized Model:** Pipeline with `StandardScaler` and `GridSearchCV` for hyperparameter tuning.

## Dataset
The project currently utilizes the **California Housing Dataset** as a baseline, with heuristic mapping to translate modern property features (Size, Rooms) into the model's expected inputs (Median Income, Average Rooms).

## Usage
### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python model_training.py  # To train the optimized model
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend-cra
npm install
npm start -- --port 3000
```

## Accuracy Guide
For instructions on how to train this model with local data (like Mumbai house prices) to achieve real-world accuracy, refer to the [Accuracy Guide](./accuracy_guide.md).

## Contributing
Contributions to the Real-Estate Price Predictor project are welcome! If you have any suggestions, feature requests, or bug reports, please feel free to open an issue or submit a pull request.

## License
This project is licensed under the MIT License. Feel free to use, modify, and distribute the code for personal or commercial purposes.
