import type { ToolDef } from "@rox/types";

export const TOOLS: ToolDef[] = [
  {
    name: "web_search",
    description: "Search the web for information",
    inputSchema: { query: "string", limit: "number" },
    outputSchema: { results: "array" },
    permissions: ["read"],
  },
  {
    name: "file_search",
    description: "Search local files",
    inputSchema: { query: "string", path: "string" },
    outputSchema: { results: "array" },
    permissions: ["read"],
  },
  {
    name: "document_reader",
    description: "Read and extract text from documents",
    inputSchema: { path: "string", format: "string" },
    outputSchema: { content: "string" },
    permissions: ["read"],
  },
  {
    name: "calculator",
    description: "Perform calculations",
    inputSchema: { expression: "string" },
    outputSchema: { result: "number" },
    permissions: ["compute"],
  },
  {
    name: "code_executor",
    description: "Execute code snippets",
    inputSchema: { code: "string", language: "string" },
    outputSchema: { output: "string", error: "string" },
    permissions: ["execute"],
  },
  {
    name: "task_manager",
    description: "Manage tasks and to-dos",
    inputSchema: { action: "string", task: "object" },
    outputSchema: { status: "string" },
    permissions: ["write"],
  },
  {
    name: "calendar",
    description: "Access calendar events",
    inputSchema: { action: "string", date: "string" },
    outputSchema: { events: "array" },
    permissions: ["read", "write"],
  },
];
