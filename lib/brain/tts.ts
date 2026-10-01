/**
 * Rox Voice — text-to-speech for the browser.
 *
 * Wraps the Web Speech API (window.speechSynthesis) in a small, typed,
 * personality-aware API: voice preference (male English first), mood→voice
 * settings mapping, and a singleton RoxVoice instance.
 *
 * Everything is browser-only. On the server (or in environments without
 * speechSynthesis) the API degrades gracefully — see `isSupported()`.
 */

import type { Mood } from "./personality";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Pitch, rate and volume are 0..1, 0..2 and 0..1 ranges respectively. */
export interface VoiceOptions {
  /** Speaking rate (0.1 – 10, sensible range ~0.5 – 2). Default 0.95. */
  rate?: number;
  /** Pitch (0 – 2, default 1.0). */
  pitch?: number;
  /** Volume (0 – 1). Default 0.8. */
  volume?: number;
  /** Explicit voice; falls back to preference matching when omitted. */
  voiceName?: string;
}

/** The minimal provider contract any Rox TTS backend must satisfy. */
export interface TTSProvider {
  speak(text: string, options?: VoiceOptions): void;
  stop(): void;
  getVoices(): SpeechSynthesisVoice[];
  setVoice(voiceName: string): boolean;
  isSpeaking(): boolean;
}

/** Mood-driven voice settings — used to make Rox *sound* how she feels. */
export interface MoodVoiceSettings {
  rate: number;
  pitch: number;
  volume: number;
}

// ─── Defaults & mood mapping ────────────────────────────────────────────────

export const DEFAULT_VOICE_OPTIONS: Required<VoiceOptions> = {
  rate: 0.95,
  pitch: 1.0,
  volume: 0.8,
  voiceName: "",
};

/**
 * Map a personality mood to TTS parameters.
 *   excited → fast + chirpy    calm → slow + low    etc.
 */
export function moodToVoiceSettings(mood: Mood): MoodVoiceSettings {
  switch (mood) {
    case "excited":
      return { rate: 1.25, pitch: 1.25, volume: 0.95 };
    case "happy":
      return { rate: 1.1, pitch: 1.12, volume: 0.9 };
    case "focused":
      return { rate: 0.95, pitch: 1.0, volume: 0.8 };
    case "confused":
      return { rate: 0.9, pitch: 0.95, volume: 0.8 };
    case "tired":
    default:
      return { rate: 0.8, pitch: 0.85, volume: 0.7 };
  }
}

// ─── Voice helpers ──────────────────────────────────────────────────────────

/** Is the Web Speech API available in this environment? */
export function isSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

/** Some browsers populate voices lazily — fire the event to nudge them. */
function warmUpVoices(): void {
  if (!isSupported()) return;
  try {
    window.speechSynthesis.getVoices();
  } catch {
    /* noop — voices will arrive via onvoiceschanged */
  }
  window.speechSynthesis.onvoiceschanged = () => undefined;
}

/**
 * Resolve the best available voice.
 * Preference order:
 *   1. explicitly requested voice name (if it exists)
 *   2. a male English voice (matches "male", "en" + often "Google US English" / "Daniel")
 *   3. any English voice
 *   4. null (let the browser pick its default)
 */
export function pickBestVoice(
  voices: SpeechSynthesisVoice[],
  preferredName = "",
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  if (preferredName) {
    const exact = voices.find((v) => v.name.toLowerCase() === preferredName.toLowerCase());
    if (exact) return exact;
  }

  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));

  const male = english.find((v) => /daniel|male|google us english|david|fred|alex/i.test(v.name));
  if (male) return male;

  if (english.length > 0) return english[0];
  return voices[0];
}

/** Load (and cache) the current voice list — resolves async browsers. */
export async function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isSupported()) return [];
  warmUpVoices();
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) return voices;

  // Voice list loads asynchronously on some engines — wait for the event.
  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const timeout = setTimeout(() => {
      window.speechSynthesis.onvoiceschanged = null;
      resolve(window.speechSynthesis.getVoices());
    }, 1500);

    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(timeout);
      window.speechSynthesis.onvoiceschanged = null;
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

// ─── RoxVoice ───────────────────────────────────────────────────────────────

