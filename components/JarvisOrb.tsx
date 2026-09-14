"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createOrbScene, type OrbPalette, type OrbSceneApi } from "@/lib/orbScene";
import type { AssistantAction, AssistantResult } from "@/lib/assistant";
import { HandTracker, type TrackerStatus } from "@/lib/handTracker";

type CameraState = "off" | "starting" | "on" | "error";
type VoiceState = "idle" | "listening" | "speaking" | "unsupported" | "error";
type UiMode = "original" | "cinematic";
type ChatMessage = { id: number; role: "user" | "rox"; text: string; tools?: string[] };
type AgentActivity = { cognitive: string; tools: string; lessons: number; recalled: number };
type AgentToolCallRecord = { tool: string; ok: boolean; output: string };
type AgentResultEnvelope = {
  reply: string;
  toolCalls?: AgentToolCallRecord[];
  recalled?: Array<{ task: string; result: string; runs: number }>;
  learned?: boolean;
  cognitiveState?: string;
  lessonsLearned?: number;
  provider?: string;
  action?: AssistantAction;
};
type SystemSnapshot = { memoryUsedPercent: number; cpuCores: number; loadAverage: number[]; capturedAt: string };
type YouTubeAgentStatus =
  | { state: "checking" }
  | { state: "online"; initialized: boolean; setupRequired: boolean; agents: string[]; uptime: number; dashboardUrl: string; url: string }
  | { state: "offline"; error?: string; url: string }
  | { state: "error"; error: string; url: string };

