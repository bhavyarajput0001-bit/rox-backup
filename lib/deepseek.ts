/**
 * DeepSeek Harness Integration
 * 
 * Routes heavy reasoning tasks to DeepSeek Harness when available.
 * Falls back to Omniroute/FreeLLM.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";

const execAsync = promisify(exec);

const DS_DEFAULT_URL = "http://127.0.0.1:3080";
const DS_PRODUCTION_URL = "https://api.deepseek.com/v1";

export type DeepSeekConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  available: boolean;
};

export type DSResponse = {
  success: boolean;
  reply: string;
  latencyMs: number;
  model: string;
  provider: string;
};

export async function getDeepSeekConfig(): Promise<DeepSeekConfig> {
  const baseUrl = process.env.DEEPSEEK_BASE_URL || DS_DEFAULT_URL;
  const apiKey = process.env.DEEPSEEK_API_KEY || "";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  
  // Check if local server is running
  let available = false;
  try {
    await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(2000) });
    available = true;
  } catch {
    // Try production
    try {
      if (apiKey) {
        const resp = await fetch(`${DS_PRODUCTION_URL}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(2000),
        });
        available = resp.ok;
      }
    } catch {}
  }
  
  return { baseUrl, apiKey, model, available };
}

export async function callDeepSeek(messages: Array<{role: string; content: string}>, config?: DeepSeekConfig): Promise<DSResponse> {
  const cfg = config || await getDeepSeekConfig();
  const startTime = Date.now();
  
  // Use local server if available
  if (cfg.available && cfg.baseUrl !== DS_PRODUCTION_URL) {
    try {
      const resp = await fetch(`${cfg.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: cfg.model,
          messages,
          max_tokens: 4000,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(30000),
      });
      
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      
      const data = await resp.json();
      const reply = data.choices?.[0]?.message?.content || "";
      
      return {
        success: true,
        reply,
        latencyMs: Date.now() - startTime,
        model: cfg.model,
        provider: "deepseek-local",
      };
    } catch (e) {
      return {
        success: false,
        reply: `DeepSeek local failed: ${e}`,
        latencyMs: Date.now() - startTime,
        model: cfg.model,
        provider: "deepseek-local",
      };
    }
  }
  
  // Fallback to production
  if (!cfg.apiKey) {
    return {
      success: false,
      reply: "No DeepSeek API key configured",
      latencyMs: Date.now() - startTime,
      model: cfg.model,
      provider: "deepseek",
    };
  }
  
  try {
    const resp = await fetch(`${DS_PRODUCTION_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        max_tokens: 4000,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(60000),
    });
    
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    
    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content || "";
    
    return {
      success: true,
      reply,
      latencyMs: Date.now() - startTime,
      model: cfg.model,
      provider: "deepseek",
    };
  } catch (e) {
    return {
      success: false,
      reply: `DeepSeek API failed: ${e}`,
      latencyMs: Date.now() - startTime,
      model: cfg.model,
      provider: "deepseek",
    };
  }
}

export async function deepSeekHealthCheck(): Promise<{ available: boolean; url: string; model: string }> {
  const cfg = await getDeepSeekConfig();
  return {
    available: cfg.available,
    url: cfg.baseUrl,
    model: cfg.model,
  };
}
