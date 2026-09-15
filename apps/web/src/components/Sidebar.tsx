import { useState } from "react";
import { motion } from "framer-motion";
import {
  Home,
  Brain,
  FolderGit2,
  FileText,
  Wrench,
  Settings,
} from "lucide-react";
import { useRoxStore } from "@rox/ui/store";

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home, desc: "Overview & Quick Actions" },
  {
    id: "brain",
    label: "Brain",
    icon: Brain,
    desc: "Deep Research & Insights",
  },
  {
    id: "projects",
    label: "Projects",
    icon: FolderGit2,
    desc: "Your Workspaces",
  },
  { id: "files", label: "Files", icon: FileText, desc: "Docs & Knowledge" },
  { id: "tools", label: "Tools", icon: Wrench, desc: "Apps & Integrations" },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    desc: "Customize Experience",
  },
];

export default function Sidebar() {
  const activeNav = useRoxStore((s) => s.activeNav);
  const setActiveNav = useRoxStore((s) => s.setActiveNav);

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="w-16 flex flex-col items-center py-4 gap-2"
    >
      {NAV_ITEMS.map((item) => {
        const active = activeNav === item.id;
        const Icon = item.icon;
        return (
          <motion.button
            key={item.id}
            onClick={() => setActiveNav(item.id)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
              active
                ? "bg-rox-amber/20 border border-rox-amber/50 shadow-[0_0_20px_rgba(255,138,0,0.2)]"
                : "text-rox-dim hover:text-rox-gray hover:bg-white/5"
            }`}
            aria-label={item.label}
            title={item.label}
          >
            <Icon size={18} />
            {active && (
              <motion.div
                layoutId="nav-active"
                className="absolute -right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-rox-amber rounded-l"
              />
            )}
          </motion.button>
        );
      })}

      <div className="flex-1" />

      {/* Footer */}
      <div className="text-center px-2 mt-auto">
        <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-rox-amber/10 flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-rox-amber animate-pulse" />
        </div>
        <p className="text-[8px] text-rox-dim leading-tight tracking-wide">
          Small steps.
          <br />
          drive big dreams.
        </p>
        {/* Mini waveform */}
        <div className="flex items-end justify-center gap-0.5 h-4 mt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              className="w-0.5 bg-rox-amber/40 rounded-full"
              animate={{ height: [4, 12, 6, 14, 8] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.1,
                ease: "easeInOut",
              }}
              style={{ height: 4 }}
            />
          ))}
        </div>
      </div>
    </motion.aside>
  );
}
