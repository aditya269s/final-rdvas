import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  Car,
  Truck,
  Bus,
  Gauge as GaugeIcon,
  ShieldAlert,
  Download,
  Brain,
  TrendingUp,
  Layers,
  Database,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Clock,
  Zap,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { VEHICLE_META, VEHICLE_ORDER } from "../lib/types";
import { kmeans, predictTraffic } from "../lib/analytics";
import { BarChart, DonutChart, LineChart, type Slice } from "../components/charts";
import { GlassCard, LevelPill, StatCard } from "../components/ui";

export default function Analytics() {
  const { analytics: a, hasResult } = useApp();

  const slices: Slice[] = useMemo(() => {
    if (!a) return [];
    return VEHICLE_ORDER.map((cls) => ({
      label: VEHICLE_META[cls].label,
      value: a.counts[cls],
      color: VEHICLE_META[cls].color,
    })).filter((s) => s.value > 0);
  }, [a]);

  const clusters = useMemo(() => {
    if (!a || a.samples.length === 0) return [];
    return kmeans(
      a.samples.map((s) => ({ x: s.x * 100, y: s.y * 100 })),
      3
    );
  }, [a]);

  if (!hasResult || !a) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <div className="mx-auto grid place-items-center h-16 w-16 rounded-2xl bg-white/5 border border-white/10">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold text-white">
          No analytics yet
        </h1>
        <p className="text-slate-400 mt-2">
          Process a traffic video to generate detection statistics, charts and
          ML predictions.
        </p>
        <Link
          to="/upload"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 font-semibold text-white glow-cyan"
        >
          Upload a Video <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const downloadReport = () => {
    const rows = [
      ["SmartRoad AI - Analytics Report"],
      ["Video", a.videoName],
      ["Generated", new Date(a.createdAt).toLocaleString()],
      [],
      ["Metric", "Value"],
      ["Total Vehicles", a.totalVehicles],
      ["Cars", a.counts.car],
      ["Buses", a.counts.bus],
      ["Trucks", a.counts.truck],
      ["Motorcycles", a.counts.motorcycle],
      ["Bikes", a.counts.bike],
      ["Other", a.counts.other],
      ["Frames Processed", a.frameCount],
      ["Frames With Vehicles", a.framesWithVehicles],
      ["Peak Concurrent", a.maxConcurrent],
      ["Avg Density (%)", a.avgDensityPct],
      ["Traffic Level", a.trafficLevel],
      ["Avg Speed (rel.)", a.avgSpeed.toFixed(2)],
      ["Accident Risk (%)", a.accidentRisk],
      ["Congestion Index", a.congestionIndex],
      ["Avg Confidence", (a.confidenceAvg * 100).toFixed(1) + "%"],
      ["Processing FPS", a.processingFps],
      ["Duration (s)", Math.round(a.durationSec)],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = `smartroad-report-${a.createdAt}.csv`;
    el.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-400">Step 3</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">
            Analytics Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-2 flex-wrap">
            <span className="max-w-[240px] truncate">{a.videoName}</span>
            <span className="text-slate-600">•</span>
            <LevelPill level={a.trafficLevel} />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadReport}
            className="inline-flex items-center gap-2 rounded-xl glass px-4 py-2.5 text-sm font-semibold text-white hover:border-white/20"
          >
            <Download className="h-4 w-4 text-cyan-300" /> Export Report
          </button>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white glow-cyan"
          >
            <RefreshCw className="h-4 w-4" /> New Video
          </Link>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2 mb-6 text-xs">
        <Chip icon={Database} label={`${a.frameCount} frames`} />
        <Chip icon={Clock} label={`${Math.round(a.durationSec)}s`} />
        <Chip icon={Zap} label={`${a.processingFps} FPS`} />
        <Chip icon={Activity} label={`${(a.confidenceAvg * 100).toFixed(0)}% avg conf`} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Activity} label="Total Vehicles" value={a.totalVehicles} accent="#38e0ff" />
        <StatCard icon={Car} label="Cars" value={a.counts.car} accent="#38e0ff" />
        <StatCard icon={Truck} label="Trucks" value={a.counts.truck} accent="#fbbf24" />
        <StatCard icon={Bus} label="Buses" value={a.counts.bus} accent="#60a5fa" />
        <StatCard icon={GaugeIcon} label="Traffic Density" value={a.avgDensityPct} suffix="%" accent="#34d399" />
        <StatCard icon={ShieldAlert} label="Accident Risk" value={a.accidentRisk} suffix="%" accent="#fb7185" />
        <StatCard icon={Layers} label="Congestion Index" value={a.congestionIndex} accent="#f472b6" />
        <StatCard icon={TrendingUp} label="Peak Concurrent" value={a.maxConcurrent} accent="#a78bfa" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <GlassCard className="p-5">
          <h3 className="font-semibold text-white mb-4">Vehicle Distribution</h3>
          {slices.length ? <DonutChart data={slices} /> : <Empty />}
        </GlassCard>
        <GlassCard className="p-5">
          <h3 className="font-semibold text-white mb-4">Class Breakdown</h3>
          {slices.length ? <BarChart data={slices} /> : <Empty />}
        </GlassCard>
      </div>

      <GlassCard className="p-5 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Traffic Flow Over Time</h3>
          <span className="text-xs text-slate-400">concurrent vehicles / sample</span>
        </div>
        <LineChart data={a.flow} />
      </GlassCard>

      {/* ML: prediction + clustering */}
      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <PredictionPanel
          defaults={{
            vehicleCount: Math.min(60, Math.max(a.totalVehicles, 8)),
            densityPct: a.densityPct || a.avgDensityPct,
            avgSpeed: Math.round(a.avgSpeed) || 12,
            hour: new Date().getHours(),
            isWeekend: [0, 6].includes(new Date().getDay()),
          }}
        />
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="h-4 w-4 text-emerald-300" />
            <h3 className="font-semibold text-white">K-Means Traffic Hotspots</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Spatial clustering of {a.samples.length} vehicle centroids into dense zones.
          </p>
          {clusters.length ? (
            <div className="flex gap-4 flex-col sm:flex-row">
              <div className="relative w-full sm:w-48 h-40 rounded-xl bg-black/40 border border-white/10 overflow-hidden grid-overlay">
                {clusters.map((c, i) => {
                  const colors = ["#38e0ff", "#a78bfa", "#34d399"];
                  const size = Math.min(40, 14 + c.count * 1.4);
                  return (
                    <div
                      key={i}
                      className="absolute rounded-full -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-[10px] font-bold text-black"
                      style={{
                        left: `${c.cx}%`,
                        top: `${c.cy}%`,
                        width: size,
                        height: size,
                        background: colors[i % 3],
                        boxShadow: `0 0 16px ${colors[i % 3]}aa`,
                      }}
                    >
                      {c.count}
                    </div>
                  );
                })}
              </div>
              <ul className="flex-1 space-y-2 text-sm">
                {clusters.map((c, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: ["#38e0ff", "#a78bfa", "#34d399"][i % 3] }}
                    />
                    <span className="text-slate-300">Zone {i + 1}</span>
                    <span className="ml-auto text-white font-semibold">{c.count} pts</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <Empty />
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function PredictionPanel({
  defaults,
}: {
  defaults: {
    vehicleCount: number;
    densityPct: number;
    avgSpeed: number;
    hour: number;
    isWeekend: boolean;
  };
}) {
  const [count, setCount] = useState(defaults.vehicleCount);
  const [density, setDensity] = useState(defaults.densityPct);
  const [speed, setSpeed] = useState(defaults.avgSpeed);
  const [hour, setHour] = useState(defaults.hour);
  const [weekend, setWeekend] = useState(defaults.isWeekend);

  const result = useMemo(
    () =>
      predictTraffic({
        vehicleCount: count,
        densityPct: density,
        avgSpeed: speed,
        hour,
        isWeekend: weekend,
      }),
    [count, density, speed, hour, weekend]
  );

  const condColor: Record<string, string> = {
    "Free Flow": "#34d399",
    Moderate: "#38e0ff",
    Congested: "#fbbf24",
    Heavy: "#fb7185",
  };

  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <Brain className="h-4 w-4 text-cyan-300" />
        <h3 className="font-semibold text-white">Traffic Prediction (ML Ensemble)</h3>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Random Forest + XGBoost forecast over live + scenario features.
      </p>

      <div className="space-y-3">
        <Slider label="Vehicle Count" value={count} min={0} max={60} onChange={setCount} />
        <Slider label="Density" value={density} min={0} max={100} onChange={setDensity} suffix="%" />
        <Slider label="Avg Speed" value={speed} min={0} max={40} onChange={setSpeed} />
        <Slider label="Hour" value={hour} min={0} max={23} onChange={setHour} suffix=":00" />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={weekend}
            onChange={(e) => setWeekend(e.target.checked)}
            className="accent-cyan-400 h-4 w-4"
          />
          Weekend schedule
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Predicted Condition</span>
          <span
            className="text-sm font-bold px-2.5 py-1 rounded-full"
            style={{ background: condColor[result.condition] + "22", color: condColor[result.condition] }}
          >
            {result.condition}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <Metric label="Confidence" value={`${Math.round(result.probability * 100)}%`} />
          <Metric label="ETA +min" value={`+${result.etaMinutes}`} />
          <Metric label="Risk Fcst" value={`${result.accidentRiskForecast}%`} />
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Congestion Forecast</span>
            <span>{result.congestionForecast}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
              animate={{ width: `${result.congestionForecast}%` }}
            />
          </div>
        </div>
        <ul className="mt-3 space-y-1 text-[11px] text-slate-400">
          {result.rationale.map((r, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="text-cyan-400">›</span>
              {r}
            </li>
          ))}
        </ul>
      </div>
    </GlassCard>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
  suffix = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-semibold tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-cyan-400"
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 p-2">
      <div className="text-sm font-bold text-white">{value}</div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  );
}

function Chip({ icon: Icon, label }: { icon: typeof Car; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full glass px-2.5 py-1 text-slate-300">
      <Icon className="h-3.5 w-3.5 text-cyan-300" />
      {label}
    </span>
  );
}

function Empty() {
  return (
    <div className="h-32 grid place-items-center text-sm text-slate-500">
      <span className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" /> No data available
      </span>
    </div>
  );
}


