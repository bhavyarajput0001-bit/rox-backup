// DeviceCard component - shows a connected device

import { useState } from "react";
import type { Device } from "@/lib/devices";

interface Props {
  device: Device;
  onRename?: (name: string) => void;
  onDisconnect?: () => void;
}

const PLATFORM_ICONS: Record<string, string> = {
  macos: "🍎",
  windows: "🪟",
  linux: "🐧",
  ios: "📱",
  android: "🤖",
  web: "🌐",
  default: "💻",
};

export default function DeviceCard({ device, onRename, onDisconnect }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(device.name);

  const platform = device.platform.toLowerCase();
  const icon = PLATFORM_ICONS[platform] ?? PLATFORM_ICONS.default;

  const statusColors: Record<Device["status"], string> = {
    online: "#22c55e",
    idle: "#fbbf24",
    offline: "#6b7280",
  };

  const handleSave = () => {
    setEditing(false);
    onRename?.(name);
  };

  return (
    <div className="device-card">
      <div className="device-card__top">
        <div className="device-card__icon">{icon}</div>
        <div className="device-card__info">
          {editing ? (
            <input
              className="device-card__rename-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
          ) : (
            <span
              className="device-card__name"
              onDoubleClick={() => setEditing(true)}
              title="Double-click to rename"
            >
              {device.name}
            </span>
          )}
          <span className="device-card__platform">{device.platform}</span>
        </div>
        <div
          className="device-card__status"
          style={{ background: statusColors[device.status], boxShadow: `0 0 8px ${statusColors[device.status]}` }}
        />
      </div>
      <div className="device-card__footer">
        <span className="device-card__last">
          Last active: {device.lastActive ? new Date(device.lastActive).toLocaleString() : "Never"}
        </span>
        <div className="device-card__actions">
          {onDisconnect && (
            <button
              className="device-card__btn device-card__btn--disconnect"
              onClick={onDisconnect}
            >
              Disconnect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
