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
  Edit3,
  PowerOff,
  Clock,
  Layers,
  Activity,
} from 'lucide-react';
import { api } from '../services/api';
import { UploadModal } from '../components/modals/UploadModal';
import { EditVideoModal } from '../components/modals/EditVideoModal';
import { ConfirmModal } from '../components/modals/ConfirmModal';
import { formatDistanceToNow } from 'date-fns';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'videos' | 'meetings' | 'reports' | 'downloads' | 'logins'
  >('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Tab Data
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [downloadsList, setDownloadsList] = useState<any[]>([]);
  const [loginsList, setLoginsList] = useState<any[]>([]);
  const [videosList, setVideosList] = useState<any[]>([]);
  const [meetingsList, setMeetingsList] = useState<any[]>([]);

  // Modals & Action States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [videoToEdit, setVideoToEdit] = useState<any | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<any | null>(null);
  const [isDeletingVideo, setIsDeletingVideo] = useState(false);
  const [meetingToEnd, setMeetingToEnd] = useState<any | null>(null);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);

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
        const res = await api.get('/videos?limit=100');
        if (res.success) setVideosList(res.videos);
      } else if (activeTab === 'meetings') {
        const res = await api.get('/admin/meetings');
        if (res.success) setMeetingsList(res.meetings);
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
      fetchDashboardStats();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle account status.');
    }
  };

  const handleUpdateLimit = async (userId: string, currentLimit: number) => {
    const val = prompt('Set new daily download limit for user:', currentLimit.toString());
    if (val && !isNaN(parseInt(val, 10))) {
      try {
        await api.patch(`/admin/users/${userId}/download-limit`, {
          dailyDownloadLimit: parseInt(val, 10),
        });
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

  // Video Management Handlers
  const handleEditVideoSuccess = (updatedVideo: any) => {
    setVideosList((prev) =>
      prev.map((v) => (v.id === updatedVideo.id ? { ...v, ...updatedVideo } : v))
    );
    fetchDashboardStats();
  };

  const handleConfirmDeleteVideo = async () => {
    if (!videoToDelete) return;
    setIsDeletingVideo(true);
    try {
      await api.delete(`/videos/${videoToDelete.id}`);
      setVideosList((prev) => prev.filter((v) => v.id !== videoToDelete.id));
      setVideoToDelete(null);
      fetchDashboardStats();
    } catch (err: any) {
      alert(err.message || 'Failed to delete video.');
    } finally {
      setIsDeletingVideo(false);
    }
  };

  // Meeting Management Handlers
  const handleConfirmEndMeeting = async () => {
    if (!meetingToEnd) return;
    setIsEndingMeeting(true);
    try {
      await api.post(`/meetings/${meetingToEnd.roomCode}/end`);
      setMeetingsList((prev) =>
        prev.map((m) =>
          m.id === meetingToEnd.id
            ? { ...m, status: 'ENDED', endedAt: new Date().toISOString() }
            : m
        )
      );
      setMeetingToEnd(null);
      fetchDashboardStats();
    } catch (err: any) {
      alert(err.message || 'Failed to end meeting.');
    } finally {
      setIsEndingMeeting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-[#26292e]">
        <div>
          <h1 className="font-heading font-black text-2xl text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldAlert size={24} className="text-[#e04f38]" />
            <span>Administrator Control Console</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Global management of broadcasts, real-time meetings, user accounts, and authenticated analytics.
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
          { id: 'videos', label: `Broadcasts (${videosList.length || stats?.totalVideos || 0})` },
          { id: 'meetings', label: `Live Meetings (${stats?.activeMeetings || 0})` },
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

      {/* TAB 1: Platform Overview Stats (100% Real Database Analytics) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Numeric Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] space-y-1">
              <span className="text-[11px] uppercase font-bold text-zinc-400">Total Users</span>
              <p className="font-heading font-black text-2xl text-zinc-900 dark:text-zinc-100">
                {stats?.totalUsers ?? 0}
              </p>
              <span className="text-[10px] text-emerald-500 font-semibold">
                {stats?.activeUsers ?? 0} active accounts
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] space-y-1">
              <span className="text-[11px] uppercase font-bold text-zinc-400">Broadcasts</span>
              <p className="font-heading font-black text-2xl text-zinc-900 dark:text-zinc-100">
                {stats?.totalVideos ?? 0}
              </p>
              <span className="text-[10px] text-zinc-500">
                {stats?.publishedVideos ?? 0} published publicly
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] space-y-1">
              <span className="text-[11px] uppercase font-bold text-zinc-400">Total Views</span>
              <p className="font-heading font-black text-2xl text-zinc-900 dark:text-zinc-100">
                {stats?.totalViews?.toLocaleString() ?? 0}
              </p>
              <span className="text-[10px] text-zinc-500">
                {stats?.dedupedViewsRecorded ?? 0} deduplicated view sessions
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] space-y-1">
              <span className="text-[11px] uppercase font-bold text-zinc-400">Total Watch Time</span>
              <p className="font-heading font-black text-2xl text-zinc-900 dark:text-zinc-100">
                {stats?.watchTimeHours ?? 0} <span className="text-sm font-normal text-zinc-400">hrs</span>
              </p>
              <span className="text-[10px] text-zinc-500">
                {stats?.watchTimeMinutes ?? 0} minutes total stream time
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] space-y-1">
              <span className="text-[11px] uppercase font-bold text-zinc-400">Downloads</span>
              <p className="font-heading font-black text-2xl text-zinc-900 dark:text-zinc-100">
                {stats?.totalDownloads ?? 0}
              </p>
              <span className="text-[10px] text-emerald-500 font-semibold">
                {stats?.completedDownloads ?? 0} completed
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] space-y-1">
              <span className="text-[11px] uppercase font-bold text-zinc-400">WebRTC Live Rooms</span>
              <p className="font-heading font-black text-2xl text-zinc-900 dark:text-zinc-100">
                {stats?.activeMeetings ?? 0}
              </p>
              <span className="text-[10px] text-[#e04f38] font-bold">
                {stats?.endedMeetings ?? 0} ended • {stats?.totalMeetings ?? 0} created
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] space-y-1">
              <span className="text-[11px] uppercase font-bold text-zinc-400">User Engagement</span>
              <p className="font-heading font-black text-2xl text-zinc-900 dark:text-zinc-100">
                {stats?.userEngagementScore?.toLocaleString() ?? 0}
              </p>
              <span className="text-[10px] text-zinc-500">
                {stats?.totalComments ?? 0} comments • {stats?.totalMeetingParticipants ?? 0} attendees
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] space-y-1">
              <span className="text-[11px] uppercase font-bold text-zinc-400">Storage Footprint</span>
              <p className="font-heading font-black text-2xl text-zinc-900 dark:text-zinc-100">
                {stats?.totalStorageMB ?? 0} <span className="text-sm font-normal text-zinc-400">MB</span>
              </p>
              <span className="text-[10px] text-zinc-500">Local video files</span>
            </div>
          </div>

          {/* Real Analytics Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Category Distribution */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#202327] pb-3">
                <h3 className="font-heading font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Layers size={16} className="text-[#e04f38]" />
                  <span>Category Distribution</span>
                </h3>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {stats?.categoriesBreakdown?.length || 0} categories
                </span>
              </div>

              <div className="space-y-3">
                {stats?.categoriesBreakdown && stats.categoriesBreakdown.length > 0 ? (
                  stats.categoriesBreakdown.map((cat: any) => {
                    const totalV = stats.totalVideos || 1;
                    const pct = Math.round((cat.count / totalV) * 100);
                    return (
                      <div key={cat.slug} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">
                            {cat.name}
                          </span>
                          <span className="text-zinc-400 font-mono">
                            {cat.count} {cat.count === 1 ? 'broadcast' : 'broadcasts'} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-[#202327] overflow-hidden">
                          <div
                            className="h-full bg-[#e04f38] rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-zinc-400 py-4 text-center">No categories registered.</p>
                )}
              </div>
            </div>

            {/* Real 7-Day Activity Trend */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#202327] pb-3">
                <h3 className="font-heading font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Activity size={16} className="text-emerald-500" />
                  <span>7-Day Authenticated Activity</span>
                </h3>
                <span className="text-[11px] text-zinc-400 font-mono">Exact DB events</span>
              </div>

              <div className="space-y-3">
                {stats?.activityTimeline && stats.activityTimeline.length > 0 ? (
                  <div className="space-y-2.5">
                    {stats.activityTimeline.map((item: any) => (
                      <div
                        key={item.date}
                        className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-[#111316] border border-zinc-100 dark:border-[#202327] text-xs font-mono"
                      >
                        <span className="text-zinc-400">{item.date}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-zinc-700 dark:text-zinc-300">
                            <strong className="text-zinc-900 dark:text-zinc-100">{item.views}</strong> views
                          </span>
                          <span className="text-emerald-500">
                            <strong>{item.downloads}</strong> downloads
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-zinc-400">
                    No activity recorded in the past 7 days.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Users Management */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 max-w-sm">
            <div className="relative w-full">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search username or email..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-[#15171a] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38]"
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
                  <th className="py-3 px-4">Download Limit</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#202327]">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-[#181a1d]">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {u.profile?.displayName || u.username}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-[#e04f38]/15 text-[#e04f38]'
                            : 'bg-zinc-100 dark:bg-[#202327] text-zinc-400'
                        }`}
                      >
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

      {/* TAB 3: Broadcasts Video Library (With Edit & Delete) */}
      {activeTab === 'videos' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-[#22252a] bg-white dark:bg-[#15171a] shadow-sm">
            <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
              <thead className="bg-zinc-50 dark:bg-[#181a1d] text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-200 dark:border-[#26292e]">
                <tr>
                  <th className="py-3 px-4">Broadcast</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Visibility</th>
                  <th className="py-3 px-4">Views</th>
                  <th className="py-3 px-4">Uploader</th>
                  <th className="py-3 px-4">Published</th>
                  <th className="py-3 px-4 text-right">Actions</th>
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
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          v.isPublished
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-zinc-500/15 text-zinc-400'
                        }`}
                      >
                        {v.isPublished ? 'Public' : 'Draft'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">{v.viewCount?.toLocaleString() ?? 0}</td>
                    <td className="py-3 px-4 text-zinc-400">@{v.uploader?.username}</td>
                    <td className="py-3 px-4 text-zinc-400">
                      {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setVideoToEdit(v)}
                          className="p-1.5 rounded-lg border border-zinc-200 dark:border-[#2a2e35] text-zinc-600 dark:text-zinc-300 hover:text-[#e04f38] hover:border-[#e04f38] transition-colors"
                          title="Edit broadcast details"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => setVideoToDelete(v)}
                          className="p-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Delete broadcast"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Live Meetings Management (End Any Meeting) */}
      {activeTab === 'meetings' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-[#22252a] bg-white dark:bg-[#15171a] shadow-sm">
            <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
              <thead className="bg-zinc-50 dark:bg-[#181a1d] text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-200 dark:border-[#26292e]">
                <tr>
                  <th className="py-3 px-4">Meeting</th>
                  <th className="py-3 px-4">Room Code</th>
                  <th className="py-3 px-4">Host</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Started</th>
                  <th className="py-3 px-4">Participants</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#202327]">
                {meetingsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400">
                      No meetings found in database records.
                    </td>
                  </tr>
                ) : (
                  meetingsList.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-50 dark:hover:bg-[#181a1d]">
                      <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                        {m.title}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#e04f38]">{m.roomCode}</td>
                      <td className="py-3 px-4 text-zinc-400">
                        @{m.host?.username || 'Unknown'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.status === 'ACTIVE'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : 'bg-zinc-500/15 text-zinc-400'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-400">
                        {formatDistanceToNow(new Date(m.startedAt), { addSuffix: true })}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {m.participants?.length ?? 0} connected
                      </td>
                      <td className="py-3 px-4 text-right">
                        {m.status === 'ACTIVE' ? (
                          <button
                            onClick={() => setMeetingToEnd(m)}
                            className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 ml-auto transition-colors shadow-sm"
                            title="End meeting as administrator"
                          >
                            <PowerOff size={12} />
                            <span>End Meeting</span>
                          </button>
                        ) : (
                          <span className="text-zinc-500 text-[11px] font-medium">Ended</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Comment Moderation Queue */}
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
                      <span className="text-zinc-400 text-[11px]">
                        Reported by @{rep.reporter?.username} on video "{rep.comment?.video?.title}"
                      </span>
                    </div>
                    <p className="p-2.5 rounded-lg bg-zinc-50 dark:bg-[#111316] text-zinc-800 dark:text-zinc-200 border border-zinc-100 dark:border-[#26292e]">
                      "{rep.comment?.content}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResolveReport(rep.id, 'DELETE_COMMENT')}
                      className="px-3 py-1.5 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
                    >
                      Delete Comment
                    </button>
                    <button
                      onClick={() => handleResolveReport(rep.id, 'DISMISS')}
                      className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-[#2a2e35] text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: Download Audit Records */}
      {activeTab === 'downloads' && (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-[#22252a] bg-white dark:bg-[#15171a] shadow-sm">
          <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
            <thead className="bg-zinc-50 dark:bg-[#181a1d] text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-200 dark:border-[#26292e]">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Broadcast</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-[#202327]">
              {downloadsList.map((d) => (
                <tr key={d.id} className="hover:bg-zinc-50 dark:hover:bg-[#181a1d]">
                  <td className="py-3 px-4 font-semibold text-zinc-800 dark:text-zinc-200">
                    @{d.user?.username}
                  </td>
                  <td className="py-3 px-4">{d.video?.title}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        d.status === 'COMPLETED'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-amber-500/15 text-amber-500'
                      }`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    {new Date(d.downloadDate).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 7: Security Logins Audit */}
      {activeTab === 'logins' && (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-[#22252a] bg-white dark:bg-[#15171a] shadow-sm">
          <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
            <thead className="bg-zinc-50 dark:bg-[#181a1d] text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-200 dark:border-[#26292e]">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Device / OS</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-[#202327]">
              {loginsList.map((l) => (
                <tr key={l.id} className="hover:bg-zinc-50 dark:hover:bg-[#181a1d]">
                  <td className="py-3 px-4 font-semibold text-zinc-800 dark:text-zinc-200">
                    {l.user?.username ? `@${l.user.username}` : l.attemptedEmail}
                  </td>
                  <td className="py-3 px-4 font-mono">{l.ipAddress}</td>
                  <td className="py-3 px-4 text-zinc-400">
                    {l.browserName} on {l.osName}
                  </td>
                  <td className="py-3 px-4">
                    {l.isSuccess ? (
                      <span className="text-emerald-500 font-semibold">Success</span>
                    ) : (
                      <span className="text-red-500 font-semibold">Failed</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={() => {
          loadTabData();
          fetchDashboardStats();
        }}
      />

      <EditVideoModal
        isOpen={Boolean(videoToEdit)}
        video={videoToEdit}
        onClose={() => setVideoToEdit(null)}
        onSuccess={handleEditVideoSuccess}
      />

      {/* Confirm Delete Video Modal */}
      <ConfirmModal
        isOpen={Boolean(videoToDelete)}
        title="Permanently Delete Broadcast?"
        message={`Are you sure you want to permanently delete "${videoToDelete?.title}"? All associated media files, comments, progress records, and download history will be irreversibly removed from storage and database.`}
        confirmText="Delete Video"
        cancelText="Cancel"
        confirmVariant="danger"
        isLoading={isDeletingVideo}
        onConfirm={handleConfirmDeleteVideo}
        onClose={() => setVideoToDelete(null)}
      />

      {/* Confirm End Meeting Modal */}
      <ConfirmModal
        isOpen={Boolean(meetingToEnd)}
        title="End Meeting as Administrator?"
        message={`Ending "${meetingToEnd?.title}" (Room: ${meetingToEnd?.roomCode}) will immediately terminate the conference for all participants, stop active media tracks, and permanently mark the meeting as ENDED.`}
        confirmText="End Meeting for All"
        cancelText="Keep Active"
        confirmVariant="danger"
        isLoading={isEndingMeeting}
        onConfirm={handleConfirmEndMeeting}
        onClose={() => setMeetingToEnd(null)}
      />
    </div>
  );
};
