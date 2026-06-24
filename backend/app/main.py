"""FastAPI application entrypoint.

Run:  uvicorn app.main:app --reload
Docs: http://localhost:8000/docs
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.config import settings
from app.database import init_db
from app.computer_vision.detector import warmup
from app.ml import models as ml


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables and warm caches once at startup.
    init_db()
    try:
        warmup()  # load YOLO model + dummy forward
    except Exception as exc:  # noqa: BLE001
        print("[startup] model warmup skipped:", exc)
    try:
        ml._load_rf()  # load (or auto-train) ML models
    except Exception as exc:  # noqa: BLE001
        print("[startup] ML model load skipped:", exc)
    yield


app = FastAPI(
    title="SmartRoad AI — Vehicle Analytics System",
    version="1.0.0",
    description="AI road-traffic video analysis with YOLOv8 detection, "
    "tracking, counting and ML predictions.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.mount("/processed", StaticFiles(directory=str(settings.processed_path)), name="processed")
app.mount("/uploads", StaticFiles(directory=str(settings.upload_path)), name="uploads")


@app.get("/")
def root():
    return {"name": "SmartRoad AI", "version": "1.0.0", "docs": "/docs"}
