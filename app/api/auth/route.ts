import { NextResponse } from "next/server";
import crypto from "crypto";

// Simple JWT for user authentication
function signToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) })).toString("base64url");
  const signature = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "rox-secret-key-change-in-production")
    .update(`${header}.${payloadB64}`)
    .digest("base64url");
  return `${header}.${payloadB64}.${signature}`;
}

function verifyToken(token: string): object | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;
    const expected = crypto
      .createHmac("sha256", process.env.JWT_SECRET || "rox-secret-key-change-in-production")
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");

    if (expected !== signature) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    
    // Check expiration (24 hours)
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, device } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Load users from file (simple storage)
    const usersFile = "./data/users.json";
    const fs = await import("fs/promises");
    let users: Array<{ email: string; passwordHash: string; name?: string; devices: string[] }> = [];
    
    try {
      const data = await fs.readFile(usersFile, "utf-8");
      users = JSON.parse(data);
    } catch {
      // Users file doesn't exist yet
    }

    // Check if user exists
    const existingUser = users.find((u) => u.email === email);

    if (existingUser) {
      // Verify password
      const passwordHash = crypto
        .createHmac("sha256", process.env.PASSWORD_SALT || "rox-salt")
        .update(password)
        .digest("hex");

      if (existingUser.passwordHash !== passwordHash) {
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
      }

      // Add device
      if (!existingUser.devices.includes(device)) {
        existingUser.devices.push(device);
      }

      // Update user file
      await fs.writeFile(usersFile, JSON.stringify(users, null, 2));

      // Create token
      const token = signToken({
        email,
        name: existingUser.name,
        sub: email,
      });

      return NextResponse.json({
        token,
        user: {
          email,
          name: existingUser.name,
          devices: existingUser.devices,
        },
      });
    } else {
      // Register new user
      const passwordHash = crypto
        .createHmac("sha256", process.env.PASSWORD_SALT || "rox-salt")
        .update(password)
        .digest("hex");

      const newUser = {
        email,
        passwordHash,
        name,
        devices: [device || "web"],
      };

      users.push(newUser);
      await fs.writeFile(usersFile, JSON.stringify(users, null, 2));

      // Create token
      const token = signToken({
        email: newUser.email,
        name: newUser.name,
        sub: newUser.email,
      });

      return NextResponse.json({
        token,
        user: {
          email: newUser.email,
          name: newUser.name,
          devices: newUser.devices,
        },
        isNewUser: true,
      });
    }
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  return NextResponse.json({ user: payload });
}
