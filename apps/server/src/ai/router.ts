export interface RouterContext {
  state: string;
  setState: (state: string) => void;
}

export interface ToolResult {
  tool: string;
  result: unknown;
}

export async function routeRequest(
  text: string,
  orchestrator: any,
  context: RouterContext,
): Promise<{ response: string; tools?: string[] }> {
  const intent = orchestrator.detectIntent(text);
  context.setState(
    intent === "chat"
      ? "thinking"
      : intent === "research"
        ? "researching"
        : "executing",
  );

  try {
    const response = await orchestrator.chat([
      {
        id: "1",
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
      },
    ]);

    context.setState("success");
    setTimeout(() => context.setState("idle"), 1000);

    return { response: response.content, tools: response.tools };
  } catch (error: any) {
    context.setState("error");
    setTimeout(() => context.setState("idle"), 2000);
    return { response: `I couldn't complete that request. ${error.message}` };
  }
}
