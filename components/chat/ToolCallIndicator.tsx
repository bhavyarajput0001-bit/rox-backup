// ToolCallIndicator component - shows which tools are being used in real-time

import { useState, useEffect } from "react";

export interface ToolCallItem {
  id: string;
  tool: string;
  status: "running" | "completed" | "error";
  timestamp: number;
}

interface Props {
  tools: ToolCallItem[];
  compact?: boolean;
}

const TOOL_ICONS: Record<string, string> = {
  search: "🔍",
  code: "💻",
  shell: "⚡",
  browser: "🌐",
  memory: "🧠",
  files: "📁",
  calculator: "🔢",
  email: "✉️",
  calendar: "📅",
  default: "⚙️",
};

export default function ToolCallIndicator({ tools, compact = false }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (tools.length === 0) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [tools.length]);

  if (compact && tools.length === 0) return null;
  if (!compact && tools.length === 0) return null;

  return (
    <div className="tool-indicator">
      <div className="tool-indicator__header">
        <span className="tool-indicator__title">ACTIVE TOOLS</span>
        {tools.length > 0 && (
          <span className="tool-indicator__count">{tools.length}</span>
        )}
      </div>
      {compact && tools.length > 0 ? (
        <div className="tool-indicator__compact">
          {tools.map((t) => (
            <span
              key={t.id}
              className={`tool-chip tool-chip--${t.status} ${t.status === "running" ? "tool-chip--pulse" : ""}`}
              title={`${t.tool} (${Math.round((Date.now() - t.timestamp) / 1000)}s)`}
            >
              {TOOL_ICONS[t.tool?.toLowerCase()] ?? TOOL_ICONS.default}
              {t.tool}
            </span>
          ))}
        </div>
      ) : (
        <div className="tool-indicator__list">
          {tools.map((t) => (
            <div
              key={t.id}
              className={`tool-row tool-row--${t.status}`}
            >
              <span className="tool-row__icon">
                {TOOL_ICONS[t.tool?.toLowerCase()] ?? TOOL_ICONS.default}
              </span>
              <span className="tool-row__name">{t.tool}</span>
              <span className={`tool-row__status tool-row__status--${t.status}`}>
                {t.status === "running"
                  ? `${Math.round((Date.now() - t.timestamp) / 1000)}s`
                  : t.status === "completed"
                    ? "done"
                    : "fail"}
              </span>
              {t.status === "running" && (
                <span className="tool-row__spinner" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
