"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send, Bot, User, Cpu, MemoryStick, Loader2, Code2, Terminal, Zap } from "lucide-react";
import ToolCallIndicator from "@/components/ToolCallIndicator";
import CognitiveStateBadge from "@/components/CognitiveStateBadge";

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{
    tool: string;
    args: Record<string, unknown>;
    ok: boolean;
    output: string;
  }>;
  agent?: string;
}

export default function DashboardPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cognitiveState, setCognitiveState] = useState<"idle" | "focus" | "reasoning" | "automating" | "learning">("idle");
  const [provider, setProvider] = useState<string>("");
  const [agents, setAgents] = useState<{
    hermes: { available: boolean; name: string };
    claudeCode: { available: boolean; version?: string; authenticated: boolean };
    opencode: { available: boolean; version?: string };
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Check auth
  useEffect(() => {
    const token = localStorage.getItem("rox_token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  // Fetch available agents
  useEffect(() => {
    fetch("/api/agents")
      .then((res) => res.json())
      .then(setAgents)
      .catch(console.error);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (task?: string) => {
    const message = task || input.trim();
    if (!message || loading) return;

    const userMessage = message;
    if (!task) setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const token = localStorage.getItem("rox_token");
      if (!token) {
        router.push("/login");
        return;
      }

      // Try agent execution first
      const agentRes = await fetch("/api/agents/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          task: userMessage,
          maxTurns: 15,
        }),
      });

      if (!agentRes.ok) {
        throw new Error("Agent execution failed");
      }

      // Read SSE stream
      const reader = agentRes.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let lastAgent = "hermes";
      let toolCalls: Message["toolCalls"] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith("event: ")) {
              const eventType = lines[i].slice(7).trim();
              const dataLine = lines[i + 1];
              if (dataLine?.startsWith("data: ")) {
                try {
                  const data = JSON.parse(dataLine.slice(6));
                  
                  if (eventType === "agents") {
                    setAgents(data);
                  } else if (eventType === "result") {
                    lastAgent = data.agent || "hermes";
                    assistantMessage += data.output || "";
                    if (data.metadata) {
                      // Extract tool calls from metadata
                    }
                  } else if (eventType === "done") {
                    // Stream complete
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantMessage || "Task completed",
          toolCalls,
          agent: lastAgent,
        },
      ]);

      setCognitiveState("idle");
      setProvider(lastAgent);
    } catch (error) {
      // Fallback to regular assistant API
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("rox_token")}`,
          },
          body: JSON.stringify({
            message: userMessage,
            history: messages.map((m) => ({
              role: m.role === "user" ? "user" : "rox",
              content: m.content,
            })),
            stream: false,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to get response");
        }

        const data = await res.json();

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply,
            toolCalls: data.toolCalls,
          },
        ]);

        setCognitiveState(data.cognitiveState || "idle");
        setProvider(data.provider || "");
      } catch (fallbackError) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-rox-bg flex">
      {/* Sidebar */}
      <div className="w-64 bg-rox-surface border-r border-rox-border flex flex-col">
        <div className="p-4 border-b border-rox-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rox-amber/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-rox-amber" />
            </div>
            <span className="font-light text-rox-bright tracking-wider">ROX</span>
          </div>
        </div>

        <div className="flex-1 p-4">
          <div className="text-xs text-rox-gray uppercase tracking-wider mb-3">Agents</div>
          <div className="space-y-2">
            {agents && (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <Zap size={14} className={agents.hermes.available ? "text-green-400" : "text-rox-gray"} />
                  <span className="text-rox-bright">Hermes</span>
                  {agents.hermes.available && <span className="text-xs text-green-400 ml-auto">●</span>}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Code2 size={14} className={agents.claudeCode.available ? "text-blue-400" : "text-rox-gray"} />
                  <span className="text-rox-bright">Claude Code</span>
                  {agents.claudeCode.available && <span className="text-xs text-blue-400 ml-auto">●</span>}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Terminal size={14} className={agents.opencode.available ? "text-purple-400" : "text-rox-gray"} />
                  <span className="text-rox-bright">OpenCode</span>
                  {agents.opencode.available && <span className="text-xs text-purple-400 ml-auto">●</span>}
                </div>
              </>
            )}
          </div>

          <div className="mt-6 text-xs text-rox-gray uppercase tracking-wider mb-3">History</div>
          <div className="space-y-2">
            {messages.slice(-10).map((msg, i) => (
              <div key={i} className="text-sm text-rox-text truncate">
                {msg.content.slice(0, 40)}...
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-rox-border">
          <div className="flex items-center gap-2 text-sm text-rox-gray">
            <MemoryStick className="w-4 h-4" />
            <span>v3.1</span>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 bg-rox-surface border-b border-rox-border flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <CognitiveStateBadge state={cognitiveState} />
            {provider && (
              <span className="text-xs text-rox-gray flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                {provider}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/settings")} className="text-rox-gray hover:text-rox-bright transition-colors">
              Settings
            </button>
            <button onClick={() => router.push("/devices")} className="text-rox-gray hover:text-rox-bright transition-colors">
              Devices
            </button>
            <button onClick={() => { localStorage.removeItem("rox_token"); router.push("/login"); }} className="text-rox-gray hover:text-rox-red transition-colors">
              Logout
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center mt-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rox-amber/10 mb-4">
                <Bot className="w-8 h-8 text-rox-amber" />
              </div>
              <h2 className="text-xl text-rox-bright mb-2">Welcome to Rox</h2>
              <p className="text-rox-gray">How can I help you today?</p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {[
                  "Search the web",
                  "Write code",
                  "Summarize a document",
                  "Check weather",
                  "Review PR #42",
                  "Debug an issue",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    className="px-4 py-2 rounded-full bg-rox-surface border border-rox-border text-rox-gray hover:border-rox-amber/50 hover:text-rox-bright transition-all text-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-rox-amber/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-rox-amber" />
                </div>
              )}
              <div
                className={`max-w-2xl px-4 py-3 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-rox-amber text-rox-bg"
                    : "bg-rox-surface border border-rox-border text-rox-bright"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {msg.agent && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rox-bright/10 text-rox-bright">
                      {msg.agent}
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.toolCalls.map((tool, j) => (
                      <ToolCallIndicator key={j} tool={tool} />
                    ))}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-rox-border flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-rox-gray" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-rox-amber/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-rox-amber" />
              </div>
              <div className="bg-rox-surface border border-rox-border px-4 py-3 rounded-2xl">
                <div className="flex items-center gap-2 text-rox-gray">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Rox is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-rox-surface border-t border-rox-border">
          <div className="max-w-4xl mx-auto flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Rox... (try: 'Write a React component', 'Debug this error', 'Review PR #42')"
              rows={2}
              className="flex-1 px-4 py-3 rounded-xl bg-rox-bg border border-rox-border text-rox-bright resize-none focus:outline-none focus:border-rox-amber/50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="px-4 py-3 rounded-xl bg-rox-amber text-rox-bg font-medium hover:bg-rox-gold transition-colors disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
