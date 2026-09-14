import { create } from 'zustand';
import type { CoreState, UserSettings, ModuleId, Task } from '@rox/types';

interface RoxStore {
  // Core state
  coreState: CoreState;
  setCoreState: (state: CoreState) => void;

  // UI state
  activeNav: string;
  setActiveNav: (nav: string) => void;
  focusMode: boolean;
  setFocusMode: (focused: boolean) => void;
  autoRotate: boolean;
  setAutoRotate: (auto: boolean) => void;

  // User
  userName: string;
  setUserName: (name: string) => void;
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;

  // Tasks
  tasks: Task[];
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  // Modules
  activeModule: ModuleId | null;
  setActiveModule: (mod: ModuleId | null) => void;

  // Messages
  messages: Array<{ role: 'user' | 'assistant'; content: string; id: string; timestamp: string }>;
  addMessage: (msg: { role: 'user' | 'assistant'; content: string }) => void;
  clearMessages: () => void;
}

export const useRoxStore = create<RoxStore>((set) => ({
  coreState: 'idle',
  setCoreState: (state) => set({ coreState: state }),

  activeNav: 'home',
  setActiveNav: (nav) => set({ activeNav: nav }),

  focusMode: false,
  setFocusMode: (focused) => set({ focusMode: focused }),

  autoRotate: true,
  setAutoRotate: (auto) => set({ autoRotate: auto }),

  userName: 'User',
  setUserName: (name) => set({ userName: name }),

  settings: {
    theme: 'dark' as const,
    aiProvider: 'openai' as const,
    model: 'gpt-4o-mini',
    animationsEnabled: true,
    quality: 'high' as const,
    soundEnabled: false,
    shortcuts: {},
  },
  updateSettings: (updates) =>
    set((s) => ({ settings: { ...s.settings, ...updates } })),

  tasks: [],
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
  updateTask: (id, updates) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  deleteTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  activeModule: null,
  setActiveModule: (mod) => set({ activeModule: mod }),

  messages: [],
  addMessage: (msg) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { ...msg, id: crypto.randomUUID(), timestamp: new Date().toISOString() },
      ],
    })),
  clearMessages: () => set({ messages: [] }),
}));
