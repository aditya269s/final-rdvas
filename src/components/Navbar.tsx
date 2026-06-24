import { Link, NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Radar, Activity } from "lucide-react";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/upload", label: "Upload" },
  { to: "/live", label: "Live Detection" },
  { to: "/analytics", label: "Analytics" },
];

export default function Navbar() {
  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 inset-x-0 z-50"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-3">
        <div className="glass-2 rounded-2xl px-4 py-2.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid place-items-center h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 glow-cyan">
              <Radar className="h-5 w-5 text-white" />
            </span>
            <span className="leading-none">
              <span className="block font-display font-bold text-white tracking-tight">
                SmartRoad<span className="text-cyan-400"> AI</span>
              </span>
              <span className="block text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Vehicle Analytics
              </span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `relative px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                    isActive ? "text-white" : "text-slate-300 hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="navpill"
                        className="absolute inset-0 rounded-lg bg-white/10 border border-white/10"
                      />
                    )}
                    <span className="relative">{l.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/30 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
              Engine Online
            </span>
            <Link
              to="/upload"
              className="rounded-lg bg-gradient-to-r from-cyan-400 to-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90 transition flex items-center gap-1.5"
            >
              <Activity className="h-4 w-4" /> Analyze
            </Link>
          </div>
        </div>

        <nav className="md:hidden mt-2 flex items-center justify-center gap-1 glass rounded-xl px-2 py-1.5">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
                  isActive ? "text-cyan-300 bg-white/5" : "text-slate-300"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </motion.header>
  );
}
