"use client";

import { useEffect, useState } from "react";
import { Battery, Volume2, Volume1, VolumeX, Bluetooth, BluetoothOff, Wifi, WifiOff, Cpu, HardDrive, Clock, Brain } from "lucide-react";

interface SystemTrayProps {
  onNavigate?: (path: string) => void;
}

/**
 * SystemTray – Bottom tray with glass‑morphism panels.
 */
export default function SystemTray({ onNavigate }: SystemTrayProps) {
  const [clock, setClock] = useState("");
  const [date, setDate] = useState("");
  const [volume, setVolume] = useState(70);
  const [muted, setMuted] = useState(false);
  const [battery, setBattery] = useState(100);
  const [charging, setCharging] = useState(false);
  const [bluetooth, setBluetooth] = useState(false);
  const [wifi, setWifi] = useState(true);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [mediaPlaying, setMediaPlaying] = useState(false);

  // Update clock every second
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setDate(now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }));
    };
    updateClock();
    const id = setInterval(updateClock, 1000);
    return () => clearInterval(id);
  }, []);

  // Get battery info if available
  useEffect(() => {
    const getBattery = async () => {
      const nav: any = navigator;
      if (nav?.getBattery) {
        const b = await nav.getBattery();
        const update = () => {
          setBattery(Math.round(b.level * 100));
          setCharging(b.charging);
        };
        update();
        b.addEventListener("levelchange", update);
        b.addEventListener("chargingchange", update);
      }
    };
    getBattery();
  }, []);

  // Poll for media playback changes
  useEffect(() => {
    const checkMedia = () => {
      const playing = document.body.dataset.mediaPlaying === 'true';
      setMediaPlaying(playing);
    };
    checkMedia();
    const interval = setInterval(checkMedia, 2000);
    return () => clearInterval(interval);
  }, []);

  const batteryColor = battery > 50 ? "text-green-400" : battery > 20 ? "text-rox/bright" : "text-red-400";
  const togglePanel = (name: string) => setOpenPanel(openPanel === name ? null : name);

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 rox-tray bg-black/15 backdrop-blur-xl">
      {/* Main tray bar */}
      <div className="flex items-center justify-between px-4 h-10">
        {/* Left – media indicator */}
        <div className="flex items-center gap-2">
          {mediaPlaying && (
            <div className="media-playing-indicator">
              <div className="dot" />
              <span className="text-xs text-rox/bright">Playing</span>
            </div>
          )}
        </div>

        {/* Right – system indicators */}
        <div className="flex items-center gap-0.5">
          {/* Battery */}
          <button
            onClick={() => togglePanel("battery")}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/5 transition-all"
            title={`Battery ${battery}%${charging ? " (charging)" : ""}`}
          >
            <Battery size={15} className={batteryColor} />
            <span className="text-[10px] tabular-nums">{battery}%{charging ? "⚡" : ""}</span>
          </button>

          {/* Volume */}
          <button
            onClick={() => togglePanel("volume")}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/5 transition-all"
            title="Volume"
          >
            {muted ? <VolumeX size={15} /> : volume > 50 ? <Volume2 size={15} /> : <Volume1 size={15} />}
            <span className="text-[10px] tabular-nums">{muted ? "M" : volume}%</span>
          </button>

          {/* Bluetooth */}
          <button
            onClick={() => { setBluetooth(!bluetooth); togglePanel("bluetooth"); }}
            className="px-2 py-1 rounded-md hover:bg-white/5 transition-all"
            title={bluetooth ? "Bluetooth On" : "Bluetooth Off"}
          >
            {bluetooth ? <Bluetooth size={15} /> : <BluetoothOff size={15} />}
          </button>

          {/* Wi‑Fi */}
          <button
            onClick={() => { setWifi(!wifi); togglePanel("wifi"); }}
            className="px-2 py-1 rounded-md hover:bg-white/5 transition-all"
            title={wifi ? "WiFi Connected" : "WiFi Off"}
          >
            {wifi ? <Wifi size={15} /> : <WifiOff size={15} />}
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

      {/* Panels */}
      {openPanel && (
        <div className="absolute bottom-12 right-0 w-72">
          <div className={`glass-panel rounded-xl border border-rox/bright/20 shadow-2xl p-4
                      transition-opacity duration-300 ${openPanel === "battery" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
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
                  <div className={`${batteryColor} w-full`} style={{ width: `${battery}%` }} />
                </div>
              </div>
            )}
            {openPanel === "volume" && (
              <div>
                <h3 className="text-sm font-bold text-rox/bright tracking-wide mb-2">🔊 VOLUME</h3>
                <input type="range" min={0} max={100} value={volume}
                  onChange={(e) => { setVolume(Number(e.target.value)); setMuted(false); }}
                  className="w-full accent-rox/bright" />
                <div className="flex justify-between mt-1 text-[10px] text-rox/gray">
                  <span>0%</span><span>{volume}%</span><span>100%</span>
                </div>
                <button onClick={() => setMuted(!muted)}
                  className="mt-2 w-full px-3 py-1.5 rounded-lg text-xs bg-rox/bright/10 hover:bg-rox/bright/20 text-rox/bright transition-all">
                  {muted ? "Unmute" : "Mute"}
                </button>
              </div>
            )}
            {openPanel === "system" && (
              <div>
                <h3 className="text-sm font-bold text-rox/bright tracking-wide mb-2">🖥 SYSTEM</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-rox/gray"><Cpu size={14} /> Apple M3 · 8GB</div>
                  <div className="flex items-center gap-2 text-rox/gray"><HardDrive size={14} /> 76 GB free</div>
                  <div className="flex items-center gap-2 text-rox/gray"><Clock size={14} /> {date} {clock}</div>
                  <div className="flex items-center gap-2 text-rox/gray"><Brain size={14} /> Rox v3.0 · Hermes Brain</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
