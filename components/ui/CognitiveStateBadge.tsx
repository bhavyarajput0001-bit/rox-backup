// CognitiveStateBadge - shows the current cognitive state of the AI

import { useState } from "react";

export type CognitiveState =
  | "idle"
  | "thinking"
  | "processing"
  | "analyzing"
  | "creating"
  | "searching"
  | "executing"
  | "remembering";

interface Props {
  state: CognitiveState;
  size?: "sm" | "md" | "lg";
}

const STATE_CONFIG: Record<
  CognitiveState,
  { label: string; color: string; dotColor: string }
> = {
  idle: { label: "STANDBY", color: "#4a5568", dotColor: "#718096" },
  thinking: { label: "THINKING", color: "#d97706", dotColor: "#fbbf24" },
  processing: { label: "PROCESSING", color: "#7c3aed", dotColor: "#a78bfa" },
  analyzing: { label: "ANALYZING", color: "#0891b2", dotColor: "#22d3ee" },
  creating: { label: "CREATING", color: "#059669", dotColor: "#34d399" },
  searching: { label: "SEARCHING", color: "#dc2626", dotColor: "#f87171" },
  executing: { label: "EXECUTING", color: "#ea580c", dotColor: "#fb923c" },
  remembering: { label: "RECALLING", color: "#4f46e5", dotColor: "#818cf8" },
};

export default function CognitiveStateBadge({
  state = "idle",
  size = "md",
}: Props) {
  const config = STATE_CONFIG[state] ?? STATE_CONFIG.idle;
  const [pulse, setPulse] = useState(false);

  return (
    <div
      className={`cog-badge cog-badge--${state} cog-badge--${size}`}
      title={config.label}
    >
      <span
        className="cog-badge__dot"
        style={{
          background: config.dotColor,
          boxShadow: `0 0 ${size === "lg" ? "12px" : "8px"} ${config.dotColor}`,
          animation: state !== "idle" ? "cog-pulse 1.5s ease-in-out infinite" : "none",
        }}
        onMouseEnter={() => setPulse(true)}
        onMouseLeave={() => setPulse(false)}
      />
      <span
        className="cog-badge__label"
        style={{ color: config.color }}
      >
        {config.label}
      </span>
    </div>
  );
}
