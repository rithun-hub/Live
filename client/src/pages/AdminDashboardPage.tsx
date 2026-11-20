import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Video,
  Download,
  Radio,
  MessageSquare,
  HardDrive,
  Eye,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
} from 'lucide-react';
import { api } from '../services/api';
import { UploadModal } from '../components/modals/UploadModal';
import { formatDistanceToNow } from 'date-fns';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'videos' | 'reports' | 'downloads' | 'logins'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Tab Data
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [downloadsList, setDownloadsList] = useState<any[]>([]);
  const [loginsList, setLoginsList] = useState<any[]>([]);
  const [videosList, setVideosList] = useState<any[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/admin/dashboard');
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load admin stats', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const loadTabData = async () => {
    try {
      if (activeTab === 'users') {
        const res = await api.get(`/admin/users?search=${encodeURIComponent(userSearch)}`);
        if (res.success) setUsersList(res.users);
      } else if (activeTab === 'videos') {
        const res = await api.get('/videos?limit=50');
        if (res.success) setVideosList(res.videos);
      } else if (activeTab === 'reports') {
        const res = await api.get('/admin/reports');
        if (res.success) setReportsList(res.reports);
      } else if (activeTab === 'downloads') {
        const res = await api.get('/admin/downloads');
        if (res.success) setDownloadsList(res.downloads);
      } else if (activeTab === 'logins') {
        const res = await api.get('/admin/logins');
        if (res.success) setLoginsList(res.logins);
      }
    } catch (err) {
      console.error('Failed to load tab data', err);
    }
  };

  useEffect(() => {
    loadTabData();
  }, [activeTab, userSearch]);

  const handleToggleUserActive = async (userId: string, currentActive: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}/active`, { isActive: !currentActive });
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: !currentActive } : u))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to toggle account status.');
    }
  };

  const handleUpdateLimit = async (userId: string, currentLimit: number) => {
    const val = prompt('Set new daily download limit for user:', currentLimit.toString());
    if (val && !isNaN(parseInt(val, 10))) {
      try {
        await api.patch(`/admin/users/${userId}/download-limit`, { dailyDownloadLimit: parseInt(val, 10) });
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, dailyDownloadLimit: parseInt(val, 10) } : u))
        );
      } catch (err: any) {
        alert(err.message || 'Failed to update limit.');
      }
    }
  };

  const handleResolveReport = async (reportId: string, action: 'DISMISS' | 'DELETE_COMMENT') => {
    try {
      await api.post(`/admin/reports/${reportId}/resolve`, { action });
      setReportsList((prev) => prev.filter((r) => r.id !== reportId));
      fetchDashboardStats();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve report.');
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-[#26292e]">
        <div>
          <h1 className="font-heading font-black text-2xl text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldAlert size={24} className="text-[#e04f38]" />
            <span>Administrator Control Console</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Global management of broadcasts, users, comment moderation, quotas, and security audits.
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#e04f38] hover:bg-[#cc422d] shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Upload Broadcast</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-zinc-200 dark:border-[#26292e]">
        {[
          { id: 'overview', label: 'Platform Stats' },
          { id: 'users', label: 'User Directory' },
          { id: 'videos', label: 'Broadcasts' },
          { id: 'reports', label: `Moderation (${stats?.pendingCommentReports || 0})` },
          { id: 'downloads', label: 'Download Audit' },
          { id: 'logins', label: 'Security Logins' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-[#e04f38] text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#181a1d]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Platform Overview Stats */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] space-y-1">
              <span className="text-[11px] uppercase font-bold text-zinc-400">Total Users</span>
              <p className="font-heading font-black text-2xl text-zinc-900 dark:text-zinc-100">
                {stats?.totalUsers || 0}
              </p>
              <span className="text-[10px] text-emerald-500 font-semibold">
                {stats?.activeUsers || 0} active accounts
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] space-y-1">
              <span className="text-[11px] uppercase font-bold text-zinc-400">Broadcasts</span>
              <p className="font-heading font-black text-2xl text-zinc-900 dark:text-zinc-100">
                {stats?.totalVideos || 0}
              </p>
              <span className="text-[10px] text-zinc-500">Video library</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] space-y-1">
              <span className="text-[11px] uppercase font-bold text-zinc-400">Total Views</span>
              <p className="font-heading font-black text-2xl text-zinc-900 dark:text-zinc-100">
                {stats?.totalViews?.toLocaleString() || 0}
              </p>
              <span className="text-[10px] text-zinc-500">Global stream impressions</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] space-y-1">
              <span className="text-[11px] uppercase font-bold text-zinc-400">Downloads</span>
              <p className="font-heading font-black text-2xl text-zinc-900 dark:text-zinc-100">
                {stats?.totalDownloads || 0}
              </p>
              <span className="text-[10px] text-emerald-500 font-semibold">
                {stats?.completedDownloads || 0} completed
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] space-y-1">
              <span className="text-[11px] uppercase font-bold text-zinc-400">Live Rooms</span>
              <p className="font-heading font-black text-2xl text-zinc-900 dark:text-zinc-100">
                {stats?.activeMeetings || 0}
              </p>
              <span className="text-[10px] text-[#e04f38] font-bold">WebRTC active</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] space-y-1">
              <span className="text-[11px] uppercase font-bold text-zinc-400">Pending Reports</span>
              <p className="font-heading font-black text-2xl text-[#e04f38]">
                {stats?.pendingCommentReports || 0}
              </p>
              <span className="text-[10px] text-zinc-500">Requires review</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Users Management */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 max-w-sm">
            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by username or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#26292e] rounded-xl text-zinc-800 dark:text-zinc-200"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-[#22252a] bg-white dark:bg-[#15171a] shadow-sm">
            <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
              <thead className="bg-zinc-50 dark:bg-[#181a1d] text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-200 dark:border-[#26292e]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Daily Limit</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#202327]">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-[#181a1d]">
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 block">
                          {u.profile?.displayName || u.username}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono">{u.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-[#202327]">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.isActive ? (
                        <span className="text-emerald-500 font-semibold flex items-center gap-1">
                          <CheckCircle size={12} /> Active
                        </span>
                      ) : (
                        <span className="text-red-500 font-semibold flex items-center gap-1">
                          <XCircle size={12} /> Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <button
                        onClick={() => handleUpdateLimit(u.id, u.dailyDownloadLimit)}
                        className="text-[#e04f38] hover:underline font-bold"
                      >
                        {u.dailyDownloadLimit} / day
                      </button>
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleUserActive(u.id, u.isActive)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          u.isActive
                            ? 'text-red-500 border border-red-500/30 hover:bg-red-500/10'
                            : 'text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/10'
                        }`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Broadcasts Video Library */}
      {activeTab === 'videos' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-[#22252a] bg-white dark:bg-[#15171a] shadow-sm">
            <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
              <thead className="bg-zinc-50 dark:bg-[#181a1d] text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-200 dark:border-[#26292e]">
                <tr>
                  <th className="py-3 px-4">Broadcast</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Views</th>
                  <th className="py-3 px-4">Uploader</th>
                  <th className="py-3 px-4">Published</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#202327]">
                {videosList.map((v) => (
                  <tr key={v.id} className="hover:bg-zinc-50 dark:hover:bg-[#181a1d]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={v.thumbnailUrl}
                          alt={v.title}
                          className="w-14 h-9 object-cover rounded-lg bg-zinc-900 flex-shrink-0"
                        />
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-1 max-w-xs">
                          {v.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">{v.category?.name || 'General'}</td>
                    <td className="py-3 px-4 font-mono">{v.viewCount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-zinc-400">@{v.uploader?.username}</td>
                    <td className="py-3 px-4 text-zinc-400">
                      {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Comment Moderation Queue */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reportsList.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-[#26292e] p-8 space-y-1">
              <CheckCircle size={32} className="mx-auto text-emerald-500" />
              <p className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">
                Moderation Queue Clear
              </p>
              <p className="text-xs text-zinc-400">No pending comment reports at this time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reportsList.map((rep) => (
                <div
                  key={rep.id}
                  className="p-4 rounded-xl border border-zinc-200 dark:border-[#22252a] bg-white dark:bg-[#15171a] flex items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-500">
                        {rep.reason}
                      </span>
                      <span className="text-zinc-400">
                        Reported by @{rep.reporter?.username} • Video: "{rep.comment?.video?.title}"
                      </span>
                    </div>
                    <p className="text-zinc-800 dark:text-zinc-200 font-medium bg-zinc-50 dark:bg-[#111316] p-2 rounded-lg border border-zinc-200 dark:border-[#26292e]">
                      "{rep.comment?.content}"
                    </p>
                    {rep.details && (
                      <p className="text-[11px] text-zinc-500 italic">Details: {rep.details}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleResolveReport(rep.id, 'DISMISS')}
                      className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold"
                    >
                      Dismiss Report
                    </button>
                    <button
                      onClick={() => handleResolveReport(rep.id, 'DELETE_COMMENT')}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Trash2 size={13} />
                      <span>Delete Comment</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={() => {
          fetchDashboardStats();
          loadTabData();
        }}
      />
    </div>
  );
};
