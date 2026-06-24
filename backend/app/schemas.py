"""Pydantic request/response schemas."""
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------- Videos ---------------------------- #
class VideoUploadResponse(BaseModel):
    id: str
    filename: str
    status: str
    upload_url: Optional[str] = None


class VideoResult(BaseModel):
    id: str
    status: str
    filename: str
    processed_url: Optional[str] = None
    duration: float = 0.0
    width: int = 0
    height: int = 0


# --------------------------- Analytics -------------------------- #
class AnalyticsOut(BaseModel):
    video_id: str
    total_vehicles: int
    counts: dict
    avg_density: float
    traffic_level: str
    avg_speed: float
    accident_risk: float
    congestion_index: float
    max_concurrent: int
    processing_fps: float


class DetectionOut(BaseModel):
    vehicle_id: str
    type: str
    confidence: float
    timestamp: float
    bbox: list[float]


# ------------------------- Predictions -------------------------- #
class PredictionRequest(BaseModel):
    vehicle_count: int = Field(12, ge=0, le=120)
    density_pct: float = Field(40, ge=0, le=100)
    avg_speed: float = Field(15, ge=0, le=80)
    hour: int = Field(8, ge=0, le=23)
    is_weekend: bool = False


class PredictionResponse(BaseModel):
    condition: str
    probability: float
    eta_minutes: int
    congestion_forecast: float
    accident_risk_forecast: float
    rationale: list[str]


class MessageResponse(BaseModel):
    message: str
