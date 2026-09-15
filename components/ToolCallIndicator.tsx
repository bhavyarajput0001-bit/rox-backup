interface ToolCallProps {
  tool: {
    tool: string;
    args: Record<string, unknown>;
    ok: boolean;
    output: string;
  };
}

export default function ToolCallIndicator({ tool }: ToolCallProps) {
  const getStatusIcon = () => {
    if (tool.ok) return "✓";
    return "✗";
  };

  const getStatusColor = () => {
    return tool.ok ? "text-rox-green" : "text-rox-red";
  };

  return (
    <div className="flex items-start gap-2 text-xs bg-rox-bg/50 rounded p-2">
      <span className={`font-mono ${getStatusColor()}`}>{getStatusIcon()}</span>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-rox-amber truncate">
          {tool.tool}
        </div>
        {tool.output && (
          <div className="text-rox-gray mt-1 truncate">
            {tool.output.slice(0, 100)}
            {tool.output.length > 100 ? "..." : ""}
          </div>
        )}
      </div>
    </div>
  );
}
