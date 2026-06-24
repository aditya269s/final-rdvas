"""YOLOv8 / YOLOv9 detection wrapper.

Design goals (model optimization):
* The YOLO model is loaded **once** (singleton) and reused for every frame /
  every request — no repeated weight loading.
* Device selection (CPU / CUDA) is centralised via settings.DEVICE.
* Detection returns only vehicle classes, mapped to the project taxonomy.
"""
import threading

import numpy as np
from ultralytics import YOLO

from app.config import settings

# COCO class name -> project vehicle class
VEHICLE_CLASSES = {
    "car": "car",
    "bus": "bus",
    "truck": "truck",
    "motorcycle": "motorcycle",
    "bicycle": "bike",
    "train": "other",
}

# BGR colours for annotation
COLORS = {
    "car": (255, 224, 56),
    "bus": (250, 165, 96),
    "truck": (36, 191, 251),
    "motorcycle": (250, 139, 167),
    "bike": (153, 211, 52),
    "other": (184, 163, 148),
}


class YoloDetector:
    """Thread-safe singleton wrapper around an Ultralytics YOLO model."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                obj = super().__new__(cls)
                obj._model = None
                cls._instance = obj
            return cls._instance

    # ----------------------- model lifecycle ----------------------- #
    def load(self):
        if self._model is None:
            self._model = YOLO(settings.yolo_model)
        return self._model

    # -------------------------- inference -------------------------- #
    def detect(self, frame, conf=None):
        """Single-frame detection (no tracking ids)."""
        model = self.load()
        res = model.predict(
            frame, conf=conf or settings.confidence, device=settings.device, verbose=False
        )[0]
        return self._parse(res, with_ids=False)

    def track(self, frame, conf=None):
        """Detection + multi-object tracking (ByteTrack / DeepSORT)."""
        model = self.load()
        tracker_cfg = "bytetrack.yaml" if settings.tracker == "bytetrack" else "deepsort.yaml"
        res = model.track(
            frame,
            conf=conf or settings.confidence,
            persist=True,
            tracker=tracker_cfg,
            device=settings.device,
            verbose=False,
        )[0]
        return self._parse(res, with_ids=True)

    # --------------------------- helpers --------------------------- #
    def _parse(self, res, with_ids=False):
        out = []
        if res.boxes is None:
            return out
        names = res.names
        ids = (
            res.boxes.id.cpu().numpy()
            if (with_ids and res.boxes.id is not None)
            else None
        )
        boxes = res.boxes.xyxy.cpu().numpy()
        confs = res.boxes.conf.cpu().numpy()
        clss = res.boxes.cls.cpu().numpy()
        for i in range(len(boxes)):
            cls_name = names[int(clss[i])]
            mapped = VEHICLE_CLASSES.get(cls_name)
            if not mapped:
                continue
            x1, y1, x2, y2 = boxes[i].tolist()
            out.append(
                {
                    "type": mapped,
                    "confidence": float(confs[i]),
                    "bbox": [x1, y1, x2, y2],
                    "track_id": int(ids[i]) if ids is not None else None,
                }
            )
        return out


detector = YoloDetector()


def warmup():
    """Load the model and run a dummy forward pass (call at startup)."""
    import numpy as np

    detector.load()
    detector.detect(np.zeros((640, 640, 3), dtype=np.uint8))


def annotate(frame, detections):
    """Draw coloured bounding boxes, labels & confidence on the frame."""
    import cv2

    for d in detections:
        x1, y1, x2, y2 = map(int, d["bbox"])
        color = COLORS.get(d["type"], (184, 163, 148))
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        label = d["type"]
        if d.get("track_id") is not None:
            label = f'{d["type"]} #{d["track_id"]:02d}'
        label = f"{label} {int(d['confidence'] * 100)}%"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.rectangle(frame, (x1, y1 - th - 8), (x1 + tw + 4, y1), color, -1)
        cv2.putText(
            frame, label, (x1 + 2, y1 - 5),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA,
        )
    return frame
