import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Video, 
  Image as ImageIcon, 
  Upload, 
  Save, 
  RotateCcw, 
  ExternalLink, 
  Check, 
  Eye, 
  Layers, 
  FileText, 
  Sliders, 
  ArrowRight,
  Play,
  Film
} from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadMediaFile } from '../../lib/upload';
import { toast } from 'sonner';
import { useUI } from '../../context/UIContext';

export interface HomeContentSettings {
  // Hero Section
  heroBadgeText: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroTitleLine3: string;
  heroTypingWords: string;
  heroPrimaryBtnLabel: string;
  heroPrimaryBtnLink: string;
  heroSecondaryBtnLabel: string;
  heroSecondaryBtnLink: string;
  heroVideoUrl: string;
  heroPosterUrl: string;
  heroVideoTag: string;

  // Manifesto Section
  manifestoTag: string;
  manifestoTitle: string;
  manifestoDesc: string;
  manifestoImageUrl: string;
  manifestoImageTag: string;
  manifestoBtnLabel: string;
  manifestoBtnLink: string;

  // Marquee Ticker
  tickerEnabled: boolean;

  // Bottom Banner
  bannerTitle: string;
  bannerSubtitle: string;
  bannerBtnLabel: string;
  bannerBtnLink: string;

  updatedAt?: number;
  updatedBy?: string;
}

export const DEFAULT_HOME_SETTINGS: HomeContentSettings = {
  heroBadgeText: 'AZERBAIJAN FASHION ECOSYSTEM',
  heroTitleLine1: 'Fashion',
  heroTitleLine2: 'Future',
  heroTitleLine3: 'Azerbaijan',
  heroTypingWords: 'fashion., designer., event., sponsor., internship., vacancy.',
  heroPrimaryBtnLabel: 'Explore Events',
  heroPrimaryBtnLink: '/events',
  heroSecondaryBtnLabel: 'A-Z Designers',
  heroSecondaryBtnLink: '/designers',
  heroVideoUrl: 'https://res.cloudinary.com/dcvsf3tnn/video/upload/q_auto:eco,vc_auto,w_1080,f_auto/v1787602233/10622412-uhd_2160_4096_25fps_iqu16n.mp4',
  heroPosterUrl: 'https://res.cloudinary.com/dcvsf3tnn/video/upload/so_0,w_1080,q_auto:low,f_auto/v1787602233/10622412-uhd_2160_4096_25fps_iqu16n.jpg',
  heroVideoTag: 'RUNWAY LIVE ARCHIVE • BAKU',

  manifestoTag: '[01 // MANIFESTO]',
  manifestoTitle: 'Elevating Style',
  manifestoDesc: 'Our platform connects fashion enthusiasts with the most prestigious events happening across the country. From avant-garde exhibitions to ready-to-wear runway shows, we curate the definitive calendar of Azerbaijani fashion.',
  manifestoImageUrl: 'https://res.cloudinary.com/dcvsf3tnn/image/upload/f_auto,q_auto:good,w_1080,c_limit/v1787602162/taylor-heery-8p6s8h6BNjg-unsplash_u7zcz6.jpg',
  manifestoImageTag: 'EDITORIAL ARCHIVE • BAKU',
  manifestoBtnLabel: 'VIEW CALENDAR',
  manifestoBtnLink: '/events',

  tickerEnabled: true,

  bannerTitle: 'Join Azerbaijan Fashion Week',
  bannerSubtitle: 'Experience the avant-garde. Secure front-row access to the seasons most anticipated collections.',
  bannerBtnLabel: 'GET TICKETS',
  bannerBtnLink: '/events'
};

