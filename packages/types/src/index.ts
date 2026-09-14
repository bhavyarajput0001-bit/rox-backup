export type CoreState =
  | 'idle'
  | 'thinking'
  | 'researching'
  | 'creating'
  | 'executing'
  | 'success'
  | 'error';

export type IntentType =
  | 'chat'
  | 'research'
  | 'writing'
  | 'design'
  | 'coding'
  | 'analysis'
  | 'automation'
  | 'file_operation'
  | 'web_research'
  | 'task_management';

export type ModuleId =
  | 'writing'
  | 'design'
  | 'coding'
  | 'research'
  | 'productivity'
  | 'media'
  | 'analysis'
  | 'custom';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  icon: string;
}

export interface Module {
  id: ModuleId;
  name: string;
  icon: string;
  description: string;
  capabilities: string[];
}

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  permissions?: string[];
}

export type AIProvider = 'openai' | 'anthropic' | 'local';

export interface AIResponse {
  content: string;
  provider: AIProvider;
  model: string;
  tokensUsed?: number;
  tools?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  tools?: string[];
}

export interface UserSettings {
  theme: 'dark' | 'light';
  aiProvider: AIProvider;
  model: string;
  animationsEnabled: boolean;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  soundEnabled: boolean;
  shortcuts: Record<string, string>;
}

export interface PermissionRequest {
  id: string;
  action: string;
  description: string;
  requiresConfirmation: boolean;
}
