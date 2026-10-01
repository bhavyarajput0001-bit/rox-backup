import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import type { Mood } from "@/lib/brain/personality";

const execFileAsync = promisify(execFile);

// ─── Types ──────────────────────────────────────────────────────────────────

interface TTSPayload {
  text?: string;
  mood?: Mood;
  voice?: string;
}

interface SpeechError {
  error: string;
  detail?: string;
}

// ─── espeak setup ───────────────────────────────────────────────────────────

const ESPEAK_BINARIES = ["espeak-ng", "espeak"] as const;
let espeakBinary: string | null | undefined; // undefined = not yet probed

interface EspeakVoiceSettings {
  /** Pitch 0–99 (50 = default). */
  pitch: number;
  /** Speed in words per minute (~175 default). */
  speed: number;
  /** Variant, e.g. "m3" = male 3. */
  variant: string;
}

/** Map Rox's mood to espeak parameters (pitch/speed/variant). */
function espeakSettingsFor(mood: Mood | undefined): EspeakVoiceSettings {
  switch (mood) {
    case "excited":
      return { pitch: 70, speed: 200, variant: "m1" };
    case "happy":
      return { pitch: 63, speed: 185, variant: "m2" };
    case "confused":
      return { pitch: 55, speed: 165, variant: "m3" };
    case "tired":
      return { pitch: 38, speed: 140, variant: "m3" };
    case "focused":
    default:
      return { pitch: 50, speed: 175, variant: "m2" };
  }
}

/** Find an espeak binary on PATH (probed once, cached). */
async function findEspeak(): Promise<string | null> {
  if (espeakBinary !== undefined) return espeakBinary;
  for (const bin of ESPEAK_BINARIES) {
    try {
      await execFileAsync(bin, ["--version"]);
      espeakBinary = bin;
      return espeakBinary;
    } catch {
      /* try the next binary */
    }
  }
  espeakBinary = null;
  return espeakBinary;
}

/** Build espeak args for the text/voice/mood combo. */
function espeakArgs(text: string, voice: string | undefined, mood: Mood | undefined): string[] {
  const settings = espeakSettingsFor(mood);
  const voiceFlag = voice ?? `en+${settings.variant}`;
  return [
    "-v",
    voiceFlag,
    "-p",
    String(settings.pitch),
    "-s",
    String(settings.speed),
    text,
  ];
}

/** Synthesize speech with espeak into a WAV buffer. */
async function synthWithEspeak(text: string, voice: string | undefined, mood: Mood | undefined): Promise<Buffer> {
  const bin = await findEspeak();
  if (!bin) {
    throw new Error("espeak/espeak-ng is not installed on this server");
  }

  const dir = await mkdtemp(join(tmpdir(), "rox-tts-"));
  const outFile = join(dir, "speech.wav");
  try {
    await execFileAsync(bin, [...espeakArgs(text, voice, mood), "-w", outFile], {
      timeout: 30_000,
      maxBuffer: 64 * 1024 * 1024,
    });
    return await readFile(outFile);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// ─── Route ──────────────────────────────────────────────────────────────────

/**
 * Rox TTS endpoint.
 *
 * The Web Speech API only exists in the browser, so the *client-side* TTS
 * (lib/brain/tts.ts → RoxVoice) is the primary path. This endpoint exists as
 * a server-side fallback:
 *
 *   1. If a server-side engine (espeak / espeak-ng) is installed it returns
 *      a WAV file, so non-browser clients (Electron shell, scripts, other
 *      devices) still get audible Rox.
 *   2. Otherwise it replies with JSON telling the caller to use client-side
 *      speechSynthesis — no error, just a graceful hand-off.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." } satisfies SpeechError,
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const text =
    typeof body === "object" && body !== null && "text" in body && typeof body.text === "string"
      ? body.text.trim()
      : "";
  const mood =
    typeof body === "object" && body !== null && "mood" in body && typeof body.mood === "string"
      ? (body.mood as Mood)
      : undefined;
  const voice =
    typeof body === "object" && body !== null && "voice" in body && typeof body.voice === "string"
      ? body.voice
      : undefined;

  if (!text) {
    return Response.json(
      { error: "Missing required field: text (non-empty string)." } satisfies SpeechError,
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (text.length > 10_000) {
    return Response.json(
      { error: "text is too long (max 10,000 characters)." } satisfies SpeechError,
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Web Speech API is browser-only — tell callers to use client-side TTS.
  const clientFallback = () =>
    Response.json(
      {
        ok: true,
        audio: null,
        note: "Web Speech API runs in the browser only. Use client-side TTS (lib/brain/tts.ts → RoxVoice) for playback; this endpoint is a server-side fallback.",
        // Keep the mood so the client can apply moodToVoiceSettings itself.
        mood,
      } as const,
      { headers: { "Cache-Control": "no-store" } },
    );

  const bin = await findEspeak();
  if (!bin) return clientFallback();

  try {
    const audio = await synthWithEspeak(text, voice, mood);
    if (audio.length === 0) return clientFallback();
    return new Response(new Uint8Array(audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(audio.length),
        "X-Rox-TTS-Engine": bin,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    // espeak died mid-synthesis — gracefully bounce back to client-side.
    return clientFallback();
  }
}