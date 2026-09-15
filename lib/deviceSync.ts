// Device sync service - enables cross-device control and coordination
import { syncAcrossDevices, getUserData } from "@/lib/googleSheets";

export type DeviceInfo = {
  deviceId: string;
  platform: string;
  browser: string;
  os: string;
  lastSeen: string;
  isActive: boolean;
  capabilities: string[];
};

export type SyncRequest = {
  userId: string;
  action: "join" | "leave" | "command" | "sync";
  device: DeviceInfo;
  payload?: Record<string, unknown>;
};

export type SyncResponse = {
  success: boolean;
  devices: DeviceInfo[];
  message?: string;
  payload?: Record<string, unknown>;
};

// In-memory device registry (in production, use Redis or similar)
const deviceRegistry = new Map<string, DeviceInfo>();
const userDevices = new Map<string, string[]>();

export async function handleSync(request: SyncRequest): Promise<SyncResponse> {
  const { userId, action, device, payload } = request;

  if (action === "join") {
    // Register device
    deviceRegistry.set(device.deviceId, device);
    
    // Add to user's device list
    if (!userDevices.has(userId)) {
      userDevices.set(userId, []);
    }
    if (!userDevices.get(userId)?.includes(device.deviceId)) {
      userDevices.get(userId)?.push(device.deviceId);
    }

    // Sync with Google Sheets
    await syncAcrossDevices(userId, device.platform);

    return {
      success: true,
      devices: Array.from(deviceRegistry.values()),
      message: `Device ${device.deviceId} joined`,
    };
  }

  if (action === "leave") {
    // Remove device
    deviceRegistry.delete(device.deviceId);
    
    const devices = userDevices.get(userId) || [];
    const updated = devices.filter((d) => d !== device.deviceId);
    userDevices.set(userId, updated);

    return {
      success: true,
      devices: Array.from(deviceRegistry.values()),
      message: `Device ${device.deviceId} left`,
    };
  }

  if (action === "command") {
    // Forward command to other devices
    const targetDevices = userDevices.get(userId) || [];
    const responses = await Promise.all(
      targetDevices
        .filter((d) => d !== device.deviceId)
        .map(async (targetId) => {
          const targetDevice = deviceRegistry.get(targetId);
          if (!targetDevice || !targetDevice.isActive) {
            return { deviceId: targetId, success: false, error: "Device offline" };
          }
          // Execute command on target device
          return { deviceId: targetId, success: true, result: payload };
        })
    );

    return {
      success: true,
      devices: Array.from(deviceRegistry.values()),
      message: `Command forwarded to ${responses.filter((r) => r.success).length} devices`,
    };
  }

  if (action === "sync") {
    // Fetch latest user data
    const userData = await getUserData(userId);
    if (!userData) {
      return {
        success: false,
        devices: Array.from(deviceRegistry.values()),
        message: "User not found",
      };
    }

    return {
      success: true,
      devices: Array.from(deviceRegistry.values()),
      message: "Synced",
      payload: userData,
    };
  }

  return {
    success: false,
    devices: Array.from(deviceRegistry.values()),
    message: "Unknown action",
  };
}

export function getActiveDevices(userId: string): DeviceInfo[] {
  const deviceIds = userDevices.get(userId) || [];
  return deviceIds
    .map((id) => deviceRegistry.get(id))
    .filter((d): d is DeviceInfo => d !== undefined);
}

export function clearAllDevices(): void {
  deviceRegistry.clear();
  userDevices.clear();
}
