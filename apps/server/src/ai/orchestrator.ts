import type { AIProvider, IntentType, AIResponse, ChatMessage } from '@rox/types';

export interface AIProviderInterface {
  name: string;
  chat(messages: ChatMessage[], options?: { model?: string; temperature?: number }): Promise<AIResponse>;
  isAvailable(): boolean;
}

export class OpenAIProvider implements AIProviderInterface {
  readonly name = 'openai';

  async chat(messages: ChatMessage[], options?: { model?: string; temperature?: number }): Promise<AIResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || 'gpt-4o-mini',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${(error as Error).message || response.statusText}`);
    }

    const data = await response.json();
    return {
      content: (data as any).choices[0].message.content,
      provider: 'openai',
      model: options?.model || 'gpt-4o-mini',
      tokensUsed: (data as any).usage?.total_tokens,
    };
  }

  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }
}

export class AnthropicProvider implements AIProviderInterface {
  readonly name = 'anthropic';

  async chat(messages: ChatMessage[], options?: { model?: string; temperature?: number }): Promise<AIResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options?.model || 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Anthropic API error: ${(error as Error).message || response.statusText}`);
    }

    const data = await response.json();
    return {
      content: (data as any).content[0].text,
      provider: 'anthropic',
      model: options?.model || 'claude-3-5-sonnet-20241022',
    };
  }

  isAvailable(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }
}

export class LocalModelProvider implements AIProviderInterface {
  readonly name = 'local';
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:31415') {
    this.baseUrl = baseUrl;
  }

  async chat(messages: ChatMessage[], options?: { model?: string; temperature?: number }): Promise<AIResponse> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.LOCAL_MODEL_API_KEY ? { Authorization: `Bearer ${process.env.LOCAL_MODEL_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: options?.model || 'default',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Local model API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: (data as any).choices[0].message.content,
      provider: 'local',
      model: options?.model || 'default',
    };
  }

  isAvailable(): boolean {
    // Check if local model is reachable
    return true; // Will be verified at runtime
  }
}

export class AIOrchestrationLayer {
  private providers: Map<AIProvider, AIProviderInterface>;
  private activeProvider: AIProvider;

  constructor() {
    this.providers = new Map();
    this.activeProvider = 'openai';

    if (new OpenAIProvider().isAvailable()) {
      this.providers.set('openai', new OpenAIProvider());
    }
    if (new AnthropicProvider().isAvailable()) {
      this.providers.set('anthropic', new AnthropicProvider());
    }
    if (process.env.LOCAL_MODEL_API_KEY || process.env.FREELLM_API_KEY) {
      this.providers.set('local', new LocalModelProvider());
    }

    // Set initial active provider
    if (this.providers.size > 0) {
      this.activeProvider = this.providers.keys().next().value as AIProvider;
    }
  }

  setProvider(provider: AIProvider): void {
    if (this.providers.has(provider)) {
      this.activeProvider = provider;
    } else {
      throw new Error(`Provider ${provider} not available`);
    }
  }

  getActiveProvider(): AIProvider {
    return this.activeProvider;
  }

  async chat(messages: ChatMessage[], options?: { model?: string }): Promise<AIResponse> {
    const provider = this.providers.get(this.activeProvider);
    if (!provider) {
      throw new Error('No AI providers available');
    }
    return provider.chat(messages, options);
  }

  detectIntent(text: string): IntentType {
    const lower = text.toLowerCase();
    
    if (/research|find|search|look up|what is|who is/.test(lower)) return 'research';
    if (/write|create|draft|compose|generate/.test(lower)) return 'writing';
    if (/code|debug|build|implement|function/.test(lower)) return 'coding';
    if (/analyze|summarize|understand|compare/.test(lower)) return 'analysis';
    if (/design|image|visual|logo/.test(lower)) return 'design';
    if (/task|todo|schedule|reminder/.test(lower)) return 'task_management';
    if (/file|document|pdf|doc/.test(lower)) return 'file_operation';
    if (/web|browsing|internet/.test(lower)) return 'web_research';
    if (/automate|script|workflow/.test(lower)) return 'automation';
    
    return 'chat';
  }
}

export const aiOrchestrator = new AIOrchestrationLayer();
