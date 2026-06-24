import { useEffect, useRef, useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileVideo,
  CheckCircle2,
  Loader2,
  Sparkles,
  ArrowRight,
  X,
  Cpu,
  ShieldCheck,
  Film,
  ListChecks,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { GlassCard } from "../components/ui";

const SAMPLE_VIDEO =
  "https://videos.pexels.com/video-files/30892496/13207848_3840_2160_60fps.mp4";
const SAMPLE_POSTER =
  "https://images.pexels.com/videos/30892496/auto-automotives-cars-fast-moving-30892496.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200";

const STAGES = [
  "Uploading video stream",
  "Saving securely to storage",
  "Extracting frames (OpenCV)",
  "Loading YOLO detection model",
  "Initializing tracker & analytics",
];

const CLASSES = ["Car", "Bus", "Truck", "Motorcycle", "Bike", "Other"];

function formatBytes(b: number) {
  if (!b) return "—";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}

export default function UploadPage() {
  const { videoUrl, videoName, setVideo } = useApp();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [info, setInfo] = useState<{ name: string; size: number; duration: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (videoUrl && !info) {
      setInfo({ name: videoName || "video", size: 0, duration: 0 });
    }
  }, [videoUrl, videoName, info]);

  const readFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith("video/")) {
      setError("Please select a video file (mp4, webm, mov).");
      return;
    }
    const url = URL.createObjectURL(file);
    setVideo(url, file.name);
    const tmp = document.createElement("video");
    tmp.preload = "metadata";
    tmp.onloadedmetadata = () =>
      setInfo({ name: file.name, size: file.size, duration: tmp.duration || 0 });
    tmp.src = url;
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) readFile(f);
  };

  const loadSample = () => {
    setError(null);
    setVideo(SAMPLE_VIDEO, "sample-highway-traffic.mp4");
    setInfo({ name: "sample-highway-traffic.mp4", size: 0, duration: 0 });
  };

  const clearVideo = () => {
    setInfo(null);
    setVideo("", "");
  };

  const start = () => {
    if (!videoUrl) {
      setError("Please upload or load a sample video first.");
      return;
    }
    setProcessing(true);
    setStage(0);
    STAGES.forEach((_, i) => setTimeout(() => setStage(i), i * 620));
    setTimeout(() => navigate("/live"), STAGES.length * 620 + 500);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-400">Step 1</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-white">
          Upload Traffic Video
        </h1>
        <p className="text-slate-400 mt-2 max-w-2xl">
          Drop a road or CCTV clip and the AI pipeline will extract frames, run
          YOLO detection and prepare the live analysis.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main drop / preview */}
        <div className="lg:col-span-2">
          <GlassCard hover={false} className="p-5">
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) readFile(f);
              }}
            />

            {!videoUrl ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition h-[340px] grid place-items-center text-center ${
                  drag
                    ? "border-cyan-400 bg-cyan-400/10"
                    : "border-white/15 hover:border-cyan-400/50 hover:bg-white/5"
                }`}
              >
                <div className="grid-overlay absolute inset-0 rounded-2xl opacity-30 pointer-events-none" />
                <div className="relative">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity }}
                    className="mx-auto grid place-items-center h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 glow-cyan"
                  >
                    <UploadCloud className="h-8 w-8 text-white" />
                  </motion.div>
                  <p className="mt-4 font-semibold text-white text-lg">
                    Drop video here or click to browse
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    MP4 · WebM · MOV — processed privately in your browser
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="rounded-xl overflow-hidden bg-black relative aspect-video scanlines">
                  <video
                    src={videoUrl}
                    poster={videoUrl.startsWith("http") ? SAMPLE_POSTER : undefined}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid place-items-center h-10 w-10 rounded-lg bg-cyan-400/15 text-cyan-300 shrink-0">
                      <FileVideo className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate max-w-[220px]">
                        {info?.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatBytes(info?.size || 0)} ·{" "}
                        {info?.duration
                          ? `${Math.round(info.duration)}s`
                          : "duration —"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => inputRef.current?.click()}
                      className="rounded-lg glass px-3 py-2 text-sm text-slate-200 hover:border-white/20"
                    >
                      Change
                    </button>
                    <button
                      onClick={clearVideo}
                      className="rounded-lg glass px-3 py-2 text-sm text-slate-300 hover:border-white/20 inline-flex items-center gap-1"
                    >
                      <X className="h-4 w-4" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="mt-3 text-sm text-rose-400">{error}</p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={start}
                disabled={processing}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 font-semibold text-white glow-cyan hover:opacity-95 transition disabled:opacity-60"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Processing…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" /> Start AI Detection
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
              <button
                onClick={loadSample}
                disabled={processing}
                className="inline-flex items-center gap-2 rounded-xl glass px-4 py-3 font-medium text-slate-200 hover:border-white/20 transition disabled:opacity-60"
              >
                <Film className="h-4 w-4 text-cyan-300" /> Load Sample Video
              </button>
            </div>

            <AnimatePresence>
              {processing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-5 overflow-hidden"
                >
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-2.5">
                    {STAGES.map((s, i) => (
                      <div key={s} className="flex items-center gap-3 text-sm">
                        {i < stage ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : i === stage ? (
                          <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />
                        ) : (
                          <span className="h-4 w-4 rounded-full border border-white/20" />
                        )}
                        <span className={i <= stage ? "text-white" : "text-slate-500"}>
                          {s}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </div>

        {/* Side info */}
        <div className="space-y-4">
          <GlassCard delay={0.1} className="p-5">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Cpu className="h-5 w-5 text-cyan-300" /> Pipeline
            </div>
            <ol className="mt-3 space-y-2 text-sm text-slate-300">
              {[
                "Secure upload & storage",
                "Frame extraction (OpenCV)",
                "YOLOv8 vehicle detection",
                "ByteTrack object tracking",
                "Counting & density analytics",
              ].map((t, i) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="grid place-items-center h-5 w-5 rounded-full bg-cyan-400/15 text-cyan-300 text-[10px] font-bold">
                    {i + 1}
                  </span>
                  {t}
                </li>
              ))}
            </ol>
          </GlassCard>

          <GlassCard delay={0.15} className="p-5">
            <div className="flex items-center gap-2 text-white font-semibold">
              <ListChecks className="h-5 w-5 text-violet-300" /> Detectable Classes
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {CLASSES.map((c) => (
                <span
                  key={c}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200"
                >
                  {c}
                </span>
              ))}
            </div>
          </GlassCard>

          <GlassCard delay={0.2} className="p-5">
            <div className="flex items-center gap-2 text-white font-semibold">
              <ShieldCheck className="h-5 w-5 text-emerald-300" /> Private by design
            </div>
            <p className="mt-2 text-sm text-slate-400">
              In this live build, frames are analyzed on-device with
              TensorFlow.js — your video never leaves the browser. The included
              FastAPI backend mirrors the same flow server-side with YOLOv8.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
