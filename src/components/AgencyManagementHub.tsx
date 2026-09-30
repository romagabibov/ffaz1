import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Clock, 
  Upload, 
  Check, 
  X, 
  Search, 
  UserPlus, 
  Send, 
  Trash2, 
  MessageSquare, 
  ExternalLink, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  Radio, 
  Layers, 
  FileText,
  Users,
  CheckSquare,
  Square,
  Lock
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { uploadMediaFile } from '../lib/upload';
import { User, AgencyApplication, AgencyBroadcast, AgencyInvitation } from '../types';
import ModelVerifiedBadge from './ModelVerifiedBadge';
import AgencyBadge from './AgencyBadge';
import ImageZoomModal from './ImageZoomModal';
import { useNavigate, Link } from 'react-router';

interface AgencyManagementHubProps {
  user: User;
  onStatusUpdated?: () => void;
}

export default function AgencyManagementHub({ user, onStatusUpdated }: AgencyManagementHubProps) {
  const { currentUser } = useAuth();
  const ui = useUI();
  const navigate = useNavigate();

  // Verification application form state
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [submittingApp, setSubmittingApp] = useState(false);
  const [existingApplication, setExistingApplication] = useState<AgencyApplication | null>(null);
  const [loadingApp, setLoadingApp] = useState(true);

  // Form fields strictly matching prompt
  const [firstName, setFirstName] = useState(user.name?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user.name?.split(' ').slice(1).join(' ') || '');
  const [patronymic, setPatronymic] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user.email || currentUser?.email || '');
  const [agencyName, setAgencyName] = useState(user.representedAgencyName || '');
  const [agencyAddress, setAgencyAddress] = useState('');
  const [foundingYear, setFoundingYear] = useState('');
  
  // Photos
  const [idCardPhotoUrl, setIdCardPhotoUrl] = useState('');
  const [idCardUploading, setIdCardUploading] = useState(false);
  const [personalPhotoUrl, setPersonalPhotoUrl] = useState('');
  const [personalPhotoUploading, setPersonalPhotoUploading] = useState(false);

  const idCardInputRef = useRef<HTMLInputElement>(null);
  const personalPhotoInputRef = useRef<HTMLInputElement>(null);

  // Success screen state after submission
  const [justSubmitted, setJustSubmitted] = useState(false);

  // Zoom image state
  const [zoomImage, setZoomImage] = useState<{ url: string; caption?: string } | null>(null);

  // Approved Agency Management State
  const [agencyTab, setAgencyTab] = useState<'roster' | 'search' | 'broadcasts'>('roster');
  const [agencyModels, setAgencyModels] = useState<User[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<AgencyInvitation[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Search models state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [invitingModelId, setInvitingModelId] = useState<string | null>(null);

  // Broadcast state
  const [broadcastAudience, setBroadcastAudience] = useState<'all' | 'custom'>('all');
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastCategory, setBroadcastCategory] = useState<'casting' | 'fitting' | 'runway' | 'general'>('casting');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastLink, setBroadcastLink] = useState('');
  const [broadcastDeadline, setBroadcastDeadline] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastsList, setBroadcastsList] = useState<AgencyBroadcast[]>([]);

  const effectiveAgencyName = user.representedAgencyName || agencyName || 'Модельное агентство';
  const isApproved = user.agencyVerificationStatus === 'approved';
  const isPending = user.agencyVerificationStatus === 'pending' || (existingApplication?.status === 'pending');
  const isRejected = user.agencyVerificationStatus === 'rejected';

  // Models confirmed in roster (possess sunglasses emoji)
  const confirmedModels = useMemo(() => {
    return agencyModels.filter(m => m.hasModelBadge);
  }, [agencyModels]);

  // Models invited but still waiting confirmation from model
  const pendingModels = useMemo(() => {
    return agencyModels.filter(m => !m.hasModelBadge && (m.modelVerificationStatus === 'pending' || pendingInvitations.some(inv => inv.modelUserId === m.id)));
  }, [agencyModels, pendingInvitations]);

  // 1. Fetch user's existing application if any
  const fetchUserApplication = async () => {
    if (!currentUser) return;
    setLoadingApp(true);
    try {
      const q = query(
        collection(db, 'agency_applications'),
        where('userId', '==', currentUser.uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const apps = snap.docs.map(d => ({ id: d.id, ...d.data() })) as AgencyApplication[];
        apps.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        const latest = apps[0];
        setExistingApplication(latest);
        if (latest.agencyName && !agencyName) setAgencyName(latest.agencyName);
        if (latest.applicantFirstName && !firstName) setFirstName(latest.applicantFirstName);
        if (latest.applicantLastName && !lastName) setLastName(latest.applicantLastName);
        if (latest.applicantPatronymic) setPatronymic(latest.applicantPatronymic);
        if (latest.phoneNumber) setPhone(latest.phoneNumber);
        if (latest.agencyAddress) setAgencyAddress(latest.agencyAddress);
        if (latest.foundingYear) setFoundingYear(String(latest.foundingYear));
        if (latest.idCardPhotoUrl) setIdCardPhotoUrl(latest.idCardPhotoUrl);
        if (latest.personalPhotoUrl) setPersonalPhotoUrl(latest.personalPhotoUrl);
      }
    } catch (err) {
      console.error('Error fetching agency application:', err);
    } finally {
      setLoadingApp(false);
    }
  };

  useEffect(() => {
    fetchUserApplication();
  }, [currentUser]);

  // 2. Load models strictly for THIS agency (both confirmed and pending confirmation)
  const fetchAgencyModels = async () => {
    if (!currentUser || !isApproved || !effectiveAgencyName) return;
    setLoadingModels(true);
    try {
      // A. Fetch all users associated with this agency
      const usersSnap = await getDocs(collection(db, 'users'));
      const roster: User[] = [];
      const cleanAgency = effectiveAgencyName.trim().toLowerCase();

      usersSnap.docs.forEach(docSnap => {
        const u = { id: docSnap.id, ...docSnap.data() } as User;
        const uAgencyName = (u.modelAgencyName || u.modelVerifiedByAgency || '').trim().toLowerCase();
        if (uAgencyName === cleanAgency && (u.hasModelBadge || u.isModel || u.modelVerificationStatus === 'pending')) {
          roster.push(u);
        }
      });

      setAgencyModels(roster);

      // B. Fetch agency invitations sent by this agency
      try {
        const invSnap = await getDocs(collection(db, 'agency_invitations'));
        const invList: AgencyInvitation[] = [];
        invSnap.docs.forEach(d => {
          const inv = { id: d.id, ...d.data() } as AgencyInvitation;
          if (inv.agencyName?.trim().toLowerCase() === cleanAgency && inv.status === 'pending') {
            invList.push(inv);
          }
        });
        setPendingInvitations(invList);
      } catch (e) {
        console.warn('Could not fetch agency invitations:', e);
      }
    } catch (err) {
      console.error('Error fetching agency models:', err);
    } finally {
      setLoadingModels(false);
    }
  };

  // 3. Load broadcasts history for THIS agency
  const fetchBroadcasts = async () => {
    if (!currentUser || !isApproved) return;
    try {
      const q = query(
        collection(db, 'agency_broadcasts'),
        where('senderUserId', '==', currentUser.uid)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as AgencyBroadcast[];
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setBroadcastsList(list);
    } catch (err) {
      console.error('Error fetching broadcasts:', err);
    }
  };

  useEffect(() => {
    if (isApproved) {
      fetchAgencyModels();
      fetchBroadcasts();
    }
  }, [isApproved, effectiveAgencyName]);

  // Handle uploading ID Card Photo
  const handleUploadIdCard = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdCardUploading(true);
    try {
      const url = await uploadMediaFile(file);
      setIdCardPhotoUrl(url);
    } catch (err: any) {
      ui.alert('Ошибка при загрузке документа: ' + (err.message || ''));
    } finally {
      setIdCardUploading(false);
      if (idCardInputRef.current) idCardInputRef.current.value = '';
    }
  };

  // Handle uploading Personal Photo (Selfie)
  const handleUploadPersonalPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPersonalPhotoUploading(true);
    try {
      const url = await uploadMediaFile(file);
      setPersonalPhotoUrl(url);
    } catch (err: any) {
      ui.alert('Ошибка при загрузке фото: ' + (err.message || ''));
    } finally {
      setPersonalPhotoUploading(false);
      if (personalPhotoInputRef.current) personalPhotoInputRef.current.value = '';
    }
  };

  // Submit Application Request
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!idCardPhotoUrl) {
      ui.alert('Пожалуйста, загрузите фото şəxsiyyət vəsiqəsi (удостоверения личности).');
      return;
    }
    if (!personalPhotoUrl) {
      ui.alert('Пожалуйста, загрузите ваше личное фото.');
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !patronymic.trim()) {
      ui.alert('Пожалуйста, заполните Имя, Фамилию и Отчество представителя.');
      return;
    }
    if (!phone.trim()) {
      ui.alert('Пожалуйста, укажите контактный номер телефона.');
      return;
    }
    if (!agencyName.trim()) {
      ui.alert('Пожалуйста, укажите название модельного агентства.');
      return;
    }
    if (!foundingYear.trim()) {
      ui.alert('Пожалуйста, укажите год основания модельного агентства.');
      return;
    }

    setSubmittingApp(true);
    try {
      const now = Date.now();
      const userHandle = user.handle || (user.username ? `@${user.username}` : `@${currentUser.email?.split('@')[0]}`);

      // 1. Create document in agency_applications
      const appRef = await addDoc(collection(db, 'agency_applications'), {
        userId: currentUser.uid,
        userEmail: email.trim() || currentUser.email || '',
        userHandle: userHandle,
        applicantFirstName: firstName.trim(),
        applicantLastName: lastName.trim(),
        applicantPatronymic: patronymic.trim(),
        phoneNumber: phone.trim(),
        agencyName: agencyName.trim(),
        agencyAddress: agencyAddress.trim(),
        foundingYear: foundingYear.trim(),
        idCardPhotoUrl: idCardPhotoUrl,
        personalPhotoUrl: personalPhotoUrl,
        idDocumentUrl: idCardPhotoUrl, // backwards-compatible field
        agencyRole: 'Представитель агентства',
        status: 'pending',
        createdAt: now
      });

      // 2. Update user document
      await updateDoc(doc(db, 'users', currentUser.uid), {
        agencyVerificationStatus: 'pending',
        agencyApplicationId: appRef.id,
        representedAgencyName: agencyName.trim(),
        isAgency: true,
        industry: 'agency'
      });

      setJustSubmitted(true);
      setShowApplyForm(false);
      await fetchUserApplication();
      onStatusUpdated?.();
    } catch (err: any) {
      console.error('Error submitting agency application:', err);
      handleFirestoreError(err, OperationType.CREATE, 'agency_applications');
    } finally {
      setSubmittingApp(false);
    }
  };

  // Search users/models across the platform
  const handleSearchUsers = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const queryTerm = searchQuery.trim().replace(/^@/, '').toLowerCase();
    if (!queryTerm) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setSearchingUsers(true);
    setHasSearched(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const matches: User[] = [];

      snap.docs.forEach(d => {
        const u = { id: d.id, ...d.data() } as User;
        // Don't include oneself
        if (u.id === currentUser?.uid) return;

        const uName = (u.name || '').toLowerCase();
        const uUsername = (u.username || '').toLowerCase();
        const uHandle = (u.handle || '').toLowerCase().replace(/^@/, '');
        const uEmail = (u.email || '').toLowerCase();

        if (
          u.id.toLowerCase().includes(queryTerm) ||
          uUsername.includes(queryTerm) ||
          uHandle.includes(queryTerm) ||
          uName.includes(queryTerm) ||
          uEmail.includes(queryTerm)
        ) {
          matches.push(u);
        }
      });

      setSearchResults(matches);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Invite Model to Agency Base (Requires model confirmation, enforces exclusivity)
  const handleInviteModelToRoster = async (targetUser: User) => {
    if (!currentUser || !effectiveAgencyName) return;

    // RULE: A model cannot belong to two agencies at the same time!
    if (
      targetUser.modelAgencyName &&
      targetUser.modelAgencyName.trim().toLowerCase() !== effectiveAgencyName.trim().toLowerCase()
    ) {
      const currentAgency = targetUser.modelAgencyName;
      const isConfirmed = targetUser.hasModelBadge;
      ui.alert(`Модель «${targetUser.name || targetUser.username}» уже ${isConfirmed ? 'состоит в' : 'прикреплена к'} модельном агентстве «${currentAgency}». Одна модель не может состоять в двух модельных агентствах одновременно.`);
      return;
    }

    const isAlreadyPending = pendingInvitations.some(inv => inv.modelUserId === targetUser.id);
    if (isAlreadyPending) {
      ui.alert(`Приглашение для модели «${targetUser.name || targetUser.username}» уже отправлено и ожидает ее подтверждения.`);
      return;
    }

    if (!await ui.confirm(`Отправить приглашение модели «${targetUser.name || targetUser.username}» на вступление в базу агентства «${effectiveAgencyName}»? Модель должна будет подтвердить добавление со своей страницы, после чего возле ее имени появится статус модели 😎.`)) {
      return;
    }

    setInvitingModelId(targetUser.id);
    try {
      const now = Date.now();
      const targetUserRef = doc(db, 'users', targetUser.id);

      // 1. Update target user document: pending agency confirmation (NO sunglasses badge yet!)
      await updateDoc(targetUserRef, {
        isModel: true,
        hasModelBadge: false, // NOT granted until model accepts!
        modelAgencyName: effectiveAgencyName,
        modelAgencyId: user.representedAgencyId || '',
        modelVerifiedByAgency: effectiveAgencyName,
        modelVerifiedByUserId: currentUser.uid,
        modelVerificationStatus: 'pending'
      });

      // 2. Create official invitation record in agency_invitations
      await addDoc(collection(db, 'agency_invitations'), {
        modelUserId: targetUser.id,
        modelName: targetUser.name || targetUser.username || 'Модель',
        modelEmail: targetUser.email || '',
        modelHandle: targetUser.handle || (targetUser.username ? `@${targetUser.username}` : `@${targetUser.email?.split('@')[0]}`),
        modelAvatar: targetUser.avatarUrl || '',
        agencyName: effectiveAgencyName,
        agencyId: user.representedAgencyId || '',
        invitedByUserId: currentUser.uid,
        invitedByUserName: user.name || effectiveAgencyName,
        status: 'pending',
        createdAt: now
      });

      // 3. Dispatch in-app notification to model
      await addDoc(collection(db, 'notifications'), {
        userId: targetUser.id,
        type: 'agency_invite',
        title: 'Приглашение в модельное агентство! 🏢',
        message: `Модельное агентство «${effectiveAgencyName}» приглашает вас в свой официальный состав моделей. Перейдите в профиль или раздел уведомлений, чтобы подтвердить добавление.`,
        fromUserId: currentUser.uid,
        fromUserName: effectiveAgencyName,
        fromUserAvatar: user.avatarUrl || '',
        metadata: {
          agencyName: effectiveAgencyName,
          agencyId: user.representedAgencyId || '',
          invitedByUserId: currentUser.uid,
          status: 'pending'
        },
        read: false,
        createdAt: serverTimestamp()
      });

      ui.alert(`Приглашение отправлено модели ${targetUser.name || targetUser.username}! Как только модель подтвердит запрос со своей страницы, она будет добавлена в официальную базу и получит значок модели 😎.`);
      
      // Update local state
      setSearchResults(prev => prev.map(u => u.id === targetUser.id ? {
        ...u,
        hasModelBadge: false,
        isModel: true,
        modelAgencyName: effectiveAgencyName,
        modelVerificationStatus: 'pending'
      } : u));

      await fetchAgencyModels();
    } catch (err: any) {
      console.error('Error inviting model:', err);
      ui.alert('Ошибка при отправке приглашения: ' + (err.message || ''));
    } finally {
      setInvitingModelId(null);
    }
  };

  // Cancel / Revoke Pending Invitation
  const handleCancelInvitation = async (targetUser: User) => {
    if (!await ui.confirm(`Отозвать приглашение для модели «${targetUser.name || targetUser.username}»?`)) {
      return;
    }

    try {
      // 1. Reset model user doc
      await updateDoc(doc(db, 'users', targetUser.id), {
        modelVerificationStatus: 'none',
        modelAgencyName: '',
        modelVerifiedByAgency: '',
        hasModelBadge: false
      });

      // 2. Mark invitations as cancelled/rejected
      const invSnap = await getDocs(
        query(
          collection(db, 'agency_invitations'),
          where('modelUserId', '==', targetUser.id),
          where('agencyName', '==', effectiveAgencyName),
          where('status', '==', 'pending')
        )
      );
      for (const d of invSnap.docs) {
        await updateDoc(doc(db, 'agency_invitations', d.id), { status: 'rejected' });
      }

      ui.alert(`Приглашение для «${targetUser.name || targetUser.username}» отозвано.`);
      await fetchAgencyModels();
    } catch (err: any) {
      console.error('Error cancelling invitation:', err);
      ui.alert('Ошибка: ' + (err.message || ''));
    }
  };

  // Remove Model from Agency Base (revokes Sunglasses Badge)
  const handleRemoveModelFromRoster = async (targetUser: User) => {
    if (!await ui.confirm(`Исключить модель «${targetUser.name || targetUser.username}» из базы агентства «${effectiveAgencyName}»? Знак подтвержденной модели (😎) будет снят.`)) {
      return;
    }

    try {
      const targetUserRef = doc(db, 'users', targetUser.id);

      await updateDoc(targetUserRef, {
        hasModelBadge: false, // SUNGLASSES BADGE REVOKED
        modelVerificationStatus: 'none',
        modelAgencyName: '',
        modelVerifiedByAgency: '',
        modelVerifiedByUserId: '',
        modelVerifiedAt: null
      });

      // Notify model
      await addDoc(collection(db, 'notifications'), {
        userId: targetUser.id,
        type: 'model_rejected',
        title: 'Статус в модельном агентстве обновлен',
        message: `Модельное агентство «${effectiveAgencyName}» исключило ваш профиль из своего состава.`,
        fromUserId: currentUser?.uid,
        fromUserName: effectiveAgencyName,
        read: false,
        createdAt: serverTimestamp()
      });

      ui.alert(`Модель «${targetUser.name || targetUser.username}» исключена из состава агентства.`);
      await fetchAgencyModels();
    } catch (err: any) {
      console.error('Error removing model:', err);
      ui.alert('Ошибка: ' + (err.message || ''));
    }
  };

  // Toggle selection of a specific model for custom broadcast
  const toggleSelectModel = (modelId: string) => {
    setSelectedModelIds(prev => 
      prev.includes(modelId) ? prev.filter(id => id !== modelId) : [...prev, modelId]
    );
  };

  // Select all / Deselect all
  const selectAllModels = () => {
    setSelectedModelIds(confirmedModels.map(m => m.id));
  };
  const deselectAllModels = () => {
    setSelectedModelIds([]);
  };

  // Send Broadcast (all models or specific selected models)
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !effectiveAgencyName) return;

    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      ui.alert('Пожалуйста, заполните заголовок и текст рассылки.');
      return;
    }

    if (confirmedModels.length === 0) {
      ui.alert('В вашей базе пока нет подтвержденных моделей для отправки рассылки. Сначала пригласите моделей и дождитесь их подтверждения.');
      return;
    }

    // Determine target recipient models
    const targetRecipients = broadcastAudience === 'all'
      ? confirmedModels
      : confirmedModels.filter(m => selectedModelIds.includes(m.id));

    if (targetRecipients.length === 0) {
      ui.alert('Пожалуйста, выберите хотя бы одну модель для рассылки.');
      return;
    }

    const confirmMsg = broadcastAudience === 'all'
      ? `Отправить рассылку «${broadcastTitle}» ВСЕМ ${targetRecipients.length} моделям вашей базы?`
      : `Отправить рассылку «${broadcastTitle}» ВЫБРАННЫМ ${targetRecipients.length} моделям?`;

    if (!await ui.confirm(confirmMsg)) {
      return;
    }

    setSendingBroadcast(true);
    try {
      const now = Date.now();

      // 1. Send in-app notification to each target model
      for (const model of targetRecipients) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: model.id,
            type: 'agency_broadcast',
            title: `📢 ${effectiveAgencyName}: ${broadcastTitle.trim()}`,
            message: broadcastMessage.trim(),
            fromUserId: currentUser.uid,
            fromUserName: effectiveAgencyName,
            fromUserAvatar: user.avatarUrl || '',
            link: broadcastLink.trim() || '/dashboard?tab=model',
            metadata: {
              category: broadcastCategory,
              deadline: broadcastDeadline.trim() || undefined,
              agencyName: effectiveAgencyName
            },
            read: false,
            createdAt: now
          });
        } catch (mErr) {
          console.warn(`Failed sending notification to model ${model.id}:`, mErr);
        }
      }

      // 2. Record broadcast in agency_broadcasts collection
      await addDoc(collection(db, 'agency_broadcasts'), {
        agencyId: user.representedAgencyId || '',
        agencyName: effectiveAgencyName,
        senderUserId: currentUser.uid,
        senderName: user.name || effectiveAgencyName,
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        category: broadcastCategory,
        link: broadcastLink.trim() || '',
        deadline: broadcastDeadline.trim() || '',
        recipientCount: targetRecipients.length,
        recipientUserIds: targetRecipients.map(m => m.id),
        isBroadcastToAll: broadcastAudience === 'all',
        createdAt: now
      });

      ui.alert(`Рассылка успешно отправлена (${targetRecipients.length} моделей получили уведомление)!`);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastLink('');
      setBroadcastDeadline('');
      setSelectedModelIds([]);
      await fetchBroadcasts();
    } catch (err: any) {
      console.error('Error sending broadcast:', err);
      ui.alert('Ошибка отправки рассылки: ' + (err.message || ''));
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleDeleteBroadcast = async (broadcastId: string, title: string) => {
    if (!window.confirm(`Вы уверены, что хотите удалить рассылку «${title}» из истории?`)) return;
    try {
      await deleteDoc(doc(db, 'agency_broadcasts', broadcastId));
      setBroadcastsList(prev => prev.filter(b => b.id !== broadcastId));
      ui.alert('Рассылка успешно удалена из истории.');
    } catch (err: any) {
      console.error('Error deleting broadcast:', err);
      ui.alert('Ошибка при удалении рассылки: ' + (err.message || ''));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hidden File Inputs for Document and Personal Photo */}
      <input 
        type="file" 
        ref={idCardInputRef} 
        onChange={handleUploadIdCard} 
        accept="image/*" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={personalPhotoInputRef} 
        onChange={handleUploadPersonalPhoto} 
        accept="image/*" 
        className="hidden" 
      />

      {/* CASE 1: APPROVED AGENCY REPRESENTATIVE */}
      {isApproved ? (
        <div className="space-y-8">
          {/* Agency Official Header Banner */}
          <div className="bg-white rounded-3xl border-2 border-brand-dark/[0.12] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="bg-[#7a0000] text-white px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck size={13} /> OFFICIAL MODEL AGENCY
                </span>
                <AgencyBadge size="sm" showLabel agencyName={effectiveAgencyName} />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-normal text-brand-dark tracking-tight">
                {effectiveAgencyName}
              </h2>
              <p className="text-xs sm:text-sm text-brand-dark/70 font-normal">
                Личный кабинет модельного агентства. Приглашайте моделей, управляйте внутренней базой и отправляйте кастинг-рассылки всей базе или выбранным моделям.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <div className="px-5 py-3 rounded-2xl bg-brand-light border border-brand-dark/10 text-center min-w-[110px]">
                <div className="text-2xl sm:text-3xl font-serif font-bold text-brand-dark flex items-center justify-center gap-1">
                  <span>{confirmedModels.length}</span>
                  <ModelVerifiedBadge size="xs" />
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-brand-dark/60 font-semibold mt-0.5">
                  Подтверждено
                </div>
              </div>

              {pendingModels.length > 0 && (
                <div className="px-5 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-center min-w-[110px]">
                  <div className="text-2xl sm:text-3xl font-serif font-bold text-amber-900 flex items-center justify-center gap-1">
                    <span>{pendingModels.length}</span>
                    <Clock size={16} className="text-amber-700" />
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-amber-800 font-semibold mt-0.5">
                    Ждут подтверждения
                  </div>
                </div>
              )}

              <div className="px-5 py-3 rounded-2xl bg-brand-light border border-brand-dark/10 text-center min-w-[110px]">
                <div className="text-2xl sm:text-3xl font-serif font-bold text-brand-dark flex items-center justify-center gap-1">
                  <span>{broadcastsList.length}</span>
                  <Radio size={16} className="text-brand-accent" />
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-brand-dark/60 font-semibold mt-0.5">
                  Рассылок
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Navigation Pill Bar */}
          <div className="border-b border-brand-dark/[0.08] pb-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="inline-flex p-1.5 rounded-full bg-white border border-brand-dark/[0.08] shadow-2xs gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setAgencyTab('roster')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs uppercase tracking-wider transition-all ${
                  agencyTab === 'roster'
                    ? 'bg-brand-dark text-white shadow-2xs'
                    : 'text-brand-dark/70 hover:text-brand-dark'
                }`}
              >
                <Users size={14} />
                <span>База моделей ({confirmedModels.length})</span>
                {pendingModels.length > 0 && (
                  <span className="bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold">
                    +{pendingModels.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAgencyTab('search')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs uppercase tracking-wider transition-all ${
                  agencyTab === 'search'
                    ? 'bg-brand-accent text-white shadow-2xs'
                    : 'text-brand-dark/70 hover:text-brand-dark'
                }`}
              >
                <UserPlus size={14} />
                <span>Найти и пригласить модель</span>
              </button>

              <button
                type="button"
                onClick={() => setAgencyTab('broadcasts')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs uppercase tracking-wider transition-all ${
                  agencyTab === 'broadcasts'
                    ? 'bg-brand-dark text-white shadow-2xs'
                    : 'text-brand-dark/70 hover:text-brand-dark'
                }`}
              >
                <Radio size={14} />
                <span>Рассылка для моделей</span>
              </button>
            </div>
          </div>

          {/* SUB-TAB 1: AGENCY MODEL ROSTER */}
          {agencyTab === 'roster' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* 1A. PENDING CONFIRMATIONS FROM MODELS (IF ANY) */}
              {pendingModels.length > 0 && (
                <div className="p-5 sm:p-6 rounded-3xl border-2 border-amber-300 bg-amber-50/60 space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-amber-900 font-bold uppercase tracking-wider text-xs">
                      <Clock size={16} className="text-amber-700" />
                      <span>Ожидают подтверждения от модели ({pendingModels.length})</span>
                    </div>
                    <span className="text-[11px] font-mono text-amber-800">
                      Модель должна принять приглашение в своем профиле
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pendingModels.map(model => (
                      <div
                        key={model.id}
                        className="bg-white rounded-2xl border border-amber-200 p-4 flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={model.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${model.id}`}
                            alt={model.name || 'Model'}
                            className="w-11 h-11 rounded-full object-cover border border-amber-300 shrink-0"
                          />
                          <div className="min-w-0">
                            <h5 className="text-sm font-serif font-bold text-brand-dark truncate">
                              {model.name || 'Модель'}
                            </h5>
                            <p className="font-mono text-xs text-brand-dark/50 truncate">
                              {model.handle || (model.username ? `@${model.username}` : `@${model.email?.split('@')[0]}`)}
                            </p>
                            <span className="inline-block text-[9px] font-mono text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded-full mt-0.5">
                              ⏳ Ждет подтверждения модели
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCancelInvitation(model)}
                          className="px-3 py-1.5 rounded-full border border-red-300 text-red-700 hover:bg-red-50 text-[11px] font-semibold uppercase tracking-wider transition-colors shrink-0"
                        >
                          Отозвать
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 1B. CONFIRMED MODELS IN ROSTER */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-brand-dark/[0.08]">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-serif font-normal text-brand-dark">
                      Официальный состав моделей агентства «{effectiveAgencyName}» ({confirmedModels.length})
                    </h3>
                    <p className="text-xs text-brand-dark/60 mt-0.5">
                      Модели, подтвердившие добавление в базу агентства. Возле их имени на платформе отображается подтвержденный статус со смайликом в очках <strong className="text-brand-dark font-mono font-bold">😎</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAgencyTab('search')}
                    className="px-4 py-2 rounded-full bg-brand-accent text-white text-xs font-semibold uppercase tracking-wider hover:bg-brand-dark transition-colors flex items-center gap-1.5 shadow-2xs shrink-0 self-start sm:self-auto"
                  >
                    <UserPlus size={14} />
                    <span>+ Пригласить модель</span>
                  </button>
                </div>

                {loadingModels ? (
                  <div className="py-16 text-center font-mono text-xs text-brand-dark/60">
                    Загрузка базы моделей агентства...
                  </div>
                ) : confirmedModels.length === 0 ? (
                  <div className="p-10 sm:p-14 text-center rounded-3xl border-2 border-dashed border-brand-dark/15 bg-white space-y-4">
                    <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-300 flex items-center justify-center mx-auto text-2xl">
                      😎
                    </div>
                    <h4 className="text-lg font-serif font-medium text-brand-dark">
                      В официальной базе пока нет подтвержденных моделей
                    </h4>
                    <p className="text-xs sm:text-sm text-brand-dark/60 max-w-md mx-auto">
                      Найдите моделей через поиск и отправьте приглашение. Когда модель подтвердит запрос со своей страницы, она будет добавлена в состав агентства и получит знак отличия <strong className="text-brand-dark">😎</strong>!
                    </p>
                    <button
                      type="button"
                      onClick={() => setAgencyTab('search')}
                      className="px-6 py-2.5 rounded-full bg-brand-dark text-white font-semibold text-xs uppercase tracking-wider hover:bg-brand-accent transition-colors shadow-xs"
                    >
                      Найти и пригласить модель
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {confirmedModels.map(model => (
                      <div
                        key={model.id}
                        className="bg-white rounded-2xl border border-brand-dark/[0.08] p-5 shadow-xs hover:border-brand-dark/25 transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          {/* Avatar & Badges */}
                          <div className="flex items-center gap-3.5">
                            <img
                              src={model.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${model.id}`}
                              alt={model.name || 'Model'}
                              className="w-14 h-14 rounded-full object-cover border-2 border-brand-dark/15 bg-brand-muted shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-base font-serif font-bold text-brand-dark truncate">
                                  {model.name || 'Модель'}
                                </h4>
                                <ModelVerifiedBadge size="sm" />
                              </div>
                              <p className="font-mono text-xs text-brand-accent font-semibold truncate">
                                {model.handle || (model.username ? `@${model.username}` : `@${model.email?.split('@')[0]}`)}
                              </p>
                              <span className="inline-block text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full mt-1">
                                Резидент «{effectiveAgencyName}»
                              </span>
                            </div>
                          </div>

                          {/* Bio or details */}
                          {model.bio && (
                            <p className="text-xs text-brand-dark/70 line-clamp-2 italic">
                              &quot;{model.bio}&quot;
                            </p>
                          )}

                          <div className="pt-2 border-t border-brand-dark/[0.06] text-[11px] font-mono text-brand-dark/60 space-y-1">
                            <div>
                              <span className="text-brand-dark/40">Email:</span> {model.email}
                            </div>
                            {model.modelVerifiedAt && (
                              <div>
                                <span className="text-brand-dark/40">В базе с:</span> {new Date(model.modelVerifiedAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-brand-dark/[0.06] flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const u = model.handle?.replace(/^@+/, '') || model.username || model.id;
                              navigate(`/@${u}`);
                            }}
                            className="text-xs font-semibold uppercase tracking-wider text-brand-dark hover:text-brand-accent flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink size={12} />
                            <span>Профиль</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => navigate(`/messages?userId=${model.id}&name=${encodeURIComponent(model.name || 'Model')}`)}
                              title="Написать сообщение модели"
                              className="p-2 rounded-full bg-brand-muted/40 hover:bg-brand-dark hover:text-white transition-colors text-brand-dark"
                            >
                              <MessageSquare size={13} />
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => handleRemoveModelFromRoster(model)}
                              title="Исключить из базы агентства (снять знак 😎)"
                              className="p-2 rounded-full bg-red-50 text-red-700 hover:bg-red-700 hover:text-white transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-TAB 2: SEARCH & INVITE MODELS */}
          {agencyTab === 'search' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="pb-3 border-b border-brand-dark/[0.08]">
                <h3 className="text-xl sm:text-2xl font-serif font-normal text-brand-dark">
                  Поиск и приглашение моделей в состав агентства
                </h3>
                <p className="text-xs text-brand-dark/60 mt-0.5">
                  Найдите модель по имени, никнейму (<code className="bg-brand-light px-1 font-mono">@handle</code>) или email. Модель получит уведомление и запрос на подтверждение со своей страницы. Одна модель не может принадлежать двум агентствам одновременно.
                </p>
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearchUsers} className="flex gap-2 max-w-2xl">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-dark/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Введите никнейм (@handle), имя или email..."
                    className="w-full pl-10 pr-4 py-3 bg-white border-2 border-brand-dark rounded-xl text-sm font-semibold text-brand-dark placeholder:text-brand-dark/40 focus:outline-none focus:border-brand-accent shadow-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searchingUsers}
                  className="px-6 py-3 rounded-xl bg-brand-dark text-white font-semibold text-xs uppercase tracking-wider hover:bg-brand-accent transition-colors shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {searchingUsers ? 'Поиск...' : 'Найти'}
                </button>
              </form>

              {/* Results List */}
              {searchingUsers ? (
                <div className="py-12 text-center font-mono text-xs text-brand-dark/60">
                  Поиск кандидатов по базе платформы...
                </div>
              ) : hasSearched && searchResults.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-brand-dark/20 bg-white">
                  <p className="text-sm font-medium text-brand-dark/70">
                    Пользователи по запросу «{searchQuery}» не найдены. Попробуйте ввести никнейм без @ или часть имени.
                  </p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/60">
                    Найдено пользователей: {searchResults.length}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults.map(resultUser => {
                      const isConfirmedInOtherAgency = resultUser.hasModelBadge && resultUser.modelAgencyName && resultUser.modelAgencyName.trim().toLowerCase() !== effectiveAgencyName.trim().toLowerCase();
                      const isConfirmedInThisAgency = resultUser.hasModelBadge && resultUser.modelAgencyName?.trim().toLowerCase() === effectiveAgencyName.trim().toLowerCase();
                      const isPendingInThisAgency = !resultUser.hasModelBadge && (resultUser.modelAgencyName?.trim().toLowerCase() === effectiveAgencyName.trim().toLowerCase() || pendingInvitations.some(inv => inv.modelUserId === resultUser.id));
                      const isInviting = invitingModelId === resultUser.id;

                      return (
                        <div
                          key={resultUser.id}
                          className="bg-white rounded-2xl border border-brand-dark/[0.08] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs hover:border-brand-dark/20 transition-all"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <img
                              src={resultUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${resultUser.id}`}
                              alt={resultUser.name || 'User'}
                              className="w-12 h-12 rounded-full object-cover border-2 border-brand-dark/10 bg-brand-muted shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-base font-serif font-bold text-brand-dark truncate">
                                  {resultUser.name || 'Fashionista'}
                                </h4>
                                {resultUser.hasModelBadge && (
                                  <ModelVerifiedBadge size="xs" />
                                )}
                              </div>
                              <p className="font-mono text-xs text-brand-accent font-semibold truncate">
                                {resultUser.handle || (resultUser.username ? `@${resultUser.username}` : `@${resultUser.email?.split('@')[0]}`)}
                              </p>
                              {resultUser.industry && (
                                <p className="text-[11px] text-brand-dark/60 capitalize mt-0.5">
                                  {resultUser.industry === 'model' ? '🌟 Модель' : resultUser.industry}
                                </p>
                              )}
                              <Link
                                to={`/@${resultUser.handle?.replace(/^@+/, '') || resultUser.username || resultUser.id}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 text-[11px] font-mono text-brand-dark hover:text-brand-accent transition-colors mt-1 font-semibold uppercase tracking-wider"
                              >
                                <ExternalLink size={11} /> Профиль
                              </Link>
                            </div>
                          </div>

                          <div className="shrink-0 self-end sm:self-auto">
                            {isConfirmedInThisAgency ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold uppercase tracking-wider font-mono">
                                <Check size={13} /> В вашей базе (😎)
                              </span>
                            ) : isConfirmedInOtherAgency ? (
                              <div className="text-right">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 border border-red-300 text-red-800 text-[11px] font-semibold font-mono">
                                  <Lock size={12} /> В агентстве «{resultUser.modelAgencyName}»
                                </span>
                                <p className="text-[10px] text-red-700/70 mt-0.5 max-w-[200px] leading-tight">
                                  Одна модель не может быть у двух агентств
                                </p>
                              </div>
                            ) : isPendingInThisAgency ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold uppercase tracking-wider font-mono">
                                <Clock size={13} /> Ждет подтверждения модели
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isInviting}
                                onClick={() => handleInviteModelToRoster(resultUser)}
                                className="px-4 py-2 rounded-full bg-[#7a0000] text-white text-xs font-bold uppercase tracking-wider hover:bg-brand-dark transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                              >
                                {isInviting ? (
                                  <span>Отправка...</span>
                                ) : (
                                  <>
                                    <span>+ Пригласить в агентство</span>
                                    <span className="text-sm">😎</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* SUB-TAB 3: BROADCASTS & ANNOUNCEMENTS (ALL OR SPECIFIC MODELS) */}
          {agencyTab === 'broadcasts' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="pb-3 border-b border-brand-dark/[0.08]">
                <h3 className="text-xl sm:text-2xl font-serif font-normal text-brand-dark">
                  Рассылка для моделей агентства «{effectiveAgencyName}»
                </h3>
                <p className="text-xs text-brand-dark/60 mt-0.5">
                  Отправляйте срочные кастинги, графики примерок и уведомления всей вашей базе или выберите конкретных моделей. Модели мгновенно получают пуш-уведомление в свой раздел «Уведомления».
                </p>
              </div>

              {/* Broadcast Composer Form */}
              <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 shadow-xs max-w-3xl space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-brand-dark/[0.06]">
                  <Radio size={18} className="text-brand-accent animate-pulse" />
                  <h4 className="text-base font-serif font-bold uppercase tracking-wider text-brand-dark">
                    Новая рассылка для моделей
                  </h4>
                </div>

                <form onSubmit={handleSendBroadcast} className="space-y-5">
                  {/* AUDIENCE SELECTOR: ALL OR CUSTOM MODELS */}
                  <div className="p-4 bg-brand-light rounded-2xl border-2 border-brand-dark space-y-3">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark block">
                      Кому отправить рассылку:
                    </label>

                    <div className="flex items-center gap-4 flex-wrap">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-brand-dark">
                        <input
                          type="radio"
                          name="broadcastAudience"
                          value="all"
                          checked={broadcastAudience === 'all'}
                          onChange={() => setBroadcastAudience('all')}
                          className="w-4 h-4 text-[#7a0000] focus:ring-[#7a0000] cursor-pointer"
                        />
                        <span>Всем подтвержденным моделям базы ({confirmedModels.length})</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-brand-dark">
                        <input
                          type="radio"
                          name="broadcastAudience"
                          value="custom"
                          checked={broadcastAudience === 'custom'}
                          onChange={() => setBroadcastAudience('custom')}
                          className="w-4 h-4 text-[#7a0000] focus:ring-[#7a0000] cursor-pointer"
                        />
                        <span>Выбрать конкретных моделей ({selectedModelIds.length} выбрано)</span>
                      </label>
                    </div>

                    {/* CUSTOM MODELS SELECTOR CHECKBOX LIST */}
                    {broadcastAudience === 'custom' && (
                      <div className="pt-3 border-t border-brand-dark/10 space-y-2.5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[11px] font-mono font-bold text-brand-dark/70 uppercase">
                            Выберите получателей:
                          </span>
                          <div className="flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={selectAllModels}
                              className="text-brand-accent hover:underline font-mono font-semibold"
                            >
                              Выбрать всех ({confirmedModels.length})
                            </button>
                            <span className="text-brand-dark/30">|</span>
                            <button
                              type="button"
                              onClick={deselectAllModels}
                              className="text-brand-dark/60 hover:underline font-mono font-semibold"
                            >
                              Снять выбор
                            </button>
                          </div>
                        </div>

                        {confirmedModels.length === 0 ? (
                          <p className="text-xs text-brand-dark/50 italic py-2">
                            В вашей базе пока нет подтвержденных моделей.
                          </p>
                        ) : (
                          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-brand-dark/15 rounded-xl p-2 bg-white">
                            {confirmedModels.map(m => {
                              const isSelected = selectedModelIds.includes(m.id);
                              return (
                                <div
                                  key={m.id}
                                  onClick={() => toggleSelectModel(m.id)}
                                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                    isSelected ? 'bg-brand-accent/10 border border-brand-accent/30' : 'hover:bg-brand-muted/40 border border-transparent'
                                  }`}
                                >
                                  <div className="shrink-0 text-brand-accent">
                                    {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-brand-dark/40" />}
                                  </div>
                                  <img
                                    src={m.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.id}`}
                                    alt={m.name || 'Model'}
                                    className="w-7 h-7 rounded-full object-cover border border-brand-dark/15"
                                  />
                                  <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                                    <span className="text-xs font-serif font-bold text-brand-dark truncate">
                                      {m.name || 'Модель'}
                                    </span>
                                    <span className="text-[10px] font-mono text-brand-dark/50 truncate">
                                      {m.handle || (m.username ? `@${m.username}` : '')}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark">
                        Категория рассылки:
                      </label>
                      <select
                        value={broadcastCategory}
                        onChange={e => setBroadcastCategory(e.target.value as any)}
                        className="w-full bg-brand-light border-2 border-brand-dark p-3 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-brand-accent"
                      >
                        <option value="casting">🎬 Кастинг / Съемка лукбука</option>
                        <option value="fitting">👗 Примерка одежды (Fitting)</option>
                        <option value="runway">👠 Показ / Fashion Week Runway</option>
                        <option value="general">📢 Важное внутреннее объявление</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark">
                        Срок ответа / Дедлайн:
                      </label>
                      <input
                        type="text"
                        value={broadcastDeadline}
                        onChange={e => setBroadcastDeadline(e.target.value)}
                        placeholder="Например: до 18:00 пятницы"
                        className="w-full bg-white border-2 border-brand-dark p-2.5 text-xs font-semibold focus:outline-none focus:border-brand-accent"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark">
                      Тема / Заголовок рассылки:
                    </label>
                    <input
                      type="text"
                      required
                      value={broadcastTitle}
                      onChange={e => setBroadcastTitle(e.target.value)}
                      placeholder="Например: Срочный кастинг на показ Baku Fashion Week FW26"
                      className="w-full bg-white border-2 border-brand-dark p-3 text-sm font-semibold focus:outline-none focus:border-brand-accent"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark">
                      Текст сообщения (отправляется в раздел уведомлений):
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={broadcastMessage}
                      onChange={e => setBroadcastMessage(e.target.value)}
                      placeholder="Подробности кастинга, требования к внешнему виду (black outfit, каблуки), точный адрес студии и время прибытия..."
                      className="w-full bg-white border-2 border-brand-dark p-3 text-xs font-semibold focus:outline-none focus:border-brand-accent"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark">
                      Ссылка на бриф / локацию (опционально):
                    </label>
                    <input
                      type="url"
                      value={broadcastLink}
                      onChange={e => setBroadcastLink(e.target.value)}
                      placeholder="https://maps.google.com/... или ссылка на бриф"
                      className="w-full bg-white border-2 border-brand-dark p-2.5 text-xs font-semibold focus:outline-none focus:border-brand-accent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sendingBroadcast || (broadcastAudience === 'custom' && selectedModelIds.length === 0) || confirmedModels.length === 0}
                    className="w-full py-3.5 rounded-full bg-brand-dark text-white font-semibold text-xs uppercase tracking-wider hover:bg-brand-accent transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Send size={14} />
                    <span>
                      {sendingBroadcast
                        ? 'Отправка рассылки...'
                        : broadcastAudience === 'all'
                        ? `Отправить рассылку всей базе (${confirmedModels.length} моделей)`
                        : `Отправить рассылку выбранным моделям (${selectedModelIds.length})`}
                    </span>
                  </button>
                </form>
              </div>

              {/* History of Previous Broadcasts */}
              {broadcastsList.length > 0 && (
                <div className="space-y-4 max-w-3xl">
                  <h4 className="text-base font-serif font-bold uppercase tracking-wider text-brand-dark">
                    История отправленных рассылок ({broadcastsList.length})
                  </h4>

                  <div className="space-y-3">
                    {broadcastsList.map(b => (
                      <div
                        key={b.id}
                        className="bg-white rounded-2xl border border-brand-dark/[0.08] p-5 shadow-xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-brand-light px-2.5 py-0.5 border border-brand-dark/15 text-brand-dark">
                            {b.category || 'Объявление'}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-mono text-brand-dark/50">
                              {new Date(b.createdAt).toLocaleDateString()} &middot; {b.recipientCount} получателей
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteBroadcast(b.id, b.title)}
                              className="p-1.5 rounded-lg border border-red-500/20 text-red-600 hover:bg-red-50 hover:border-red-500/40 transition-colors flex items-center justify-center cursor-pointer"
                              title="Удалить рассылку"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <h5 className="text-base font-serif font-bold text-brand-dark">
                          {b.title}
                        </h5>
                        <p className="text-xs text-brand-dark/80 whitespace-pre-wrap">
                          {b.message}
                        </p>
                        {b.link && (
                          <a
                            href={b.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-mono text-brand-accent hover:underline pt-1"
                          >
                            <ExternalLink size={12} /> {b.link}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* CASE 2: NOT APPROVED YET (PENDING, REJECTED, OR NONE) */
        <div className="max-w-3xl mx-auto space-y-8">
          {/* NOTICE: REQUEST PENDING (7 DAYS PROMISE) */}
          {(isPending || justSubmitted) && (
            <div className="bg-[#fff9f9] rounded-3xl border-2 border-[#7a0000] p-6 sm:p-10 shadow-sm space-y-6 animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#7a0000] text-white flex items-center justify-center shrink-0">
                  <Clock size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#7a0000] bg-white px-2 py-0.5 border border-[#7a0000]/20 rounded-full">
                    СТАТУС: НА РАССМОТРЕНИИ
                  </span>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-brand-dark mt-1">
                    Ваш запрос принят и будет рассмотрен в течение 7 дней
                  </h2>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-brand-dark/75 leading-relaxed font-normal">
                Благодарим за подачу заявки. Администрация Azerbaijan Fashion Future проверяет подлинность предоставленных документов (şəxsiyyət vəsiqəsi) и регистрационные данные модельного агентства.
              </p>

              {/* Application Details Summary */}
              {existingApplication && (
                <div className="bg-white rounded-2xl border border-[#7a0000]/20 p-5 space-y-4">
                  <div className="font-serif font-bold text-sm text-brand-dark uppercase tracking-wider pb-2 border-b border-brand-dark/[0.06] flex items-center justify-between">
                    <span>Данные поданной заявки:</span>
                    <span className="font-mono text-[11px] text-brand-dark/50">
                      {existingApplication.createdAt ? new Date(existingApplication.createdAt).toLocaleDateString() : 'Сегодня'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-brand-dark/80">
                    <div>
                      <strong className="text-brand-dark">Агентство:</strong> {existingApplication.agencyName}
                    </div>
                    <div>
                      <strong className="text-brand-dark">Представитель:</strong> {existingApplication.applicantFirstName} {existingApplication.applicantLastName} {existingApplication.applicantPatronymic || ''}
                    </div>
                    <div>
                      <strong className="text-brand-dark">Телефон:</strong> {existingApplication.phoneNumber || '—'}
                    </div>
                    <div>
                      <strong className="text-brand-dark">Email:</strong> {existingApplication.userEmail}
                    </div>
                    {existingApplication.agencyAddress && (
                      <div>
                        <strong className="text-brand-dark">Адрес:</strong> {existingApplication.agencyAddress}
                      </div>
                    )}
                    {existingApplication.foundingYear && (
                      <div>
                        <strong className="text-brand-dark">Год основания:</strong> {existingApplication.foundingYear}
                      </div>
                    )}
                  </div>

                  {/* Submitted Photos Thumbnails */}
                  {(existingApplication.idCardPhotoUrl || existingApplication.personalPhotoUrl) && (
                    <div className="pt-3 border-t border-brand-dark/[0.06] flex items-center gap-4 flex-wrap">
                      {existingApplication.idCardPhotoUrl && (
                        <div 
                          onClick={() => setZoomImage({ url: existingApplication.idCardPhotoUrl!, caption: 'Şəxsiyyət vəsiqəsi' })}
                          className="cursor-pointer group flex items-center gap-2 p-2 rounded-xl bg-brand-light border border-brand-dark/15 hover:border-brand-accent transition-all"
                        >
                          <img 
                            src={existingApplication.idCardPhotoUrl} 
                            alt="Şəxsiyyət vəsiqəsi" 
                            className="w-12 h-8 object-cover rounded-lg border border-brand-dark/20"
                          />
                          <span className="text-[11px] font-mono font-semibold text-brand-dark group-hover:text-brand-accent">
                            Şəxsiyyət vəsiqəsi 🔍
                          </span>
                        </div>
                      )}

                      {existingApplication.personalPhotoUrl && (
                        <div 
                          onClick={() => setZoomImage({ url: existingApplication.personalPhotoUrl!, caption: 'Личное фото заявителя' })}
                          className="cursor-pointer group flex items-center gap-2 p-2 rounded-xl bg-brand-light border border-brand-dark/15 hover:border-brand-accent transition-all"
                        >
                          <img 
                            src={existingApplication.personalPhotoUrl} 
                            alt="Личное фото" 
                            className="w-10 h-10 object-cover rounded-full border border-brand-dark/20"
                          />
                          <span className="text-[11px] font-mono font-semibold text-brand-dark group-hover:text-brand-accent">
                            Личное фото 🔍
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="p-4 bg-brand-light border border-brand-dark/10 rounded-2xl text-xs text-brand-dark/70 font-medium">
                💡 <strong>Что произойдет после одобрения:</strong> ваш профиль получит официальный знак модельного агентства, а в этом разделе откроется поиск моделей, закрытая база и функция рассылок. Когда приглашенная вами модель подтвердит добавление со своей страницы, возле ее имени появится значок в очках <strong className="text-brand-dark">😎</strong>.
              </div>
            </div>
          )}

          {/* NOTICE: REJECTED STATUS */}
          {isRejected && (
            <div className="bg-red-50 rounded-3xl border-2 border-red-300 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <AlertCircle size={24} className="text-red-700 shrink-0" />
                <h3 className="text-xl font-serif font-bold text-red-900">
                  Заявка на официальный статус агентства была отклонена
                </h3>
              </div>
              {existingApplication?.rejectionReason && (
                <div className="p-3 bg-white rounded-xl border border-red-200 text-xs text-red-800">
                  <strong>Причина отклонения:</strong> {existingApplication.rejectionReason}
                </div>
              )}
              <p className="text-xs text-red-800/80">
                Вы можете исправить указанные данные, загрузить корректные документы и отправить запрос повторно.
              </p>
              <button
                type="button"
                onClick={() => setShowApplyForm(true)}
                className="px-5 py-2.5 rounded-full bg-red-800 text-white font-semibold text-xs uppercase tracking-wider hover:bg-black transition-colors"
              >
                Подать запрос повторно
              </button>
            </div>
          )}

          {/* APPLICATION CTA BLOCK (WHEN NOT PENDING AND NOT JUST SUBMITTED) */}
          {!isPending && !justSubmitted && !showApplyForm && (
            <div className="bg-white rounded-3xl border-2 border-brand-dark p-6 sm:p-10 shadow-md space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-brand-light border-2 border-brand-dark flex items-center justify-center mx-auto text-brand-dark">
                <Building2 size={30} />
              </div>

              <div className="space-y-2">
                <span className="bg-brand-accent text-white px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest">
                  AGENCY VERIFICATION
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-brand-dark">
                  Подтвердите, что вы являетесь представителем модельного агентства
                </h2>
                <p className="text-xs sm:text-sm text-brand-dark/70 max-w-lg mx-auto font-normal">
                  Для защиты от спама и несанкционированного доступа к базе моделей, подтвердите ваши полномочия официального представителя агентства.
                </p>
              </div>

              {/* Verification Form Trigger Button */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowApplyForm(true)}
                  className="px-8 py-4 rounded-full bg-[#7a0000] text-white font-bold text-xs uppercase tracking-widest hover:bg-black transition-all shadow-md hover:scale-[1.02] cursor-pointer inline-flex items-center gap-2"
                >
                  <ShieldCheck size={16} />
                  <span>Подтвердить статус представителя агентства</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-4 border-t border-brand-dark/[0.08]">
                <div className="p-3 bg-brand-light rounded-xl border border-brand-dark/10 space-y-1">
                  <div className="text-[11px] font-bold text-brand-dark uppercase tracking-wider flex items-center gap-1">
                    <Check size={13} className="text-emerald-700" /> Официальный знак
                  </div>
                  <p className="text-[10px] text-brand-dark/60">Знак агентства в профиле и каталоге</p>
                </div>

                <div className="p-3 bg-brand-light rounded-xl border border-brand-dark/10 space-y-1">
                  <div className="text-[11px] font-bold text-brand-dark uppercase tracking-wider flex items-center gap-1">
                    <Check size={13} className="text-emerald-700" /> База моделей
                  </div>
                  <p className="text-[10px] text-brand-dark/60">Приглашение моделей со значком 😎</p>
                </div>

                <div className="p-3 bg-brand-light rounded-xl border border-brand-dark/10 space-y-1">
                  <div className="text-[11px] font-bold text-brand-dark uppercase tracking-wider flex items-center gap-1">
                    <Check size={13} className="text-emerald-700" /> Кастинг-рассылки
                  </div>
                  <p className="text-[10px] text-brand-dark/60">Всем или выбранным моделям</p>
                </div>
              </div>
            </div>
          )}

          {/* APPLICATION FORM MODAL / INLINE VIEW */}
          {showApplyForm && !isPending && !justSubmitted && (
            <div className="bg-white rounded-3xl border-2 border-[#7a0000] p-6 sm:p-10 shadow-lg space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-4 border-b border-brand-dark/[0.08]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-[#7a0000] text-white px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest">
                      Анкета представителя
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-serif font-bold text-brand-dark">
                    Подтверждение представителя модельного агентства
                  </h3>
                  <p className="text-xs text-brand-dark/60 mt-0.5">
                    Заполните ваши данные и загрузите документы. Срок рассмотрения: до 7 дней.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowApplyForm(false)}
                  className="w-8 h-8 rounded-full border border-brand-dark/20 flex items-center justify-center hover:bg-brand-dark hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmitApplication} className="space-y-6">
                {/* 1. DOCUMENT & SELFIE PHOTO UPLOADS */}
                <div className="space-y-3 p-5 bg-brand-light rounded-2xl border-2 border-brand-dark">
                  <div className="font-serif font-bold text-xs uppercase tracking-wider text-brand-dark flex items-center gap-2">
                    <FileText size={15} className="text-brand-accent" />
                    <span>1. Загрузка документов и фотографии (*Обязательно)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* ID CARD PHOTO (Şəxsiyyət vəsiqəsi) */}
                    <div className="space-y-2">
                      <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark flex items-center justify-between">
                        <span>Фото şəxsiyyət vəsiqəsi:</span>
                        <span className="text-brand-accent text-[10px]">*Обязательно</span>
                      </label>

                      {idCardPhotoUrl ? (
                        <div className="relative group rounded-xl overflow-hidden border-2 border-brand-dark bg-white">
                          <img
                            src={idCardPhotoUrl}
                            alt="Şəxsiyyət vəsiqəsi"
                            className="w-full h-36 object-cover cursor-pointer"
                            onClick={() => setZoomImage({ url: idCardPhotoUrl, caption: 'Şəxsiyyət vəsiqəsi' })}
                          />
                          <div className="absolute inset-0 bg-brand-dark/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => idCardInputRef.current?.click()}
                              className="px-3 py-1 bg-white text-brand-dark text-xs font-mono font-bold uppercase tracking-wider rounded-full hover:bg-brand-accent hover:text-white"
                            >
                              Заменить
                            </button>
                            <button
                              type="button"
                              onClick={() => setIdCardPhotoUrl('')}
                              className="p-1 bg-red-600 text-white rounded-full hover:bg-red-800"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => idCardInputRef.current?.click()}
                          disabled={idCardUploading}
                          className="w-full h-36 border-2 border-dashed border-brand-dark/40 hover:border-brand-accent rounded-xl flex flex-col items-center justify-center p-4 bg-white transition-all text-center group cursor-pointer"
                        >
                          <Upload size={22} className="text-brand-dark/40 group-hover:text-brand-accent mb-2" />
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-dark">
                            {idCardUploading ? 'Загрузка фото...' : 'Загрузить фото şəxsiyyət vəsiqəsi'}
                          </span>
                          <span className="text-[10px] text-brand-dark/50 mt-1 font-mono">
                            JPG, PNG, WebP (Max 15MB)
                          </span>
                        </button>
                      )}
                    </div>

                    {/* PERSONAL PHOTO (Selfie) */}
                    <div className="space-y-2">
                      <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark flex items-center justify-between">
                        <span>Фото свое (Личное фото представителя):</span>
                        <span className="text-brand-accent text-[10px]">*Обязательно</span>
                      </label>

                      {personalPhotoUrl ? (
                        <div className="relative group rounded-xl overflow-hidden border-2 border-brand-dark bg-white">
                          <img
                            src={personalPhotoUrl}
                            alt="Личное фото"
                            className="w-full h-36 object-cover cursor-pointer"
                            onClick={() => setZoomImage({ url: personalPhotoUrl, caption: 'Личное фото заявителя' })}
                          />
                          <div className="absolute inset-0 bg-brand-dark/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => personalPhotoInputRef.current?.click()}
                              className="px-3 py-1 bg-white text-brand-dark text-xs font-mono font-bold uppercase tracking-wider rounded-full hover:bg-brand-accent hover:text-white"
                            >
                              Заменить
                            </button>
                            <button
                              type="button"
                              onClick={() => setPersonalPhotoUrl('')}
                              className="p-1 bg-red-600 text-white rounded-full hover:bg-red-800"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => personalPhotoInputRef.current?.click()}
                          disabled={personalPhotoUploading}
                          className="w-full h-36 border-2 border-dashed border-brand-dark/40 hover:border-brand-accent rounded-xl flex flex-col items-center justify-center p-4 bg-white transition-all text-center group cursor-pointer"
                        >
                          <Upload size={22} className="text-brand-dark/40 group-hover:text-brand-accent mb-2" />
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-dark">
                            {personalPhotoUploading ? 'Загрузка фото...' : 'Загрузить свое личное фото'}
                          </span>
                          <span className="text-[10px] text-brand-dark/50 mt-1 font-mono">
                            Портрет / Селфи хорошего качества
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. REPRESENTATIVE PERSONAL DETAILS */}
                <div className="space-y-4">
                  <div className="font-serif font-bold text-xs uppercase tracking-wider text-brand-dark pb-1 border-b border-brand-dark/[0.08]">
                    2. Личные данные заявителя
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark">
                        Имя: *
                      </label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="Например: Лейла"
                        className="w-full bg-white border-2 border-brand-dark p-2.5 text-xs font-bold text-brand-dark focus:outline-none focus:border-brand-accent"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark">
                        Фамилия: *
                      </label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        placeholder="Например: Мамедова"
                        className="w-full bg-white border-2 border-brand-dark p-2.5 text-xs font-bold text-brand-dark focus:outline-none focus:border-brand-accent"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark">
                        Отчество: *
                      </label>
                      <input
                        type="text"
                        required
                        value={patronymic}
                        onChange={e => setPatronymic(e.target.value)}
                        placeholder="Например: Рашид кызы"
                        className="w-full bg-white border-2 border-brand-dark p-2.5 text-xs font-bold text-brand-dark focus:outline-none focus:border-brand-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark">
                        Номер телефона: *
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+994 50 123 45 67"
                        className="w-full bg-white border-2 border-brand-dark p-2.5 text-xs font-bold text-brand-dark focus:outline-none focus:border-brand-accent"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark">
                        Почта (Email): *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="agency@example.com"
                        className="w-full bg-white border-2 border-brand-dark p-2.5 text-xs font-bold text-brand-dark focus:outline-none focus:border-brand-accent"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. AGENCY DETAILS */}
                <div className="space-y-4">
                  <div className="font-serif font-bold text-xs uppercase tracking-wider text-brand-dark pb-1 border-b border-brand-dark/[0.08]">
                    3. Данные модельного агентства
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark">
                        Название модельного агентства: *
                      </label>
                      <input
                        type="text"
                        required
                        value={agencyName}
                        onChange={e => setAgencyName(e.target.value)}
                        placeholder="Например: Baku Models, Venera Agency"
                        className="w-full bg-white border-2 border-brand-dark p-2.5 text-xs font-bold text-brand-dark focus:outline-none focus:border-brand-accent"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark">
                        Год основания агентства: *
                      </label>
                      <input
                        type="number"
                        required
                        min="1950"
                        max="2026"
                        value={foundingYear}
                        onChange={e => setFoundingYear(e.target.value)}
                        placeholder="Например: 2018"
                        className="w-full bg-white border-2 border-brand-dark p-2.5 text-xs font-bold text-brand-dark focus:outline-none focus:border-brand-accent"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark flex items-center justify-between">
                      <span>Адрес модельного агентства:</span>
                      <span className="text-[10px] text-brand-dark/50 font-normal">(Можно оставить пустым)</span>
                    </label>
                    <input
                      type="text"
                      value={agencyAddress}
                      onChange={e => setAgencyAddress(e.target.value)}
                      placeholder="Например: г. Баку, ул. Низами 45 (необязательно)"
                      className="w-full bg-white border-2 border-brand-dark p-2.5 text-xs font-semibold text-brand-dark focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <div className="pt-4 border-t border-brand-dark/[0.08] flex items-center justify-between gap-4 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowApplyForm(false)}
                    className="px-5 py-2.5 rounded-full border border-brand-dark/20 text-xs font-semibold uppercase tracking-wider hover:bg-brand-dark hover:text-white transition-colors"
                  >
                    Отмена
                  </button>

                  <button
                    type="submit"
                    disabled={submittingApp || idCardUploading || personalPhotoUploading}
                    className="px-8 py-3.5 rounded-full bg-[#7a0000] text-white font-bold text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <ShieldCheck size={16} />
                    <span>{submittingApp ? 'Отправка заявки...' : 'Отправить запрос на рассмотрение'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomImage && (
        <ImageZoomModal
          isOpen={true}
          imageUrl={zoomImage.url}
          caption={zoomImage.caption}
          onClose={() => setZoomImage(null)}
        />
      )}
    </div>
  );
}
