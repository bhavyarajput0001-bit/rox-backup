import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function searchWeb(query: string) {
  const { stdout } = await execFileAsync(
    "mcporter",
    ["call", "exa.web_search_exa", `query=${query}`, "numResults=5"],
    { timeout: 20_000, maxBuffer: 200_000 },
  );
  return stdout.trim().slice(0, 8_000);
}

export async function readWebpage(url: string) {
  if (!isHttpUrl(url)) throw new Error("Only http and https URLs are supported.");
  const response = await fetch(`https://r.jina.ai/${url}`, {
    signal: AbortSignal.timeout(20_000),
    headers: { Accept: "text/plain" },
  });
  if (!response.ok) throw new Error(`Webpage reader returned ${response.status}.`);
  return (await response.text()).slice(0, 8_000);
}

export async function getWeather(location: string) {
  const city = location.trim().replace(/[^a-zA-Z0-9 ,.-]/g, "");
  if (!city) throw new Error("A location is required.");
  const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=3`, {
    signal: AbortSignal.timeout(8_000),
    headers: { "User-Agent": "Rox-Assistant/1.0" },
  });
  if (!response.ok) throw new Error(`Weather service returned ${response.status}.`);
  return (await response.text()).trim();
}

export async function getNews(topic = "technology") {
  const query = encodeURIComponent(topic.trim() || "technology");
  const response = await fetch(`https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`, {
    signal: AbortSignal.timeout(8_000),
    headers: { Accept: "application/rss+xml" },
  });
  if (!response.ok) throw new Error(`News service returned ${response.status}.`);
  const xml = await response.text();
  return [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<\/item>/g)]
    .slice(0, 5)
    .map((match, index) => `${index + 1}. ${match[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim()} - ${match[2].trim()}`)
    .join("\n");
}

export function calculate(expression: string) {
  const normalized = expression.replace(/[^0-9+\-*/().%\s]/g, "").trim();
  if (!normalized || normalized.length > 100 || !/[0-9]/.test(normalized)) {
    throw new Error("Invalid calculation.");
  }
  const tokens = normalized.match(/\d+(?:\.\d+)?|[()+\-*/%]/g) ?? [];
  const values: number[] = [];
  const operators: string[] = [];
  const precedence: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2 };
  const apply = () => {
    const operator = operators.pop();
    const right = values.pop();
    const left = values.pop();
    if (!operator || left === undefined || right === undefined) throw new Error("Invalid calculation.");
    if (operator === "+") values.push(left + right);
    if (operator === "-") values.push(left - right);
    if (operator === "*") values.push(left * right);
    if (operator === "/") values.push(left / right);
    if (operator === "%") values.push(left % right);
  };
  for (const token of tokens) {
    if (/^\d/.test(token)) values.push(Number(token));
    else if (token === "(") operators.push(token);
    else if (token === ")") {
      while (operators.at(-1) && operators.at(-1) !== "(") apply();
      if (operators.pop() !== "(") throw new Error("Invalid calculation.");
    } else {
      while (true) {
        const topOperator = operators.at(-1);
        if (!topOperator || topOperator === "(" || precedence[topOperator] < precedence[token]) break;
        apply();
      }
      operators.push(token);
    }
  }
  while (operators.length) apply();
  const result = values[0];
  if (values.length !== 1 || !Number.isFinite(result)) throw new Error("Invalid calculation.");
  return String(Number(result.toFixed(8)));
}

export function capabilityReport() {
  return [
    "Online skills available: web search via Exa, webpage reading via Jina Reader, RSS feeds, YouTube transcripts, and GitHub CLI.",
    "Browser-session skills are installed through OpenCLI but require its Chrome extension and an explicitly logged-in browser session.",
  ].join(" ");
}