type SpeechRecognitionEventLike = Event & {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start(): void;
  stop(): void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const MODE_LABEL: Record<TrackerStatus["mode"], string> = {
  idle: "STANDBY",
  spin: "SPIN",
  zoom: "ZOOM",
};

const PALETTE_LABELS: Record<OrbPalette, string> = {
  original: "ORIGINAL",
  lava: "RED LAVA",
};

export default function RoxOrb() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<OrbSceneApi | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const hologramRef = useRef<HTMLDivElement>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioFrameRef = useRef<number | null>(null);
  const voiceStartingRef = useRef(false);
  const voiceCancelRef = useRef(false);

  const [camera, setCamera] = useState<CameraState>("off");
  const [status, setStatus] = useState<TrackerStatus>({ hands: 0, mode: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [palette, setPalette] = useState<OrbPalette>("original");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("Awaiting voice command");
  const [uiMode, setUiMode] = useState<UiMode>("original");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [systemSnapshot, setSystemSnapshot] = useState<SystemSnapshot | null>(null);
  const [chatPosition, setChatPosition] = useState({ x: 0, y: 0 });
  const chatDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [youtubeAgent, setYouTubeAgent] = useState<YouTubeAgentStatus>({ state: "checking" });
  const [youtubePanelOpen, setYouTubePanelOpen] = useState(false);
  const [youtubeCopilot, setYouTubeCopilot] = useState<{ message: string; reply: string } | null>(null);
  const [agentActivity, setAgentActivity] = useState<AgentActivity>({ cognitive: "idle", tools: "", lessons: 0, recalled: 0 });

  const stopVoiceMeter = () => {
    if (audioFrameRef.current !== null) {
      cancelAnimationFrame(audioFrameRef.current);
      audioFrameRef.current = null;
    }
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    hologramRef.current?.style.setProperty("--voice-energy", "0.08");
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const scene = createOrbScene(container);
    sceneRef.current = scene;
    return () => {
      trackerRef.current?.stop();
      trackerRef.current = null;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      stopVoiceMeter();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const stopGestures = useCallback(() => {
    trackerRef.current?.stop();
    trackerRef.current = null;
    setCamera("off");
    setStatus({ hands: 0, mode: "idle" });
  }, []);

  const startGestures = useCallback(async () => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay || trackerRef.current) return;

    setCamera("starting");
    setError(null);

    const tracker = new HandTracker(video, overlay, {
      onRotate: (dt, dp) => sceneRef.current?.rotateBy(dt, dp),
      onZoom: (factor) => sceneRef.current?.zoomBy(factor),
      onStatus: setStatus,
    });
    trackerRef.current = tracker;

    try {
      await tracker.start();
      setCamera("on");
    } catch (err) {
      trackerRef.current = null;
      tracker.stop();
      setCamera("error");
      setError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "CAMERA ACCESS DENIED"
          : "TRACKING INIT FAILED",
      );
    }
  }, []);

  const toggleGestures = useCallback(() => {
    if (trackerRef.current) stopGestures();
    else void startGestures();
  }, [startGestures, stopGestures]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "+":
        case "=":
          sceneRef.current?.zoomIn();
          break;
        case "-":
        case "_":
          sceneRef.current?.zoomOut();
          break;
        case "r":
        case "R":
          sceneRef.current?.resetView();
          break;
        case "g":
        case "G":
          toggleGestures();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleGestures]);

  const cameraOn = camera === "on";

  const changePalette = (nextPalette: OrbPalette) => {
    setPalette(nextPalette);
    sceneRef.current?.setPalette(nextPalette);
  };

  const speak = (message: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setVoiceState("idle");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.onstart = () => setVoiceState("speaking");
    utterance.onend = () => setVoiceState("idle");
    window.speechSynthesis.speak(utterance);
  };

  const applyAssistantAction = (action?: AssistantAction) => {
    if (!action) return;
    switch (action.type) {
      case "palette":
        changePalette(action.value);
        break;
      case "reset":
        sceneRef.current?.resetView();
        break;
      case "zoom":
        if (action.value === "in") sceneRef.current?.zoomIn();
        else sceneRef.current?.zoomOut();
        break;
      case "gestures":
        toggleGestures();
        break;
    }
  };

  const handleVoiceCommand = useCallback(
    async (command: string) => {
      const message = command.trim();
      if (!message) return;
      setChatMessages((current) => [...current, { id: Date.now(), role: "user", text: message }]);
      setVoiceTranscript(`Processing: ${message}`);
      setAgentActivity((current) => ({ ...current, cognitive: "focus" }));

      const historyForApi = chatMessages.slice(-8).map((turn) => ({ role: turn.role, content: turn.text }));

      const processAgentResult = (finalResult: AgentResultEnvelope) => {
        const tools = finalResult.toolCalls || [];
        const recalled = finalResult.recalled || [];
        const toolLabel = tools.length ? tools.map((call) => call.tool).join(" → ") : "";
        const activity: AgentActivity = {
          cognitive: finalResult.cognitiveState ?? (tools.length ? "automating" : "idle"),
          tools: toolLabel,
          lessons: finalResult.lessonsLearned ?? 0,
          recalled: recalled.length,
        };
        setAgentActivity(activity);
        applyAssistantAction(finalResult.action);
        const roxMessage: ChatMessage = {
          id: Date.now() + 1,
          role: "rox",
          text: finalResult.reply,
          tools: tools.length ? tools.map((call) => `${call.tool}${call.ok ? "" : " ✗"}`) : undefined,
        };
        setChatMessages((current) => [...current, roxMessage]);
        setVoiceTranscript(`${(finalResult.provider ?? "model").toUpperCase()}: ${finalResult.reply}`);
        speak(finalResult.reply);
      };

      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            stream: false,
            history: historyForApi,
          }),
        });
        if (!response.ok) throw new Error(`Assistant request failed (${response.status})`);
        const data = (await response.json()) as AgentResultEnvelope;
        processAgentResult(data);
      } catch (error) {
        const fallback = `The assistant service is unavailable (${error instanceof Error ? error.message : "network error"}). Local orb controls are still ready.`;
        setVoiceTranscript(fallback);
        setChatMessages((current) => [...current, { id: Date.now() + 1, role: "rox", text: fallback }]);
        setAgentActivity((current) => ({ ...current, cognitive: "offline" }));
        speak(fallback);
      }
    },
    [chatMessages, toggleGestures],
  );

  const sendChatMessage = () => {
    const message = chatInput.trim();
    if (!message) return;
    setChatInput("");
    void handleVoiceCommand(message);
  };

  const startChatDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    chatDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: chatPosition.x,
      originY: chatPosition.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveChatDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = chatDragRef.current;
    if (!drag) return;
    setChatPosition({
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    });
  };

  const stopChatDrag = () => {
    chatDragRef.current = null;
  };

  const startVoiceCapture = async () => {
    if (voiceStartingRef.current || recognitionRef.current || voiceState === "speaking") return;
    voiceStartingRef.current = true;
    voiceCancelRef.current = false;
    const recognitionApi = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = recognitionApi.SpeechRecognition ?? recognitionApi.webkitSpeechRecognition;
    if (!Recognition) {
      voiceStartingRef.current = false;
      setVoiceState("unsupported");
      setVoiceTranscript("Voice input is not supported in this browser");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      voiceStartingRef.current = false;
      setVoiceState("error");
      setVoiceTranscript("Microphone access is not available");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (voiceCancelRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        voiceStartingRef.current = false;
        return;
      }
      micStreamRef.current = stream;
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      const source = audioContext.createMediaStreamSource(stream);
      const samples = new Uint8Array(analyser.fftSize);
      source.connect(analyser);
      audioContextRef.current = audioContext;

      const updateVoiceMeter = () => {
        analyser.getByteTimeDomainData(samples);
        let squareSum = 0;
        for (const sample of samples) {
          const normalized = (sample - 128) / 128;
          squareSum += normalized * normalized;
        }
        const energy = Math.min(1, Math.sqrt(squareSum / samples.length) * 4.5);
        hologramRef.current?.style.setProperty("--voice-energy", energy.toFixed(3));
        audioFrameRef.current = requestAnimationFrame(updateVoiceMeter);
      };
      updateVoiceMeter();
    } catch {
      voiceStartingRef.current = false;
      setVoiceState("error");
      setVoiceTranscript("Microphone permission is required");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setVoiceTranscript(`Heard: ${transcript}`);
      handleVoiceCommand(transcript);
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      voiceStartingRef.current = false;
      stopVoiceMeter();
      setVoiceState("error");
      setVoiceTranscript("Voice link failed");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      voiceStartingRef.current = false;
      stopVoiceMeter();
      setVoiceState((current) => (current === "speaking" ? current : "idle"));
    };
    recognitionRef.current = recognition;
    voiceStartingRef.current = false;
    setVoiceState("listening");
    setVoiceTranscript("Listening for command...");
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      stopVoiceMeter();
      setVoiceState("error");
      setVoiceTranscript("Voice link could not start");
    }
  };

  const stopVoiceCapture = () => {
    if (voiceStartingRef.current) {
      voiceCancelRef.current = true;
      voiceStartingRef.current = false;
      stopVoiceMeter();
      setVoiceState("idle");
      return;
    }
    if (voiceState !== "listening") return;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    stopVoiceMeter();
    setVoiceState("idle");
  };

  useEffect(() => {
    const onVoiceKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      event.preventDefault();
      void startVoiceCapture();
    };
    const onVoiceKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      event.preventDefault();
      stopVoiceCapture();
    };
    window.addEventListener("keydown", onVoiceKey);
    window.addEventListener("keyup", onVoiceKeyUp);
    return () => {
      window.removeEventListener("keydown", onVoiceKey);
      window.removeEventListener("keyup", onVoiceKeyUp);
    };
  });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const poll = async () => {
      try {
        const response = await fetch("/api/youtube/control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: "status" }) });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as {
          ok: boolean;
          reply: string;
          data?: { health?: { initialized: boolean; setupRequired: boolean; agents: string[]; uptime: number }; dashboardUrl?: string; url?: string };
          error?: string;
        };
        if (!data.ok) {
          setYouTubeAgent({ state: "offline", error: data.error, url: "http://127.0.0.1:3457" });
          return;
        }
        const health = data.data?.health;
        setYouTubeAgent({
          state: "online",
          initialized: health?.initialized ?? false,
          setupRequired: health?.setupRequired ?? false,
          agents: health?.agents ?? [],
          uptime: health?.uptime ?? 0,
          dashboardUrl: data.data?.dashboardUrl ?? "/api/youtube/proxy",
          url: data.data?.url ?? "http://127.0.0.1:3457",
        });
      } catch {
        if (!cancelled) setYouTubeAgent({ state: "offline", error: "Rox status endpoint unavailable", url: "http://127.0.0.1:3457" });
      }
    };
    void poll();
    timer = setInterval(() => void poll(), 15_000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  const runYouTubeCopilot = useCallback(async (message: string) => {
    setYouTubeCopilot({ message, reply: "Working on it…" });
    try {
      const response = await fetch("/api/youtube/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) throw new Error("Control request failed");
      const data = (await response.json()) as { ok: boolean; reply: string; error?: string };
      setYouTubeCopilot({ message, reply: data.ok ? data.reply : data.error || "Unknown error" });
    } catch (error) {
      setYouTubeCopilot({ message, reply: `Could not reach the YouTube control bridge: ${error instanceof Error ? error.message : "unknown error"}.` });
    }
  }, []);

  return (
    <div className={`rox-shell ui-${uiMode}`}>
      <div ref={containerRef} className="orb-root" />

      <div className="overlay-vignette" />
      <div className="overlay-grain" />
      <div className="overlay-scanlines" />
      <div ref={hologramRef} className={`voice-hologram voice-${voiceState}`} aria-hidden="true">
        <span className="hologram-ring hologram-ring-one" />
        <span className="hologram-ring hologram-ring-two" />
        <span className="hologram-beam" />
      </div>

      <div className="hud hud-title">
        <strong>R.O.X. // SYSTEM CORE</strong>
        <span>NEURAL ORBITAL INTERFACE</span>
      </div>

      <div className="hud hud-diagnostics" aria-label="System diagnostics">
        <div className="diagnostic-heading">CORE TELEMETRY <span>LIVE</span></div>
        <div className="diagnostic-grid">
          <span>FLUX</span><b>98.4%</b><i><em style={{ width: "98%" }} /></i>
          <span>FIELD</span><b>STABLE</b><i><em style={{ width: "82%" }} /></i>
          <span>SYNC</span><b>ACTIVE</b><i><em style={{ width: "91%" }} /></i>
        </div>
        <div className="diagnostic-code">RX-07 · ORBITAL MESH · 0xFF3A · READY</div>
        {systemSnapshot && (
          <div className={`diagnostic-system${systemSnapshot.memoryUsedPercent > 85 ? " warning" : ""}`}>
            HOST {systemSnapshot.memoryUsedPercent}% RAM · {systemSnapshot.cpuCores} CORES · LOAD {systemSnapshot.loadAverage[0]}
          </div>
        )}
        <div className={`diagnostic-agent state-${agentActivity.cognitive}`}>
          <span>AGENT</span>
          <b>{agentActivity.cognitive.toUpperCase()}</b>
          {agentActivity.tools && <i title={agentActivity.tools}>⚙ {agentActivity.tools}</i>}
          {(agentActivity.lessons > 0 || agentActivity.recalled > 0) && (
            <small>
              {agentActivity.recalled > 0 ? `recalled ${agentActivity.recalled}` : ""}
              {agentActivity.recalled > 0 && agentActivity.lessons > 0 ? " · " : ""}
              {agentActivity.lessons > 0 ? `${agentActivity.lessons} lessons` : ""}
            </small>
          )}
        </div>
      </div>

      <div className={`hud hud-voice voice-${voiceState}`} aria-live="polite">
        <span className="voice-dot" />
        <span>
          {voiceState === "listening"
            ? "LISTENING"
            : voiceState === "speaking"
              ? "ROX SPEAKING"
              : "VOICE LINK"}
        </span>
        <small>{voiceTranscript}</small>
      </div>

      <div className="hud ui-mode-switch" role="group" aria-label="Interface mode">
        <span>INTERFACE</span>
        <button
          type="button"
          className={uiMode === "original" ? "active" : ""}
          aria-pressed={uiMode === "original"}
          onClick={() => setUiMode("original")}
        >
          CORE
        </button>
        <button
          type="button"
          className={uiMode === "cinematic" ? "active" : ""}
          aria-pressed={uiMode === "cinematic"}
          onClick={() => setUiMode("cinematic")}
        >
          FLOW
        </button>
      </div>

      <div className="cinematic-console" aria-live="polite">
        <div className="cinematic-orbit-label">ROX / PERSONAL INTELLIGENCE</div>
        <div className="cinematic-state">
          <span className="cinematic-state-dot" />
          {voiceState === "listening" ? "LISTENING TO YOU" : voiceState === "speaking" ? "ROX IS SPEAKING" : "READY WHEN YOU ARE"}
        </div>
        <div className="cinematic-transcript">{voiceTranscript}</div>
        <div className="cinematic-actions">
          <span>HOLD SPACE</span>
          <span>TO TALK</span>
        </div>
      </div>

      <button
        type="button"
        className={`chat-launcher${chatOpen ? " is-open" : ""}`}
        aria-label={chatOpen ? "Close Rox chat" : "Open Rox chat"}
        aria-expanded={chatOpen}
        onClick={() => setChatOpen((open) => !open)}
      >
        <span className="chat-launcher-core" />
      </button>

      <section
        className={`chat-panel${chatOpen ? " is-open" : ""}`}
        aria-label="Rox conversation"
        style={{ "--chat-x": `${chatPosition.x}px`, "--chat-y": `${chatPosition.y}px` } as React.CSSProperties}
      >
        <div
          className="chat-panel-header"
          onPointerDown={startChatDrag}
          onPointerMove={moveChatDrag}
          onPointerUp={stopChatDrag}
          onPointerCancel={stopChatDrag}
        >
          <span>ROX / SESSION TRANSCRIPT</span>
          <button type="button" aria-label="Close chat" onClick={() => setChatOpen(false)}>×</button>
        </div>
        <div className="chat-messages">
          {chatMessages.length === 0 ? (
            <div className="chat-empty">Your conversation with Rox will appear here.</div>
          ) : (
            chatMessages.map((message) => (
              <div key={message.id} className={`chat-message chat-${message.role}`}>
                <span>{message.role === "user" ? "YOU" : "ROX"}</span>
                <p>{message.text}</p>
                {message.tools && message.tools.length > 0 && (
                  <div className="chat-tools">
                    {message.tools.map((tool) => (
                      <span key={tool} className="chat-tool-chip">{tool.toUpperCase()}</span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <form
          className="chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            sendChatMessage();
          }}
        >
          <input
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="Message Rox..."
            aria-label="Message Rox"
          />
          <button type="submit" aria-label="Send message">↗</button>
        </form>
      </section>

      <section
        className={`chat-panel youtube-panel${youtubePanelOpen ? " is-open" : ""}`}
        aria-label="YouTube agent"
      >
        <div className="chat-panel-header">
          <span>YT AGENT / CONTROL</span>
          <button type="button" aria-label="Close YouTube agent panel" onClick={() => setYouTubePanelOpen(false)}>×</button>
        </div>
        <div className="youtube-panel-body">
          {youtubeAgent.state === "online" ? (
            <>
              <div className="youtube-status">
                <span className="youtube-dot" />
                <span>AGENT ONLINE</span>
                <small>
                  {youtubeAgent.setupRequired
                    ? "Setup mode — YouTube credentials pending"
                    : youtubeAgent.initialized
                      ? `${youtubeAgent.agents.length} agents ready`
                      : "Not fully initialized"}
                </small>
              </div>
              <div className="youtube-actions">
                <button type="button" className="youtube-action" onClick={() => void runYouTubeCopilot("youtube status")}>
                  STATUS
                </button>
                <button type="button" className="youtube-action" onClick={() => void runYouTubeCopilot("youtube jobs")}>
                  JOBS
                </button>
                <button type="button" className="youtube-action" onClick={() => void runYouTubeCopilot("youtube ideas")}>
                  IDEAS
                </button>
                <button type="button" className="youtube-action" onClick={() => void runYouTubeCopilot("youtube analytics")}>
                  ANALYTICS
                </button>
                <button type="button" className="youtube-action" onClick={() => void runYouTubeCopilot("youtube strategy")}>
                  STRATEGY
                </button>
              </div>
              <div className={`youtube-copilot${youtubeCopilot ? " has-reply" : ""}`}>
                {youtubeCopilot && (
                  <>
                    <span>ROX &gt; {youtubeCopilot.message}</span>
                    <p>{youtubeCopilot.reply}</p>
                  </>
                )}
              </div>
              <iframe
                src="/api/youtube/proxy"
                title="YouTube Automation Agent dashboard"
                className="youtube-frame"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </>
          ) : youtubeAgent.state === "checking" ? (
            <div className="youtube-status checking">Checking the agent…</div>
          ) : (
            <div className="youtube-status offline">
              <span className="youtube-dot" />
              <span>AGENT OFFLINE</span>
              <small>{youtubeAgent.error || "Start the YouTube agent to enable control."}</small>
            </div>
          )}
        </div>
        <div className="chat-composer youtube-composer">
          <input
            placeholder="Ask me to manage your channel…"
            aria-label="YouTube assistant command"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                const value = event.currentTarget.value.trim();
                if (value) {
                  void runYouTubeCopilot(value);
                  event.currentTarget.value = "";
                }
              }
            }}
          />
          <button type="button" className="youtube-action" aria-label="Send YouTube command" onClick={() => {}}>
            ↗
          </button>
        </div>
      </section>

      <div className="hud hud-hint">
        <div>
          <span className="key">DRAG</span> spin&nbsp;&nbsp;
          <span className="key">SCROLL</span> zoom
        </div>
        <div><span className="key">HOLD SPACE</span> talk</div>
        {cameraOn ? (
          <div>
            <span className="key">PINCH + MOVE</span> spin&nbsp;&nbsp;
            <span className="key">PINCH BOTH HANDS ± SPREAD</span> zoom
          </div>
        ) : (
          <div>
            <span className="key">G</span> hand gestures&nbsp;&nbsp;
            <span className="key">R</span> reset&nbsp;&nbsp;
            <span className="key">+/−</span> zoom
          </div>
        )}
      </div>

      <div className="hud hud-controls">
        <div className="control-heading">COMMAND DECK <span>ONLINE</span></div>
        <button
          type="button"
          className="hud-btn voice-btn"
          aria-pressed={voiceState === "listening"}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            void startVoiceCapture();
          }}
          onPointerUp={stopVoiceCapture}
          onPointerCancel={stopVoiceCapture}
          onKeyDown={(event) => {
            if (event.code === "Space" || event.code === "Enter") {
              event.preventDefault();
              void startVoiceCapture();
            }
          }}
          onKeyUp={(event) => {
            if (event.code === "Space" || event.code === "Enter") {
              event.preventDefault();
              stopVoiceCapture();
            }
          }}
        >
          {voiceState === "listening" ? "RELEASE TO SEND" : "HOLD TO TALK"}
        </button>
        <div className="palette-panel" aria-label="Color palette">
          <span className="palette-label">PALETTE</span>
          <div className="palette-options">
            {(Object.keys(PALETTE_LABELS) as OrbPalette[]).map((option) => (
              <button
                key={option}
                type="button"
                className={`palette-btn palette-${option}`}
                aria-label={`${PALETTE_LABELS[option]} color palette`}
                aria-pressed={palette === option}
                onClick={() => changePalette(option)}
              >
                <span className="palette-swatch" />
                {PALETTE_LABELS[option]}
              </button>
            ))}
          </div>
        </div>

        <div className={`camera-panel${cameraOn ? " visible" : ""}`}>
          {/* Mirrored preview so it behaves like a mirror */}
          <video ref={videoRef} muted playsInline className="camera-video" />
          <canvas ref={overlayRef} width={208} height={156} className="camera-overlay" />
          <div className="camera-status">
            {status.hands > 0
              ? `${status.hands} HAND${status.hands > 1 ? "S" : ""} · ${MODE_LABEL[status.mode]}`
              : "SHOW HANDS"}
          </div>
        </div>

        {error && <div className="hud-error">{error}</div>}

        <div className="hud-row">
          <button
            type="button"
            className="hud-btn"
            aria-pressed={cameraOn}
            onClick={toggleGestures}
            disabled={camera === "starting"}
          >
            {camera === "starting" ? "INITIALIZING…" : cameraOn ? "GESTURES ON" : "GESTURES OFF"}
          </button>
        </div>
        <div className="hud-row">
          <button
            type="button"
            className={`hud-btn youtube-btn${youtubePanelOpen ? " active" : ""}`}
            aria-pressed={youtubePanelOpen}
            onClick={() => setYouTubePanelOpen((open) => !open)}
          >
            {youtubeAgent.state === "online" ? "YT AGENT ONLINE" : youtubeAgent.state === "checking" ? "YT AGENT…" : "YT AGENT OFFLINE"}
          </button>
        </div>
        <div className="hud-row">
          <button type="button" className="hud-btn" onClick={() => sceneRef.current?.zoomIn()} aria-label="Zoom in">
            +
          </button>
          <button type="button" className="hud-btn" onClick={() => sceneRef.current?.zoomOut()} aria-label="Zoom out">
            −
          </button>
          <button type="button" className="hud-btn" onClick={() => sceneRef.current?.resetView()}>
            RESET
          </button>
        </div>
      </div>
    </div>
  );
}
