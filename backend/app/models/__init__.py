"""SQLAlchemy ORM models — PostgreSQL schema.

Tables: users, videos, detections, analytics, predictions
"""
import datetime

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    videos = relationship("Video", back_populates="owner")


class Video(Base):
    __tablename__ = "videos"

    id = Column(String, primary_key=True)  # uuid
    filename = Column(String, nullable=False)
    upload_time = Column(DateTime, default=datetime.datetime.utcnow)
    processed_video = Column(String, nullable=True)  # relative url
    status = Column(String, default="processing")  # processing | done | error
    duration = Column(Float, default=0.0)
    width = Column(Integer, default=0)
    height = Column(Integer, default=0)
    error = Column(Text, nullable=True)

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner = relationship("User", back_populates="videos")

    detections = relationship(
        "Detection", back_populates="video", cascade="all, delete-orphan"
    )
    analytics = relationship(
        "AnalyticsRecord",
        back_populates="video",
        uselist=False,
        cascade="all, delete-orphan",
    )


class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True)
    vehicle_id = Column(String, index=True)  # e.g. "car-3"
    type = Column(String, index=True)  # car | bus | truck | motorcycle | bike | other
    confidence = Column(Float, default=0.0)
    timestamp = Column(Float, default=0.0)  # seconds into the video
    bbox = Column(JSON)  # [x1, y1, x2, y2]
    video_id = Column(String, ForeignKey("videos.id"))

    video = relationship("Video", back_populates="detections")


class AnalyticsRecord(Base):
    __tablename__ = "analytics"

    id = Column(Integer, primary_key=True)
    video_id = Column(String, ForeignKey("videos.id"))
    total_vehicles = Column(Integer, default=0)
    counts = Column(JSON)  # {car, bus, truck, motorcycle, bike, other}
    avg_density = Column(Float, default=0.0)
    traffic_level = Column(String, default="Low")
    avg_speed = Column(Float, default=0.0)
    accident_risk = Column(Float, default=0.0)
    congestion_index = Column(Float, default=0.0)
    max_concurrent = Column(Integer, default=0)
    processing_fps = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    video = relationship("Video", back_populates="analytics")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True)
    condition = Column(String)  # Free Flow | Moderate | Congested | Heavy
    probability = Column(Float, default=0.0)
    congestion_forecast = Column(Float, default=0.0)
    accident_risk_forecast = Column(Float, default=0.0)
    features = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
