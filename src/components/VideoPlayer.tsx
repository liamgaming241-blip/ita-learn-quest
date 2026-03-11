import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Gauge, AlertTriangle, RefreshCw,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  title?: string;
  className?: string;
}

const formatTime = (s: number) => {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
    : `${m}:${sec.toString().padStart(2, "0")}`;
};

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const VideoPlayer = ({ src, title, className }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buffered, setBuffered] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => setError("Não foi possível reproduzir o vídeo."));
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }, []);

  const seek = useCallback((val: number[]) => {
    const video = videoRef.current;
    if (video) video.currentTime = val[0];
  }, []);

  const changeVolume = useCallback((val: number[]) => {
    const video = videoRef.current;
    if (video) {
      video.volume = val[0];
      setVolume(val[0]);
      setMuted(val[0] === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    }
  }, []);

  const changeSpeed = useCallback((s: number) => {
    const video = videoRef.current;
    if (video) { video.playbackRate = s; setSpeed(s); }
  }, []);

  const skip = useCallback((delta: number) => {
    const video = videoRef.current;
    if (video) video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + delta));
  }, []);

  const retry = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setError(null);
      setLoading(true);
      video.load();
    }
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    const onMeta = () => { setDuration(v.duration); setLoading(false); };
    const onEnd = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onError = () => {
      setLoading(false);
      setError("Erro ao carregar o vídeo. Verifique o link ou tente novamente.");
    };
    const onProgress = () => {
      if (v.buffered.length > 0) {
        setBuffered(v.buffered.end(v.buffered.length - 1));
      }
    };
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);

    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("ended", onEnd);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("error", onError);
    v.addEventListener("progress", onProgress);
    document.addEventListener("fullscreenchange", onFsChange);

    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("ended", onEnd);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("error", onError);
      v.removeEventListener("progress", onProgress);
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case " ": case "k": e.preventDefault(); togglePlay(); break;
        case "ArrowLeft": e.preventDefault(); skip(-10); break;
        case "ArrowRight": e.preventDefault(); skip(10); break;
        case "m": e.preventDefault(); toggleMute(); break;
        case "f": e.preventDefault(); toggleFullscreen(); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePlay, skip, toggleMute, toggleFullscreen]);

  const onMouseMove = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (playing) hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  // Error state
  if (error) {
    return (
      <div className={cn("relative flex flex-col items-center justify-center bg-muted rounded-lg", className)} style={{ minHeight: 300 }}>
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-sm text-muted-foreground text-center mb-4 px-4">{error}</p>
        <Button variant="outline" size="sm" onClick={retry}>
          <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative group bg-black rounded-lg overflow-hidden select-none", className)}
      onMouseMove={onMouseMove}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full cursor-pointer"
        onClick={togglePlay}
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
      />

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {/* Controls overlay */}
      <div className={cn(
        "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 pt-10 transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        {title && <p className="text-xs text-white/70 mb-1.5 truncate">{title}</p>}

        {/* Progress bar with buffer */}
        <div className="relative mb-2">
          {/* Buffer bar */}
          <div className="absolute inset-0 h-1.5 rounded-full bg-white/10 mt-[5px]">
            <div
              className="h-full rounded-full bg-white/20 transition-all"
              style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
            />
          </div>
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={seek}
            className="[&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:border-white [&_[role=slider]]:bg-white [&_.bg-primary]:bg-primary"
          />
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => skip(-10)}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20" onClick={togglePlay}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => skip(10)}>
            <SkipForward className="h-4 w-4" />
          </Button>

          <span className="text-xs text-white/80 font-mono mx-2 tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Volume */}
          <div className="hidden sm:flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={toggleMute}>
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[muted ? 0 : volume]}
              max={1}
              step={0.05}
              onValueChange={changeVolume}
              className="w-20 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-white [&_[role=slider]]:bg-white"
            />
          </div>

          {/* Speed */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-white hover:bg-white/20 px-2 gap-1">
                <Gauge className="h-3.5 w-3.5" /> {speed}x
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-0">
              {speeds.map((s) => (
                <DropdownMenuItem key={s} onClick={() => changeSpeed(s)} className={cn(s === speed && "font-bold text-primary")}>
                  {s}x
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Fullscreen */}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={toggleFullscreen}>
            {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Big play button when paused and not loading */}
      {!playing && !loading && (
        <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={togglePlay}>
          <div className="h-16 w-16 rounded-full bg-primary/90 flex items-center justify-center shadow-xl backdrop-blur-sm transition-transform hover:scale-110">
            <Play className="h-7 w-7 text-primary-foreground ml-1" />
          </div>
        </div>
      )}
    </div>
  );
};
