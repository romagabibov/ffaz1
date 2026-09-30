import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration?: number;
  waveform?: number[];
  isMe?: boolean;
  theme?: 'dark' | 'light' | 'bubble';
  className?: string;
}

const PLAYBACK_SPEEDS = [1, 1.5, 2, 0.75, 0.5];

export default function VoiceMessagePlayer({
  audioUrl,
  duration = 0,
  waveform,
  isMe = false,
  theme = 'bubble',
  className = ''
}: VoiceMessagePlayerProps) {
  const playerId = useRef<string>(`vplayer_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`).current;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState<number>(duration || 0);
  const [speedIndex, setSpeedIndex] = useState(0); // 0 -> 1x
  const [isHovered, setIsHovered] = useState(false);

  const currentSpeed = PLAYBACK_SPEEDS[speedIndex];

  // Sync prop duration when updated
  useEffect(() => {
    if (duration && duration > 0 && (!audioDuration || audioDuration === 0)) {
      setAudioDuration(duration);
    }
  }, [duration, audioDuration]);

  // Clean up audio element when audioUrl changes or on unmount
  useEffect(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = '';
      } catch {}
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    if (duration && duration > 0) {
      setAudioDuration(duration);
    }
  }, [audioUrl, duration]);

  // Global coordination: Pause this player whenever any other player starts playing
  useEffect(() => {
    const handleOtherVoicePlay = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail?.id && customEvent.detail.id !== playerId) {
        if (audioRef.current) {
          try {
            audioRef.current.pause();
          } catch {}
        }
        setIsPlaying(false);
      }
    };

    window.addEventListener('applet:voice-player-start', handleOtherVoicePlay);
    return () => {
      window.removeEventListener('applet:voice-player-start', handleOtherVoicePlay);
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.src = '';
        } catch {}
        audioRef.current = null;
      }
    };
  }, [playerId]);

  // Generate aesthetic waveform bars (30 bars)
  const visualWaveform = useMemo(() => {
    if (waveform && waveform.length >= 10) {
      const targetCount = 30;
      if (waveform.length === targetCount) return waveform;
      const res: number[] = [];
      const step = waveform.length / targetCount;
      for (let i = 0; i < targetCount; i++) {
        const idx = Math.min(waveform.length - 1, Math.floor(i * step));
        res.push(Math.max(0.15, Math.min(1, waveform[idx] || 0.3)));
      }
      return res;
    }
    // Deterministic pseudo-waveform seeded by audioUrl
    const count = 30;
    const res: number[] = [];
    let seed = 42;
    for (let i = 0; i < audioUrl.length; i++) {
      seed = (seed * 31 + audioUrl.charCodeAt(i)) % 1000;
    }
    for (let i = 0; i < count; i++) {
      const val = 0.2 + 0.75 * Math.abs(Math.sin((i + 1) * 0.45 + seed * 0.1) * Math.cos(i * 0.25));
      res.push(Math.max(0.15, Math.min(1, Number(val.toFixed(2)))));
    }
    return res;
  }, [waveform, audioUrl]);

  // Lazy instantiate and bind Audio element
  const getOrCreateAudio = useCallback((): HTMLAudioElement => {
    if (audioRef.current && audioRef.current.src) {
      return audioRef.current;
    }

    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setAudioDuration(audio.duration);
      }
    });

    audio.addEventListener('durationchange', () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setAudioDuration(audio.duration);
      }
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
      const effectiveDur = (audio.duration && isFinite(audio.duration) && audio.duration > 0)
        ? audio.duration
        : (audioDuration || duration || 0);

      if (effectiveDur > 0 && audio.currentTime >= effectiveDur) {
        setIsPlaying(false);
        setCurrentTime(0);
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {}
      }
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
      try {
        audio.currentTime = 0;
      } catch {}
    });

    audio.addEventListener('waiting', () => setIsLoading(true));
    audio.addEventListener('canplay', () => setIsLoading(false));
    audio.addEventListener('playing', () => setIsLoading(false));

    audio.addEventListener('error', (e) => {
      console.warn('Audio playback notice for url:', audioUrl, e);
      setIsLoading(false);
      setIsPlaying(false);
    });

    return audio;
  }, [audioUrl, audioDuration, duration]);

  // Toggle playback
  const togglePlay = async () => {
    const audio = getOrCreateAudio();

    if (isPlaying) {
      try {
        audio.pause();
      } catch {}
      setIsPlaying(false);
    } else {
      // 1. Notify all other players to pause immediately
      window.dispatchEvent(new CustomEvent('applet:voice-player-start', { detail: { id: playerId } }));

      // 2. If at the end, restart from beginning
      const effectiveDur = (audio.duration && isFinite(audio.duration) && audio.duration > 0) 
        ? audio.duration 
        : (audioDuration || duration || 0);

      if (audio.ended || (effectiveDur > 0 && audio.currentTime >= effectiveDur - 0.1)) {
        try {
          audio.currentTime = 0;
        } catch {}
        setCurrentTime(0);
      }

      // 3. Apply playback speed
      try {
        audio.playbackRate = currentSpeed;
      } catch {}

      try {
        setIsLoading(true);
        await audio.play();
        setIsPlaying(true);
        setIsLoading(false);
      } catch (err: any) {
        console.warn('Playback play request error:', err);
        setIsLoading(false);
        setIsPlaying(false);
      }
    }
  };

  // Cycle speed: 1x -> 1.5x -> 2x -> 0.75x -> 0.5x -> 1x
  const handleCycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIndex = (speedIndex + 1) % PLAYBACK_SPEEDS.length;
    setSpeedIndex(nextIndex);
    const newSpeed = PLAYBACK_SPEEDS[nextIndex];
    if (audioRef.current) {
      try {
        audioRef.current.playbackRate = newSpeed;
      } catch {}
    }
  };

  // Seek on waveform click
  const handleSeek = (index: number) => {
    const totalBars = visualWaveform.length;
    const progressFraction = (index + 0.5) / totalBars;
    const effectiveDur = (audioRef.current?.duration && isFinite(audioRef.current.duration) && audioRef.current.duration > 0)
      ? audioRef.current.duration
      : (audioDuration || duration || 1);

    const targetTime = progressFraction * effectiveDur;
    const audio = getOrCreateAudio();

    try {
      audio.currentTime = targetTime;
    } catch {}
    setCurrentTime(targetTime);

    if (!isPlaying) {
      togglePlay();
    }
  };

  // Time formatter
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return '0:00';
    const total = Math.floor(secs);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const effectiveTotalDuration = (audioDuration && audioDuration > 0) ? audioDuration : (duration || 0);
  const currentProgressPct = effectiveTotalDuration > 0 ? (currentTime / effectiveTotalDuration) : 0;
  const activeBarIndex = Math.floor(currentProgressPct * visualWaveform.length);

  // Styling based on theme & message ownership
  const isDarkBubble = isMe && theme === 'bubble';
  const playButtonBg = isDarkBubble 
    ? 'bg-white text-[#7A0000] hover:bg-white/90' 
    : 'bg-[#7A0000] text-white hover:bg-[#5a0000]';

  const playedBarColor = isDarkBubble ? 'bg-white' : 'bg-[#7A0000]';
  const unplayedBarColor = isDarkBubble ? 'bg-white/30' : 'bg-brand-dark/20';
  const timeTextColor = isDarkBubble ? 'text-white/80' : 'text-brand-dark/60';
  const speedBtnClass = isDarkBubble
    ? 'bg-white/15 text-white hover:bg-white/25 border-white/20'
    : 'bg-brand-dark/10 text-brand-dark hover:bg-brand-dark/20 border-brand-dark/15';

  return (
    <div 
      className={`flex items-center gap-3 py-1.5 px-1 select-none max-w-full min-w-[240px] sm:min-w-[280px] ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-xs transition-all active:scale-95 ${playButtonBg}`}
        title={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        {isLoading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : isPlaying ? (
          <Pause size={18} className="fill-current" />
        ) : (
          <Play size={18} className="fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform & Info Column */}
      <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
        {/* Waveform Bars */}
        <div 
          className="flex items-center gap-[2.5px] sm:gap-[3px] h-7 cursor-pointer py-1"
          title="Click to seek"
        >
          {visualWaveform.map((heightNorm, i) => {
            const isPlayed = i <= activeBarIndex;
            const barHeightPx = Math.max(4, Math.round(heightNorm * 22));
            return (
              <div
                key={i}
                onClick={() => handleSeek(i)}
                style={{ height: `${barHeightPx}px` }}
                className={`flex-1 min-w-[2.5px] max-w-[4px] rounded-full transition-all duration-150 hover:scale-y-125 ${
                  isPlayed ? playedBarColor : unplayedBarColor
                }`}
              />
            );
          })}
        </div>

        {/* Bottom Details Row: Time + Speed Controller */}
        <div className="flex items-center justify-between text-[10px] font-mono leading-none">
          <span className={`tracking-wider ${timeTextColor}`}>
            {isPlaying || currentTime > 0
              ? `${formatTime(currentTime)} / ${formatTime(effectiveTotalDuration)}`
              : formatTime(effectiveTotalDuration)}
          </span>

          <div className="flex items-center gap-1.5">
            {/* Speed Control Pill (0.5x, 0.75x, 1x, 1.5x, 2x) */}
            <button
              type="button"
              onClick={handleCycleSpeed}
              className={`px-2 py-0.5 rounded-full border text-[9px] font-mono font-bold uppercase transition-all tracking-wider flex items-center gap-0.5 shadow-2xs ${speedBtnClass}`}
              title="Click to change playback speed (0.5x, 0.75x, 1x, 1.5x, 2x)"
            >
              <span>{currentSpeed}x</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
