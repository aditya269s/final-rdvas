# SmartRoad AI — Backend (FastAPI + YOLOv8)

AI road-traffic video analysis: vehicle **detection**, **tracking**, **counting**,
**density / risk analytics** and **ML predictions**, persisted in **PostgreSQL**.

## Tech
Python · FastAPI · Ultralytics YOLOv8/v9 · OpenCV · ByteTrack/DeepSORT ·
scikit-learn · XGBoost · SQLAlchemy · PostgreSQL · Docker.

## Quick start (local)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 1. start PostgreSQL (or use docker-compose below)
# 2. configure env
cp .env.example .env

# 3. run
uvicorn app.main:app --reload
# Swagger docs -> http://localhost:8000/docs
```

## Quick start (Docker — recommended)

```bash
cd backend
cp .env.example .env
docker compose up --build
# api -> http://localhost:8000   db -> localhost:5432
```

## API reference

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `POST` | `/api/upload-video` | Upload a video; saves it securely and starts async processing. Returns `{ id, status }`. |
| `GET`  | `/api/video-result/{id}` | Status + processed-video URL (annotated mp4). |
| `GET`  | `/api/analytics/{id}` | Counts, density, traffic level, speed, risk, congestion. |
| `POST` | `/api/predict-traffic` | ML forecast from features → condition, ETA, risk. |
| `GET`  | `/api/health` | Liveness probe. |

**Upload example**
```bash
curl -X POST http://localhost:8000/api/upload-video \
  -F "file=@traffic.mp4"
# -> { "id": "a1b2...", "status": "processing", "upload_url": "/uploads/a1b2....mp4" }
```

**Poll result**
```bash
curl http://localhost:8000/api/video-result/a1b2...
curl http://localhost:8000/api/analytics/a1b2...
```

**Predict**
```bash
curl -X POST http://localhost:8000/api/predict-traffic \
  -H "Content-Type: application/json" \
  -d '{"vehicle_count":22,"density_pct":55,"avg_speed":14,"hour":8,"is_weekend":false}'
```

## Database schema (PostgreSQL)

```
users        id, email, hashed_password, created_at
videos       id (uuid), filename, upload_time, processed_video, status,
             duration, width, height, error, owner_id
detections   id, vehicle_id, type, confidence, timestamp, bbox, video_id
analytics    id, video_id, total_vehicles, counts(json), avg_density,
             traffic_level, avg_speed, accident_risk, congestion_index,
             max_concurrent, processing_fps, created_at
predictions  id, condition, probability, congestion_forecast,
             accident_risk_forecast, features(json), created_at
```

Tables auto-create on startup via `init_db()`. Use **Alembic** for production
migrations (`alembic init alembic`).

## Project layout
```
backend/
  app/
    api/routes.py            REST endpoints
    models/                  SQLAlchemy ORM (PostgreSQL schema)
    services/video_processor.py   detection→tracking→count→write pipeline
    computer_vision/detector.py   YOLOv8 singleton + annotator
    computer_vision/tracker.py    ByteTrack/DeepSORT + centroid fallback
    ml/models.py             RandomForest + XGBoost + KMeans
    utils/file_utils.py      secure upload
    uploads/  processed_videos/
  Dockerfile  docker-compose.yml  requirements.txt  .env.example
```

## Deployment

**Render** — Web Service, build command `pip install -r requirements.txt`,
start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, attach a
managed PostgreSQL and set `DATABASE_URL`. Add a persistent disk for
`app/uploads` & `app/processed_videos`.

**Docker** — `docker compose up --build` (see Quick start).
