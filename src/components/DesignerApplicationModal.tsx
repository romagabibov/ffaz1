import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { X, Sparkles, Check, Globe, Instagram, Upload, FileText, Scissors, Award, MessageSquare, ShieldCheck, Phone, MapPin, Calendar, Layers, Eye } from 'lucide-react';
import GoldenNeedleBadge from './GoldenNeedleBadge';
import { uploadMediaFile } from '../lib/upload';

interface DesignerApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialBrandName?: string;
}

export default function DesignerApplicationModal({
  isOpen,
  onClose,
  onSuccess,
  initialBrandName = ''
}: DesignerApplicationModalProps) {
  const { currentUser, dbUser } = useAuth();
  const ui = useUI();

  const [loading, setLoading] = useState(false);
  const [uploadingIdCard, setUploadingIdCard] = useState(false);
  const [uploadingPersonal, setUploadingPersonal] = useState(false);

  const idCardInputRef = useRef<HTMLInputElement>(null);
  const personalPhotoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    brandName: initialBrandName || dbUser?.designerBrandName || dbUser?.brandName || '',
    applicantFirstName: dbUser?.name?.split(' ')[0] || '',
    applicantLastName: dbUser?.name?.split(' ').slice(1).join(' ') || '',
    applicantPatronymic: '',
    phoneNumber: '',
    location: 'Баку, Азербайджан',
    brandAddress: '',
    foundingYear: '2022',
    designerRole: 'Creative Director / Head Designer',
    collectionsCount: '3-5 коллекций',
    idCardPhotoUrl: '',
    personalPhotoUrl: dbUser?.avatarUrl || '',
    website: '',
    instagram: '',
    mediaLinks: '',
    collectionLinks: '',
    comment: ''
  });

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

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File, type: 'idCard' | 'personal') => {
    if (type === 'idCard') setUploadingIdCard(true);
    else setUploadingPersonal(true);

    try {
      const url = await uploadMediaFile(file);
      if (type === 'idCard') {
        setFormData(prev => ({ ...prev, idCardPhotoUrl: url }));
      } else {
        setFormData(prev => ({ ...prev, personalPhotoUrl: url }));
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      ui.alert(err.message || 'Ошибка загрузки файла');
    } finally {
      if (type === 'idCard') setUploadingIdCard(false);
      else setUploadingPersonal(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      ui.alert('Пожалуйста, войдите в систему для подачи заявки.');
      return;
    }

    if (!formData.brandName.trim() || !formData.applicantFirstName.trim() || !formData.applicantLastName.trim() || !formData.phoneNumber.trim()) {
      ui.alert('Пожалуйста, заполните все обязательные поля (название бренда, имя, фамилию и телефон).');
      return;
    }

    setLoading(true);
    try {
      const now = Date.now();
      const userHandle = dbUser?.handle || (dbUser?.username ? `@${dbUser.username}` : `@${currentUser.email?.split('@')[0]}`);

      // 1. Create application in designer_applications
      const appRef = await addDoc(collection(db, 'designer_applications'), {
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        userHandle: userHandle,
        applicantFirstName: formData.applicantFirstName.trim(),
        applicantLastName: formData.applicantLastName.trim(),
        applicantPatronymic: formData.applicantPatronymic.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        brandName: formData.brandName.trim(),
        brandAddress: formData.brandAddress.trim(),
        location: formData.location.trim(),
        foundingYear: formData.foundingYear.trim(),
        designerRole: formData.designerRole.trim(),
        collectionsCount: formData.collectionsCount.trim(),
        idCardPhotoUrl: formData.idCardPhotoUrl.trim(),
        personalPhotoUrl: formData.personalPhotoUrl.trim(),
        website: formData.website.trim(),
        instagram: formData.instagram.trim(),
        mediaLinks: formData.mediaLinks.trim(),
        collectionLinks: formData.collectionLinks.trim(),
        comment: formData.comment.trim(),
        status: 'pending',
        createdAt: now
      });

      // 2. Update user profile to mark pending designer verification
      await updateDoc(doc(db, 'users', currentUser.uid), {
        isDesigner: true,
        designerBrandName: formData.brandName.trim(),
        designerApplicationId: appRef.id,
        designerVerificationStatus: 'pending'
      });

      ui.alert('Ваша заявка дизайнера успешно отправлена! После проверки администратором вам будет присвоена Золотая Игла и открыт Direct Chat.');
      onSuccess?.();
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'designer_applications');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-brand-dark/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 md:p-10 max-w-3xl w-full my-auto max-h-[92vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 border-b border-brand-dark/[0.08] pb-5">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-[#7a0000] text-white px-3 py-0.5 text-[11px] font-mono font-bold uppercase tracking-widest flex items-center gap-1 rounded-full">
                <Scissors size={12} /> Designer Verification Queue
              </span>
              <GoldenNeedleBadge size="xs" showLabel />
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark">
              Верификация дизайнера одежды
            </h2>
            <p className="text-xs sm:text-sm font-normal text-brand-dark/70 mt-1">
              Пройдите официальную проверку для получения знака <strong>Золотая Игла</strong> и персонального раздела <strong>Direct Chat</strong> для прямой связи с клиентами и байерами.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-brand-dark/15 flex items-center justify-center hover:bg-brand-dark hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Exclusive Privileges Banner */}
        <div className="mb-6 p-4.5 bg-brand-accent/[0.03] border border-brand-accent/20 rounded-2xl space-y-2.5 text-xs text-brand-dark">
          <div className="font-bold uppercase tracking-wider text-[#7a0000] flex items-center gap-1.5 text-[11px] font-mono">
            <Sparkles size={14} /> Привилегии после одобрения администрацией:
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-medium">
            <li className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#7a0000]/10 flex items-center justify-center shrink-0 text-[#7a0000]">
                <Check size={12} />
              </div>
              <span>Присуждение знака высшего мастерства <strong>«Золотая Игла» (Qızıl İynə)</strong></span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#7a0000]/10 flex items-center justify-center shrink-0 text-[#7a0000]">
                <Check size={12} />
              </div>
              <span>Открытие раздела <strong>«Direct Chat»</strong> в профиле и кабинете</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#7a0000]/10 flex items-center justify-center shrink-0 text-[#7a0000]">
                <Check size={12} />
              </div>
              <span>Включение в официальный реестр резидентов <strong>Дизайнеры</strong></span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#7a0000]/10 flex items-center justify-center shrink-0 text-[#7a0000]">
                <Check size={12} />
              </div>
              <span>Прямой канал связи для заказов, кастингов и показов</span>
            </li>
          </ul>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-5 text-xs font-mono font-medium text-brand-dark">
          {/* Brand Info */}
          <div className="bg-brand-muted/20 p-4.5 rounded-2xl border border-brand-dark/[0.08] space-y-4">
            <h3 className="font-serif text-base text-brand-dark font-normal flex items-center gap-2">
              <Scissors size={15} className="text-[#7a0000]" /> 1. Данные бренда и модного дома
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block uppercase tracking-wider text-[11px] font-bold text-brand-dark/80 mb-1">
                  Название бренда / модного дома *
                </label>
                <input
                  type="text"
                  required
                  value={formData.brandName}
                  onChange={e => setFormData({ ...formData, brandName: e.target.value })}
                  placeholder="Например: Atelier Baku, Əli Əliyev Əli Couture..."
                  className="w-full bg-white border border-brand-dark/20 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#7a0000]"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider text-[11px] font-bold text-brand-dark/80 mb-1">
                  Ваша роль / должность в бренде
                </label>
                <select
                  value={formData.designerRole}
                  onChange={e => setFormData({ ...formData, designerRole: e.target.value })}
                  className="w-full bg-white border border-brand-dark/20 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#7a0000]"
                >
                  <option value="Creative Director / Head Designer">Креативный директор / Главный дизайнер</option>
                  <option value="Founder & Couturier">Основатель и кутюрье (Founder & Couturier)</option>
                  <option value="Lead Fashion Designer">Ведущий дизайнер одежды</option>
                  <option value="Accessories & Footwear Designer">Дизайнер аксессуаров и обуви</option>
                  <option value="Costume Designer">Художник по костюмам</option>
                </select>
              </div>

              <div>
                <label className="block uppercase tracking-wider text-[11px] font-bold text-brand-dark/80 mb-1">
                  Год основания бренда
                </label>
                <input
                  type="text"
                  value={formData.foundingYear}
                  onChange={e => setFormData({ ...formData, foundingYear: e.target.value })}
                  placeholder="Например: 2021"
                  className="w-full bg-white border border-brand-dark/20 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#7a0000]"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider text-[11px] font-bold text-brand-dark/80 mb-1">
                  Количество коллекций / показов
                </label>
                <select
                  value={formData.collectionsCount}
                  onChange={e => setFormData({ ...formData, collectionsCount: e.target.value })}
                  className="w-full bg-white border border-brand-dark/20 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#7a0000]"
                >
                  <option value="1-2 коллекции">1-2 коллекции (Начинающий бренд)</option>
                  <option value="3-5 коллекций">3-5 коллекций</option>
                  <option value="6-10 коллекций">6-10 коллекций</option>
                  <option value="Более 10 коллекций">Более 10 коллекций (Устоявшийся бренд)</option>
                </select>
              </div>

              <div>
                <label className="block uppercase tracking-wider text-[11px] font-bold text-brand-dark/80 mb-1">
                  Город / Локация *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Баку, Азербайджан"
                  className="w-full bg-white border border-brand-dark/20 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#7a0000]"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider text-[11px] font-bold text-brand-dark/80 mb-1">
                  Адрес студии / шоурума / ателье
                </label>
                <input
                  type="text"
                  value={formData.brandAddress}
                  onChange={e => setFormData({ ...formData, brandAddress: e.target.value })}
                  placeholder="ул. Низами, 14, Баку"
                  className="w-full bg-white border border-brand-dark/20 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#7a0000]"
                />
              </div>
            </div>
          </div>

          {/* Applicant Info */}
          <div className="bg-brand-muted/20 p-4.5 rounded-2xl border border-brand-dark/[0.08] space-y-4">
            <h3 className="font-serif text-base text-brand-dark font-normal flex items-center gap-2">
              <ShieldCheck size={15} className="text-[#7a0000]" /> 2. Персональные данные дизайнера
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block uppercase tracking-wider text-[11px] font-bold text-brand-dark/80 mb-1">
                  Имя *
                </label>
                <input
                  type="text"
                  required
                  value={formData.applicantFirstName}
                  onChange={e => setFormData({ ...formData, applicantFirstName: e.target.value })}
                  placeholder="Əli"
                  className="w-full bg-white border border-brand-dark/20 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#7a0000]"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider text-[11px] font-bold text-brand-dark/80 mb-1">
                  Фамилия *
                </label>
                <input
                  type="text"
                  required
                  value={formData.applicantLastName}
                  onChange={e => setFormData({ ...formData, applicantLastName: e.target.value })}
                  placeholder="Əliyev"
                  className="w-full bg-white border border-brand-dark/20 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#7a0000]"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider text-[11px] font-bold text-brand-dark/80 mb-1">
                  Отчество (Ata adı)
                </label>
                <input
                  type="text"
                  value={formData.applicantPatronymic}
                  onChange={e => setFormData({ ...formData, applicantPatronymic: e.target.value })}
                  placeholder="Əli"
                  className="w-full bg-white border border-brand-dark/20 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#7a0000]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block uppercase tracking-wider text-[11px] font-bold text-brand-dark/80 mb-1">
                  Контактный номер телефона *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+994 (50) 000-00-00"
                  className="w-full bg-white border border-brand-dark/20 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#7a0000]"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider text-[11px] font-bold text-brand-dark/80 mb-1">
                  Instagram бренда / дизайнера
                </label>
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="https://instagram.com/your_brand"
                  className="w-full bg-white border border-brand-dark/20 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#7a0000]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block uppercase tracking-wider text-[11px] font-bold text-brand-dark/80 mb-1">
                  Официальный сайт / интернет-магазин
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={e => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://yourbrand.az"
                  className="w-full bg-white border border-brand-dark/20 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#7a0000]"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider text-[11px] font-bold text-brand-dark/80 mb-1">
                  Ссылки на лукбуки / коллекции / показы
                </label>
                <input
                  type="text"
                  value={formData.collectionLinks}
                  onChange={e => setFormData({ ...formData, collectionLinks: e.target.value })}
                  placeholder="Drive, Dropbox, Behance или сайт..."
                  className="w-full bg-white border border-brand-dark/20 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#7a0000]"
                />
              </div>
            </div>

            <div>
              <label className="block uppercase tracking-wider text-[11px] font-bold text-brand-dark/80 mb-1">
                Публикации в медиа / прессе / глянце (по желанию)
              </label>
              <input
                type="text"
                value={formData.mediaLinks}
                onChange={e => setFormData({ ...formData, mediaLinks: e.target.value })}
                placeholder="Ссылки на статьи, интервью, показы..."
                className="w-full bg-white border border-brand-dark/20 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#7a0000]"
              />
            </div>
          </div>

          {/* Verification Documents & Photos */}
          <div className="bg-brand-muted/20 p-4.5 rounded-2xl border border-brand-dark/[0.08] space-y-4">
            <h3 className="font-serif text-base text-brand-dark font-normal flex items-center gap-2">
              <Award size={15} className="text-[#7a0000]" /> 3. Документы верификации и фото
            </h3>
            <p className="text-[11px] text-brand-dark/60">
              Для присвоения Золотой Иглы и официального статуса прикрепите фото документа (şəxsiyyət vəsiqəsi) и портретное фото дизайнера. Документы конфиденциальны и видны только администраторам платформы.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* ID Card Upload */}
              <div className="p-3.5 bg-white rounded-xl border border-brand-dark/15 space-y-2">
                <span className="block text-[11px] uppercase tracking-wider font-bold text-brand-dark">
                  Фото Şəxsiyyət vəsiqəsi / ID-карты
                </span>

                <input
                  type="file"
                  ref={idCardInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, 'idCard');
                  }}
                />

                {formData.idCardPhotoUrl ? (
                  <div className="flex items-center gap-3">
                    <img 
                      src={formData.idCardPhotoUrl} 
                      alt="ID Document" 
                      className="w-16 h-12 object-cover rounded-lg border border-brand-dark/15" 
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                        <Check size={12} /> Документ прикреплен
                      </span>
                      <button
                        type="button"
                        onClick={() => idCardInputRef.current?.click()}
                        className="text-[10px] text-brand-accent hover:underline block mt-0.5 cursor-pointer"
                      >
                        Заменить фото
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={uploadingIdCard}
                    onClick={() => idCardInputRef.current?.click()}
                    className="w-full py-2.5 px-3 border border-dashed border-brand-dark/30 rounded-xl text-center hover:bg-brand-muted/30 transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs font-semibold"
                  >
                    <Upload size={14} className="text-[#7a0000]" />
                    <span>{uploadingIdCard ? 'Загрузка...' : 'Загрузить фото удостоверения'}</span>
                  </button>
                )}

                <input
                  type="url"
                  placeholder="или вставьте URL фото документа"
                  value={formData.idCardPhotoUrl}
                  onChange={e => setFormData({ ...formData, idCardPhotoUrl: e.target.value })}
                  className="w-full bg-brand-muted/20 border border-brand-dark/10 rounded-lg p-2 text-[10px]"
                />
              </div>

              {/* Personal Photo Upload */}
              <div className="p-3.5 bg-white rounded-xl border border-brand-dark/15 space-y-2">
                <span className="block text-[11px] uppercase tracking-wider font-bold text-brand-dark">
                  Портретное фото дизайнера
                </span>

                <input
                  type="file"
                  ref={personalPhotoInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, 'personal');
                  }}
                />

                {formData.personalPhotoUrl ? (
                  <div className="flex items-center gap-3">
                    <img 
                      src={formData.personalPhotoUrl} 
                      alt="Personal Photo" 
                      className="w-12 h-12 rounded-full object-cover border border-brand-dark/15" 
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                        <Check size={12} /> Фото прикреплено
                      </span>
                      <button
                        type="button"
                        onClick={() => personalPhotoInputRef.current?.click()}
                        className="text-[10px] text-brand-accent hover:underline block mt-0.5 cursor-pointer"
                      >
                        Заменить фото
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={uploadingPersonal}
                    onClick={() => personalPhotoInputRef.current?.click()}
                    className="w-full py-2.5 px-3 border border-dashed border-brand-dark/30 rounded-xl text-center hover:bg-brand-muted/30 transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs font-semibold"
                  >
                    <Upload size={14} className="text-[#7a0000]" />
                    <span>{uploadingPersonal ? 'Загрузка...' : 'Загрузить личное фото'}</span>
                  </button>
                )}

                <input
                  type="url"
                  placeholder="или вставьте URL портрета"
                  value={formData.personalPhotoUrl}
                  onChange={e => setFormData({ ...formData, personalPhotoUrl: e.target.value })}
                  className="w-full bg-brand-muted/20 border border-brand-dark/10 rounded-lg p-2 text-[10px]"
                />
              </div>
            </div>
          </div>

          {/* Comment / Brand Philosophy */}
          <div>
            <label className="block uppercase tracking-wider text-[11px] font-bold text-brand-dark/80 mb-1">
              О бренде, философии коллекций и стиле (Комментарий для комиссии)
            </label>
            <textarea
              rows={3}
              value={formData.comment}
              onChange={e => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Расскажите о вашей марке, материалах, стиле (Couture, Prêt-à-Porter, Sustainable) и главных достижениях..."
              className="w-full bg-white border border-brand-dark/20 rounded-xl p-3 text-xs focus:outline-none focus:border-[#7a0000]"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3.5 rounded-full border border-brand-dark/20 text-xs font-bold uppercase tracking-wider text-brand-dark hover:bg-brand-muted/40 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || uploadingIdCard || uploadingPersonal}
              className="flex-1 bg-[#7a0000] hover:bg-brand-dark text-white py-3.5 px-6 rounded-full font-bold uppercase tracking-wider text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Scissors size={15} />
              <span>{loading ? 'Отправка заявки...' : 'Отправить заявку на проверку и Золотую Иглу'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
