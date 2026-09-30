import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { 
  Instagram, Globe, X, Search, Sparkles, MessageSquare, 
  ExternalLink, UserCheck, Crown, Lock, HeartHandshake, Share2 
} from 'lucide-react';
import { collection, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_DESIGNERS } from '../data/defaultDesigners';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

interface DesignerItem {
  id: string;
  name: string; // Brand name (primary)
  founder: string; // Designer name (secondary)
  linkedUserId?: string;
  linkedUserName?: string;
  linkedUserHandle?: string;
  hasGoldenNeedle?: boolean;
  socials: {
    instagram?: string;
    website?: string;
  };
}

export default function Designers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, dbUser } = useAuth();
  const [selectedDesigner, setSelectedDesigner] = useState<DesignerItem | null>(null);
  const [designers, setDesigners] = useState<DesignerItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Premium subscription check (pro, elite, vip, business, creator) or admin roles
  const isPremiumUser = Boolean(
    currentUser && (
      dbUser?.role === 'admin' ||
      dbUser?.role === 'superadmin' ||
      (dbUser?.subscriptionTier && dbUser?.subscriptionTier !== 'free') ||
      dbUser?.hasGoldenNeedle ||
      dbUser?.hasDirectChat
    )
  );

  const handleCopyInvite = (designer: DesignerItem) => {
    const origin = window.location.origin;
    const inviteText = `Здравствуйте! Приглашаем модный дом «${designer.name}» присоединиться к сообществу Azerbaijan Fashion (FFAZ) и подтвердить официальный статус резидента «Золотая Игла» (Qızıl İynə): ${origin}/signup`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(inviteText);
      toast.success('Текст приглашения для дизайнера скопирован в буфер обмена!');
    } else {
      toast.info(`Ссылка для регистрации: ${origin}/signup`);
    }
  };

  const handleInstagramInvite = (designer: DesignerItem) => {
    const origin = window.location.origin;
    const inviteText = `Здравствуйте! Приглашаем модный дом «${designer.name}» присоединиться к сообществу Azerbaijan Fashion (FFAZ) и подтвердить статус резидента «Золотая Игла»: ${origin}/signup`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(inviteText);
      toast.success('Текст приглашения скопирован! Вы можете отправить его дизайнеру в Direct.');
    }
  };

  const handleContactDesigner = async (designer: DesignerItem) => {
    if (!currentUser) {
      toast.info('Войдите в аккаунт, чтобы написать дизайнеру');
      navigate('/login');
      return;
    }

    if (!isPremiumUser) {
      try {
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        const qConvs = query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', currentUser.uid)
        );
        const snap = await getDocs(qConvs);
        const dailyCreatedCount = snap.docs.filter((d) => {
          const data = d.data();
          const t = data.createdAt || 0;
          return data.requestedBy === currentUser.uid && t >= oneDayAgo;
        }).length;

        if (dailyCreatedCount >= 5) {
          toast.error('На бесплатном тарифе Free доступно до 5 новых запросов в день. Чтобы писать дизайнерам без ограничений, перейдите на FFAZ Pro.');
          navigate('/plans');
          return;
        }
      } catch (err) {
        console.warn('Could not verify daily quota in Designers.tsx:', err);
      }
    }

    const targetName = designer.founder || designer.name;
    const targetUserId = designer.linkedUserId || designer.id;
    navigate(`/messages?name=${encodeURIComponent(targetName)}&userId=${targetUserId}`);
  };

  // Lock body scroll and prevent page scrolling when designer modal popup is open
  useEffect(() => {
    if (selectedDesigner) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = 'hidden';
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setSelectedDesigner(null);
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [selectedDesigner]);

  useEffect(() => {
    const fetchDesigners = async () => {
      setLoading(true);
      try {
        let querySnapshot = await getDocs(collection(db, 'designers'));
        if (querySnapshot.empty) {
          for (const item of DEFAULT_DESIGNERS) {
            await addDoc(collection(db, 'designers'), {
              name: item.name,
              designerName: item.designerName,
              instagram: item.instagram || '',
              website: item.website || '',
              createdAt: serverTimestamp()
            });
          }
          querySnapshot = await getDocs(collection(db, 'designers'));
        }

        const list: DesignerItem[] = querySnapshot.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            name: d.name || 'Brand Name',
            founder: d.designerName || d.details || d.focus || '',
            linkedUserId: d.linkedUserId,
            linkedUserName: d.linkedUserName,
            linkedUserHandle: d.linkedUserHandle,
            hasGoldenNeedle: d.hasGoldenNeedle ?? true, // resident brands receive Golden Needle
            socials: {
              instagram: d.instagram || d.social || '',
              website: d.website || d.links || ''
            }
          };
        });

        // Sort alphabetically by Brand Name
        list.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

        setDesigners(list);
      } catch (err) {
        console.error("Failed to fetch designers", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDesigners();
  }, []);

  const filteredDesigners = designers.filter(d => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return d.name.toLowerCase().includes(q) || d.founder.toLowerCase().includes(q);
  });

  // Group designers by first letter
  const groupedDesigners = filteredDesigners.reduce((acc, designer) => {
    let letter = designer.name.trim().charAt(0).toUpperCase();
    if (!/[A-Z]/.test(letter)) {
      letter = '#';
    }
    if (!acc[letter]) {
      acc[letter] = [];
    }
    acc[letter].push(designer);
    return acc;
  }, {} as Record<string, DesignerItem[]>);

  const sortedLetters = Object.keys(groupedDesigners).sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="animate-in fade-in duration-700 py-5 sm:py-10 px-4 sm:px-8 md:px-12 max-w-[1600px] mx-auto text-brand-dark">
      <div className="mb-6 sm:mb-10 border-b border-brand-dark/[0.08] pb-5 sm:pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div>
          <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest text-brand-accent block mb-1 sm:mb-2">
            [DIRECTORY ARCHIVE • {designers.length} BRANDS]
          </span>
          <h1 className="text-3xl sm:text-6xl md:text-7xl font-serif font-normal tracking-tight text-brand-dark leading-tight">
            A-Z <span className="italic text-brand-accent font-serif font-normal">{t('designers', 'Designers')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-dark/70 font-normal max-w-2xl mt-1.5">
            {t('designers_subtitle', 'Catalog of Azerbaijani fashion brands and prominent couturiers')}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-auto md:min-w-[320px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-dark/50" size={16} />
          <input
            type="text"
            placeholder={t('search_designer_placeholder', 'Search brand or designer...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-brand-light border border-brand-dark/[0.12] rounded-full pl-10 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm font-normal focus:outline-none focus:border-brand-accent transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-brand-dark/20 border-t-brand-accent rounded-full animate-spin"></div>
          <span className="font-mono text-xs uppercase tracking-widest text-brand-dark/60">
            {t('loading_designers', 'Loading designers catalog...')}
          </span>
        </div>
      ) : filteredDesigners.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-brand-dark/20 rounded-3xl p-8 bg-brand-light">
          <p className="font-serif text-xl sm:text-2xl text-brand-dark mb-1">{t('no_results', 'Nothing found')}</p>
          <p className="text-xs sm:text-sm text-brand-dark/60">{t('try_different_search', 'Try changing your search query')}</p>
        </div>
      ) : (
        <div className="space-y-12 sm:space-y-16">
          {sortedLetters.map(letter => (
            <div key={letter} className="relative">
              <div className="flex items-center gap-4 mb-6 border-b border-brand-dark/[0.08] pb-2">
                <span className="font-serif text-3xl sm:text-4xl font-normal text-brand-accent">
                  {letter}
                </span>
                <span className="font-mono text-xs uppercase tracking-widest text-brand-dark/40">
                  ({groupedDesigners[letter].length} {t('brands_count_suffix', 'brands')})
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {groupedDesigners[letter].map((designer, idx) => (
                  <button 
                    key={designer.id}
                    onClick={() => setSelectedDesigner(designer)}
                    className="rounded-2xl border border-brand-dark/[0.08] bg-brand-light p-6 text-left group flex flex-col h-full hover:border-brand-accent/40 hover:shadow-md transition-all relative shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-brand-dark/60">
                        [{letter}-{String(idx + 1).padStart(2, '0')}]
                      </span>
                      {designer.hasGoldenNeedle && (
                        <span className="text-[9px] font-mono uppercase tracking-wider text-brand-accent font-bold">
                          [GOLDEN NEEDLE]
                        </span>
                      )}
                    </div>
                    
                    <h2 className="font-serif text-lg sm:text-xl font-normal tracking-tight text-brand-dark mb-1 group-hover:text-brand-accent transition-colors break-words">
                      {designer.name}
                    </h2>
                    
                    {designer.founder && (
                      <p className="text-xs sm:text-sm text-brand-dark/65 font-normal tracking-normal line-clamp-1 mb-4 break-words">
                        {designer.founder}
                      </p>
                    )}

                    <div className="mt-auto pt-3 border-t border-brand-dark/[0.06] flex items-center justify-between text-brand-dark/60 text-xs">
                      <span className="font-mono text-[10px] uppercase tracking-wider group-hover:text-brand-accent transition-colors">
                        [VIEW DOSSIER]
                      </span>
                      <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        {designer.socials.instagram && <Instagram size={13} />}
                        {designer.socials.website && <Globe size={13} />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Designer Modal Popup */}
      {selectedDesigner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-300 overscroll-contain">
          <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm" onClick={() => setSelectedDesigner(null)}></div>
          
          <div className="relative bg-brand-light/95 backdrop-blur-xl rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain border border-brand-dark/[0.08] p-6 sm:p-10 md:p-12 shadow-2xl">
            <button 
              onClick={() => setSelectedDesigner(null)}
              className="absolute top-3 sm:top-4 right-3 sm:right-4 z-10 text-brand-dark hover:text-brand-accent transition-colors p-1 cursor-pointer"
            >
              <X size={24} strokeWidth={2} />
            </button>

            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-brand-accent">
                {t('brand_name_label', 'Brand Name')}
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tighter text-brand-dark mb-4 leading-none border-b-2 border-brand-dark pb-3 sm:pb-4 break-words">
              {selectedDesigner.name}
            </h2>
            
            {selectedDesigner.founder && (
              <div className="mb-6">
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-brand-dark/50 block mb-1">
                  {t('designer_founder', 'Designer / Founder')}
                </span>
                <p className="text-brand-dark font-bold text-lg sm:text-2xl uppercase tracking-tight break-words">
                  {selectedDesigner.founder}
                </p>
              </div>
            )}

            {/* If linked to registered user profile */}
            {selectedDesigner.linkedUserId ? (
              <div className="mb-6 p-3 sm:p-4 bg-amber-500/10 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-1">
                    <UserCheck size={14} />
                    {t('official_resident_profile', 'Official Resident Profile')}
                  </div>
                  <div className="font-black text-brand-dark text-sm sm:text-base break-words">
                    {selectedDesigner.linkedUserName || selectedDesigner.founder}
                    {selectedDesigner.linkedUserHandle && (
                      <span className="ml-2 font-mono text-xs font-bold text-brand-dark/60">
                        {selectedDesigner.linkedUserHandle}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  to={`/u/${(selectedDesigner.linkedUserHandle || selectedDesigner.linkedUserId).replace('@', '')}`}
                  className="bg-brand-dark text-brand-light px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-widest hover:bg-brand-accent hover:text-white transition-colors shrink-0 flex items-center gap-1.5 w-full sm:w-auto justify-center"
                >
                  {t('view_profile', 'View Profile')}
                  <ExternalLink size={12} />
                </Link>
              </div>
            ) : (
              /* When designer is not registered or verified in our system yet */
              <div className="mb-6 p-4 sm:p-5 bg-brand-accent/[0.03] border-2 border-brand-accent/30 rounded-none space-y-3.5 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center text-brand-accent shrink-0 mt-0.5">
                    <HeartHandshake size={16} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-brand-accent flex items-center gap-1">
                      <span>[FFAZ COMMUNITY • ПРИГЛАШЕНИЕ]</span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-brand-dark leading-relaxed font-sans">
                      {t(
                        'designer_not_registered_desc',
                        'Этого дизайнера пока нет в нашей системе (он еще не зарегистрировался или не подтвердил свою личность), но вы можете пригласить его в нашу семью FFAZ.'
                      )}
                    </p>
                  </div>
                </div>

                {/* Action buttons to invite */}
                <div className="pt-2 border-t border-brand-dark/10 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyInvite(selectedDesigner)}
                    className="flex-1 bg-brand-dark hover:bg-brand-accent text-white py-2.5 px-3.5 font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Share2 size={13} className="text-amber-300" />
                    <span>Пригласить в семью FFAZ</span>
                  </button>

                  {selectedDesigner.socials.instagram && (
                    <a
                      href={selectedDesigner.socials.instagram.startsWith('http') ? selectedDesigner.socials.instagram : `https://${selectedDesigner.socials.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleInstagramInvite(selectedDesigner)}
                      className="bg-white hover:bg-brand-light text-brand-dark border border-brand-dark py-2.5 px-3.5 font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Instagram size={13} className="text-pink-600" />
                      <span>Написать в Instagram</span>
                    </a>
                  )}
                </div>
              </div>
            )}
            
            <div className="space-y-3 sm:space-y-4 pt-4 border-t border-brand-dark/20">
              {selectedDesigner.socials.instagram && (
                <a 
                  href={selectedDesigner.socials.instagram.startsWith('http') ? selectedDesigner.socials.instagram : `https://${selectedDesigner.socials.instagram}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 sm:gap-4 group"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-dark text-brand-light flex items-center justify-center group-hover:bg-brand-accent transition-colors shrink-0">
                    <Instagram size={18} />
                  </div>
                  <span className="font-bold uppercase tracking-widest text-xs sm:text-sm text-brand-dark group-hover:text-brand-accent transition-colors break-all">Instagram Profile</span>
                </a>
              )}
              {selectedDesigner.socials.website && (
                <a 
                  href={selectedDesigner.socials.website.startsWith('http') ? selectedDesigner.socials.website : `https://${selectedDesigner.socials.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 sm:gap-4 group"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-dark text-brand-light flex items-center justify-center group-hover:bg-brand-accent transition-colors shrink-0">
                    <Globe size={18} />
                  </div>
                  <span className="font-bold uppercase tracking-widest text-xs sm:text-sm text-brand-dark group-hover:text-brand-accent transition-colors break-all">Website</span>
                </a>
              )}

              {/* Direct message button - available for all designers */}
              {(selectedDesigner.linkedUserId || selectedDesigner.id) && (
                <div className="space-y-2">
                  <button 
                    type="button"
                    onClick={() => handleContactDesigner(selectedDesigner)}
                    className="w-full flex items-center justify-center gap-2 border-2 border-brand-dark py-3.5 px-4 font-mono font-bold uppercase tracking-widest text-xs transition-all shadow-2xs cursor-pointer bg-brand-dark text-white hover:bg-brand-accent"
                  >
                    <MessageSquare size={16} />
                    <span>Написать дизайнеру</span>
                    {isPremiumUser && (
                      <Crown size={14} className="text-amber-300 ml-1" />
                    )}
                  </button>
                  {!isPremiumUser && (
                    <div className="flex items-center justify-between text-[11px] text-brand-dark/70 font-mono px-1">
                      <span>Лимит: до 5 новых диалогов/день</span>
                      <Link to="/plans" className="text-brand-accent hover:underline font-bold">
                        FFAZ Pro без лимитов →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={() => setSelectedDesigner(null)}
              className="w-full mt-4 sm:mt-6 bg-brand-dark text-white py-3 sm:py-3.5 font-mono font-bold uppercase tracking-widest text-xs hover:bg-brand-accent transition-colors border border-brand-dark cursor-pointer"
            >
              {t('close', 'Close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
