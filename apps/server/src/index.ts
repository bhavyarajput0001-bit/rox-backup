import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { aiOrchestrator } from "./ai/orchestrator.js";
import type { ChatMessage } from "@rox/types";

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // We'll manage CSP manually
  }),
);
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
app.use(express.json({ limit: "10mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    providers: {
      openai: aiOrchestrator.getActiveProvider() === "openai",
      anthropic: aiOrchestrator.getActiveProvider() === "anthropic",
      local: aiOrchestrator.getActiveProvider() === "local",
    },
  });
});

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, provider } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    if (provider) {
      aiOrchestrator.setProvider(provider as any);
    }

    const messages: ChatMessage[] = [
      {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      },
    ];

    const response = await aiOrchestrator.chat(messages);

    res.json({
      response: response.content,
      provider: response.provider,
      model: response.model,
    });
  } catch (error: any) {
    console.error("Chat error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Providers endpoint
app.get("/api/providers", (_req, res) => {
  res.json({
    active: aiOrchestrator.getActiveProvider(),
    available: Array.from(aiOrchestrator["providers"].keys()),
  });
});

// Intent detection
app.post("/api/intent", (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }
  res.json({ intent: aiOrchestrator.detectIntent(text) });
});

// Error handling
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
  },
);

app.listen(PORT, () => {
  console.log(`Rox server running on http://localhost:${PORT}`);
});
