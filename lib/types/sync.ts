// Type definitions for Google Sheets + Device Sync system

/** User data structure stored in Google Sheets */
export interface UserData {
  userId: string;
  email?: string;
  name?: string;
  device: string;
  createdAt: string;
  lastActive: string;
  preferences: Record<string, unknown>;
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>;
  toolsUsed: Record<string, number>;
  skills: string[];
}

/** Synchronization request types */
export type SyncRequest = {
  userId: string;
  action: "join" | "leave" | "command" | "sync";
  device: {
    deviceId: string;
    platform: string;
    browser: string;
    os: string;
    lastSeen: string;
    isActive: boolean;
    capabilities: string[];
  };
  payload?: Record<string, unknown>;
};

/** Synchronization response types */
export type SyncResponse = {
  success: boolean;
  devices: Array<{
    deviceId: string;
    platform: string;
    browser: string;
    os: string;
    lastSeen: string;
    isActive: boolean;
    capabilities: string[];
  }>;
  message?: string;
  payload?: Record<string, unknown>;
};

/** Device information stored in Google Sheets */
export interface DeviceInfo {
  deviceId: string;
  platform: string;
  browser: string;
  os: string;
  lastSeen: string;
  isActive: boolean;
  capabilities: string[];
}

/** Active devices for a user */
export interface ActiveDevices {
  [userId: string]: DeviceInfo[];
}

/** Rate limiting configuration */
export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  windowInSeconds: number;
}
