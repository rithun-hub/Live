import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Maximize,
  Minimize,
  Tv,
  PictureInPicture2,
  Subtitles,
  Settings,
  X,
  FastForward,
} from 'lucide-react';
import { api, getMediaUrl } from '../../services/api';

interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  title: string;
  videoId: string;
  initialProgressSeconds?: number;
  isTheaterMode?: boolean;
  onToggleTheater?: () => void;
  nextVideo?: { id: string; title: string; slug: string; thumbnailUrl?: string };
  onPlayNext?: () => void;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  src,
  poster,
  title,
  videoId,
  initialProgressSeconds = 0,
  isTheaterMode = false,
  onToggleTheater,
  nextVideo,
  onPlayNext,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressTrackRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<any>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('1080p Auto');

  // Hover timeline preview
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  // Next video autoplay countdown
  const [countdown, setCountdown] = useState<number | null>(null);

  // Resume playback position
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (initialProgressSeconds > 0 && initialProgressSeconds < video.duration - 5) {
      video.currentTime = initialProgressSeconds;
    }
  }, [initialProgressSeconds]);

  // Periodic progress update sync to backend
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const interval = setInterval(() => {
      if (!video.paused && video.duration > 0) {
        api.post('/videos/progress', {
          videoId,
          progressSeconds: Math.floor(video.currentTime),
          durationSeconds: Math.floor(video.duration),
        }).catch(() => {});
      }
    }, 5000); // sync every 5 seconds

    return () => clearInterval(interval);
  }, [videoId]);

  // Ensure only one video plays at a time
  useEffect(() => {
    const handleGlobalPlay = (e: Event) => {
      if (videoRef.current && e.target !== videoRef.current) {
        videoRef.current.pause();
      }
    };
    window.addEventListener('play', handleGlobalPlay, true);
    return () => window.removeEventListener('play', handleGlobalPlay, true);
  }, []);

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  // Seek helper
  const seekRelative = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      try {
        await container.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Fullscreen error', err);
      }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Picture in Picture toggle
  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPip(false);
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
        setIsPip(true);
      }
    } catch (err) {
      console.error('PiP error', err);
    }
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(e.shiftKey ? -30 : -10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(e.shiftKey ? 30 : 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (videoRef.current) {
            const newVol = Math.min(1, videoRef.current.volume + 0.1);
            videoRef.current.volume = newVol;
            setVolume(newVol);
            setIsMuted(newVol === 0);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (videoRef.current) {
            const newVol = Math.max(0, videoRef.current.volume - 0.1);
            videoRef.current.volume = newVol;
            setVolume(newVol);
            setIsMuted(newVol === 0);
          }
          break;
        case 'KeyM':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
          }
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyT':
          e.preventDefault();
          if (onToggleTheater) onToggleTheater();
          break;
        case 'KeyP':
          e.preventDefault();
          togglePip();
          break;
        case 'KeyC':
          e.preventDefault();
          setSubtitlesEnabled((prev) => !prev);
          break;
        case 'KeyN':
          e.preventDefault();
          if (onPlayNext) onPlayNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seekRelative, toggleFullscreen, togglePip, onToggleTheater, onPlayNext]);

  // Handle Video Ended -> Autoplay Next Countdown
  const handleEnded = () => {
    setIsPlaying(false);
    if (nextVideo && onPlayNext) {
      setCountdown(5);
    }
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      if (onPlayNext) onPlayNext();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, onPlayNext]);

  // Timeline hover calculation
  const handleTimelineHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressTrackRef.current || duration === 0) return;
    const rect = progressTrackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * duration);
  };

  const handleTimelineSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressTrackRef.current || !videoRef.current || duration === 0) return;
    const rect = progressTrackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = pos * duration;
    setCurrentTime(pos * duration);
  };

  // Mouse activity timer for hiding controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout) clearTimeout(controlsTimeout);
    const timeout = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
    setControlsTimeout(timeout);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const remainingTime = duration - currentTime;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className={`relative select-none bg-black overflow-hidden group rounded-xl shadow-2xl transition-all duration-300 ${
        isTheaterMode
          ? 'w-full aspect-[21/9] max-h-[75vh]'
          : 'w-full aspect-video'
      }`}
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        src={getMediaUrl(src)}
        poster={getMediaUrl(poster)}
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setIsLoading(false);
          }
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={handleEnded}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
      />

      {/* Loading / Buffering Indicator */}
      {(isLoading || isBuffering) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="w-14 h-14 rounded-full border-4 border-zinc-700 border-t-[#e04f38] animate-spin" />
        </div>
      )}

      {/* Subtitle Display Overlay */}
      {subtitlesEnabled && isPlaying && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded bg-black/80 text-white text-sm md:text-base font-medium tracking-wide shadow-md pointer-events-none text-center">
          [Subtitles active — {title}]
        </div>
      )}

      {/* Next Video Countdown Banner */}
      {countdown !== null && nextVideo && (
        <div className="absolute top-6 right-6 z-30 p-4 rounded-xl bg-zinc-900/90 border border-zinc-700 backdrop-blur-md shadow-2xl flex items-center gap-4 text-white animate-fade-in">
          <div className="text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#e04f38]">
              Up Next in {countdown}s
            </span>
            <p className="text-sm font-semibold max-w-xs truncate">{nextVideo.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPlayNext && onPlayNext()}
              className="px-3 py-1.5 rounded-lg bg-[#e04f38] hover:bg-[#cc422d] text-xs font-bold transition-colors flex items-center gap-1"
            >
              <FastForward size={14} /> Play Now
            </button>
            <button
              onClick={() => setCountdown(null)}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              title="Cancel autoplay"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Custom Control Overlay */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-4 pb-3 pt-8 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Timeline Track with Hover Preview */}
        <div
          ref={progressTrackRef}
          onMouseMove={handleTimelineHover}
          onMouseLeave={() => setHoverTime(null)}
          onClick={handleTimelineSeek}
          className="relative w-full h-2 bg-zinc-700/60 hover:h-3 rounded-full cursor-pointer mb-3 transition-all group/track"
        >
          {/* Progress Filled Bar */}
          <div
            style={{ width: `${progressPercent}%` }}
            className="absolute left-0 top-0 bottom-0 bg-[#e04f38] rounded-full relative"
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow scale-0 group-hover/track:scale-100 transition-transform" />
          </div>

          {/* Hover Preview Tooltip */}
          {hoverTime !== null && (
            <div
              style={{ left: `${hoverPosition}%` }}
              className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[11px] font-mono text-zinc-100 shadow pointer-events-none"
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Player Controls Bar */}
        <div className="flex items-center justify-between text-white text-xs">
          {/* Left Controls: Play/Pause, Seek 10s, Volume, Time */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} className="fill-white" />}
            </button>

            <button
              onClick={() => seekRelative(-10)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
              title="Backward 10s (Left Arrow)"
            >
              <RotateCcw size={16} />
            </button>

            <button
              onClick={() => seekRelative(10)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
              title="Forward 10s (Right Arrow)"
            >
              <RotateCw size={16} />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (videoRef.current) {
                    videoRef.current.volume = val;
                    videoRef.current.muted = val === 0;
                    setIsMuted(val === 0);
                  }
                }}
                className="w-16 h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Time Stamp (Current / Total / Remaining) */}
            <div className="hidden sm:flex items-center gap-1 font-mono text-[11px] text-zinc-400">
              <span className="text-zinc-200">{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
              <span className="text-zinc-500 text-[10px]">(-{formatTime(remainingTime)})</span>
            </div>
          </div>

          {/* Right Controls: Subtitles, Speed, Quality, Theater, PiP, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Subtitles Toggle */}
            <button
              onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
              className={`p-1.5 rounded-lg transition-colors ${
                subtitlesEnabled
                  ? 'bg-[#e04f38]/20 text-[#e04f38]'
                  : 'hover:bg-white/10 text-zinc-400 hover:text-white'
              }`}
              title="Subtitles / CC (C)"
            >
              <Subtitles size={18} />
            </button>

            {/* Playback Speed Pill */}
            <div className="relative">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="px-2 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-300 hover:text-white transition-colors flex items-center gap-1"
                title="Playback Speed & Quality"
              >
                <span>{playbackRate}x</span>
                <Settings size={12} />
              </button>

              {settingsOpen && (
                <div className="absolute right-0 bottom-10 w-44 rounded-xl bg-zinc-950/95 border border-zinc-800 p-2 shadow-2xl z-40 text-xs">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase px-2 py-1">
                    Speed
                  </div>
                  {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        setPlaybackRate(rate);
                        if (videoRef.current) videoRef.current.playbackRate = rate;
                        setSettingsOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                        playbackRate === rate
                          ? 'bg-[#e04f38]/15 text-[#e04f38] font-bold'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      {rate}x {rate === 1 && '(Normal)'}
                    </button>
                  ))}
                  <div className="border-t border-zinc-800 my-1" />
                  <div className="text-[10px] font-bold text-zinc-500 uppercase px-2 py-1">
                    Quality
                  </div>
                  {['1080p Auto', '720p HD', '480p SD'].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setSelectedQuality(q);
                        setSettingsOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                        selectedQuality === q
                          ? 'bg-[#e04f38]/15 text-[#e04f38] font-bold'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theater Mode Toggle */}
            {onToggleTheater && (
              <button
                onClick={onToggleTheater}
                className={`p-1.5 rounded-lg transition-colors ${
                  isTheaterMode
                    ? 'text-[#e04f38]'
                    : 'hover:bg-white/10 text-zinc-400 hover:text-white'
                }`}
                title="Theater Mode (T)"
              >
                <Tv size={18} />
              </button>
            )}

            {/* Picture-in-Picture */}
            <button
              onClick={togglePip}
              className={`p-1.5 rounded-lg transition-colors ${
                isPip ? 'text-[#e04f38]' : 'hover:bg-white/10 text-zinc-400 hover:text-white'
              }`}
              title="Picture-in-Picture (P)"
            >
              <PictureInPicture2 size={18} />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

