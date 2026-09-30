import React, { useState, useRef } from 'react';
import { 
  Image as ImageIcon, Images, Film, Video, Plus, Trash2, Star, 
  ArrowUp, ArrowDown, Upload, Link as LinkIcon, AlignLeft, AlignRight, 
  AlignCenter, Maximize2, Play, Sparkles, LayoutGrid, Columns, 
  Check, X, Loader2, Info, Eye, Layers
} from 'lucide-react';
import { uploadMediaFile } from '../lib/upload';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export interface NewsMediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  caption?: string;
  alignment?: 'full' | 'left' | 'right' | 'center';
  isCover?: boolean;
}

interface NewsEditorMediaManagerProps {
  images: NewsMediaItem[];
  videos: NewsMediaItem[];
  onUpdateImages: (images: NewsMediaItem[]) => void;
  onUpdateVideos: (videos: NewsMediaItem[]) => void;
  onInsertIntoEditor: (htmlSnippet: string) => void;
  coverImageUrl?: string;
  onSetCoverImage?: (url: string) => void;
  mediaLayout: 'hero_carousel' | 'editorial_inline' | 'bottom_gallery';
  onChangeMediaLayout: (layout: 'hero_carousel' | 'editorial_inline' | 'bottom_gallery') => void;
}

const MAX_IMAGES = 35;
const MAX_VIDEOS = 5;

