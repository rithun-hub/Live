import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Video as VideoIcon, Compass, Flame, Clock } from 'lucide-react';
import { Video, VideoCategory } from '../types';
import { api, getMediaUrl } from '../services/api';
import { VideoCard } from '../components/video/VideoCard';
import { useAuth } from '../contexts/AuthContext';

export const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [featuredVideos, setFeaturedVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [continueWatching, setContinueWatching] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setIsLoading(true);
        const [videosRes, catsRes] = await Promise.all([
          api.get('/videos?limit=12'),
          api.get('/videos/categories'),
        ]);

        if (videosRes.success) {
          setFeaturedVideos(videosRes.videos);
        }
        if (catsRes.success) {
          setCategories(catsRes.categories);
        }

        if (isAuthenticated) {
          api.get('/videos/continue-watching')
            .then((res) => {
              if (res.success && res.continueWatching) {
                setContinueWatching(res.continueWatching);
              }
            })
            .catch(() => {});
        }
      } catch (err) {
        console.error('Failed to load homepage data', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadHomeData();
  }, [isAuthenticated]);

  const heroVideo = featuredVideos[0];
  const remainingVideos = featuredVideos.slice(1);

  const filteredVideos =
    selectedCategory === 'all'
      ? remainingVideos
      : remainingVideos.filter((v) => v.categoryId === selectedCategory);

  return (
    <div className="space-y-10 pb-12 animate-fade-in">
      {/* Featured Cinematic Hero Banner */}
      {heroVideo && (
        <div className="relative w-full rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-200 dark:border-[#22252b] shadow-xl group">
          <div className="relative aspect-[21/9] min-h-[340px] max-h-[500px] w-full">
            <img
              src={
                getMediaUrl(heroVideo.thumbnailUrl) ||
                'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&q=80'
              }
              alt={heroVideo.title}
              className="w-full h-full object-cover object-center opacity-70 group-hover:scale-102 transition-transform duration-700"
            />
            {/* Cinematic Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />

            {/* Hero Information */}
            <div className="absolute bottom-0 left-0 p-6 sm:p-10 max-w-2xl space-y-3 text-white">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#e04f38] text-white">
                  Featured Stream
                </span>
                {heroVideo.category && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/10 backdrop-blur-sm text-zinc-300">
                    {heroVideo.category.name}
                  </span>
                )}
                <span className="text-xs text-zinc-400 font-mono">
                  {heroVideo.resolution || '4K UHD'}
                </span>
              </div>

              <h1 className="font-heading font-black text-2xl sm:text-4xl text-white tracking-tight leading-tight">
                {heroVideo.title}
              </h1>

              <p className="text-xs sm:text-sm text-zinc-300 line-clamp-2 leading-relaxed">
                {heroVideo.description}
              </p>

              <div className="flex items-center gap-4 pt-2">
                <Link
                  to={`/watch/${heroVideo.slug}`}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs bg-[#e04f38] hover:bg-[#cc422d] text-white shadow-lg transition-colors"
                >
                  <Play size={16} className="fill-white" />
                  <span>Watch Broadcast</span>
                </Link>

                <Link
                  to="/meetings"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/15 transition-colors"
                >
                  <VideoIcon size={16} />
                  <span>Start Live Room</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Continue Watching Row (If active progress exists) */}
      {continueWatching.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-[#e04f38]" />
            <h2 className="font-heading font-bold text-lg text-zinc-900 dark:text-zinc-100">
              Continue Watching
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {continueWatching.map((item) => (
              <VideoCard key={item.id} video={item.video} showProgress />
            ))}
          </div>
        </section>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedCategory === 'all'
              ? 'bg-[#e04f38] text-white shadow-sm'
              : 'bg-zinc-100 dark:bg-[#181a1d] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-[#202327] border border-zinc-200 dark:border-[#26292e]'
          }`}
        >
          All Broadcasts
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? 'bg-[#e04f38] text-white shadow-sm'
                : 'bg-zinc-100 dark:bg-[#181a1d] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-[#202327] border border-zinc-200 dark:border-[#26292e]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Featured Video Streams Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-[#e04f38]" />
            <h2 className="font-heading font-bold text-lg text-zinc-900 dark:text-zinc-100">
              Popular Broadcasts
            </h2>
          </div>
          <Link
            to="/explore"
            className="text-xs font-semibold text-[#e04f38] hover:underline flex items-center gap-1"
          >
            <Compass size={14} /> Explore All
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="aspect-video rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse"
              />
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-[#26292e] p-6 text-zinc-500 text-sm">
            No videos available in this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

