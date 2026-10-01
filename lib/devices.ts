// Device management utilities

export interface Device {
  id: string;
  name: string;
  platform: string;
  lastActive: string;
  status: "online" | "offline" | "idle";
  user?: string;
}

const STORAGE_KEY = "rox_devices";

export function saveDevices(devices: Device[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
  } catch (e) {
    console.error("Failed to save devices:", e);
  }
}

export function getDevices(): Device[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addDevice(device: Omit<Device, "id">): Device {
  const devices = getDevices();
  const newDevice: Device = {
    ...device,
    id: crypto.randomUUID?.() ?? Date.now().toString(36),
  };
  devices.push(newDevice);
  saveDevices(devices);
  return newDevice;
}

export function updateDeviceStatus(id: string, status: Device["status"]): void {
  const devices = getDevices();
  const idx = devices.findIndex((d) => d.id === id);
  if (idx >= 0) {
    devices[idx] = { ...devices[idx], status, lastActive: new Date().toISOString() };
    saveDevices(devices);
  }
}

export function removeDevice(id: string): void {
  const devices = getDevices().filter((d) => d.id !== id);
  saveDevices(devices);
}

export function updateDeviceName(id: string, name: string): void {
  const devices = getDevices();
  const idx = devices.findIndex((d) => d.id === id);
  if (idx >= 0) {
    devices[idx] = { ...devices[idx], name };
    saveDevices(devices);
  }
}
