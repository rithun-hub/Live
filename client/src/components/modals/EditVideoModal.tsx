import React, { useState, useEffect } from 'react';
import { X, Save, Image as ImageIcon, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { VideoCategory } from '../../types';
import { api } from '../../services/api';

interface EditVideoModalProps {
  isOpen: boolean;
  video: {
    id: string;
    title: string;
    description?: string | null;
    categoryId?: string | null;
    thumbnailUrl?: string | null;
    isPublished?: boolean;
  } | null;
  onClose: () => void;
  onSuccess: (updatedVideo: any) => void;
}

export const EditVideoModal: React.FC<EditVideoModalProps> = ({
  isOpen,
  video,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && video) {
      setTitle(video.title || '');
      setDescription(video.description || '');
      setCategoryId(video.categoryId || '');
      setIsPublished(video.isPublished !== undefined ? video.isPublished : true);
      setThumbFile(null);
      setThumbPreview(video.thumbnailUrl || null);
      setError(null);
      setSavedSuccess(false);

      api.get('/videos/categories')
        .then((res) => {
          if (res.success && res.categories) {
            setCategories(res.categories);
            if (!video.categoryId && res.categories.length > 0) {
              setCategoryId(res.categories[0].id);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, video]);

  if (!isOpen || !video) return null;

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setThumbPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title cannot be empty.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      if (categoryId) formData.append('categoryId', categoryId);
      formData.append('isPublished', String(isPublished));
      if (thumbFile) formData.append('thumbnail', thumbFile);

      const res = await api.put(`/videos/${video.id}`, formData);

      if (res.success) {
        setSavedSuccess(true);
        setTimeout(() => {
          onSuccess(res.video);
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update broadcast.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in font-sans">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 px-6 border-b border-zinc-200 dark:border-[#26292e] flex items-center justify-between">
          <div>
            <h3 className="font-heading font-black text-base text-zinc-900 dark:text-zinc-100">
              Edit Broadcast Metadata
            </h3>
            <p className="text-xs text-zinc-400">Modify title, description, category, and visibility</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#202327] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
              <CheckCircle size={15} />
              <span>Changes saved successfully.</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Title <span className="text-[#e04f38]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-[#111316] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38]"
              placeholder="Broadcast title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-[#111316] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38] resize-none"
              placeholder="Broadcast summary, notes, or chapter breakdown"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-[#111316] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38]"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Thumbnail Replacement */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Thumbnail Poster
            </label>
            <div className="flex items-center gap-4">
              {thumbPreview && (
                <img
                  src={thumbPreview}
                  alt="Thumbnail Preview"
                  className="w-24 h-14 object-cover rounded-xl border border-zinc-300 dark:border-[#26292e] bg-zinc-900"
                />
              )}
              <div className="flex-1">
                <input
                  type="file"
                  id="edit-thumb-file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleThumbnailChange}
                  className="hidden"
                />
                <label
                  htmlFor="edit-thumb-file"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-zinc-300 dark:border-[#2e3238] hover:border-[#e04f38] cursor-pointer text-zinc-600 dark:text-zinc-300 hover:text-[#e04f38] transition-colors"
                >
                  <ImageIcon size={14} />
                  <span>{thumbFile ? thumbFile.name : 'Replace Thumbnail...'}</span>
                </label>
                <p className="text-[10px] text-zinc-400 mt-1">Recommended: 16:9 JPG or WebP</p>
              </div>
            </div>
          </div>

          {/* Publishing Visibility */}
          <div className="pt-2">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-[#111316] border border-zinc-200 dark:border-[#26292e] cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 rounded text-[#e04f38] focus:ring-[#e04f38] bg-zinc-900 border-zinc-700"
              />
              <div className="flex items-center gap-2">
                {isPublished ? (
                  <Eye size={15} className="text-emerald-500" />
                ) : (
                  <EyeOff size={15} className="text-zinc-500" />
                )}
                <div>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {isPublished ? 'Published & Searchable' : 'Unlisted / Draft'}
                  </span>
                  <p className="text-[10px] text-zinc-500">
                    {isPublished
                      ? 'Broadcast is visible in Home, Explore, and search results.'
                      : 'Hidden from public discovery. Accessible only to author and admins.'}
                  </p>
                </div>
              </div>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-zinc-200 dark:border-[#26292e] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#e04f38] hover:bg-[#cc422d] text-white font-bold transition-colors shadow-sm disabled:opacity-50"
            >
              <Save size={14} />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
