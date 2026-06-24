// Analytics & Machine-Learning helpers
// ------------------------------------
// Derived metrics computed from the detection/tracker stream. The Python
// backend trains the real Random Forest / XGBoost / K-Means models
// (see backend/app/ml); these client helpers mirror the same logic so the
// dashboard stays fully interactive without a round-trip to the server.

import type { Counts, TrackedDetection } from "./types";

export function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function trafficLevelFromDensity(pct: number): "Low" | "Medium" | "High" {
  if (pct < 34) return "Low";
  if (pct < 67) return "Medium";
  return "High";
}

export function densityPctFor(concurrent: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((concurrent / capacity) * 100));
}

/** Rough estimate of how many vehicles could physically fit in the frame. */
export function estimateCapacity(w: number, h: number): number {
  const lanes = Math.max(2, Math.round(w / 220));
  const depth = Math.max(3, Math.round(h / 120));
  return Math.max(8, Math.min(60, lanes * depth));
}

/** Heuristic accident-risk score from proximity + speed + crowding. */
export function accidentRiskScore(tracks: TrackedDetection[]): number {
  if (tracks.length < 2) return Math.min(35, tracks.length * 14);
  let minDist = Infinity;
  for (let i = 0; i < tracks.length; i++) {
    for (let j = i + 1; j < tracks.length; j++) {
      const [ax, ay, aw, ah] = tracks[i].bbox;
      const [bx, by, bw, bh] = tracks[j].bbox;
      const d = Math.hypot(ax + aw / 2 - (bx + bw / 2), ay + ah / 2 - (by + bh / 2));
      if (d < minDist) minDist = d;
    }
  }
  const speedFactor = Math.min(1, avg(tracks.map((t) => t.speed)) / 16);
  const proxFactor = Math.max(0, 1 - minDist / 130);
  const countFactor = Math.min(1, tracks.length / 16);
  return Math.round(Math.min(96, 16 + 44 * proxFactor * (0.5 + speedFactor) + 28 * countFactor));
}

export function congestionIndex(densityPct: number, avgSpeed: number): number {
  const speedNorm = Math.min(1, avgSpeed / 18);
  return Math.round(Math.min(100, densityPct * 0.68 + (1 - speedNorm) * 42));
}

export function sumCounts(c: Counts): number {
  return Object.values(c).reduce((a, b) => a + b, 0);
}

/* ----------------------------- ML: prediction ---------------------------- */

export interface PredictionInput {
  vehicleCount: number;
  densityPct: number;
  avgSpeed: number;
  hour: number; // 0..23
  isWeekend: boolean;
}

export interface PredictionResult {
  condition: "Free Flow" | "Moderate" | "Congested" | "Heavy";
  probability: number;
  etaMinutes: number;
  congestionForecast: number;
  accidentRiskForecast: number;
  rationale: string[];
}

function hourPeak(hour: number, weekend: boolean): number {
  if (weekend) return hour >= 11 && hour <= 19 ? 0.75 : 0.3;
  const morning = hour >= 7 && hour <= 10;
  const evening = hour >= 17 && hour <= 20;
  return morning || evening ? 0.9 : 0.35;
}

/**
 * Emulates a trained ensemble (Random Forest + gradient boosting) as a
 * transparent weighted decision surface over normalized features.
 */
export function predictTraffic(input: PredictionInput): PredictionResult {
  const density = input.densityPct / 100;
  const count = Math.min(1, input.vehicleCount / 30);
  const slow = Math.max(0, 1 - input.avgSpeed / 40);
  const peak = hourPeak(input.hour, input.isWeekend);

  const score = 0.34 * density + 0.22 * count + 0.24 * slow + 0.2 * peak;

  let condition: PredictionResult["condition"];
  if (score < 0.3) condition = "Free Flow";
  else if (score < 0.5) condition = "Moderate";
  else if (score < 0.72) condition = "Congested";
  else condition = "Heavy";

  const probability = Math.round((0.55 + Math.abs(score - 0.5) * 0.9) * 100) / 100;
  const etaMinutes = Math.round(8 + score * 38);
  const congestionForecast = Math.round(Math.min(100, score * 100 + (peak * 12 - 6)));
  const accidentRiskForecast = Math.round(Math.min(96, 12 + score * 68 + slow * 18));

  const rationale: string[] = [];
  rationale.push(`Density at ${input.densityPct}% contributes ${(0.34 * density).toFixed(2)} to the congestion score.`);
  if (peak > 0.5) rationale.push(`Peak-hour window detected (hour ${String(input.hour).padStart(2, "0")}:00) raises expected load.`);
  if (slow > 0.5) rationale.push(`Low average speed (${input.avgSpeed.toFixed(0)} rel. units) signals braking / queueing.`);
  if (count > 0.6) rationale.push(`High vehicle count (${input.vehicleCount}) is saturating lane capacity.`);

  return { condition, probability, etaMinutes, congestionForecast, accidentRiskForecast, rationale };
}

/* --------------------------- ML: K-Means cluster -------------------------- */

export interface Cluster {
  cx: number;
  cy: number;
  count: number;
}

export function kmeans(points: { x: number; y: number }[], k = 3, iter = 12): Cluster[] {
  if (points.length < k) k = Math.max(1, points.length);
  if (points.length === 0) return [];
  let centers = [...points]
    .sort(() => Math.random() - 0.5)
    .slice(0, k)
    .map((p) => ({ cx: p.x, cy: p.y }));

  for (let it = 0; it < iter; it++) {
    const groups: { x: number; y: number }[][] = Array.from({ length: centers.length }, () => []);
    for (const p of points) {
      let bi = 0;
      let bd = Infinity;
      centers.forEach((c, i) => {
        const d = (c.cx - p.x) ** 2 + (c.cy - p.y) ** 2;
        if (d < bd) {
          bd = d;
          bi = i;
        }
      });
      groups[bi].push(p);
    }
    centers = centers.map((c, i) => {
      const g = groups[i];
      if (!g.length) return c;
      return { cx: avg(g.map((p) => p.x)), cy: avg(g.map((p) => p.y)) };
    });
  }

  const out: Cluster[] = centers.map((c) => ({ ...c, count: 0 }));
  for (const p of points) {
    let bi = 0;
    let bd = Infinity;
    centers.forEach((c, i) => {
      const d = (c.cx - p.x) ** 2 + (c.cy - p.y) ** 2;
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    out[bi].count++;
  }
  return out.filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
}
