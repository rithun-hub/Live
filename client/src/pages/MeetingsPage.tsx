import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Plus, ArrowRight, Shield, Users, Radio } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Meeting } from '../types';

export const MeetingsPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [guestName, setGuestName] = useState(user?.profile?.displayName || '');
  const [meetingTitle, setMeetingTitle] = useState('LIVE Media Collaboration');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myMeetings, setMyMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      api.get('/meetings/my-meetings')
        .then((res) => {
          if (res.success) setMyMeetings(res.meetings);
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/auth?redirect=/meetings');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const res = await api.post('/meetings', {
        title: meetingTitle.trim() || 'LIVE Conference',
        maxParticipants: 50,
        screenShareAllowed: true,
        chatAllowed: true,
      });

      if (res.success && res.meeting) {
        navigate(`/meeting/${res.meeting.roomCode}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create meeting room.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCodeInput.trim().toLowerCase();
    if (!code) return;

    if (!isAuthenticated && guestName.trim()) {
      sessionStorage.setItem('live_guest_name', guestName.trim());
    }
    navigate(`/meeting/${code}`);
  };

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e04f38]/12 text-[#e04f38] text-xs font-semibold">
          <Radio size={14} className="animate-pulse" />
          <span>Real-Time WebRTC Media</span>
        </div>
        <h1 className="font-heading font-black text-3xl sm:text-4xl text-zinc-900 dark:text-zinc-100 tracking-tight">
          Ultra-Low Latency Meetings
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">
          High-definition 1-to-1 video calls and group conferencing with instant screen sharing,
          spatial audio, and secure Socket.IO signaling.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center max-w-md mx-auto">
          {error}
        </div>
      )}

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Create Instant Meeting Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e04f38]/15 text-[#e04f38] flex items-center justify-center">
              <Plus size={20} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100">
                Start Instant Meeting
              </h3>
              <p className="text-xs text-zinc-400">Generate a secure room with host controls</p>
            </div>
          </div>

          <form onSubmit={handleCreateMeeting} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Meeting Title
              </label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="e.g. Architectural Masterclass Sync"
                className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#111316] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38]"
              />
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-[#e04f38] hover:bg-[#cc422d] transition-colors shadow flex items-center justify-center gap-2"
            >
              <Video size={16} />
              <span>{isCreating ? 'Launching Room...' : 'Start Instant Meeting'}</span>
            </button>
          </form>
        </div>

        {/* Join Meeting by Code Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-[#202327] text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
              <ArrowRight size={20} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100">
                Join with Room Code
              </h3>
              <p className="text-xs text-zinc-400">Enter a shared meeting link or room ID</p>
            </div>
          </div>

          <form onSubmit={handleJoinMeeting} className="space-y-4">
            {!isAuthenticated && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Your Display Name (Guest)
                </label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#111316] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Room Code
              </label>
              <input
                type="text"
                required
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                placeholder="e.g. live-prod-sync"
                className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#111316] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38] font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={!roomCodeInput.trim()}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-[#202327] hover:bg-zinc-200 dark:hover:bg-[#282c32] border border-zinc-200 dark:border-[#26292e] transition-colors flex items-center justify-center gap-2"
            >
              <span>Join Conference</span>
              <ArrowRight size={15} />
            </button>
          </form>
        </div>
      </div>

      {/* Seeded active sample room quick join pill */}
      <div className="p-4 rounded-xl bg-zinc-100 dark:bg-[#15171a] border border-zinc-200 dark:border-[#26292e] flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            Active Community Room: <code className="text-[#e04f38] font-bold">live-prod-sync</code>
          </span>
          <span className="text-zinc-400 hidden sm:inline">— Daily engineering pipeline sync</span>
        </div>
        <button
          onClick={() => navigate('/meeting/live-prod-sync')}
          className="px-3.5 py-1.5 rounded-lg bg-[#e04f38] text-white text-xs font-bold hover:bg-[#cc422d] transition-colors"
        >
          Join Room
        </button>
      </div>

      {/* Recent / Hosted Meetings */}
      {isAuthenticated && myMeetings.length > 0 && (
        <section className="space-y-3 pt-6 border-t border-zinc-200 dark:border-[#26292e]">
          <h2 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100">
            Your Meeting History
          </h2>
          <div className="divide-y divide-zinc-100 dark:divide-[#202327] rounded-2xl border border-zinc-200 dark:border-[#22252a] bg-white dark:bg-[#15171a] overflow-hidden">
            {myMeetings.map((m) => (
              <div
                key={m.id}
                className="p-4 flex items-center justify-between text-xs hover:bg-zinc-50 dark:hover:bg-[#181a1d] transition-colors"
              >
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{m.title}</h4>
                  <p className="text-[11px] text-zinc-400 font-mono">Code: {m.roomCode}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      m.status === 'ACTIVE'
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-zinc-500/15 text-zinc-500'
                    }`}
                  >
                    {m.status}
                  </span>
                  <button
                    onClick={() => navigate(`/meeting/${m.roomCode}`)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-[#2a2e35] text-zinc-700 dark:text-zinc-300 hover:border-[#e04f38] text-xs font-semibold"
                  >
                    Enter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
