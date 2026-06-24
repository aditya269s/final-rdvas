import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";

export function GlassCard({
  children,
  className = "",
  delay = 0,
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay }}
      className={`glass rounded-2xl ${hover ? "transition-all duration-300 hover:border-white/20" : ""} ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function CountUp({
  value,
  duration = 900,
  decimals = 0,
  suffix = "",
}: {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return (
    <>
      {display.toFixed(decimals)}
      {suffix}
    </>
  );
}

type IconType = React.ComponentType<{ className?: string }>;

export function StatCard({
  icon: Icon,
  label,
  value,
  decimals = 0,
  suffix = "",
  sub,
  accent = "#38e0ff",
  delay = 0,
}: {
  icon: IconType;
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  sub?: string;
  accent?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="glass rounded-2xl p-4 relative overflow-hidden group"
    >
      <div
        className="absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition"
        style={{ background: accent }}
      />
      <span
        className="grid place-items-center h-9 w-9 rounded-lg"
        style={{ background: accent + "22", color: accent }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="mt-3 text-2xl font-display font-bold text-white tabular-nums">
        <CountUp value={value} decimals={decimals} suffix={suffix} />
      </div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-1">{sub}</div>}
    </motion.div>
  );
}

export function Gauge({
  value,
  size = 128,
  label,
  color = "#38e0ff",
}: {
  value: number;
  size?: number;
  label?: string;
  color?: string;
}) {
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (pct / 100) * c }}
          transition={{ duration: 1 }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-display font-bold text-white tabular-nums">
          {Math.round(value)}
          <span className="text-xs">%</span>
        </div>
        {label && (
          <div className="text-[10px] uppercase tracking-wider text-slate-400">
            {label}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  color = "#38e0ff",
  className = "",
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={`h-1.5 w-full rounded-full bg-white/10 overflow-hidden ${className}`}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

export function LevelPill({ level }: { level: "Low" | "Medium" | "High" }) {
  const map = {
    Low: { c: "#34d399", bg: "bg-emerald-400/10 border-emerald-400/30 text-emerald-300" },
    Medium: { c: "#fbbf24", bg: "bg-amber-400/10 border-amber-400/30 text-amber-300" },
    High: { c: "#fb7185", bg: "bg-rose-400/10 border-rose-400/30 text-rose-300" },
  }[level];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${map.bg}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: map.c }} />
      {level} Traffic
    </span>
  );
}
