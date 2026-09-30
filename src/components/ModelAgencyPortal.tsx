import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Radio, 
  Sparkles, 
  Clock, 
  ExternalLink, 
  Check, 
  MessageSquare, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  Filter, 
  Send,
  User as UserIcon,
  ShieldCheck,
  Award,
  ChevronRight,
  Bell
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  onSnapshot,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { User, AgencyBroadcast, AppNotification } from '../types';
import ModelVerifiedBadge from './ModelVerifiedBadge';
import AgencyBadge from './AgencyBadge';
import ModelAgencyInvitationCard from './ModelAgencyInvitationCard';
import { getOrCreateConversation } from '../lib/chatService';

interface ModelAgencyPortalProps {
  user: User;
  onRefreshUser?: () => void;
}

export default function ModelAgencyPortal({ user, onRefreshUser }: ModelAgencyPortalProps) {
  const { currentUser, dbUser } = useAuth();
  const { t, i18n } = useTranslation();
  const ui = useUI();
  const navigate = useNavigate();

  const [broadcasts, setBroadcasts] = useState<AgencyBroadcast[]>([]);
  const [agencyNotifications, setAgencyNotifications] = useState<AppNotification[]>([]);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'broadcasts' | 'notifications' | 'info'>('broadcasts');

  const agencyName = user.modelAgencyName || user.modelVerifiedByAgency || '';
  const isConfirmedModel = Boolean(user.hasModelBadge && agencyName);
  const isPendingConfirmation = Boolean(!user.hasModelBadge && (user.modelVerificationStatus === 'pending' || agencyName));

  // 1. Fetch broadcasts from agency
  useEffect(() => {
    if (!currentUser) return;
    setLoadingBroadcasts(true);

    try {
      const q = query(
        collection(db, 'agency_broadcasts'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AgencyBroadcast[];
        
        // Filter broadcasts relevant to this model:
        // - Broadcast to all in her agency, OR
        // - Specifically addressed to her userId in recipientUserIds
        const relevant = list.filter(b => {
          const matchesAgency = agencyName && b.agencyName && b.agencyName.trim().toLowerCase() === agencyName.trim().toLowerCase();
          const isRecipient = b.recipientUserIds && b.recipientUserIds.includes(currentUser.uid);
          const isAllForAgency = b.isBroadcastToAll && matchesAgency;
          return isRecipient || isAllForAgency || matchesAgency;
        });

        setBroadcasts(relevant);
        setLoadingBroadcasts(false);
      }, (err) => {
        console.error('Error listening to agency broadcasts:', err);
        setLoadingBroadcasts(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error('Failed to query agency broadcasts:', e);
      setLoadingBroadcasts(false);
    }
  }, [currentUser?.uid, agencyName]);

  // 2. Fetch agency & modeling-specific notifications
  useEffect(() => {
    if (!currentUser) return;

    try {
      const qNotifs = query(
        collection(db, 'notifications'),
        where('userId', '==', currentUser.uid)
      );

      const unsubscribe = onSnapshot(qNotifs, (snapshot) => {
        const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AppNotification[];
        
        // Strict filter: ONLY notifications directly related to modeling, agency broadcasts, invitations, castings, and model status
        const agencyOnly = notifs.filter(n => {
          // 1. Explicit model-specific notification types
          const strictModelTypes = [
            'agency_broadcast',
            'agency_invite',
            'agency_verified',
            'agency_rejected',
            'model_verified',
            'model_rejected'
          ];
          if (strictModelTypes.includes(n.type)) return true;

          // 2. Explicit metadata flag
          if (n.metadata?.isModelRelated || n.metadata?.agencyId || n.metadata?.modelAgency) return true;

          // 3. Immediately exclude non-modeling types (likes, comments, designer awards, giveaways, payments)
          const nonModelTypes = [
            'like',
            'comment',
            'follow',
            'golden_needle',
            'silver_needle',
            'designer_verified',
            'designer_rejected',
            'subscription',
            'system'
          ];
          if (nonModelTypes.includes(n.type) && !n.metadata?.isModelRelated) {
            return false;
          }

          // 4. If agency name is set and non-empty (at least 2 characters), check if it matches
          const cleanAgency = agencyName ? agencyName.trim().toLowerCase() : '';
          if (cleanAgency.length >= 2) {
            const inTitle = n.title ? n.title.toLowerCase().includes(cleanAgency) : false;
            const inMsg = n.message ? n.message.toLowerCase().includes(cleanAgency) : false;
            const inFrom = n.fromUserName ? n.fromUserName.toLowerCase().includes(cleanAgency) : false;
            if (inTitle || inMsg || inFrom) return true;
          }

          // 5. Check for modeling/casting keywords in title or message
          const text = `${n.title || ''} ${n.message || ''}`.toLowerCase();
          const castingKeywords = ['кастинг', 'casting', 'модельное агентство', 'model agency', 'дефиле', 'съемка модели', 'fitting', 'примерка'];
          if (castingKeywords.some(kw => text.includes(kw))) {
            return true;
          }

          return false;
        });

        agencyOnly.sort((a, b) => ((b.createdAt as any) || 0) - ((a.createdAt as any) || 0));
        setAgencyNotifications(agencyOnly);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error('Failed to query agency notifications:', e);
    }
  }, [currentUser?.uid, agencyName]);

  // Handle contact agency representative
  const handleContactAgency = async () => {
    if (!currentUser) return;
    try {
      // Find agency representative by agency name or ID
      const usersRef = collection(db, 'users');
      const snap = await getDocs(query(usersRef, where('representedAgencyName', '==', agencyName)));
      let repUser: User | null = null;
      if (!snap.empty) {
        repUser = { id: snap.docs[0].id, ...snap.docs[0].data() } as User;
      }

      if (repUser) {
        const convId = await getOrCreateConversation(
          {
            uid: currentUser.uid,
            displayName: user.name || 'Model',
            email: currentUser.email,
            photoURL: user.avatarUrl || '',
            role: 'user'
          },
          {
            id: repUser.id,
            name: repUser.name || agencyName,
            email: repUser.email || '',
            avatarUrl: repUser.avatarUrl || '',
            role: 'user',
            headline: `Представитель агентства ${agencyName}`
          }
        );
        navigate(`/messages?conversationId=${convId}`);
      } else {
        navigate(`/messages?agency=${encodeURIComponent(agencyName)}`);
      }
    } catch (err) {
      console.error('Failed to open agency chat:', err);
      navigate(`/messages?agency=${encodeURIComponent(agencyName)}`);
    }
  };

  // Filter broadcasts by category
  const filteredBroadcasts = selectedCategory === 'all'
    ? broadcasts
    : broadcasts.filter(b => b.category === selectedCategory);

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'casting':
        return {
          label: '🎬 КАСТИНГ',
          className: 'bg-[#7a0000] text-white border-transparent'
        };
      case 'fitting':
        return {
          label: '👗 ПРИМЕРКА',
          className: 'bg-emerald-800 text-white border-transparent'
        };
      case 'runway':
        return {
          label: '👠 ПОКАЗ / СЪЕМКА',
          className: 'bg-purple-900 text-white border-transparent'
        };
      case 'general':
      default:
        return {
          label: '📢 ОБЪЯВЛЕНИЕ',
          className: 'bg-stone-800 text-white border-transparent'
        };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP HEADER & AGENCY STATUS HERO */}
      <div className="rounded-3xl border border-brand-dark/[0.08] bg-white p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#7a0000]/10 border border-[#7a0000]/20 flex items-center justify-center shrink-0">
              <Building2 size={28} className="text-[#7a0000]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest text-brand-accent">
                  [КАБИНЕТ МОДЕЛИ • РАССЫЛКИ И ОБНОВЛЕНИЯ]
                </span>
                {isConfirmedModel && <ModelVerifiedBadge size="sm" showLabel />}
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-normal tracking-tight text-brand-dark">
                {agencyName ? (
                  <span>Модельное агентство «{agencyName}»</span>
                ) : (
                  <span>Кабинет и база модели</span>
                )}
              </h2>

              <p className="text-xs sm:text-sm text-brand-dark/70 mt-1 max-w-2xl font-normal leading-relaxed">
                {isConfirmedModel ? (
                  `Вы являетесь официальной верифицированной моделью агентства «${agencyName}». Здесь отображаются все закрытые рассылки, кастинги, примерки и объявления агентства.`
                ) : isPendingConfirmation ? (
                  `Агентство «${agencyName}» отправило вам запрос на добавление в свой официальный ростер. Подтвердите участие ниже.`
                ) : (
                  'Вы можете прикрепиться к модельному агентству, чтобы получать персональные рассылки кастингов и подтвержденный статус со знаком 😎.'
                )}
              </p>
            </div>
          </div>

          {/* Quick Agency Actions */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap self-start lg:self-center">
            {agencyName && (
              <button
                onClick={handleContactAgency}
                className="px-4 py-2.5 rounded-full bg-[#7a0000] text-white hover:bg-brand-dark transition-colors flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider shadow-xs cursor-pointer"
              >
                <MessageSquare size={13} />
                <span>Написать агенту</span>
              </button>
            )}

            <Link
              to={`/@${user.handle?.replace(/^@+/, '') || user.username || user.id}`}
              className="px-4 py-2.5 rounded-full bg-white text-brand-dark border border-brand-dark/15 hover:border-brand-accent hover:text-brand-accent transition-colors flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider shadow-2xs"
            >
              <ExternalLink size={13} />
              <span>Мой публичный профиль</span>
            </Link>

            <Link
              to="/agencies"
              className="px-4 py-2.5 rounded-full bg-brand-light text-brand-dark border border-brand-dark/10 hover:border-brand-accent hover:text-brand-accent transition-colors flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider shadow-2xs"
            >
              <Building2 size={13} />
              <span>Каталог агентств</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. PENDING INVITATION BANNER (If model needs to accept agency request) */}
      <ModelAgencyInvitationCard user={user} onUpdated={onRefreshUser} />

      {/* 3. SUB-NAVIGATION TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-dark/[0.08] pb-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSubTab('broadcasts')}
            className={`px-5 py-2 rounded-full font-semibold uppercase tracking-wider text-xs transition-all flex items-center gap-2 shadow-2xs cursor-pointer ${
              activeSubTab === 'broadcasts'
                ? 'bg-brand-dark text-white'
                : 'bg-white text-brand-dark/70 border border-brand-dark/10 hover:border-brand-dark/30 hover:text-brand-dark'
            }`}
          >
            <Radio size={13} className={broadcasts.length > 0 ? 'text-red-400 animate-pulse' : ''} />
            <span>Рассылки агентства</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeSubTab === 'broadcasts' ? 'bg-white/20 text-white' : 'bg-brand-muted text-brand-dark'
            }`}>
              {broadcasts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('notifications')}
            className={`px-5 py-2 rounded-full font-semibold uppercase tracking-wider text-xs transition-all flex items-center gap-2 shadow-2xs cursor-pointer ${
              activeSubTab === 'notifications'
                ? 'bg-brand-dark text-white'
                : 'bg-white text-brand-dark/70 border border-brand-dark/10 hover:border-brand-dark/30 hover:text-brand-dark'
            }`}
          >
            <Bell size={13} />
            <span>Уведомления агентства</span>
            {agencyNotifications.filter(n => !n.read).length > 0 && (
              <span className="bg-red-500 text-white px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold">
                {agencyNotifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
        </div>

        {/* Category Filters for Broadcasts */}
        {activeSubTab === 'broadcasts' && broadcasts.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'Все категории' },
              { id: 'casting', label: '🎬 Кастинги' },
              { id: 'fitting', label: '👗 Примерки' },
              { id: 'runway', label: '👠 Показы' },
              { id: 'general', label: '📢 Объявления' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#7a0000] text-white'
                    : 'bg-white text-brand-dark/70 border border-brand-dark/10 hover:border-brand-dark/30'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. TAB 1: AGENCY BROADCASTS LIST */}
      {activeSubTab === 'broadcasts' && (
        <div className="space-y-4">
          {loadingBroadcasts ? (
            <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-12 text-center shadow-xs">
              <div className="w-8 h-8 border-2 border-brand-dark/20 border-t-brand-accent rounded-full animate-spin mx-auto mb-3" />
              <p className="font-mono text-xs uppercase tracking-widest text-brand-dark/60 font-bold">
                Загрузка рассылок модельного агентства...
              </p>
            </div>
          ) : filteredBroadcasts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-12 text-center shadow-xs space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-muted/70 border border-brand-dark/[0.08] flex items-center justify-center mx-auto text-brand-dark/40">
                <Radio size={24} />
              </div>
              <div>
                <h3 className="text-xl font-serif font-normal text-brand-dark">
                  {broadcasts.length === 0 ? 'Вам пока не поступали рассылки от агентства' : 'В этой категории нет рассылок'}
                </h3>
                <p className="text-xs text-brand-dark/60 max-w-md mx-auto mt-1 leading-relaxed">
                  Когда агенты «{agencyName || 'вашего агентства'}» отправляют рассылки по кастингам, примеркам или показам, они мгновенно появляются здесь и в разделе уведомлений.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredBroadcasts.map((broadcast) => {
                const badge = getCategoryBadge(broadcast.category || 'general');
                const timeText = new Date(broadcast.createdAt).toLocaleString(i18n.language, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div 
                    key={broadcast.id}
                    className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-7 shadow-xs hover:border-[#7a0000]/30 transition-all space-y-4 relative overflow-hidden"
                  >
                    {/* Top Meta Line */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-dark/[0.06] pb-3.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border shadow-2xs ${badge.className}`}>
                          {badge.label}
                        </span>

                        <span className="font-mono text-xs font-bold text-brand-dark">
                          {broadcast.agencyName}
                        </span>

                        <span className="text-[11px] font-mono text-brand-dark/40">
                          • {timeText}
                        </span>
                      </div>

                      {broadcast.deadline && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300 text-[11px] font-mono font-semibold self-start sm:self-auto">
                          <Clock size={12} className="text-amber-700" />
                          <span>Дедлайн: <strong>{broadcast.deadline}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Broadcast Title & Message Body */}
                    <div className="space-y-2">
                      <h3 className="text-lg sm:text-xl font-serif font-bold text-brand-dark">
                        {broadcast.title}
                      </h3>

                      <p className="text-sm text-brand-dark/85 whitespace-pre-line leading-relaxed font-normal">
                        {broadcast.message}
                      </p>
                    </div>

                    {/* Footer Actions: Link & Reply */}
                    <div className="pt-3 border-t border-brand-dark/[0.06] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {broadcast.link && (
                          <a
                            href={broadcast.link.startsWith('http') ? broadcast.link : `https://${broadcast.link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#7a0000] text-white text-xs font-semibold uppercase tracking-wider hover:bg-brand-dark transition-colors shadow-2xs"
                          >
                            <ExternalLink size={13} />
                            <span>Перейти по ссылке кастинга</span>
                          </a>
                        )}

                        <button
                          onClick={handleContactAgency}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-light text-brand-dark border border-brand-dark/15 text-xs font-semibold uppercase tracking-wider hover:border-brand-accent hover:text-brand-accent transition-colors shadow-2xs cursor-pointer"
                        >
                          <MessageSquare size={13} />
                          <span>Ответить агенту</span>
                        </button>
                      </div>

                      <span className="text-[11px] font-mono text-brand-dark/50">
                        Отправитель: {broadcast.senderName}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 2: AGENCY NOTIFICATIONS STREAM */}
      {activeSubTab === 'notifications' && (
        <div className="space-y-3">
          {agencyNotifications.length === 0 ? (
            <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-12 text-center shadow-xs">
              <Bell size={28} className="mx-auto text-brand-dark/30 mb-3" />
              <h3 className="text-lg font-serif font-normal text-brand-dark">
                Уведомлений от агентства пока нет
              </h3>
              <p className="text-xs text-brand-dark/60 mt-1 max-w-md mx-auto">
                Все приглашения, кастинги, подтверждения статуса и официальные рассылки от «{agencyName || 'модельных агентств'}» отображаются здесь.
              </p>
            </div>
          ) : (
            agencyNotifications.map(notif => {
              const getBadge = () => {
                if (notif.type === 'agency_broadcast') return { label: 'РАССЫЛКА', color: 'bg-[#7a0000] text-white' };
                if (notif.type === 'agency_invite') return { label: 'ПРИГЛАШЕНИЕ В АГЕНТСТВО', color: 'bg-[#7a0000] text-white' };
                if (notif.type === 'model_verified' || notif.type === 'agency_verified') return { label: 'ВЕРИФИКАЦИЯ', color: 'bg-emerald-800 text-white' };
                if (notif.type === 'model_rejected' || notif.type === 'agency_rejected') return { label: 'ОТКЛОНЕНО', color: 'bg-red-800 text-white' };
                return { label: 'МОДЕЛЬНОЕ ОПОВЕЩЕНИЕ', color: 'bg-stone-800 text-white' };
              };
              const badge = getBadge();

              return (
                <div 
                  key={notif.id}
                  className={`rounded-2xl border p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                    !notif.read ? 'bg-white border-[#7a0000]/40 shadow-xs ring-1 ring-[#7a0000]/10' : 'bg-white/80 border-brand-dark/[0.08]'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-[#7a0000]/10 border border-[#7a0000]/20 flex items-center justify-center shrink-0 mt-0.5 text-[#7a0000]">
                      {notif.type === 'agency_broadcast' ? <Radio size={16} /> : notif.type === 'model_verified' ? <Sparkles size={16} /> : <Building2 size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className="text-xs font-bold font-mono uppercase text-brand-dark">
                          {notif.fromUserName || agencyName || 'Agency Hub'}
                        </span>
                        <span className="text-[11px] font-mono text-brand-dark/45">
                          • {new Date(notif.createdAt as any || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-brand-dark mb-0.5">
                        {notif.title}
                      </h4>
                      {notif.message && (
                        <p className="text-xs text-brand-dark/80 whitespace-pre-line leading-relaxed">
                          {notif.message}
                        </p>
                      )}
                      {notif.link && (
                        <div className="mt-2">
                          <Link
                            to={notif.link}
                            className="inline-flex items-center gap-1 text-xs text-[#7a0000] font-semibold hover:underline"
                          >
                            <span>Открыть подробности</span>
                            <ChevronRight size={13} />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {!notif.read && (
                      <button 
                        onClick={() => updateDoc(doc(db, 'notifications', notif.id), { read: true })}
                        className="px-3.5 py-1.5 rounded-full bg-brand-dark text-white text-[11px] font-semibold uppercase tracking-wider hover:bg-brand-accent transition-colors shadow-2xs cursor-pointer"
                      >
                        Прочитано
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
