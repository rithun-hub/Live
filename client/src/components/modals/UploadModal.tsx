import React, { useState, useEffect } from 'react';
import { X, Upload, Video as VideoIcon, Image as ImageIcon, Check } from 'lucide-react';
import { VideoCategory } from '../../types';
import { api } from '../../services/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.get('/videos/categories')
        .then((res) => {
          if (res.success && res.categories.length > 0) {
            setCategories(res.categories);
            setCategoryId(res.categories[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) {
      setError('Please select a video file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('categoryId', categoryId);
      formData.append('video', videoFile);
      if (thumbFile) formData.append('thumbnail', thumbFile);

      setUploadProgress(45);
      const res = await api.post('/videos/upload', formData);
      setUploadProgress(100);

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          if (onUploadSuccess) onUploadSuccess();
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload video.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-[#181a1d] rounded-2xl border border-zinc-200 dark:border-[#26292e] shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-[#26292e] mb-4">
          <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
            <Upload size={18} className="text-[#e04f38]" />
            <h3>Upload Production Broadcast</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
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
              Broadcast Published Successfully
            </p>
            <p className="text-xs text-zinc-500">
              Your stream is now live and accessible in the video library.
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
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Video Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 4K Live Broadcast Session #1"
                className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#121316] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#121316] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed broadcast synopsis, hardware setup, credits..."
                rows={3}
                className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#121316] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Video File (MP4, WebM)
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-zinc-300 dark:border-[#2a2e35] cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs text-zinc-500 truncate">
                  <VideoIcon size={16} className="text-[#e04f38] flex-shrink-0" />
                  <span className="truncate">{videoFile ? videoFile.name : 'Choose Video'}</span>
                  <input
                    type="file"
                    accept="video/*"
                    required
                    onChange={(e) => e.target.files?.[0] && setVideoFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Custom Thumbnail
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-zinc-300 dark:border-[#2a2e35] cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs text-zinc-500 truncate">
                  <ImageIcon size={16} className="text-[#e04f38] flex-shrink-0" />
                  <span className="truncate">{thumbFile ? thumbFile.name : 'Choose Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && setThumbFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {isUploading && (
              <div className="space-y-1 pt-2">
                <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
                  <span>Uploading & Ingesting Media...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${uploadProgress}%` }}
                    className="h-full bg-[#e04f38] transition-all duration-300"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-[#26292e]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#e04f38] hover:bg-[#cc422d] disabled:opacity-50 transition-colors"
              >
                {isUploading ? 'Publishing...' : 'Upload Video'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
