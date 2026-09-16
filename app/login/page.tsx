"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login, register, getAuth, saveAuth } from "@/lib/auth";
import type { User } from "@/lib/auth";
import { Brain } from "lucide-react";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const auth = getAuth();
    if (auth.isAuthenticated) {
      router.replace("/dashboard");
    }
    // Default device name detection
    const ua = navigator.userAgent;
    if (ua.includes("Mac")) setDeviceName("Mac");
    else if (ua.includes("iPhone") || ua.includes("iPad")) setDeviceName("iOS Device");
    else if (ua.includes("Android")) setDeviceName("Android");
    else if (ua.includes("Windows")) setDeviceName("Windows PC");
    else setDeviceName("Web Browser");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let result;
      if (mode === "register") {
        if (!name.trim()) throw new Error("Name is required for registration");
        result = await register(email, password, name, deviceName || undefined);
      } else {
        result = await login(email, password, deviceName || undefined);
      }
      saveAuth(result.token, result.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="login-page relative min-h-screen bg-black overflow-hidden">
      {/* Film grain overlay */}
      <div className="overlay-grain absolute inset-0 opacity-30 pointer-events-none" />
      {/* Amber radial glow background */}
      <div
        className="absolute inset-0 bg-[radial-gradient(center,rgba(255,170,48,0.15),transparent_60%)] 
        pointer-events-none"
      />
      
      <div className="flex flex-col items-center justify-center min-h-screen flex-grow px-4">
        {/* Glass Card Container */}
        <div className="glass-card w-full max-w-md p-6 rounded-xl bg-black/30 backdrop-filter:blur(12px) border border-rox/10 shadow-[0_0_20px_rgba(255,170,48,0.2)]">
          {/* Header: Brain icon + Title */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="flex justify-center mb-2">
              <Brain className="w-12 h-12 text-rox/bright animate-pulse" />
              <p className="glow-text text-4xl font-bold tracking-wider mb-1">ROX</p>
            </div>
            <p className="text-rox-muted text-lg mt-1">Neural Orbital Interface</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 justify-center">
            <button
              type="button"
              onClick={() => setMode("login")}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all transform hover:scale-105"
              style={{
                border: mode === "login" ? "2px solid var(--hud-bright)" : "1px solid rgba(255,170,48,0.3)",
                background: mode === "login" ? "rgba(255,170,48,0.05)" : "transparent",
                color: mode === "login" ? "var(--hud-bright)" : "var(--hud-muted)",
              }}
            >
              LOGIN
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all transform hover:scale-105"
              style={{
                border: mode === "register" ? "2px solid var(--hud-bright)" : "1px solid rgba(255,170,48,0.3)",
                background: mode === "register" ? "rgba(255,170,48,0.05)" : "transparent",
                color: mode === "register" ? "var(--hud-bright)" : "var(--hud-muted)",
              }}
            >
              REGISTER
            </button>
          </div>

          {/* Register-specific field */}
          {mode === "register" && (
            <div className="mb-4">
              <label className="block text-rox-muted text-xs mb-1">Operator Name</label>
              <input
                type="text"
                className="w-full mb-2 glass-input"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          {/* Email and Password */}
          <div className="space-y-3">
            <label className="block text-rox-muted text-xs mb-1">Email Credential</label>
            <input
              type="email"
              className="w-full glass-input"
              placeholder="operator@rox.system"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label className="block text-rox-muted text-xs mb-1">Access Code</label>
            <input
              type="password"
              className="w-full glass-input"
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {/* Device name input for register */}
          {mode === "register" && (
            <div className="space-y-1 mb-4">
              <label className="block text-rox-muted text-xs mb-1">Device Identifier</label>
              <input
                type="text"
                className="w-full glass-input"
                placeholder="Custom device name"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
              />
            </div>
          )}

          {/* Error message */}
          {error && <div className="login-error text-red-400 text-sm mb-2">{error}</div>}

          {/* Submit button */}
          <button
            type="submit"
            className="w-full py-2 glass-button transition-all transform hover:scale-105"
            disabled={loading}
          >
            {loading ? (
              <span className="animate-pulse" />
            ) : (
              mode === "login"
                ? "INITIALIZE SESSION"
                : "CREATE IDENTITY"
            )}
          </button>

          {/* Note */}
          <p className="text-rox-muted text-sm mt-4 text-center">
            Enter your API key for full AI powers
          </p>
        </div>
      </div>
    </div>
  );
}