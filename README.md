# 🚦 Smart Road Vehicle Analytics System

> **Final Year Major Project** — AI + Computer Vision + Machine Learning smart
> traffic monitoring platform.

Upload a road/CCTV video → the AI processes **every frame** → **detects,
tracks & counts vehicles** in real time with bounding boxes, labels and
confidence scores → generates a full **analytics dashboard** with charts and
ML predictions.

![pipeline](https://img.shields.io/badge/pipeline-Upload%E2%86%92Detect%E2%86%92Track%E2%86%92Analyze-38e0ff)

```
Original Video  →  AI Processing (YOLOv8)  →  Annotated Output
                                          bounding boxes · labels · confidence · counting
```

---

## ✨ What's inside

This repository contains **two** complete, runnable parts:

| Part | Stack | Runs |
| ---- | ----- | ---- |
| **Frontend** (`/`) | React + Vite + Tailwind + Framer Motion + Three.js + **TensorFlow.js (COCO-SSD)** | Live in the browser — **real on-device vehicle detection** |
| **Backend** (`/backend`) | Python + FastAPI + **YOLOv8** + OpenCV + ByteTrack + scikit-learn/XGBoost + PostgreSQL | Server-side processing + REST API + DB |

> The frontend performs **genuine computer vision** in the browser via
> TensorFlow.js COCO-SSD — it really detects cars, buses, trucks, motorcycles
> and bikes on your uploaded video, draws boxes, tracks IDs and counts them.
> The Python backend mirrors the same pipeline with YOLOv8.

### Core capabilities
- 🎯 **Vehicle detection** — Car, Bus, Truck, Motorcycle, Bike, Other (+ confidence)
- 🧲 **Multi-object tracking** — stable IDs (`Car #01`, `Truck #02`) via ByteTrack / DeepSORT
- 🔢 **Real-time counting** — per-class + total unique vehicles
- 📊 **Traffic density** — Low / Medium / High levels + live gauge
- ⚡ **Speed estimation**, **accident-risk** & **congestion** scoring
- 🧠 **ML analytics** — Random Forest + XGBoost traffic prediction, K-Means hotspot clustering
- 📈 **Dashboard** — donut / bar / line charts + CSV report export

---

## 🖥️ Frontend — run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build -> dist/
```

Open the app → **Upload** a traffic video (or **Load Sample Video**) →
**Live Detection** runs real AI → **Analytics Dashboard** shows the results.

### Pages
1. **Landing** — 3D animated highway, pipeline & feature showcase.
2. **Upload** — drag & drop, preview, staged processing pipeline.
3. **Live Detection** — video + bounding-box overlay, live counts, AI insights, tracking list.
4. **Analytics** — stat cards, distribution charts, flow timeline, ML predictor, K-Means hotspots, CSV report.

### Frontend structure
```
src/
  App.tsx                layout + routes
  pages/                 Landing · Upload · LiveDetection · Analytics
  components/             Scene3D · Navbar · ui · charts
  hooks/useVehicleDetection.ts   detection loop (model→detect→track→draw→count)
  lib/                    types · detector · tracker · analytics (ML helpers)
  context/AppContext.tsx  video + analytics state
```

---

## 🛰️ Backend — see [`backend/README.md`](backend/README.md)

```bash
cd backend
cp .env.example .env
docker compose up --build      # api :8000  ·  postgres :5432
```

**API:** `POST /api/upload-video` · `GET /api/video-result/{id}` ·
`GET /api/analytics/{id}` · `POST /api/predict-traffic`

---

## 🧱 Architecture

```
            ┌────────────── Frontend (React) ──────────────┐
            │  Upload → TF.js COCO-SSD detect → Canvas      │
            │  overlay → tracker → live counts → charts     │
            └────────────────────┬──────────────────────────┘
                                 │ (optional) REST
            ┌────────────── Backend (FastAPI) ──────────────┐
            │  /upload-video → OpenCV frames → YOLOv8 →      │
            │  ByteTrack → annotate → count/density → mp4    │
            │  ML (RF/XGBoost/KMeans) → PostgreSQL           │
            └────────────────────────────────────────────────┘
```

---

## 🔬 Module-by-module

| Module | What was implemented | Why | How it improves the system |
| ------ | -------------------- | --- | -------------------------- |
| **Detector** (`lib/detector`, `cv/detector.py`) | YOLO/COCO-SSD wrapper, loaded **once** & reused | Repeated weight loading kills throughput | Fast, reusable, GPU/CPU aware inference |
| **Tracker** (`lib/tracker`, `cv/tracker.py`) | Class-gated centroid / ByteTrack matching | Detection alone re-IDs every frame | Stable `Car #01` identities → accurate counts |
| **Pipeline** (`hooks/useVehicleDetection`, `services/video_processor.py`) | frame → detect → track → draw → count → publish | Orchestrates the whole flow end-to-end | One coherent, optimised processing loop |
| **Analytics** (`lib/analytics`, `models`) | density, traffic level, speed, risk, congestion | Raw boxes aren't actionable | Turns detections into decision-ready insight |
| **ML** (`lib/analytics`, `ml/models.py`) | RandomForest + XGBoost + KMeans | Forecasting & spatial understanding | Predictive congestion, ETA, accident risk, hotspots |
| **UI/UX** (pages + components) | Glassmorphism, 3D bg, animated charts | Usability + premium feel | Professional, real-time surveillance experience |
| **DB** (`models/`, PostgreSQL) | videos, detections, analytics, predictions | Persistence & querying | Auditable history, multi-video analysis |
| **Infra** (Docker, compose, env) | Containerised api + db | Reproducible deploys | One-command setup; Render/Docker ready |

---

## 🚀 Deployment
- **Frontend:** build (`npm run build`) → deploy `dist/` to Vercel/Netlify/any static host.
- **Backend:** Docker Compose, or Render Web Service + managed PostgreSQL (see `backend/README.md`).

## 📝 Notes
- The browser build is **private by design** — uploaded video never leaves the device.
- First run downloads the AI model once (~30s), then detection is instant.
- Replace COCO-SSD with the FastAPI+YOLOv8 backend for heavy/long videos or GPU batches.

---

Built as a Computer Vision + ML major project · YOLOv8 · OpenCV · FastAPI · PostgreSQL · React · Three.js
