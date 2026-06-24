"""REST API endpoints.

POST   /api/upload-video          upload + start processing
GET    /api/video-result/{id}     status & processed-video URL
GET    /api/analytics/{id}        detection statistics
POST   /api/predict-traffic       ML traffic prediction
GET    /api/health                liveness probe
"""
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.ml import models as ml
from app.models import AnalyticsRecord, Prediction, Video
from app.schemas import (
    AnalyticsOut,
    MessageResponse,
    PredictionRequest,
    PredictionResponse,
    VideoResult,
    VideoUploadResponse,
)
from app.services.video_processor import process_video
from app.utils.file_utils import save_upload

router = APIRouter(prefix="/api", tags=["SmartRoad AI"])


@router.post("/upload-video", response_model=VideoUploadResponse, status_code=202)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Securely save the video and kick off async processing."""
    try:
        video_id, path = save_upload(file)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    video = Video(id=video_id, filename=file.filename or "video.mp4", status="processing")
    db.add(video)
    db.commit()

    background_tasks.add_task(process_video, video_id, str(path))
    return VideoUploadResponse(
        id=video_id,
        filename=video.filename,
        status="processing",
        upload_url=f"/uploads/{path.name}",
    )


@router.get("/video-result/{video_id}", response_model=VideoResult)
def video_result(video_id: str, db: Session = Depends(get_db)):
    video = db.get(Video, video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    return VideoResult(
        id=video.id,
        status=video.status,
        filename=video.filename,
        processed_url=video.processed_video,
        duration=video.duration,
        width=video.width,
        height=video.height,
    )


@router.get("/analytics/{video_id}", response_model=AnalyticsOut)
def analytics(video_id: str, db: Session = Depends(get_db)):
    video = db.get(Video, video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    record: AnalyticsRecord | None = video.analytics
    if record is None:
        raise HTTPException(
            status_code=409,
            detail=f"Analytics not ready yet (status={video.status})",
        )
    return AnalyticsOut(
        video_id=video.id,
        total_vehicles=record.total_vehicles,
        counts=record.counts or {},
        avg_density=record.avg_density,
        traffic_level=record.traffic_level,
        avg_speed=record.avg_speed,
        accident_risk=record.accident_risk,
        congestion_index=record.congestion_index,
        max_concurrent=record.max_concurrent,
        processing_fps=record.processing_fps,
    )


@router.post("/predict-traffic", response_model=PredictionResponse)
def predict_traffic(req: PredictionRequest, db: Session = Depends(get_db)):
    result = ml.predict(
        req.vehicle_count,
        req.density_pct,
        req.avg_speed,
        req.hour,
        req.is_weekend,
    )
    db.add(
        Prediction(
            condition=result["condition"],
            probability=result["probability"],
            congestion_forecast=result["congestion_forecast"],
            accident_risk_forecast=result["accident_risk_forecast"],
            features=req.model_dump(),
        )
    )
    db.commit()
    return PredictionResponse(**result)


@router.get("/health", response_model=MessageResponse)
def health():
    return MessageResponse(message="SmartRoad AI backend is online")
