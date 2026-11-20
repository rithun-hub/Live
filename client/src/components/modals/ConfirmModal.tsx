import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="p-4 px-6 border-b border-zinc-200 dark:border-[#26292e] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-500/15 text-red-500 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={18} />
            </div>
            <h3 className="font-heading font-black text-sm text-zinc-900 dark:text-zinc-100">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#202327] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 bg-zinc-50 dark:bg-[#111316] border-t border-zinc-200 dark:border-[#26292e] flex items-center justify-end gap-3 text-xs">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-semibold transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl font-bold text-white transition-colors shadow-sm disabled:opacity-50 ${
              confirmVariant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : confirmVariant === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-[#e04f38] hover:bg-[#cc422d]'
            }`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
