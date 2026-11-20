import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Eye } from 'lucide-react';
import { Video } from '../../types';
import { formatDistanceToNow } from 'date-fns';

interface VideoCardProps {
  video: Video;
  showProgress?: boolean;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, showProgress = true }) => {
  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = video.userProgress
    ? video.userProgress.watchedPercent
    : 0;

  return (
    <div className="group flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] hover:border-zinc-300 dark:hover:border-[#2d3138] transition-all duration-200 shadow-sm hover:shadow-md">
      {/* Thumbnail Container */}
      <Link
        to={`/watch/${video.slug}`}
        className="relative aspect-video w-full overflow-hidden bg-zinc-900 block"
      >
        <img
          src={
            video.thumbnailUrl ||
            'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1280&q=80'
          }
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#e04f38] text-white flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
            <Play size={20} className="fill-white translate-x-0.5" />
          </div>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-white font-mono text-[11px] font-semibold tracking-wide">
          {formatDuration(video.durationSeconds)}
        </div>

        {/* Resolution Badge */}
        {video.resolution && (
          <div className="absolute top-2.5 left-2.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-zinc-300 text-[10px] font-bold uppercase tracking-wider">
            {video.resolution}
          </div>
        )}

        {/* Progress Bar (If watched partially) */}
        {showProgress && progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700/80">
            <div
              style={{ width: `${progressPercent}%` }}
              className="h-full bg-[#e04f38]"
            />
          </div>
        )}
      </Link>

      {/* Details Container */}
      <div className="p-4 flex gap-3 flex-1 flex-col justify-between">
        <div className="flex gap-3">
          {/* Uploader Avatar */}
          <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-[#202327] border border-zinc-300 dark:border-[#2a2e35] flex-shrink-0 flex items-center justify-center font-bold text-xs text-[#e04f38] overflow-hidden mt-0.5">
            {video.uploader?.profile?.avatarUrl ? (
              <img
                src={video.uploader.profile.avatarUrl}
                alt={video.uploader.username}
                className="w-full h-full object-cover"
              />
            ) : (
              (video.uploader?.username || 'L').slice(0, 2).toUpperCase()
            )}
          </div>

          <div className="flex-1 min-w-0">
            <Link
              to={`/watch/${video.slug}`}
              className="font-heading font-bold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 hover:text-[#e04f38] transition-colors leading-snug"
            >
              {video.title}
            </Link>

            <p className="text-xs text-zinc-500 mt-1 truncate">
              {video.uploader?.profile?.displayName || video.uploader?.username}
            </p>
          </div>
        </div>

        {/* Metadata Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-[#202327] text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Eye size={13} />
            <span>{video.viewCount.toLocaleString()} views</span>
          </div>

          <div className="flex items-center gap-2">
            {video.category && (
              <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-[#1f2227] text-zinc-600 dark:text-zinc-400 text-[10px] font-medium">
                {video.category.name}
              </span>
            )}
            <span>
              {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

