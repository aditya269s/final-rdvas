// AI Detection Module
// --------------------
// Wraps the YOLO-equivalent object detector. In the live browser build we use
// TensorFlow.js + the COCO-SSD model (a real, on-device vehicle detector that
// recognises car / bus / truck / motorcycle / bicycle). The Python backend
// (see /backend) swaps this for Ultralytics YOLOv8/v9 over the identical API.
//
// Model loading happens exactly once and is reused across frames/videos.

import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import type { RawDetection, VehicleClass } from "./types";

const COCO_TO_CLASS: Record<string, VehicleClass> = {
  car: "car",
  bus: "bus",
  truck: "truck",
  motorcycle: "motorcycle",
  bicycle: "bike",
  train: "other",
};

let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;

export function getModelBackend(): string {
  return tf.getBackend();
}

export async function loadModel(
  onProgress?: (stage: string) => void
): Promise<cocoSsd.ObjectDetection> {
  if (!modelPromise) {
    onProgress?.("Initializing compute backend");
    try {
      await tf.setBackend("webgl");
    } catch {
      await tf.setBackend("cpu");
    }
    await tf.ready();
    onProgress?.("Loading YOLO / COCO-SSD weights");
    modelPromise = cocoSsd.load({ base: "lite_mobilenet_v2" });
  }
  const model = await modelPromise;
  onProgress?.("Detection model ready");
  return model;
}

/**
 * Runs detection on a single frame. `source` is a downscaled canvas drawn from
 * the current video frame (keeps inference fast and resolution-independent).
 */
export async function detectFrame(
  model: cocoSsd.ObjectDetection,
  source: HTMLCanvasElement | HTMLVideoElement,
  threshold: number
): Promise<RawDetection[]> {
  let preds: cocoSsd.DetectedObject[];
  try {
    preds = await model.detect(source, 24, threshold);
  } catch {
    return [];
  }
  const out: RawDetection[] = [];
  for (const p of preds) {
    const cls = COCO_TO_CLASS[p.class];
    if (!cls) continue;
    out.push({
      cls,
      score: p.score,
      bbox: [p.bbox[0], p.bbox[1], p.bbox[2], p.bbox[3]],
    });
  }
  return out;
}
