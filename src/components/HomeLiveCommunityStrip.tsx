import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useTranslation } from 'react-i18next';
import { moderateContent } from '../lib/moderation';
import {
  Radio,
  ChevronLeft,
  ChevronRight,
  Send,
  ArrowRight,
  MessageSquarePlus,
  X,
  Lock
} from 'lucide-react';
import { evaluateDailyQuota } from '../lib/communityLimits';
import GoldenNeedleBadge from './GoldenNeedleBadge';
import ModelVerifiedBadge from './ModelVerifiedBadge';
import AgencyBadge from './AgencyBadge';

interface LiveMessageItem {
  id: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  userHandle?: string;
  channel?: string;
  text: string;
  createdAt: any;
  badge?: string;
  isDesigner?: boolean;
  hasGoldenNeedle?: boolean;
  hasModelBadge?: boolean;
  hasAgencyBadge?: boolean;
}

export default function HomeLiveCommunityStrip() {
  const { t } = useTranslation();
  const { currentUser, dbUser, isAdmin } = useAuth();
  const ui = useUI();
  const navigate = useNavigate();

  const [liveMessages, setLiveMessages] = useState<LiveMessageItem[]>([]);
  const [rotationIndex, setRotationIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [cycleTick, setCycleTick] = useState(0);
  const [newestMsgId, setNewestMsgId] = useState<string | null>(null);
  const [quickPostOpen, setQuickPostOpen] = useState(false);
  const [quickPostText, setQuickPostText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(true);

  // Real-time listener for current user's live messages to evaluate daily quota
  const [userLiveMessages, setUserLiveMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) {
      setUserLiveMessages([]);
      return;
    }
    const q = query(
      collection(db, 'feedLiveMessages'),
      where('userId', '==', currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setUserLiveMessages(msgs);
    }, (err) => {
      console.warn('Home live messages user listener notice:', err);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Live ticker updating countdown and automatically unlocking when 24 hours have elapsed
  const [dayTick, setDayTick] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setDayTick(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Quota evaluation: Free (1), Pro (5), Elite (Infinity), Admin (Unlimited)
  // Resets 24 hours from the exact moment of post publication
  const quota = useMemo(() => {
    return evaluateDailyQuota(dbUser, currentUser?.uid, userLiveMessages, dayTick);
  }, [dbUser, currentUser?.uid, userLiveMessages, dayTick]);

  // Subscribe to real-time feedLiveMessages with channel == 'public'
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const processDocs = (docs: any[]) => {
      const msgs = docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId || '',
          userName: data.userName || 'Fashionista',
          userAvatar: data.userAvatar || '',
          userHandle: data.userHandle || (data.userName ? `@${data.userName.toLowerCase().replace(/\s+/g, '')}` : '@live_member'),
          channel: data.channel || 'public',
          text: data.text || '',
          createdAt: data.createdAt,
          badge: data.badge || '',
          isDesigner: Boolean(data.isDesigner),
          hasGoldenNeedle: Boolean(data.badge?.includes('Golden Needle') || data.hasGoldenNeedle),
          hasModelBadge: Boolean(data.hasModelBadge || data.badge?.includes('Model')),
          hasAgencyBadge: Boolean(data.hasAgencyBadge || data.badge?.includes('Agency'))
        } as LiveMessageItem;
      });

      if (!isFirstLoadRef.current && msgs.length > 0) {
        const topId = msgs[0]?.id;
        if (topId) {
          setNewestMsgId(topId);
          setTimeout(() => setNewestMsgId(null), 4000);
        }
      }
      isFirstLoadRef.current = false;
      setLiveMessages(msgs);
    };

    // Primary query with channel == 'public' & ordered by createdAt desc
    const primaryQ = query(
      collection(db, 'feedLiveMessages'),
      where('channel', '==', 'public'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );

    unsubscribe = onSnapshot(
      primaryQ,
      (snapshot) => {
        processDocs(snapshot.docs);
      },
      (error) => {
        console.warn('Real-time primary live stream notice, activating resilient query:', error);
        // Fallback query if composite index is pending: filter by channel == 'public' and sort client-side
        const fallbackQ = query(
          collection(db, 'feedLiveMessages'),
          where('channel', '==', 'public'),
          limit(30)
        );
        unsubscribe = onSnapshot(
          fallbackQ,
          (fallbackSnap) => {
            const sortedDocs = [...fallbackSnap.docs].sort((a, b) => {
              const aVal = a.data().createdAt;
              const bVal = b.data().createdAt;
              const aTime = aVal?.toMillis ? aVal.toMillis() : (aVal?.seconds ? aVal.seconds * 1000 : Number(aVal) || 0);
              const bTime = bVal?.toMillis ? bVal.toMillis() : (bVal?.seconds ? bVal.seconds * 1000 : Number(bVal) || 0);
              return bTime - aTime;
            });
            processDocs(sortedDocs);
          },
          (err2) => {
            console.warn('Fallback live stream notice:', err2);
          }
        );
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Display ONLY real records from that section without any extra or mock entries
  const displayItems: LiveMessageItem[] = useMemo(() => {
    if (liveMessages.length <= 1) {
      return liveMessages;
    }
    const offset = rotationIndex % liveMessages.length;
    return [...liveMessages.slice(offset), ...liveMessages.slice(0, offset)];
  }, [liveMessages, rotationIndex]);

  // Auto-change records every 5 seconds
  useEffect(() => {
    if (liveMessages.length <= 1 || isPaused || quickPostOpen) return;

    const timer = setInterval(() => {
      setRotationIndex((prev) => (prev + 1) % liveMessages.length);
      setCycleTick((prev) => prev + 1);
    }, 5000);

    return () => clearInterval(timer);
  }, [liveMessages.length, isPaused, quickPostOpen]);

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (liveMessages.length <= 1) return;
    setRotationIndex((prev) => (prev - 1 + liveMessages.length) % liveMessages.length);
    setCycleTick((prev) => prev + 1);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (liveMessages.length <= 1) return;
    setRotationIndex((prev) => (prev + 1) % liveMessages.length);
    setCycleTick((prev) => prev + 1);
  };

  const handleQuickPostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      ui.alert(t('login_required_chat', 'Please sign in to publish to Fashion Community Live.'));
      navigate('/login');
      return;
    }

    const textToSend = quickPostText.trim();
    if (!textToSend) return;

    if (textToSend.length > 500) {
      ui.alert(t('chat_msg_too_long', 'Message is too long (Max 500 characters)'));
      return;
    }

    // Daily quota enforcement: Free (1), Pro (5), Elite (Infinity), Admin (Unlimited) - 24 hours from publication moment
    if (!isAdmin && quota.isLimitReached) {
      ui.alert(
        `Лимит сообщений в Fashion Community Live исчерпан (${quota.sentCount}/${quota.limit} на тарифе ${quota.tierName}). Таймер действует 24 часа с момента публикации: следующее сообщение станет доступно ${quota.resetAtFormatted} (${quota.timeUntilResetLabel}). Для неограниченного общения перейдите на FFAZ Elite VIP.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const moderation = await moderateContent(textToSend);
      if (!moderation.isAllowed) {
        ui.alert(t('chat_moderation_error', "Your message couldn't be sent: ") + moderation.reason);
        setIsSubmitting(false);
        return;
      }

      let badge = '';
      if (dbUser?.role === 'superadmin' || dbUser?.role === 'admin' || isAdmin) badge = 'Admin';
      else if (dbUser?.hasGoldenNeedle) badge = 'Golden Needle';
      else if (dbUser?.brandName) badge = `Brand: ${dbUser.brandName}`;
      else if (dbUser?.subscriptionTier === 'pro' || dbUser?.subscriptionTier === 'business') badge = 'Pro';
      else if (dbUser?.hasModelBadge) badge = 'Verified Model';
      else if (dbUser?.hasAgencyBadge || dbUser?.isAgency) badge = 'Agency';

      await addDoc(collection(db, 'feedLiveMessages'), {
        userId: currentUser.uid,
        userName: dbUser?.name || currentUser.displayName || 'Fashionista',
        userAvatar: dbUser?.avatarUrl || currentUser.photoURL || '',
        channel: 'public',
        text: textToSend,
        createdAt: serverTimestamp(),
        badge: badge,
        isDesigner: Boolean(dbUser?.isDesigner || dbUser?.designerId)
      });

      setQuickPostText('');
      setQuickPostOpen(false);
      setRotationIndex(0);
      setCycleTick((prev) => prev + 1);
      scrollContainerRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Failed to post to live community:', err);
      ui.alert(t('failed_send_chat', 'Failed to publish live note. Please check permissions.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRelativeTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    let millis = 0;
    if (typeof timestamp === 'number') millis = timestamp;
    else if (timestamp?.toMillis) millis = timestamp.toMillis();
    else if (timestamp?.seconds) millis = timestamp.seconds * 1000;
    else if (timestamp instanceof Date) millis = timestamp.getTime();

    if (!millis) return 'Just now';
    const diff = Math.max(0, Date.now() - millis);
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const currentActiveIndex = liveMessages.length > 0 ? (rotationIndex % liveMessages.length) + 1 : 0;

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-8 py-3.5 sm:py-4">
      {/* Top Banner Row: Header + Live Indicator + Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 border-b border-brand-dark/[0.06] pb-3">
        {/* Live Channel Brand Tag */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-accent/5 border border-brand-accent/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-accent"></span>
            </span>
            <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-brand-accent">
              COMMUNITY LIVE
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-brand-dark/50 uppercase tracking-wider">
            <span>●</span>
            <span>Real-time Dispatches</span>
          </div>

          {/* 5-second Auto-Cycle Pill with animated progress ticker */}
          {liveMessages.length > 1 && (
            <div 
              className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white border border-brand-dark/15 text-[10px] font-mono uppercase tracking-wider text-brand-dark select-none shadow-2xs"
              title={isPaused ? "Auto-cycle paused while hovering" : "Auto-changes every 5 seconds"}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
              <span>5s Cycle</span>
              <span className="text-brand-dark/35 font-bold">•</span>
              <span>{currentActiveIndex} / {liveMessages.length}</span>
              <div className="w-12 h-1 bg-brand-dark/15 rounded-full overflow-hidden ml-0.5">
                <motion.div
                  key={cycleTick}
                  initial={{ width: '0%' }}
                  animate={{ width: isPaused ? '0%' : '100%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                  className="h-full bg-brand-accent rounded-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions & Carousel Navigation */}
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
          {/* Quick Write Toggle Button */}
          <button
            onClick={() => setQuickPostOpen(!quickPostOpen)}
            className={`px-3 py-1.5 rounded-full border text-[11px] font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-2xs ${
              quickPostOpen
                ? 'bg-brand-dark text-white border-brand-dark'
                : 'bg-brand-light hover:bg-brand-accent hover:text-white border-brand-dark/15 text-brand-dark'
            }`}
          >
            {quickPostOpen ? (
              <>
                <X size={12} />
                <span>Close</span>
              </>
            ) : (
              <>
                <MessageSquarePlus size={12} className="text-brand-accent" />
                <span>+ Live Note</span>
              </>
            )}
          </button>

          {/* Full Live Chat Link to /feed */}
          <Link
            to="/feed"
            className="px-3 py-1.5 rounded-full border border-brand-dark/15 bg-white text-brand-dark hover:border-brand-accent hover:text-brand-accent text-[11px] font-mono uppercase tracking-wider flex items-center gap-1 transition-colors shadow-2xs shrink-0"
          >
            <span>Open Chat</span>
            <ArrowRight size={11} />
          </Link>

          {/* Manual Carousel Next / Prev Controls */}
          {liveMessages.length > 1 && (
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={handlePrev}
                className="w-7 h-7 rounded-full border border-brand-dark/15 bg-white hover:bg-brand-dark hover:text-white text-brand-dark flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                aria-label="Previous dispatch"
                title="Previous record"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={handleNext}
                className="w-7 h-7 rounded-full border border-brand-dark/15 bg-white hover:bg-brand-dark hover:text-white text-brand-dark flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                aria-label="Next dispatch"
                title="Next record"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Composer Drawer / Expander */}
      <AnimatePresence>
        {quickPostOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden mb-3.5"
          >
            {!isAdmin && quota.isLimitReached ? (
              <div className="p-4 rounded-2xl border border-brand-accent/30 bg-brand-card shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                    <Lock size={15} />
                  </div>
                  <div>
                    <div className="font-semibold text-brand-dark flex items-center gap-2">
                      <span>Лимит сообщений исчерпан</span>
                      <span className="text-[10px] font-mono bg-brand-dark/10 px-2 py-0.5 rounded-full font-bold">
                        {quota.sentCount}/{quota.limit}
                      </span>
                    </div>
                    <p className="text-brand-dark/65 text-[11px] mt-0.5">
                      Таймер длится 24 часа с момента публикации. Следующее сообщение станет доступно <strong className="text-brand-dark font-semibold">{quota.resetAtFormatted}</strong> ({quota.timeUntilResetLabel}).
                    </p>
                  </div>
                </div>
                <Link
                  to="/plans"
                  className="bg-brand-accent text-white px-4 py-2 rounded-full font-semibold uppercase tracking-wider text-[11px] hover:bg-brand-dark transition-colors shrink-0 shadow-2xs"
                >
                  {t('daily_limit_upgrade_btn', 'Повысить тариф →')}
                </Link>
              </div>
            ) : (
              <form
                onSubmit={handleQuickPostSubmit}
                className="p-3.5 sm:p-4 rounded-2xl border border-brand-accent/30 bg-brand-card shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
              >
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-8 h-8 rounded-full border border-brand-dark/20 overflow-hidden bg-brand-muted shrink-0 flex items-center justify-center">
                    {currentUser?.photoURL || dbUser?.avatarUrl ? (
                      <img
                        src={currentUser?.photoURL || dbUser?.avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <span className="font-serif text-xs uppercase font-bold text-brand-dark">
                        {currentUser?.email ? currentUser.email[0].toUpperCase() : '✦'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] uppercase font-bold text-brand-dark/70 tracking-wider">
                      Post to Live Feed:
                    </span>
                    <span className="font-mono text-[9px] text-brand-dark/50">
                      {quota.isAdmin
                        ? t('daily_limit_admin', 'Безлимитно (Admin)')
                        : `${quota.sentCount}/${quota.limit} (${quota.tierName})`}
                    </span>
                  </div>
                </div>

                <input
                  type="text"
                  value={quickPostText}
                  onChange={(e) => setQuickPostText(e.target.value)}
                  placeholder="Share a backstage note, lookbook drop, or thought..."
                  maxLength={500}
                  className="flex-1 bg-white border border-brand-dark/15 rounded-full px-4 py-2 text-xs font-sans text-brand-dark placeholder:text-brand-dark/40 focus:outline-none focus:border-brand-accent shadow-2xs transition-colors"
                  disabled={isSubmitting}
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={isSubmitting || !quickPostText.trim()}
                  className="brand-button px-5 py-2 text-xs font-mono tracking-wider uppercase flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={12} />
                      <span>Send Live</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* The Smoothly Updating Live Strip Stream (Targeted Container) */}
      <div
        ref={scrollContainerRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="flex items-stretch gap-3 overflow-x-auto no-scrollbar py-1 scroll-smooth select-none min-h-[142px]"
      >
        {displayItems.length === 0 ? (
          <div className="w-full py-8 px-6 rounded-2xl border border-dashed border-brand-dark/15 bg-white/60 dark:bg-stone-900/60 backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shrink-0">
                <Radio size={16} className="animate-pulse" />
              </div>
              <div>
                <div className="font-display font-bold text-xs uppercase tracking-wider text-brand-dark">
                  {t('no_live_dispatches_yet', 'No Live Dispatches in Stream Yet')}
                </div>
                <p className="font-sans text-xs text-brand-dark/60 mt-0.5">
                  {t('no_live_dispatches_desc', 'Messages published in the Fashion Community Live section appear here in real time.')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuickPostOpen(true)}
                className="brand-button px-4 py-2 text-xs font-mono uppercase tracking-wider shrink-0"
              >
                + {t('post_first_note', 'Publish First Note')}
              </button>
              <Link
                to="/feed"
                className="brand-button-outline px-4 py-2 text-xs font-mono uppercase tracking-wider shrink-0"
              >
                {t('open_community_chat', 'Open Chat')}
              </Link>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {displayItems.map((msg, index) => {
              const isLead = index === 0 && displayItems.length > 1;
              const isHighlight = msg.id === newestMsgId;
              return (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0, scale: 0.94, x: 25 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.92, x: -35 }}
                  transition={{
                    type: 'spring',
                    stiffness: 380,
                    damping: 32,
                    mass: 0.85
                  }}
                  className={`relative shrink-0 w-[290px] sm:w-[340px] md:w-[380px] p-3 sm:p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 shadow-2xs group cursor-pointer ${
                    isHighlight
                      ? 'border-brand-accent bg-brand-accent/5 shadow-[0_4px_20px_rgba(128,29,43,0.15)] ring-1 ring-brand-accent/40'
                      : isLead
                      ? 'border-brand-accent/60 bg-white dark:bg-stone-900 shadow-sm ring-1 ring-brand-accent/20'
                      : 'border-brand-dark/[0.08] bg-white/90 dark:bg-stone-900/90 hover:border-brand-accent/40 hover:shadow-xs'
                  }`}
                  onClick={() => navigate('/feed')}
                >
                  {/* Header: Author + Badges + Time */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-brand-accent via-amber-600 to-brand-dark shrink-0">
                        <div className="w-8 h-8 rounded-full border border-white overflow-hidden bg-brand-dark flex items-center justify-center text-white font-serif text-[11px]">
                          {msg.userAvatar ? (
                            <img
                              src={msg.userAvatar}
                              alt={msg.userName || 'Author'}
                              className="w-full h-full object-cover"
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <span>{(msg.userName || 'FF')[0].toUpperCase()}</span>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 flex flex-col">
                        <div className="flex items-center gap-1 truncate">
                          <span className="font-display font-bold text-xs text-brand-dark truncate group-hover:text-brand-accent transition-colors">
                            {msg.userName || 'Member'}
                          </span>
                          {msg.hasGoldenNeedle && <GoldenNeedleBadge size="sm" />}
                          {msg.hasModelBadge && <ModelVerifiedBadge size="sm" />}
                          {msg.hasAgencyBadge && <AgencyBadge size="sm" />}
                        </div>
                        <span className="font-mono text-[9px] text-brand-dark/50 truncate">
                          {msg.userHandle || `@${(msg.userName || 'user').toLowerCase().replace(/\s+/g, '')}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isHighlight ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-brand-accent text-white font-mono text-[8px] font-bold uppercase tracking-widest animate-pulse">
                          NEW
                        </span>
                      ) : isLead ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-brand-accent/10 border border-brand-accent/25 text-brand-accent font-mono text-[8px] font-bold uppercase tracking-widest">
                          ACTIVE
                        </span>
                      ) : null}
                      <span className="font-mono text-[9px] text-brand-dark/45 whitespace-nowrap">
                        {formatRelativeTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Message Body */}
                  <p className="text-xs sm:text-[13px] font-sans text-brand-dark/85 line-clamp-2 leading-relaxed break-words font-normal">
                    {msg.text}
                  </p>

                  {/* Card Footer: Tag & Reply Action */}
                  <div className="flex items-center justify-between pt-1 border-t border-brand-dark/[0.05] text-[10px] font-mono">
                    {msg.badge ? (
                      <span className="text-brand-accent font-semibold tracking-wider uppercase truncate max-w-[170px]">
                        {msg.badge}
                      </span>
                    ) : (
                      <span className="text-brand-dark/40 tracking-wider uppercase">
                        Live Chat
                      </span>
                    )}

                    <span className="text-brand-dark/50 group-hover:text-brand-accent flex items-center gap-1 transition-colors uppercase tracking-wider font-semibold">
                      <span>Reply</span>
                      <ArrowRight size={10} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

