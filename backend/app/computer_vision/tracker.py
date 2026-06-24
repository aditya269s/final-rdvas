"""Multi-object tracking.

The primary backend path uses Ultralytics' built-in trackers
(ByteTrack / DeepSORT) via ``detector.track(..., persist=True)`` which keeps a
stable numeric ID per vehicle across frames ("Car #01", "Truck #02", ...).

This module also provides a dependency-free ``CentroidTracker`` — a SORT-style
fallback that performs class-gated nearest-neighbour matching on detection
centroids. It mirrors the in-browser tracker used by the React frontend.
"""
from collections import defaultdict

import numpy as np


class CentroidTracker:
    def __init__(self, max_age: int = 8, min_hits: int = 2):
        self.max_age = max_age
        self.min_hits = min_hits
        self.next_id = 1
        self.tracks: dict[int, dict] = {}

    def reset(self):
        self.next_id = 1
        self.tracks.clear()

    def _centroid(self, bbox):
        x1, y1, x2, y2 = bbox
        return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)

    def update(self, detections, frame_w: int, frame_h: int):
        """detections: list of {type, confidence, bbox, track_id?}."""
        gate = max(45.0, 0.14 * float(np.hypot(frame_w, frame_h)))
        cents = [
            {"d": d, "c": self._centroid(d["bbox"]), "matched": False}
            for d in detections
        ]

        pairs = []
        for tid, tr in self.tracks.items():
            for ci, ce in enumerate(cents):
                if tr["type"] != ce["d"]["type"]:
                    continue
                dist = float(np.hypot(tr["c"][0] - ce["c"][0], tr["c"][1] - ce["c"][1]))
                if dist <= gate:
                    pairs.append((dist, tid, ci))
        pairs.sort(key=lambda p: p[0])

        used_t, used_c = set(), set()
        confirmed = defaultdict(int)
        for _, tid, ci in pairs:
            if tid in used_t or ci in used_c:
                continue
            used_t.add(tid)
            used_c.add(ci)
            tr = self.tracks[tid]
            move = float(np.hypot(tr["c"][0] - cents[ci]["c"][0], tr["c"][1] - cents[ci]["c"][1]))
            tr["speed"] = tr["speed"] * 0.7 + move * 0.3 if tr["speed"] else move
            was = tr["confirmed"]
            tr["c"] = cents[ci]["c"]
            tr["bbox"] = cents[ci]["d"]["bbox"]
            tr["hits"] += 1
            tr["missed"] = 0
            tr["confirmed"] = was or tr["hits"] >= self.min_hits
            if not was and tr["confirmed"]:
                confirmed[tr["type"]] += 1
            cents[ci]["matched"] = True

        for ce in cents:
            if ce["matched"]:
                continue
            self.tracks[self.next_id] = {
                "type": ce["d"]["type"],
                "c": ce["c"],
                "bbox": ce["d"]["bbox"],
                "hits": 1,
                "missed": 0,
                "confirmed": False,
                "speed": 0.0,
            }
            self.next_id += 1

        for tid in list(self.tracks.keys()):
            if tid not in used_t:
                self.tracks[tid]["missed"] += 1
                if self.tracks[tid]["missed"] > self.max_age:
                    del self.tracks[tid]

        active = [
            {
                "track_id": tid,
                "type": tr["type"],
                "bbox": tr["bbox"],
                "speed": tr["speed"],
                "confirmed": tr["confirmed"],
            }
            for tid, tr in self.tracks.items()
            if tr["missed"] == 0
        ]
        return {"active": active, "newly_confirmed": dict(confirmed)}
