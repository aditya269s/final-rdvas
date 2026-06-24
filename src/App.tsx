import { Routes, Route } from "react-router-dom";
import Scene3D from "./components/Scene3D";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Upload from "./pages/Upload";
import LiveDetection from "./pages/LiveDetection";
import Analytics from "./pages/Analytics";

function Footer() {
  return (
    <footer className="relative z-10 mt-24 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <p>
          SmartRoad AI · Computer Vision &amp; Machine Learning Major Project
        </p>
        <p className="flex items-center gap-2">
          <span>YOLOv8 · OpenCV · FastAPI · PostgreSQL · React · Three.js</span>
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="relative min-h-screen text-slate-100">
      <Scene3D />
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1200px 600px at 50% -10%, rgba(56,224,255,0.10), transparent 60%), radial-gradient(900px 500px at 90% 110%, rgba(167,139,250,0.10), transparent 60%)",
        }}
      />
      <Navbar />
      <main className="relative z-10 pt-28 sm:pt-24">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/live" element={<LiveDetection />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
