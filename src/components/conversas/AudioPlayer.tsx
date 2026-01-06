import { memo, useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  src: string;
  isFromMe?: boolean;
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Gerar barras de waveform pseudo-aleatórias baseadas no src
const generateWaveform = (src: string, count: number = 32) => {
  let hash = 0;
  for (let i = 0; i < src.length; i++) {
    hash = ((hash << 5) - hash) + src.charCodeAt(i);
    hash |= 0;
  }
  
  return Array.from({ length: count }, (_, i) => {
    const seed = Math.abs((hash * (i + 1)) % 100);
    // Criar padrão de áudio mais natural (mais alto no meio)
    const position = i / count;
    const bellCurve = Math.sin(position * Math.PI);
    const randomFactor = (seed / 100) * 0.6 + 0.4;
    return Math.min(1, bellCurve * randomFactor * 1.2 + 0.15);
  });
};

export const AudioPlayer = memo(function AudioPlayer({ src, isFromMe = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const waveform = generateWaveform(src);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleWaveformClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    audio.currentTime = clickPosition * duration;
  }, [duration]);

  const cycleSpeed = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const speeds = [1, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackRate);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    audio.playbackRate = nextSpeed;
    setPlaybackRate(nextSpeed);
  }, [playbackRate]);

  return (
    <div className={cn(
      'flex items-center gap-2 min-w-[200px] max-w-[280px] px-3 py-2 rounded-2xl',
      isFromMe ? 'bg-white/10' : 'bg-muted/50'
    )}>
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {/* Play/Pause Button */}
      <Button
        size="icon"
        variant="ghost"
        onClick={togglePlay}
        className={cn(
          'h-10 w-10 shrink-0 rounded-full',
          isFromMe 
            ? 'bg-white/20 hover:bg-white/30 text-white' 
            : 'bg-primary/10 hover:bg-primary/20 text-primary'
        )}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" />
        )}
      </Button>
      
      {/* Waveform */}
      <div 
        className="flex-1 h-8 flex items-center gap-[2px] cursor-pointer group"
        onClick={handleWaveformClick}
      >
        {waveform.map((height, i) => {
          const barProgress = i / waveform.length;
          const isPast = barProgress < progress;
          
          return (
            <div
              key={i}
              className={cn(
                'w-[3px] rounded-full transition-all duration-100',
                isPast
                  ? isFromMe ? 'bg-white' : 'bg-primary'
                  : isFromMe ? 'bg-white/40' : 'bg-muted-foreground/30',
                'group-hover:scale-y-110'
              )}
              style={{ 
                height: `${height * 100}%`,
                minHeight: '4px',
              }}
            />
          );
        })}
      </div>
      
      {/* Time & Speed */}
      <div className="flex flex-col items-end shrink-0">
        <span className={cn(
          'text-[11px] font-medium tabular-nums',
          isFromMe ? 'text-white/80' : 'text-muted-foreground'
        )}>
          {formatTime(isPlaying || currentTime > 0 ? currentTime : duration)}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={cycleSpeed}
          className={cn(
            'h-5 px-1.5 text-[10px] font-medium rounded',
            isFromMe 
              ? 'text-white/70 hover:text-white hover:bg-white/10' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          {playbackRate}x
        </Button>
      </div>
    </div>
  );
});
