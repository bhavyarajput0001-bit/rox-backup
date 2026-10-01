import { MODULES } from "@rox/ui/modules";
import { useRoxStore } from "@rox/ui/store";
import { motion } from "framer-motion";
import {
  PenTool,
  Palette,
  Code2,
  Search,
  Layout,
  Video,
  BarChart3,
  Settings2,
} from "lucide-react";

const ICON_MAP: Record<string, typeof PenTool> = {
  writing: PenTool,
  design: Palette,
  coding: Code2,
  research: Search,
  productivity: Layout,
  media: Video,
  analysis: BarChart3,
  custom: Settings2,
};

export default function ModuleDock() {
  const activeModule = useRoxStore((s) => s.activeModule);
  const setActiveModule = useRoxStore((s) => s.setActiveModule);
  const setCoreState = useRoxStore((s) => s.setCoreState);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.7 }}
      className="glass-panel mx-4 mb-4 rounded-[var(--radius-lg)] px-4 py-3"
    >
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <span className="text-rox-dim text-xs tracking-wider mr-2 flex-shrink-0">
          MODULES
        </span>

        {MODULES.map((mod) => {
          const isActive = activeModule === mod.id;
          const Icon = ICON_MAP[mod.icon] || Settings2;

          return (
            <motion.button
              key={mod.id}
              onClick={() => {
                setActiveModule(isActive ? null : mod.id);
                setCoreState(isActive ? "idle" : "thinking");
                setTimeout(() => setCoreState("idle"), 1500);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-pill)] text-sm transition-all flex-shrink-0 ${
                isActive
                  ? "bg-rox-amber/20 border border-rox-amber/50 text-rox-text shadow-[0_0_20px_rgba(255,138,0,0.2)]"
                  : "bg-white/5 border border-transparent text-rox-gray hover:border-rox-amber/20 hover:text-rox-text"
              }`}
            >
              <Icon size={14} className={isActive ? "text-rox-amber" : ""} />
              <span>{mod.name}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
