import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Check, 
  X, 
  ShieldCheck, 
  AlertCircle, 
  LogOut, 
  Clock, 
  Sparkles,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { User, AgencyInvitation } from '../types';
import ModelVerifiedBadge from './ModelVerifiedBadge';

interface ModelAgencyInvitationCardProps {
  user: User;
  onUpdated?: () => void;
  variant?: 'banner' | 'card';
}

export default function ModelAgencyInvitationCard({ user, onUpdated, variant = 'banner' }: ModelAgencyInvitationCardProps) {
  const { currentUser } = useAuth();
  const ui = useUI();

  const [pendingInvitations, setPendingInvitations] = useState<AgencyInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchInvitations = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // 1. Fetch pending invitations where this user is the invited model
      const q = query(
        collection(db, 'agency_invitations'),
        where('modelUserId', '==', currentUser.uid),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as AgencyInvitation[];
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      // Fallback: If no document in agency_invitations, but user has modelVerificationStatus === 'pending'
      if (list.length === 0 && user.modelVerificationStatus === 'pending' && user.modelAgencyName) {
        list.push({
          id: 'profile_pending',
          modelUserId: currentUser.uid,
          modelName: user.name || user.username || 'Модель',
          agencyName: user.modelAgencyName,
          agencyId: user.modelAgencyId || '',
          invitedByUserId: user.modelVerifiedByUserId || '',
          invitedByUserName: user.modelVerifiedByAgency || user.modelAgencyName,
          status: 'pending',
          createdAt: Date.now()
        });
      }

      setPendingInvitations(list);
    } catch (err) {
      console.warn('Could not fetch agency invitations for model:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [currentUser, user.id, user.modelAgencyName, user.modelVerificationStatus]);

  // Handle Accept Invitation
  const handleAccept = async (invite: AgencyInvitation) => {
    if (!currentUser) return;

    // RULE: A model cannot belong to two agencies!
    if (
      user.hasModelBadge &&
      user.modelAgencyName &&
      user.modelAgencyName.trim().toLowerCase() !== invite.agencyName.trim().toLowerCase()
    ) {
      ui.alert(`Вы уже состоите в модельном агентстве «${user.modelAgencyName}». Одна модель не может состоять в двух агентствах одновременно. Чтобы принять это приглашение, сначала покиньте текущее агентство.`);
      return;
    }

    if (!await ui.confirm(`Подтвердить добавление в базу модельного агентства «${invite.agencyName}»? Возле вашего имени появится официальный значок модели 😎.`)) {
      return;
    }

    setProcessingId(invite.id);
    try {
      const now = Date.now();
      const userRef = doc(db, 'users', currentUser.uid);

      // 1. Update model user document: grant sunglasses badge 😎 and link agency
      await updateDoc(userRef, {
        isModel: true,
        hasModelBadge: true, // SUNGLASSES BADGE ACTIVATED!
        modelAgencyName: invite.agencyName,
        modelAgencyId: invite.agencyId || '',
        modelVerifiedByAgency: invite.agencyName,
        modelVerifiedByUserId: invite.invitedByUserId || '',
        modelVerifiedAt: now,
        modelVerificationStatus: 'approved'
      });

      // 2. Update invitation document in agency_invitations if not synthetic
      if (invite.id !== 'profile_pending') {
        await updateDoc(doc(db, 'agency_invitations', invite.id), {
          status: 'accepted',
          acceptedAt: now
        });
      }

      // 3. Notify agency representative
      if (invite.invitedByUserId) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: invite.invitedByUserId,
            type: 'model_verified',
            title: '🎉 Модель приняла приглашение!',
            message: `Модель «${user.name || user.username || 'Пользователь'}» подтвердила добавление в базу вашего модельного агентства «${invite.agencyName}». Официальный статус модели (😎) активирован!`,
            fromUserId: currentUser.uid,
            fromUserName: user.name || user.username || 'Модель',
            fromUserAvatar: user.avatarUrl || '',
            read: false,
            createdAt: serverTimestamp()
          });
        } catch (nErr) {
          console.warn('Failed to notify agency rep:', nErr);
        }
      }

      ui.alert(`Поздравляем! Вы официально добавлены в модельное агентство «${invite.agencyName}». Возле вашего имени теперь активен значок модели 😎.`);
      setPendingInvitations(prev => prev.filter(i => i.id !== invite.id));
      onUpdated?.();
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      ui.alert('Ошибка при подтверждении приглашения: ' + (err.message || ''));
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Decline Invitation
  const handleDecline = async (invite: AgencyInvitation) => {
    if (!currentUser) return;

    if (!await ui.confirm(`Отклонить приглашение от модельного агентства «${invite.agencyName}»?`)) {
      return;
    }

    setProcessingId(invite.id);
    try {
      const userRef = doc(db, 'users', currentUser.uid);

      // 1. Reset pending status on user
      await updateDoc(userRef, {
        modelVerificationStatus: 'none',
        modelAgencyName: user.hasModelBadge ? user.modelAgencyName : '',
        modelVerifiedByAgency: user.hasModelBadge ? user.modelVerifiedByAgency : ''
      });

      // 2. Update invitation document
      if (invite.id !== 'profile_pending') {
        await updateDoc(doc(db, 'agency_invitations', invite.id), {
          status: 'declined',
          declinedAt: Date.now()
        });
      }

      // 3. Notify agency representative
      if (invite.invitedByUserId) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: invite.invitedByUserId,
            type: 'model_rejected',
            title: 'Приглашение отклонено',
            message: `Модель «${user.name || user.username || 'Пользователь'}» отклонила приглашение в состав агентства «${invite.agencyName}».`,
            fromUserId: currentUser.uid,
            fromUserName: user.name || user.username || 'Модель',
            read: false,
            createdAt: serverTimestamp()
          });
        } catch (nErr) {
          console.warn('Failed to notify agency rep:', nErr);
        }
      }

      ui.alert(`Приглашение от агентства «${invite.agencyName}» отклонено.`);
      setPendingInvitations(prev => prev.filter(i => i.id !== invite.id));
      onUpdated?.();
    } catch (err: any) {
      console.error('Error declining invitation:', err);
      ui.alert('Ошибка при отклонении: ' + (err.message || ''));
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Leave Agency (Strict Rule: One model can only belong to one agency)
  const handleLeaveAgency = async () => {
    if (!currentUser || !user.modelAgencyName) return;

    if (!await ui.confirm(`Вы уверены, что хотите покинуть модельное агентство «${user.modelAgencyName}»? Ваш официальный значок модели 😎 будет снят.`)) {
      return;
    }

    setProcessingId('leave');
    try {
      const oldAgencyName = user.modelAgencyName;
      const oldRepId = user.modelVerifiedByUserId;
      const userRef = doc(db, 'users', currentUser.uid);

      await updateDoc(userRef, {
        hasModelBadge: false, // SUNGLASSES BADGE REVOKED
        modelVerificationStatus: 'none',
        modelAgencyName: '',
        modelAgencyId: '',
        modelVerifiedByAgency: '',
        modelVerifiedByUserId: '',
        modelVerifiedAt: null
      });

      // Notify former agency rep
      if (oldRepId) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: oldRepId,
            type: 'model_rejected',
            title: 'Модель покинула агентство',
            message: `Модель «${user.name || user.username}» покинула состав модельного агентства «${oldAgencyName}».`,
            fromUserId: currentUser.uid,
            fromUserName: user.name || user.username || 'Модель',
            read: false,
            createdAt: serverTimestamp()
          });
        } catch (e) {
          console.warn('Notification error:', e);
        }
      }

      ui.alert(`Вы успешно покинули агентство «${oldAgencyName}». Теперь ваш профиль может быть приглашен другим агентством.`);
      onUpdated?.();
    } catch (err: any) {
      console.error('Error leaving agency:', err);
      ui.alert('Ошибка: ' + (err.message || ''));
    } finally {
      setProcessingId(null);
    }
  };

  // If currently confirmed in an agency
  const isConfirmedInAgency = user.hasModelBadge && Boolean(user.modelAgencyName || user.modelVerifiedByAgency);

  // If no invitations and not confirmed in agency, don't show anything unless asked
  if (pendingInvitations.length === 0 && !isConfirmedInAgency) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 1. ACTIVE PENDING INVITATIONS BANNER */}
      {pendingInvitations.map(invite => (
        <div 
          key={invite.id}
          className="rounded-3xl border-2 border-brand-accent bg-white p-5 sm:p-7 shadow-md relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300"
        >
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#7a0000]" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-[#7a0000] text-white text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <Building2 size={12} /> ПРИГЛАШЕНИЕ В МОДЕЛЬНОЕ АГЕНТСТВО
                </span>
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full">
                  Требуется ваше подтверждение
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-serif font-normal text-brand-dark tracking-tight">
                Агентство «{invite.agencyName}» приглашает вас в свою базу моделей
              </h3>

              <p className="text-xs sm:text-sm text-brand-dark/80 leading-relaxed font-normal">
                {invite.invitedByUserName && (
                  <span className="font-semibold text-brand-dark">
                    Представитель: {invite.invitedByUserName}.{' '}
                  </span>
                )}
                После подтверждения вашего согласия вы будете добавлены в официальную базу моделей агентства, и возле вашего имени появится официальный статус модели со значком <strong>😎</strong>.
              </p>

              {/* Exclusivity Warning */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] font-mono text-amber-900 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-700" />
                <span>
                  <strong>Правило платформы:</strong> Одна модель может состоять только в одном модельном агентстве. Если вы соглашаетесь, ваш аккаунт будет эксклюзивно закреплен за «{invite.agencyName}».
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                disabled={processingId === invite.id}
                onClick={() => handleAccept(invite)}
                className="bg-[#7a0000] hover:bg-brand-dark text-white px-5 py-3 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Check size={15} />
                <span>{processingId === invite.id ? 'Подтверждение...' : 'Подтвердить участие 😎'}</span>
              </button>

              <button
                type="button"
                disabled={processingId === invite.id}
                onClick={() => handleDecline(invite)}
                className="bg-white hover:bg-red-50 text-red-700 border border-red-200 px-5 py-3 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <X size={15} />
                <span>Отклонить</span>
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* 2. CONFIRMED AGENCY AFFILIATION CARD (IF CONFIRMED) */}
      {isConfirmedInAgency && pendingInvitations.length === 0 && (
        <div className="rounded-3xl border border-brand-dark/[0.12] bg-white p-5 sm:p-7 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono uppercase tracking-wider text-brand-dark/60">
                Официальный статус модели
              </span>
              <ModelVerifiedBadge size="sm" showLabel agencyName={user.modelVerifiedByAgency || user.modelAgencyName} />
            </div>

            <h3 className="text-base sm:text-lg font-serif font-normal text-brand-dark">
              Агентство: <strong className="font-semibold">{user.modelVerifiedByAgency || user.modelAgencyName}</strong>
            </h3>

            <p className="text-xs text-brand-dark/70 max-w-2xl leading-relaxed">
              Ваш профиль состоит в официальной базе модельного агентства «{user.modelVerifiedByAgency || user.modelAgencyName}». Вы получаете внутренние кастинг-рассылки от агентства и имеете подтвержденный статус со значком 😎.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              disabled={processingId === 'leave'}
              onClick={handleLeaveAgency}
              className="px-4 py-2 rounded-full border border-red-200 text-red-700 hover:bg-red-50 bg-white font-semibold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Покинуть модельное агентство"
            >
              <LogOut size={13} />
              <span>{processingId === 'leave' ? 'Выход...' : 'Покинуть агентство'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
