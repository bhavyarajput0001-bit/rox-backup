type CognitiveState = "idle" | "focus" | "reasoning" | "automating" | "learning";

interface CognitiveStateBadgeProps {
  state: CognitiveState;
}

const stateConfig = {
  idle: { label: "IDLE", color: "text-rox-gray", bg: "bg-rox-gray/10" },
  focus: { label: "FOCUS", color: "text-rox-amber", bg: "bg-rox-amber/10" },
  reasoning: { label: "REASONING", color: "text-rox-gold", bg: "bg-rox-gold/10" },
  automating: { label: "AUTOMATING", color: "text-rox-blue", bg: "bg-rox-blue/10" },
  learning: { label: "LEARNING", color: "text-rox-purple", bg: "bg-rox-purple/10" },
};

export default function CognitiveStateBadge({ state }: CognitiveStateBadgeProps) {
  const config = stateConfig[state] || stateConfig.idle;

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-mono ${config.color} ${config.bg}`}>
      {config.label}
    </span>
  );
}
