import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, PenLine, Search, Cpu } from "lucide-react";
import { useRoxStore } from "@rox/ui/store";

export default function RightPanel() {
  const [input, setInput] = useState("");
  const addMessage = useRoxStore((s) => s.addMessage);
  const setCoreState = useRoxStore((s) => s.setCoreState);
  const messages = useRoxStore((s) => s.messages);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    addMessage({ role: "user", content: input });
    setCoreState("thinking");
    setInput("");

    // Simulate response
    setTimeout(() => {
      setCoreState("success");
      addMessage({
        role: "assistant",
        content: `I received your request: "${input}". In the full version, this would connect to an AI provider and return a real response.`,
      });
      setTimeout(() => setCoreState("idle"), 1500);
    }, 2000);
  };

  const quickActions = [
    { icon: Sparkles, label: "Summarize", action: "summarize" },
    { icon: PenLine, label: "Create", action: "create" },
    { icon: Search, label: "Analyze", action: "analyze" },
    { icon: Cpu, label: "Generate", action: "generate" },
  ];

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="glass-panel rounded-[var(--radius-lg)] p-5 flex flex-col gap-4"
    >
      <div>
        <h2 className="text-rox-amber text-sm font-medium tracking-wider mb-1">
          ROX
        </h2>
        <p className="text-rox-text text-xs">Good Morning, User</p>
        <p className="text-rox-gray text-xs mt-1">
          Let&apos;s turn your ideas into reality.
        </p>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-[100px] max-h-48">
        {messages.length === 0 && (
          <p className="text-rox-dim text-xs text-center py-4">
            Ask Rox anything...
          </p>
        )}
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-xl text-xs ${
              msg.role === "user"
                ? "bg-rox-amber/10 border border-rox-amber/20 text-rox-text"
                : "bg-white/5 text-rox-gray"
            }`}
          >
            {msg.content}
          </motion.div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Rox anything..."
          className="w-full bg-white/5 border border-rox-amber/20 rounded-[var(--radius-pill)] px-4 py-3 text-sm text-rox-text placeholder-rox-dim focus:outline-none focus:border-rox-amber/50 focus:ring-1 focus:ring-rox-amber/30 transition-all"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-rox-amber/20 border border-rox-amber/40 flex items-center justify-center text-rox-amber hover:bg-rox-amber/30 transition-colors"
          aria-label="Send"
        >
          <Send size={14} />
        </button>
      </form>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2">
        {quickActions.map((action) => (
          <motion.button
            key={action.label}
            whileHover={{ scale: 1.05, borderColor: "rgba(255,150,40,0.4)" }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 border border-transparent hover:border-rox-amber/30 transition-all"
            onClick={() => {
              setInput(
                action.action.charAt(0).toUpperCase() + action.action.slice(1),
              );
            }}
          >
            <action.icon size={14} className="text-rox-amber" />
            <span className="text-[10px] text-rox-gray">{action.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
