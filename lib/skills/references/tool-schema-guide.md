# Tool Schema Guide

Define tools using OpenAI-compatible function calling schema.

## Schema Format

```typescript
{
  name: string,           // unique identifier
  description: string,    // what the tool does (for LLM)
  parameters: {           // JSON Schema
    type: "object",
    properties: {
      arg_name: {
        type: "string",
        description: "argument description"
      }
    },
    required: string[]    // array of required arg names
  }
}
```

## Example: Shell Tool

```typescript
{
  name: "shell",
  description: "Run a shell command on the local macOS machine",
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "Shell command to execute"
      },
      cwd: {
        type: "string",
        description: "Optional working directory"
      }
    },
    required: ["command"]
  }
}
```

## Tool Call Format

The LLM returns JSON like:

```json
{
  "name": "shell",
  "args": {
    "command": "ls -la"
  }
}
```

Parse with:

```typescript
const parsed = JSON.parse(text);
const toolName = parsed.name;
const args = parsed.args;
```

## Error Handling

Always wrap tool execution in try/catch.

## Safety

Sandbox shell commands:

- Allow-listed binaries only (cat, ls, grep, node, npm, git, etc.)
- Block destructive patterns (rm -rf /, sudo, mkfs, dd)
- Enforce max buffer (2MB) and timeout (10s default)
