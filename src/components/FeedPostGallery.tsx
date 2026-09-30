import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Maximize2, 
  Heart, 
  LayoutGrid, 
  GalleryHorizontal,
  Sparkles
} from 'lucide-react';

interface FeedPostGalleryProps {
  images: string[];
  postId: string;
  onLike?: (postId: string) => void;
  isLiked?: boolean;
}

export default function FeedPostGallery({
  images,
  postId,
  onLike,
  isLiked
}: FeedPostGalleryProps) {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('carousel');
  const touchStartXRef = useRef<number | null>(null);

  // Filter out empty strings
  const validImages = (images || []).filter(url => Boolean(url && typeof url === 'string' && url.trim()));
  const total = validImages.length;

  // Handle double-tap to like
  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (onLike) {
      onLike(postId);
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 900);
    }
  };

  const nextSlide = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCarouselIndex((prev) => (prev + 1) % total);
  };

  const prevSlide = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCarouselIndex((prev) => (prev - 1 + total) % total);
  };

  // Touch swipe support for carousel
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (diff > 45) {
      nextSlide();
    } else if (diff < -45) {
      prevSlide();
    }
    touchStartXRef.current = null;
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev !== null ? (prev + 1) % total : null));
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev !== null ? (prev - 1 + total) % total : null));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, total]);

  if (total === 0) return null;

  return (
    <div className="mb-4 relative select-none">
      {/* Visual Heart Animation on Double Click */}
      <AnimatePresence>
        {showHeartAnim && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.4, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
          >
            <div className="p-4 rounded-full bg-white/20 backdrop-blur-md shadow-2xl border border-white/40">
              <Heart size={64} className="text-red-500 fill-red-500 drop-shadow-lg" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SINGLE PHOTO DISPLAY */}
      {total === 1 && (
        <div
          onDoubleClick={handleDoubleTap}
          onClick={() => setLightboxIndex(0)}
          className="bg-brand-muted/20 border border-brand-dark/[0.06] rounded-2xl overflow-hidden relative cursor-pointer group shadow-2xs aspect-[4/3] sm:aspect-[16/10] max-h-[550px]"
        >
          <img
            src={validImages[0]}
            alt="Editorial post photo"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02] transform-gpu will-change-transform"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3.5">
            <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-mono tracking-wider px-3 py-1 rounded-full uppercase">
              Double-tap to like
            </span>
            <span className="bg-black/60 backdrop-blur-md text-white p-1.5 rounded-full hover:bg-black/80 transition-colors">
              <Maximize2 size={13} />
            </span>
          </div>
        </div>
      )}

      {/* MULTIPLE PHOTOS (CAROUSEL VIEW) */}
      {total > 1 && viewMode === 'carousel' && (
        <div className="relative rounded-2xl overflow-hidden border border-brand-dark/[0.08] bg-brand-muted/30 shadow-xs group">
          {/* Main Slide Stage */}
          <div 
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={handleDoubleTap}
            onClick={() => setLightboxIndex(carouselIndex)}
            className="relative aspect-[4/3] sm:aspect-[16/10] max-h-[540px] w-full overflow-hidden cursor-pointer bg-black/5"
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={carouselIndex}
                src={validImages[carouselIndex]}
                alt={`Photo ${carouselIndex + 1} of ${total}`}
                initial={{ opacity: 0.4, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0.4, scale: 0.98 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover select-none"
              />
            </AnimatePresence>

            {/* Top Bar Badges inside slide: Counter + Mode Switcher */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
              <span className="bg-black/65 backdrop-blur-md text-white font-mono text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/20 shadow-xs">
                {carouselIndex + 1} / {total}
              </span>

              <div className="flex items-center gap-1.5 pointer-events-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewMode('grid');
                  }}
                  className="bg-black/65 hover:bg-black/85 backdrop-blur-md text-white/90 hover:text-white p-1.5 rounded-full border border-white/20 transition-all shadow-xs cursor-pointer"
                  title="Переключить на сетку"
                >
                  <LayoutGrid size={13} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(carouselIndex);
                  }}
                  className="bg-black/65 hover:bg-black/85 backdrop-blur-md text-white/90 hover:text-white p-1.5 rounded-full border border-white/20 transition-all shadow-xs cursor-pointer"
                  title="Открыть во весь экран"
                >
                  <Maximize2 size={13} />
                </button>
              </div>
            </div>

            {/* Left & Right Navigation Arrows */}
            <button
              type="button"
              onClick={prevSlide}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white border border-white/25 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 sm:opacity-80 backdrop-blur-xs shadow-md cursor-pointer"
              aria-label="Предыдущее фото"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={nextSlide}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white border border-white/25 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 sm:opacity-80 backdrop-blur-xs shadow-md cursor-pointer"
              aria-label="Следующее фото"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Bottom Pagination Dots & Thumbnails Indicator */}
          <div className="p-2.5 bg-brand-card/90 border-t border-brand-dark/[0.06] flex items-center justify-between gap-2">
            {/* Dots */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {validImages.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCarouselIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === carouselIndex 
                      ? 'w-6 bg-brand-accent shadow-2xs' 
                      : 'w-1.5 bg-brand-dark/25 hover:bg-brand-dark/50'
                  }`}
                  aria-label={`Перейти к фото ${idx + 1}`}
                />
              ))}
            </div>

            {/* Mini thumbnail strip */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {validImages.map((thumb, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCarouselIndex(idx);
                  }}
                  className={`w-7 h-7 rounded-md overflow-hidden border transition-all shrink-0 cursor-pointer ${
                    idx === carouselIndex 
                      ? 'border-brand-accent ring-1 ring-brand-accent scale-105' 
                      : 'border-brand-dark/10 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={thumb} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MULTIPLE PHOTOS (GRID / COLLAGE VIEW) */}
      {total > 1 && viewMode === 'grid' && (
        <div className="relative rounded-2xl overflow-hidden border border-brand-dark/[0.08] bg-brand-muted/20 p-2 shadow-xs">
          {/* Top Switcher Button to return to Carousel */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="font-mono text-[11px] font-semibold text-brand-dark/70 uppercase tracking-wider flex items-center gap-1.5">
              <LayoutGrid size={12} className="text-brand-accent" />
              Галерея: {total} фото
            </span>
            <button
              type="button"
              onClick={() => setViewMode('carousel')}
              className="text-[11px] font-mono font-medium text-brand-accent hover:text-brand-dark uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-full border border-brand-dark/10 shadow-2xs"
            >
              <GalleryHorizontal size={12} />
              <span>Режим карусели</span>
            </button>
          </div>

          {/* Grid Layouts based on count */}
          {total === 2 && (
            <div className="grid grid-cols-2 gap-2">
              {validImages.map((img, idx) => (
                <div
                  key={idx}
                  onDoubleClick={handleDoubleTap}
                  onClick={() => setLightboxIndex(idx)}
                  className="relative aspect-[3/4] sm:aspect-[4/3] rounded-xl overflow-hidden cursor-pointer group bg-black/5"
                >
                  <img
                    src={img}
                    alt={`Photo ${idx + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 size={16} className="text-white drop-shadow-md" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {total === 3 && (
            <div className="grid grid-cols-3 gap-2">
              <div
                onDoubleClick={handleDoubleTap}
                onClick={() => setLightboxIndex(0)}
                className="col-span-2 aspect-[4/3] sm:aspect-[16/10] rounded-xl overflow-hidden cursor-pointer group relative bg-black/5"
              >
                <img
                  src={validImages[0]}
                  alt="Photo 1"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 size={18} className="text-white drop-shadow-md" />
                </div>
              </div>
              <div className="col-span-1 flex flex-col gap-2">
                {validImages.slice(1, 3).map((img, idx) => (
                  <div
                    key={idx + 1}
                    onDoubleClick={handleDoubleTap}
                    onClick={() => setLightboxIndex(idx + 1)}
                    className="flex-1 aspect-[4/3] rounded-xl overflow-hidden cursor-pointer group relative bg-black/5"
                  >
                    <img
                      src={img}
                      alt={`Photo ${idx + 2}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 size={14} className="text-white drop-shadow-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {total >= 4 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {validImages.map((img, idx) => (
                <div
                  key={idx}
                  onDoubleClick={handleDoubleTap}
                  onClick={() => setLightboxIndex(idx)}
                  className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-black/5"
                >
                  <img
                    src={img}
                    alt={`Photo ${idx + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 size={16} className="text-white drop-shadow-md" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HIGH-RES LIGHTBOX MODAL */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between z-10 w-full max-w-5xl mx-auto" onClick={(e) => e.stopPropagation()}>
              <div className="font-mono text-xs text-white/80 tracking-widest uppercase px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15">
                {lightboxIndex + 1} / {total}
              </div>
              <button
                onClick={() => setLightboxIndex(null)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/15 cursor-pointer"
                title="Close (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Main Stage with Image */}
            <div
              className="relative flex-1 flex items-center justify-center max-w-5xl w-full mx-auto my-2 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {total > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex((prev) => (prev !== null ? (prev - 1 + total) % total : null));
                  }}
                  className="absolute left-2 sm:left-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center transition-colors backdrop-blur-sm cursor-pointer"
                  title="Previous (Arrow Left)"
                >
                  <ChevronLeft size={22} />
                </button>
              )}

              <AnimatePresence mode="wait">
                <motion.img
                  key={lightboxIndex}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  src={validImages[lightboxIndex]}
                  alt={`Full size preview ${lightboxIndex + 1}`}
                  className="max-h-[82vh] max-w-full object-contain rounded-xl shadow-2xl select-none"
                  onDoubleClick={handleDoubleTap}
                />
              </AnimatePresence>

              {total > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex((prev) => (prev !== null ? (prev + 1) % total : null));
                  }}
                  className="absolute right-2 sm:right-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center transition-colors backdrop-blur-sm cursor-pointer"
                  title="Next (Arrow Right)"
                >
                  <ChevronRight size={22} />
                </button>
              )}
            </div>

            {/* Bottom Thumbnail Strip (if multiple) */}
            {total > 1 && (
              <div
                className="flex items-center justify-center gap-2 z-10 overflow-x-auto py-1 max-w-xl mx-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {validImages.map((thumb, idx) => (
                  <button
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      idx === lightboxIndex
                        ? 'border-white scale-105 shadow-md'
                        : 'border-white/30 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={thumb} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
