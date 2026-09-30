import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { X, Building2, ShieldCheck, Sparkles, Check, Globe, Instagram, Users, Upload, FileText } from 'lucide-react';
import AgencyBadge from './AgencyBadge';

interface AgencyApplicationModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSuccess?: () => void;
}

export default function AgencyApplicationModal({
 isOpen,
 onClose,
 onSuccess
}: AgencyApplicationModalProps) {
 const { currentUser, dbUser } = useAuth();
 const ui = useUI();

 const [loading, setLoading] = useState(false);
 const [formData, setFormData] = useState({
 agencyName: dbUser?.representedAgencyName || '',
 applicantFirstName: dbUser?.name?.split(' ')[0] || '',
 applicantLastName: dbUser?.name?.split(' ').slice(1).join(' ') || '',
 agencyRole: 'Director / Founder',
 modelCount: '10-30',
 location: 'Баку, Азербайджан',
 website: '',
 instagram: '',
 mediaLinks: '',
 modelWorkLinks: '',
 comment: ''
 });

	// Lock background scroll when modal is open
	React.useEffect(() => {
		if (isOpen) {
			const originalOverflow = document.body.style.overflow;
			document.body.style.overflow = 'hidden';
			return () => {
				document.body.style.overflow = originalOverflow;
			};
		}
	}, [isOpen]);

	// Handle Escape key
	React.useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, onClose]);

 if (!isOpen) return null;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!currentUser) {
 ui.alert('Пожалуйста, войдите в систему для подачи заявки.');
 return;
 }

 if (!formData.agencyName.trim() || !formData.applicantFirstName.trim() || !formData.applicantLastName.trim()) {
 ui.alert('Пожалуйста, заполните обязательные поля (название агентства, имя и фамилию).');
 return;
 }

 setLoading(true);
 try {
 const now = Date.now();
 const userHandle = dbUser?.handle || (dbUser?.username ? `@${dbUser.username}` : `@${currentUser.email?.split('@')[0]}`);

 // 1. Create application document in agency_applications
 const appRef = await addDoc(collection(db, 'agency_applications'), {
 userId: currentUser.uid,
 userEmail: currentUser.email || '',
 userHandle: userHandle,
 applicantFirstName: formData.applicantFirstName.trim(),
 applicantLastName: formData.applicantLastName.trim(),
 agencyName: formData.agencyName.trim(),
 agencyRole: formData.agencyRole,
 modelCount: formData.modelCount,
 location: formData.location.trim(),
 website: formData.website.trim(),
 instagram: formData.instagram.trim(),
 mediaLinks: formData.mediaLinks.trim(),
 modelWorkLinks: formData.modelWorkLinks.trim(),
 comment: formData.comment.trim(),
 status: 'pending',
 createdAt: now
 });

 // 2. Update user document with pending verification status
 await updateDoc(doc(db, 'users', currentUser.uid), {
 agencyApplicationId: appRef.id,
 agencyVerificationStatus: 'pending',
 representedAgencyName: formData.agencyName.trim(),
 isAgencyRepresentative: true
 });

 ui.alert('Ваша заявка на официальный статус агентства успешно отправлена на рассмотрение!');
 onSuccess?.();
 onClose();
 } catch (err) {
 handleFirestoreError(err, OperationType.CREATE, 'agency_applications');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
 <div 
 className="fixed inset-0 bg-brand-dark/75 backdrop-blur-md transition-opacity"
 onClick={onClose}
 />

 <div className="relative z-10 bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 max-w-2xl w-full my-auto max-h-[92vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
 {/* Header */}
 <div className="flex justify-between items-start mb-6 border-b border-brand-dark/[0.08] pb-4">
 <div>
 <div className="flex items-center gap-2 mb-1.5 flex-wrap">
 <span className="bg-[#7a0000] text-white px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-widest flex items-center gap-1">
 <ShieldCheck size={13} /> Agency Official Badge
 </span>
 <AgencyBadge size="xs" />
 </div>
 <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark">
 Заявка на верификацию агентства
 </h2>
 <p className="text-xs sm:text-sm font-semibold text-brand-dark/70 mt-1">
 Получите официальный статус модельного агентства на платформе Azerbaijan Fashion Future и право верифицировать моделей (😎).
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

 {/* Benefits Preview */}
 <div className="mb-6 p-4 bg-brand-accent/[0.03] border border-brand-accent/20 rounded-2xl space-y-2 text-xs text-brand-dark">
 <div className="font-bold uppercase tracking-wider text-[#7a0000] flex items-center gap-1.5 text-[11px]">
 <Sparkles size={14} /> Преимущества официального агентства:
 </div>
 <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-medium">
 <li className="flex items-center gap-1.5">
 <Check size={14} className="text-[#7a0000] shrink-0" />
 <span>Знак отличия агентства в каталоге и профиле</span>
 </li>
 <li className="flex items-center gap-1.5">
 <Check size={14} className="text-[#7a0000] shrink-0" />
 <span>Присвоение значка модели 😎 вашим резидентам</span>
 </li>
 <li className="flex items-center gap-1.5">
 <Check size={14} className="text-[#7a0000] shrink-0" />
 <span>Прямой канал связи с дизайнерами и брендами</span>
 </li>
 <li className="flex items-center gap-1.5">
 <Check size={14} className="text-[#7a0000] shrink-0" />
 <span>Приоритет в скаутинге и кастинг-коллах</span>
 </li>
 </ul>
 </div>

 {/* Form */}
 <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm font-bold text-brand-dark">
 <div>
 <label className="block uppercase tracking-wider mb-1">
 Название агентства (Agency Name) *
 </label>
 <input
 type="text"
 required
 value={formData.agencyName}
 onChange={e => setFormData({ ...formData, agencyName: e.target.value })}
 placeholder="Например: Venera Models, NL Models, Big Model Agency..."
 className="w-full bg-white border-2 border-brand-dark p-3 font-semibold focus:outline-none focus:border-brand-accent text-sm"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block uppercase tracking-wider mb-1">
 Имя заявителя (First Name) *
 </label>
 <input
 type="text"
 required
 value={formData.applicantFirstName}
 onChange={e => setFormData({ ...formData, applicantFirstName: e.target.value })}
 placeholder="Əli"
 className="w-full bg-white border-2 border-brand-dark p-2.5 font-medium focus:outline-none focus:border-brand-accent"
 />
 </div>
 <div>
 <label className="block uppercase tracking-wider mb-1">
 Фамилия (Last Name) *
 </label>
 <input
 type="text"
 required
 value={formData.applicantLastName}
 onChange={e => setFormData({ ...formData, applicantLastName: e.target.value })}
 placeholder="Əliyev"
 className="w-full bg-white border-2 border-brand-dark p-2.5 font-medium focus:outline-none focus:border-brand-accent"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block uppercase tracking-wider mb-1">
 Ваша должность в агентстве
 </label>
 <select
 value={formData.agencyRole}
 onChange={e => setFormData({ ...formData, agencyRole: e.target.value })}
 className="w-full bg-white border-2 border-brand-dark p-2.5 font-medium focus:outline-none focus:border-brand-accent cursor-pointer"
 >
 <option value="Director / Founder">Director / Founder / Основатель</option>
 <option value="Head Booker">Head Booker / Главный букер</option>
 <option value="Scout / Agent">Scout / Скаут агентства</option>
 <option value="PR & Operations">PR & Operations Manager</option>
 <option value="Representative">Authorized Representative</option>
 </select>
 </div>

 <div>
 <label className="block uppercase tracking-wider mb-1">
 Количество моделей в базе
 </label>
 <select
 value={formData.modelCount}
 onChange={e => setFormData({ ...formData, modelCount: e.target.value })}
 className="w-full bg-white border-2 border-brand-dark p-2.5 font-medium focus:outline-none focus:border-brand-accent cursor-pointer"
 >
 <option value="1-10">1 – 10 моделей</option>
 <option value="10-30">10 – 30 моделей</option>
 <option value="30-70">30 – 70 моделей</option>
 <option value="70+">70+ моделей (Крупное агентство)</option>
 </select>
 </div>
 </div>

 <div>
 <label className="block uppercase tracking-wider mb-1">
 Город / Локация
 </label>
 <input
 type="text"
 value={formData.location}
 onChange={e => setFormData({ ...formData, location: e.target.value })}
 placeholder="Баку, Азербайджан"
 className="w-full bg-white border-2 border-brand-dark p-2.5 font-medium focus:outline-none focus:border-brand-accent"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block uppercase tracking-wider mb-1 flex items-center gap-1.5">
 <Instagram size={14} className="text-pink-600" />
 <span>Instagram URL / Handle</span>
 </label>
 <input
 type="text"
 value={formData.instagram}
 onChange={e => setFormData({ ...formData, instagram: e.target.value })}
 placeholder="https://instagram.com/agency..."
 className="w-full bg-white border-2 border-brand-dark p-2.5 font-medium focus:outline-none focus:border-brand-accent"
 />
 </div>

 <div>
 <label className="block uppercase tracking-wider mb-1 flex items-center gap-1.5">
 <Globe size={14} className="text-blue-600" />
 <span>Официальный сайт (Website)</span>
 </label>
 <input
 type="text"
 value={formData.website}
 onChange={e => setFormData({ ...formData, website: e.target.value })}
 placeholder="https://agency.az"
 className="w-full bg-white border-2 border-brand-dark p-2.5 font-medium focus:outline-none focus:border-brand-accent"
 />
 </div>
 </div>

 <div>
 <label className="block uppercase tracking-wider mb-1">
 Ссылки на публикации / Шоу / Портфолио моделей
 </label>
 <input
 type="text"
 value={formData.modelWorkLinks}
 onChange={e => setFormData({ ...formData, modelWorkLinks: e.target.value })}
 placeholder="Ссылки на показ Baku Fashion Week, фотосессии, кампейны..."
 className="w-full bg-white border-2 border-brand-dark p-2.5 font-medium focus:outline-none focus:border-brand-accent"
 />
 </div>

 <div>
 <label className="block uppercase tracking-wider mb-1">
 Дополнительная информация / Комментарий
 </label>
 <textarea
 rows={3}
 value={formData.comment}
 onChange={e => setFormData({ ...formData, comment: e.target.value })}
 placeholder="Кратко расскажите о специализации агентства, ключевых моделях и международных контактах..."
 className="w-full bg-white border-2 border-brand-dark p-2.5 font-medium focus:outline-none focus:border-brand-accent"
 />
 </div>

 {/* Submit Actions */}
 <div className="pt-4 border-t border-brand-dark/[0.08] flex flex-col sm:flex-row items-center justify-end gap-3 pt-4">
 <button
 type="button"
 onClick={onClose}
 className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-brand-dark/[0.15] bg-white font-semibold uppercase tracking-wider text-xs text-brand-dark hover:bg-brand-muted transition-colors cursor-pointer shadow-2xs"
 >
 Отмена
 </button>
 <button
 type="submit"
 disabled={loading}
 className="w-full sm:w-auto px-7 py-2.5 rounded-full bg-brand-dark hover:bg-brand-accent text-white font-semibold uppercase tracking-wider text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
 >
 <ShieldCheck size={16} />
 <span>{loading ? 'Отправка...' : 'Отправить заявку агентства'}</span>
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}
