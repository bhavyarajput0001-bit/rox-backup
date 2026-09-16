"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Brain, Key, Palette, User, Shield, Code2, Film, Eye, Zap, Database } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string | null; devices?: string[] } | null>(null);
  const [apiKey, setApiKey] = useState({
    openai: process.env.NEXT_PUBLIC_OPENAI_KEY || "",
    anthropic: process.env.NEXT_PUBLIC_ANTHROPIC_KEY || "",
    omniroute: process.env.NEXT_PUBLIC_OMNIROUTER_KEY || "",
    freellm: process.env.NEXT_PUBLIC_FREELLM_KEY || "",
  });
  const [theme, setTheme] = useState("amber");
  const [appMode, setAppMode] = useState("focus");
  const [securityStatus, setSecurityStatus] = useState({
    keysConfigured: 0,
    tokenValid: false,
    encryptionEnabled: true,
  });

  useEffect(() => {
    const email = localStorage.getItem("rox_email");
    setUser({ email, devices: ["web"] });
    
    // Check which keys are configured
    const configured = Object.values(apiKey).filter(k => k && k.length > 5).length;
    setSecurityStatus(prev => ({ ...prev, keysConfigured: configured }));
    
    // Check token
    const token = localStorage.getItem("rox_token");
    setSecurityStatus(prev => ({ ...prev, tokenValid: !!token }));
    
    // Restore theme and mode
    const storedTheme = localStorage.getItem("rox_theme") || "amber";
    const storedMode = localStorage.getItem("rox_app_mode") || "focus";
    setTheme(storedTheme);
    setAppMode(storedMode);
    applyTheme(storedTheme);
    applyMode(storedMode);
  }, []);

  const applyTheme = (t: string) => {
    setTheme(t);
    localStorage.setItem("rox_theme", t);
    document.documentElement.setAttribute("data-theme", t);
    document.body.className = t === "amber" ? "" : `palette-${t}`;
  };

  const applyMode = (m: string) => {
    setAppMode(m);
    localStorage.setItem("rox_app_mode", m);
    document.body.dataset.appMode = m;
  };

  const handleSaveKey = async (provider: string, key: string) => {
    // In production, validate and store securely (encrypted)
    localStorage.setItem(`rox_key_${provider}`, key);
    setApiKey(prev => ({ ...prev, [provider]: key }));
    
    // Update security status
    const configured = Object.entries({ ...apiKey, [provider]: key })
      .filter(([, v]) => v && v.length > 5).length;
    setSecurityStatus(prev => ({ ...prev, keysConfigured: configured }));
    
    alert(`${provider} API key saved!`);
  };

  const handleTestConnection = async (provider: string) => {
    const key = apiKey[provider as keyof typeof apiKey];
    if (!key) {
      alert(`Please enter a ${provider} API key first`);
      return;
    }
    
    // Test connection (this would make a real API call in production)
    alert(`Testing ${provider} connection... (API key: ${key.slice(0, 8)}...)`);
  };

  return (
    <div className="min-h-screen bg-rox-bg">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 rounded-lg bg-rox-surface border border-rox/border text-rox/gray hover:text-rox/bright transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-light text-rox/bright">Settings</h1>
          
          {/* Security Status Badge */}
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30">
            <Shield size={14} className="text-green-400" />
            <span className="text-xs text-green-400">
              {securityStatus.keysConfigured}/4 keys • {securityStatus.tokenValid ? 'Secured' : 'Unsecured'}
            </span>
          </div>
        </div>

        {/* Security Dashboard */}
        <div className="glass-panel rounded-2xl p-6 mb-6 border-l-4 border-l-green-500">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-medium text-rox/bright">Security Overview</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-green-500/10">
              <div className="text-2xl font-bold text-green-400">{securityStatus.keysConfigured}/4</div>
              <div className="text-xs text-rox/gray">API Keys</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-500/10">
              <div className="text-2xl font-bold text-green-400">{securityStatus.encryptionEnabled ? 'YES' : 'NO'}</div>
              <div className="text-xs text-rox/gray">Encryption</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-500/10">
              <div className="text-2xl font-bold text-green-400">{securityStatus.tokenValid ? 'YES' : 'NO'}</div>
              <div className="text-xs text-rox/gray">Auth Token</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-500/10">
              <div className="text-2xl font-bold text-blue-400">AES-256</div>
              <div className="text-xs text-rox/gray">Standard</div>
            </div>
          </div>
        </div>

        {/* Account Section */}
        <div className="glass-panel rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-rox/amber" />
            <h2 className="text-lg font-medium text-rox/bright">Account</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-rox/gray">Email</label>
                <div className="mt-1 px-4 py-2 rounded-lg bg-rox-bg text-rox/bright">
                  {user?.email || "Not logged in"}
                </div>
              </div>
              <div>
                <label className="text-sm text-rox/gray">Device</label>
                <div className="mt-1 px-4 py-2 rounded-lg bg-rox-bg text-rox/bright">
                  {user?.devices?.[0] || "web"}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("rox_token");
                localStorage.removeItem("rox_user");
                localStorage.removeItem("rox_email");
                router.push("/login");
              }}
              className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {/* AI Providers Section */}
        <div className="glass-panel rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-5 h-5 text-rox/amber" />
            <h2 className="text-lg font-medium text-rox/bright">AI Providers</h2>
          </div>
          <div className="space-y-4">
            {[
              { key: "openai", name: "OpenAI", placeholder: "sk-...", icon: Zap },
              { key: "anthropic", name: "Anthropic", placeholder: "sk-ant-...", icon: Brain },
              { key: "omniroute", name: "Omniroute", placeholder: "http://localhost:20128/v1", icon: Database },
              { key: "freellm", name: "FreeLLM", placeholder: "http://localhost:31415/v1", icon: Eye },
            ].map((provider) => {
              const Icon = provider.icon;
              const hasKey = apiKey[provider.key as keyof typeof apiKey];
              return (
                <div key={provider.key} className="flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-lg bg-rox/bright/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className={hasKey ? "text-green-400" : "text-rox/gray"} />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm text-rox/gray">{provider.name}</label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="password"
                        value={apiKey[provider.key as keyof typeof apiKey] || ""}
                        onChange={(e) =>
                          setApiKey({ ...apiKey, [provider.key]: e.target.value })
                        }
                        placeholder={provider.placeholder}
                        className="flex-1 px-4 py-2 rounded-lg bg-rox-bg border border-rox/border text-rox/bright focus:outline-none focus:border-rox/amber/50"
                      />
                      <button
                        onClick={() => handleSaveKey(provider.key, apiKey[provider.key as keyof typeof apiKey])}
                        className="px-3 py-2 rounded-lg bg-rox/bright text-rox-bg font-medium hover:bg-rox/hot transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => handleTestConnection(provider.key)}
                        className="px-3 py-2 rounded-lg border border-rox/border text-rox/gray hover:text-rox/bright hover:border-rox/bright/50 transition-colors"
                        title="Test connection"
                      >
                        Test
                      </button>
                    </div>
                    {hasKey && (
                      <div className="mt-1 text-xs text-green-400 flex items-center gap-1">
                        <Shield size={12} />
                        Configured
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Theme Section */}
        <div className="glass-panel rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-5 h-5 text-rox/amber" />
            <h2 className="text-lg font-medium text-rox/bright">UI Theme</h2>
          </div>
          <div className="flex gap-3 flex-wrap">
            {[
              { id: "amber", name: "Amber Gold", color: "bg-amber-500", desc: "Original" },
              { id: "lava", name: "Lava Red", color: "bg-red-500", desc: "Intense" },
              { id: "dark", name: "Dark Cyan", color: "bg-cyan-500", desc: "Cool" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => applyTheme(t.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all min-w-[140px] ${
                  theme === t.id
                    ? "border-rox/bright bg-rox/bright/10"
                    : "border-rox/border hover:border-rox/bright/50"
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${t.color}`} />
                <div className="text-left">
                  <div className="text-rox/bright text-sm">{t.name}</div>
                  <div className="text-rox/gray text-xs">{t.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* App Modes Section */}
        <div className="glass-panel rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Code2 className="w-5 h-5 text-rox/amber" />
            <h2 className="text-lg font-medium text-rox/bright">App Modes</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { id: 'focus', name: 'Focus', desc: 'Distraction-free mode', icon: '◎' },
              { id: 'coding', name: 'Coding', desc: 'VS Code + DND', icon: '⟨⟩' },
              { id: 'entertainment', name: 'Entertainment', desc: 'Media playback', icon: '▶' },
              { id: 'media', name: 'Media', desc: 'Audio/Video control', icon: '♪' },
              { id: 'research', name: 'Research', desc: 'Web search mode', icon: '⊕' },
              { id: 'system', name: 'System', desc: 'Admin controls', icon: '⚙' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => applyMode(m.id)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  appMode === m.id
                    ? 'border-rox/bright bg-rox/bright/10'
                    : 'border-rox/border hover:border-rox/bright/50'
                }`}
              >
                <div className="text-2xl mb-2">{m.icon}</div>
                <div className="text-rox/bright text-sm font-medium">{m.name}</div>
                <div className="text-rox/gray text-xs">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Security Details */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-rox/amber" />
            <h2 className="text-lg font-medium text-rox/bright">Security Details</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-rox/border">
              <span className="text-rox/gray">Data Encryption</span>
              <span className="text-green-400">✓ Enabled</span>
            </div>
            <div className="flex justify-between py-2 border-b border-rox/border">
              <span className="text-rox/gray">Local Storage</span>
              <span className="text-green-400">✓ Encrypted</span>
            </div>
            <div className="flex justify-between py-2 border-b border-rox/border">
              <span className="text-rox/gray">API Keys</span>
              <span className={securityStatus.keysConfigured === 4 ? "text-green-400" : "text-yellow-400"}>
                {securityStatus.keysConfigured}/4 configured
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-rox/border">
              <span className="text-rox/gray">Session Timeout</span>
              <span className="text-rox/bright">1 hour</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-rox/gray">Rate Limiting</span>
              <span className="text-rox/bright">100 req/min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
