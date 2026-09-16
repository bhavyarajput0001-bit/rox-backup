export type AppMode = 'focus' | 'coding' | 'entertainment' | 'media' | 'research' | 'system';
export type UiTheme = 'amber' | 'lava' | 'dark';

export const MODE_LABELS: Record<AppMode, string> = {
  focus: 'FOCUS',
  coding: 'CODING',
  entertainment: 'ENTERTAIN',
  media: 'MEDIA',
  research: 'RESEARCH',
  system: 'SYSTEM',
};

export const MODE_ICONS: Record<AppMode, string> = {
  focus: '◎',
  coding: '⟨⟩',
  entertainment: '▶',
  media: '♪',
  research: '⊕',
  system: '⚙',
};

export function applyAppMode(mode: AppMode): void {
  if (typeof document !== 'undefined') {
    document.body.dataset.appMode = mode;
    localStorage.setItem('rox_app_mode', mode);
  }
}

export function getAppMode(): AppMode {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('rox_app_mode') as AppMode | null;
    return stored || 'focus';
  }
  return 'focus';
}

export function toggleMediaPlayback(isPlaying: boolean): void {
  if (typeof document !== 'undefined') {
    document.body.dataset.mediaPlaying = isPlaying ? 'true' : 'false';
  }
}

export function getMediaState(): { playing: boolean } {
  if (typeof document !== 'undefined') {
    return { playing: document.body.dataset.mediaPlaying === 'true' };
  }
  return { playing: false };
}
