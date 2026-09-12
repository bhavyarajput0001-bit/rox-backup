"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createOrbScene, type OrbPalette, type OrbSceneApi } from "@/lib/orbScene";
import type { AssistantAction, AssistantResult } from "@/lib/assistant";
import { HandTracker, type TrackerStatus } from "@/lib/handTracker";

type CameraState = "off" | "starting" | "on" | "error";
type VoiceState = "idle" | "listening" | "speaking" | "unsupported" | "error";

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
      setVoiceTranscript(`Processing: ${command}`);

      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: command }),
        });
        if (!response.ok) throw new Error("Assistant request failed");
        const result = (await response.json()) as AssistantResult;
        applyAssistantAction(result.action);
        setVoiceTranscript(`${result.provider.toUpperCase()}: ${result.reply}`);
        speak(result.reply);
      } catch {
        const fallback = "The assistant service is unavailable. Local orb controls are still ready.";
        setVoiceTranscript(fallback);
        speak(fallback);
      }
    },
    [toggleGestures],
  );

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

  return (
    <>
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
    </>
  );
}
