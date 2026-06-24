"""Video processing pipeline.

Steps (mirrors the frontend flow, but server-side with YOLOv8 + OpenCV):
1. Open the uploaded video with OpenCV.
2. Loop frames (with optional frame-skip optimisation).
3. Run YOLO detection + ByteTrack tracking.
4. Draw bounding boxes / labels / confidence.
5. Count unique vehicles (per class) and compute density / risk.
6. Write the annotated video (VideoWriter) and persist rows.
7. Update the Video row's status and processed_video URL.
"""
import logging
import time

import cv2

from app.config import settings
from app.computer_vision.detector import annotate, detector
from app.database import SessionLocal
from app.models import AnalyticsRecord, Detection, Video

logger = logging.getLogger("smartroad.processor")


def _traffic_level(density_pct: float) -> str:
    if density_pct < 34:
        return "Low"
    if density_pct < 67:
        return "Medium"
    return "High"


def _capacity(w: int, h: int) -> int:
    lanes = max(2, w // 220)
    depth = max(3, h // 120)
    return max(8, min(60, lanes * depth))


def _accident_risk(max_concurrent: int, density_pct: float) -> float:
    return round(min(96.0, 16 + 0.6 * density_pct + 1.8 * max_concurrent), 1)


def process_video(video_id: str, input_path: str) -> None:
    db = SessionLocal()
    try:
        video = db.get(Video, video_id)
        if video is None:
            logger.warning("Video %s not found", video_id)
            return

        cap = cv2.VideoCapture(str(input_path))
        if not cap.isOpened():
            video.status = "error"
            video.error = "Unable to open video file"
            db.commit()
            return

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1280)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 720)
        video.width, video.height = width, height

        out_name = f"{video_id}.mp4"
        out_path = settings.processed_path / out_name
        writer = cv2.VideoWriter(
            str(out_path), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height)
        )

        capacity = _capacity(width, height)
        counts: dict[str, int] = {}
        seen: dict[int, str] = {}          # track_id -> vehicle type
        total = 0
        sum_concurrent = 0
        frames = 0
        frames_with = 0
        max_concurrent = 0
        buffer: list[Detection] = []
        t0 = time.time()
        skip = max(1, settings.frame_skip)
        detect_every = 1  # detector.track handles persistence; skip draws only

        while True:
            ok, frame = cap.read()
            if not ok:
                break

            if frames % skip == 0:
                detections = detector.track(frame)
            else:
                detections = []

            annotate(frame, detections)
            writer.write(frame)

            concurrent = 0
            for d in detections:
                tid = d.get("track_id")
                if tid is None:
                    continue
                concurrent += 1
                if tid not in seen:
                    seen[tid] = d["type"]
                    counts[d["type"]] = counts.get(d["type"], 0) + 1
                    total += 1
                if frames % detect_every == 0:
                    buffer.append(
                        Detection(
                            vehicle_id=f'{d["type"]}-{tid}',
                            type=d["type"],
                            confidence=d["confidence"],
                            timestamp=round(frames / fps, 2),
                            bbox=d["bbox"],
                            video_id=video_id,
                        )
                    )
            if concurrent:
                frames_with += 1
            sum_concurrent += concurrent
            max_concurrent = max(max_concurrent, concurrent)
            frames += 1

            if len(buffer) >= 250:
                db.bulk_save_objects(buffer)
                buffer.clear()
                db.commit()

        cap.release()
        writer.release()
        if buffer:
            db.bulk_save_objects(buffer)
            db.commit()

        elapsed = max(1e-6, time.time() - t0)
        proc_fps = frames / elapsed
        avg_density = min(100.0, (sum_concurrent / max(1, frames) / capacity) * 100)

        analytics = video.analytics or AnalyticsRecord(video_id=video_id)
        analytics.total_vehicles = total
        analytics.counts = counts
        analytics.avg_density = round(avg_density, 1)
        analytics.traffic_level = _traffic_level(avg_density)
        analytics.avg_speed = round(max(0.0, 40 - avg_density * 0.4), 1)
        analytics.accident_risk = _accident_risk(max_concurrent, avg_density)
        analytics.congestion_index = round(min(100.0, avg_density * 0.7 + 18), 1)
        analytics.max_concurrent = max_concurrent
        analytics.processing_fps = round(proc_fps, 1)
        if video.analytics is None:
            db.add(analytics)

        video.status = "done"
        video.processed_video = f"/processed/{out_name}"
        video.duration = round(frames / fps, 2)
        db.commit()
        logger.info("Processed video %s: %d vehicles in %.1fs", video_id, total, elapsed)

    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logger.exception("Failed to process video %s", video_id)
        video = db.get(Video, video_id)
        if video is not None:
            video.status = "error"
            video.error = str(exc)
            db.commit()
    finally:
        db.close()
