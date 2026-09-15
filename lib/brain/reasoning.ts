// Reasoning and planning system for Rox
// Enables task decomposition, multi-step reasoning, and strategy selection

export type PlanningStage = "ideation" | "decomposition" | "strategy" | "execution" | "validation" | "reflection";

export interface PlanStep {
  id: string;
  description: string;
  tool?: string;
  estimatedRounds?: number;
  dependsOn?: string[];
  status: "pending" | "in-progress" | "completed" | "failed";
  result?: string;
}

export interface ReasoningContext {
  task: string;
  history: Array<{ role: string; content: string }>;
  plan: PlanStep[];
  currentStage: PlanningStage;
  confidence: number;
  failedAttempts: number;
  maxRounds: number;
}

export class ReasoningEngine {
  private context: ReasoningContext;

  constructor(task: string, history: Array<{ role: string; content: string }> = []) {
    this.context = {
      task,
      history,
      plan: [],
      currentStage: "ideation",
      confidence: 1.0,
      failedAttempts: 0,
      maxRounds: 10,
    };
  }

  get state(): ReasoningContext {
    return { ...this.context };
  }

  // Stage 1: Decompose task into sub-tasks
  async decompose(): Promise<PlanStep[]> {
    this.context.currentStage = "decomposition";
    
    // Generate sub-tasks based on task complexity
    const subtasks: PlanStep[] = [];
    const tokens = this.context.task.toLowerCase().split(/\s+/);
    
    // Simple heuristic decomposition
    if (tokens.some(t => t.includes("search") || t.includes("find") || t.includes("research"))) {
      subtasks.push({
        id: `step_1`,
        description: "Search for relevant information",
        tool: "web_search",
        status: "pending",
      });
    }
    
    if (tokens.some(t => t.includes("write") || t.includes("create") || t.includes("generate"))) {
      subtasks.push({
        id: `step_2`,
        description: "Create or write content",
        tool: "write_file",
        status: "pending",
      });
    }
    
    if (tokens.some(t => t.includes("code") || t.includes("build") || t.includes("implement"))) {
      subtasks.push({
        id: `step_3`,
        description: "Execute code or build",
        tool: "shell",
        status: "pending",
      });
    }
    
    if (tokens.some(t => t.includes("youtube") || t.includes("video"))) {
      subtasks.push({
        id: `step_4`,
        description: "Handle YouTube task",
        tool: "youtube",
        status: "pending",
      });
    }
    
    // Always add verification step
    if (subtasks.length > 0) {
      subtasks.push({
        id: `step_${subtasks.length + 1}`,
        description: "Verify results",
        status: "pending",
      });
    }
    
    this.context.plan = subtasks;
    this.context.currentStage = "execution";
    return subtasks;
  }

  // Execute next step in plan
  async executeNext(): Promise<{ step: PlanStep; result: string; completed: boolean }> {
    const pendingStep = this.context.plan.find(s => s.status === "pending" || s.status === "in-progress");
    
    if (!pendingStep) {
      this.context.currentStage = "validation";
      return { 
        step: { id: "done", description: "All steps completed", status: "completed" }, 
        result: "Task completed successfully", 
        completed: true 
      };
    }

    pendingStep.status = "in-progress";
    
    // Simulate execution (in real implementation, this would call the tool)
    const result = `[Executing: ${pendingStep.description}]`;
    pendingStep.status = "completed";
    pendingStep.result = result;
    
    return { step: pendingStep, result, completed: false };
  }

  // Select best strategy based on task type
  selectStrategy(): { strategy: string; confidence: number } {
    const task = this.context.task.toLowerCase();
    
    // Strategy heuristics
    if (task.includes("debug") || task.includes("fix") || task.includes("error")) {
      this.context.currentStage = "strategy";
      return { strategy: "debug", confidence: 0.9 };
    }
    
    if (task.includes("write") || task.includes("create") || task.includes("generate")) {
      this.context.currentStage = "strategy";
      return { strategy: "creative", confidence: 0.85 };
    }
    
    if (task.includes("analyze") || task.includes("compare") || task.includes("summarize")) {
      this.context.currentStage = "strategy";
      return { strategy: "analysis", confidence: 0.8 };
    }
    
    // Default: use Hermes for complex tasks
    this.context.currentStage = "strategy";
    return { strategy: "hermes", confidence: 0.7 };
  }

  // Increment failure count and adjust confidence
  recordFailure(): void {
    this.context.failedAttempts += 1;
    this.context.confidence = Math.max(0.1, this.context.confidence - 0.1);
    
    if (this.context.failedAttempts >= 3) {
      // Escalate to Hermes for complex reasoning
      this.context.currentStage = "reflection";
      this.context.confidence = 0.9; // Trust Hermes more after failures
    }
  }

  // Check if we should escalate to Hermes
  shouldEscalate(): boolean {
    return (
      this.context.failedAttempts >= 2 ||
      this.context.confidence < 0.3 ||
      this.context.plan.length === 0
    );
  }

  // Get context for LLM call
  getContext(): ReasoningContext {
    return { ...this.context };
  }

  // Reset reasoning state
  reset(): void {
    this.context = {
      ...this.context,
      plan: [],
      currentStage: "ideation",
      confidence: 1.0,
      failedAttempts: 0,
    };
  }
}