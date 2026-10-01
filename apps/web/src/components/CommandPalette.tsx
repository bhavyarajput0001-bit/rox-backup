import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Zap, FileText, Code2, Lightbulb } from "lucide-react";
import { useRoxStore } from "@rox/ui/store";

const COMMAND_SUGGESTIONS = [
  { label: "Research the latest AI news", icon: Search, module: "research" },
  { label: "Write a blog post about...", icon: FileText, module: "writing" },
  { label: "Debug my code", icon: Code2, module: "coding" },
  { label: "Generate ideas for...", icon: Lightbulb, module: "ideas" },
  { label: "Create a presentation", icon: FileText, module: "design" },
  { label: "Analyze this data", icon: Search, module: "analysis" },
  { label: "Summarize this document", icon: FileText, module: "writing" },
  { label: "Build a web app", icon: Code2, module: "coding" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const setCoreState = useRoxStore((s) => s.setCoreState);
  const setActiveModule = useRoxStore((s) => s.setActiveModule);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("rox:open-palette", handler);
    return () => window.removeEventListener("rox:open-palette", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  const filtered = COMMAND_SUGGESTIONS.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = (cmd: (typeof COMMAND_SUGGESTIONS)[0]) => {
    setOpen(false);
    setCoreState("thinking");
    if (cmd.module) setActiveModule(cmd.module as any);
    setTimeout(() => setCoreState("idle"), 2000);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass-panel-strong rounded-[var(--radius-lg)] overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-rox-amber/10">
                <Search size={18} className="text-rox-amber flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type a command..."
                  className="flex-1 bg-transparent text-rox-text text-sm placeholder-rox-dim focus:outline-none"
                />
                <button
                  onClick={() => setOpen(false)}
                  className="text-rox-dim hover:text-rox-gray text-xs px-2 py-1 rounded bg-white/5"
                >
                  ESC
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <p className="text-rox-dim text-sm text-center py-8">
                    No results found
                  </p>
                ) : (
                  filtered.map((cmd, i) => {
                    const Icon = cmd.icon;
                    return (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => handleSelect(cmd)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-white/5 transition-colors text-sm text-rox-text"
                      >
                        <Icon size={16} className="text-rox-amber" />
                        <span>{cmd.label}</span>
                        <span className="ml-auto text-rox-dim text-xs">
                          {cmd.module}
                        </span>
                      </motion.button>
                    );
                  })
                )}
              </div>

              <div className="px-5 py-3 border-t border-rox-amber/10 flex items-center gap-4 text-[11px] text-rox-dim">
                <span className="flex items-center gap-1">
                  <Zap size={10} />{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-white/5">Enter</kbd>{" "}
                  to select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/5">Esc</kbd> to
                  close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
