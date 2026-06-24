// Core domain types for the Smart Road Vehicle Analytics System.

export type VehicleClass =
  | "car"
  | "bus"
  | "truck"
  | "motorcycle"
  | "bike"
  | "other";

/** Axis-aligned bounding box: [x, y, width, height] in source pixels. */
export type BBox = [number, number, number, number];

export interface RawDetection {
  cls: VehicleClass;
  score: number;
  bbox: BBox;
}

export interface TrackedDetection {
  trackId: number;
  cls: VehicleClass;
  label: string;
  score: number;
  bbox: BBox;
  speed: number; // pixels/frame (relative motion proxy)
  confirmed: boolean;
}

export interface VehicleMeta {
  cls: VehicleClass;
  label: string;
  color: string;
  glow: string;
}

export type Counts = Record<VehicleClass, number>;

export interface Analytics {
  videoName: string;
  totalVehicles: number;
  counts: Counts;
  frameCount: number;
  framesWithVehicles: number;
  sumConcurrent: number;
  maxConcurrent: number;
  flow: number[]; // concurrent vehicle count per sampled frame
  avgDensityPct: number;
  densityPct: number;
  trafficLevel: "Low" | "Medium" | "High";
  avgSpeed: number;
  accidentRisk: number; // 0..100
  congestionIndex: number; // 0..100
  processingFps: number;
  durationSec: number;
  confidenceAvg: number;
  capacity: number;
  samples: { x: number; y: number }[]; // normalized centroids for K-Means hotspots
  createdAt: number;
}

export const VEHICLE_META: Record<VehicleClass, VehicleMeta> = {
  car: { cls: "car", label: "Car", color: "#38e0ff", glow: "rgba(56,224,255,0.55)" },
  bus: { cls: "bus", label: "Bus", color: "#60a5fa", glow: "rgba(96,165,250,0.55)" },
  truck: { cls: "truck", label: "Truck", color: "#fbbf24", glow: "rgba(251,191,36,0.55)" },
  motorcycle: { cls: "motorcycle", label: "Motorcycle", color: "#a78bfa", glow: "rgba(167,139,250,0.55)" },
  bike: { cls: "bike", label: "Bike", color: "#34d399", glow: "rgba(52,211,153,0.55)" },
  other: { cls: "other", label: "Other", color: "#94a3b8", glow: "rgba(148,163,184,0.5)" },
};

export const VEHICLE_ORDER: VehicleClass[] = [
  "car",
  "bus",
  "truck",
  "motorcycle",
  "bike",
  "other",
];

export function emptyCounts(): Counts {
  return { car: 0, bus: 0, truck: 0, motorcycle: 0, bike: 0, other: 0 };
}
