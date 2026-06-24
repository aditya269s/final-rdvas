import { useEffect, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Car,
  Bus,
  Truck,
  Bike,
  CircleDot,
  Gauge as GaugeIcon,
  Activity,
  Zap,
  Timer,
  Layers,
} from "lucide-react";
import { useVehicleDetection } from "../hooks/useVehicleDetection";
import { useApp } from "../context/AppContext";
import { VEHICLE_META, VEHICLE_ORDER, type TrackedDetection } from "../lib/types";
import { Gauge, ProgressBar, LevelPill } from "../components/ui";

const ICONS: Record<string, ComponentType<{ className?: string; style?: any }>> = {
  car: Car,
  bus: Bus,
  truck: Truck,
  motorcycle: Bike,
  bike: Bike,
  other: CircleDot,
};

export default function LiveDetection() {
  const { videoUrl, videoName } = useApp();
  const det = useVehicleDetection();
  const {
    videoRef,
    canvasRef,
    status,
    loadStage,
    error,
    live,
    threshold,
    showBoxes,
    init,
    pause,
    resume,
    restart,
    setThreshold,
    toggleBoxes,
  } = det;

  const [aspect, setAspect] = useState("16 / 9");
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    if (videoUrl && videoRef.current) init(videoUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl]);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  const onMeta = () => {
    const v = videoRef.current;
    if (v && v.videoWidth) setAspect(`${v.videoWidth} / ${v.videoHeight}`);
  };

  const togglePlay = () => {
    if (status === "running") pause();
    else if (status === "paused") resume();
    else if (status === "done") restart();
  };

  const isPlaying = status === "running";
  const timecode = videoRef.current
    ? formatTime(videoRef.current.currentTime)
    : "00:00";

  if (!videoUrl) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <div className="mx-auto grid place-items-center h-16 w-16 rounded-2xl bg-white/5 border border-white/10">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold text-white">
          No video loaded
        </h1>
        <p className="text-slate-400 mt-2">
          Upload a traffic video first to start live AI detection.
        </p>
        <Link
          to="/upload"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 font-semibold text-white glow-cyan"
        >
          Go to Upload
        </Link>
      </div>
    );
  }

  const riskColor =
    live.accidentRisk > 60 ? "#fb7185" : live.accidentRisk > 35 ? "#fbbf24" : "#34d399";

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-400">Step 2</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">
            Live Detection
          </h1>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
            <span className="max-w-[260px] truncate">{videoName || "video"}</span>
            <StatusDot status={status} />
          </p>
        </div>
        <Link
          to="/analytics"
          className="inline-flex items-center gap-2 rounded-xl glass px-4 py-2.5 text-sm font-semibold text-white hover:border-white/20"
        >
          <BarChart3 className="h-4 w-4 text-cyan-300" /> Full Analytics
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Video + controls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-2 rounded-2xl p-2">
            <div
              className="relative rounded-xl overflow-hidden bg-black scanlines"
              style={{ aspectRatio: aspect }}
            >
              <video
                ref={videoRef}
                onLoadedMetadata={onMeta}
                className="absolute inset-0 w-full h-full object-contain"
                muted
                playsInline
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />

              {/* HUD */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-2 z-10">
                <span className="flex items-center gap-1.5 rounded bg-black/65 px-2 py-1 text-[10px] font-bold text-rose-400 backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-blink" />
                  {isPlaying ? "LIVE" : status.toUpperCase()}
                </span>
                <span className="rounded bg-black/65 px-2 py-1 text-[10px] text-slate-300 font-mono backdrop-blur">
                  CAM-04
                </span>
              </div>
              <div className="absolute top-2.5 right-2.5 flex items-center gap-2 z-10">
                <span className="rounded bg-black/65 px-2 py-1 text-[10px] text-cyan-300 font-mono backdrop-blur">
                  Vehicles: {live.concurrent}
                </span>
                <span className="rounded bg-black/65 px-2 py-1 text-[10px] text-slate-300 font-mono backdrop-blur">
                  {clock}
                </span>
              </div>

              {/* progress */}
              <div className="absolute bottom-0 inset-x-0 p-2.5 z-10">
                <div className="flex items-center gap-2 text-[10px] text-slate-300 font-mono mb-1.5">
                  <span>{timecode}</span>
                  <span className="ml-auto">{Math.round(live.fps)} FPS</span>
                </div>
                <ProgressBar value={live.progress * 100} />
              </div>

              {/* Loading overlay */}
              <AnimatePresence>
                {status === "loading" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 grid place-items-center bg-black/70 backdrop-blur-sm z-20"
                  >
                    <div className="text-center">
                      <Loader2 className="h-10 w-10 text-cyan-400 animate-spin mx-auto" />
                      <p className="mt-4 text-white font-medium">{loadStage || "Loading…"}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        First run downloads the AI model (≈ once)
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error overlay */}
              <AnimatePresence>
                {status === "error" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 grid place-items-center bg-black/80 backdrop-blur-sm z-20 p-6"
                  >
                    <div className="text-center max-w-sm">
                      <AlertTriangle className="h-9 w-9 text-rose-400 mx-auto" />
                      <p className="mt-3 text-white font-medium">{error}</p>
                      <button
                        onClick={() => videoUrl && init(videoUrl)}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black"
                      >
                        <RefreshCw className="h-4 w-4" /> Retry
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Done banner */}
              <AnimatePresence>
                {status === "done" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20"
                  >
                    <div className="glass-2 rounded-xl px-4 py-2.5 flex items-center gap-3">
                      <span className="text-sm text-white font-medium">
                        Processing complete · {live.totalVehicles} vehicles
                      </span>
                      <Link
                        to="/analytics"
                        className="rounded-lg bg-gradient-to-r from-cyan-400 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        View Analytics
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Controls */}
          <div className="glass rounded-2xl p-3 flex flex-wrap items-center gap-3">
            <button
              onClick={togglePlay}
              disabled={status === "loading" || status === "error"}
              className="grid place-items-center h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white disabled:opacity-50"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </button>
            <button
              onClick={restart}
              className="grid place-items-center h-11 w-11 rounded-xl glass text-slate-200 hover:border-white/20"
              title="Restart"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              onClick={toggleBoxes}
              className={`inline-flex items-center gap-2 rounded-xl px-3 h-11 text-sm font-medium ${
                showBoxes ? "glass text-white" : "glass text-slate-400"
              } hover:border-white/20`}
            >
              {showBoxes ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Boxes
            </button>

            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
              <span className="text-xs text-slate-400 whitespace-nowrap">
                Confidence {Math.round(threshold * 100)}%
              </span>
              <input
                type="range"
                min={0.2}
                max={0.8}
                step={0.05}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="flex-1 accent-cyan-400"
              />
            </div>

            <span className="text-xs text-slate-400 hidden sm:block">
              {Math.round(live.fps)} FPS
            </span>
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Traffic status */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">Traffic Status</h3>
              <LevelPill level={live.trafficLevel} />
            </div>
            <div className="mt-3 flex items-center gap-4">
              <Gauge value={live.densityPct} size={108} label="Density" color="#38e0ff" />
              <div className="flex-1 space-y-2.5 text-xs">
                <MiniStat label="Concurrency" value={`${live.concurrent}/${live.capacity}`} />
                <MiniStat label="Peak vehicles" value={`${live.maxConcurrent}`} />
                <MiniStat label="Congestion" value={`${live.congestionIndex}%`} />
              </div>
            </div>
          </div>

          {/* Live counts */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white text-sm">Vehicle Count</h3>
              <span className="text-xs text-slate-400">
                Total <span className="text-cyan-300 font-bold">{live.totalVehicles}</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {VEHICLE_ORDER.map((cls) => {
                const meta = VEHICLE_META[cls];
                const Icon = ICONS[cls];
                return (
                  <div
                    key={cls}
                    className="rounded-xl border border-white/5 bg-white/5 p-2.5 text-center"
                  >
                    <Icon className="h-4 w-4 mx-auto" style={{ color: meta.color }} />
                    <div className="mt-1 text-lg font-display font-bold text-white tabular-nums">
                      {live.counts[cls]}
                    </div>
                    <div className="text-[10px] text-slate-400">{meta.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI insights */}
          <div className="glass rounded-2xl p-4">
            <h3 className="font-semibold text-white text-sm mb-3">AI Insights</h3>
            <div className="flex items-center gap-4">
              <Gauge value={live.accidentRisk} size={96} label="Risk" color={riskColor} />
              <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
                <Insight icon={Zap} label="Avg Speed" value={live.avgSpeed.toFixed(1)} color="#fbbf24" />
                <Insight icon={Activity} label="Confidence" value={`${Math.round(live.confidenceAvg * 100)}%`} color="#34d399" />
                <Insight icon={Timer} label="Frames" value={`${live.concurrent > 0 ? live.concurrent : 0}`} color="#60a5fa" />
                <Insight icon={GaugeIcon} label="Capacity" value={`${live.capacity}`} color="#a78bfa" />
              </div>
            </div>
          </div>

          {/* Detection list */}
          <div className="glass rounded-2xl p-4">
            <h3 className="font-semibold text-white text-sm mb-2 flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-300" /> Live Detections
              <span className="ml-auto text-xs text-slate-400">{live.tracks.length}</span>
            </h3>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {live.tracks.length === 0 && (
                <p className="text-xs text-slate-500 py-6 text-center">
                  Waiting for vehicles…
                </p>
              )}
              {live.tracks
                .slice()
                .sort((a, b) => b.score - a.score)
                .slice(0, 14)
                .map((t) => (
                  <TrackRow key={t.trackId} t={t} />
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackRow({ t }: { t: TrackedDetection }) {
  const meta = VEHICLE_META[t.cls];
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
      <span className="text-xs text-white font-medium">
        {meta.label} #{String(t.trackId).padStart(2, "0")}
      </span>
      <div className="flex-1 mx-1">
        <ProgressBar value={t.score * 100} color={meta.color} />
      </div>
      <span className="text-[10px] text-slate-400 tabular-nums w-9 text-right">
        {Math.round(t.score * 100)}%
      </span>
    </div>
  );
}

function Insight({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: ComponentType<{ className?: string; style?: any }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-white/5 p-2">
      <div className="flex items-center gap-1 text-slate-400">
        <Icon className="h-3 w-3" style={{ color }} />
        <span className="text-[10px]">{label}</span>
      </div>
      <div className="text-sm font-semibold text-white tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="text-white font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "running"
      ? "bg-emerald-400"
      : status === "error"
      ? "bg-rose-400"
      : status === "done"
      ? "bg-cyan-400"
      : "bg-amber-400";
  return (
    <span className="inline-flex items-center gap-1 text-[11px] capitalize text-slate-400">
      <span className={`h-1.5 w-1.5 rounded-full ${color} animate-pulse-soft`} />
      {status}
    </span>
  );
}

function formatTime(s: number) {
  if (!isFinite(s)) return "00:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
