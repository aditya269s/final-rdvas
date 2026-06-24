import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Analytics } from "../lib/types";

interface AppState {
  videoUrl: string | null;
  videoName: string;
  setVideo: (url: string, name: string) => void;
  clearVideo: () => void;
  analytics: Analytics | null;
  setAnalytics: (a: Analytics | null) => void;
  hasResult: boolean;
}

const Ctx = createContext<AppState | null>(null);
const LS_KEY = "smartroad.analytics.v1";

export function AppProvider({ children }: { children: ReactNode }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>("");
  const [analytics, setAnalyticsState] = useState<Analytics | null>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? (JSON.parse(raw) as Analytics) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (analytics) localStorage.setItem(LS_KEY, JSON.stringify(analytics));
      else localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore quota / privacy errors */
    }
  }, [analytics]);

  const setVideo = (url: string, name: string) => {
    setVideoUrl((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return url;
    });
    setVideoName(name);
  };

  const clearVideo = () => {
    setVideoUrl((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    setVideoName("");
  };

  return (
    <Ctx.Provider
      value={{
        videoUrl,
        videoName,
        setVideo,
        clearVideo,
        analytics,
        setAnalytics: setAnalyticsState,
        hasResult: !!analytics,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}
