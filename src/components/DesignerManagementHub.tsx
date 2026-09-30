import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { 
  X, 
  Sparkles, 
  Check, 
  Globe, 
  Instagram, 
  Upload, 
  FileText, 
  Scissors, 
  Award, 
  MessageSquare, 
  ShieldCheck, 
  Phone, 
  MapPin, 
  Calendar, 
  AlertCircle,
  Clock,
  ExternalLink,
  Copy,
  ChevronRight,
  Eye,
  Send,
  Building2,
  CheckCircle2
} from 'lucide-react';
import GoldenNeedleBadge from './GoldenNeedleBadge';
import { uploadMediaFile } from '../lib/upload';
import { useNavigate } from 'react-router';
import { User as UserType } from '../types';

interface DesignerManagementHubProps {
  user: UserType;
  onStatusUpdated?: () => void;
}

export default function DesignerManagementHub({ user, onStatusUpdated }: DesignerManagementHubProps) {
  const { currentUser } = useAuth();
  const ui = useUI();
  const navigate = useNavigate();

  // Status flags
  const isApproved = user.designerVerificationStatus === 'approved' || Boolean(user.hasGoldenNeedle);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [loadingApp, setLoadingApp] = useState(true);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [copiedChatLink, setCopiedChatLink] = useState(false);

  // Zoom image modal
  const [zoomImage, setZoomImage] = useState<{ url: string; caption?: string } | null>(null);

  // File upload refs & states
  const [idCardUploading, setIdCardUploading] = useState(false);
  const [personalPhotoUploading, setPersonalPhotoUploading] = useState(false);
  const idCardInputRef = useRef<HTMLInputElement>(null);
  const personalPhotoInputRef = useRef<HTMLInputElement>(null);

  // Form states (same questions as model agency verification, tailored for designer)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [patronymic, setPatronymic] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [brandName, setBrandName] = useState('');
  const [foundingYear, setFoundingYear] = useState('2022');
  const [brandAddress, setBrandAddress] = useState('');
  const [designerRole, setDesignerRole] = useState('Creative Director / Head Designer');
  const [idCardPhotoUrl, setIdCardPhotoUrl] = useState('');
  const [personalPhotoUrl, setPersonalPhotoUrl] = useState('');
  const [instagram, setInstagram] = useState('');
  const [website, setWebsite] = useState('');
  const [comment, setComment] = useState('');
  const [submittingApp, setSubmittingApp] = useState(false);

  // Fetch user's application if existing
  const fetchUserApplication = async () => {
    if (!currentUser) return;
    setLoadingApp(true);
    try {
      const q = query(
        collection(db, 'designer_applications'),
        where('userId', '==', currentUser.uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        apps.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
        const latest = apps[0] as any;
        setExistingApplication(latest);

        // Pre-fill form values from previous application if needed
        if (latest) {
          setFirstName(latest.applicantFirstName || '');
          setLastName(latest.applicantLastName || '');
          setPatronymic(latest.applicantPatronymic || '');
          setPhone(latest.phoneNumber || '');
          setEmail(latest.userEmail || '');
          setBrandName(latest.brandName || '');
          setFoundingYear(latest.foundingYear || '2022');
          setBrandAddress(latest.brandAddress || '');
          setDesignerRole(latest.designerRole || 'Creative Director / Head Designer');
          setIdCardPhotoUrl(latest.idCardPhotoUrl || '');
          setPersonalPhotoUrl(latest.personalPhotoUrl || '');
          setInstagram(latest.instagram || '');
          setWebsite(latest.website || '');
          setComment(latest.comment || '');
        }
      }
    } catch (err) {
      console.error('Failed to fetch designer application:', err);
    } finally {
      setLoadingApp(false);
    }
  };

  useEffect(() => {
    fetchUserApplication();
  }, [currentUser]);

  // Sync initial user fields when empty
  useEffect(() => {
    if (user && !firstName && !lastName) {
      const nameParts = (user.name || '').trim().split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      setEmail(user.email || '');
      if (user.designerBrandName || user.brandName) {
        setBrandName(user.designerBrandName || user.brandName || '');
      }
      if (user.avatarUrl && !personalPhotoUrl) {
        setPersonalPhotoUrl(user.avatarUrl);
      }
    }
  }, [user]);

  const isPending = user.designerVerificationStatus === 'pending' || (existingApplication?.status === 'pending');
  const isRejected = user.designerVerificationStatus === 'rejected' || (existingApplication?.status === 'rejected' && !isApproved);

  // File upload handler
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, type: 'idCard' | 'personal') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      ui.alert('Размер файла не должен превышать 15MB');
      return;
    }

    if (type === 'idCard') setIdCardUploading(true);
    else setPersonalPhotoUploading(true);

    try {
      const url = await uploadMediaFile(file);
      if (type === 'idCard') {
        setIdCardPhotoUrl(url);
      } else {
        setPersonalPhotoUrl(url);
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      ui.alert('Ошибка загрузки фотографии: ' + (err.message || ''));
    } finally {
      if (type === 'idCard') setIdCardUploading(false);
      else setPersonalPhotoUploading(false);
    }
  };

  // Submit application
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!idCardPhotoUrl.trim()) {
      ui.alert('Пожалуйста, загрузите фотографию документа (şəxsiyyət vəsiqəsi). Это обязательно для верификации администраторами.');
      return;
    }
    if (!personalPhotoUrl.trim()) {
      ui.alert('Пожалуйста, загрузите личную фотографию заявителя (портрет/селфи).');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      ui.alert('Пожалуйста, укажите имя и фамилию дизайнера.');
      return;
    }
    if (!phone.trim()) {
      ui.alert('Пожалуйста, укажите контактный номер телефона.');
      return;
    }
    if (!brandName.trim()) {
      ui.alert('Пожалуйста, укажите официальное название бренда или модного дома.');
      return;
    }
    if (!foundingYear.trim()) {
      ui.alert('Пожалуйста, укажите год основания бренда.');
      return;
    }

    setSubmittingApp(true);
    try {
      const now = Date.now();
      const userHandle = user.handle || (user.username ? `@${user.username}` : `@${currentUser.email?.split('@')[0]}`);

      // 1. Create document in designer_applications
      const appRef = await addDoc(collection(db, 'designer_applications'), {
        userId: currentUser.uid,
        userEmail: email.trim() || currentUser.email || '',
        userHandle: userHandle,
        applicantFirstName: firstName.trim(),
        applicantLastName: lastName.trim(),
        applicantPatronymic: patronymic.trim(),
        phoneNumber: phone.trim(),
        brandName: brandName.trim(),
        brandAddress: brandAddress.trim(),
        foundingYear: foundingYear.trim(),
        idCardPhotoUrl: idCardPhotoUrl,
        personalPhotoUrl: personalPhotoUrl,
        idDocumentUrl: idCardPhotoUrl,
        designerRole: designerRole.trim(),
        instagram: instagram.trim(),
        website: website.trim(),
        comment: comment.trim(),
        location: brandAddress.trim() || 'Баку, Азербайджан',
        status: 'pending',
        createdAt: now
      });

      // 2. Update user profile to mark pending designer verification
      await updateDoc(doc(db, 'users', currentUser.uid), {
        designerVerificationStatus: 'pending',
        designerApplicationId: appRef.id,
        designerBrandName: brandName.trim(),
        isDesigner: true,
        industry: 'fashion_design'
      });

      setJustSubmitted(true);
      setShowApplyForm(false);
      await fetchUserApplication();
      onStatusUpdated?.();
      ui.alert('Ваша заявка дизайнера успешно отправлена! Администрация рассмотрит ее в панели управления. После одобрения вам будет присуждена Золотая Игла и открыт раздел Direct Chat.');
    } catch (err: any) {
      console.error('Error submitting designer application:', err);
      handleFirestoreError(err, OperationType.CREATE, 'designer_applications');
    } finally {
      setSubmittingApp(false);
    }
  };

  const effectiveBrandName = user.designerBrandName || user.brandName || existingApplication?.brandName || 'Fashion Brand';
  const directChatLink = `${window.location.origin}/messages?name=${encodeURIComponent(effectiveBrandName)}&userId=${user.id}`;

  const copyDirectChatLink = () => {
    navigator.clipboard.writeText(directChatLink);
    setCopiedChatLink(true);
    setTimeout(() => setCopiedChatLink(false), 2200);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HIDDEN FILE INPUTS */}
      <input 
        type="file" 
        ref={idCardInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={e => handleUploadFile(e, 'idCard')} 
      />
      <input 
        type="file" 
        ref={personalPhotoInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={e => handleUploadFile(e, 'personal')} 
      />

      {/* STATE 1: APPROVED DESIGNER HUB (SHOW DIRECT CHAT & GOLDEN NEEDLE SECTIONS) */}
      {isApproved && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* CELEBRATION BADGE BANNER */}
          <div className="bg-[#fffdf0] rounded-3xl border-2 border-amber-400/80 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-amber-400/30">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
                  <Scissors size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-amber-600 text-white text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                      Статус присвоен администрацией
                    </span>
                    <GoldenNeedleBadge size="sm" showLabel />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-brand-dark mt-1">
                    Официальный Дизайнер: {effectiveBrandName}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/designers?search=${encodeURIComponent(effectiveBrandName)}`)}
                className="px-4 py-2 bg-white border border-brand-dark/15 rounded-full text-xs font-mono font-bold uppercase tracking-wider hover:bg-brand-dark hover:text-white transition-colors flex items-center gap-1.5 shrink-0"
              >
                <span>В каталоге дизайнеров</span>
                <ExternalLink size={13} />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-brand-dark/80 mt-4 leading-relaxed font-medium">
              Ваш модный дом успешно верифицирован администрацией Azerbaijan Fashion Future. Вам торжественно присвоен знак признания <strong>«Золотая Игла» (Qızıl İynə)</strong>. Возле вашего имени и в каталоге отображается золотой знак, а раздел <strong>«Direct Chat»</strong> открыт для всех пользователей.
            </p>
          </div>

          {/* DEDICATED DIRECT CHAT WORKSPACE SECTION */}
          <div className="bg-white rounded-3xl border-2 border-brand-dark p-6 sm:p-8 md:p-10 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-brand-dark/[0.08]">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="bg-[#7a0000] text-white px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full flex items-center gap-1">
                    <MessageSquare size={12} /> Direct Chat Workspace
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Канал связи активен
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-brand-dark">
                  Раздел «Написать в Direct Chat»
                </h3>
                <p className="text-xs sm:text-sm text-brand-dark/70 mt-1">
                  Прямой защищенный мессенджер для общения с байерами, клиентами, моделями и организаторами показов.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/messages')}
                  className="px-6 py-3 rounded-full bg-[#7a0000] text-white font-mono font-bold text-xs uppercase tracking-wider hover:bg-black transition-colors shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Send size={14} />
                  <span>Открыть Direct Chat</span>
                </button>
              </div>
            </div>

            {/* Direct Chat Link & Public Access */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-brand-light rounded-2xl border border-brand-dark/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark flex items-center gap-1.5">
                    <Globe size={14} className="text-[#7a0000]" /> Прямая ссылка на ваш Direct Chat
                  </span>
                  <button
                    type="button"
                    onClick={copyDirectChatLink}
                    className="text-[11px] font-mono text-[#7a0000] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    {copiedChatLink ? (
                      <>
                        <Check size={13} className="text-emerald-600" />
                        <span className="text-emerald-700">Скопировано</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Копировать</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 bg-white border border-brand-dark/10 rounded-xl font-mono text-[11px] text-brand-dark/70 truncate select-all">
                  {directChatLink}
                </div>
                <p className="text-[11px] text-brand-dark/60 leading-relaxed">
                  Разместите эту ссылку в вашем Instagram, соцсетях или на визитках — клиенты смогут написать вам напрямую в один клик.
                </p>
              </div>

              <div className="p-5 bg-brand-light rounded-2xl border border-brand-dark/10 space-y-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-700" /> Статус доступности кнопки в профиле
                </span>
                <div className="p-3 bg-white border border-brand-dark/10 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-brand-dark">Кнопка «Написать в Direct Chat» отображается в профиле</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    ВКЛЮЧЕНО
                  </span>
                </div>
                <p className="text-[11px] text-brand-dark/60 leading-relaxed">
                  Посетители вашего профиля и каталога дизайнеров видят акцентную кнопку для начала диалога.
                </p>
              </div>
            </div>

            {/* QUICK ACTIONS ROW */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/messages')}
                className="px-5 py-2.5 rounded-full bg-brand-dark text-white font-mono font-semibold text-xs uppercase tracking-wider hover:bg-brand-accent transition-colors flex items-center gap-2"
              >
                <MessageSquare size={13} />
                <span>Все входящие диалоги</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(`/u/${user.handle?.replace(/^@+/, '') || user.username || user.id}`)}
                className="px-5 py-2.5 rounded-full border border-brand-dark/20 text-brand-dark font-mono font-semibold text-xs uppercase tracking-wider hover:bg-brand-dark hover:text-white transition-colors flex items-center gap-2"
              >
                <span>Просмотреть свой публичный профиль</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE 2: PENDING VERIFICATION NOTICE */}
      {isPending && !justSubmitted && (
        <div className="bg-white rounded-3xl border-2 border-amber-300 p-6 sm:p-8 md:p-10 shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
              <Clock size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] uppercase">
                  Рассмотрение: до 7 дней
                </span>
                <span className="text-xs font-mono text-brand-dark/50">
                  ID заявки: {existingApplication?.id || user.designerApplicationId || '—'}
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-brand-dark">
                Ваша анкета дизайнера находится на проверке
              </h3>
              <p className="text-xs sm:text-sm text-brand-dark/70 mt-1 leading-relaxed">
                Благодарим за подачу заявки. Администрация Azerbaijan Fashion Future проверяет подлинность предоставленных документов (şəxsiyyət vəsiqəsi) и регистрационные данные модного дома.
              </p>
            </div>
          </div>

          {/* Submitted dossier summary */}
          <div className="p-5 bg-brand-light rounded-2xl border border-brand-dark/10 space-y-4 text-xs">
            <div className="font-serif font-bold text-sm uppercase tracking-wider text-brand-dark pb-2 border-b border-brand-dark/10 flex items-center justify-between">
              <span>Паспортные и регистрационные данные заявки</span>
              <span className="font-mono text-[10px] text-brand-dark/50">
                Подано: {existingApplication?.createdAt ? new Date(existingApplication.createdAt).toLocaleDateString() : 'Недавно'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <span className="text-brand-dark/50 block font-mono text-[10px] uppercase">Бренд / Модный дом:</span>
                <strong className="text-brand-dark text-sm">{existingApplication?.brandName || brandName || '—'}</strong>
              </div>
              <div>
                <span className="text-brand-dark/50 block font-mono text-[10px] uppercase">Дизайнер (ФИО):</span>
                <strong className="text-brand-dark text-sm">
                  {existingApplication?.applicantFirstName || firstName} {existingApplication?.applicantLastName || lastName} {existingApplication?.applicantPatronymic || patronymic}
                </strong>
              </div>
              <div>
                <span className="text-brand-dark/50 block font-mono text-[10px] uppercase">Год основания:</span>
                <strong className="text-brand-dark text-sm">{existingApplication?.foundingYear || foundingYear || '—'}</strong>
              </div>
              <div>
                <span className="text-brand-dark/50 block font-mono text-[10px] uppercase">Телефон:</span>
                <strong className="text-brand-dark">{existingApplication?.phoneNumber || phone || '—'}</strong>
              </div>
              <div>
                <span className="text-brand-dark/50 block font-mono text-[10px] uppercase">Email:</span>
                <strong className="text-brand-dark">{existingApplication?.userEmail || email || '—'}</strong>
              </div>
              <div>
                <span className="text-brand-dark/50 block font-mono text-[10px] uppercase">Адрес студии / ателье:</span>
                <strong className="text-brand-dark">{existingApplication?.brandAddress || brandAddress || 'Баку, Азербайджан'}</strong>
              </div>
            </div>

            {/* Document Preview Thumbnails */}
            <div className="pt-2 border-t border-brand-dark/10 flex items-center gap-4 flex-wrap">
              {(existingApplication?.idCardPhotoUrl || idCardPhotoUrl) && (
                <div 
                  onClick={() => setZoomImage({ url: existingApplication?.idCardPhotoUrl || idCardPhotoUrl, caption: 'Şəxsiyyət vəsiqəsi дизайнера' })}
                  className="flex items-center gap-2 p-2 bg-white rounded-xl border border-brand-dark/15 hover:border-brand-accent cursor-pointer group transition-all"
                >
                  <img 
                    src={existingApplication?.idCardPhotoUrl || idCardPhotoUrl} 
                    alt="Şəxsiyyət vəsiqəsi" 
                    className="w-10 h-10 object-cover rounded-lg"
                  />
                  <div className="text-left">
                    <span className="text-[10px] font-mono font-bold block text-brand-dark group-hover:text-brand-accent">
                      Şəxsiyyət vəsiqəsi 🔍
                    </span>
                    <span className="text-[9px] text-brand-dark/50">Нажмите для просмотра</span>
                  </div>
                </div>
              )}

              {(existingApplication?.personalPhotoUrl || personalPhotoUrl) && (
                <div 
                  onClick={() => setZoomImage({ url: existingApplication?.personalPhotoUrl || personalPhotoUrl, caption: 'Личное фото дизайнера' })}
                  className="flex items-center gap-2 p-2 bg-white rounded-xl border border-brand-dark/15 hover:border-brand-accent cursor-pointer group transition-all"
                >
                  <img 
                    src={existingApplication?.personalPhotoUrl || personalPhotoUrl} 
                    alt="Личное фото" 
                    className="w-10 h-10 object-cover rounded-lg"
                  />
                  <div className="text-left">
                    <span className="text-[10px] font-mono font-bold block text-brand-dark group-hover:text-brand-accent">
                      Личное фото дизайнера 🔍
                    </span>
                    <span className="text-[9px] text-brand-dark/50">Нажмите для просмотра</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-brand-light border border-brand-dark/10 rounded-2xl text-xs text-brand-dark/80 font-medium">
            💡 <strong>Что произойдет после подтверждения:</strong> администратор одобрит заявку в админ-панели, вашему аккаунту будет присужден официальный знак <strong>«Золотая Игла» (Qızıl İynə)</strong>, а также откроется персональный раздел <strong>«Direct Chat»</strong> для прямой связи с клиентами.
          </div>
        </div>
      )}

      {/* STATE 3: REJECTED NOTICE */}
      {isRejected && (
        <div className="bg-red-50 rounded-3xl border-2 border-red-300 p-6 sm:p-8 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <AlertCircle size={24} className="text-red-700 shrink-0" />
            <h3 className="text-xl font-serif font-bold text-red-900">
              Заявка на статус официального дизайнера была отклонена
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
            className="px-5 py-2.5 rounded-full bg-red-800 text-white font-semibold text-xs uppercase tracking-wider hover:bg-black transition-colors cursor-pointer"
          >
            Подать заявку повторно
          </button>
        </div>
      )}

      {/* STATE 4: NOT APPLIED CALL TO ACTION (CTA) */}
      {!isApproved && !isPending && !justSubmitted && !showApplyForm && (
        <div className="bg-white rounded-3xl border-2 border-brand-dark p-6 sm:p-10 shadow-md space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-light border-2 border-brand-dark flex items-center justify-center mx-auto text-[#7a0000]">
            <Scissors size={32} />
          </div>

          <div className="space-y-2">
            <span className="bg-brand-accent text-white px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest">
              DESIGNER VERIFICATION & GOLDEN NEEDLE
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-brand-dark">
              Подтвердите, что вы являетесь дизайнером одежды
            </h2>
            <p className="text-xs sm:text-sm text-brand-dark/70 max-w-lg mx-auto font-normal">
              Пройдите верификацию модного дома, загрузите документы (şəxsiyyət vəsiqəsi) и получите знак «Золотая Игла» с доступом к разделу Direct Chat.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowApplyForm(true)}
              className="px-8 py-4 rounded-full bg-[#7a0000] text-white font-bold text-xs uppercase tracking-widest hover:bg-black transition-all shadow-md hover:scale-[1.02] cursor-pointer inline-flex items-center gap-2"
            >
              <ShieldCheck size={16} />
              <span>Заполнить анкету дизайнера</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-4 border-t border-brand-dark/[0.08]">
            <div className="p-3 bg-brand-light rounded-xl border border-brand-dark/10 space-y-1">
              <div className="text-[11px] font-bold text-brand-dark uppercase tracking-wider flex items-center gap-1">
                <Check size={13} className="text-emerald-700" /> Золотая Игла
              </div>
              <p className="text-[10px] text-brand-dark/60">Официальный бейдж мастерства в профиле и каталоге</p>
            </div>

            <div className="p-3 bg-brand-light rounded-xl border border-brand-dark/10 space-y-1">
              <div className="text-[11px] font-bold text-brand-dark uppercase tracking-wider flex items-center gap-1">
                <Check size={13} className="text-emerald-700" /> Раздел Direct Chat
              </div>
              <p className="text-[10px] text-brand-dark/60">Прямые заказы и запросы от клиентов и байеров</p>
            </div>

            <div className="p-3 bg-brand-light rounded-xl border border-brand-dark/10 space-y-1">
              <div className="text-[11px] font-bold text-brand-dark uppercase tracking-wider flex items-center gap-1">
                <Check size={13} className="text-emerald-700" /> Каталог Дизайнеров
              </div>
              <p className="text-[10px] text-brand-dark/60">Включение бренда в официальный A-Z реестр</p>
            </div>
          </div>
        </div>
      )}

      {/* STATE 5: VERIFICATION FORM (SAME QUESTIONS AS MODEL AGENCY VERIFICATION) */}
      {showApplyForm && !isPending && !justSubmitted && (
        <div className="bg-white rounded-3xl border-2 border-[#7a0000] p-6 sm:p-10 shadow-lg space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-brand-dark/[0.08]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-[#7a0000] text-white px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest">
                  Анкета дизайнера
                </span>
                <GoldenNeedleBadge size="xs" showLabel />
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-brand-dark">
                Верификация дизайнера и модного дома
              </h3>
              <p className="text-xs text-brand-dark/60 mt-0.5">
                Заполните ваши данные и загрузите документы. Срок рассмотрения: до 7 дней.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowApplyForm(false)}
              className="w-8 h-8 rounded-full border border-brand-dark/20 flex items-center justify-center hover:bg-brand-dark hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmitApplication} className="space-y-6">
            {/* 1. DOCUMENT & PERSONAL PHOTO UPLOADS */}
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
                        onClick={() => setZoomImage({ url: idCardPhotoUrl, caption: 'Şəxsiyyət vəsiqəsi дизайнера' })}
                      />
                      <div className="absolute inset-0 bg-brand-dark/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => idCardInputRef.current?.click()}
                          className="px-3 py-1 bg-white text-brand-dark text-xs font-mono font-bold uppercase tracking-wider rounded-full hover:bg-brand-accent hover:text-white cursor-pointer"
                        >
                          Заменить
                        </button>
                        <button
                          type="button"
                          onClick={() => setIdCardPhotoUrl('')}
                          className="p-1 bg-red-600 text-white rounded-full hover:bg-red-800 cursor-pointer"
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

                {/* PERSONAL PHOTO (Selfie / Portrait) */}
                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark flex items-center justify-between">
                    <span>Личное портретное фото дизайнера:</span>
                    <span className="text-brand-accent text-[10px]">*Обязательно</span>
                  </label>

                  {personalPhotoUrl ? (
                    <div className="relative group rounded-xl overflow-hidden border-2 border-brand-dark bg-white">
                      <img
                        src={personalPhotoUrl}
                        alt="Личное фото"
                        className="w-full h-36 object-cover cursor-pointer"
                        onClick={() => setZoomImage({ url: personalPhotoUrl, caption: 'Личное фото дизайнера' })}
                      />
                      <div className="absolute inset-0 bg-brand-dark/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => personalPhotoInputRef.current?.click()}
                          className="px-3 py-1 bg-white text-brand-dark text-xs font-mono font-bold uppercase tracking-wider rounded-full hover:bg-brand-accent hover:text-white cursor-pointer"
                        >
                          Заменить
                        </button>
                        <button
                          type="button"
                          onClick={() => setPersonalPhotoUrl('')}
                          className="p-1 bg-red-600 text-white rounded-full hover:bg-red-800 cursor-pointer"
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

            {/* 2. DESIGNER PERSONAL DETAILS */}
            <div className="space-y-4">
              <div className="font-serif font-bold text-xs uppercase tracking-wider text-brand-dark pb-1 border-b border-brand-dark/[0.08]">
                2. Личные данные заявителя (Дизайнера)
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
                    placeholder="Например: Нигяр"
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
                    placeholder="Например: Алиева"
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
                    placeholder="Например: Ильхам кызы"
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
                    placeholder="designer@brand.az"
                    className="w-full bg-white border-2 border-brand-dark p-2.5 text-xs font-bold text-brand-dark focus:outline-none focus:border-brand-accent"
                  />
                </div>
              </div>
            </div>

            {/* 3. BRAND / FASHION HOUSE DETAILS */}
            <div className="space-y-4">
              <div className="font-serif font-bold text-xs uppercase tracking-wider text-brand-dark pb-1 border-b border-brand-dark/[0.08]">
                3. Данные бренда / модного дома (все те же вопросы, как для агентства)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark">
                    Название бренда / модного дома: *
                  </label>
                  <input
                    type="text"
                    required
                    value={brandName}
                    onChange={e => setBrandName(e.target.value)}
                    placeholder="Например: Alieff Couture, Baku Atelier"
                    className="w-full bg-white border-2 border-brand-dark p-2.5 text-xs font-bold text-brand-dark focus:outline-none focus:border-brand-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark">
                    Год основания бренда: *
                  </label>
                  <input
                    type="number"
                    required
                    min="1950"
                    max="2026"
                    value={foundingYear}
                    onChange={e => setFoundingYear(e.target.value)}
                    placeholder="Например: 2021"
                    className="w-full bg-white border-2 border-brand-dark p-2.5 text-xs font-bold text-brand-dark focus:outline-none focus:border-brand-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark">
                    Роль / Должность заявителя:
                  </label>
                  <select
                    value={designerRole}
                    onChange={e => setDesignerRole(e.target.value)}
                    className="w-full bg-white border-2 border-brand-dark p-2.5 text-xs font-bold uppercase tracking-wider"
                  >
                    <option value="Creative Director / Head Designer">Креативный директор / Главный дизайнер</option>
                    <option value="Lead Fashion Designer">Ведущий дизайнер одежды</option>
                    <option value="Brand Founder & Designer">Основатель бренда и дизайнер</option>
                    <option value="Couture Master / Tailor">Мастер Haute Couture / Модельер</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark flex items-center justify-between">
                    <span>Адрес модного дома / ателье:</span>
                    <span className="text-[10px] text-brand-dark/50 font-normal">(Необязательно)</span>
                  </label>
                  <input
                    type="text"
                    value={brandAddress}
                    onChange={e => setBrandAddress(e.target.value)}
                    placeholder="Например: г. Баку, ул. Низами 12"
                    className="w-full bg-white border-2 border-brand-dark p-2.5 text-xs font-semibold text-brand-dark focus:outline-none focus:border-brand-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark">
                    Instagram бренда / дизайнера:
                  </label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={e => setInstagram(e.target.value)}
                    placeholder="@brand_official или ссылка"
                    className="w-full bg-white border-2 border-brand-dark p-2.5 text-xs font-semibold text-brand-dark focus:outline-none focus:border-brand-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark">
                    Веб-сайт / Портфолио:
                  </label>
                  <input
                    type="text"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    placeholder="https://brand.az"
                    className="w-full bg-white border-2 border-brand-dark p-2.5 text-xs font-semibold text-brand-dark focus:outline-none focus:border-brand-accent"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark">
                  Комментарий / Ссылки на коллекции (Lookbook, показы):
                </label>
                <textarea
                  rows={2}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Дополнительная информация о бренде, участии в неделях моды..."
                  className="w-full bg-white border-2 border-brand-dark p-2.5 text-xs font-medium text-brand-dark focus:outline-none focus:border-brand-accent"
                />
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-4 border-t border-brand-dark/[0.08] flex items-center justify-between gap-4 flex-wrap">
              <button
                type="button"
                onClick={() => setShowApplyForm(false)}
                className="px-5 py-2.5 rounded-full border border-brand-dark/20 text-xs font-semibold uppercase tracking-wider hover:bg-brand-dark hover:text-white transition-colors cursor-pointer"
              >
                Отмена
              </button>

              <button
                type="submit"
                disabled={submittingApp || idCardUploading || personalPhotoUploading}
                className="px-8 py-3 rounded-full bg-[#7a0000] text-white font-bold text-xs uppercase tracking-widest hover:bg-black transition-all shadow-md hover:scale-[1.02] cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <ShieldCheck size={16} />
                <span>{submittingApp ? 'Отправка анкеты...' : 'Отправить анкету на проверку'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* IMAGE ZOOM MODAL */}
      {zoomImage && (
        <div 
          className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setZoomImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setZoomImage(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors p-1"
            >
              <X size={24} />
            </button>
            <img 
              src={zoomImage.url} 
              alt={zoomImage.caption || 'Просмотр изображения'} 
              className="max-h-[82vh] max-w-full object-contain rounded-xl border border-white/20 shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
            {zoomImage.caption && (
              <p className="text-white text-xs font-mono font-bold mt-2 bg-black/60 px-3 py-1 rounded-full">
                {zoomImage.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
