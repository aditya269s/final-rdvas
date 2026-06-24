import { useCallback, useEffect, useRef, useState } from "react";
import type * as cocoSsdNS from "@tensorflow-models/coco-ssd";
import { CentroidTracker } from "../lib/tracker";
import { detectFrame, loadModel } from "../lib/detector";
import {
  accidentRiskScore,
  avg,
  congestionIndex,
  densityPctFor,
  estimateCapacity,
  trafficLevelFromDensity,
} from "../lib/analytics";
import {
  emptyCounts,
  VEHICLE_META,
  type Analytics,
  type Counts,
  type RawDetection,
  type TrackedDetection,
} from "../lib/types";
import { useApp } from "../context/AppContext";

export type DetectionStatus =
  | "idle"
  | "loading"
  | "ready"
  | "running"
  | "paused"
  | "done"
  | "error";

export interface LiveSnapshot {
  counts: Counts;
  totalVehicles: number;
  concurrent: number;
  maxConcurrent: number;
  densityPct: number;
  avgDensityPct: number;
  trafficLevel: "Low" | "Medium" | "High";
  avgSpeed: number;
  accidentRisk: number;
  congestionIndex: number;
  fps: number;
  confidenceAvg: number;
  progress: number;
  capacity: number;
  tracks: TrackedDetection[];
}

