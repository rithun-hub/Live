import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Download, AlertCircle, CheckCircle, Clock, ShieldCheck, HardDrive } from 'lucide-react';
import { VideoDownloadRecord } from '../types';
import { api, getMediaUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

export const DownloadsPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [downloads, setDownloads] = useState<VideoDownloadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      api.get('/videos/downloads/history')
        .then((res) => {
          if (res.success && res.history) {
            setDownloads(res.history);
          }
        })
        .catch((err) => console.error('Failed to load downloads', err))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const completedToday = downloads.filter((d) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(d.downloadDate) >= today && d.status === 'COMPLETED';
  }).length;

  const dailyLimit = user?.dailyDownloadLimit || 10;
  const remainingToday = Math.max(0, dailyLimit - completedToday);

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb > 1000) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  if (!isAuthenticated) {
    return (
      <div className="py-20 text-center max-w-md mx-auto space-y-3">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#e04f38]/12 text-[#e04f38] flex items-center justify-center">
          <Download size={26} />
        </div>
        <h2 className="font-heading font-black text-xl text-zinc-900 dark:text-zinc-100">
          Sign In to Manage Downloads
        </h2>
        <p className="text-xs text-zinc-500">
          Registered members can authorize and save full-fidelity offline broadcasts with active daily quota tracking.
        </p>
        <Link
          to="/auth?redirect=/downloads"
          className="inline-block mt-3 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#e04f38] text-white"
        >
          Sign In / Register
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-[#26292e]">
        <div>
          <h1 className="font-heading font-black text-2xl text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Download size={24} className="text-[#e04f38]" />
            <span>Download Management</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Audit history, server-side authorization quotas, and saved offline media.
          </p>
        </div>

        {/* Daily Quota Summary Card */}
        <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#26292e] shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#e04f38]/12 text-[#e04f38] flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Daily Limit Quota
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-[#e04f38]/15 text-[#e04f38]">
                {completedToday} / {dailyLimit} Used
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              {remainingToday} authorized downloads remaining today
            </p>
          </div>
        </div>
      </div>

      {/* Downloads Table */}
      <div className="space-y-4">
        <h2 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <HardDrive size={18} className="text-zinc-400" />
          <span>Download History & Audit</span>
        </h2>

        {isLoading ? (
          <div className="py-12 text-center text-zinc-400 text-xs">
            Loading download audit logs...
          </div>
        ) : downloads.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-[#26292e] p-8 space-y-2">
            <Download size={32} className="mx-auto text-zinc-400 opacity-60" />
            <p className="font-semibold text-zinc-700 dark:text-zinc-300 text-sm">
              No download records yet
            </p>
            <p className="text-xs text-zinc-400">
              When you download videos from the broadcast watch page, your authorized history will appear here.
            </p>
            <Link
              to="/explore"
              className="inline-block mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#e04f38] text-white"
            >
              Explore Broadcasts
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-[#22252a] bg-white dark:bg-[#15171a] shadow-sm">
            <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
              <thead className="bg-zinc-50 dark:bg-[#181a1d] text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-200 dark:border-[#26292e]">
                <tr>
                  <th className="py-3 px-4">Broadcast</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#202327]">
                {downloads.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-zinc-50 dark:hover:bg-[#181a1d] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getMediaUrl(d.video.thumbnailUrl)}
                          alt={d.video.title}
                          className="w-14 h-9 object-cover rounded-lg bg-zinc-900 flex-shrink-0"
                        />
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-1 max-w-xs">
                          {d.video.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-500">
                      {formatFileSize(d.fileSizeBytes)}
                    </td>
                    <td className="py-3 px-4 text-zinc-500">
                      {formatDistanceToNow(new Date(d.downloadDate), { addSuffix: true })}
                    </td>
                    <td className="py-3 px-4">
                      {d.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500">
                          <CheckCircle size={10} /> Completed
                        </span>
                      ) : d.status === 'PROCESSING' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500">
                          <Clock size={10} /> In Progress
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-500">
                          <AlertCircle size={10} /> Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-zinc-400">
                      {d.browser || 'Browser'} on {d.os || 'OS'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

