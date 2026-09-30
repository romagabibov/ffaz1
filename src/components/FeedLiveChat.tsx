import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useTranslation } from 'react-i18next';
import { moderateContent } from '../lib/moderation';
import { getTimestampMillis } from '../lib/dateUtils';
import { 
  Send, 
  Trash2, 
  Lock, 
  Sparkles, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Flame, 
  Crown, 
  Radio,
  Calendar,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router';
import { evaluateDailyQuota } from '../lib/communityLimits';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import VoiceMessageRecorder, { RecordedVoiceData } from './VoiceMessageRecorder';

interface FeedLiveChatProps {
  channel: 'public' | 'pro';
  isOpen: boolean;
  onToggle: () => void;
  hasProAccess: boolean;
  onUpgradeClick: () => void;
}

interface LiveMessage {
  id: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  channel: 'public' | 'pro';
  text: string;
  audioUrl?: string;
  audioDuration?: number;
  waveform?: number[];
  createdAt: any;
  badge?: string;
  isDesigner?: boolean;
}

export default function FeedLiveChat({
  channel,
  isOpen,
  onToggle,
  hasProAccess,
  onUpgradeClick
}: FeedLiveChatProps) {
  const { currentUser, dbUser, isAdmin } = useAuth();
  const ui = useUI();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isLocked = channel === 'pro' && !hasProAccess && !isAdmin;

  const quickTopics = channel === 'pro' 
    ? ['🧵 Fabric Sourcing', '🤝 Collab Opportunity', '📸 Casting / Lookbook', '💡 Buyer Insight', '✨ Runway Backstage']
    : ['🔥 What are you wearing?', '📍 Baku Fashion Spots', '✨ New Drop Thoughts', '👋 Introduce Yourself', '💬 Ask Stylist'];

  useEffect(() => {
    if (isLocked) return;

    const q = query(
      collection(db, 'feedLiveMessages'),
      where('channel', '==', channel),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as LiveMessage[];
      // Reverse to chronological order for chat view
      msgs.reverse();
      setMessages(msgs);
    }, (err) => {
      console.warn('Live chat subscription error:', err);
    });

    return () => unsubscribe();
  }, [channel, isLocked]);

  // Real-time listener for current user's live messages to track daily quota
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
      console.warn('User live messages listener notice:', err);
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

  // Daily Quota status based on tier: Free (1), Pro (5), Elite (Infinity), Admin (Unlimited)
  // Resets 24 hours from the exact moment of post publication
  const quota = useMemo(() => {
    return evaluateDailyQuota(dbUser, currentUser?.uid, userLiveMessages, dayTick);
  }, [dbUser, currentUser?.uid, userLiveMessages, dayTick]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || inputText).trim();

    if (!currentUser) {
      ui.alert(t('login_required_chat', 'Please log in to participate in the live chat.'));
      return;
    }

    if (isLocked) {
      onUpgradeClick();
      return;
    }

    // Check message limit based on 24 hours from publication moment
    if (!isAdmin && quota.isLimitReached) {
      ui.alert(
        `Лимит сообщений в Fashion Community Live исчерпан (${quota.sentCount}/${quota.limit} на тарифе ${quota.tierName}). Таймер действует 24 часа с момента публикации: следующее сообщение станет доступно ${quota.resetAtFormatted} (${quota.timeUntilResetLabel}). Для неограниченного общения перейдите на FFAZ Elite VIP.`
      );
      return;
    }

    if (!textToSend) return;

    if (textToSend.length > 500) {
      ui.alert(t('chat_msg_too_long', 'Message is too long (Max 500 characters)'));
      return;
    }

    setIsSending(true);
    try {
      // Content Moderation check
      const moderation = await moderateContent(textToSend);
      if (!moderation.isAllowed) {
        ui.alert(t('chat_moderation_error', "Your message couldn't be sent: ") + moderation.reason);
        setIsSending(false);
        return;
      }

      let badge = '';
      if (dbUser?.role === 'superadmin' || dbUser?.role === 'admin') badge = 'Admin';
      else if (dbUser?.hasGoldenNeedle) badge = 'Golden Needle';
      else if (dbUser?.brandName) badge = `Brand: ${dbUser.brandName}`;
      else if (dbUser?.subscriptionTier === 'elite' || dbUser?.subscriptionTier === 'vip') badge = 'Elite VIP';
      else if (dbUser?.subscriptionTier === 'pro' || dbUser?.subscriptionTier === 'creator' || dbUser?.subscriptionTier === 'business') badge = 'Pro';

      await addDoc(collection(db, 'feedLiveMessages'), {
        userId: currentUser.uid,
        userName: dbUser?.name || currentUser.displayName || 'Fashionista',
        userAvatar: dbUser?.avatarUrl || currentUser.photoURL || '',
        channel: channel,
        text: textToSend,
        createdAt: serverTimestamp(),
        badge: badge,
        isDesigner: Boolean(dbUser?.isDesigner || dbUser?.designerId)
      });

      if (!customText) {
        setInputText('');
      }
    } catch (err: any) {
      console.error('Failed to send live message:', err);
      ui.alert(t('failed_send_chat', 'Failed to send message. Please check permissions.'));
    } finally {
      setIsSending(false);
    }
  };

  const handleSendVoice = async (voiceData: RecordedVoiceData) => {
    if (!currentUser) {
      ui.alert(t('login_required_chat', 'Please log in to participate in the live chat.'));
      return;
    }

    if (isLocked) {
      onUpgradeClick();
      return;
    }

    // Check daily message limit based on subscription tier
    if (!isAdmin && quota.isLimitReached) {
      ui.alert(
        t(
          'daily_limit_reached_desc',
          `На тарифе ${quota.tierName} доступно ${quota.limit} сообщ. в день. Чтобы отправлять больше, перейдите на Pro (5 в день) или Elite (без ограничений).`,
          { tier: quota.tierName, limit: quota.limit }
        )
      );
      return;
    }

    setIsSending(true);
    try {
      let badge = '';
      if (dbUser?.role === 'superadmin' || dbUser?.role === 'admin') badge = 'Admin';
      else if (dbUser?.hasGoldenNeedle) badge = 'Golden Needle';
      else if (dbUser?.brandName) badge = `Brand: ${dbUser.brandName}`;
      else if (dbUser?.subscriptionTier === 'elite' || dbUser?.subscriptionTier === 'vip') badge = 'Elite VIP';
      else if (dbUser?.subscriptionTier === 'pro' || dbUser?.subscriptionTier === 'creator' || dbUser?.subscriptionTier === 'business') badge = 'Pro';

      await addDoc(collection(db, 'feedLiveMessages'), {
        userId: currentUser.uid,
        userName: dbUser?.name || currentUser.displayName || 'Fashionista',
        userAvatar: dbUser?.avatarUrl || currentUser.photoURL || '',
        channel: channel,
        text: '',
        audioUrl: voiceData.audioUrl,
        audioDuration: voiceData.audioDuration,
        waveform: voiceData.waveform,
        createdAt: serverTimestamp(),
        badge: badge,
        isDesigner: Boolean(dbUser?.isDesigner || dbUser?.designerId)
      });
    } catch (err: any) {
      console.error('Failed to send voice live message:', err);
      ui.alert(t('failed_send_chat', 'Failed to send message. Please check permissions.'));
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (msg: LiveMessage) => {
    const isMe = currentUser?.uid === msg.userId;
    const msgCreatedAtMillis = getTimestampMillis(msg.createdAt);
    const now = Date.now();
    const ageHours = msgMillis(msgCreatedAtMillis) > 0 ? (now - msgCreatedAtMillis) / (1000 * 60 * 60) : 0;

    // Rule: Cannot delete message within 24 hours unless admin
    if (isMe && !isAdmin) {
      if (msgCreatedAtMillis > 0 && ageHours < 24) {
        const remainingHours = Math.ceil(24 - ageHours);
        ui.alert(t('chat_msg_delete_locked_24h', `In this room, messages are locked and cannot be deleted for 24 hours. (${remainingHours}h remaining)`));
        return;
      }
    }

    if (!await ui.confirm(t('confirm_delete_chat_msg', 'Delete this message?'))) return;

    try {
      await deleteDoc(doc(db, 'feedLiveMessages', msg.id));
    } catch (err) {
      console.error('Failed to delete live message:', err);
      ui.alert(t('failed_delete_chat_msg', 'Failed to delete message.'));
    }
  };

  function msgMillis(val: any) {
    return getTimestampMillis(val);
  }

  return (
    <div className="mb-8 rounded-3xl border border-brand-dark/[0.08] bg-brand-card overflow-hidden shadow-xs transition-all">
      {/* Header Bar */}
      <div 
        onClick={onToggle}
        className={`px-5 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between cursor-pointer select-none transition-colors ${
          channel === 'pro'
            ? 'bg-[#181313] text-white hover:bg-[#201919]'
            : 'bg-brand-card text-brand-dark hover:bg-brand-muted/40'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75"></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${channel === 'pro' ? 'bg-amber-400' : 'bg-brand-accent'}`}></span>
          </span>
          <div className="min-w-0">
            <div className="font-display font-semibold text-sm sm:text-base flex items-center gap-2 truncate">
              {channel === 'pro' ? (
                <>
                  <Crown size={15} className="text-amber-400 shrink-0" />
                  <span>VIP Lounge Live Room</span>
                  <span className="text-[10px] bg-brand-accent text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">PRO</span>
                </>
              ) : (
                <>
                  <Radio size={15} className="text-brand-accent shrink-0" />
                  <span>Fashion Community Live</span>
                  <span className="text-[10px] bg-brand-dark/10 text-brand-dark px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">LIVE</span>
                </>
              )}
            </div>
            <p className="text-xs text-brand-dark/60 truncate mt-0.5 font-normal">
              {channel === 'pro'
                ? 'Backstage dialogue, couture previews & designer network'
                : 'Real-time conversation with stylists, models & creators'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-[11px] font-medium text-brand-dark/60 bg-brand-dark/[0.04] px-2.5 py-1 rounded-full hidden sm:inline-block">
            {messages.length} {t('live_msgs', 'messages')}
          </span>
          <div className="w-8 h-8 rounded-full bg-brand-dark/[0.04] flex items-center justify-center text-brand-dark/70 hover:text-brand-dark transition-colors">
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </div>

      {/* Accordion Chat Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-brand-dark/[0.08] bg-brand-light/50"
          >
            {isLocked ? (
              <div className="p-8 sm:p-10 text-center bg-gradient-to-br from-[#181313] via-[#201818] to-brand-dark text-white flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center mb-4 text-amber-400">
                  <Lock size={22} />
                </div>
                <h3 className="text-lg sm:text-xl font-display font-semibold tracking-tight text-white mb-2">
                  {t('pro_live_chat_locked_title', 'Pro & Designers Live Chat Restricted')}
                </h3>
                <p className="text-xs sm:text-sm max-w-md text-white/75 mb-6 leading-relaxed">
                  {t('pro_live_chat_locked_desc', 'Join the private live communication channel for verified resident designers, stylists, and FFAZ Pro members to discuss backstage topics, casting, and direct collaboration.')}
                </p>
                <button
                  onClick={onUpgradeClick}
                  className="bg-brand-accent text-white hover:bg-white hover:text-brand-dark rounded-full font-medium text-xs sm:text-sm uppercase tracking-wider px-6 py-3 transition-all shadow-sm"
                >
                  {t('unlock_pro_access', 'Unlock Pro Access — 25 AZN/mo')}
                </button>
              </div>
            ) : (
              <div>
                {/* Quick Topic Prompts */}
                <div className="px-4 py-2.5 bg-brand-muted/30 border-b border-brand-dark/[0.06] flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <span className="text-[11px] font-semibold text-brand-dark/50 shrink-0 flex items-center gap-1.5 uppercase tracking-wider">
                    <Flame size={12} className="text-brand-accent" /> {t('quick_topics', 'Topics')}:
                  </span>
                  {quickTopics.map((topic, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(undefined, topic)}
                      disabled={isSending}
                      className="text-xs font-medium bg-brand-card text-brand-dark border border-brand-dark/[0.08] px-3 py-1 rounded-full whitespace-nowrap hover:border-brand-accent hover:text-brand-accent transition-all shrink-0 shadow-2xs"
                    >
                      {topic}
                    </button>
                  ))}
                </div>

                {/* Messages Box */}
                <div className="p-4 sm:p-5 max-h-[340px] sm:max-h-[380px] overflow-y-auto space-y-3">
                  {messages.length === 0 ? (
                    <div className="py-10 text-center text-xs text-brand-dark/50">
                      {t('no_live_msgs_yet', 'No live messages yet. Say hello and start the conversation!')}
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const isMe = currentUser?.uid === msg.userId;
                      const msgCreatedAtMillis = msgMillis(msg.createdAt);
                      const now = Date.now();
                      const ageHours = msgCreatedAtMillis > 0 ? (now - msgCreatedAtMillis) / (1000 * 60 * 60) : 0;
                      const isLockedFromDeletion = isMe && !isAdmin && ageHours < 24;

                      const getDayKey = (time: number) => {
                        if (!time) return '';
                        const d = new Date(time);
                        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
                      };
                      const currDay = getDayKey(msgCreatedAtMillis);
                      const prevDay = index > 0 ? getDayKey(msgMillis(messages[index - 1].createdAt)) : '';
                      const showDateDivider = currDay && currDay !== prevDay;

                      const getDayLabel = (time: number) => {
                        if (!time) return '';
                        const date = new Date(time);
                        const today = new Date();
                        if (date.toDateString() === today.toDateString()) return t('today', 'Today');
                        const yesterday = new Date();
                        yesterday.setDate(today.getDate() - 1);
                        if (date.toDateString() === yesterday.toDateString()) return t('yesterday', 'Yesterday');
                        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                      };

                      return (
                        <React.Fragment key={msg.id}>
                          {showDateDivider && (
                            <div className="sticky top-1 z-10 select-none flex justify-center my-2 pointer-events-none">
                              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-brand-card/95 backdrop-blur-md text-brand-dark/75 border border-brand-dark/10 shadow-2xs pointer-events-auto">
                                <Calendar size={10} className="text-brand-accent/70" />
                                <span>{getDayLabel(msgCreatedAtMillis)}</span>
                              </span>
                            </div>
                          )}
                          <div
                            className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
                          >
                          <div className="w-8 h-8 rounded-full border border-brand-dark/10 overflow-hidden bg-brand-muted shrink-0 flex items-center justify-center text-xs font-semibold text-brand-dark shadow-2xs">
                            {msg.userAvatar ? (
                              <img src={msg.userAvatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              msg.userName?.charAt(0) || '?'
                            )}
                          </div>

                          <div className={`max-w-[85%] sm:max-w-[75%] ${isMe ? 'items-end text-right' : 'items-start text-left'}`}>
                            <div className="flex items-center gap-1.5 mb-1 text-[11px] text-brand-dark/60">
                              <span className="font-semibold text-brand-dark truncate max-w-[120px]">
                                {msg.userName}
                              </span>
                              {msg.badge && (
                                <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-semibold ${
                                  msg.badge.includes('Brand')
                                    ? 'bg-brand-dark text-white'
                                    : msg.badge === 'Golden Needle'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20'
                                }`}>
                                  {msg.badge}
                                </span>
                              )}
                              <span>•</span>
                              <span>
                                {msg.createdAt?.toDate 
                                  ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : 'just now'}
                              </span>
                              {isLockedFromDeletion && (
                                <span 
                                  className="inline-flex items-center gap-0.5 text-[9px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md ml-1"
                                  title={`Protected for 24h (${Math.ceil(24 - ageHours)}h remaining)`}
                                >
                                  <Lock size={9} />
                                  <span>24h lock</span>
                                </span>
                              )}
                              {(isMe || isAdmin) && !isLockedFromDeletion && (
                                <button
                                  onClick={() => handleDeleteMessage(msg)}
                                  className="text-brand-dark/40 hover:text-red-500 transition-colors ml-1"
                                  title="Delete message"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>

                            <div className={`p-3 rounded-2xl text-xs sm:text-sm font-normal leading-relaxed break-words shadow-2xs border ${
                              isMe 
                                ? 'bg-brand-dark text-white rounded-tr-xs border-brand-dark' 
                                : 'bg-brand-card text-brand-dark rounded-tl-xs border-brand-dark/[0.08]'
                            }`}>
                              {/* Voice Message Player */}
                              {msg.audioUrl && (
                                <div className="my-1">
                                  <VoiceMessagePlayer
                                    audioUrl={msg.audioUrl}
                                    duration={msg.audioDuration}
                                    waveform={msg.waveform}
                                    isMe={isMe}
                                    theme="bubble"
                                  />
                                </div>
                              )}
                              {msg.text && <div>{msg.text}</div>}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Daily Quota Status Bar */}
                {currentUser && (
                  <div className="flex items-center justify-between text-[11px] font-mono px-4 py-2 bg-brand-muted/30 border-t border-brand-dark/[0.06] text-brand-dark/70">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${quota.isAdmin ? 'bg-amber-500' : quota.isLimitReached ? 'bg-red-500' : 'bg-emerald-500'}`} />
                      <span>
                        {quota.isAdmin
                          ? t('daily_limit_admin', 'Безлимитно (Admin)')
                          : t('daily_limit_badge', 'Дневной лимит: {{sent}}/{{limit}} сообщений', {
                              sent: quota.sentCount,
                              limit: quota.limit
                            })}
                      </span>
                      <span className="text-brand-dark/30">•</span>
                      <span className="text-brand-dark/60 font-semibold">{quota.tierName}</span>
                    </div>

                    {!quota.isAdmin && (
                      quota.isLimitReached ? (
                        <div className="flex items-center gap-2">
                          <span className="text-brand-dark/70 text-[10px] font-mono">
                            Доступно: {quota.resetAtFormatted} ({quota.timeUntilResetLabel})
                          </span>
                          <Link
                            to="/plans"
                            className="text-brand-accent font-semibold hover:underline flex items-center gap-1"
                          >
                            <span>{t('daily_limit_upgrade_btn', 'Повысить тариф →')}</span>
                          </Link>
                        </div>
                      ) : (
                        <span className="text-brand-dark/60 font-mono text-[10px]">
                          {t('daily_limit_remaining', 'Осталось: {{remaining}} из {{limit}}', {
                            remaining: quota.remainingCount,
                            limit: quota.limit
                          })}
                          {quota.resetAtFormatted && (
                            <span className="ml-1 text-brand-dark/45">• сброс {quota.resetAtFormatted}</span>
                          )}
                        </span>
                      )
                    )}
                  </div>
                )}

                {/* Input Bar or Limit Reached Notice */}
                {currentUser ? (
                  !isAdmin && quota.isLimitReached ? (
                    <div className="p-4 bg-brand-muted/30 border-t border-brand-dark/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                          <Lock size={16} />
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
                    <form onSubmit={handleSendMessage} className="p-3 bg-brand-card border-t border-brand-dark/[0.08] flex items-center gap-2">
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={
                          channel === 'pro'
                            ? t('pro_chat_placeholder', 'Share backstage insight, casting or ask resident designers...')
                            : t('live_chat_placeholder', 'Drop a live thought, feedback, or say hi...')
                        }
                        maxLength={500}
                        className="flex-1 bg-brand-muted/30 border border-brand-dark/[0.08] rounded-full px-4 py-2.5 text-xs sm:text-sm text-brand-dark outline-none focus:bg-brand-card focus:border-brand-accent/40 focus:ring-1 focus:ring-brand-accent/20 transition-all"
                      />

                      {/* Voice Message Recorder (Telegram / WhatsApp Style) */}
                      <VoiceMessageRecorder
                        onSendVoice={handleSendVoice}
                        disabled={isSending}
                      />

                      {inputText.trim() && (
                        <button
                          type="submit"
                          disabled={isSending}
                          className="bg-brand-accent text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-brand-dark transition-all disabled:opacity-50 shrink-0 shadow-xs animate-in fade-in zoom-in-95 duration-150"
                          title="Send message"
                        >
                          <Send size={15} />
                        </button>
                      )}
                    </form>
                  )
                ) : (
                  <div className="p-3 bg-brand-muted/20 border-t border-brand-dark/[0.08] flex items-center justify-between text-xs">
                    <span className="text-brand-dark/70">{t('login_chat_hint', 'Log in to join the live discussion')}</span>
                    <Link
                      to="/login"
                      className="bg-brand-dark text-white px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-brand-accent transition-colors"
                    >
                      {t('login', 'Login')}
                    </Link>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
