import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import TopBar from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import RoxCore from "./components/RoxCore";
import RightPanel from "./components/RightPanel";
import ActivityPanel from "./components/ActivityPanel";
import ModuleDock from "./components/ModuleDock";
import CommandPalette from "./components/CommandPalette";
import { useRoxStore } from "@rox/ui/store";

export default function App() {
  const [booted, setBooted] = useState(false);
  const [showBoot, setShowBoot] = useState(true);
  const focusMode = useRoxStore((s) => s.focusMode);
  const autoRotate = useRoxStore((s) => s.autoRotate);
  const setAutoRotate = useRoxStore((s) => s.setAutoRotate);
  const setFocusMode = useRoxStore((s) => s.setFocusMode);

  // Boot sequence
  useEffect(() => {
    const timer = setTimeout(() => setBooted(true), 2200);
    const bootDone = localStorage.getItem("rox-boot-done");
    if (bootDone) setShowBoot(false);
    return () => clearTimeout(timer);
  }, []);

  const handleSkipBoot = useCallback(() => {
    setShowBoot(false);
    localStorage.setItem("rox-boot-done", "1");
  }, []);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("rox:open-palette"));
      }
      if (e.key === "Escape") {
        setFocusMode(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setFocusMode]);

  if (!booted) {
    return <BootScreen show={showBoot} onSkip={handleSkipBoot} />;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-rox-bg">
      {/* 3D Canvas Background */}
      <div className={`canvas-container ${focusMode ? "scale-110" : ""}`}>
        <RoxCore autoRotate={autoRotate} focusMode={focusMode} />
      </div>

      {/* Ambient glow layers */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(255,138,0,0.06) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 30% 40%, rgba(255,100,0,0.04) 0%, transparent 40%)",
        }}
      />

      {/* Scanline overlay (subtle) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)",
        }}
      />

      {/* Main Layout */}
      <div
        className={`relative z-10 w-full h-full flex flex-col ${focusMode ? "focus-dim" : ""}`}
      >
        <TopBar />

        <div className="flex flex-1 overflow-hidden px-4 pt-2 pb-4 gap-4">
          <Sidebar />

          {/* Center content area (transparent over canvas) */}
          <div className="flex-1 flex flex-col items-center justify-center pointer-events-none">
            <AnimatePresence>
              {!focusMode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-auto text-center mb-8"
                >
                  <h1 className="text-3xl font-light tracking-widest text-rox-bright text-glow mb-2">
                    Hello, User
                  </h1>
                  <p className="text-rox-gray text-sm tracking-wide">
                    What would you like to create, explore or solve today?
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating action capsules */}
            {!focusMode && (
              <div className="pointer-events-auto flex gap-4">
                <FloatingAction
                  icon="lightbulb"
                  label="Ideas"
                  sublabel="Turn thoughts into plans"
                />
                <FloatingAction
                  icon="sparkles"
                  label="Create"
                  sublabel="Write, design, build"
                />
                <FloatingAction
                  icon="search"
                  label="Research"
                  sublabel="Find what matters"
                />
                <FloatingAction
                  icon="zap"
                  label="Execute"
                  sublabel="Make it real"
                />
              </div>
            )}
          </div>

          <div className="w-80 flex flex-col gap-4">
            <RightPanel />
            <ActivityPanel />
          </div>
        </div>

        <ModuleDock />
      </div>

      <CommandPalette />
    </div>
  );
}

function BootScreen({ show, onSkip }: { show: boolean; onSkip: () => void }) {
  if (!show) return null;
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-rox-bg"
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="relative"
      >
        <div
          className="w-4 h-4 rounded-full bg-rox-amber"
          style={{
            boxShadow:
              "0 0 60px 30px rgba(255,138,0,0.6), 0 0 120px 60px rgba(255,138,0,0.2)",
          }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="mt-8 text-center"
      >
        <h1 className="text-2xl font-light tracking-[0.3em] text-rox-amber text-glow mb-2">
          ROX
        </h1>
        <p className="text-rox-gray text-xs tracking-widest uppercase">
          System Initializing
        </p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        onClick={onSkip}
        className="mt-8 text-rox-dim text-xs hover:text-rox-gray transition-colors"
      >
        Skip intro
      </motion.button>

      {/* Particle ring animation */}
      <motion.div
        initial={{ opacity: 0, rotate: 0 }}
        animate={{ opacity: [0, 0.5, 0], rotate: 360 }}
        transition={{ duration: 2, delay: 0.5, repeat: Infinity }}
        className="absolute w-32 h-32 rounded-full border border-rox-amber/20"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
      />
      <motion.div
        initial={{ opacity: 0, rotate: 0 }}
        animate={{ opacity: [0, 0.3, 0], rotate: -360 }}
        transition={{ duration: 3, delay: 0.8, repeat: Infinity }}
        className="absolute w-48 h-48 rounded-full border border-rox-gold/10"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
      />
    </motion.div>
  );
}

function FloatingAction({
  icon,
  label,
  sublabel,
}: {
  icon: string;
  label: string;
  sublabel: string;
}) {
  const icons: Record<string, React.ReactNode> = {
    lightbulb: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
      </svg>
    ),
    sparkles: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        <path d="M5 3v4" />
        <path d="M19 17v4" />
        <path d="M3 5h4" />
        <path d="M17 19h4" />
      </svg>
    ),
    search: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
    zap: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05, borderColor: "rgba(255,150,40,0.5)" }}
      whileTap={{ scale: 0.95 }}
      className="glass-panel rounded-[var(--radius-pill)] px-5 py-3 flex items-center gap-3 cursor-pointer group"
    >
      <span className="text-rox-amber group-hover:text-rox-gold transition-colors">
        {icons[icon]}
      </span>
      <div className="text-left">
        <div className="text-sm font-medium text-rox-text">{label}</div>
        <div className="text-xs text-rox-gray">{sublabel}</div>
      </div>
    </motion.button>
  );
}
