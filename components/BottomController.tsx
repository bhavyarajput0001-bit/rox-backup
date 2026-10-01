"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, 
  Mic, Brain, Cpu, HardDrive
} from "lucide-react";

interface MediaState {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  duration: number;
  currentTime: number;
}

export default function BottomController() {
  const [media, setMedia] = useState<MediaState>({
    isPlaying: false,
    title: '',
    artist: '',
    duration: 0,
    currentTime: 0,
  });
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [activeMode, setActiveMode] = useState<string>('focus');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Poll for media playback changes (real implementation would use system hooks)
    const checkMedia = () => {
      const currentlyPlaying = document.body.dataset.mediaPlaying === 'true';
      setMedia(prev => ({ ...prev, isPlaying: currentlyPlaying }));
    };
    
    const interval = setInterval(checkMedia, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update progress if playing
  useEffect(() => {
    if (media.isPlaying) {
      timerRef.current = setInterval(() => {
        setMedia(prev => {
          const next = prev.currentTime + 1;
          if (next >= prev.duration) {
            return { ...prev, currentTime: 0, isPlaying: false };
          }
          return { ...prev, currentTime: next };
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [media.isPlaying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    const next = !media.isPlaying;
    setMedia(prev => ({ ...prev, isPlaying: next }));
    document.body.dataset.mediaPlaying = next ? 'true' : 'false';
  };

  const handleModeChange = (mode: string) => {
    setActiveMode(mode);
    document.body.dataset.appMode = mode;
    localStorage.setItem('rox_app_mode', mode);
  };

  return (
    <footer className="fixed bottom-0 inset-x-0 h-10 bg-black/70 backdrop-blur-xl border-t border-rox/border flex items-center px-4 z-50">
      {/* Left: Active Mode Indicator */}
      <div className="flex items-center gap-2 min-w-[140px]">
        <span className="text-rox/bright text-xs font-mono tracking-wider">
          {activeMode.toUpperCase()}
        </span>
        <div className="flex gap-1">
          {['focus', 'coding', 'entertainment', 'media'].map(m => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                activeMode === m ? 'bg-rox/bright' : 'bg-rox/gray opacity-30 hover:opacity-60'
              }`}
              title={m}
            />
          ))}
        </div>
      </div>

      {/* Center: Media Controls */}
      <div className="flex-1 flex items-center justify-center gap-4">
        <button className="text-rox/gray hover:text-rox/bright transition-colors" title="Previous">
          <SkipBack size={16} />
        </button>
        
        <button
          onClick={handlePlayPause}
          className="w-8 h-8 rounded-full bg-rox/bright/20 border border-rox/bright/40 flex items-center justify-center text-rox/bright hover:bg-rox/bright/30 transition-all"
          title={media.isPlaying ? 'Pause' : 'Play'}
        >
          {media.isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
        
        <button className="text-rox/gray hover:text-rox/bright transition-colors" title="Next">
          <SkipForward size={16} />
        </button>

        {/* Progress Bar */}
        <div className="flex-1 max-w-xs mx-4 flex items-center gap-2">
          <span className="text-[10px] text-rox/gray tabular-nums">
            {formatTime(media.currentTime)}
          </span>
          <div className="flex-1 h-1 bg-rox/border rounded-full overflow-hidden cursor-pointer group">
            <div 
              className="h-full bg-rox/bright transition-all group-hover:bg-rox/hot"
              style={{ width: media.duration ? `${(media.currentTime / media.duration) * 100}%` : '0%' }}
            />
          </div>
          <span className="text-[10px] text-rox/gray tabular-nums">
            {formatTime(media.duration)}
          </span>
        </div>

        {/* Track Info */}
        {(media.title || media.artist) && (
          <div className="max-w-[200px] truncate">
            <div className="text-xs text-rox/bright truncate">{media.title}</div>
            <div className="text-[10px] text-rox/gray truncate">{media.artist}</div>
          </div>
        )}
      </div>

      {/* Right: System & Voice */}
      <div className="flex items-center gap-3 min-w-[140px] justify-end">
        <button className="text-rox/gray hover:text-rox/bright transition-colors" title="Voice Input">
          <Mic size={16} />
        </button>
        
        <div className="flex items-center gap-2">
          <Volume2 size={14} className="text-rox/gray" />
          <div className="w-16 h-1 bg-rox/border rounded-full overflow-hidden cursor-pointer">
            <div 
              className="h-full bg-rox/bright"
              style={{ width: `${isMuted ? 0 : volume}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-rox/gray">
          <Cpu size={12} />
          <span>M3</span>
        </div>
      </div>
    </footer>
  );
}
