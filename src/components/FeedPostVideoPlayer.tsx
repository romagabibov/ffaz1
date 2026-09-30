import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Heart, Film } from 'lucide-react';

interface FeedPostVideoPlayerProps {
  videoUrl: string;
  postId: string;
  onLike?: (postId: string) => void;
  isLiked?: boolean;
}

export default function FeedPostVideoPlayer({
  videoUrl,
  postId,
  onLike,
  isLiked
}: FeedPostVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.trim()) return null;

  const trimmedUrl = videoUrl.trim();

  // Check if it's a YouTube or Vimeo embeddable link
  const isYouTube = trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be');
  const isVimeo = trimmedUrl.includes('vimeo.com');

  const getYouTubeEmbed = (url: string) => {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1]?.split('&')[0] || '';
    } else if (url.includes('embed/')) {
      videoId = url.split('embed/')[1]?.split('?')[0] || '';
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  const getVimeoEmbed = (url: string) => {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}` : url;
  };

  const handleDoubleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onLike) {
      onLike(postId);
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 900);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  return (
    <div className="mb-4 relative rounded-2xl overflow-hidden border border-brand-dark/[0.08] bg-black shadow-xs select-none">
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

      {isYouTube ? (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={getYouTubeEmbed(trimmedUrl)}
            className="w-full h-full"
            title="Video content"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : isVimeo ? (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={getVimeoEmbed(trimmedUrl)}
            className="w-full h-full"
            title="Video content"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        /* Direct Video Element */
        <div 
          className="relative aspect-[16/10] sm:aspect-video max-h-[550px] w-full bg-black flex items-center justify-center group cursor-pointer"
          onClick={togglePlay}
          onDoubleClick={handleDoubleTap}
        >
          <video
            ref={videoRef}
            src={trimmedUrl}
            playsInline
            muted={isMuted}
            loop
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="w-full h-full object-contain"
          />

          {/* Center Play/Pause button on hover/pause */}
          {!isPlaying && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center transition-opacity">
              <div className="w-16 h-16 rounded-full bg-brand-accent/90 text-white flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
                <Play size={28} className="translate-x-0.5 fill-white" />
              </div>
            </div>
          )}

          {/* Video Control Bar */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} className="fill-white" />}
              </button>

              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer"
                title={isMuted ? 'Включить звук' : 'Выключить звук'}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>

              <span className="text-[10px] font-mono text-white/80 uppercase tracking-wider flex items-center gap-1">
                <Film size={11} className="text-brand-accent" />
                <span>Video</span>
              </span>
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer"
              title="На весь экран"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
