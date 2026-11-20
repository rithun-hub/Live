import React, { useState } from 'react';
import { X, ShieldAlert, Check } from 'lucide-react';
import { api } from '../../services/api';

interface ReportModalProps {
  isOpen: boolean;
  commentId: string;
  onClose: () => void;
  onReportSubmitted?: () => void;
}

const REPORT_REASONS = [
  { id: 'SPAM', label: 'Spam, advertising, or unsolicited promotion' },
  { id: 'HARASSMENT', label: 'Harassment or cyberbullying' },
  { id: 'HATE_SPEECH', label: 'Hate speech or discriminatory language' },
  { id: 'MISINFORMATION', label: 'Harmful misinformation or false reporting' },
  { id: 'INAPPROPRIATE_CONTENT', label: 'Sexually explicit or inappropriate content' },
  { id: 'OTHER', label: 'Other platform terms violation' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  commentId,
  onClose,
  onReportSubmitted,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('SPAM');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await api.post(`/comments/${commentId}/report`, {
        reason: selectedReason,
        details: details.trim() || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        if (onReportSubmitted) onReportSubmitted();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-[#181a1d] rounded-2xl border border-zinc-200 dark:border-[#26292e] shadow-2xl overflow-hidden p-6">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-[#26292e] mb-4">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold">
            <ShieldAlert size={18} className="text-[#e04f38]" />
            <h3>Report Inappropriate Comment</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Check size={24} />
            </div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
              Report Submitted for Review
            </p>
            <p className="text-xs text-zinc-500">
              Our moderation team reviews reported comments within 24 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Select Reason
              </label>
              <div className="space-y-2">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      selectedReason === r.id
                        ? 'bg-[#e04f38]/10 border-[#e04f38] text-zinc-900 dark:text-zinc-100 font-medium'
                        : 'border-zinc-200 dark:border-[#26292e] hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.id}
                      checked={selectedReason === r.id}
                      onChange={() => setSelectedReason(r.id)}
                      className="text-[#e04f38] focus:ring-[#e04f38]"
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explain why this content violates community guidelines..."
                rows={3}
                className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#121316] border border-zinc-200 dark:border-[#26292e] text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-[#e04f38]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-[#26292e]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#e04f38] hover:bg-[#cc422d] disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

