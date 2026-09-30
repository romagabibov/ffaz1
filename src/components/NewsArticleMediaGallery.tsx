import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, ChevronRight, Maximize2, X, Film, Play, 
  Images, LayoutGrid, GalleryHorizontal, ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';

export interface NewsMediaItemDisplay {
  id?: string;
  url: string;
  type?: 'image' | 'video';
  caption?: string;
  alignment?: 'full' | 'left' | 'right' | 'center';
  isCover?: boolean;
}

interface NewsArticleMediaGalleryProps {
  images?: (string | NewsMediaItemDisplay)[];
  videos?: (string | NewsMediaItemDisplay)[];
  coverImageUrl?: string;
  videoUrl?: string;
  title?: string;
  mediaLayout?: 'hero_carousel' | 'editorial_inline' | 'bottom_gallery';
}

export const NewsArticleMediaGallery: React.FC<NewsArticleMediaGalleryProps> = ({
  images = [],
  videos = [],
  coverImageUrl,
  videoUrl,
  title = '',
  mediaLayout = 'hero_carousel',
}) => {
  // Normalize images array
  const normalizedImages: NewsMediaItemDisplay[] = React.useMemo(() => {
    const list: NewsMediaItemDisplay[] = [];
    
    // If images array provided
    if (Array.isArray(images) && images.length > 0) {
      images.forEach((item, idx) => {
        if (typeof item === 'string' && item.trim()) {
          list.push({ id: `img_${idx}`, url: item.trim(), type: 'image' });
        } else if (item && typeof item === 'object' && item.url) {
          list.push({ ...item, type: 'image' });
        }
      });
    }

    // If coverImageUrl is present but not in the list, add it at the start
    if (coverImageUrl && !list.some(i => i.url === coverImageUrl)) {
      list.unshift({ id: 'cover', url: coverImageUrl, type: 'image', isCover: true });
    }

    return list;
  }, [images, coverImageUrl]);

  // Normalize videos array
  const normalizedVideos: NewsMediaItemDisplay[] = React.useMemo(() => {
    const list: NewsMediaItemDisplay[] = [];

    if (Array.isArray(videos) && videos.length > 0) {
      videos.forEach((item, idx) => {
        if (typeof item === 'string' && item.trim()) {
          list.push({ id: `vid_${idx}`, url: item.trim(), type: 'video' });
        } else if (item && typeof item === 'object' && item.url) {
          list.push({ ...item, type: 'video' });
        }
      });
    }

    if (videoUrl && !list.some(v => v.url === videoUrl)) {
      list.unshift({ id: 'main_video', url: videoUrl, type: 'video' });
    }

    return list;
  }, [videos, videoUrl]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [galleryViewMode, setGalleryViewMode] = useState<'carousel' | 'grid'>('carousel');

  const totalImages = normalizedImages.length;

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(prev => (prev === 0 ? totalImages - 1 : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(prev => (prev === totalImages - 1 ? 0 : prev + 1));
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setZoomLevel(1);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setZoomLevel(1);
  };

  const handleLightboxPrev = () => {
    setZoomLevel(1);
    setLightboxIndex(prev => (prev === 0 ? totalImages - 1 : prev - 1));
  };

  const handleLightboxNext = () => {
    setZoomLevel(1);
    setLightboxIndex(prev => (prev === totalImages - 1 ? 0 : prev + 1));
  };

  // Keyboard controls for Lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') handleLightboxPrev();
      if (e.key === 'ArrowRight') handleLightboxNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, totalImages]);

  // If no images and no videos
  if (totalImages === 0 && normalizedVideos.length === 0) {
    return null;
  }

  const currentImage = normalizedImages[currentIndex] || normalizedImages[0];
  const activeLightboxImage = normalizedImages[lightboxIndex] || normalizedImages[0];

  return (
    <div className="space-y-8 my-6">
      {/* =========================================================================
          1. HERO MEDIA CAROUSEL / SINGLE IMAGE (UP TO 35 PHOTOS)
          ========================================================================= */}
      {totalImages > 0 && (
        <div className="space-y-3">
          {/* Main Display Frame */}
          <div className="relative rounded-2xl border border-brand-dark/[0.12] bg-brand-dark overflow-hidden shadow-sm select-none group">
            {totalImages === 1 ? (
              // Single Photo
              <div 
                onClick={() => openLightbox(0)}
                className="relative max-h-[620px] w-full flex items-center justify-center bg-brand-dark/95 cursor-zoom-in overflow-hidden"
              >
                <img 
                  src={currentImage.url} 
                  alt={currentImage.caption || title} 
                  className="w-full h-full max-h-[620px] object-cover sm:object-contain"
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openLightbox(0); }}
                  className="absolute bottom-4 right-4 bg-brand-dark/80 hover:bg-brand-accent text-white p-2.5 rounded-full backdrop-blur-md transition-colors shadow-sm"
                  title="Открыть в полный экран"
                >
                  <Maximize2 size={16} />
                </button>
              </div>
            ) : (
              // Multi-Photo Interactive Carousel (up to 35)
              <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] md:max-h-[600px] flex items-center justify-center bg-black">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full h-full flex items-center justify-center cursor-zoom-in relative"
                    onClick={() => openLightbox(currentIndex)}
                  >
                    <img 
                      src={currentImage.url} 
                      alt={currentImage.caption || `${title} - photo ${currentIndex + 1}`} 
                      className="w-full h-full object-cover sm:object-contain"
                    />

                    {/* Top Counter Badge & View Mode Toggle */}
                    <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
                      <div className="bg-brand-dark/85 backdrop-blur-md border border-white/20 text-white font-mono text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                        <Images size={13} className="text-brand-accent" />
                        <span>{String(currentIndex + 1).padStart(2, '0')} / {String(totalImages).padStart(2, '0')}</span>
                      </div>
                    </div>

                    {/* Top Right Fullscreen Button */}
                    <div className="absolute top-4 right-4 z-20">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openLightbox(currentIndex); }}
                        className="bg-brand-dark/80 hover:bg-brand-accent text-white p-2 rounded-full border border-white/20 backdrop-blur-md transition-colors shadow-sm cursor-pointer"
                        title="Увеличить в полный экран"
                      >
                        <Maximize2 size={16} />
                      </button>
                    </div>

                    {/* Bottom Caption Overlay */}
                    {currentImage.caption && (
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 sm:p-6 text-white z-20">
                        <p className="font-sans text-xs sm:text-sm text-white/95 font-medium leading-snug drop-shadow-sm">
                          {currentImage.caption}
                        </p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Left Arrow */}
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-brand-dark/75 hover:bg-brand-accent text-white border border-white/20 flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-105 cursor-pointer shadow-md"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={22} />
                </button>

                {/* Right Arrow */}
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-brand-dark/75 hover:bg-brand-accent text-white border border-white/20 flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-105 cursor-pointer shadow-md"
                  aria-label="Next image"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
            )}
          </div>

          {/* Thumbnail Strip for Multi-Photo Jump (when > 1 photo) */}
          {totalImages > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-thin scrollbar-thumb-brand-dark/20">
              {normalizedImages.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative shrink-0 w-16 h-12 sm:w-20 sm:h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    currentIndex === idx 
                      ? 'border-brand-accent scale-105 shadow-xs ring-2 ring-brand-accent/20' 
                      : 'border-brand-dark/10 opacity-60 hover:opacity-100 hover:border-brand-dark/40'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  <span className="absolute bottom-0.5 right-1 text-[9px] font-mono font-bold text-white bg-black/75 px-1 rounded-xs">
                    {idx + 1}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          2. VIDEOS SECTION (UP TO 5 VIDEOS)
          ========================================================================= */}
      {normalizedVideos.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-brand-dark/[0.08]">
          <div className="flex items-center gap-2">
            <Film size={18} className="text-brand-accent" />
            <h3 className="font-serif text-xl sm:text-2xl font-normal tracking-tight text-brand-dark">
              {normalizedVideos.length === 1 ? 'Видеоматериал' : `Видеорепортажи (${normalizedVideos.length})`}
            </h3>
          </div>

          <div className={`grid gap-6 ${normalizedVideos.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {normalizedVideos.map((vid, idx) => {
              const isEmbed = vid.url.includes('youtube.com') || vid.url.includes('youtu.be') || vid.url.includes('vimeo.com');
              const embedUrl = vid.url.includes('watch?v=') 
                ? vid.url.replace('watch?v=', 'embed/') 
                : vid.url.includes('youtu.be/') 
                  ? vid.url.replace('youtu.be/', 'www.youtube.com/embed/') 
                  : vid.url;

              return (
                <div key={vid.id || idx} className="space-y-2">
                  <div className="rounded-2xl border border-brand-dark/[0.1] overflow-hidden aspect-video bg-black shadow-xs relative">
                    {isEmbed ? (
                      <iframe 
                        src={embedUrl} 
                        className="w-full h-full" 
                        title={vid.caption || `Video ${idx + 1}`}
                        allowFullScreen
                      />
                    ) : (
                      <video 
                        src={vid.url} 
                        controls 
                        className="w-full h-full object-contain" 
                      />
                    )}
                  </div>
                  {vid.caption && (
                    <p className="font-mono text-xs text-brand-dark/70 italic px-1">
                      {vid.caption}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          3. FULLSCREEN LIGHTBOX MODAL WITH ZOOM & TOUCH SWIPE
          ========================================================================= */}
      <AnimatePresence>
        {lightboxOpen && activeLightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6"
            onClick={closeLightbox}
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between text-white z-20 shrink-0" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs sm:text-sm uppercase tracking-widest text-white/75 bg-white/10 px-3 py-1 rounded-full border border-white/15">
                  Фото {lightboxIndex + 1} из {totalImages}
                </span>
              </div>

              {/* Zoom & Close Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.min(prev + 0.5, 3))}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/15 transition-colors cursor-pointer"
                  title="Увеличить"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.max(prev - 0.5, 1))}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/15 transition-colors cursor-pointer"
                  title="Уменьшить"
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/15 transition-colors cursor-pointer"
                  title="Сбросить масштаб"
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="w-9 h-9 rounded-full bg-brand-accent hover:bg-red-700 text-white flex items-center justify-center transition-colors cursor-pointer ml-2 shadow-sm"
                  title="Закрыть (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Central High-Res Image View */}
            <div className="flex-1 flex items-center justify-center overflow-hidden relative my-2" onClick={e => e.stopPropagation()}>
              <motion.img 
                key={`lb_${lightboxIndex}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: zoomLevel }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                src={activeLightboxImage.url} 
                alt={activeLightboxImage.caption || ''} 
                className="max-h-[82vh] max-w-[92vw] object-contain select-none transition-transform duration-200"
              />

              {/* Prev / Next Arrows */}
              {totalImages > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handleLightboxPrev}
                    className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-brand-accent text-white border border-white/20 flex items-center justify-center transition-colors cursor-pointer shadow-lg"
                  >
                    <ChevronLeft size={28} />
                  </button>
                  <button
                    type="button"
                    onClick={handleLightboxNext}
                    className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-brand-accent text-white border border-white/20 flex items-center justify-center transition-colors cursor-pointer shadow-lg"
                  >
                    <ChevronRight size={28} />
                  </button>
                </>
              )}
            </div>

            {/* Bottom Caption & Thumbnails */}
            <div className="text-center text-white/90 z-20 shrink-0 space-y-2" onClick={e => e.stopPropagation()}>
              {activeLightboxImage.caption && (
                <p className="font-sans text-xs sm:text-sm max-w-2xl mx-auto px-4 drop-shadow-md">
                  {activeLightboxImage.caption}
                </p>
              )}

              {/* Mini thumbnails strip in lightbox */}
              {totalImages > 1 && (
                <div className="flex items-center justify-center gap-1.5 overflow-x-auto py-1 max-w-xl mx-auto">
                  {normalizedImages.map((img, idx) => (
                    <button
                      key={img.id || idx}
                      type="button"
                      onClick={() => { setZoomLevel(1); setLightboxIndex(idx); }}
                      className={`w-10 h-7 rounded-sm overflow-hidden border transition-all ${
                        lightboxIndex === idx ? 'border-brand-accent scale-110' : 'border-white/30 opacity-50'
                      }`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
