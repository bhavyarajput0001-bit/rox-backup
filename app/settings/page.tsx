"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, Key, Palette, User, Shield } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string; devices?: string[] } | null>(null);

  const [apiKey, setApiKey] = useState({
    openai: process.env.NEXT_PUBLIC_OPENAI_KEY || "",
    anthropic: process.env.NEXT_PUBLIC_ANTHROPIC_KEY || "",
    omniroute: process.env.NEXT_PUBLIC_OMNIROUTER_KEY || "",
    freellm: process.env.NEXT_PUBLIC_FREELLM_KEY || "",
  });

  const [theme, setTheme] = useState("amber");

  const handleSaveKey = async (provider: string, key: string) => {
    // In production, this would call the API to update the key
    localStorage.setItem(`rox_key_${provider}`, key);
    alert(`${provider} API key saved!`);
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("rox_theme", newTheme);
    // Apply theme
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return (
    <div className="min-h-screen bg-rox-bg">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 rounded-lg bg-rox-surface border border-rox-border text-rox-gray hover:text-rox-bright transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-light text-rox-bright">Settings</h1>
        </div>

        {/* Account Section */}
        <div className="glass-panel rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-rox-amber" />
            <h2 className="text-lg font-medium text-rox-bright">Account</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-rox-gray">Email</label>
                <div className="mt-1 px-4 py-2 rounded-lg bg-rox-bg text-rox-bright">
                  {user?.email || "Not logged in"}
                </div>
              </div>
              <div>
                <label className="text-sm text-rox-gray">Device</label>
                <div className="mt-1 px-4 py-2 rounded-lg bg-rox-bg text-rox-bright">
                  {user?.devices?.[0] || "web"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Providers Section */}
        <div className="glass-panel rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-5 h-5 text-rox-amber" />
            <h2 className="text-lg font-medium text-rox-bright">AI Providers</h2>
          </div>
          <div className="space-y-4">
            {[
              { key: "openai", name: "OpenAI", placeholder: "sk-..." },
              { key: "anthropic", name: "Anthropic", placeholder: "sk-ant-..." },
              { key: "omniroute", name: "Omniroute", placeholder: "http://localhost:20128/v1" },
              { key: "freellm", name: "FreeLLM", placeholder: "http://localhost:31415/v1" },
            ].map((provider) => (
              <div key={provider.key} className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-rox-gray">{provider.name}</label>
                  <input
                    type="password"
                    value={apiKey[provider.key as keyof typeof apiKey]}
                    onChange={(e) =>
                      setApiKey({ ...apiKey, [provider.key]: e.target.value })
                    }
                    placeholder={provider.placeholder}
                    className="mt-1 w-full px-4 py-2 rounded-lg bg-rox-bg border border-rox-border text-rox-bright focus:outline-none focus:border-rox-amber/50"
                  />
                </div>
                <button
                  onClick={() => handleSaveKey(provider.key, apiKey[provider.key as keyof typeof apiKey])}
                  className="mt-6 px-4 py-2 rounded-lg bg-rox-amber text-rox-bg font-medium hover:bg-rox-gold transition-colors"
                >
                  Save
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Theme Section */}
        <div className="glass-panel rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-5 h-5 text-rox-amber" />
            <h2 className="text-lg font-medium text-rox-bright">Theme</h2>
          </div>
          <div className="flex gap-3">
            {[
              { id: "amber", name: "Amber Gold", color: "bg-amber-500" },
              { id: "lava", name: "Lava Red", color: "bg-red-500" },
              { id: "dark", name: "Dark", color: "bg-gray-500" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  theme === t.id
                    ? "border-rox-amber bg-rox-amber/10"
                    : "border-rox-border hover:border-rox-amber/50"
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${t.color}`} />
                <span className="text-rox-bright">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Security Section */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-rox-amber" />
            <h2 className="text-lg font-medium text-rox-bright">Security</h2>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => {
                localStorage.removeItem("rox_token");
                router.push("/login");
              }}
              className="w-full px-4 py-2 rounded-lg bg-rox-red/10 text-rox-red hover:bg-rox-red/20 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