function initialLive(): LiveSnapshot {
  return {
    counts: emptyCounts(),
    totalVehicles: 0,
    concurrent: 0,
    maxConcurrent: 0,
    densityPct: 0,
    avgDensityPct: 0,
    trafficLevel: "Low",
    avgSpeed: 0,
    accidentRisk: 0,
    congestionIndex: 0,
    fps: 0,
    confidenceAvg: 0,
    progress: 0,
    capacity: 20,
    tracks: [],
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function downsample(arr: number[], n: number): number[] {
  if (arr.length <= n) return arr;
  const out: number[] = [];
  const step = (arr.length - 1) / (n - 1);
  for (let i = 0; i < n; i++) out.push(Math.round(arr[Math.round(i * step)]));
  return out;
}

export function useVehicleDetection() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectCanvasRef = useRef<HTMLCanvasElement>(
    typeof document !== "undefined" ? document.createElement("canvas") : null as never
  );
  const modelRef = useRef<cocoSsdNS.ObjectDetection | null>(null);
  const trackerRef = useRef(new CentroidTracker());
  const rafRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const tickRef = useRef(0);

  const runningRef = useRef(false);
  const statusRef = useRef<DetectionStatus>("idle");

  // accumulators
  const countsRef = useRef<Counts>(emptyCounts());
  const totalRef = useRef(0);
  const frameCountRef = useRef(0);
  const framesWithRef = useRef(0);
  const sumConcurrentRef = useRef(0);
  const maxConcurrentRef = useRef(0);
  const sumSpeedRef = useRef(0);
  const speedCountRef = useRef(0);
  const sumConfRef = useRef(0);
  const confCountRef = useRef(0);
  const flowRef = useRef<number[]>([]);
  const lastSampleTimeRef = useRef(0);
  const fpsRef = useRef(0);
  const lastTickRef = useRef(0);
  const capacityRef = useRef(20);
  const scaleRef = useRef({ sx: 1, sy: 1 });

  const concurrentRef = useRef(0);
  const densityRef = useRef(0);
  const riskRef = useRef(0);
  const congestionRef = useRef(0);
  const tracksRef = useRef<TrackedDetection[]>([]);
  const samplesRef = useRef<{ x: number; y: number }[]>([]);

  const [status, setStatusState] = useState<DetectionStatus>("idle");
  const [loadStage, setLoadStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThresholdState] = useState(0.45);
  const thresholdRef = useRef(0.45);
  const [showBoxes, setShowBoxes] = useState(true);
  const showBoxesRef = useRef(true);
  const [live, setLive] = useState<LiveSnapshot>(initialLive());

  const { setAnalytics, videoName } = useApp();

  const setStatus = useCallback((s: DetectionStatus) => {
    statusRef.current = s;
    setStatusState(s);
  }, []);

  const resetStats = useCallback(() => {
    countsRef.current = emptyCounts();
    totalRef.current = 0;
    frameCountRef.current = 0;
    framesWithRef.current = 0;
    sumConcurrentRef.current = 0;
    maxConcurrentRef.current = 0;
    sumSpeedRef.current = 0;
    speedCountRef.current = 0;
    sumConfRef.current = 0;
    confCountRef.current = 0;
    flowRef.current = [];
    lastSampleTimeRef.current = 0;
    fpsRef.current = 0;
    lastTickRef.current = 0;
    concurrentRef.current = 0;
    densityRef.current = 0;
    riskRef.current = 0;
    congestionRef.current = 0;
    tracksRef.current = [];
    samplesRef.current = [];
  }, []);

  const drawBoxes = useCallback((tracks: TrackedDetection[]) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const lw = Math.max(2, cv.width / 420);
    for (const t of tracks) {
      const meta = VEHICLE_META[t.cls];
      const [x, y, w, h] = t.bbox;
      ctx.save();
      ctx.lineWidth = lw;
      ctx.strokeStyle = meta.color;
      ctx.shadowColor = meta.glow;
      ctx.shadowBlur = 14;
      roundRect(ctx, x, y, w, h, Math.min(10, w * 0.12));
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = hexA(meta.color, 0.09);
      ctx.fill();

      const label = `${meta.label} #${String(t.trackId).padStart(2, "0")}`;
      const conf = `${Math.round(t.score * 100)}%`;
      const font = Math.max(11, cv.width / 52);
      ctx.font = `600 ${font}px Inter, system-ui, sans-serif`;
      const padX = font * 0.5;
      const padY = font * 0.32;
      const labelW = ctx.measureText(label).width;
      const confW = ctx.measureText(conf).width;
      const cw = labelW + confW + padX * 2 + font * 0.7;
      const ch = font + padY * 2;
      let ly = y - ch - 4;
      if (ly < 0) ly = y + 4;
      ctx.fillStyle = meta.color;
      roundRect(ctx, x, ly, cw, ch, 6);
      ctx.fill();
      ctx.fillStyle = "#04050b";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + padX, ly + ch / 2);
      ctx.fillStyle = "rgba(4,5,11,0.72)";
      ctx.fillText(conf, x + padX + labelW + font * 0.7, ly + ch / 2);
      ctx.restore();
    }
  }, []);

  const loop = useCallback(async () => {
    if (!runningRef.current) return;
    const v = videoRef.current;
    const dc = detectCanvasRef.current;
    const dctx = dc?.getContext("2d");
    if (!v || !dc || !dctx || v.readyState < 2 || !modelRef.current) {
      if (runningRef.current) rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const now = performance.now();
    if (lastTickRef.current) {
      const dt = now - lastTickRef.current;
      if (dt > 0)
        fpsRef.current = fpsRef.current
          ? fpsRef.current * 0.8 + (1000 / dt) * 0.2
          : 1000 / dt;
    }
    lastTickRef.current = now;

    try {
      dctx.drawImage(v, 0, 0, dc.width, dc.height);
    } catch {
      if (runningRef.current) rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const raw = await detectFrame(modelRef.current, dc, thresholdRef.current);
    if (!runningRef.current) return;

    const { sx, sy } = scaleRef.current;
    const scaled: RawDetection[] = raw.map((d) => ({
      cls: d.cls,
      score: d.score,
      bbox: [d.bbox[0] * sx, d.bbox[1] * sy, d.bbox[2] * sx, d.bbox[3] * sy],
    }));

    const { active, newlyConfirmed } = trackerRef.current.update(
      scaled,
      v.videoWidth,
      v.videoHeight
    );

    for (const cls of newlyConfirmed) {
      countsRef.current[cls]++;
      totalRef.current++;
    }

    frameCountRef.current++;
    if (active.length) framesWithRef.current++;
    sumConcurrentRef.current += active.length;
    if (active.length > maxConcurrentRef.current)
      maxConcurrentRef.current = active.length;

    const speeds = active.map((t) => t.speed).filter((s) => s > 0);
    if (speeds.length) {
      sumSpeedRef.current += avg(speeds);
      speedCountRef.current++;
    }
    const confs = active.map((t) => t.score);
    if (confs.length) {
      sumConfRef.current += avg(confs);
      confCountRef.current++;
    }

    const dens = densityPctFor(active.length, capacityRef.current);
    densityRef.current = dens;
    concurrentRef.current = active.length;
    riskRef.current = accidentRiskScore(active);
    const aSpeed = speedCountRef.current
      ? sumSpeedRef.current / speedCountRef.current
      : 0;
    congestionRef.current = congestionIndex(dens, aSpeed);
    tracksRef.current = active;

    const t = v.currentTime;
    if (t - lastSampleTimeRef.current >= 0.5) {
      flowRef.current.push(active.length);
      lastSampleTimeRef.current = t;
      if (flowRef.current.length > 240) flowRef.current.shift();
      const nw = v.videoWidth || 1;
      const nh = v.videoHeight || 1;
      for (const a of active) {
        samplesRef.current.push({
          x: (a.bbox[0] + a.bbox[2] / 2) / nw,
          y: (a.bbox[1] + a.bbox[3] / 2) / nh,
        });
      }
      if (samplesRef.current.length > 500)
        samplesRef.current.splice(0, samplesRef.current.length - 500);
    }

    if (showBoxesRef.current) drawBoxes(active);
    else {
      const cv = canvasRef.current;
      cv?.getContext("2d")?.clearRect(0, 0, cv.width, cv.height);
    }

    if (runningRef.current) rafRef.current = requestAnimationFrame(loop);
  }, [drawBoxes]);

  const publishAnalytics = useCallback((): Analytics => {
    const fc = frameCountRef.current || 1;
    const cap = capacityRef.current || 1;
    const aSpeed = speedCountRef.current
      ? sumSpeedRef.current / speedCountRef.current
      : 0;
    const confAvg = confCountRef.current
      ? sumConfRef.current / confCountRef.current
      : 0;
    const avgDensity = Math.round((sumConcurrentRef.current / fc / cap) * 100);
    const analytics: Analytics = {
      videoName,
      totalVehicles: totalRef.current,
      counts: { ...countsRef.current },
      frameCount: frameCountRef.current,
      framesWithVehicles: framesWithRef.current,
      sumConcurrent: sumConcurrentRef.current,
      maxConcurrent: maxConcurrentRef.current,
      flow: downsample(flowRef.current, 80),
      avgDensityPct: Math.min(100, avgDensity),
      densityPct: densityRef.current,
      trafficLevel: trafficLevelFromDensity(densityRef.current),
      avgSpeed: aSpeed,
      accidentRisk: riskRef.current,
      congestionIndex: congestionRef.current,
      processingFps: Math.round(fpsRef.current),
      durationSec: videoRef.current?.duration || 0,
      confidenceAvg: confAvg,
      capacity: capacityRef.current,
      samples: samplesRef.current.slice(-160),
      createdAt: Date.now(),
    };
    setAnalytics(analytics);
    return analytics;
  }, [setAnalytics, videoName]);

  const sync = useCallback(() => {
    const cap = capacityRef.current || 1;
    const fc = frameCountRef.current || 1;
    const aSpeed = speedCountRef.current
      ? sumSpeedRef.current / speedCountRef.current
      : 0;
    const snap: LiveSnapshot = {
      counts: { ...countsRef.current },
      totalVehicles: totalRef.current,
      concurrent: concurrentRef.current,
      maxConcurrent: maxConcurrentRef.current,
      densityPct: densityRef.current,
      avgDensityPct: Math.min(100, Math.round((sumConcurrentRef.current / fc / cap) * 100)),
      trafficLevel: trafficLevelFromDensity(densityRef.current),
      avgSpeed: aSpeed,
      accidentRisk: riskRef.current,
      congestionIndex: congestionRef.current,
      fps: Math.round(fpsRef.current),
      confidenceAvg: confCountRef.current
        ? sumConfRef.current / confCountRef.current
        : 0,
      progress: videoRef.current
        ? videoRef.current.currentTime / (videoRef.current.duration || 1)
        : 0,
      capacity: capacityRef.current,
      tracks: tracksRef.current,
    };
    setLive(snap);
    tickRef.current++;
    if (tickRef.current % 4 === 0) publishAnalytics();
  }, [publishAnalytics]);

  const startSync = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = window.setInterval(sync, 180);
  }, [sync]);

  const stopSync = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    const v = videoRef.current;
    const cv = canvasRef.current;
    if (!v || !cv) return;
    if (v.readyState < 2) {
      await new Promise<void>((resolve) => {
        const handler = () => resolve();
        v.addEventListener("loadeddata", handler, { once: true });
      });
    }
    const nw = v.videoWidth;
    const nh = v.videoHeight;
    if (!nw || !nh) {
      setError("Unable to read video dimensions.");
      setStatus("error");
      return;
    }
    const DW = 480;
    const DH = Math.max(1, Math.round((DW * nh) / nw));
    const dc = detectCanvasRef.current;
    dc.width = DW;
    dc.height = DH;
    scaleRef.current = { sx: nw / DW, sy: nh / DH };
    cv.width = nw;
    cv.height = nh;
    capacityRef.current = estimateCapacity(nw, nh);

    trackerRef.current.reset();
    resetStats();
    runningRef.current = true;
    setStatus("running");
    v.currentTime = 0;
    try {
      await v.play();
    } catch {
      /* autoplay may require a user gesture */
    }
    lastTickRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
    startSync();
  }, [loop, resetStats, setStatus, startSync]);

  const init = useCallback(
    async (src: string) => {
      const v = videoRef.current;
      if (!v) return;
      setError(null);
      setStatus("loading");

      if (src.startsWith("http")) v.setAttribute("crossorigin", "anonymous");
      else v.removeAttribute("crossorigin");
      v.src = src;
      v.load();
      v.onended = () => {
        runningRef.current = false;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        stopSync();
        publishAnalytics();
        setStatus("done");
      };

      if (!modelRef.current) {
        try {
          const m = await loadModel((stage) => setLoadStage(stage));
          modelRef.current = m;
        } catch {
          setError(
            "Failed to load the AI detection model. Check your internet connection and retry."
          );
          setStatus("error");
          return;
        }
      }
      await start();
    },
    [publishAnalytics, setStatus, start, stopSync]
  );

  const pause = useCallback(() => {
    if (!runningRef.current) return;
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    videoRef.current?.pause();
    stopSync();
    setStatus("paused");
  }, [setStatus, stopSync]);

  const resume = useCallback(() => {
    if (statusRef.current !== "paused") return;
    runningRef.current = true;
    setStatus("running");
    lastTickRef.current = 0;
    videoRef.current?.play().catch(() => {});
    rafRef.current = requestAnimationFrame(loop);
    startSync();
  }, [loop, setStatus, startSync]);

  const restart = useCallback(() => {
    trackerRef.current.reset();
    resetStats();
    runningRef.current = true;
    setStatus("running");
    if (videoRef.current) videoRef.current.currentTime = 0;
    videoRef.current?.play().catch(() => {});
    lastTickRef.current = 0;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
    startSync();
  }, [loop, resetStats, setStatus, startSync]);

  const setThreshold = useCallback((v: number) => {
    thresholdRef.current = v;
    setThresholdState(v);
  }, []);

  const toggleBoxes = useCallback(() => {
    showBoxesRef.current = !showBoxesRef.current;
    setShowBoxes(showBoxesRef.current);
    if (!showBoxesRef.current) {
      const cv = canvasRef.current;
      cv?.getContext("2d")?.clearRect(0, 0, cv.width, cv.height);
    }
  }, []);

  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    status,
    loadStage,
    error,
    live,
    threshold,
    showBoxes,
    init,
    start,
    pause,
    resume,
    restart,
    setThreshold,
    toggleBoxes,
    publishAnalytics,
  };
}
