// Google Sheets integration for Rox
// User data sync across devices

const SHEET_ID = process.env.GOOGLE_SHEET_ID || "ROX_USER_DATA";
const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

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

// Initialize Google Sheets client (uses service account or user OAuth)
function getSheetsClient() {
  // Check for environment variables
  const privateKey = process.env.GOOGLE_SERVICE_KEY;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT;

  if (!privateKey || !email) {
    throw new Error(
      "Google Sheets integration requires GOOGLE_SERVICE_ACCOUNT and GOOGLE_SERVICE_KEY environment variables"
    );
  }

  // In production, use the actual Google API client
  // For now, return a mock that logs what would happen
  console.log(`Connecting to Google Sheets: ${SPREADSHEET_URL}`);
  return {
    sheets: {
      values: {
        append: async (_params: any) => {
          // Actual implementation would use Google Sheets API v4
          return { data: { spreadsheetId: SHEET_ID } };
        },
        get: async (_params: any) => {
          return { data: { values: [] } };
        },
      },
    },
  };
}

export async function getUserData(userId: string): Promise<UserData | null> {
  try {
    const sheets = getSheetsClient();
    const response = await sheets.sheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Users!A:J",
    });

    const rows = response.data.values;
    if (!rows) return null;

    // Find user row
    const userRow = rows.find((row: string[]) => row[0] === userId);
    if (!userRow) return null;

    return {
      userId: userRow[0],
      email: userRow[1],
      name: userRow[2],
      device: userRow[3],
      createdAt: userRow[4],
      lastActive: userRow[5],
      preferences: userRow[6] ? JSON.parse(userRow[6]) : {},
      conversationHistory: userRow[7]
        ? JSON.parse(userRow[7])
        : [],
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
    const sheets = getSheetsClient();
    
    // Append new user (simplified - no update for now)
    await sheets.sheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Users!A:J",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
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
          ],
        ],
      },
    });
  } catch (error) {
    console.error("Error saving user data:", error);
  }
}

export async function syncAcrossDevices(userId: string, device: string): Promise<UserData | null> {
  const userData = await getUserData(userId);
  if (!userData) return null;

  // Update last active
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

  // Keep only last 50 turns to prevent sheet bloat
  if (userData.conversationHistory.length > 50) {
    userData.conversationHistory = userData.conversationHistory.slice(-50);
  }

  await saveUserData(userData);
}

export async function getDeviceList(userId: string): Promise<string[]> {
  const userData = await getUserData(userId);
  if (!userData) return [];

  // Return unique devices from history
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

export { SHEET_ID, SPREADSHEET_URL };
