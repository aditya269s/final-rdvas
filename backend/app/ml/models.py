"""ML analytics: traffic prediction (Random Forest + XGBoost) and K-Means
clustering of vehicle hotspots.

Models are trained from a deterministic synthetic dataset (so the service is
self-contained) and persisted with joblib. Swap ``train_models`` for real
labelled telemetry in production.
"""
from pathlib import Path

import joblib
import numpy as np
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier

try:
    from xgboost import XGBRegressor

    HAS_XGB = True
except Exception:  # pragma: no cover
    HAS_XGB = False

ARTIFACTS = Path(__file__).resolve().parent / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)
RF_PATH = ARTIFACTS / "rf_congestion.pkl"
XGB_PATH = ARTIFACTS / "xgb_congestion.pkl"

CONDITIONS = ["Free Flow", "Moderate", "Congested", "Heavy"]


# ----------------------------- feature utils ----------------------------- #
def _features(count: int, density: float, speed: float, hour: int, weekend: bool):
    d = density / 100.0
    c = min(1.0, count / 30.0)
    slow = max(0.0, 1.0 - speed / 40.0)
    if weekend:
        peak = 0.75 if 11 <= hour <= 19 else 0.3
    else:
        peak = 0.9 if (7 <= hour <= 10 or 17 <= hour <= 20) else 0.35
    return np.array([[d, c, slow, peak]])


def _score(features: np.ndarray) -> float:
    f = features[0]
    return 0.34 * f[0] + 0.22 * f[1] + 0.24 * f[2] + 0.2 * f[3]


def _label(score: float) -> int:
    if score < 0.30:
        return 0
    if score < 0.50:
        return 1
    if score < 0.72:
        return 2
    return 3


# -------------------------------- training ------------------------------- #
def train_models(n: int = 4000, seed: int = 42) -> dict:
    rng = np.random.default_rng(seed)
    X, y_cls, y_reg = [], [], []
    for _ in range(n):
        feat = rng.uniform(0, 1, size=4)
        score = _score(feat.reshape(1, -1))
        X.append(feat)
        y_cls.append(_label(float(score)))
        y_reg.append(float(score) * 100)
    X = np.asarray(X)
    rf = RandomForestClassifier(n_estimators=200, random_state=seed)
    rf.fit(X, np.asarray(y_cls))
    joblib.dump(rf, RF_PATH)

    xgb_path = None
    if HAS_XGB:
        xgb = XGBRegressor(n_estimators=300, max_depth=4, learning_rate=0.05, random_state=seed)
        xgb.fit(X, np.asarray(y_reg))
        joblib.dump(xgb, XGB_PATH)
        xgb_path = str(XGB_PATH)
    return {"rf": str(RF_PATH), "xgb": xgb_path}


def _load_rf():
    if not RF_PATH.exists():
        train_models()
    return joblib.load(RF_PATH)


# ------------------------------- prediction ------------------------------- #
def predict(count: int, density: float, speed: float, hour: int, weekend: bool) -> dict:
    feats = _features(count, density, speed, hour, weekend)
    rf = _load_rf()
    proba = rf.predict_proba(feats)[0]
    idx = int(np.argmax(proba))
    score = _score(feats)

    congestion = round(min(100.0, score * 100 + (feats[0][3] * 12 - 6)), 1)
    risk = round(min(96.0, 12 + score * 68 + feats[0][2] * 18), 1)
    eta = round(8 + score * 38)

    rationale = [
        f"Density at {density:.0f}% contributes {0.34 * feats[0][0]:.2f} to the score.",
    ]
    if feats[0][3] > 0.5:
        rationale.append(f"Peak-hour window detected (hour {hour:02d}:00).")
    if feats[0][2] > 0.5:
        rationale.append(f"Low average speed ({speed:.0f}) signals queueing.")
    if feats[0][1] > 0.6:
        rationale.append(f"High vehicle count ({count}) saturates capacity.")

    return {
        "condition": CONDITIONS[idx],
        "probability": round(float(proba[idx]), 3),
        "eta_minutes": eta,
        "congestion_forecast": congestion,
        "accident_risk_forecast": risk,
        "rationale": rationale,
    }


# -------------------------------- clustering ----------------------------- #
def kmeans_hotspots(points: list, k: int = 3) -> list:
    if not points:
        return []
    if len(points) < k:
        k = max(1, len(points))
    km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(np.asarray(points))
    centers = km.cluster_centers_
    labels = km.labels_
    out = []
    for i in range(k):
        mask = labels == i
        if mask.any():
            out.append(
                {
                    "cx": float(centers[i][0]),
                    "cy": float(centers[i][1]),
                    "count": int(mask.sum()),
                }
            )
    return sorted(out, key=lambda c: -c["count"])
