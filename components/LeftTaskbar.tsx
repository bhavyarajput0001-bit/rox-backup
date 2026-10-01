"use client";

import { useState, useEffect } from "react";
import {
  Home, MessageSquare, Settings, Monitor, Brain,
  Lock, Palette, Code2, Film, Search, Cpu
} from "lucide-react";
import { getAppMode, type AppMode } from "@/lib/appModes";

const SECTIONS = [
  { id: 'home', label: 'HOME', icon: Home, href: '/' },
  { id: 'chat', label: 'CHAT', icon: MessageSquare, href: '/dashboard' },
  { id: 'settings', label: 'SETTINGS', icon: Settings, href: '/settings' },
  { id: 'devices', label: 'DEVICES', icon: Monitor, href: '/devices' },
];

const MODES: { id: AppMode; label: string; icon: string }[] = [
  { id: 'focus', label: 'FOCUS', icon: '◎' },
  { id: 'coding', label: 'CODE', icon: '⟨⟩' },
  { id: 'entertainment', label: 'PLAY', icon: '▶' },
  { id: 'media', label: 'MEDIA', icon: '♪' },
  { id: 'research', label: 'SEARCH', icon: '⊕' },
  { id: 'system', label: 'SYS', icon: '⚙' },
];

export default function LeftTaskbar() {
  const [mode, setMode] = useState<AppMode>('focus');
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    setUser(localStorage.getItem('rox_email'));
    setMode(getAppMode());
  }, []);

  const handleModeChange = (m: AppMode) => {
    setMode(m);
    document.body.dataset.appMode = m;
    localStorage.setItem('rox_app_mode', m);
    
    // Mode-specific actions would trigger here
    if (m === 'coding') {
      // Trigger VS Code launch via Hermes bridge or system command
      console.log('Opening coding environment...');
    }
  };

  return (
    <aside className="fixed left-0 top-14 bottom-10 w-16 bg-black/60 backdrop-blur-xl border-r border-rox/border flex flex-col items-center py-4 z-40">
      {/* Main Nav */}
      <nav className="flex flex-col gap-3 w-full px-2">
        {SECTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.id}
              href={item.href}
              title={item.label}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-rox/gray hover:text-rox/bright hover:bg-rox/bright/10 transition-all group"
            >
              <Icon size={18} className="group-hover:scale-110 transition-transform" />
            </a>
          );
        })}
      </nav>

      <div className="w-8 h-px bg-rox/border my-3" />

      {/* Mode Switcher */}
      <div className="flex flex-col gap-2 w-full px-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => handleModeChange(m.id)}
            title={m.label}
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center text-lg font-mono
              transition-all border
              ${mode === m.id 
                ? 'bg-rox/bright/20 border-rox/bright text-rox/bright shadow-glow-sm' 
                : 'border-transparent text-rox/gray hover:text-rox/bright hover:border-rox/bright/30'}
            `}
          >
            {m.icon}
          </button>
        ))}
      </div>

      <div className="mt-auto w-full px-2 flex flex-col gap-2">
        <a
          href="/settings"
          title="Security & Keys"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-rox/gray hover:text-rox/bright hover:bg-rox/bright/10 transition-all"
        >
          <Lock size={18} />
        </a>
        <a
          href="/settings"
          title="UI Theme"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-rox/gray hover:text-rox/bright hover:bg-rox/bright/10 transition-all"
        >
          <Palette size={18} />
        </a>
      </div>

      {/* User indicator */}
      {user && (
        <div className="mt-3 text-[9px] text-rox/gray truncate w-10 text-center">
          {user.split('@')[0].slice(0, 3)}
        </div>
      )}
    </aside>
  );
}
