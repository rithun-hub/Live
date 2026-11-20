import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Download, Eye, ThumbsUp, Share2, Check, AlertCircle, Edit3, Trash2 } from 'lucide-react';
import { Video } from '../types';
import { api, getMediaUrl } from '../services/api';
import { CustomVideoPlayer } from '../components/player/CustomVideoPlayer';
import { CommentSection } from '../components/comments/CommentSection';
import { EditVideoModal } from '../components/modals/EditVideoModal';
import { ConfirmModal } from '../components/modals/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

export const WatchPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [video, setVideo] = useState<Video | null>(null);
  const [recommendedVideos, setRecommendedVideos] = useState<Video[]>([]);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Edit & Delete state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchVideoDetails = async () => {
      if (!slug) return;
      try {
        setIsLoading(true);
        setError(null);
        const res = await api.get(`/videos/${slug}`);
        if (res.success && res.video) {
          setVideo(res.video);
        }

        // Fetch recommendations
        const recRes = await api.get('/videos?limit=6');
        if (recRes.success) {
          setRecommendedVideos(recRes.videos.filter((v: Video) => v.slug !== slug));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load video.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideoDetails();
    window.scrollTo(0, 0);
  }, [slug]);

  const handleDownload = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to download broadcasts.');
      return;
    }

    if (!video) return;

    setIsDownloading(true);
    setDownloadError(null);
    setDownloadSuccess(null);

    try {
      const res = await api.post(`/videos/downloads/${video.id}/authorize`);
      if (res.success && res.authorization) {
        const { downloadId, videoUrl, videoTitle, remainingToday } = res.authorization;

        // Trigger browser download
        const a = document.createElement('a');
        a.href = getMediaUrl(videoUrl);
        a.download = `${videoTitle.replace(/[^a-z0-9]/gi, '_')}.mp4`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Mark as completed on backend audit
        await api.patch(`/videos/downloads/${downloadId}/complete`);

        setDownloadSuccess(
          `Download authorized and initiated. You have ${remainingToday} downloads remaining today.`
        );
      }
    } catch (err: any) {
      setDownloadError(err.message || 'Download authorization failed.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Broadcast link copied to clipboard!');
  };

  const handleConfirmDelete = async () => {
    if (!video) return;
    setIsDeleting(true);
    try {
      await api.delete(`/videos/${video.id}`);
      navigate('/');
    } catch (err: any) {
      alert(err.message || 'Failed to delete video.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full border-4 border-zinc-700 border-t-[#e04f38] animate-spin" />
        <p className="text-xs text-zinc-500">Loading broadcast stream...</p>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
          <AlertCircle size={24} />
        </div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Broadcast Unavailable
        </p>
        <p className="text-xs text-zinc-500">{error || 'Video could not be found.'}</p>
        <Link
          to="/"
          className="inline-block mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-[#e04f38] text-white"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  const nextVideo = recommendedVideos[0];

  return (
    <div className={`space-y-6 pb-12 animate-fade-in ${isTheaterMode ? 'max-w-full' : ''}`}>
      {/* Video Player */}
      <div className="w-full">
        <CustomVideoPlayer
          src={video.videoUrl}
          poster={video.thumbnailUrl}
          title={video.title}
          videoId={video.id}
          initialProgressSeconds={video.userProgress?.progressSeconds || 0}
          isTheaterMode={isTheaterMode}
          onToggleTheater={() => setIsTheaterMode(!isTheaterMode)}
          nextVideo={nextVideo}
          onPlayNext={() => nextVideo && (window.location.href = `/watch/${nextVideo.slug}`)}
        />
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Details & Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Title & Actions */}
          <div className="space-y-3">
            <h1 className="font-heading font-black text-xl sm:text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug">
              {video.title}
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-[#26292e] text-xs text-zinc-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                  <Eye size={14} />
                  {video.viewCount.toLocaleString()} views
                </span>
                <span>•</span>
                <span>
                  {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
                </span>
                {video.resolution && (
                  <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-[#181a1d] border border-zinc-200 dark:border-[#26292e] text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-300">
                    {video.resolution}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Download Button */}
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold text-xs text-white bg-[#e04f38] hover:bg-[#cc422d] disabled:opacity-50 transition-colors shadow-sm"
                  title="Download broadcast to local device"
                >
                  <Download size={14} />
                  <span>{isDownloading ? 'Authorizing...' : 'Download'}</span>
                </button>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-[#181a1d] hover:bg-zinc-200 dark:hover:bg-[#202327] border border-zinc-200 dark:border-[#26292e] transition-colors"
                >
                  <Share2 size={14} />
                  <span>Share</span>
                </button>

                {/* Owner / Admin Management Buttons */}
                {(user?.id === video.uploaderId || user?.role === 'ADMIN') && (
                  <>
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-[#181a1d] hover:bg-zinc-200 dark:hover:bg-[#202327] border border-zinc-200 dark:border-[#26292e] transition-colors"
                      title="Edit broadcast metadata"
                    >
                      <Edit3 size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors"
                      title="Delete broadcast permanently"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Download Status Notification */}
            {downloadSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
                <Check size={16} />
                <span>{downloadSuccess}</span>
              </div>
            )}
            {downloadError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{downloadError}</span>
              </div>
            )}
          </div>

          {/* Author Card & Description */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252b] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-[#202327] border border-zinc-300 dark:border-[#2a2e35] flex items-center justify-center font-bold text-sm text-[#e04f38] overflow-hidden">
                  {video.uploader.profile?.avatarUrl ? (
                    <img
                      src={video.uploader.profile.avatarUrl}
                      alt={video.uploader.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    video.uploader.username.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h4 className="font-heading font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {video.uploader.profile?.displayName || video.uploader.username}
                  </h4>
                  <p className="text-xs text-zinc-400">@{video.uploader.username}</p>
                </div>
              </div>

              {video.category && (
                <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-[#1f2227] text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-[#26292e]">
                  {video.category.name}
                </span>
              )}
            </div>

            {video.description && (
              <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed pt-2 border-t border-zinc-100 dark:border-[#202327] whitespace-pre-line">
                {video.description}
              </p>
            )}
          </div>

          {/* Multilingual Comment System */}
          <CommentSection videoId={video.id} />
        </div>

        {/* Right 1 Col: Up Next Broadcasts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-[#26292e]">
            <h3 className="font-heading font-bold text-sm text-zinc-900 dark:text-zinc-100">
              Related Broadcasts
            </h3>
            <span className="text-[11px] text-zinc-400">Autoplay on</span>
          </div>

          <div className="space-y-3">
            {recommendedVideos.map((rec) => (
              <Link
                key={rec.id}
                to={`/watch/${rec.slug}`}
                className="flex gap-3 group p-2 rounded-xl hover:bg-white dark:hover:bg-[#15171a] border border-transparent hover:border-zinc-200 dark:hover:border-[#22252a] transition-all"
              >
                <div className="relative aspect-video w-32 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-900">
                  <img
                    src={getMediaUrl(rec.thumbnailUrl)}
                    alt={rec.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-black/80 font-mono text-[9px] text-white">
                    {Math.floor(rec.durationSeconds / 60)}:
                    {(rec.durationSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-heading font-bold text-xs text-zinc-800 dark:text-zinc-200 line-clamp-2 group-hover:text-[#e04f38] transition-colors leading-snug">
                    {rec.title}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1 truncate">
                    {rec.uploader.profile?.displayName || rec.uploader.username}
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {rec.viewCount.toLocaleString()} views
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Video Modal */}
      <EditVideoModal
        isOpen={isEditModalOpen}
        video={video}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={(updated) => {
          setVideo((prev) => (prev ? { ...prev, ...updated } : null));
        }}
      />

      {/* Delete Video Confirm Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Broadcast?"
        message={`Are you sure you want to permanently delete "${video.title}"? This will delete the video from storage and cascade remove comments and progress.`}
        confirmText="Delete Video"
        cancelText="Cancel"
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};

