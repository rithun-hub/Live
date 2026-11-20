import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Languages,
  Reply,
  Edit2,
  Trash2,
  ShieldAlert,
  Send,
  Check,
} from 'lucide-react';
import { Comment } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { ReportModal } from '../modals/ReportModal';
import { formatDistanceToNow } from 'date-fns';

interface CommentSectionProps {
  videoId: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ videoId }) => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'liked'>('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Replying state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Translation cache: commentId -> translatedText
  const [translations, setTranslations] = useState<Record<string, { text: string; lang: string }>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);

  // Reporting modal
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      const data = await api.get(`/comments/video/${videoId}?sortBy=${sortBy}`);
      if (data.success) {
        setComments(data.comments);
      }
    } catch (err: any) {
      console.error('Failed to load comments', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [videoId, sortBy]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    if (!isAuthenticated) {
      setErrorMessage('Please sign in to join the conversation.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.post('/comments', {
        videoId,
        content: newCommentText.trim(),
      });

      if (res.success && res.comment) {
        setComments([res.comment, ...comments]);
        setNewCommentText('');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostReply = async (parentCommentId: string) => {
    if (!replyText.trim() || !isAuthenticated) return;

    try {
      const res = await api.post('/comments', {
        videoId,
        content: replyText.trim(),
        parentCommentId,
      });

      if (res.success && res.comment) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentCommentId
              ? { ...c, replies: [...(c.replies || []), res.comment] }
              : c
          )
        );
        setReplyingToId(null);
        setReplyText('');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send reply.');
    }
  };

  const handleReact = async (commentId: string, type: 'LIKE' | 'DISLIKE') => {
    if (!isAuthenticated) {
      alert('Please sign in to react to comments.');
      return;
    }

    try {
      const res = await api.post(`/comments/${commentId}/react`, { type });
      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== commentId) return c;

          const oldReaction = c.currentUserReaction;
          const newReaction = res.currentReaction;
          let likeCount = c.likeCount;
          let dislikeCount = c.dislikeCount;

          if (oldReaction === 'LIKE') likeCount--;
          if (oldReaction === 'DISLIKE') dislikeCount--;

          if (newReaction === 'LIKE') likeCount++;
          if (newReaction === 'DISLIKE') dislikeCount++;

          return {
            ...c,
            likeCount,
            dislikeCount,
            currentUserReaction: newReaction,
          };
        })
      );
    } catch (err) {
      console.error('Reaction failed', err);
    }
  };

  const handleTranslate = async (commentId: string) => {
    if (translations[commentId]) {
      // Toggle off
      const copy = { ...translations };
      delete copy[commentId];
      setTranslations(copy);
      return;
    }

    setTranslatingId(commentId);
    try {
      const targetLang = user?.preference?.preferredLanguage || 'en';
      const res = await api.post(`/comments/${commentId}/translate`, {
        targetLanguage: targetLang,
      });

      if (res.success) {
        setTranslations((prev) => ({
          ...prev,
          [commentId]: {
            text: res.translatedText,
            lang: res.targetLanguage,
          },
        }));
      }
    } catch (err: any) {
      alert(err.message || 'Translation unavailable.');
    } finally {
      setTranslatingId(null);
    }
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim()) return;

    try {
      const res = await api.put(`/comments/${commentId}`, { content: editText.trim() });
      if (res.success) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, content: editText.trim(), isEdited: true } : c))
        );
        setEditingId(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to edit comment.');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await api.delete(`/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete comment.');
    }
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Comments Header & Controls */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-[#26292e]">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-[#e04f38]" />
          <h3 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100">
            Discussion ({comments.length})
          </h3>
        </div>

        {/* Sort Filter */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-zinc-100 dark:bg-[#181a1d] border border-zinc-200 dark:border-[#26292e] rounded-lg px-2.5 py-1 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-[#e04f38]"
          >
            <option value="newest">Newest First</option>
            <option value="liked">Top Liked</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* New Comment Input Box */}
      <form onSubmit={handlePostComment} className="space-y-3">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
            {errorMessage}
          </div>
        )}

        <div className="relative">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder={
              isAuthenticated
                ? "Join the broadcast discussion... (@username mentions supported)"
                : "Sign in to join the conversation"
            }
            disabled={!isAuthenticated || submitting}
            rows={3}
            maxLength={2000}
            className="w-full p-3.5 rounded-xl text-sm bg-zinc-50 dark:bg-[#15171a] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#e04f38] transition-colors resize-none disabled:opacity-60"
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-3">
            <span className="text-[11px] text-zinc-400 font-mono">
              {newCommentText.length}/2000
            </span>
            <button
              type="submit"
              disabled={!isAuthenticated || !newCommentText.trim() || submitting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#e04f38] hover:bg-[#cc422d] text-white text-xs font-semibold disabled:opacity-40 transition-colors"
            >
              <Send size={13} />
              <span>{submitting ? 'Posting...' : 'Comment'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Comments List */}
      {isLoading ? (
        <div className="py-8 text-center text-zinc-400 text-sm">
          Loading discussion...
        </div>
      ) : comments.length === 0 ? (
        <div className="py-12 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-[#26292e] p-6 space-y-1">
          <p className="font-semibold text-zinc-700 dark:text-zinc-300 text-sm">
            No comments yet
          </p>
          <p className="text-xs text-zinc-400">
            Be the first to share your thoughts on this live broadcast.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const isAuthor = user?.id === comment.userId;
            const translation = translations[comment.id];
            const isTranslating = translatingId === comment.id;

            return (
              <div
                key={comment.id}
                className="p-4 rounded-xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#202327] space-y-3 transition-colors hover:border-zinc-300 dark:hover:border-[#2a2e35]"
              >
                {/* Author Info & Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-[#202327] border border-zinc-300 dark:border-[#2a2e35] flex items-center justify-center font-bold text-xs text-[#e04f38]">
                      {comment.user.profile?.avatarUrl ? (
                        <img
                          src={comment.user.profile.avatarUrl}
                          alt={comment.user.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        comment.user.username.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {comment.user.profile?.displayName || comment.user.username}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          @{comment.user.username}
                        </span>
                        {comment.user.role === 'ADMIN' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#e04f38]/15 text-[#e04f38] border border-[#e04f38]/20">
                            ADMIN
                          </span>
                        )}
                        {comment.user.role === 'CREATOR' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/20">
                            CREATOR
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                        <span>
                          {formatDistanceToNow(new Date(comment.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        {comment.isEdited && <span>(edited)</span>}
                      </div>
                    </div>
                  </div>

                  {/* Top Right Action: Report */}
                  <button
                    onClick={() => setReportingCommentId(comment.id)}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    title="Report comment"
                  >
                    <ShieldAlert size={14} />
                  </button>
                </div>

                {/* Comment Content / Edit Field */}
                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      className="w-full p-2.5 rounded-lg text-xs bg-zinc-50 dark:bg-[#101114] border border-[#e04f38] text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(comment.id)}
                        className="px-3 py-1 rounded bg-[#e04f38] text-white text-xs font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed break-words">
                    {comment.content}
                  </p>
                )}

                {/* Inline Translation Result */}
                {translation && (
                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-[#101215] border border-zinc-200 dark:border-[#22252b] text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-[#e04f38] uppercase tracking-wider">
                      <span>Translated to {translation.lang.toUpperCase()}</span>
                      <button
                        onClick={() => handleTranslate(comment.id)}
                        className="text-zinc-400 hover:text-zinc-200 lowercase font-normal"
                      >
                        hide
                      </button>
                    </div>
                    <p className="text-zinc-700 dark:text-zinc-300 italic">
                      {translation.text}
                    </p>
                  </div>
                )}

                {/* Bottom Action Bar */}
                <div className="flex items-center justify-between pt-1 text-xs text-zinc-500 border-t border-zinc-100 dark:border-[#1d2024]">
                  <div className="flex items-center gap-4">
                    {/* Like Button */}
                    <button
                      onClick={() => handleReact(comment.id, 'LIKE')}
                      className={`flex items-center gap-1.5 transition-colors ${
                        comment.currentUserReaction === 'LIKE'
                          ? 'text-[#e04f38] font-bold'
                          : 'hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      <ThumbsUp size={14} />
                      <span>{comment.likeCount}</span>
                    </button>

                    {/* Dislike Button */}
                    <button
                      onClick={() => handleReact(comment.id, 'DISLIKE')}
                      className={`flex items-center gap-1.5 transition-colors ${
                        comment.currentUserReaction === 'DISLIKE'
                          ? 'text-zinc-900 dark:text-zinc-100 font-bold'
                          : 'hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      <ThumbsDown size={14} />
                      {comment.dislikeCount > 0 && <span>{comment.dislikeCount}</span>}
                    </button>

                    {/* Reply Action */}
                    <button
                      onClick={() => {
                        setReplyingToId(replyingToId === comment.id ? null : comment.id);
                        setReplyText(`@${comment.user.username} `);
                      }}
                      className="flex items-center gap-1.5 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                    >
                      <Reply size={14} />
                      <span>Reply</span>
                    </button>

                    {/* Multilingual Translate Button */}
                    <button
                      onClick={() => handleTranslate(comment.id)}
                      disabled={isTranslating}
                      className="flex items-center gap-1.5 hover:text-[#e04f38] transition-colors"
                    >
                      <Languages size={14} />
                      <span>{isTranslating ? 'Translating...' : translation ? 'Hide Translation' : 'Translate'}</span>
                    </button>
                  </div>

                  {/* Owner Controls (Edit/Delete) */}
                  {(isAuthor || isAdmin) && (
                    <div className="flex items-center gap-3">
                      {isAuthor && (
                        <button
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditText(comment.content);
                          }}
                          className="hover:text-zinc-200 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Reply Input Box */}
                {replyingToId === comment.id && (
                  <div className="pt-2 pl-4 border-l-2 border-[#e04f38]/40 space-y-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to @${comment.user.username}...`}
                      rows={2}
                      className="w-full p-2.5 rounded-lg text-xs bg-zinc-50 dark:bg-[#121316] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setReplyingToId(null)}
                        className="px-3 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handlePostReply(comment.id)}
                        className="px-3 py-1 rounded bg-[#e04f38] text-white text-xs font-semibold"
                      >
                        Send Reply
                      </button>
                    </div>
                  </div>
                )}

                {/* Nested Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="pt-2 pl-4 border-l-2 border-zinc-200 dark:border-[#26292e] space-y-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {reply.user.profile?.displayName || reply.user.username}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            @{reply.user.username}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {formatDistanceToNow(new Date(reply.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-800 dark:text-zinc-200">
                          {reply.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Comment Report Modal */}
      {reportingCommentId && (
        <ReportModal
          isOpen={Boolean(reportingCommentId)}
          commentId={reportingCommentId}
          onClose={() => setReportingCommentId(null)}
          onReportSubmitted={() => {
            alert('Thank you. The report has been placed in the moderator review queue.');
          }}
        />
      )}
    </div>
  );
};

