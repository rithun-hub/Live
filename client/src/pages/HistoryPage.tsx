import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { History, Play, CheckCircle } from 'lucide-react';
import { api, getMediaUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

export const HistoryPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      api.get('/videos/continue-watching')
        .then((res) => {
          if (res.success && res.continueWatching) {
            setHistoryItems(res.continueWatching);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="py-20 text-center max-w-md mx-auto space-y-3">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#e04f38]/12 text-[#e04f38] flex items-center justify-center">
          <History size={26} />
        </div>
        <h2 className="font-heading font-black text-xl text-zinc-900 dark:text-zinc-100">
          Sign In for Watch History
        </h2>
        <p className="text-xs text-zinc-500">
          Sync playback timestamps across your trusted devices and pick up right where you left off.
        </p>
        <Link
          to="/auth?redirect=/history"
          className="inline-block mt-3 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#e04f38] text-white"
        >
          Sign In / Register
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto animate-fade-in">
      <div className="pb-4 border-b border-zinc-200 dark:border-[#26292e]">
        <h1 className="font-heading font-black text-2xl text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <History size={24} className="text-[#e04f38]" />
          <span>Playback History</span>
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Resume recently streamed broadcasts and track completed sessions.
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-zinc-400 text-xs">
          Loading your history...
        </div>
      ) : historyItems.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-[#26292e] p-8 space-y-2">
          <History size={32} className="mx-auto text-zinc-400 opacity-60" />
          <p className="font-semibold text-zinc-700 dark:text-zinc-300 text-sm">
            No active watch history
          </p>
          <p className="text-xs text-zinc-400">
            Streams you watch will automatically remember your exact position.
          </p>
          <Link
            to="/"
            className="inline-block mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#e04f38] text-white"
          >
            Start Watching
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {historyItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-zinc-300 dark:hover:border-[#2d3138] transition-all shadow-sm"
            >
              <div className="flex gap-4 items-center">
                <div className="relative aspect-video w-36 sm:w-44 rounded-xl overflow-hidden bg-zinc-900 flex-shrink-0">
                  <img
                    src={getMediaUrl(item.video.thumbnailUrl)}
                    alt={item.video.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Progress bar overlay */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
                    <div
                      style={{ width: `${item.watchedPercent}%` }}
                      className="h-full bg-[#e04f38]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-heading font-bold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">
                    {item.video.title}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {item.video.uploader?.profile?.displayName || item.video.uploader?.username}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                    <span>
                      {formatDuration(item.progressSeconds)} / {formatDuration(item.video.durationSeconds)}
                    </span>
                    <span>•</span>
                    <span>{Math.round(item.watchedPercent)}% watched</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 block">
                    Last watched {formatDistanceToNow(new Date(item.lastWatchedAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              <Link
                to={`/watch/${item.video.slug}`}
                className="px-4 py-2 rounded-xl bg-[#e04f38] hover:bg-[#cc422d] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors self-end sm:self-center"
              >
                <Play size={14} className="fill-white" />
                <span>Resume Playback</span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