export default function HomeMaterialsAdminTab() {
  const ui = useUI();
  const [formData, setFormData] = useState<HomeContentSettings>(DEFAULT_HOME_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingManifestoImg, setUploadingManifestoImg] = useState(false);
  const [activeSection, setActiveSection] = useState<'hero' | 'manifesto' | 'banner' | 'preview'>('hero');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'home_content');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setFormData({ ...DEFAULT_HOME_SETTINGS, ...snap.data() } as HomeContentSettings);
        }
      } catch (err) {
        console.error('Failed to load home content settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (field: keyof HomeContentSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'heroVideoUrl' | 'heroPosterUrl' | 'manifestoImageUrl',
    setLoader: (v: boolean) => void
  ) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    // Check file size: videos max 50MB, images max 15MB
    const isVideo = file.type.startsWith('video');
    const maxSize = isVideo ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxSize) {
      ui.alert(isVideo ? 'Видео слишком большое (максимум 50MB)' : 'Файл слишком большой (максимум 15MB)');
      return;
    }

    setLoader(true);
    try {
      const url = await uploadMediaFile(file);
      handleChange(field, url);
      toast.success(isVideo ? 'Видео успешно загружено!' : 'Изображение успешно загружено!');
    } catch (err: any) {
      console.error(err);
      ui.alert(err.message || 'Ошибка при загрузке файла.');
    } finally {
      setLoader(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const docRef = doc(db, 'settings', 'home_content');
      await setDoc(docRef, {
        ...formData,
        updatedAt: Date.now()
      }, { merge: true });
      toast.success('Материалы главной страницы успешно сохранены и обновлены на сайте!');
    } catch (err) {
      console.error('Failed to save home settings:', err);
      toast.error('Не удалось сохранить настройки.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!await ui.confirm('Восстановить заводские медиаматериалы и тексты главной страницы по умолчанию?')) return;
    setFormData(DEFAULT_HOME_SETTINGS);
    setSaving(true);
    try {
      const docRef = doc(db, 'settings', 'home_content');
      await setDoc(docRef, {
        ...DEFAULT_HOME_SETTINGS,
        updatedAt: Date.now()
      });
      toast.success('Настройки сброшены до стандартных.');
    } catch (err) {
      console.error('Failed to reset:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-12 text-center shadow-xs">
        <div className="w-8 h-8 border-2 border-brand-dark/20 border-t-brand-accent rounded-full animate-spin mx-auto mb-3" />
        <p className="font-mono text-xs uppercase tracking-widest text-brand-dark/60 font-bold">
          Загрузка материалов главной страницы...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header Banner */}
      <div className="rounded-3xl border border-brand-dark/[0.08] bg-white p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/20">
              [УПРАВЛЕНИЕ МЕДИАМАТЕРИАЛАМИ ГЛАВНОЙ]
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-normal text-brand-dark tracking-tight">
            Главный экран (Hero) & Манифест
          </h2>
          <p className="text-xs sm:text-sm text-brand-dark/70 font-normal leading-relaxed">
            Здесь вы можете менять видеопоказ в шапке, постер, фоновые изображения манифеста, заголовки, бегущие слова и текстовые материалы главной страницы.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-4 py-2.5 rounded-full bg-brand-light text-brand-dark/80 hover:text-brand-dark border border-brand-dark/10 font-semibold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <RotateCcw size={13} />
            <span>Сбросить</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-full bg-[#7a0000] hover:bg-brand-dark text-white font-semibold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Save size={14} />
            <span>{saving ? 'Сохранение...' : 'Сохранить изменения'}</span>
          </button>
        </div>
      </div>

      {/* 2. Navigation Pills for Sections */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-brand-dark/[0.08] pb-4">
        <button
          type="button"
          onClick={() => setActiveSection('hero')}
          className={`px-5 py-2.5 rounded-full font-semibold uppercase tracking-wider text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'hero'
              ? 'bg-brand-dark text-white shadow-2xs'
              : 'bg-white text-brand-dark/70 border border-brand-dark/10 hover:border-brand-dark/30'
          }`}
        >
          <Video size={14} className={activeSection === 'hero' ? 'text-brand-accent' : ''} />
          <span>1. Главный баннер & Видео (Hero)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('manifesto')}
          className={`px-5 py-2.5 rounded-full font-semibold uppercase tracking-wider text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'manifesto'
              ? 'bg-brand-dark text-white shadow-2xs'
              : 'bg-white text-brand-dark/70 border border-brand-dark/10 hover:border-brand-dark/30'
          }`}
        >
          <ImageIcon size={14} className={activeSection === 'manifesto' ? 'text-brand-accent' : ''} />
          <span>2. Манифест & Фото (Manifesto)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('banner')}
          className={`px-5 py-2.5 rounded-full font-semibold uppercase tracking-wider text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'banner'
              ? 'bg-brand-dark text-white shadow-2xs'
              : 'bg-white text-brand-dark/70 border border-brand-dark/10 hover:border-brand-dark/30'
          }`}
        >
          <Sparkles size={14} className={activeSection === 'banner' ? 'text-brand-accent' : ''} />
          <span>3. Нижний баннер (CTA)</span>
        </button>

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto px-4 py-2.5 rounded-full bg-white text-brand-dark border border-brand-dark/15 hover:border-brand-accent hover:text-brand-accent transition-colors flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider shadow-2xs shrink-0"
        >
          <ExternalLink size={13} />
          <span>Смотреть главную на сайте</span>
        </a>
      </div>

      {/* 3. SECTION 1: HERO MEDIA & EDITORIAL SETTINGS */}
      {activeSection === 'hero' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Form: Video & Image Controls */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 shadow-xs space-y-6">
              <h3 className="text-xl font-serif font-normal text-brand-dark flex items-center gap-2">
                <Video size={18} className="text-[#7a0000]" />
                <span>Видеопоказ и медиафайлы Hero</span>
              </h3>

              {/* Video URL & Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase font-bold text-brand-dark/70">
                  Прямая ссылка на видео (MP4 / WebM / Cloudinary)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.heroVideoUrl}
                    onChange={(e) => handleChange('heroVideoUrl', e.target.value)}
                    placeholder="https://...mp4"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-brand-dark/15 text-xs font-mono focus:border-brand-accent focus:outline-none bg-brand-light"
                  />
                  <label className="px-4 py-2.5 rounded-xl bg-brand-dark hover:bg-brand-accent text-white font-semibold text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs shrink-0">
                    <Upload size={14} />
                    <span>{uploadingVideo ? 'Загрузка...' : 'Загрузить файл'}</span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'heroVideoUrl', setUploadingVideo)}
                    />
                  </label>
                </div>
                <p className="text-[11px] text-brand-dark/50 font-mono">
                  Поддерживаются видео в формате MP4 / WebM. Рекомендуемое соотношение: 9:16 или 16:9.
                </p>
              </div>

              {/* Video Poster URL & Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase font-bold text-brand-dark/70">
                  Постер / обложка видео (JPG / WebP / PNG)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.heroPosterUrl}
                    onChange={(e) => handleChange('heroPosterUrl', e.target.value)}
                    placeholder="https://...jpg"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-brand-dark/15 text-xs font-mono focus:border-brand-accent focus:outline-none bg-brand-light"
                  />
                  <label className="px-4 py-2.5 rounded-xl bg-brand-dark hover:bg-brand-accent text-white font-semibold text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs shrink-0">
                    <Upload size={14} />
                    <span>{uploadingPoster ? 'Загрузка...' : 'Загрузить постер'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'heroPosterUrl', setUploadingPoster)}
                    />
                  </label>
                </div>
              </div>

              {/* Corner Watermark Tag */}
              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase font-bold text-brand-dark/70">
                  Водяной знак / угловой бейдж на видео
                </label>
                <input
                  type="text"
                  value={formData.heroVideoTag}
                  onChange={(e) => handleChange('heroVideoTag', e.target.value)}
                  placeholder="RUNWAY LIVE ARCHIVE • BAKU"
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-dark/15 text-xs font-mono focus:border-brand-accent focus:outline-none bg-brand-light"
                />
              </div>

              <div className="pt-4 border-t border-brand-dark/[0.08] space-y-4">
                <h4 className="text-sm font-serif font-bold uppercase text-brand-dark">
                  Текстовые материалы и заголовок
                </h4>

                {/* Hero Badge */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase font-bold text-brand-dark/70">
                    Верхний бейдж над заголовком
                  </label>
                  <input
                    type="text"
                    value={formData.heroBadgeText}
                    onChange={(e) => handleChange('heroBadgeText', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-dark/15 text-xs font-mono focus:border-brand-accent focus:outline-none bg-brand-light"
                  />
                </div>

                {/* Title Lines */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-mono uppercase font-bold text-brand-dark/70">
                      Строка 1
                    </label>
                    <input
                      type="text"
                      value={formData.heroTitleLine1}
                      onChange={(e) => handleChange('heroTitleLine1', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-brand-dark/15 text-xs font-mono focus:border-brand-accent focus:outline-none bg-brand-light"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-mono uppercase font-bold text-brand-dark/70">
                      Строка 2 (Красный акцент)
                    </label>
                    <input
                      type="text"
                      value={formData.heroTitleLine2}
                      onChange={(e) => handleChange('heroTitleLine2', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-brand-dark/15 text-xs font-mono focus:border-brand-accent focus:outline-none bg-brand-light text-brand-accent font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-mono uppercase font-bold text-brand-dark/70">
                      Строка 3
                    </label>
                    <input
                      type="text"
                      value={formData.heroTitleLine3}
                      onChange={(e) => handleChange('heroTitleLine3', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-brand-dark/15 text-xs font-mono focus:border-brand-accent focus:outline-none bg-brand-light"
                    />
                  </div>
                </div>

                {/* Animated Typing Words */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase font-bold text-brand-dark/70">
                    Слова для анимации печати (через запятую)
                  </label>
                  <input
                    type="text"
                    value={formData.heroTypingWords}
                    onChange={(e) => handleChange('heroTypingWords', e.target.value)}
                    placeholder="fashion., designer., event., sponsor., internship."
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-dark/15 text-xs font-mono focus:border-brand-accent focus:outline-none bg-brand-light"
                  />
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-mono uppercase font-bold text-brand-dark/70">
                      Основная кнопка (Текст & Ссылка)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={formData.heroPrimaryBtnLabel}
                        onChange={(e) => handleChange('heroPrimaryBtnLabel', e.target.value)}
                        placeholder="Explore Events"
                        className="px-3 py-2 rounded-xl border border-brand-dark/15 text-xs font-mono focus:border-brand-accent focus:outline-none bg-brand-light"
                      />
                      <input
                        type="text"
                        value={formData.heroPrimaryBtnLink}
                        onChange={(e) => handleChange('heroPrimaryBtnLink', e.target.value)}
                        placeholder="/events"
                        className="px-3 py-2 rounded-xl border border-brand-dark/15 text-xs font-mono focus:border-brand-accent focus:outline-none bg-brand-light"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-mono uppercase font-bold text-brand-dark/70">
                      Вторая кнопка (Текст & Ссылка)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={formData.heroSecondaryBtnLabel}
                        onChange={(e) => handleChange('heroSecondaryBtnLabel', e.target.value)}
                        placeholder="A-Z Designers"
                        className="px-3 py-2 rounded-xl border border-brand-dark/15 text-xs font-mono focus:border-brand-accent focus:outline-none bg-brand-light"
                      />
                      <input
                        type="text"
                        value={formData.heroSecondaryBtnLink}
                        onChange={(e) => handleChange('heroSecondaryBtnLink', e.target.value)}
                        placeholder="/designers"
                        className="px-3 py-2 rounded-xl border border-brand-dark/15 text-xs font-mono focus:border-brand-accent focus:outline-none bg-brand-light"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Live Visual Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 shadow-xs sticky top-28 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-dark flex items-center gap-1.5">
                  <Eye size={14} className="text-brand-accent" />
                  <span>Предпросмотр Hero-экрана</span>
                </span>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  LIVE
                </span>
              </div>

              {/* Mini Video Card */}
              <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden border border-brand-dark/10 bg-brand-dark shadow-md">
                {formData.heroVideoUrl ? (
                  <video
                    src={formData.heroVideoUrl}
                    poster={formData.heroPosterUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/40">
                    <Video size={40} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
                <div className="absolute bottom-3 right-3 font-mono text-[9px] tracking-widest uppercase text-white px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20">
                  {formData.heroVideoTag || 'RUNWAY LIVE ARCHIVE'}
                </div>
              </div>

              {/* Title preview */}
              <div className="p-3 bg-brand-light rounded-xl border border-brand-dark/[0.06] space-y-1">
                <div className="text-[10px] font-mono text-brand-accent uppercase font-bold">
                  {formData.heroBadgeText}
                </div>
                <h4 className="text-lg font-display font-bold uppercase text-brand-dark leading-tight">
                  {formData.heroTitleLine1}{' '}
                  <span className="text-brand-accent">{formData.heroTitleLine2}</span>{' '}
                  {formData.heroTitleLine3}
                </h4>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SECTION 2: MANIFESTO & PHILOSOPHY MEDIA SETTINGS */}
      {activeSection === 'manifesto' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Form: Manifesto Image & Copy */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 shadow-xs space-y-6">
              <h3 className="text-xl font-serif font-normal text-brand-dark flex items-center gap-2">
                <ImageIcon size={18} className="text-[#7a0000]" />
                <span>Фотоматериалы и текст блока «Манифест»</span>
              </h3>

              {/* Image URL & Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase font-bold text-brand-dark/70">
                  Прямая ссылка на фото манифеста (JPG / PNG / WebP / Cloudinary)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.manifestoImageUrl}
                    onChange={(e) => handleChange('manifestoImageUrl', e.target.value)}
                    placeholder="https://...jpg"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-brand-dark/15 text-xs font-mono focus:border-brand-accent focus:outline-none bg-brand-light"
                  />
                  <label className="px-4 py-2.5 rounded-xl bg-brand-dark hover:bg-brand-accent text-white font-semibold text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs shrink-0">
                    <Upload size={14} />
                    <span>{uploadingManifestoImg ? 'Загрузка...' : 'Загрузить фото'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'manifestoImageUrl', setUploadingManifestoImg)}
                    />
                  </label>
                </div>
              </div>

              {/* Corner Watermark Tag */}
              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase font-bold text-brand-dark/70">
                  Угловой бейдж на фото
                </label>
                <input
                  type="text"
                  value={formData.manifestoImageTag}
                  onChange={(e) => handleChange('manifestoImageTag', e.target.value)}
                  placeholder="EDITORIAL ARCHIVE • BAKU"
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-dark/15 text-xs font-mono focus:border-brand-accent focus:outline-none bg-brand-light"
                />
              </div>

              {/* Manifesto Text Details */}
              <div className="pt-4 border-t border-brand-dark/[0.08] space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase font-bold text-brand-dark/70">
                    Метка блока
                  </label>
                  <input
                    type="text"
                    value={formData.manifestoTag}
                    onChange={(e) => handleChange('manifestoTag', e.target.value)}
                    placeholder="[01 // MANIFESTO]"
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-dark/15 text-xs font-mono focus:border-brand-accent focus:outline-none bg-brand-light"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase font-bold text-brand-dark/70">
                    Заголовок блока
                  </label>
                  <input
                    type="text"
                    value={formData.manifestoTitle}
                    onChange={(e) => handleChange('manifestoTitle', e.target.value)}
                    placeholder="Elevating Style"
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-dark/15 text-base font-serif focus:border-brand-accent focus:outline-none bg-brand-light font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase font-bold text-brand-dark/70">
                    Текст манифеста / философия
                  </label>
                  <textarea
                    rows={4}
                    value={formData.manifestoDesc}
                    onChange={(e) => handleChange('manifestoDesc', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-dark/15 text-xs focus:border-brand-accent focus:outline-none bg-brand-light leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-mono uppercase font-bold text-brand-dark/70">
                      Текст кнопки
                    </label>
                    <input
                      type="text"
                      value={formData.manifestoBtnLabel}
                      onChange={(e) => handleChange('manifestoBtnLabel', e.target.value)}
                      placeholder="VIEW CALENDAR"
                      className="w-full px-3 py-2 rounded-xl border border-brand-dark/15 text-xs font-mono focus:border-brand-accent focus:outline-none bg-brand-light"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-mono uppercase font-bold text-brand-dark/70">
                      Ссылка кнопки
                    </label>
                    <input
                      type="text"
                      value={formData.manifestoBtnLink}
                      onChange={(e) => handleChange('manifestoBtnLink', e.target.value)}
                      placeholder="/events"
                      className="w-full px-3 py-2 rounded-xl border border-brand-dark/15 text-xs font-mono focus:border-brand-accent focus:outline-none bg-brand-light"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Live Visual Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 shadow-xs sticky top-28 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-dark flex items-center gap-1.5">
                  <Eye size={14} className="text-brand-accent" />
                  <span>Предпросмотр манифеста</span>
                </span>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  LIVE
                </span>
              </div>

              {/* Manifesto Image Card */}
              <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden border border-brand-dark/10 bg-brand-muted shadow-md">
                {formData.manifestoImageUrl ? (
                  <img
                    src={formData.manifestoImageUrl}
                    alt="Manifesto preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-brand-dark/30">
                    <ImageIcon size={40} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
                <div className="absolute bottom-3 right-3 font-mono text-[9px] tracking-widest uppercase text-white px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20">
                  {formData.manifestoImageTag || 'EDITORIAL ARCHIVE'}
                </div>
              </div>

              {/* Text summary */}
              <div className="p-3 bg-brand-light rounded-xl border border-brand-dark/[0.06] space-y-1">
                <div className="text-[10px] font-mono text-brand-accent uppercase font-bold">
                  {formData.manifestoTag}
                </div>
                <h4 className="text-base font-serif font-bold text-brand-dark">
                  {formData.manifestoTitle}
                </h4>
                <p className="text-xs text-brand-dark/70 line-clamp-2">
                  {formData.manifestoDesc}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SECTION 3: BOTTOM RUNWAY BANNER */}
      {activeSection === 'banner' && (
        <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 shadow-xs space-y-6 max-w-3xl">
          <h3 className="text-xl font-serif font-normal text-brand-dark flex items-center gap-2">
            <Sparkles size={18} className="text-[#7a0000]" />
            <span>Нижний акцентный баннер (Красная секция)</span>
          </h3>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase font-bold text-brand-dark/70">
                Заголовок баннера
              </label>
              <input
                type="text"
                value={formData.bannerTitle}
                onChange={(e) => handleChange('bannerTitle', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-brand-dark/15 text-sm font-serif font-bold focus:border-brand-accent focus:outline-none bg-brand-light"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase font-bold text-brand-dark/70">
                Подзаголовок баннера
              </label>
              <textarea
                rows={2}
                value={formData.bannerSubtitle}
                onChange={(e) => handleChange('bannerSubtitle', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-brand-dark/15 text-xs focus:border-brand-accent focus:outline-none bg-brand-light"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase font-bold text-brand-dark/70">
                  Текст кнопки
                </label>
                <input
                  type="text"
                  value={formData.bannerBtnLabel}
                  onChange={(e) => handleChange('bannerBtnLabel', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-dark/15 text-xs font-mono focus:border-brand-accent focus:outline-none bg-brand-light"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase font-bold text-brand-dark/70">
                  Ссылка кнопки
                </label>
                <input
                  type="text"
                  value={formData.bannerBtnLink}
                  onChange={(e) => handleChange('bannerBtnLink', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-dark/15 text-xs font-mono focus:border-brand-accent focus:outline-none bg-brand-light"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
