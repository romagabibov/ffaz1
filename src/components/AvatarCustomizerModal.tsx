import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dices, Sparkles, Upload, Check, X, RefreshCw, User, Image as ImageIcon } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { uploadMediaFile } from '../lib/upload';
import { useUI } from '../context/UIContext';

export interface AvatarStyleOption {
  id: string;
  name: string;
  category: string;
}

export const AVATAR_STYLES: AvatarStyleOption[] = [
  { id: 'avataaars', name: 'Fashion Avatars', category: 'Illustrated' },
  { id: 'lorelei', name: 'Lorelei Chic', category: 'Modern Art' },
  { id: 'micah', name: 'Micah Minimal', category: 'Flat Design' },
  { id: 'notionists', name: 'Notionist', category: 'Hand Drawn' },
  { id: 'adventurer', name: 'Adventurer', category: 'Fantasy' },
  { id: 'open-peeps', name: 'Open Peeps', category: 'People' },
  { id: 'bottts', name: 'Bottts Cyber', category: 'Robots' },
  { id: 'big-smile', name: 'Big Smile', category: 'Expressive' },
  { id: 'fun-emoji', name: 'Fun Emoji', category: 'Playful' },
  { id: 'shapes', name: 'Bauhaus Shapes', category: 'Abstract' }
];

export const AVATAR_BG_COLORS = [
  { labelKey: 'color_transparent', defaultLabel: 'Transparent', value: '' },
  { labelKey: 'color_warm_cream', defaultLabel: 'Warm Cream', value: 'fdfbf7' },
  { labelKey: 'color_soft_peach', defaultLabel: 'Soft Peach', value: 'ffd1dc' },
  { labelKey: 'color_mint_neon', defaultLabel: 'Mint Neon', value: 'c1ff72' },
  { labelKey: 'color_pastel_blue', defaultLabel: 'Pastel Blue', value: 'bde0fe' },
  { labelKey: 'color_lavender', defaultLabel: 'Lavender', value: 'e2afff' },
  { labelKey: 'color_golden_sun', defaultLabel: 'Golden Sun', value: 'ffde59' },
  { labelKey: 'color_deep_dark', defaultLabel: 'Deep Dark', value: '111111' },
];

export const PRESET_SEEDS = [
  'baku_vogue', 'caspian_trend', 'high_fashion', 'couture_king', 'runway_star',
  'urban_chic', 'silk_road', 'minimalist', 'avant_garde', 'glamour',
  'street_wear', 'designer_pro'
];

interface AvatarCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string;
  userId: string;
  onAvatarUpdated?: (newUrl: string) => void;
}

