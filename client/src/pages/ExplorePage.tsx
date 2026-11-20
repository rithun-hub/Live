import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Compass, SlidersHorizontal } from 'lucide-react';
import { Video, VideoCategory } from '../types';
import { api } from '../services/api';
import { VideoCard } from '../components/video/VideoCard';

export const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('search') || '';

  const [search, setSearch] = useState(queryParam);
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'duration'>('newest');
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSearch(queryParam);
  }, [queryParam]);

  useEffect(() => {
    api.get('/videos/categories')
      .then((res) => {
        if (res.success) setCategories(res.categories);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        let endpoint = `/videos?sortBy=${sortBy}`;
        if (search) endpoint += `&search=${encodeURIComponent(search)}`;
        if (selectedCategory !== 'all') endpoint += `&categoryId=${selectedCategory}`;

        const res = await api.get(endpoint);
        if (res.success) {
          setVideos(res.videos);
        }
      } catch (err) {
        console.error('Failed to load explore videos', err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchVideos, 300);
    return () => clearTimeout(debounce);
  }, [search, selectedCategory, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      setSearchParams({ search: search.trim() });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-[#26292e]">
        <div>
          <h1 className="font-heading font-black text-2xl text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Compass size={22} className="text-[#e04f38]" />
            <span>Explore Video Library</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Browse live broadcasts, technical masterclasses, and curated cinema.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="text"
            placeholder="Search by title or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#26292e] rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-[#e04f38]"
          />
        </form>
      </div>

      {/* Filter and Sorting Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-[#e04f38] text-white'
                : 'bg-zinc-100 dark:bg-[#181a1d] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-[#202327] border border-zinc-200 dark:border-[#26292e]'
            }`}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === c.id
                  ? 'bg-[#e04f38] text-white'
                  : 'bg-zinc-100 dark:bg-[#181a1d] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-[#202327] border border-zinc-200 dark:border-[#26292e]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <SlidersHorizontal size={14} />
          <span>Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#26292e] rounded-xl px-2.5 py-1 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-[#e04f38]"
          >
            <option value="newest">Newest Uploads</option>
            <option value="popular">Most Popular</option>
            <option value="duration">Longest Duration</option>
          </select>
        </div>
      </div>

      {/* Video Results Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="aspect-video rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse"
            />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-[#26292e] p-8 text-zinc-500 text-sm space-y-1">
          <p className="font-semibold text-zinc-700 dark:text-zinc-300">
            No matching videos found
          </p>
          <p className="text-xs text-zinc-400">
            Try adjusting your search terms or category selection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};
