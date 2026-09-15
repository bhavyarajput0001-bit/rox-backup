import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Bell, User, Settings, Moon, Volume2 } from "lucide-react";
import { useRoxStore } from "@rox/ui/store";

export default function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const settings = useRoxStore((s) => s.settings);
  const updateSettings = useRoxStore((s) => s.updateSettings);

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-panel mx-4 mt-4 rounded-[var(--radius-lg)] px-6 py-3 flex items-center justify-between"
    >
      {/* Left: Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-rox-amber/20 flex items-center justify-center border border-rox-amber/40">
          <span className="text-rox-amber text-sm font-bold">R</span>
        </div>
        <div>
          <h1 className="text-lg font-light tracking-[0.2em] text-rox-bright leading-none">
            ROX
          </h1>
          <p className="text-[10px] text-rox-gray tracking-wider">
            YOUR AI ASSISTANT
          </p>
        </div>
        <div className="h-4 w-px bg-rox-dim mx-2" />
        <span className="text-xs text-rox-gray tracking-wide hidden sm:block">
          Think &middot; Create &middot; Execute
        </span>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="p-2 rounded-full hover:bg-white/5 transition-colors text-rox-gray hover:text-rox-text"
          aria-label="Search"
        >
          <Search size={16} />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 rounded-full hover:bg-white/5 transition-colors text-rox-gray hover:text-rox-text relative"
            aria-label="Notifications"
          >
            <Bell size={16} />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rox-amber animate-pulse" />
          </button>
          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute right-0 top-10 glass-panel-strong rounded-[var(--radius-md)] p-4 w-64 z-50"
            >
              <p className="text-xs text-rox-gray mb-2">No new notifications</p>
            </motion.div>
          )}
        </div>

        {/* Mute */}
        <button
          onClick={() =>
            updateSettings({ soundEnabled: !settings.soundEnabled })
          }
          className="p-2 rounded-full hover:bg-white/5 transition-colors text-rox-gray hover:text-rox-text"
          aria-label="Toggle sound"
        >
          <Volume2 size={16} opacity={settings.soundEnabled ? 1 : 0.4} />
        </button>

        {/* Settings */}
        <button
          className="p-2 rounded-full hover:bg-white/5 transition-colors text-rox-gray hover:text-rox-text"
          aria-label="Settings"
        >
          <Settings size={16} />
        </button>

        {/* Profile */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rox-amber/40 to-rox-gold/20 border border-rox-amber/30 flex items-center justify-center ml-1 cursor-pointer hover:border-rox-amber/60 transition-colors">
          <User size={14} className="text-rox-amber" />
        </div>
      </div>
    </motion.div>
  );
}
