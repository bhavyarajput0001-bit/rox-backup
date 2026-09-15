// ChatMessage component for Rox dashboard

import type { ReactNode } from "react";

export interface ToolCall {
  tool: string;
  args?: Record<string, unknown>;
  ok: boolean;
  output?: string;
}

export interface ChatMessageData {
  id: number;
  role: "user" | "rox";
  text: string;
  toolCalls?: ToolCall[];
  timestamp?: string;
}

interface Props {
  message: ChatMessageData;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`chat-msg ${isUser ? "chat-msg--user" : "chat-msg--rox"}`}>
      <div className="chat-msg-header">
        <span className="chat-msg-role">{isUser ? "YOU" : "ROX"}</span>
        {message.timestamp && (
          <span className="chat-msg-time">{message.timestamp}</span>
        )}
      </div>
      <div className="chat-msg-body">
        <p>{message.text}</p>
      </div>
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="chat-msg-tools">
          {message.toolCalls.map((tc, i) => (
            <div
              key={i}
              className={`tool-call-chip ${tc.ok ? "tool-call-chip--ok" : "tool-call-chip--err"}`}
            >
              <span className="tool-call-chip-icon">
                {tc.ok ? "✓" : "✗"}
              </span>
              <span className="tool-call-chip-name">{tc.tool}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
