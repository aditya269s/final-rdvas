// Multi-Object Tracker
// --------------------
// A lightweight class-gated centroid tracker (the same idea behind SORT /
// ByteTrack / DeepSORT): each detection is matched to the nearest existing
// track of the same class within a motion gate, which lets every vehicle keep
// a stable identity such as "Car #01", "Truck #02".

import type { BBox, RawDetection, TrackedDetection, VehicleClass } from "./types";

interface Track {
  id: number;
  cls: VehicleClass;
  cx: number;
  cy: number;
  lastBox: BBox;
  hits: number;
  missed: number;
  confirmed: boolean;
  speed: number;
  score: number;
}

export interface TrackerResult {
  active: TrackedDetection[]; // currently visible tracks (for drawing + live list)
  newlyConfirmed: VehicleClass[]; // classes that crossed the confirmation threshold this tick
}

export class CentroidTracker {
  private nextId = 1;
  private tracks = new Map<number, Track>();
  private maxAge = 8; // frames a track survives without a match
  private minHits = 2; // consecutive hits before a track is "counted"

  reset() {
    this.nextId = 1;
    this.tracks.clear();
  }

  totalConfirmed() {
    let n = 0;
    this.tracks.forEach((t) => {
      if (t.confirmed) n++;
    });
    return n;
  }

  update(detections: RawDetection[], w: number, h: number): TrackerResult {
    const gate = Math.max(45, 0.14 * Math.hypot(w, h));

    type Cent = { d: RawDetection; cx: number; cy: number; matched: boolean };
    const cents: Cent[] = detections.map((d) => {
      const [x, y, bw, bh] = d.bbox;
      return { d, cx: x + bw / 2, cy: y + bh / 2, matched: false };
    });

    // Build candidate (track, detection) pairs within the gate, same class.
    const pairs: { ti: number; ci: number; dist: number }[] = [];
    this.tracks.forEach((t, ti) => {
      cents.forEach((c, ci) => {
        if (t.cls !== c.d.cls) return;
        const dist = Math.hypot(t.cx - c.cx, t.cy - c.cy);
        if (dist <= gate) pairs.push({ ti, ci, dist });
      });
    });
    pairs.sort((a, b) => a.dist - b.dist);

    const usedTracks = new Set<number>();
    const usedCent = new Set<number>();
    const newlyConfirmed: VehicleClass[] = [];

    for (const p of pairs) {
      if (usedTracks.has(p.ti) || usedCent.has(p.ci)) continue;
      usedTracks.add(p.ti);
      usedCent.add(p.ci);
      const t = this.tracks.get(p.ti)!;
      const c = cents[p.ci];
      const move = Math.hypot(t.cx - c.cx, t.cy - c.cy);
      t.speed = t.speed > 0 ? t.speed * 0.7 + move * 0.3 : move;
      t.cx = c.cx;
      t.cy = c.cy;
      t.lastBox = c.d.bbox;
      t.hits++;
      t.missed = 0;
      t.score = Math.max(t.score, c.d.score);
      const wasConfirmed = t.confirmed;
      t.confirmed = t.confirmed || t.hits >= this.minHits;
      if (!wasConfirmed && t.confirmed) newlyConfirmed.push(t.cls);
      c.matched = true;
    }

    // Spawn new tracks for unmatched detections.
    for (const c of cents) {
      if (c.matched) continue;
      const t: Track = {
        id: this.nextId++,
        cls: c.d.cls,
        cx: c.cx,
        cy: c.cy,
        lastBox: c.d.bbox,
        hits: 1,
        missed: 0,
        confirmed: false,
        speed: 0,
        score: c.d.score,
      };
      this.tracks.set(t.id, t);
    }

    // Age unmatched tracks and retire stale ones.
    for (const [id, t] of this.tracks) {
      if (!usedTracks.has(id)) {
        t.missed++;
        if (t.missed > this.maxAge) this.tracks.delete(id);
      }
    }

    const active: TrackedDetection[] = [];
    this.tracks.forEach((t) => {
      if (t.missed > 0) return;
      active.push({
        trackId: t.id,
        cls: t.cls,
        label: t.cls,
        score: t.score,
        bbox: t.lastBox,
        speed: t.speed,
        confirmed: t.confirmed,
      });
    });

    return { active, newlyConfirmed };
  }
}
