import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Upload,
  ArrowRight,
  Video,
  Cpu,
  MonitorPlay,
  Target,
  Boxes,
  Gauge,
  ShieldAlert,
  BarChart3,
  FileBarChart,
  Brain,
  Layers,
  Zap,
  TrendingUp,
} from "lucide-react";
import { GlassCard } from "../components/ui";

const PIPELINE = [
  { icon: Video, title: "Original Video", desc: "Upload any road / CCTV footage", color: "#38e0ff" },
  { icon: Cpu, title: "AI Processing", desc: "YOLOv8 + OpenCV frame analysis", color: "#a78bfa" },
  { icon: MonitorPlay, title: "Annotated Output", desc: "Boxes · labels · live counting", color: "#34d399" },
];

const FEATURES = [
  { icon: Target, title: "Vehicle Detection", desc: "Car, bus, truck, bike, motorcycle & more with confidence scoring.", color: "#38e0ff" },
  { icon: Boxes, title: "Object Tracking", desc: "ByteTrack / DeepSORT assigns a stable ID to every vehicle.", color: "#a78bfa" },
  { icon: BarChart3, title: "Vehicle Counting", desc: "Real-time per-class counts and total unique vehicles.", color: "#34d399" },
  { icon: Gauge, title: "Speed Estimation", desc: "Per-vehicle motion proxy derived from centroid tracking.", color: "#fbbf24" },
  { icon: Layers, title: "Traffic Density", desc: "Continuous density ratio with Low / Medium / High levels.", color: "#60a5fa" },
  { icon: ShieldAlert, title: "Accident Risk", desc: "Proximity + speed heuristics estimate collision risk.", color: "#fb7185" },
  { icon: Zap, title: "Congestion Detection", desc: "Density vs. throughput congestion indexing.", color: "#f472b6" },
  { icon: FileBarChart, title: "Report Generation", desc: "Exportable analytics & CSV summary reports.", color: "#22d3ee" },
];

const TECH = ["YOLOv8 / YOLOv9", "OpenCV", "FastAPI", "PostgreSQL", "ByteTrack", "TensorFlow.js", "React", "Three.js", "Framer Motion", "Docker"];

const MODELS = [
  { name: "Random Forest", use: "Traffic condition classification", icon: Brain, color: "#38e0ff" },
  { name: "XGBoost", use: "Congestion & ETA regression", icon: TrendingUp, color: "#a78bfa" },
  { name: "K-Means Clustering", use: "Spatial traffic hotspots", icon: Layers, color: "#34d399" },
];

const MOCK_BOXES = [
  { x: "8%", y: "30%", w: "26%", h: "34%", label: "Car #03 · 92%", color: "#38e0ff" },
  { x: "42%", y: "44%", w: "20%", h: "26%", label: "Truck #07 · 88%", color: "#fbbf24" },
  { x: "68%", y: "24%", w: "24%", h: "30%", label: "Bus #02 · 85%", color: "#60a5fa" },
  { x: "70%", y: "62%", w: "16%", h: "22%", label: "Bike #11 · 79%", color: "#34d399" },
];

