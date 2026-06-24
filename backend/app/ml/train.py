"""Train and persist the ML models.

Run:  python -m app.ml.train
"""
from app.ml.models import train_models


if __name__ == "__main__":
    paths = train_models()
    print("Trained models:", paths)