export default function AvatarCustomizerModal({
  isOpen,
  onClose,
  currentAvatarUrl,
  userId,
  onAvatarUpdated
}: AvatarCustomizerModalProps) {
  const ui = useUI();
  const { t } = useTranslation();
  const [selectedStyle, setSelectedStyle] = useState<string>('avataaars');
  const [seed, setSeed] = useState<string>(() => `user_${Math.random().toString(36).substring(2, 9)}`);
  const [bgColor, setBgColor] = useState<string>('');
  const [customImageUrl, setCustomImageUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'randomizer' | 'presets' | 'custom_url'>('randomizer');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const buildDicebearUrl = (style: string, seedValue: string, bg: string) => {
    let url = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seedValue)}`;
    if (bg) {
      url += `&backgroundColor=${bg}`;
    }
    return url;
  };

  const previewAvatarUrl = customImageUrl || buildDicebearUrl(selectedStyle, seed, bgColor);

  const handleRandomize = () => {
    const randomSeed = Math.random().toString(36).substring(2, 10) + '_' + Math.floor(Math.random() * 1000);
    const randomStyle = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)].id;
    const randomBg = Math.random() > 0.4 ? AVATAR_BG_COLORS[Math.floor(Math.random() * AVATAR_BG_COLORS.length)].value : '';
    
    setSeed(randomSeed);
    setSelectedStyle(randomStyle);
    setBgColor(randomBg);
    setCustomImageUrl('');
  };

  const handleSelectPreset = (presetSeed: string, style: string) => {
    setSeed(presetSeed);
    setSelectedStyle(style);
    setCustomImageUrl('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (file.size > 15 * 1024 * 1024) {
      ui.alert(t('image_too_large', 'File is too large (max 15MB)'));
      return;
    }
    setUploading(true);
    try {
      const url = await uploadMediaFile(file);
      setCustomImageUrl(url);
    } catch (err: any) {
      console.error(err);
      ui.alert(err.message || t('failed_upload_image', 'Failed to upload photo'));
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAvatar = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        avatarUrl: previewAvatarUrl,
        lastProfileUpdate: Date.now()
      });
      if (onAvatarUpdated) {
        onAvatarUpdated(previewAvatarUrl);
      }
      ui.alert(t('avatar_saved_success', 'Avatar successfully saved!'));
      onClose();
    } catch (err) {
      console.error('Error saving avatar:', err);
      ui.alert(t('avatar_save_failed', 'Failed to save avatar.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-3xl border border-brand-dark/[0.08] max-w-2xl w-full max-h-[92vh] flex flex-col my-auto overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-brand-dark/[0.08] bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
              <Dices size={20} className="text-brand-accent" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-brand-dark">
                {t('avatar_studio_title', 'Avatar Studio')}
              </h2>
              <p className="text-[11px] font-mono text-brand-dark/50 uppercase tracking-wider">
                {t('avatar_studio_subtitle', 'Customize & Randomize your avatar')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-brand-dark/10 hover:bg-brand-dark hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-grow">
          
          {/* Main Preview & Quick Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl border border-brand-dark/[0.08] bg-brand-muted/20 shadow-2xs">
            <div className="relative group shrink-0">
              <div className="w-32 h-32 md:w-36 md:h-36 rounded-full border-2 border-brand-dark/[0.12] overflow-hidden bg-white shadow-sm flex items-center justify-center">
                {uploading ? (
                  <div className="w-8 h-8 rounded-full border-2 border-brand-accent border-t-transparent animate-spin" />
                ) : (
                  <img
                    src={previewAvatarUrl}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                )}
              </div>
              <div className="absolute -bottom-1 right-2 bg-brand-dark text-white px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider shadow-2xs">
                {t('live_badge', 'Live')}
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleRandomize}
                className="w-full bg-brand-accent hover:bg-brand-dark text-white py-2.5 px-5 rounded-full font-semibold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <Dices size={15} />
                <span>{t('randomize_avatar_btn', '🎲 Randomize Avatar')}</span>
              </button>

              <div className="flex gap-2">
                <label className="flex-1 bg-white hover:bg-brand-muted/50 text-brand-dark border border-brand-dark/[0.12] px-4 py-2 rounded-full font-semibold uppercase tracking-wider text-xs transition-colors text-center cursor-pointer flex items-center justify-center gap-2 shadow-2xs">
                  <Upload size={13} />
                  <span>{t('upload_photo', 'Upload Photo')}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    const nextSeed = `seed_${Date.now()}`;
                    setSeed(nextSeed);
                    setCustomImageUrl('');
                  }}
                  title={t('generate_new_variation', 'Generate new variation')}
                  className="w-10 h-10 rounded-full border border-brand-dark/[0.12] bg-white hover:bg-brand-dark hover:text-white transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-brand-muted/40 p-1 rounded-full border border-brand-dark/[0.08] flex gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('randomizer')}
              className={`flex-1 py-1.5 px-3 rounded-full font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'randomizer'
                  ? 'bg-brand-dark text-white shadow-2xs font-semibold'
                  : 'text-brand-dark/70 hover:text-brand-dark'
              }`}
            >
              <Sparkles size={13} />
              <span>{t('styles_and_tuning', 'Styles & Tuning')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`flex-1 py-1.5 px-3 rounded-full font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'presets'
                  ? 'bg-brand-dark text-white shadow-2xs font-semibold'
                  : 'text-brand-dark/70 hover:text-brand-dark'
              }`}
            >
              <User size={13} />
              <span>{t('presets_gallery', 'Presets Gallery')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom_url')}
              className={`flex-1 py-1.5 px-3 rounded-full font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'custom_url'
                  ? 'bg-brand-dark text-white shadow-2xs font-semibold'
                  : 'text-brand-dark/70 hover:text-brand-dark'
              }`}
            >
              <ImageIcon size={13} />
              <span>{t('custom_url_tab', 'Custom URL')}</span>
            </button>
          </div>

          {/* Tab 1: Styles & Tuning */}
          {activeTab === 'randomizer' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Style Selector */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-2.5">
                  {t('step_1_choose_art_style', '1. Choose Avatar Art Style')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {AVATAR_STYLES.map((style) => {
                    const isSelected = selectedStyle === style.id && !customImageUrl;
                    const sampleUrl = buildDicebearUrl(style.id, seed || 'fashion', bgColor);
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => {
                          setSelectedStyle(style.id);
                          setCustomImageUrl('');
                        }}
                        className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col items-center gap-2 cursor-pointer ${
                          isSelected
                            ? 'border-brand-accent bg-brand-accent/5 text-brand-dark shadow-xs'
                            : 'border-brand-dark/[0.08] hover:border-brand-dark/30 bg-white text-brand-dark/80 shadow-2xs'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-muted border border-brand-dark/[0.08]">
                          <img src={sampleUrl} alt={style.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[11px] font-mono text-center leading-tight line-clamp-1">
                          {t(`avatar_style_${style.id}`, style.name)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seed / Custom Name input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70">
                    {t('step_2_seed_identity', '2. Seed / Custom Identity')}
                  </label>
                  <span className="text-[11px] font-normal text-brand-dark/50 lowercase">{t('seed_hint', 'Type any word to transform avatar')}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={seed}
                    onChange={(e) => {
                      setSeed(e.target.value);
                      setCustomImageUrl('');
                    }}
                    placeholder={t('seed_placeholder', 'Enter name, nickname, or mood...')}
                    className="flex-1 bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2 font-mono text-xs text-brand-dark outline-none focus:bg-white focus:border-brand-accent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSeed(`style_${Math.random().toString(36).substring(2, 7)}`);
                      setCustomImageUrl('');
                    }}
                    className="bg-brand-dark hover:bg-brand-accent text-white px-4 py-2 rounded-xl font-semibold uppercase tracking-wider text-xs transition-colors shadow-2xs cursor-pointer"
                  >
                    {t('seed_btn', '🎲 Seed')}
                  </button>
                </div>
              </div>

              {/* Background Color Palette */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-2.5">
                  {t('step_3_bg_color', '3. Background Color')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_BG_COLORS.map((bg) => {
                    const isSelected = bgColor === bg.value;
                    return (
                      <button
                        key={bg.defaultLabel}
                        type="button"
                        onClick={() => {
                          setBgColor(bg.value);
                          setCustomImageUrl('');
                        }}
                        className={`px-3 py-1.5 rounded-full border text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-brand-dark bg-brand-dark text-white shadow-2xs'
                            : 'border-brand-dark/[0.1] bg-white text-brand-dark/70 hover:border-brand-dark/30 shadow-2xs'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                          style={{ backgroundColor: bg.value ? `#${bg.value}` : 'transparent' }}
                        />
                        <span>{t(bg.labelKey, bg.defaultLabel)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* Tab 2: Presets Gallery */}
          {activeTab === 'presets' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <p className="text-xs font-mono text-brand-dark/60 uppercase tracking-wider">
                {t('preset_gallery_desc', 'Click any curated avatar style preset to instantly preview & apply:')}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                {PRESET_SEEDS.map((presetSeed, index) => {
                  const styleForPreset = AVATAR_STYLES[index % AVATAR_STYLES.length].id;
                  const presetUrl = buildDicebearUrl(styleForPreset, presetSeed, '');
                  const isSelected = seed === presetSeed && selectedStyle === styleForPreset && !customImageUrl;

                  return (
                    <button
                      key={presetSeed}
                      type="button"
                      onClick={() => handleSelectPreset(presetSeed, styleForPreset)}
                      className={`p-2.5 rounded-2xl border transition-all flex flex-col items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'border-brand-accent bg-brand-accent/5 shadow-xs'
                          : 'border-brand-dark/[0.08] hover:border-brand-dark/30 bg-white shadow-2xs'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-muted border border-brand-dark/[0.08]">
                        <img src={presetUrl} alt={presetSeed} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-brand-dark/80 truncate w-full text-center">
                        {presetSeed.replace('_', ' ')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Custom URL */}
          {activeTab === 'custom_url' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70">
                {t('direct_image_url_label', 'Direct Image or Avatar URL')}
              </label>
              <input
                type="text"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 font-mono text-xs text-brand-dark outline-none focus:bg-white focus:border-brand-accent transition-all"
              />
              <p className="text-xs text-brand-dark/50">
                {t('custom_url_desc', 'You can paste any direct web image link or upload a file using the "Upload Photo" button above.')}
              </p>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-brand-dark/[0.08] bg-white flex flex-col sm:flex-row gap-3 items-center justify-between sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-full border border-brand-dark/[0.15] hover:bg-brand-muted font-semibold uppercase tracking-wider text-xs transition-colors cursor-pointer shadow-2xs"
          >
            {t('cancel', 'Cancel')}
          </button>

          <div className="flex gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleRandomize}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-full border border-brand-dark/[0.12] bg-brand-muted/40 hover:bg-brand-dark hover:text-white font-semibold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Dices size={14} />
              <span>{t('randomize_btn', 'Randomize')}</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAvatar}
              disabled={saving}
              className="flex-1 sm:flex-initial bg-brand-dark text-white px-6 py-2 rounded-full font-semibold uppercase tracking-wider text-xs hover:bg-brand-accent transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Check size={14} />
              )}
              <span>{t('save_avatar_btn', 'Save Avatar')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