export default function Landing() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* HERO */}
      <section className="grid lg:grid-cols-2 gap-10 items-center min-h-[78vh] py-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse-soft" />
            Final Year Major Project · CV + ML
          </span>
          <h1 className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
            Smart Road <span className="text-gradient">Vehicle Analytics</span> System
          </h1>
          <p className="mt-5 text-slate-300/90 text-lg max-w-xl">
            Upload traffic video → AI processes every frame → detects, tracks and
            counts vehicles in real time → generates a full analytics dashboard.
            A production-style smart traffic monitoring platform.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/upload"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 font-semibold text-white glow-cyan hover:opacity-95 transition"
            >
              <Upload className="h-5 w-5" /> Upload Traffic Video
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
            <Link
              to="/analytics"
              className="inline-flex items-center gap-2 rounded-xl glass px-5 py-3 font-semibold text-white hover:border-white/20 transition"
            >
              <BarChart3 className="h-5 w-5 text-cyan-300" /> View Dashboard
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
            {[
              { k: "6+", v: "Vehicle Classes" },
              { k: "Real-time", v: "Detection FPS" },
              { k: "4", v: "ML Models" },
            ].map((s) => (
              <div key={s.v} className="glass rounded-xl px-3 py-2.5 text-center">
                <div className="font-display text-lg font-bold text-white">{s.k}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  {s.v}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Hero visual: faux surveillance frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="relative"
        >
          <div className="glass-2 rounded-2xl p-3 glow-cyan">
            <div className="relative rounded-xl overflow-hidden bg-black/60 aspect-video scanlines">
              <div className="absolute inset-0 grid-overlay opacity-40" />
              <div className="absolute top-2 left-2 flex items-center gap-2 z-10">
                <span className="flex items-center gap-1.5 rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-blink" /> LIVE
                </span>
                <span className="rounded bg-black/60 px-2 py-0.5 text-[10px] text-slate-300 font-mono">
                  CAM-04 · HW-NORTH
                </span>
              </div>
              {MOCK_BOXES.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.2 }}
                  className="absolute rounded-md"
                  style={{
                    left: b.x,
                    top: b.y,
                    width: b.w,
                    height: b.h,
                    border: `2px solid ${b.color}`,
                    boxShadow: `0 0 14px ${b.color}66, inset 0 0 18px ${b.color}22`,
                    background: `${b.color}10`,
                  }}
                >
                  <span
                    className="absolute -top-5 left-0 rounded px-1.5 py-0.5 text-[9px] font-bold text-black whitespace-nowrap"
                    style={{ background: b.color }}
                  >
                    {b.label}
                  </span>
                </motion.div>
              ))}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono">
                <span className="rounded bg-black/60 px-2 py-0.5 text-emerald-300">
                  Vehicles: 14 · Density 47%
                </span>
                <span className="rounded bg-black/60 px-2 py-0.5 text-slate-300">YOLOv8</span>
              </div>
            </div>
            {/* faux console */}
            <div className="mt-3 rounded-lg bg-black/50 border border-white/5 p-3 font-mono text-[11px] leading-relaxed">
              <div className="text-slate-500"># detection stream</div>
              <div className="text-cyan-300">car 0.92</div>
              <div className="text-amber-300">truck 0.88</div>
              <div className="text-blue-300">bus 0.85</div>
              <div className="text-emerald-300">motorcycle 0.79</div>
              <div className="text-slate-500">tracking_id assigned → Car #03 ✓</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* PIPELINE */}
      <section className="py-14">
        <SectionTitle eyebrow="Pipeline" title="From raw footage to insight" />
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {PIPELINE.map((p, i) => (
            <div key={p.title} className="relative">
              <GlassCard delay={i * 0.1} className="p-5 h-full">
                <span
                  className="grid place-items-center h-11 w-11 rounded-xl"
                  style={{ background: p.color + "22", color: p.color }}
                >
                  <p.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-white">
                  {p.title}
                </h3>
                <p className="text-sm text-slate-400 mt-1">{p.desc}</p>
              </GlassCard>
              {i < PIPELINE.length - 1 && (
                <ArrowRight className="hidden md:block absolute top-1/2 -right-3 h-6 w-6 text-cyan-400/60 -translate-y-1/2 z-10" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-10">
        <SectionTitle eyebrow="Capabilities" title="Everything a smart traffic system needs" />
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <GlassCard key={f.title} delay={(i % 4) * 0.06} className="p-5 h-full">
              <span
                className="grid place-items-center h-10 w-10 rounded-lg"
                style={{ background: f.color + "22", color: f.color }}
              >
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-slate-400 mt-1">{f.desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ML MODELS */}
      <section className="py-14">
        <SectionTitle eyebrow="Machine Learning" title="Predictive analytics under the hood" />
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {MODELS.map((m, i) => (
            <GlassCard key={m.name} delay={i * 0.1} className="p-5">
              <span
                className="grid place-items-center h-10 w-10 rounded-lg"
                style={{ background: m.color + "22", color: m.color }}
              >
                <m.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 font-display font-semibold text-white">{m.name}</h3>
              <p className="text-sm text-slate-400 mt-1">{m.use}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* TECH */}
      <section className="py-8">
        <GlassCard className="p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-4">
            Technology Stack
          </p>
          <div className="flex flex-wrap gap-2">
            {TECH.map((t) => (
              <span
                key={t}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200"
              >
                {t}
              </span>
            ))}
          </div>
        </GlassCard>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <GlassCard className="p-10 max-w-2xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Ready to analyze traffic?
          </h2>
          <p className="text-slate-400 mt-3">
            Upload a road video and watch the AI detect, track and count every
            vehicle in real time.
          </p>
          <Link
            to="/upload"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-6 py-3 font-semibold text-white glow-cyan hover:opacity-95 transition"
          >
            <Upload className="h-5 w-5" /> Get Started
          </Link>
        </GlassCard>
      </section>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <p className="text-xs uppercase tracking-[0.25em] text-cyan-400">{eyebrow}</p>
      <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-white">
        {title}
      </h2>
    </motion.div>
  );
}
