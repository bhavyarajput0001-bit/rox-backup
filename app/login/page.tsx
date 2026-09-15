// Login page for Rox

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login, register, getAuth, saveAuth } from "@/lib/auth";
import type { User } from "@/lib/auth";

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
    // Default device name
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
    <div className="login-page">
      <div className="login-bg-orb" />
      <div className="login-grain" />
      <div className="login-scanlines" />

      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <span className="login-logo__orb" />
            <span className="login-logo__text">R.O.X.</span>
          </div>
          <p className="login-subtitle">
            {mode === "login" ? "NEURAL ORBITAL INTERFACE" : "CREATE NEW IDENTITY"}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="form-group">
              <label className="form-label">OPERATOR NAME</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">EMAIL CREDENTIAL</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@rox.system"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">ACCESS CODE</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label className="form-label">DEVICE IDENTIFIER</label>
            <input
              type="text"
              className="form-input"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Custom device name"
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="login-btn__spinner" />
            ) : (
              mode === "login" ? "INITIALIZE SESSION" : "CREATE IDENTITY"
            )}
          </button>
        </form>

        <div className="login-footer">
          <button
            type="button"
            className="login-link"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login"
              ? "NEW OPERATOR? REGISTER →"
              : "EXISTING OPERATOR? LOGIN →"}
          </button>
        </div>

        <div className="login-orbit">
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              className="login-orbit__dot"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
