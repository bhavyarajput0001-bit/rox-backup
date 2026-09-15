// Google Sheets integration for Rox
// Uses googleapis for Google Sheets API v4 integration with service account authentication

import { google, sheets_v4 } from 'googleapis';

export type UserData = {
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
};

export type DeviceInfo = {
  deviceId: string;
  userId: string;
  platform: string;
  browser: string;
  os: string;
  ipAddress?: string;
  lastSeen: string;
  isActive: boolean;
  capabilities: string[];
};

/**
 * Google Sheets configuration
 */
const SHEET_ID = process.env.GOOGLE_SHEET_ID || 'ROX_USER_DATA';
const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

/**
 * Initialize Google Sheets client (uses service account or user OAuth)
 * Requires GOOGLE_SERVICE_ACCOUNT and GOOGLE_SERVICE_KEY environment variables
 */
async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  const privateKey = process.env.GOOGLE_SERVICE_KEY;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT;

  if (!privateKey || !email) {
    throw new Error(
      "Google Sheets integration requires GOOGLE_SERVICE_ACCOUNT and GOOGLE_SERVICE_KEY environment variables"
    );
  }

  // Create JWT auth client
  const auth = new google.auth.JWT({
    email,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

async function ensureSheetExists(sheets: sheets_v4.Sheets, sheetName: string, headers: string[]): Promise<void> {
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A1`,
    });
  } catch {
    // Sheet doesn't exist, create it with headers
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers],
      },
    });
  }
}

export async function getUserData(userId: string): Promise<UserData | null> {
  try {
    const sheets = await getSheetsClient();
    await ensureSheetExists(sheets, 'Users', [
      'userId', 'email', 'name', 'device', 'createdAt', 'lastActive',
      'preferences', 'conversationHistory', 'toolsUsed', 'skills'
    ]);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Users!A:J',
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return null;

    // Find user row (skip header)
    const userRow = rows.find((row: string[]) => row[0] === userId);
    if (!userRow) return null;

    return {
      userId: userRow[0],
      email: userRow[1] || undefined,
      name: userRow[2] || undefined,
      device: userRow[3] || 'web',
      createdAt: userRow[4] || new Date().toISOString(),
      lastActive: userRow[5] || new Date().toISOString(),
      preferences: userRow[6] ? JSON.parse(userRow[6]) : {},
      conversationHistory: userRow[7] ? JSON.parse(userRow[7]) : [],
      toolsUsed: userRow[8] ? JSON.parse(userRow[8]) : {},
      skills: userRow[9] ? JSON.parse(userRow[9]) : [],
    };
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}

export async function saveUserData(data: UserData): Promise<void> {
  try {
    const sheets = await getSheetsClient();
    await ensureSheetExists(sheets, 'Users', [
      'userId', 'email', 'name', 'device', 'createdAt', 'lastActive',
      'preferences', 'conversationHistory', 'toolsUsed', 'skills'
    ]);

    // Check if user exists
    const existing = await getUserData(data.userId);
    
    if (existing) {
      // Find row number and update
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'Users!A:A',
      });
      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((row: string[]) => row[0] === data.userId);
      if (rowIndex >= 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `Users!A${rowIndex + 1}:J${rowIndex + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              data.userId,
              data.email || "",
              data.name || "",
              data.device,
              data.createdAt,
              new Date().toISOString(),
              JSON.stringify(data.preferences),
              JSON.stringify(data.conversationHistory.slice(-50)),
              JSON.stringify(data.toolsUsed),
              JSON.stringify(data.skills),
            ]],
          },
        });
        return;
      }
    }

    // Append new user
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Users!A:J',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          data.userId,
          data.email || "",
          data.name || "",
          data.device,
          data.createdAt,
          new Date().toISOString(),
          JSON.stringify(data.preferences),
          JSON.stringify(data.conversationHistory.slice(-50)),
          JSON.stringify(data.toolsUsed),
          JSON.stringify(data.skills),
        ]],
      },
    });
  } catch (error) {
    console.error("Error saving user data:", error);
  }
}

export async function syncAcrossDevices(userId: string, device: string): Promise<UserData | null> {
  const userData = await getUserData(userId);
  if (!userData) return null;

  userData.lastActive = new Date().toISOString();
  userData.device = device;

  await saveUserData(userData);
  return userData;
}

export async function incrementToolUsage(userId: string, toolName: string): Promise<void> {
  const userData = await getUserData(userId);
  if (!userData) return;

  userData.toolsUsed[toolName] = (userData.toolsUsed[toolName] || 0) + 1;
  await saveUserData(userData);
}

export async function addSkillToUser(userId: string, skill: string): Promise<void> {
  const userData = await getUserData(userId);
  if (!userData) return;

  if (!userData.skills.includes(skill)) {
    userData.skills.push(skill);
    await saveUserData(userData);
  }
}

export async function logConversationTurn(
  userId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  const userData = await getUserData(userId);
  if (!userData) return;

  userData.conversationHistory.push({
    role,
    content,
    timestamp: new Date().toISOString(),
  });

  if (userData.conversationHistory.length > 50) {
    userData.conversationHistory = userData.conversationHistory.slice(-50);
  }

  await saveUserData(userData);
}

export async function getDeviceList(userId: string): Promise<string[]> {
  const userData = await getUserData(userId);
  if (!userData) return [];

  return [...new Set([userData.device])];
}

export async function createUserData(
  userId: string,
  device: string,
  options?: { email?: string; name?: string }
): Promise<UserData> {
  const userData: UserData = {
    userId,
    email: options?.email,
    name: options?.name,
    device,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    preferences: {},
    conversationHistory: [],
    toolsUsed: {},
    skills: [],
  };

  await saveUserData(userData);
  return userData;
}

// Device Sessions functions
export async function saveDeviceSession(device: DeviceInfo): Promise<void> {
  try {
    const sheets = await getSheetsClient();
    await ensureSheetExists(sheets, 'DeviceSessions', [
      'deviceId', 'userId', 'platform', 'browser', 'os', 'ipAddress', 'lastSeen', 'isActive', 'capabilities'
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'DeviceSessions!A:I',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          device.deviceId,
          device.userId,
          device.platform,
          device.browser,
          device.os,
          device.ipAddress || '',
          device.lastSeen,
          device.isActive ? 'true' : 'false',
          JSON.stringify(device.capabilities),
        ]],
      },
    });
  } catch (error) {
    console.error("Error saving device session:", error);
  }
}

export async function getDeviceSessions(userId: string): Promise<DeviceInfo[]> {
  try {
    const sheets = await getSheetsClient();
    await ensureSheetExists(sheets, 'DeviceSessions', [
      'deviceId', 'userId', 'platform', 'browser', 'os', 'ipAddress', 'lastSeen', 'isActive', 'capabilities'
    ]);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'DeviceSessions!A:I',
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return [];

    return rows
      .slice(1) // skip header
      .filter((row: string[]) => row[1] === userId)
      .map((row: string[]) => ({
        deviceId: row[0],
        userId: row[1],
        platform: row[2],
        browser: row[3],
        os: row[4],
        ipAddress: row[5] || undefined,
        lastSeen: row[6],
        isActive: row[7] === 'true',
        capabilities: row[8] ? JSON.parse(row[8]) : [],
      }));
  } catch (error) {
    console.error("Error fetching device sessions:", error);
    return [];
  }
}

export { SHEET_ID, SPREADSHEET_URL };