export const NewsEditorMediaManager: React.FC<NewsEditorMediaManagerProps> = ({
  images,
  videos,
  onUpdateImages,
  onUpdateVideos,
  onInsertIntoEditor,
  coverImageUrl,
  onSetCoverImage,
  mediaLayout,
  onChangeMediaLayout,
}) => {
  const [activeTab, setActiveTab] = useState<'images' | 'videos' | 'layouts'>('images');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; percent: number } | null>(null);
  
  // Single image URL input
  const [singleImageUrl, setSingleImageUrl] = useState('');
  const [singleImageCaption, setSingleImageCaption] = useState('');
  
  // Single video URL input
  const [singleVideoUrl, setSingleVideoUrl] = useState('');
  const [singleVideoCaption, setSingleVideoCaption] = useState('');

  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Handle Multi-Image Upload (up to 35)
  const handleImageFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const availableSlots = MAX_IMAGES - images.length;
    if (availableSlots <= 0) {
      toast.error(`Достигнут лимит: максимум ${MAX_IMAGES} фото для одной новости`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, availableSlots);
    if (files.length > availableSlots) {
      toast.warning(`Выбрано ${files.length} фото. Будут загружены первые ${availableSlots} (макс. ${MAX_IMAGES})`);
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: filesToUpload.length, percent: 5 });

    const newItems: NewsMediaItem[] = [];

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      try {
        setUploadProgress({
          current: i + 1,
          total: filesToUpload.length,
          percent: Math.round(((i + 0.2) / filesToUpload.length) * 100)
        });

        const url = await uploadMediaFile(file, (_stage, p) => {
          const base = (i / filesToUpload.length) * 100;
          const portion = (p / 100) * (100 / filesToUpload.length);
          setUploadProgress({
            current: i + 1,
            total: filesToUpload.length,
            percent: Math.min(99, Math.round(base + portion))
          });
        });

        if (url) {
          const isFirstCover = images.length === 0 && newItems.length === 0;
          newItems.push({
            id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            url,
            type: 'image',
            caption: '',
            alignment: 'full',
            isCover: isFirstCover
          });

          if (isFirstCover && onSetCoverImage) {
            onSetCoverImage(url);
          }
        }
      } catch (err: any) {
        console.error('Error uploading image file:', err);
        toast.error(`Ошибка загрузки файла ${file.name}`);
      }
    }

    if (newItems.length > 0) {
      const updated = [...images, ...newItems];
      onUpdateImages(updated);
      toast.success(`Успешно загружено ${newItems.length} фото (всего ${updated.length}/${MAX_IMAGES})`);
    }

    setIsUploading(false);
    setUploadProgress(null);
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = '';
    }
  };

  // Add Image by URL
  const handleAddImageUrl = () => {
    if (!singleImageUrl.trim()) return;
    if (images.length >= MAX_IMAGES) {
      toast.error(`Достигнут максимум ${MAX_IMAGES} фото`);
      return;
    }

    const isFirstCover = images.length === 0;
    const newItem: NewsMediaItem = {
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      url: singleImageUrl.trim(),
      type: 'image',
      caption: singleImageCaption.trim(),
      alignment: 'full',
      isCover: isFirstCover
    };

    const updated = [...images, newItem];
    onUpdateImages(updated);
    if (isFirstCover && onSetCoverImage) {
      onSetCoverImage(newItem.url);
    }
    setSingleImageUrl('');
    setSingleImageCaption('');
    toast.success('Фото добавлено по ссылке');
  };

  // Handle Video Upload (up to 5)
  const handleVideoFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (videos.length >= MAX_VIDEOS) {
      toast.error(`Достигнут лимит: максимум ${MAX_VIDEOS} видео для новости`);
      return;
    }

    const file = files[0];
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Размер видеофайла превышает 50MB. Рекомендуем использовать ссылку на YouTube или сжать видео.');
      return;
    }

    setIsUploading(true);
    setUploadProgress({ current: 1, total: 1, percent: 10 });

    try {
      const url = await uploadMediaFile(file, (_stage, p) => {
        setUploadProgress({ current: 1, total: 1, percent: p });
      });

      if (url) {
        const newItem: NewsMediaItem = {
          id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          url,
          type: 'video',
          caption: singleVideoCaption.trim() || file.name,
          alignment: 'full'
        };
        const updated = [...videos, newItem];
        onUpdateVideos(updated);
        toast.success(`Видео успешно загружено (${updated.length}/${MAX_VIDEOS})`);
      }
    } catch (err) {
      console.error('Video upload error:', err);
      toast.error('Не удалось загрузить видеофайл');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (videoFileInputRef.current) {
        videoFileInputRef.current.value = '';
      }
    }
  };

  // Add Video by URL
  const handleAddVideoUrl = () => {
    if (!singleVideoUrl.trim()) return;
    if (videos.length >= MAX_VIDEOS) {
      toast.error(`Достигнут лимит ${MAX_VIDEOS} видео`);
      return;
    }

    const newItem: NewsMediaItem = {
      id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      url: singleVideoUrl.trim(),
      type: 'video',
      caption: singleVideoCaption.trim(),
      alignment: 'full'
    };

    const updated = [...videos, newItem];
    onUpdateVideos(updated);
    setSingleVideoUrl('');
    setSingleVideoCaption('');
    toast.success('Видео добавлено по ссылке');
  };

  // Set Cover Image
  const handleSetCover = (img: NewsMediaItem) => {
    const updated = images.map(i => ({ ...i, isCover: i.id === img.id }));
    onUpdateImages(updated);
    if (onSetCoverImage) {
      onSetCoverImage(img.url);
    }
    toast.success('Назначено главной обложкой статьи');
  };

  // Delete Image
  const handleDeleteImage = (id: string) => {
    const updated = images.filter(i => i.id !== id);
    onUpdateImages(updated);
    if (coverImageUrl && !updated.some(i => i.url === coverImageUrl) && updated.length > 0 && onSetCoverImage) {
      onSetCoverImage(updated[0].url);
    }
  };

  // Delete Video
  const handleDeleteVideo = (id: string) => {
    const updated = videos.filter(v => v.id !== id);
    onUpdateVideos(updated);
  };

  // Move item up/down
  const handleMoveImage = (idx: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= images.length) return;
    const copy = [...images];
    const temp = copy[idx];
    copy[idx] = copy[newIdx];
    copy[newIdx] = temp;
    onUpdateImages(copy);
  };

  // Update image alignment
  const handleImageAlignmentChange = (id: string, alignment: 'full' | 'left' | 'right' | 'center') => {
    const updated = images.map(i => i.id === id ? { ...i, alignment } : i);
    onUpdateImages(updated);
  };

  // Update image caption
  const handleImageCaptionChange = (id: string, caption: string) => {
    const updated = images.map(i => i.id === id ? { ...i, caption } : i);
    onUpdateImages(updated);
  };

  // Update video caption
  const handleVideoCaptionChange = (id: string, caption: string) => {
    const updated = videos.map(v => v.id === id ? { ...v, caption } : v);
    onUpdateVideos(updated);
  };

  // Update video alignment
  const handleVideoAlignmentChange = (id: string, alignment: 'full' | 'left' | 'right' | 'center') => {
    const updated = videos.map(v => v.id === id ? { ...v, alignment } : v);
    onUpdateVideos(updated);
  };

  // Insert Image Into ReactQuill Editor with Rich Formatting & Alignment
  const insertImageSnippet = (item: NewsMediaItem) => {
    const align = item.alignment || 'full';
    let wrapperClass = 'my-6 block clear-both';
    let imgClass = 'rounded-xl border border-black/10 object-cover';
    let captionStyle = 'font-mono text-xs text-gray-500 mt-2 italic text-center';

    if (align === 'left') {
      wrapperClass = 'float-left mr-6 mb-4 max-w-sm sm:max-w-md w-full clear-left';
      captionStyle = 'font-mono text-xs text-gray-500 mt-1 italic text-left';
    } else if (align === 'right') {
      wrapperClass = 'float-right ml-6 mb-4 max-w-sm sm:max-w-md w-full clear-right';
      captionStyle = 'font-mono text-xs text-gray-500 mt-1 italic text-right';
    } else if (align === 'center') {
      wrapperClass = 'mx-auto my-6 max-w-2xl text-center block';
    } else {
      wrapperClass = 'w-full my-6 block';
      imgClass = 'w-full max-h-[550px] rounded-2xl border border-black/10 object-cover';
    }

    const captionHtml = item.caption ? `<figcaption class="${captionStyle}">${item.caption}</figcaption>` : '';
    const snippet = `<figure class="news-media-block news-align-${align} ${wrapperClass}"><img src="${item.url}" alt="${item.caption || 'News image'}" class="${imgClass}" />${captionHtml}</figure><p><br></p>`;

    onInsertIntoEditor(snippet);
    toast.success('Фотография вставлена в текст статьи');
  };

  // Insert Video Snippet into Editor
  const insertVideoSnippet = (item: NewsMediaItem) => {
    const align = item.alignment || 'full';
    const isEmbed = item.url.includes('youtube.com') || item.url.includes('youtu.be') || item.url.includes('vimeo.com');
    const embedUrl = item.url.includes('watch?v=') 
      ? item.url.replace('watch?v=', 'embed/') 
      : item.url.includes('youtu.be/') 
        ? item.url.replace('youtu.be/', 'www.youtube.com/embed/') 
        : item.url;

    let wrapperClass = 'my-6 w-full max-w-3xl block';
    if (align === 'left') wrapperClass = 'float-left mr-6 mb-4 max-w-md w-full';
    if (align === 'right') wrapperClass = 'float-right ml-6 mb-4 max-w-md w-full';
    if (align === 'center') wrapperClass = 'mx-auto my-6 max-w-3xl block';

    const videoElement = isEmbed 
      ? `<div class="aspect-video w-full rounded-2xl overflow-hidden border border-black/10 shadow-xs"><iframe src="${embedUrl}" class="w-full h-full" frameborder="0" allowfullscreen></iframe></div>`
      : `<div class="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-black/10 shadow-xs"><video src="${item.url}" controls class="w-full h-full object-contain"></video></div>`;

    const captionHtml = item.caption ? `<figcaption class="font-mono text-xs text-gray-500 mt-2 text-center italic">${item.caption}</figcaption>` : '';
    const snippet = `<figure class="news-video-block ${wrapperClass}">${videoElement}${captionHtml}</figure><p><br></p>`;

    onInsertIntoEditor(snippet);
    toast.success('Видео вставлено в текст статьи');
  };

  // Insert Grid Gallery Snippet (2-3 columns) from selected/all images
  const insertGalleryGridSnippet = (count: number = 3) => {
    if (images.length === 0) {
      toast.error('Сначала загрузите хотя бы 2-3 фотографии');
      return;
    }
    const sample = images.slice(0, Math.min(images.length, count));
    const cols = sample.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3';
    
    let html = `<div class="news-gallery-grid my-8 grid ${cols} gap-3 sm:gap-4 not-prose">`;
    sample.forEach((img, idx) => {
      html += `<div class="rounded-xl overflow-hidden border border-black/10 aspect-[4/3] bg-gray-100">
        <img src="${img.url}" alt="${img.caption || `Gallery photo ${idx + 1}`}" class="w-full h-full object-cover" />
      </div>`;
    });
    html += `</div><p><br></p>`;

    onInsertIntoEditor(html);
    toast.success(`Сетка из ${sample.length} фото вставлена в текст`);
  };

  // Insert Editorial Pull Quote Snippet
  const insertPullQuoteSnippet = () => {
    const snippet = `<blockquote class="news-editorial-quote my-8 border-l-4 border-[#7A0000] bg-[#7A0000]/5 py-4 px-6 rounded-r-2xl font-serif text-lg sm:text-xl italic text-brand-dark">«Здесь ключевая мысль или яркая цитата из материала...»</blockquote><p><br></p>`;
    onInsertIntoEditor(snippet);
    toast.success('Цитатная врезка вставлена');
  };

  return (
    <div className="bg-white border-2 border-brand-dark p-4 sm:p-5 rounded-none mb-6 space-y-5 shadow-2xs">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-brand-dark pb-3">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-brand-accent" />
          <h3 className="font-serif font-bold text-base sm:text-lg tracking-tight uppercase text-brand-dark">
            Медиа-менеджер и верстка статьи
          </h3>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-brand-light p-1 border border-brand-dark">
          <button
            type="button"
            onClick={() => setActiveTab('images')}
            className={`px-3 py-1.5 font-mono text-xs uppercase font-bold tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'images' ? 'bg-brand-dark text-white shadow-2xs' : 'text-brand-dark hover:bg-white'
            }`}
          >
            <Images size={13} />
            <span>Фото ({images.length}/{MAX_IMAGES})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('videos')}
            className={`px-3 py-1.5 font-mono text-xs uppercase font-bold tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'videos' ? 'bg-brand-dark text-white shadow-2xs' : 'text-brand-dark hover:bg-white'
            }`}
          >
            <Video size={13} />
            <span>Видео ({videos.length}/{MAX_VIDEOS})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('layouts')}
            className={`px-3 py-1.5 font-mono text-xs uppercase font-bold tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'layouts' ? 'bg-brand-dark text-white shadow-2xs' : 'text-brand-dark hover:bg-white'
            }`}
          >
            <Sparkles size={13} />
            <span>Быстрая вставка</span>
          </button>
        </div>
      </div>

      {/* Upload Progress Overlay */}
      {isUploading && uploadProgress && (
        <div className="bg-brand-accent/10 border-2 border-brand-accent p-3 rounded-none flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-2.5">
            <Loader2 size={16} className="animate-spin text-brand-accent shrink-0" />
            <span className="font-mono text-xs font-bold text-brand-accent uppercase">
              Оптимизация и загрузка файлов ({uploadProgress.current} из {uploadProgress.total})...
            </span>
          </div>
          <span className="font-mono font-bold text-xs text-brand-accent">
            {uploadProgress.percent}%
          </span>
        </div>
      )}

      {/* =========================================================================
          TAB 1: PHOTOS (MAX 35)
          ========================================================================= */}
      {activeTab === 'images' && (
        <div className="space-y-4">
          {/* Top Info & Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-light p-3 border border-brand-dark">
            <div>
              <p className="font-mono text-xs text-brand-dark/80 font-bold uppercase">
                Загружено: <span className="text-brand-accent">{images.length}</span> из {MAX_IMAGES} фото
              </p>
              <p className="text-[11px] text-brand-dark/60 mt-0.5">
                Вы можете выбрать до 35 фото сразу, расставить их в нужные части текста и настроить выравнивание.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="file"
                multiple
                accept="image/*"
                ref={imageFileInputRef}
                className="hidden"
                disabled={isUploading || images.length >= MAX_IMAGES}
                onChange={handleImageFilesSelected}
              />

              <button
                type="button"
                onClick={() => imageFileInputRef.current?.click()}
                disabled={isUploading || images.length >= MAX_IMAGES}
                className="bg-brand-dark text-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider hover:bg-brand-accent transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Upload size={13} />
                <span>Загрузить фото (пакетно до {MAX_IMAGES})</span>
              </button>
            </div>
          </div>

          {/* Add Image by URL input */}
          <div className="flex flex-col sm:flex-row gap-2 items-center bg-brand-light/50 p-2.5 border border-brand-dark/20">
            <input
              type="url"
              placeholder="Или вставьте прямую ссылку на фото (https://...)..."
              value={singleImageUrl}
              onChange={e => setSingleImageUrl(e.target.value)}
              className="flex-1 w-full bg-white border border-brand-dark p-2 text-xs font-mono text-brand-dark focus:outline-none focus:border-brand-accent"
            />
            <input
              type="text"
              placeholder="Подпись к фото (необязательно)..."
              value={singleImageCaption}
              onChange={e => setSingleImageCaption(e.target.value)}
              className="w-full sm:w-60 bg-white border border-brand-dark p-2 text-xs font-mono text-brand-dark focus:outline-none focus:border-brand-accent"
            />
            <button
              type="button"
              onClick={handleAddImageUrl}
              disabled={!singleImageUrl.trim() || images.length >= MAX_IMAGES}
              className="w-full sm:w-auto bg-brand-dark text-white px-4 py-2 font-mono text-xs font-bold uppercase hover:bg-brand-accent transition-colors cursor-pointer disabled:opacity-40 shrink-0"
            >
              + Добавить
            </button>
          </div>

          {/* Images Grid List */}
          {images.length === 0 ? (
            <div className="border-2 border-dashed border-brand-dark/30 p-8 text-center bg-brand-light/30">
              <ImageIcon size={32} className="mx-auto text-brand-dark/30 mb-2" />
              <p className="font-mono text-xs uppercase font-bold text-brand-dark/60">
                Фотографии пока не добавлены
              </p>
              <p className="text-xs text-brand-dark/50 mt-1 max-w-md mx-auto">
                Нажмите «Загрузить фото», чтобы выбрать до 35 файлов одновременно, или добавьте изображения по ссылкам.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto p-1 border border-brand-dark/20">
              {images.map((img, idx) => {
                const isCover = img.isCover || img.url === coverImageUrl;
                return (
                  <div 
                    key={img.id}
                    className={`border-2 p-2.5 bg-white flex flex-col justify-between gap-2.5 transition-all ${
                      isCover ? 'border-brand-accent bg-brand-accent/[0.02]' : 'border-brand-dark/30'
                    }`}
                  >
                    {/* Image Preview & Badges */}
                    <div className="relative aspect-[16/10] bg-brand-light overflow-hidden border border-brand-dark/10 group">
                      <img src={img.url} alt={img.caption || `Image ${idx + 1}`} className="w-full h-full object-cover" />
                      
                      {/* Top Badges */}
                      <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                        <span className="bg-brand-dark/85 text-white text-[10px] font-mono px-2 py-0.5 font-bold uppercase">
                          #{idx + 1}
                        </span>
                        {isCover && (
                          <span className="bg-brand-accent text-white text-[10px] font-mono px-2 py-0.5 font-bold uppercase flex items-center gap-1 shadow-2xs">
                            <Star size={10} fill="currentColor" /> Обложка
                          </span>
                        )}
                      </div>

                      {/* Reorder Buttons */}
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, 'up')}
                          disabled={idx === 0}
                          title="Переместить выше"
                          className="w-6 h-6 bg-white/90 border border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white flex items-center justify-center disabled:opacity-30 cursor-pointer shadow-2xs"
                        >
                          <ArrowUp size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, 'down')}
                          disabled={idx === images.length - 1}
                          title="Переместить ниже"
                          className="w-6 h-6 bg-white/90 border border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white flex items-center justify-center disabled:opacity-30 cursor-pointer shadow-2xs"
                        >
                          <ArrowDown size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(img.id)}
                          title="Удалить фото"
                          className="w-6 h-6 bg-white/90 border border-red-400 text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center cursor-pointer shadow-2xs"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Caption Input */}
                    <div>
                      <input
                        type="text"
                        placeholder="Подпись к фото..."
                        value={img.caption || ''}
                        onChange={e => handleImageCaptionChange(img.id, e.target.value)}
                        className="w-full bg-brand-light border border-brand-dark/40 p-1.5 text-[11px] font-mono focus:outline-none focus:border-brand-accent"
                      />
                    </div>

                    {/* Alignment & In-Text Insertion Controls */}
                    <div className="space-y-2 pt-1 border-t border-brand-dark/10">
                      <div className="flex items-center justify-between text-[10px] font-mono text-brand-dark/70 font-bold uppercase">
                        <span>Расположение:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Слева с обтеканием"
                            onClick={() => handleImageAlignmentChange(img.id, 'left')}
                            className={`p-1 border ${img.alignment === 'left' ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-brand-dark border-brand-dark/30 hover:bg-brand-light'}`}
                          >
                            <AlignLeft size={12} />
                          </button>
                          <button
                            type="button"
                            title="По центру"
                            onClick={() => handleImageAlignmentChange(img.id, 'center')}
                            className={`p-1 border ${img.alignment === 'center' ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-brand-dark border-brand-dark/30 hover:bg-brand-light'}`}
                          >
                            <AlignCenter size={12} />
                          </button>
                          <button
                            type="button"
                            title="Справа с обтеканием"
                            onClick={() => handleImageAlignmentChange(img.id, 'right')}
                            className={`p-1 border ${img.alignment === 'right' ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-brand-dark border-brand-dark/30 hover:bg-brand-light'}`}
                          >
                            <AlignRight size={12} />
                          </button>
                          <button
                            type="button"
                            title="На всю ширину"
                            onClick={() => handleImageAlignmentChange(img.id, 'full')}
                            className={`p-1 border ${img.alignment === 'full' || !img.alignment ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-brand-dark border-brand-dark/30 hover:bg-brand-light'}`}
                          >
                            <Maximize2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Action Buttons: Set Cover + Insert Into Text */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {!isCover ? (
                          <button
                            type="button"
                            onClick={() => handleSetCover(img)}
                            className="w-full bg-brand-light hover:bg-brand-dark hover:text-white border border-brand-dark p-1.5 font-mono text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Star size={10} /> Обложка
                          </button>
                        ) : (
                          <div className="w-full bg-brand-accent/10 border border-brand-accent text-brand-accent p-1.5 font-mono text-[10px] font-bold uppercase text-center flex items-center justify-center gap-1">
                            <Check size={10} /> Главная
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => insertImageSnippet(img)}
                          className="w-full bg-brand-dark hover:bg-brand-accent text-white border border-brand-dark p-1.5 font-mono text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus size={10} /> В текст
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: VIDEOS (MAX 5)
          ========================================================================= */}
      {activeTab === 'videos' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-light p-3 border border-brand-dark">
            <div>
              <p className="font-mono text-xs text-brand-dark/80 font-bold uppercase">
                Загружено видео: <span className="text-brand-accent">{videos.length}</span> из {MAX_VIDEOS}
              </p>
              <p className="text-[11px] text-brand-dark/60 mt-0.5">
                Поддерживаются прямые видеофайлы (MP4, WebM до 50MB) и ссылки на YouTube / Vimeo.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="video/*"
                ref={videoFileInputRef}
                className="hidden"
                disabled={isUploading || videos.length >= MAX_VIDEOS}
                onChange={handleVideoFileSelected}
              />

              <button
                type="button"
                onClick={() => videoFileInputRef.current?.click()}
                disabled={isUploading || videos.length >= MAX_VIDEOS}
                className="bg-brand-dark text-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider hover:bg-brand-accent transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Upload size={13} />
                <span>Загрузить видеофайл</span>
              </button>
            </div>
          </div>

          {/* Add Video by URL */}
          <div className="flex flex-col sm:flex-row gap-2 items-center bg-brand-light/50 p-2.5 border border-brand-dark/20">
            <input
              type="text"
              placeholder="Вставьте ссылку на YouTube / Vimeo / MP4 (https://...)..."
              value={singleVideoUrl}
              onChange={e => setSingleVideoUrl(e.target.value)}
              className="flex-1 w-full bg-white border border-brand-dark p-2 text-xs font-mono text-brand-dark focus:outline-none focus:border-brand-accent"
            />
            <input
              type="text"
              placeholder="Название или описание видео..."
              value={singleVideoCaption}
              onChange={e => setSingleVideoCaption(e.target.value)}
              className="w-full sm:w-60 bg-white border border-brand-dark p-2 text-xs font-mono text-brand-dark focus:outline-none focus:border-brand-accent"
            />
            <button
              type="button"
              onClick={handleAddVideoUrl}
              disabled={!singleVideoUrl.trim() || videos.length >= MAX_VIDEOS}
              className="w-full sm:w-auto bg-brand-dark text-white px-4 py-2 font-mono text-xs font-bold uppercase hover:bg-brand-accent transition-colors cursor-pointer disabled:opacity-40 shrink-0"
            >
              + Добавить
            </button>
          </div>

          {/* Videos List */}
          {videos.length === 0 ? (
            <div className="border-2 border-dashed border-brand-dark/30 p-8 text-center bg-brand-light/30">
              <Film size={32} className="mx-auto text-brand-dark/30 mb-2" />
              <p className="font-mono text-xs uppercase font-bold text-brand-dark/60">
                Видео пока не добавлены
              </p>
              <p className="text-xs text-brand-dark/50 mt-1 max-w-md mx-auto">
                Добавьте до 5 видеоматериалов с YouTube или прямым файлом, чтобы разнообразить новостной репортаж.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
              {videos.map((vid, idx) => {
                const isEmbed = vid.url.includes('youtube.com') || vid.url.includes('youtu.be') || vid.url.includes('vimeo.com');
                const embedUrl = vid.url.includes('watch?v=') 
                  ? vid.url.replace('watch?v=', 'embed/') 
                  : vid.url.includes('youtu.be/') 
                    ? vid.url.replace('youtu.be/', 'www.youtube.com/embed/') 
                    : vid.url;

                return (
                  <div key={vid.id} className="border-2 border-brand-dark/30 bg-white p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="bg-brand-dark text-white text-[10px] font-mono px-2 py-0.5 font-bold uppercase">
                        Видео #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteVideo(vid.id)}
                        className="text-red-600 hover:text-red-800 font-mono text-[10px] uppercase font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={11} /> Удалить
                      </button>
                    </div>

                    {/* Player Preview */}
                    <div className="aspect-video bg-black rounded-none overflow-hidden border border-brand-dark/20">
                      {isEmbed ? (
                        <iframe src={embedUrl} className="w-full h-full" allowFullScreen title={vid.caption || 'Video'} />
                      ) : (
                        <video src={vid.url} controls className="w-full h-full object-contain" />
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Подпись к видео..."
                      value={vid.caption || ''}
                      onChange={e => handleVideoCaptionChange(vid.id, e.target.value)}
                      className="w-full bg-brand-light border border-brand-dark/40 p-1.5 text-[11px] font-mono focus:outline-none focus:border-brand-accent"
                    />

                    <div className="flex items-center justify-between pt-1 border-t border-brand-dark/10">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="На всю ширину"
                          onClick={() => handleVideoAlignmentChange(vid.id, 'full')}
                          className={`p-1 border text-[10px] font-mono font-bold uppercase ${vid.alignment === 'full' || !vid.alignment ? 'bg-brand-dark text-white' : 'bg-white text-brand-dark'}`}
                        >
                          100%
                        </button>
                        <button
                          type="button"
                          title="Слева"
                          onClick={() => handleVideoAlignmentChange(vid.id, 'left')}
                          className={`p-1 border text-[10px] font-mono font-bold uppercase ${vid.alignment === 'left' ? 'bg-brand-dark text-white' : 'bg-white text-brand-dark'}`}
                        >
                          Слева
                        </button>
                        <button
                          type="button"
                          title="Справа"
                          onClick={() => handleVideoAlignmentChange(vid.id, 'right')}
                          className={`p-1 border text-[10px] font-mono font-bold uppercase ${vid.alignment === 'right' ? 'bg-brand-dark text-white' : 'bg-white text-brand-dark'}`}
                        >
                          Справа
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => insertVideoSnippet(vid)}
                        className="bg-brand-dark text-white hover:bg-brand-accent px-3 py-1 font-mono text-[10px] font-bold uppercase transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={10} /> Вставить в текст
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: QUICK INSERT SNIPPETS & LAYOUT FORMAT
          ========================================================================= */}
      {activeTab === 'layouts' && (
        <div className="space-y-4">
          {/* Format Selection for Article */}
          <div className="bg-brand-light p-3 border border-brand-dark">
            <label className="font-mono text-xs font-bold uppercase text-brand-dark block mb-2">
              Основной стиль расположения медиа в статье:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label 
                className={`p-2.5 border-2 flex items-start gap-2 cursor-pointer transition-all ${
                  mediaLayout === 'hero_carousel' ? 'border-brand-accent bg-white shadow-2xs' : 'border-brand-dark/20 bg-white/50'
                }`}
              >
                <input
                  type="radio"
                  name="mediaLayout"
                  value="hero_carousel"
                  checked={mediaLayout === 'hero_carousel'}
                  onChange={() => onChangeMediaLayout('hero_carousel')}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-mono text-xs font-bold uppercase block text-brand-dark">Карусель в шапке</span>
                  <span className="text-[11px] text-brand-dark/60 block mt-0.5">
                    Все загруженные фото отображаются в интерактивной карусели с перелистыванием наверху статьи.
                  </span>
                </div>
              </label>

              <label 
                className={`p-2.5 border-2 flex items-start gap-2 cursor-pointer transition-all ${
                  mediaLayout === 'editorial_inline' ? 'border-brand-accent bg-white shadow-2xs' : 'border-brand-dark/20 bg-white/50'
                }`}
              >
                <input
                  type="radio"
                  name="mediaLayout"
                  value="editorial_inline"
                  checked={mediaLayout === 'editorial_inline'}
                  onChange={() => onChangeMediaLayout('editorial_inline')}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-mono text-xs font-bold uppercase block text-brand-dark">Журнальная верстка</span>
                  <span className="text-[11px] text-brand-dark/60 block mt-0.5">
                    Фото и видео распределяются внутри текста (слева, справа, по центру) с обтеканием.
                  </span>
                </div>
              </label>

              <label 
                className={`p-2.5 border-2 flex items-start gap-2 cursor-pointer transition-all ${
                  mediaLayout === 'bottom_gallery' ? 'border-brand-accent bg-white shadow-2xs' : 'border-brand-dark/20 bg-white/50'
                }`}
              >
                <input
                  type="radio"
                  name="mediaLayout"
                  value="bottom_gallery"
                  checked={mediaLayout === 'bottom_gallery'}
                  onChange={() => onChangeMediaLayout('bottom_gallery')}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-mono text-xs font-bold uppercase block text-brand-dark">Галерея в конце</span>
                  <span className="text-[11px] text-brand-dark/60 block mt-0.5">
                    Фотографии формируют отдельную фотогалерею репортажа внизу статьи с открытием в полный экран.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Quick Insert Blocks */}
          <div className="space-y-2">
            <span className="font-mono text-xs font-bold uppercase text-brand-dark block">
              Быстрые блоки для вставки в текст (в позицию курсора):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => insertGalleryGridSnippet(2)}
                className="bg-white hover:bg-brand-dark hover:text-white border-2 border-brand-dark p-3 text-left font-mono text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <Columns size={16} className="text-brand-accent shrink-0" />
                <div>
                  <span className="font-bold uppercase block">Сетка из 2 фото</span>
                  <span className="text-[10px] opacity-70">2 колонки рядом</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => insertGalleryGridSnippet(3)}
                className="bg-white hover:bg-brand-dark hover:text-white border-2 border-brand-dark p-3 text-left font-mono text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <LayoutGrid size={16} className="text-brand-accent shrink-0" />
                <div>
                  <span className="font-bold uppercase block">Сетка из 3 фото</span>
                  <span className="text-[10px] opacity-70">3 колонки с фото</span>
                </div>
              </button>

              <button
                type="button"
                onClick={insertPullQuoteSnippet}
                className="bg-white hover:bg-brand-dark hover:text-white border-2 border-brand-dark p-3 text-left font-mono text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <Sparkles size={16} className="text-brand-accent shrink-0" />
                <div>
                  <span className="font-bold uppercase block">Цитатная врезка</span>
                  <span className="text-[10px] opacity-70">Акцентный блок</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
