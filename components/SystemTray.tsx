"use client";

import { useEffect, useState } from "react";
import {
  Wifi,
  WifiOff,
  Bluetooth,
  BluetoothOff,
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Battery,
  Cpu,
  HardDrive,
  Clock,
  Brain,
} from "lucide-react";

interface SystemTrayProps {
  onNavigate?: (path: string) => void;
}

export default function SystemTray({ onNavigate }: SystemTrayProps) {
  const [clock, setClock] = useState("");
  const [date, setDate] = useState("");
  const [wifi, setWifi] = useState(true);
  const [bluetooth, setBluetooth] = useState(true);
  const [volume, setVolume] = useState(70);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [battery, setBattery] = useState(100);
  const [charging, setCharging] = useState(false);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [activeApp, setActiveApp] = useState("");
  const [musicTab, setMusicTab] = useState<"home" | "search" | "library" | "playing" | "artists" | "albums">("home");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setDate(now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Get battery info if available
    const navigatorAny = navigator as unknown as {
      getBattery?: () => Promise<{
        level: number;
        charging: boolean;
        addEventListener: (ev: string, fn: () => void) => void;
      }>;
    };
    if (navigatorAny.getBattery) {
      navigatorAny.getBattery().then((battery) => {
        const update = () => {
          setBattery(Math.round(battery.level * 100));
          setCharging(battery.charging);
        };
        update();
        battery.addEventListener("levelchange", update);
        battery.addEventListener("chargingchange", update);
      });
    }
  }, []);

  const togglePanel = (name: string) => {
    setOpenPanel(openPanel === name ? null : name);
  };

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;
  const WifiIcon = wifi ? Wifi : WifiOff;
  const BluetoothIcon = bluetooth ? Bluetooth : BluetoothOff;
  const batteryColor =
    battery > 50 ? "text-green-400" : battery > 20 ? "text-rox/bright" : "text-red-400";

  const musicItems: Record<string, { title: string; artist: string; duration: string }[]> = {
    home: [
      { title: "Neural Drive", artist: "Rox AI", duration: "3:42" },
      { title: "Orbital Dreams", artist: "Synthwave", duration: "4:15" },
      { title: "Midnight Protocol", artist: "Cyberpunk", duration: "5:02" },
    ],
    search: [
      { title: "Search Results", artist: "Type to search", duration: "" },
    ],
    library: [
      { title: "All Songs", artist: "128 tracks", duration: "" },
      { title: "Downloads", artist: "32 tracks", duration: "" },
      { title: "Favorites", artist: "18 tracks", duration: "" },
    ],
    playing: [
      { title: "Neural Drive", artist: "Rox AI", duration: "3:42" },
    ],
    artists: [
      { title: "Rox AI", artist: "5 albums", duration: "" },
      { title: "Synthwave Collective", artist: "12 albums", duration: "" },
    ],
    albums: [
      { title: "Neural Vol.1", artist: "Rox AI · 2026", duration: "12 tracks" },
      { title: "Orbital", artist: "Synthwave · 2025", duration: "10 tracks" },
    ],
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 rox-tray">
      {/* Active app display */}
      <div className="flex items-center justify-between px-4 h-10">
        {/* Left: active app or quick actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onNavigate?.("/")}
            className={`px-3 py-1 rounded-md text-xs border transition-all ${
              activeApp === "home"
                ? "bg-rox/bright/20 text-rox/bright border-rox/bright/40"
                : "border-transparent text-rox/gray hover:text-rox/bright hover:bg-white/5"
            }`}
          >
            ⌂ Home
          </button>
          <button
            onClick={() => { setActiveApp("music"); togglePanel("music"); }}
            className={`px-3 py-1 rounded-md text-xs border transition-all ${
              openPanel === "music"
                ? "bg-rox/bright/20 text-rox/bright border-rox/bright/40"
                : "border-transparent text-rox/gray hover:text-rox/bright hover:bg-white/5"
            }`}
          >
            ♪ Music
          </button>
          <button
            onClick={() => onNavigate?.("/dashboard")}
            className={`px-3 py-1 rounded-md text-xs border transition-all ${
              activeApp === "dashboard"
                ? "bg-rox/bright/20 text-rox/bright border-rox/bright/40"
                : "border-transparent text-rox/gray hover:text-rox/bright hover:bg-white/5"
            }`}
          >
            ⌨ Chat
          </button>
        </div>

        {/* Right: system indicators */}
        <div className="flex items-center gap-0.5">
          {/* Battery */}
          <button
            onClick={() => togglePanel("battery")}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/5 text-rox/gray hover:text-rox/bright transition-all"
            title={`Battery ${battery}%${charging ? " (charging)" : ""}`}
          >
            <Battery size={15} className={batteryColor} />
            <span className="text-[10px] tabular-nums">{battery}%{charging ? "⚡" : ""}</span>
          </button>

          {/* Volume */}
          <button
            onClick={() => togglePanel("volume")}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/5 text-rox/gray hover:text-rox/bright transition-all"
            title="Volume"
          >
            <VolumeIcon size={15} />
            <span className="text-[10px] tabular-nums">{muted ? "M" : volume}%</span>
          </button>

          {/* Bluetooth */}
          <button
            onClick={() => { setBluetooth(!bluetooth); togglePanel("bluetooth"); }}
            className={`px-2 py-1 rounded-md hover:bg-white/5 transition-all ${
              bluetooth ? "text-rox/bright" : "text-rox/gray hover:text-rox/bright"
            }`}
            title={bluetooth ? "Bluetooth On" : "Bluetooth Off"}
          >
            <BluetoothIcon size={15} />
          </button>

          {/* WiFi */}
          <button
            onClick={() => { setWifi(!wifi); togglePanel("wifi"); }}
            className={`px-2 py-1 rounded-md hover:bg-white/5 transition-all ${
              wifi ? "text-rox/bright" : "text-rox/gray hover:text-rox/bright"
            }`}
            title={wifi ? "WiFi Connected" : "WiFi Off"}
          >
            <WifiIcon size={15} />
          </button>

          {/* Clock + date */}
          <button
            onClick={() => togglePanel("system")}
            className="flex flex-col items-end px-2 py-0.5 rounded-md hover:bg-white/5 transition-all"
            title="System info"
          >
            <span className="text-xs font-semibold tabular-nums text-rox/bright leading-tight">{clock}</span>
            <span className="text-[9px] text-rox/gray leading-tight">{date}</span>
          </button>
        </div>
      </div>

      {/* Panel overlays */}
      {openPanel && (
        <>
          <div className="absolute inset-0 -z-10" onClick={() => setOpenPanel(null)} />
          <div className="absolute bottom-12 right-0 w-72 glass-panel rounded-xl border border-rox/bright/20 shadow-2xl p-4 animate-slide-up">
            {openPanel === "music" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-rox/bright tracking-wide">♪ MUSIC</h3>
                  <div className="flex gap-1">
                    {(["home", "search", "library", "playing"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setMusicTab(tab)}
                        className={`px-2 py-0.5 text-[9px] rounded uppercase tracking-wider transition-all ${
                          musicTab === tab
                            ? "bg-rox/bright/20 text-rox/bright"
                            : "text-rox/gray hover:text-rox/bright"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Now playing */}
                <div className="mb-3 p-2 rounded-lg bg-rox/bright/10 border border-rox/bright/20">
                  <div className="text-xs font-semibold text-rox/bright">Neural Drive</div>
                  <div className="text-[10px] text-rox/gray">Rox AI</div>
                  <div className="mt-1 h-1 bg-rox/bright/20 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-rox/bright rounded-full" />
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-2">
                    <button className="p-1 hover:bg-white/10 rounded-full text-rox/gray hover:text-rox/bright"><SkipBack size={14} /></button>
                    <button
                      onClick={() => setPlaying(!playing)}
                      className="p-2 bg-rox/bright/20 hover:bg-rox/bright/30 rounded-full text-rox/bright transition-all"
                    >
                      {playing ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button className="p-1 hover:bg-white/10 rounded-full text-rox/gray hover:text-rox/bright"><SkipForward size={14} /></button>
                  </div>
                </div>

                {/* Track list */}
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {musicItems[musicTab].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-white/5 cursor-pointer transition-all"
                      onClick={() => setMusicTab("playing")}
                    >
                      <div>
                        <div className="text-xs text-rox/bright/90">{item.title}</div>
                        <div className="text-[10px] text-rox/gray">{item.artist}</div>
                      </div>
                      <span className="text-[9px] text-rox/gray">{item.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {openPanel === "wifi" && (
              <div>
                <h3 className="text-sm font-bold text-rox/bright tracking-wide mb-2">📶 WIFI</h3>
                <div className="space-y-1">
                  {["ROX_HOME_5G", "ROX_Guest", "NeuralMesh", "CyberLink"].map((net, i) => (
                    <div
                      key={net}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition-all ${
                        i === 0 ? "bg-rox/bright/15 text-rox/bright" : "hover:bg-white/5 text-rox/gray hover:text-rox/bright"
                      }`}
                    >
                      <span>{net}</span>
                      {i === 0 && <span className="text-[9px] text-rox/bright/70">CONNECTED</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {openPanel === "bluetooth" && (
              <div>
                <h3 className="text-sm font-bold text-rox/bright tracking-wide mb-2">🔵 BLUETOOTH</h3>
                <div className={`text-xs mb-2 ${bluetooth ? "text-green-400" : "text-rox/gray"}`}>
                  {bluetooth ? "On — Discoverable" : "Off"}
                </div>
                {bluetooth && (
                  <div className="space-y-1">
                    {["AirPods Pro", "ROX Keyboard", "MX Master 3", "JBL Speaker"].map((dev, i) => (
                      <div
                        key={dev}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition-all ${
                          i === 0 ? "bg-rox/bright/15 text-rox/bright" : "hover:bg-white/5 text-rox/gray hover:text-rox/bright"
                        }`}
                      >
                        <span>{dev}</span>
                        {i === 0 && <span className="text-[9px] text-green-400">PAIRED</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {openPanel === "volume" && (
              <div>
                <h3 className="text-sm font-bold text-rox/bright tracking-wide mb-2">🔊 VOLUME</h3>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => { setVolume(Number(e.target.value)); setMuted(false); }}
                  className="w-full accent-rox/bright"
                />
                <div className="flex justify-between mt-1 text-[10px] text-rox/gray">
                  <span>0%</span>
                  <span>{volume}%</span>
                  <span>100%</span>
                </div>
                <button
                  onClick={() => setMuted(!muted)}
                  className="mt-2 w-full px-3 py-1.5 rounded-lg text-xs bg-rox/bright/10 hover:bg-rox/bright/20 text-rox/bright transition-all"
                >
                  {muted ? "Unmute" : "Mute"}
                </button>
              </div>
            )}

            {openPanel === "battery" && (
              <div>
                <h3 className="text-sm font-bold text-rox/bright tracking-wide mb-2">🔋 BATTERY</h3>
                <div className="flex items-center gap-3">
                  <Battery size={40} className={batteryColor} />
                  <div>
                    <div className="text-2xl font-bold text-rox/bright tabular-nums">{battery}%</div>
                    <div className="text-xs text-rox/gray">{charging ? "⚡ Charging" : "On battery"}</div>
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-rox/bright/20 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${batteryColor}`} style={{ width: `${battery}%` }} />
                </div>
              </div>
            )}

            {openPanel === "system" && (
              <div>
                <h3 className="text-sm font-bold text-rox/bright tracking-wide mb-2">🖥 SYSTEM</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-rox/gray">
                    <Cpu size={14} /> Apple M3 · 8GB
                  </div>
                  <div className="flex items-center gap-2 text-rox/gray">
                    <HardDrive size={14} /> 76 GB free
                  </div>
                  <div className="flex items-center gap-2 text-rox/gray">
                    <Clock size={14} /> {date} {clock}
                  </div>
                  <div className="flex items-center gap-2 text-rox/gray">
                    <Brain size={14} /> Rox v3.0 · Hermes Brain
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}