import { ModuleId, Module } from '@rox/types';

export const MODULES: Module[] = [
  {
    id: 'writing',
    name: 'Writing',
    icon: 'pencil',
    description: 'Blogs, Emails, Docs',
    capabilities: ['blog', 'email', 'document', 'rewrite', 'summarize'],
  },
  {
    id: 'design',
    name: 'Design',
    icon: 'palette',
    description: 'Create Visuals',
    capabilities: ['image', 'ui', 'illustration', 'mockup'],
  },
  {
    id: 'coding',
    name: 'Coding',
    icon: 'code',
    description: 'Build & Debug',
    capabilities: ['write', 'debug', 'review', 'explain'],
  },
  {
    id: 'research',
    name: 'Research',
    icon: 'search',
    description: 'Find Insights',
    capabilities: ['web', 'academic', 'competitor', 'trend'],
  },
  {
    id: 'productivity',
    name: 'Productivity',
    icon: 'calendar',
    description: 'Plan & Organize',
    capabilities: ['task', 'schedule', 'note', 'reminder'],
  },
  {
    id: 'media',
    name: 'Media',
    icon: 'video',
    description: 'Create & Edit',
    capabilities: ['video', 'audio', 'gif', 'transcript'],
  },
  {
    id: 'analysis',
    name: 'Analysis',
    icon: 'chart',
    description: 'Understand Data',
    capabilities: ['chart', 'stat', 'forecast', 'compare'],
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: 'cog',
    description: 'Your Tools',
    capabilities: ['custom-tool'],
  },
];