/**
 * Browser Web Speech TTS implementation of {@link TTSProvider}.
 * Prefers a male English voice, falls back to any English voice.
 */
export class RoxVoice implements TTSProvider {
  private preferredVoiceName: string;
  private voicesCache: SpeechSynthesisVoice[] = [];
  private _speaking = false;

  constructor(preferredVoiceName = "") {
    this.preferredVoiceName = preferredVoiceName;
  }

  /** Speak text with optional overrides (rate/pitch/volume/voice). */
  speak(text: string, options: VoiceOptions = {}): void {
    if (!isSupported() || !text.trim()) return;

    const synth = window.speechSynthesis;
    synth.cancel(); // don't queue up a backlog of Rox talking over herself

    const utterance = new SpeechSynthesisUtterance(text);
    const merged: Required<VoiceOptions> = { ...DEFAULT_VOICE_OPTIONS, ...options };

    const voice = pickBestVoice(
      merged.voiceName ? this.loadVoices() : this.getCurrentVoices(),
      merged.voiceName || this.preferredVoiceName,
    );
    if (voice) utterance.voice = voice;

    utterance.rate = merged.rate;
    utterance.pitch = merged.pitch;
    utterance.volume = merged.volume;

    utterance.onstart = () => {
      this._speaking = true;
    };
    utterance.onend = () => {
      this._speaking = false;
    };
    utterance.onerror = () => {
      this._speaking = false;
    };

    this._speaking = true;
    synth.speak(utterance);
  }

  /** Cancel any ongoing speech. */
  stop(): void {
    if (!isSupported()) return;
    window.speechSynthesis.cancel();
    this._speaking = false;
  }

  /** List all browser voices (cached; use getAvailableVoices() for a fresh load). */
  getVoices(): SpeechSynthesisVoice[] {
    if (!isSupported()) return [];
    return this.loadVoices();
  }

  /** Switch the preferred voice by name. Returns true if it exists. */
  setVoice(voiceName: string): boolean {
    const exists = this.loadVoices().some(
      (v) => v.name.toLowerCase() === voiceName.toLowerCase(),
    );
    if (exists) {
      this.preferredVoiceName = voiceName;
      return true;
    }
    return false;
  }

  /** True while an utterance is being spoken. */
  isSpeaking(): boolean {
    if (isSupported() && window.speechSynthesis.speaking) return true;
    return this._speaking;
  }

  /** Speak with mood-based voice settings baked in. */
  speakWithMood(text: string, mood: Mood, options: VoiceOptions = {}): void {
    const moodSettings = moodToVoiceSettings(mood);
    this.speak(text, { ...moodSettings, ...options });
  }

  private loadVoices(): SpeechSynthesisVoice[] {
    if (!isSupported()) return [];
    try {
      this.voicesCache = window.speechSynthesis.getVoices();
    } catch {
      /* keep the old cache */
    }
    return this.voicesCache;
  }

  private getCurrentVoices(): SpeechSynthesisVoice[] {
    return this.loadVoices();
  }
}

/** Singleton Rox voice, ready to import anywhere in the client. */
export const roxVoice = new RoxVoice();

// ─── Convenience functions ──────────────────────────────────────────────────

/** Speak text with Rox's default voice (rate 0.95 / pitch 1.0 / volume 0.8). */
export function speak(text: string, options: VoiceOptions = {}): void {
  roxVoice.speak(text, options);
}

/** Speak text using the voice settings for a given personality mood. */
export function speakWithMood(text: string, mood: Mood, options: VoiceOptions = {}): void {
  roxVoice.speakWithMood(text, mood, options);
}

/** Cancel any speech in progress. */
export function stopSpeaking(): void {
  roxVoice.stop();
}

/** Change Rox's voice by name. Returns false if the voice isn't installed. */
export function setVoice(voiceName: string): boolean {
  return roxVoice.setVoice(voiceName);
}

/** Is Rox currently speaking? */
export function isSpeaking(): boolean {
  return roxVoice.isSpeaking();
}

/** List every voice the browser knows about. */
export async function listVoices(): Promise<SpeechSynthesisVoice[]> {
  return getAvailableVoices();
}