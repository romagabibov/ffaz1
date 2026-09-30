import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { signOut } from 'firebase/auth';
import { User, UserProfileData, WorkExperience, EducationInfo } from '../types';
import { Plus, Trash2, Save, X, Dices, Sparkles, Search, Tag, Check, Copy, ExternalLink, Building2, Scissors, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { doc, updateDoc, increment, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { uploadMediaFile } from '../lib/upload';
import AvatarCustomizerModal, { AVATAR_STYLES } from './AvatarCustomizerModal';
import { ALL_PREDEFINED_SKILLS, searchSkills } from '../data/skillsData';
import { DEFAULT_AGENCIES } from '../data/defaultAgencies';
import ModelVerifiedBadge from './ModelVerifiedBadge';
import GoldenNeedleBadge from './GoldenNeedleBadge';
import ModelAgencyInvitationCard from './ModelAgencyInvitationCard';
import { toast } from 'sonner';
import { apiFetch } from '../lib/apiClient';

const POPULAR_SUGGESTIONS = [
  'Fashion Design', 'Haute Couture', 'Trend Forecasting', 'Fashion Styling', 'Pattern Making',
  'CLO 3D Fashion Design', 'Bespoke Tailoring', 'Creative Direction', 'Runway Show Production',
  'Sustainable Fashion Design', 'Textile Science', 'Luxury Brand Management', 'Visual Merchandising',
  'UI/UX Design', 'Figma', 'React.js', 'TypeScript', 'Project Management', 'Digital Marketing'
];

const BAD_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'bastard', 'slut', 'whore', 'хуй', 'пизда', 'ебать', 'блядь'];

export default function LinkedInStyleProfile({ user, onComplete }: { user: User, onComplete: () => void }) {
  const ui = useUI();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [profileData, setProfileData] = useState<UserProfileData>({
    generalInfo: { bio: '', location: '', headline: '', website: '' },
    experience: [],
    education: [],
    skills: []
  });

  const [name, setName] = useState(user.name || '');
  const [username, setUsername] = useState(user.username || user.email?.split('@')[0]?.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() || '');
  const [usernameError, setUsernameError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Account Deletion State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Model & Agency fields
  const [isModel, setIsModel] = useState(Boolean(user.isModel || user.industry?.toLowerCase().includes('model') || user.hasModelBadge));
  const [modelAgencyName, setModelAgencyName] = useState(user.modelAgencyName || user.modelVerifiedByAgency || '');
  const [customAgencyName, setCustomAgencyName] = useState('');
  const [isAgencyRep, setIsAgencyRep] = useState(Boolean(user.isAgencyRepresentative || user.industry === 'agency_rep'));
  const [representedAgencyName, setRepresentedAgencyName] = useState(user.representedAgencyName || '');
  const [customRepresentedAgencyName, setCustomRepresentedAgencyName] = useState('');

  // Designer fields
  const [isDesigner, setIsDesigner] = useState(Boolean(user.isDesigner || user.industry === 'fashion_design' || user.industry === 'designer' || user.hasGoldenNeedle || user.designerVerificationStatus));
  const [designerBrandName, setDesignerBrandName] = useState(user.designerBrandName || user.brandName || '');

  const [skillInput, setSkillInput] = useState('');
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
  const skillsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (skillsContainerRef.current && !skillsContainerRef.current.contains(event.target as Node)) {
        setShowSkillSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSkills = searchSkills(skillInput, profileData.skills, 60);

  const handleImageUpload = async (file: File): Promise<string | null> => {
    if (file.size > 15 * 1024 * 1024) {
      ui.alert(t('image_too_large', 'Image too large (Max 15MB)'));
      return null;
    }
    try {
      const url = await uploadMediaFile(file);
      return url;
    } catch (err: any) {
      console.error('File upload error:', err);
      ui.alert(err.message || t('failed_upload_image', 'Failed to upload image'));
      return null;
    }
  };

  useEffect(() => {
    if (user.profileData) {
      setProfileData(user.profileData);
    } else {
      setProfileData(prev => ({
        ...prev,
        generalInfo: { ...prev.generalInfo, bio: user.bio || '' }
      }));
    }
    setName(user.name || '');
    setUsername(user.username || user.email?.split('@')[0]?.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() || '');
    setAvatarUrl(user.avatarUrl || '');

    const userIsModel = Boolean(user.isModel || user.industry?.toLowerCase().includes('model') || user.hasModelBadge);
    setIsModel(userIsModel);
    const agencyName = user.modelAgencyName || user.modelVerifiedByAgency || '';
    setModelAgencyName(agencyName);
    if (agencyName && !DEFAULT_AGENCIES.some(a => a.name === agencyName) && agencyName !== 'Independent / Freelance' && agencyName !== 'other') {
      setCustomAgencyName(agencyName);
    }

    const userIsAgencyRep = Boolean(user.isAgencyRepresentative || user.industry === 'agency_rep');
    setIsAgencyRep(userIsAgencyRep);
    const repAgencyName = user.representedAgencyName || '';
    setRepresentedAgencyName(repAgencyName);
    if (repAgencyName && !DEFAULT_AGENCIES.some(a => a.name === repAgencyName) && repAgencyName !== 'other') {
      setCustomRepresentedAgencyName(repAgencyName);
    }
  }, [user]);

  const validateUsername = (val: string) => {
    const cleaned = val.replace(/^@+/, '').trim().toLowerCase();
    if (!cleaned) return t('username_empty', 'Username cannot be empty');
    if (cleaned.length < 3) return t('username_min', 'Username must be at least 3 characters');
    if (cleaned.length > 30) return t('username_max', 'Username cannot exceed 30 characters');
    if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) return t('username_chars', 'Only letters, numbers, and underscores allowed');
    return '';
  };

  const handleUsernameChange = (val: string) => {
    const cleaned = val.replace(/^@+/, '').trim().toLowerCase();
    setUsername(cleaned);
    setUsernameError(validateUsername(cleaned));
  };

  const handleSave = async () => {
    const cleanedUsername = username.replace(/^@+/, '').trim().toLowerCase();
    const err = validateUsername(cleanedUsername);
    if (err) {
      setUsernameError(err);
      ui.alert(err);
      return;
    }

    setSaving(true);
    try {
      if (cleanedUsername !== user.username) {
        const qUsername = query(
          collection(db, 'users'),
          where('username', '==', cleanedUsername),
          limit(2)
        );
        const snap = await getDocs(qUsername);
        const conflict = snap.docs.some(d => d.id !== user.id);
        if (conflict) {
          setUsernameError(t('handle_taken', { handle: `@${cleanedUsername}`, defaultValue: `The handle @${cleanedUsername} is already taken. Please choose another.` }));
          ui.alert(t('handle_taken', { handle: `@${cleanedUsername}`, defaultValue: `@${cleanedUsername} is already in use.` }));
          setSaving(false);
          return;
        }
      }

      const effectiveModelAgency = modelAgencyName === 'other' ? customAgencyName.trim() : modelAgencyName;
      const effectiveRepAgency = representedAgencyName === 'other' ? customRepresentedAgencyName.trim() : representedAgencyName;

      await updateDoc(doc(db, 'users', user.id), {
        name,
        username: cleanedUsername,
        handle: `@${cleanedUsername}`,
        avatarUrl,
        bio: profileData.generalInfo.bio,
        profileData,
        lastProfileUpdate: Date.now(),
        isModel,
        modelAgencyName: isModel ? effectiveModelAgency : '',
        ...(isModel && !user.modelVerificationStatus ? { modelVerificationStatus: 'pending' } : {}),
        isAgencyRepresentative: isAgencyRep,
        representedAgencyName: isAgencyRep ? effectiveRepAgency : '',
        isDesigner,
        designerBrandName: isDesigner ? designerBrandName.trim() : '',
        brandName: isDesigner ? designerBrandName.trim() : (user.brandName || ''),
        ...(isDesigner && !user.designerVerificationStatus ? { designerVerificationStatus: 'none' } : {})
      });

      ui.alert(t('profile_updated_success', 'Profile updated successfully!'));
      onComplete();
    } catch (err: any) {
      console.error('Error saving profile:', err);
      ui.alert(t('profile_update_failed', 'Failed to update profile: ') + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = async (rawSkill: string) => {
    const skill = rawSkill.trim();
    if (!skill) return;

    const lower = skill.toLowerCase();
    const isProfane = BAD_WORDS.some(bad => lower.includes(bad));

    if (isProfane) {
      ui.alert(t('inappropriate_content_warning', 'Inappropriate content detected. This incident has been reported.'));
      await updateDoc(doc(db, 'users', user.id), {
        warnings: increment(1)
      });
      setSkillInput('');
      setShowSkillSuggestions(false);
      return;
    }

    if (!profileData.skills.includes(skill)) {
      setProfileData(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
    }
    setSkillInput('');
    setShowSkillSuggestions(false);
  };

  const removeSkill = (skill: string) => {
    setProfileData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const addExperience = () => {
    setProfileData(prev => ({
      ...prev,
      experience: [...prev.experience, { id: Date.now().toString(), title: '', company: '', startDate: '', current: false, description: '' }]
    }));
  };

  const updateExperience = (id: string, field: keyof WorkExperience, value: any) => {
    setProfileData(prev => ({
      ...prev,
      experience: prev.experience.map(e => e.id === id ? { ...e, [field]: value } : e)
    }));
  };

  const removeExperience = (id: string) => {
    setProfileData(prev => ({
      ...prev,
      experience: prev.experience.filter(e => e.id !== id)
    }));
  };

  const addEducation = () => {
    setProfileData(prev => ({
      ...prev,
      education: [...prev.education, { id: Date.now().toString(), school: '', degree: '', fieldOfStudy: '', startDate: '', description: '' }]
    }));
  };

  const updateEducation = (id: string, field: keyof EducationInfo, value: any) => {
    setProfileData(prev => ({
      ...prev,
      education: prev.education.map(e => e.id === id ? { ...e, [field]: value } : e)
    }));
  };

  const removeEducation = (id: string) => {
    setProfileData(prev => ({
      ...prev,
      education: prev.education.filter(e => e.id !== id)
    }));
  };

  return (
    <div className="space-y-8 sm:space-y-10 bg-white p-6 sm:p-10 rounded-3xl border border-brand-dark/[0.08] shadow-xs">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-brand-dark/[0.08] pb-5">
        <div>
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
            Dossier & Bio
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark mt-1">
            {t('edit_profile_title', 'Edit Profile')}
          </h2>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full sm:w-auto bg-brand-dark hover:bg-brand-accent text-white px-6 py-2.5 rounded-full font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors text-xs shadow-2xs cursor-pointer disabled:opacity-50"
        >
          <Save size={14} /> 
          <span>{saving ? t('saving', 'Saving...') : t('save', 'Save Profile')}</span>
        </button>
      </div>

      {/* General Info */}
      <section className="space-y-6">
        <h3 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-brand-dark border-b border-brand-dark/[0.08] pb-2">
          {t('general_information', 'General Information')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Avatar Section */}
          <div className="md:col-span-2 space-y-3">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70">
              {t('avatar_label', 'Avatar & Portrait')}
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-5 rounded-2xl border border-brand-dark/[0.08] bg-brand-muted/20">
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-full border-2 border-brand-dark/[0.12] overflow-hidden bg-white shadow-2xs">
                  <img 
                    src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                    alt="Avatar preview" 
                    className="w-full h-full object-cover" 
                    crossOrigin="anonymous" 
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(true)}
                  title={t('avatar_studio', 'Avatar Studio')}
                  className="absolute -bottom-1 -right-1 bg-brand-accent hover:bg-brand-dark text-white p-2 rounded-full border border-white shadow-2xs hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                >
                  <Dices size={14} />
                </button>
              </div>

              <div className="flex-grow space-y-3 w-full">
                <div className="flex flex-wrap gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAvatarModal(true)} 
                    className="bg-brand-accent text-white px-4 py-2 rounded-full font-semibold uppercase tracking-wider text-xs hover:bg-brand-dark transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Dices size={13} />
                    <span>{t('avatar_studio_randomizer', 'Avatar Studio / Randomizer')}</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => {
                      const randomSeed = Math.random().toString(36).substring(2, 9);
                      const randomStyle = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)].id;
                      setAvatarUrl(`https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${randomSeed}`);
                    }} 
                    className="border border-brand-dark/[0.12] bg-white hover:bg-brand-muted/50 text-brand-dark px-4 py-2 rounded-full font-semibold uppercase tracking-wider text-xs transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Sparkles size={13} className="text-brand-accent" />
                    <span>{t('quick_random', 'Quick Random')}</span>
                  </button>

                  <label className="cursor-pointer bg-brand-dark text-white px-4 py-2 rounded-full font-semibold uppercase tracking-wider text-xs hover:bg-brand-accent transition-colors flex items-center gap-1.5 shadow-2xs">
                    <span>{t('upload_photo', 'Upload Photo')}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={async (e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          const url = await handleImageUpload(file);
                          if (url) setAvatarUrl(url);
                        }
                      }} 
                    />
                  </label>
                </div>

                <input 
                  type="text" 
                  value={avatarUrl} 
                  onChange={e => setAvatarUrl(e.target.value)} 
                  placeholder={t('enter_direct_image_url', 'Or enter direct image URL...')} 
                  className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2 font-mono text-xs text-brand-dark outline-none focus:border-brand-accent transition-all placeholder:text-brand-dark/40" 
                />
              </div>
            </div>

            <AvatarCustomizerModal
              isOpen={showAvatarModal}
              onClose={() => setShowAvatarModal(false)}
              currentAvatarUrl={avatarUrl}
              userId={user.id}
              onAvatarUpdated={(newUrl) => setAvatarUrl(newUrl)}
            />
          </div>

          {/* Display Name & Handle */}
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-2">
              {t('display_name', 'Display Name')}
            </label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 font-medium text-sm text-brand-dark outline-none focus:bg-white focus:border-brand-accent transition-all" 
              placeholder={t('your_full_name', 'Your Full Name')}
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-2 flex items-center justify-between">
              <span>{t('unique_handle', 'Unique Handle (@username)')}</span>
              <span className="text-[11px] font-normal text-brand-dark/50 lowercase">{t('handle_rules_hint', 'Letters, numbers, _')}</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 font-mono text-brand-dark/50 text-sm pointer-events-none">@</span>
              <input 
                type="text" 
                value={username} 
                onChange={e => handleUsernameChange(e.target.value)} 
                className={`w-full bg-brand-muted/30 border ${usernameError ? 'border-red-500' : 'border-brand-dark/[0.12]'} rounded-xl pl-8 pr-4 py-2.5 font-mono text-sm text-brand-dark outline-none focus:bg-white focus:border-brand-accent transition-all`}
                placeholder="_coyora" 
              />
            </div>
            {usernameError ? (
              <p className="text-xs font-medium text-red-600 mt-1.5">{usernameError}</p>
            ) : (
              <div className="mt-2 px-3 py-1.5 rounded-lg bg-brand-muted/40 border border-brand-dark/[0.06] flex items-center justify-between gap-2 text-xs">
                <div className="truncate font-mono text-brand-dark/70 text-[11px]">
                  <span className="font-semibold text-brand-dark">{t('link_label', 'Link:')} </span>
                  {window.location.origin}/@{username || 'handle'}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/@${username}`);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="shrink-0 bg-brand-dark text-white px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider hover:bg-brand-accent transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copiedLink ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedLink ? t('copied', 'Copied') : t('copy', 'Copy')}</span>
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-2">
              {t('headline_label', 'Headline / Professional Title')}
            </label>
            <input 
              type="text" 
              value={profileData.generalInfo.headline || ''} 
              onChange={e => setProfileData(p => ({ ...p, generalInfo: { ...p.generalInfo, headline: e.target.value } }))} 
              className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 font-medium text-sm text-brand-dark outline-none focus:bg-white focus:border-brand-accent transition-all" 
              placeholder={t('headline_placeholder', 'e.g. Fashion Model, Couture Designer, Stylist...')} 
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-2">
              {t('location_label', 'Location')}
            </label>
            <input 
              type="text" 
              value={profileData.generalInfo.location || ''} 
              onChange={e => setProfileData(p => ({ ...p, generalInfo: { ...p.generalInfo, location: e.target.value } }))} 
              className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 font-medium text-sm text-brand-dark outline-none focus:bg-white focus:border-brand-accent transition-all" 
              placeholder={t('location_placeholder', 'Baku, Azerbaijan')} 
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-2">
              {t('website_label', 'Website / Portfolio')}
            </label>
            <input 
              type="url" 
              value={profileData.generalInfo.website || ''} 
              onChange={e => setProfileData(p => ({ ...p, generalInfo: { ...p.generalInfo, website: e.target.value } }))} 
              className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 font-medium text-sm text-brand-dark outline-none focus:bg-white focus:border-brand-accent transition-all font-mono" 
              placeholder="https://..." 
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-2">
              {t('bio_label', 'Bio / Editorial Summary')}
            </label>
            <textarea 
              value={profileData.generalInfo.bio} 
              onChange={e => setProfileData(p => ({ ...p, generalInfo: { ...p.generalInfo, bio: e.target.value } }))} 
              className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-3 font-normal text-sm text-brand-dark outline-none focus:bg-white focus:border-brand-accent transition-all h-32 resize-none leading-relaxed" 
              placeholder={t('bio_placeholder', 'Write a short summary about yourself, your career, aesthetic, and background...')}
            ></textarea>
          </div>

          {/* Model Affiliation Section */}
          <div className="md:col-span-2 p-5 rounded-2xl bg-brand-accent/[0.03] border border-brand-accent/20 space-y-4">
            <ModelAgencyInvitationCard user={user} />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-brand-accent" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark">
                  {t('model_status_agency', 'Модельный статус и агентство')}
                </h4>
              </div>
              {user.hasModelBadge && (
                <ModelVerifiedBadge size="sm" showLabel agencyName={user.modelVerifiedByAgency || user.modelAgencyName} />
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="isModelProfileCheck"
                checked={isModel}
                onChange={e => setIsModel(e.target.checked)}
                className="w-4 h-4 rounded accent-brand-accent cursor-pointer"
              />
              <label htmlFor="isModelProfileCheck" className="text-xs font-medium text-brand-dark cursor-pointer select-none">
                Я являюсь моделью (Model Profile)
              </label>
            </div>

            {isModel && (
              <div className="space-y-3 pt-3 border-t border-brand-dark/[0.08]">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-1.5">
                    Выберите ваше модельное агентство (Choose Model Agency)
                  </label>
                  <select
                    value={modelAgencyName}
                    onChange={e => setModelAgencyName(e.target.value)}
                    className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2.5 font-medium text-xs text-brand-dark outline-none focus:border-brand-accent transition-all"
                  >
                    <option value="">-- Выберите агентство или укажите сами --</option>
                    <option value="Independent / Freelance">Независимая модель / Freelance</option>
                    {DEFAULT_AGENCIES.map(a => (
                      <option key={a.name} value={a.name}>
                        {a.name} ({a.location.split('(')[0].trim()})
                      </option>
                    ))}
                    <option value="other">✍️ Другое агентство (ввести вручную)...</option>
                  </select>
                </div>

                {(modelAgencyName === 'other' || (!DEFAULT_AGENCIES.some(a => a.name === modelAgencyName) && modelAgencyName !== '' && modelAgencyName !== 'Independent / Freelance')) && (
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-1.5">
                      Название вашего модельного агентства
                    </label>
                    <input
                      type="text"
                      value={customAgencyName || (modelAgencyName !== 'other' ? modelAgencyName : '')}
                      onChange={e => {
                        setCustomAgencyName(e.target.value);
                        setModelAgencyName('other');
                      }}
                      placeholder="Например: Elite Model Look, Venera Models, NL Models..."
                      className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2.5 font-medium text-xs text-brand-dark outline-none focus:border-brand-accent transition-all"
                    />
                  </div>
                )}

                <div className="p-3 rounded-xl bg-white border border-brand-dark/[0.08] text-[11px] font-mono text-brand-dark/70">
                  💡 <strong>Подтверждение со значком 😎:</strong> После указания агентства представитель или админ агентства сможет подтвердить ваш статус через поиск по @username.
                </div>
              </div>
            )}
          </div>

          {/* Designer Status & Brand Section */}
          <div className="p-5 rounded-2xl border border-brand-dark/[0.08] bg-brand-light/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors size={18} className="text-[#7a0000]" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark">
                  Статус дизайнера и модный дом
                </h4>
              </div>
              {user.hasGoldenNeedle && (
                <GoldenNeedleBadge size="sm" showLabel />
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="isDesignerProfileCheck"
                checked={isDesigner}
                onChange={e => setIsDesigner(e.target.checked)}
                className="w-4 h-4 rounded accent-[#7a0000] cursor-pointer"
              />
              <label htmlFor="isDesignerProfileCheck" className="text-xs font-medium text-brand-dark cursor-pointer select-none">
                Я являюсь дизайнером одежды / представляю модный дом (Fashion Designer / Brand)
              </label>
            </div>

            {isDesigner && (
              <div className="space-y-3 pt-3 border-t border-brand-dark/[0.08]">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-1.5">
                    Название бренда / модного дома (Brand / Fashion House Name)
                  </label>
                  <input
                    type="text"
                    value={designerBrandName}
                    onChange={e => setDesignerBrandName(e.target.value)}
                    placeholder="Например: Atelier Baku, Maison De Soie..."
                    className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2.5 font-medium text-xs text-brand-dark outline-none focus:border-[#7a0000] transition-all"
                  />
                </div>
                <div className="p-3 bg-white rounded-xl border border-brand-dark/10 text-xs text-brand-dark/70 flex items-start gap-2">
                  <GoldenNeedleBadge size="xs" />
                  <p>
                    Для получения знака отличия <strong>«Золотая Игла» (Qızıl İynə)</strong> и доступа к разделу <strong>«Direct Chat»</strong> перейдите во вкладку «Дизайнер» в личном кабинете и подтвердите профиль, загрузив документы (şəxsiyyət vəsiqəsi).
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Experience */}
      <section className="space-y-5">
        <div className="flex justify-between items-center border-b border-brand-dark/[0.08] pb-2">
          <h3 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-brand-dark">
            {t('work_experience', 'Work Experience')}
          </h3>
          <button 
            type="button"
            onClick={addExperience} 
            className="rounded-full border border-brand-dark/[0.15] bg-white hover:bg-brand-dark hover:text-white px-3.5 py-1.5 font-semibold uppercase tracking-wider text-xs text-brand-dark flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus size={13} /> 
            <span>{t('add', 'Add Experience')}</span>
          </button>
        </div>

        {profileData.experience.map((exp) => (
          <div key={exp.id} className="p-5 sm:p-6 rounded-2xl border border-brand-dark/[0.08] bg-brand-muted/20 space-y-4 relative shadow-2xs">
            <button 
              type="button"
              onClick={() => removeExperience(exp.id)} 
              className="absolute top-4 right-4 w-8 h-8 rounded-full border border-brand-dark/10 hover:bg-red-50 hover:text-red-600 text-brand-dark/50 flex items-center justify-center transition-colors cursor-pointer"
              title="Delete entry"
            >
              <Trash2 size={14} />
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-1">{t('job_title', 'Title')}</label>
                <input type="text" value={exp.title} onChange={e => updateExperience(exp.id, 'title', e.target.value)} className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:border-brand-accent" />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-1">{t('company', 'Company / House')}</label>
                <input type="text" value={exp.company} onChange={e => updateExperience(exp.id, 'company', e.target.value)} className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:border-brand-accent" />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-1">{t('start_date', 'Start Date')}</label>
                <input type="month" value={exp.startDate} onChange={e => updateExperience(exp.id, 'startDate', e.target.value)} className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:border-brand-accent" />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-1">{t('end_date', 'End Date')}</label>
                <input type="month" value={exp.endDate || ''} disabled={exp.current} onChange={e => updateExperience(exp.id, 'endDate', e.target.value)} className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:border-brand-accent disabled:opacity-50" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={exp.current} onChange={e => updateExperience(exp.id, 'current', e.target.checked)} className="w-4 h-4 rounded accent-brand-accent" id={`current-${exp.id}`} />
              <label htmlFor={`current-${exp.id}`} className="text-xs font-medium text-brand-dark cursor-pointer">{t('currently_work_here', 'I currently work here')}</label>
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-1">{t('job_desc', 'Description')}</label>
              <textarea value={exp.description} onChange={e => updateExperience(exp.id, 'description', e.target.value)} className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2 text-xs font-normal outline-none focus:border-brand-accent h-20 resize-none leading-relaxed" />
            </div>
          </div>
        ))}
      </section>

      {/* Education */}
      <section className="space-y-5">
        <div className="flex justify-between items-center border-b border-brand-dark/[0.08] pb-2">
          <h3 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-brand-dark">
            {t('education_section', 'Education')}
          </h3>
          <button 
            type="button"
            onClick={addEducation} 
            className="rounded-full border border-brand-dark/[0.15] bg-white hover:bg-brand-dark hover:text-white px-3.5 py-1.5 font-semibold uppercase tracking-wider text-xs text-brand-dark flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus size={13} /> 
            <span>{t('add', 'Add Education')}</span>
          </button>
        </div>

        {profileData.education.map((edu) => (
          <div key={edu.id} className="p-5 sm:p-6 rounded-2xl border border-brand-dark/[0.08] bg-brand-muted/20 space-y-4 relative shadow-2xs">
            <button 
              type="button"
              onClick={() => removeEducation(edu.id)} 
              className="absolute top-4 right-4 w-8 h-8 rounded-full border border-brand-dark/10 hover:bg-red-50 hover:text-red-600 text-brand-dark/50 flex items-center justify-center transition-colors cursor-pointer"
              title="Delete entry"
            >
              <Trash2 size={14} />
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-1">{t('school_uni', 'School / University')}</label>
                <input type="text" value={edu.school} onChange={e => updateEducation(edu.id, 'school', e.target.value)} className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:border-brand-accent" />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-1">{t('degree', 'Degree')}</label>
                <input type="text" value={edu.degree} onChange={e => updateEducation(edu.id, 'degree', e.target.value)} className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:border-brand-accent" />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-1">{t('field_of_study', 'Field of Study')}</label>
                <input type="text" value={edu.fieldOfStudy} onChange={e => updateEducation(edu.id, 'fieldOfStudy', e.target.value)} className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:border-brand-accent" />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-1">{t('start_date', 'Start Date')}</label>
                <input type="month" value={edu.startDate} onChange={e => updateEducation(edu.id, 'startDate', e.target.value)} className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:border-brand-accent" />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-1">{t('end_date_expected', 'End Date (or expected)')}</label>
                <input type="month" value={edu.endDate || ''} onChange={e => updateEducation(edu.id, 'endDate', e.target.value)} className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:border-brand-accent" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-1">{t('edu_desc_activities', 'Description / Activities')}</label>
              <textarea value={edu.description} onChange={e => updateEducation(edu.id, 'description', e.target.value)} className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2 text-xs font-normal outline-none focus:border-brand-accent h-20 resize-none leading-relaxed" />
            </div>
          </div>
        ))}
      </section>

      {/* Skills */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-dark/[0.08] pb-2">
          <div className="flex items-center gap-3">
            <h3 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-brand-dark">
              {t('skills_section', 'Skills')}
            </h3>
            <span className="text-[10px] font-mono font-semibold uppercase text-brand-accent bg-brand-accent/5 border border-brand-accent/15 px-2.5 py-0.5 rounded-full">
              {t('skills_in_catalog', { count: ALL_PREDEFINED_SKILLS.length.toLocaleString(), defaultValue: `${ALL_PREDEFINED_SKILLS.length.toLocaleString()}+ in Catalog` })}
            </span>
          </div>
          <span className="text-xs font-mono text-brand-dark/50 uppercase tracking-wider">
            {t('skills_selected_count', { count: profileData.skills.length, defaultValue: `${profileData.skills.length} Selected` })}
          </span>
        </div>

        <div className="relative" ref={skillsContainerRef}>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-2 flex items-center justify-between">
            <span>{t('add_a_skill', 'Add a skill')}</span>
            <span className="text-[11px] font-normal lowercase text-brand-dark/50">
              {t('skills_search_hint', 'Type to search across fashion, tech & business skills')}
            </span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-dark/40">
                <Search size={15} />
              </div>
              <input 
                type="text" 
                value={skillInput} 
                onChange={e => {
                  setSkillInput(e.target.value);
                  setShowSkillSuggestions(true);
                }}
                onFocus={() => setShowSkillSuggestions(true)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (skillInput.trim()) {
                      if (filteredSkills.length > 0 && showSkillSuggestions) {
                        handleAddSkill(filteredSkills[0]);
                      } else {
                        handleAddSkill(skillInput.trim());
                      }
                    }
                  } else if (e.key === 'Escape') {
                    setShowSkillSuggestions(false);
                  }
                }}
                className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl pl-9 pr-9 py-2.5 text-xs sm:text-sm font-medium text-brand-dark outline-none focus:bg-white focus:border-brand-accent transition-all placeholder:text-brand-dark/40" 
                placeholder={t('search_skill_placeholder', 'Search skill (e.g., Haute Couture, CLO 3D, React, Styling...)')} 
              />
              {skillInput && (
                <button
                  type="button"
                  onClick={() => setSkillInput('')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-brand-dark/40 hover:text-brand-dark cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button 
              type="button" 
              onClick={() => {
                if (skillInput.trim()) {
                  handleAddSkill(skillInput.trim());
                }
              }} 
              className="bg-brand-dark text-white px-5 py-2 rounded-xl font-semibold uppercase tracking-wider text-xs hover:bg-brand-accent transition-colors shadow-2xs cursor-pointer"
            >
              {t('add', 'Add')}
            </button>
          </div>
          
          {showSkillSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-brand-dark/[0.12] shadow-xl z-30 max-h-72 overflow-y-auto">
              <div className="p-2.5 bg-brand-muted/40 border-b border-brand-dark/[0.08] flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-brand-dark/70">
                <span>{t('matching_suggestions', { count: filteredSkills.length, defaultValue: `${filteredSkills.length} Suggestions` })}</span>
                <span className="text-brand-dark/40 font-normal">{t('press_enter_select', 'Enter to select')}</span>
              </div>
              {filteredSkills.length > 0 ? (
                filteredSkills.map(skill => (
                  <div 
                    key={skill} 
                    className="px-4 py-2.5 hover:bg-brand-muted/50 cursor-pointer text-xs font-medium text-brand-dark border-b border-brand-dark/[0.04] last:border-0 flex items-center justify-between group transition-colors"
                    onClick={() => handleAddSkill(skill)}
                  >
                    <div className="flex items-center gap-2">
                      <Tag size={12} className="text-brand-dark/40 group-hover:text-brand-accent transition-colors" />
                      <span>{skill}</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-brand-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <Plus size={11} /> {t('add', 'Add')}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center space-y-2">
                  <p className="text-xs font-medium text-brand-dark/70">{t('no_match_skill', { query: skillInput, defaultValue: `No exact match for "${skillInput}"` })}</p>
                  <button
                    type="button"
                    onClick={() => handleAddSkill(skillInput.trim())}
                    className="text-xs font-semibold uppercase tracking-wider bg-brand-dark text-white px-4 py-1.5 rounded-full hover:bg-brand-accent inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Plus size={12} /> {t('add_custom_skill', { skill: skillInput, defaultValue: `Add custom: "${skillInput}"` })}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Popular Suggestions */}
        <div className="space-y-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-brand-dark/60 flex items-center gap-1.5">
            <Sparkles size={13} className="text-brand-accent" />
            {t('quick_suggestions', 'Quick suggestions:')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_SUGGESTIONS.filter(s => !profileData.skills.includes(s)).slice(0, 10).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => handleAddSkill(s)}
                className="text-xs rounded-full bg-brand-muted/40 border border-brand-dark/[0.08] px-3 py-1 text-brand-dark hover:bg-brand-dark hover:text-white transition-all flex items-center gap-1 cursor-pointer font-medium"
              >
                <Plus size={11} />
                <span>{s}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected skills */}
        <div className="pt-2">
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 mb-2">
            {t('your_skills_count', { count: profileData.skills.length, defaultValue: `Your Skills (${profileData.skills.length})` })}
          </label>
          {profileData.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profileData.skills.map(skill => (
                <div key={skill} className="bg-brand-muted/70 rounded-full border border-brand-dark/[0.08] px-3.5 py-1 text-xs font-mono text-brand-dark flex items-center gap-2 shadow-2xs">
                  <span>{skill}</span>
                  <button 
                    type="button" 
                    onClick={() => removeSkill(skill)} 
                    className="hover:text-brand-accent text-brand-dark/50 transition-colors ml-0.5 cursor-pointer"
                    title={`Remove ${skill}`}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-brand-dark/50 font-normal">
              {t('no_skills_added', 'No skills added yet. Select from the dropdown or type a custom skill above.')}
            </p>
          )}
        </div>
      </section>

      {/* DANGER ZONE: DELETE ACCOUNT */}
      <section className="bg-red-50/70 border-2 border-red-500/30 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full border border-red-200">
                  Опасная зона • Danger Zone
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-display font-bold text-red-950 uppercase tracking-tight mt-1">
                Удаление учетной записи
              </h3>
              <p className="text-xs text-red-900/80 leading-relaxed max-w-xl mt-1">
                Безвозвратное удаление вашего профиля, публикаций, откликов, заявок и всех персональных данных из системы Azerbaijan Fashion Future. Это действие необратимо.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setDeleteConfirmText('');
              setShowDeleteModal(true);
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors shrink-0 shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 size={14} />
            <span>Удалить аккаунт</span>
          </button>
        </div>
      </section>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border-2 border-red-600/30 max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-600">
                    Подтверждение удаления
                  </span>
                  <h3 className="text-lg sm:text-xl font-display font-bold text-brand-dark uppercase tracking-tight">
                    Вы уверены?
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingAccount}
                className="w-8 h-8 rounded-full border border-brand-dark/10 flex items-center justify-center text-brand-dark/60 hover:text-brand-dark transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-brand-dark/80 leading-relaxed bg-red-50/60 p-4 rounded-2xl border border-red-200/60">
              <p>
                <strong>Будут безвозвратно удалены:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-red-950">
                <li>Ваш профиль и аватар</li>
                <li>Все публикации и комментарии</li>
                <li>Заявки на показы и розыгрыши</li>
                <li>Отклики на вакансии и резюме</li>
                <li>Авторизация через Email / Google</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70">
                Для подтверждения введите слово <span className="text-red-600 select-all">УДАЛИТЬ</span>:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="УДАЛИТЬ"
                disabled={isDeletingAccount}
                className="w-full bg-brand-light border-2 border-brand-dark/20 rounded-xl px-4 py-2.5 text-sm font-bold text-brand-dark uppercase tracking-wider focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingAccount}
                className="flex-1 py-2.5 rounded-full border border-brand-dark/20 text-brand-dark font-semibold uppercase tracking-wider text-xs hover:bg-brand-muted transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={deleteConfirmText.trim().toUpperCase() !== 'УДАЛИТЬ' && deleteConfirmText.trim().toUpperCase() !== 'DELETE' || isDeletingAccount}
                onClick={async () => {
                  if (!currentUser) return;
                  setIsDeletingAccount(true);
                  try {
                    const token = await currentUser.getIdToken();
                    const res = await fetch('/api/user/delete-my-account', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      }
                    });
                    if (!res.ok) {
                      const errData = await res.json().catch(() => ({}));
                      throw new Error(errData.error || 'Failed to delete account');
                    }
                    await signOut(auth);
                    toast.success('Ваш аккаунт и данные успешно удалены.');
                    setShowDeleteModal(false);
                    navigate('/');
                  } catch (err: any) {
                    console.error('Account deletion error:', err);
                    toast.error(err.message || 'Ошибка при удалении аккаунта.');
                    setIsDeletingAccount(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-full bg-red-600 text-white font-semibold uppercase tracking-wider text-xs hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDeletingAccount ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-r-transparent rounded-full animate-spin" />
                    <span>Удаление...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Подтвердить удаление</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
