"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Monitor, Smartphone, Laptop, Activity, Plus } from "lucide-react";

interface Device {
  deviceId: string;
  platform: string;
  browser: string;
  os: string;
  lastSeen: string;
  isActive: boolean;
  capabilities: string[];
}

export default function DevicesPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("rox_token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Fetch devices from API or localStorage
    const storedDevices = localStorage.getItem("rox_devices");
    if (storedDevices) {
      setDevices(JSON.parse(storedDevices));
    } else {
      // Add current device
      const currentDevice: Device = {
        deviceId: generateDeviceId(),
        platform: detectPlatform(),
        browser: detectBrowser(),
        os: detectOS(),
        lastSeen: new Date().toISOString(),
        isActive: true,
        capabilities: ["chat", "tools", "memory"],
      };
      setDevices([currentDevice]);
      localStorage.setItem("rox_devices", JSON.stringify([currentDevice]));
    }
    setLoading(false);
  }, [router]);

  const generateDeviceId = () => {
    return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const detectPlatform = () => {
    if (navigator.userAgent.includes("Mac")) return "macOS";
    if (navigator.userAgent.includes("Windows")) return "Windows";
    if (navigator.userAgent.includes("Android")) return "Android";
    if (navigator.userAgent.includes("iOS")) return "iOS";
    return "Web";
  };

  const detectBrowser = () => {
    if (navigator.userAgent.includes("Chrome")) return "Chrome";
    if (navigator.userAgent.includes("Safari")) return "Safari";
    if (navigator.userAgent.includes("Firefox")) return "Firefox";
    return "Unknown";
  };

  const detectOS = () => {
    if (navigator.userAgent.includes("Mac")) return "macOS";
    if (navigator.userAgent.includes("Windows NT")) return "Windows";
    if (navigator.userAgent.includes("Linux")) return "Linux";
    if (navigator.userAgent.includes("Android")) return "Android";
    if (navigator.userAgent.includes("iOS")) return "iOS";
    return "Unknown";
  };

  const handleRemoveDevice = (deviceId: string) => {
    const updated = devices.filter((d) => d.deviceId !== deviceId);
    setDevices(updated);
    localStorage.setItem("rox_devices", JSON.stringify(updated));
  };

  const getDeviceIcon = (platform: string) => {
    if (platform.includes("iOS") || platform.includes("Android")) {
      return <Smartphone className="w-5 h-5" />;
    }
    if (platform.includes("Mac") || platform.includes("Windows")) {
      return <Monitor className="w-5 h-5" />;
    }
    return <Laptop className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-rox-bg flex items-center justify-center">
        <div className="text-rox-gray">Loading...</div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-light text-rox-bright">Devices</h1>
          <button
            onClick={() => {
              const newDevice: Device = {
                deviceId: generateDeviceId(),
                platform: detectPlatform(),
                browser: detectBrowser(),
                os: detectOS(),
                lastSeen: new Date().toISOString(),
                isActive: true,
                capabilities: ["chat", "tools", "memory"],
              };
              const updated = [...devices, newDevice];
              setDevices(updated);
              localStorage.setItem("rox_devices", JSON.stringify(updated));
            }}
            className="ml-auto px-4 py-2 rounded-lg bg-rox-amber text-rox-bg font-medium hover:bg-rox-gold transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Device
          </button>
        </div>

        {/* Devices List */}
        <div className="space-y-4">
          {devices.map((device) => (
            <div
              key={device.deviceId}
              className="glass-panel rounded-2xl p-6 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-rox-amber/10 flex items-center justify-center">
                {getDeviceIcon(device.platform)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-rox-bright font-medium">
                    {device.platform} {device.browser}
                  </h3>
                  {device.isActive && (
                    <span className="flex items-center gap-1 text-xs text-rox-green">
                      <Activity className="w-3 h-3" />
                      Active
                    </span>
                  )}
                </div>
                <p className="text-sm text-rox-gray mt-1">
                  {device.os} • Last seen: {new Date(device.lastSeen).toLocaleString()}
                </p>
                <div className="flex gap-2 mt-2">
                  {device.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="text-xs px-2 py-1 rounded-full bg-rox-surface border border-rox-border text-rox-gray"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleRemoveDevice(device.deviceId)}
                className="px-3 py-2 rounded-lg text-rox-red hover:bg-rox-red/10 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-8 glass-panel rounded-2xl p-6">
          <h2 className="text-lg font-medium text-rox-bright mb-4">Statistics</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-light text-rox-amber">{devices.length}</div>
              <div className="text-sm text-rox-gray">Connected Devices</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-light text-rox-amber">
                {devices.filter((d) => d.isActive).length}
              </div>
              <div className="text-sm text-rox-gray">Active Now</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-light text-rox-amber">
                {devices.flatMap((d) => d.capabilities).length}
              </div>
              <div className="text-sm text-rox-gray">Capabilities</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
