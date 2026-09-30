import { useUI } from '../context/UIContext';
import React, { useState, useEffect, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import * as XLSX from 'xlsx';
import { doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { 
 Trash2, Edit2, Check, X, Eye, Plus, BookOpen, GraduationCap, RefreshCw, ArrowUp, ArrowDown,
 Sparkles, Award, Crown, Link2, Unlink, ExternalLink, Search, UserCheck, ShieldCheck, Info, Save,
 Share2, Globe, CheckCircle2, RotateCcw, Bot, Upload, FileText, Sliders, AlertCircle, Scissors, MessageSquare, Clock
} from 'lucide-react';
import GoldenNeedleBadge from '../components/GoldenNeedleBadge';
import SilverNeedleBadge from '../components/SilverNeedleBadge';
import ModelVerifiedBadge from '../components/ModelVerifiedBadge';
import AgencyBadge from '../components/AgencyBadge';
import AgencyModelVerificationCard from '../components/AgencyModelVerificationCard';
import ImageZoomModal from '../components/ImageZoomModal';
import { DEFAULT_EDUCATION_INSTITUTIONS } from '../data/defaultEducation';
import { DEFAULT_DESIGNERS } from '../data/defaultDesigners';
import { DEFAULT_AGENCIES } from '../data/defaultAgencies';
import { LeaderMember, DEFAULT_LEADERS } from '../data/defaultLeaders';
import { uploadMediaFile, sanitizeAndPersistHtmlMedia, uploadBase64Media, deleteMediaUrls, extractAllMediaUrlsFromNews } from '../lib/upload';
import { getTimestampMillis } from '../lib/dateUtils';
import { SocialLinkItem, SocialPlatform } from '../types';
import { 
 DEFAULT_SOCIAL_LINKS, 
 SOCIAL_PLATFORMS_META, 
 renderSocialIcon, 
 SocialLinksBar 
} from '../components/SocialLinks';
import UserActivityCharts from '../components/admin/UserActivityCharts';
import SiteModulesAdminTab from '../components/admin/SiteModulesAdminTab';
import HomeMaterialsAdminTab from '../components/admin/HomeMaterialsAdminTab';
import TicketGiveawaysAdminTab from '../components/admin/TicketGiveawaysAdminTab';
import { NewsEditorMediaManager, NewsMediaItem } from '../components/NewsEditorMediaManager';
import { apiFetch } from '../lib/apiClient';
import { Landmark, Building2, Users as UsersIcon, ArrowRight } from 'lucide-react';

export default function AdminDashboard() {
 const ui = useUI();

 const { t } = useTranslation();
 const navigate = useNavigate();
 const [searchParams, setSearchParams] = useSearchParams();
 const { isAdmin, userRole, currentUser } = useAuth();
 
 const urlTab = searchParams.get('tab');
 const [activeTab, setActiveTab] = useState(urlTab === 'fashion_center' ? 'about_us' : (urlTab || 'events'));
 
  const getAllowedTabs = () => {
    if (userRole === 'superadmin') {
      return ['stats', 'site_modules', 'homepage_materials', 'events', 'giveaways', 'users', 'designer_verifications', 'designers', 'about_us', 'socials', 'sponsorships', 'careers', 'education', 'ff_ai', 'agencies', 'sponsors', 'news'];
    }
    if (userRole === 'admin') {
      return ['stats', 'site_modules', 'homepage_materials', 'events', 'giveaways', 'users', 'designer_verifications', 'designers', 'about_us', 'socials', 'sponsorships', 'careers', 'education', 'agencies', 'sponsors', 'news'];
    }
    const tabs = [];
    if (userRole === 'news_editor') tabs.push('news');
    if (userRole === 'ticket_editor') tabs.push('events', 'giveaways');
    if (userRole === 'content_editor') tabs.push('homepage_materials', 'designers', 'about_us', 'socials', 'education', 'agencies', 'careers', 'giveaways');
    return tabs;
  };
 const allowedTabs = getAllowedTabs();
 
 useEffect(() => {
   const tabFromUrl = searchParams.get('tab');
   if (tabFromUrl && allowedTabs.includes(tabFromUrl)) {
     setActiveTab(tabFromUrl);
   } else if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
     setActiveTab(allowedTabs[0]);
   }
 }, [searchParams, userRole]);

 const [loading, setLoading] = useState(false);
 const [events, setEvents] = useState<any[]>([]);
 const [users, setUsers] = useState<any[]>([]);
 const [tickets, setTickets] = useState<any[]>([]);
 const [jobApplications, setJobApplications] = useState<any[]>([]);
 const [sponsorships, setSponsorships] = useState<any[]>([]);
 const [designers, setDesigners] = useState<any[]>([]);
 const [education, setEducation] = useState<any[]>([]);
 const [agencies, setAgencies] = useState<any[]>([]);
 const [agencyApplications, setAgencyApplications] = useState<any[]>([]);
 const [loadingAgencyApps, setLoadingAgencyApps] = useState(false);
 const [agencyAppFilter, setAgencyAppFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
 const [agencyZoomImage, setAgencyZoomImage] = useState<{ url: string; caption?: string } | null>(null);
	const [designerApplications, setDesignerApplications] = useState<any[]>([]);
	const [loadingDesignerApps, setLoadingDesignerApps] = useState(false);
	const [designerAppFilter, setDesignerAppFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
	const [designerZoomImage, setDesignerZoomImage] = useState<{ url: string; caption?: string } | null>(null);
 const [sponsors, setSponsors] = useState<any[]>([]);
 const [news, setNews] = useState<any[]>([]);
 const [ffAiDocs, setFfAiDocs] = useState<any[]>([]);
 const [ffAiSearch, setFfAiSearch] = useState('');
 const [showFfAiModal, setShowFfAiModal] = useState(false);
 const [editingFfAiDoc, setEditingFfAiDoc] = useState<any | null>(null);
 const [ffAiTestPrompt, setFfAiTestPrompt] = useState('');
 const [ffAiTestResult, setFfAiTestResult] = useState('');
 const [ffAiTestLoading, setFfAiTestLoading] = useState(false);
 const [ffAiForm, setFfAiForm] = useState({
 title: '',
 institution: '',
 category: 'university_guide',
 content: '',
 faculties: '',
 tuition: '',
 admissionRequirements: '',
 deadlines: '',
 language: 'az,ru,en'
 });

  // Designer alphabetical tab state
  const [designerTabSortAsc, setDesignerTabSortAsc] = useState<boolean>(true);
  const [designerTabSearch, setDesignerTabSearch] = useState<string>();

  const designersAlphabeticalList = useMemo(() => {
    return [...designers]
      .filter(d => {
        if (!designerTabSearch) return true;
        const term = designerTabSearch.toLowerCase();
        return (
          (d.name && d.name.toLowerCase().includes(term)) ||
          (d.brand && d.brand.toLowerCase().includes(term)) ||
          (d.category && d.category.toLowerCase().includes(term))
        );
      })
      .sort((a, b) => {
        const nameA = (a.name || a.brand || "").trim().toLowerCase();
        const nameB = (b.name || b.brand || "").trim().toLowerCase();
        return designerTabSortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
  }, [designers, designerTabSearch, designerTabSortAsc]);

  // Sponsorship state and actions
  const [selectedSponsorship, setSelectedSponsorship] = useState<any | null>(null);

  const handleUpdateSponsorshipStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "sponsorships", id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      setSponsorships(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
      ui.alert("Статус спонсора обновлен");
    } catch (err: any) {
      console.error("Error updating sponsor status:", err);
      ui.alert("Ошибка обновления статуса");
    }
  };

  // Careers / Vacancies management
  const [careersSubTab, setCareersSubTab] = useState<"vacancies" | "applications">("vacancies");
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [vacanciesLoading, setVacanciesLoading] = useState(false);
  const [vacancyFilter, setVacancyFilter] = useState<"all" | "active" | "pending" | "closed">("all");
  const [selectedVacancyDetails, setSelectedVacancyDetails] = useState<any | null>(null);

  const fetchVacancies = async () => {
    setVacanciesLoading(true);
    try {
      const snap = await getDocs(collection(db, "vacancies"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setVacancies(list);
    } catch (err) {
      console.error("Error fetching vacancies:", err);
      handleFirestoreError(err, OperationType.GET, "vacancies");
    } finally {
      setVacanciesLoading(false);
    }
  };

  const handleUpdateVacancyStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "vacancies", id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      setVacancies(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
      ui.alert(`Статус вакансии изменен на: ${newStatus}`);
    } catch (err: any) {
      console.error("Error updating vacancy status:", err);
      handleFirestoreError(err, OperationType.UPDATE, `vacancies/${id}`);
      ui.alert("Ошибка обновления статуса");
    }
  };

  const handleDeleteVacancy = async (id: string, title: string) => {
    if (!window.confirm(`Вы уверены, что хотите удалить вакансию «${title}»?`)) return;
    try {
      await deleteDoc(doc(db, "vacancies", id));
      setVacancies(prev => prev.filter(v => v.id !== id));
      ui.alert("Вакансия успешно удалена");
    } catch (err: any) {
      console.error("Error deleting vacancy:", err);
      handleFirestoreError(err, OperationType.DELETE, `vacancies/${id}`);
      ui.alert("Ошибка при удалении вакансии");
    }
  };

 const sortCollectionItems = (items: any[]) => {
 return [...items].sort((a, b) => {
 if (typeof a.order === 'number' && typeof b.order === 'number') {
 return a.order - b.order;
 }
 if (typeof a.order === 'number') return -1;
 if (typeof b.order === 'number') return 1;
 return 0;
 });
 };

 const fetchCollection = async (collectionName: string, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
 try {
 const snapshot = await getDocs(collection(db, collectionName));
 const list = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
 setter(sortCollectionItems(list));
 } catch (err) {
 console.error(`Failed to fetch ${collectionName}:`, err);
 }
 };

 const handleMoveRow = async (
 collectionName: string,
 list: any[],
 setList: React.Dispatch<React.SetStateAction<any[]>>,
 index: number,
 direction: 'up' | 'down'
 ) => {
 const targetIndex = direction === 'up' ? index - 1 : index + 1;
 if (targetIndex < 0 || targetIndex >= list.length) return;

 const newList = [...list];
 const itemToMove = newList[index];
 const itemToSwap = newList[targetIndex];

 newList[index] = itemToSwap;
 newList[targetIndex] = itemToMove;

 const reordered = newList.map((item, idx) => ({ ...item, order: idx }));
 setList(reordered);

 try {
 if (itemToMove?.id) await updateDoc(doc(db, collectionName, itemToMove.id), { order: targetIndex });
 if (itemToSwap?.id) await updateDoc(doc(db, collectionName, itemToSwap.id), { order: index });
 } catch (err) {
 console.error(`Failed updating order for ${collectionName}:`, err);
 }
 };

 const [eduCategoryFilter, setEduCategoryFilter] = useState('all');

 useEffect(() => {
 const initData = async () => {
 try {
 const designerSnap = await getDocs(collection(db, 'designers'));
 if (designerSnap.empty) {
 for (const item of DEFAULT_DESIGNERS) {
 await addDoc(collection(db, 'designers'), {
 name: item.name,
 designerName: item.designerName,
 instagram: item.instagram || '',
 website: item.website || '',
 createdAt: serverTimestamp()
 });
 }
 fetchCollection('designers', setDesigners);
 } else {
 setDesigners(designerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
 }
 } catch (err) {
 console.error("Failed loading designers:", err);
 }
 
 try {
 const eduSnap = await getDocs(collection(db, 'education'));
 if (eduSnap.empty) {
 for (const item of DEFAULT_EDUCATION_INSTITUTIONS) {
 await addDoc(collection(db, 'education'), {
 ...item,
 createdAt: serverTimestamp()
 });
 }
 fetchCollection('education', setEducation);
 } else {
 setEducation(eduSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
 }
 } catch (err) {
 console.error("Failed loading education:", err);
 }

  try {
    const OBSOLETE = ['fms models', 'fashion model school', 'high life model agency', 'high life', 'baku model management', 'baku models'];
    const agencySnap = await getDocs(collection(db, 'agencies'));
    if (agencySnap.empty) {
      for (const item of DEFAULT_AGENCIES) {
        await addDoc(collection(db, 'agencies'), {
          ...item,
          createdAt: serverTimestamp()
        });
      }
      fetchCollection('agencies', setAgencies);
    } else {
      const list = agencySnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(a => !OBSOLETE.some(obs => (a.name || '').toLowerCase().includes(obs)));
      setAgencies(list);
    }
  } catch (err) {
    console.error("Failed loading agencies:", err);
  }

    fetchCollection('sponsors', setSponsors);
    fetchCollection('news', setNews);
    fetchAboutUsData();
    fetchCenterData();
    fetchSocialLinks();
 fetchAgencyApplications();
		fetchDesignerApplications();
 };
 initData();
 }, []);

 const fetchAgencyApplications = async () => {
 setLoadingAgencyApps(true);
 try {
 const snap = await getDocs(collection(db, 'agency_applications'));
 const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
 list.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
 setAgencyApplications(list);
 } catch (err) {
 console.error('Failed fetching agency applications:', err);
 } finally {
 setLoadingAgencyApps(false);
 }
 };

 const handleApproveAgencyApp = async (app: any) => {
 if (!await ui.confirm(`Одобрить официальный статус агентства для «${app.agencyName}» (${app.applicantFirstName} ${app.applicantLastName})?`)) return;

 try {
 const now = Date.now();
 // 1. Update agency_applications doc
 await updateDoc(doc(db, 'agency_applications', app.id), {
 status: 'approved',
 reviewedAt: now,
 reviewedBy: currentUser?.uid || 'admin'
 });

 // 2. Link or create agency in agencies collection
 let agencyDocId = '';
 const existingAgency = agencies.find(a => a.name.toLowerCase() === app.agencyName.toLowerCase());
 if (existingAgency) {
 agencyDocId = existingAgency.id;
 await updateDoc(doc(db, 'agencies', existingAgency.id), {
 linkedUserId: app.userId,
 linkedUserName: `${app.applicantFirstName} ${app.applicantLastName}`.trim(),
 linkedUserHandle: app.userHandle || `@${app.userEmail?.split('@')[0]}`,
 hasAgencyBadge: true
 });
 } else {
 const newAgencyDoc = await addDoc(collection(db, 'agencies'), {
 name: app.agencyName,
 location: app.agencyAddress || app.location || 'Баку, Азербайджан',
 description: app.comment || `Официальное модельное агентство ${app.agencyName}. Основано в ${app.foundingYear || '—'}.`,
 focus: ['Fashion', 'Editorial', 'Commercial', 'Runway', 'Scouting'],
 image: app.personalPhotoUrl || app.idCardPhotoUrl || 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&q=80',
 instagram: app.instagram || '',
 website: app.website || '',
 linkedUserId: app.userId,
 linkedUserName: `${app.applicantFirstName} ${app.applicantLastName}`.trim(),
 linkedUserHandle: app.userHandle || `@${app.userEmail?.split('@')[0]}`,
 hasAgencyBadge: true,
 order: 85,
 createdAt: serverTimestamp()
 });
 agencyDocId = newAgencyDoc.id;
 }

 // 3. Update user doc
 await updateDoc(doc(db, 'users', app.userId), {
 isAgency: true,
 isAgencyRepresentative: true,
 hasAgencyBadge: true,
 agencyBadgeGrantedAt: now,
 agencyVerificationStatus: 'approved',
 representedAgencyName: app.agencyName,
 representedAgencyId: agencyDocId,
 industry: 'agency'
 });

 // 4. Send notification to applicant
 await addDoc(collection(db, 'notifications'), {
 userId: app.userId,
 type: 'agency_verified',
 title: 'Статус агентства подтвержден! 🏢',
 message: `Поздравляем! Ваша заявка для агентства «${app.agencyName}» одобрена. Вам присвоен официальный знак отличия и доступ к панели верификации моделей.`,
 read: false,
 createdAt: serverTimestamp()
 });

 ui.alert(`Официальный статус агентства «${app.agencyName}» успешно одобрен!`);
 await fetchAgencyApplications();
		fetchDesignerApplications();
 await fetchCollection('agencies', setAgencies);
 await fetchUsers();
 } catch (err: any) {
 console.error('Failed to approve agency application:', err);
 ui.alert('Ошибка при одобрении заявки: ' + (err.message || ''));
 }
 };

 const handleRejectAgencyApp = async (app: any) => {
 const confirmed = await ui.confirm(`Отклонить заявку для модельного агентства «${app.agencyName}»? Заявитель получит официальное уведомление об отклонении.`);
 if (!confirmed) return;
 const reason = 'Недостаточно информации о деятельности агентства или предоставленных документах (şəxsiyyət vəsiqəsi).';

 try {
 const now = Date.now();
 await updateDoc(doc(db, 'agency_applications', app.id), {
 status: 'rejected',
 reviewedAt: now,
 reviewedBy: currentUser?.uid || 'admin',
 rejectionReason: reason
 });

 await updateDoc(doc(db, 'users', app.userId), {
 agencyVerificationStatus: 'rejected'
 });

 await addDoc(collection(db, 'notifications'), {
 userId: app.userId,
 type: 'agency_rejected',
 title: 'Заявка агентства отклонена',
 message: `Заявка для «${app.agencyName}» была отклонена. Причина: ${reason || 'Уточните данные у администрации.'}`,
 read: false,
 createdAt: serverTimestamp()
 });

 ui.alert('Заявка агентства отклонена.');
 await fetchAgencyApplications();
		fetchDesignerApplications();
 } catch (err: any) {
 console.error('Failed to reject agency application:', err);
 ui.alert('Ошибка при отклонении заявки: ' + (err.message || ''));
 }
 };

 const fetchDesignerApplications = async () => {
		setLoadingDesignerApps(true);
		try {
			const snap = await getDocs(collection(db, 'designer_applications'));
			const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
			list.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
			setDesignerApplications(list);
		} catch (err) {
			console.error('Failed fetching designer applications:', err);
		} finally {
			setLoadingDesignerApps(false);
		}
	};

	const handleApproveDesignerApp = async (app: any) => {
		if (!await ui.confirm(`Одобрить официальный статус дизайнера для «${app.brandName}» (${app.applicantFirstName} ${app.applicantLastName})? Дизайнеру будет присужден официальный знак «Золотая Игла» и открыт раздел «Direct Chat».`)) return;

		try {
			const now = Date.now();
			// 1. Update designer_applications doc
			await updateDoc(doc(db, 'designer_applications', app.id), {
				status: 'approved',
				reviewedAt: now,
				reviewedBy: currentUser?.uid || 'admin'
			});

			// 2. Link or create designer in designers collection
			let designerDocId = '';
			const normBrand = (app.brandName || '').trim().toLowerCase();
			const existingDesigner = designers.find(d => (d.name || '').trim().toLowerCase() === normBrand);
			if (existingDesigner) {
				designerDocId = existingDesigner.id;
				await updateDoc(doc(db, 'designers', existingDesigner.id), {
					linkedUserId: app.userId,
					linkedUserName: `${app.applicantFirstName} ${app.applicantLastName}`.trim(),
					linkedUserHandle: app.userHandle || `@${app.userEmail?.split('@')[0]}`,
					hasGoldenNeedle: true,
					hasDirectChat: true,
					founder: `${app.applicantFirstName} ${app.applicantLastName}`.trim(),
					designerName: `${app.applicantFirstName} ${app.applicantLastName}`.trim(),
					instagram: app.instagram || existingDesigner.instagram || '',
					website: app.website || existingDesigner.website || ''
				});
			} else {
				const newDesignerDoc = await addDoc(collection(db, 'designers'), {
					name: app.brandName,
					designerName: `${app.applicantFirstName} ${app.applicantLastName}`.trim(),
					founder: `${app.applicantFirstName} ${app.applicantLastName}`.trim(),
					location: app.brandAddress || app.location || 'Баку, Азербайджан',
					details: app.comment || `Официальный дизайнер-резидент ${app.brandName}. Основан в ${app.foundingYear || '—'}.`,
					image: app.personalPhotoUrl || app.idCardPhotoUrl || 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80',
					instagram: app.instagram || '',
					website: app.website || '',
					linkedUserId: app.userId,
					linkedUserName: `${app.applicantFirstName} ${app.applicantLastName}`.trim(),
					linkedUserHandle: app.userHandle || `@${app.userEmail?.split('@')[0]}`,
					hasGoldenNeedle: true,
					hasDirectChat: true,
					createdAt: serverTimestamp()
				});
				designerDocId = newDesignerDoc.id;
			}

			// 3. Update target user doc
			await updateDoc(doc(db, 'users', app.userId), {
				isDesigner: true,
				hasGoldenNeedle: true,
				goldenNeedleGrantedAt: now,
				goldenNeedleStatus: 'approved',
				hasDirectChat: true,
				directChatEnabled: true,
				designerVerificationStatus: 'approved',
				designerBrandName: app.brandName,
				brandName: app.brandName,
				designerId: designerDocId,
				industry: 'fashion_design'
			});

			// 4. Send notification to applicant
			await addDoc(collection(db, 'notifications'), {
				userId: app.userId,
				type: 'golden_needle',
				title: 'Золотая Игла присуждена! 🪡',
				message: `Поздравляем! Ваша заявка для бренда «${app.brandName}» одобрена. Вам присвоен официальный знак признания «Золотая Игла» (Qızıl İynə) и открыт персональный раздел «Direct Chat with Designer».`,
				read: false,
				link: '/dashboard?tab=designer',
				createdAt: serverTimestamp()
			});

			ui.alert(`Официальный статус дизайнера «${app.brandName}» успешно одобрен! Присуждена Золотая Игла и активирован Direct Chat.`);
			await fetchDesignerApplications();
			await fetchCollection('designers', setDesigners);
			await fetchUsers();
		} catch (err: any) {
			console.error('Failed to approve designer application:', err);
			ui.alert('Ошибка при одобрении заявки: ' + (err.message || ''));
		}
	};

	const handleRejectDesignerApp = async (app: any) => {
		const confirmed = await ui.confirm(`Отклонить заявку дизайнера для бренда «${app.brandName}»? Заявитель получит официальное уведомление об отклонении.`);
		if (!confirmed) return;
		const reason = 'Недостаточно сведений о модном доме или предоставленных документах (şəxsiyyət vəsiqəsi).';

		try {
			const now = Date.now();
			await updateDoc(doc(db, 'designer_applications', app.id), {
				status: 'rejected',
				reviewedAt: now,
				reviewedBy: currentUser?.uid || 'admin',
				rejectionReason: reason
			});

			await updateDoc(doc(db, 'users', app.userId), {
				designerVerificationStatus: 'rejected'
			});

			await addDoc(collection(db, 'notifications'), {
				userId: app.userId,
				type: 'designer_rejected',
				title: 'Заявка дизайнера отклонена',
				message: `Заявка для «${app.brandName}» была отклонена. Причина: ${reason}`,
				read: false,
				link: '/dashboard?tab=designer',
				createdAt: serverTimestamp()
			});

			ui.alert('Заявка дизайнера отклонена.');
			await fetchDesignerApplications();
		} catch (err: any) {
			console.error('Failed to reject designer application:', err);
			ui.alert('Ошибка при отклонении заявки: ' + (err.message || ''));
		}
	};

	const handleSeedAgencies = async () => {
 if (!await ui.confirm('Загрузить модельные агентства (Venera Models, NL Models и др.) в базу данных?')) return;
 try {
 for (const item of DEFAULT_AGENCIES) {
 await addDoc(collection(db, 'agencies'), {
 ...item,
 createdAt: serverTimestamp()
 });
 }
 await fetchCollection('agencies', setAgencies);
 ui.alert('Модельные агентства успешно загружены!');
 } catch (err) {
 handleFirestoreError(err, OperationType.CREATE, 'agencies');
 }
 };

 const handleSeedEducation = async () => {
 if (!await ui.confirm('Restoring default educational institutions will re-populate the collection. Continue?')) return;
 try {
 for (const item of DEFAULT_EDUCATION_INSTITUTIONS) {
 await addDoc(collection(db, 'education'), {
 ...item,
 createdAt: serverTimestamp()
 });
 }
 await fetchCollection('education', setEducation);
 ui.alert('Successfully populated default educational institutions!');
 } catch (err) {
 handleFirestoreError(err, OperationType.CREATE, 'education');
 }
 };

 const handleSeedDesigners = async () => {
 if (!await ui.confirm('Загрузить 55 стандартных брендов и дизайнеров в базу данных?')) return;
 try {
 for (const item of DEFAULT_DESIGNERS) {
 await addDoc(collection(db, 'designers'), {
 name: item.name,
 designerName: item.designerName,
 instagram: item.instagram || '',
 website: item.website || '',
 createdAt: serverTimestamp()
 });
 }
 await fetchCollection('designers', setDesigners);
 ui.alert('Успешно загружено 55 дизайнеров и брендов!');
 } catch (err) {
 handleFirestoreError(err, OperationType.CREATE, 'designers');
 }
 };

 const [addModalType, setAddModalType] = useState<'designers'|'education'|'agencies'|'job'|'sponsors'|'news'|null>(null);
 const [addModalEditingId, setAddModalEditingId] = useState<string | null>(null);
 const [showInviteModal, setShowInviteModal] = useState(false);
 const [inviteEmail, setInviteEmail] = useState('');
 const [inviteRole, setInviteRole] = useState('admin');
 
 const handleInviteAdmin = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 await setDoc(doc(db, 'admin_invites', inviteEmail), {
 role: inviteRole,
 createdAt: new Date().toISOString()
 });
 ui.alert('Admin invite successfully recorded. They will receive this role upon signup.');
 setShowInviteModal(false);
 setInviteEmail('');
 } catch (err) {
 console.error(err);
 ui.alert('Failed to invite admin');
 }
 };
 
 const INITIAL_MODAL_DATA = { 
    name: '', nameRu: '', category: 'higher_state', badge: '', facultiesStr: '', note: '',
    details: '', location: '', salary: '', type: 'Full-time',
    bio: '', links: '', program: '', price: '', website: '', imageUrl: '',
    instagram: '', whatsapp: '', otherLinks: '', videoUrl: '', number: 1,
    images: [] as NewsMediaItem[],
    videos: [] as NewsMediaItem[],
    mediaLayout: 'hero_carousel' as 'hero_carousel' | 'editorial_inline' | 'bottom_gallery'
  };
 const [addModalData, setAddModalData] = useState(INITIAL_MODAL_DATA);
 const [ticketSearch, setTicketSearch] = useState('');

 // User Management Extension States
 const [userSearch, setUserSearch] = useState('');
 const [subModalUser, setSubModalUser] = useState<any | null>(null);
 const [subTier, setSubTier] = useState<string>('pro');
 const [subDuration, setSubDuration] = useState<string>('1m');
  const [subModalSaving, setSubModalSaving] = useState(false);

 const [brandModalUser, setBrandModalUser] = useState<any | null>(null);
 const [selectedBrandDesignerId, setSelectedBrandDesignerId] = useState<string>('');
 const [customBrandInput, setCustomBrandInput] = useState<string>('');
 const [brandSearchQuery, setBrandSearchQuery] = useState<string>('');
  const [brandModalSaving, setBrandModalSaving] = useState(false);

 // Alphabetically sorted designers by Brand Name (A-Z)
 const sortedAlphabeticalDesigners = useMemo(() => {
 return [...designers].sort((a, b) => {
 const nameA = (a.name || a.designerName || '').trim();
 const nameB = (b.name || b.designerName || '').trim();
 return nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
 });
 }, [designers]);

 // Filtered designers in Brand Modal based on search query
 const filteredModalDesigners = useMemo(() => {
 if (!brandSearchQuery.trim()) return sortedAlphabeticalDesigners;
 const q = brandSearchQuery.toLowerCase().trim();
 return sortedAlphabeticalDesigners.filter(d => 
 (d.name && d.name.toLowerCase().includes(q)) ||
 (d.designerName && d.designerName.toLowerCase().includes(q)) ||
 (d.details && d.details.toLowerCase().includes(q))
 );
 }, [sortedAlphabeticalDesigners, brandSearchQuery]);

 // About Us Page Editor States
 const [aboutUsData, setAboutUsData] = useState({
 title: 'AZ Fashion Hub & Azerbaijan Fashion Platform',
 subtitle: 'The premier ecosystem connecting designers, models, creative agencies, fashion academies, and audiences in Azerbaijan.',
 storyHtml: '',
 mission: 'Our mission is to establish Baku as a global fashion destination, empower independent designers with modern digital tools, curate high-caliber runway events, and foster authentic creative collaboration.',
 vision: 'Building an interconnected international bridge between Baku and global fashion capitals.',
 designersCount: '55+',
 eventsCount: '20+',
 institutionsCount: '15+',
 communityCount: '10K+',
 contactEmail: 'press@azfashionevents.com',
 contactAddress: 'Baku, Azerbaijan • Heydar Aliyev Centre & Nizami Str.',
 contactPhone: '+994 (12) 598-0000'
 });
 const [savingAboutUs, setSavingAboutUs] = useState(false);
 const [aboutSubTab, setAboutSubTab] = useState<'about' | 'center'>((searchParams.get('section') === 'center' || searchParams.get('tab') === 'fashion_center') ? 'center' : 'about');

  const fetchAboutUsData = async () => {
    try {
      let d: any = null;
      const snap = await getDoc(doc(db, 'settings', 'about'));
      if (snap.exists()) {
        d = snap.data();
      } else {
        const altSnap = await getDoc(doc(db, 'siteSettings', 'aboutUs'));
        if (altSnap.exists()) d = altSnap.data();
      }
      if (d) {
        setAboutUsData(prev => ({
          ...prev,
          title: d.title ?? prev.title,
          subtitle: d.subtitle ?? prev.subtitle,
          storyHtml: d.storyHtml ?? prev.storyHtml,
          mission: d.mission ?? prev.mission,
          vision: d.vision ?? prev.vision,
          designersCount: d.stats?.designersCount ?? prev.designersCount,
          eventsCount: d.stats?.eventsCount ?? prev.eventsCount,
          institutionsCount: d.stats?.institutionsCount ?? prev.institutionsCount,
          communityCount: d.stats?.communityCount ?? prev.communityCount,
          contactEmail: d.contactEmail ?? prev.contactEmail,
          contactAddress: d.contactAddress ?? prev.contactAddress,
          contactPhone: d.contactPhone ?? prev.contactPhone
        }));
      }
    } catch (err) {
      console.error('Failed to fetch about us settings:', err);
    }
  };

  const handleSaveAboutUs = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAboutUs(true);
    try {
      const payload = {
        title: aboutUsData.title,
        subtitle: aboutUsData.subtitle,
        storyHtml: aboutUsData.storyHtml,
        mission: aboutUsData.mission,
        vision: aboutUsData.vision,
        stats: {
          designersCount: aboutUsData.designersCount,
          eventsCount: aboutUsData.eventsCount,
          institutionsCount: aboutUsData.institutionsCount,
          communityCount: aboutUsData.communityCount
        },
        contactEmail: aboutUsData.contactEmail,
        contactAddress: aboutUsData.contactAddress,
        contactPhone: aboutUsData.contactPhone,
        updatedAt: Date.now()
      };
      await setDoc(doc(db, 'settings', 'about'), payload, { merge: true });
      await setDoc(doc(db, 'siteSettings', 'aboutUs'), payload, { merge: true });
      ui.alert('Раздел About Us успешно обновлен!');
    } catch (err) {
      console.error('Failed to save about us:', err);
      ui.alert('Ошибка сохранения настроек About Us');
    } finally {
      setSavingAboutUs(false);
    }
  };

  // Fashion Center (Центр Развития Модной Индустрии Азербайджана) States & Handlers
  const [centerData, setCenterData] = useState({
    centerTitle: 'Центр Развития Модной Индустрии Азербайджана',
    centerSubtitle: 'Официальный центр поддержки азербайджанских кутюрье, сохранения богатого национального ремесла и вывода отечественных брендов на международную арену.',
    centerManifestoHtml: '',
    centerAddress: 'Bakı Şəhəri, Nizami küç. 44 / Heydər Əliyev Mərkəzi',
    centerPhone: '+994 (12) 598-2026',
    centerEmail: 'official@fashiondevelopment.az',
    leaders: DEFAULT_LEADERS as LeaderMember[]
  });
  const [savingCenter, setSavingCenter] = useState(false);
  const [showLeaderModal, setShowLeaderModal] = useState(false);
  const [editingLeaderIndex, setEditingLeaderIndex] = useState<number | null>(null);
  const [leaderForm, setLeaderForm] = useState<LeaderMember>({
    id: '',
    name: '',
    roleAz: '',
    roleRu: '',
    roleEn: '',
    photoUrl: '',
    bioAz: '',
    bioRu: '',
    bioEn: '',
    email: ''
  });
  const [uploadingLeaderPhoto, setUploadingLeaderPhoto] = useState(false);

  const fetchCenterData = async () => {
    try {
      let d: any = null;
      const snap = await getDoc(doc(db, 'settings', 'about'));
      if (snap.exists()) {
        d = snap.data();
      } else {
        const altSnap = await getDoc(doc(db, 'siteSettings', 'aboutUs'));
        if (altSnap.exists()) d = altSnap.data();
      }
      if (d) {
        setCenterData(prev => ({
          ...prev,
          centerTitle: d.centerTitle ?? prev.centerTitle,
          centerSubtitle: d.centerSubtitle ?? prev.centerSubtitle,
          centerManifestoHtml: d.centerManifestoHtml ?? prev.centerManifestoHtml,
          centerAddress: d.centerAddress ?? prev.centerAddress,
          centerPhone: d.centerPhone ?? prev.centerPhone,
          centerEmail: d.centerEmail ?? prev.centerEmail,
          leaders: Array.isArray(d.leaders) && d.leaders.length > 0 ? d.leaders : prev.leaders
        }));
      }
    } catch (err) {
      console.error('Failed to fetch fashion center data:', err);
    }
  };

  const handleSaveCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCenter(true);
    try {
      const payload = {
        centerTitle: centerData.centerTitle,
        centerSubtitle: centerData.centerSubtitle,
        centerManifestoHtml: centerData.centerManifestoHtml,
        centerAddress: centerData.centerAddress,
        centerPhone: centerData.centerPhone,
        centerEmail: centerData.centerEmail,
        leaders: centerData.leaders,
        updatedAt: Date.now()
      };
      await setDoc(doc(db, 'settings', 'about'), payload, { merge: true });
      await setDoc(doc(db, 'siteSettings', 'aboutUs'), payload, { merge: true });
      ui.alert('Настройки Центра Развития Модной Индустрии успешно сохранены!');
    } catch (err: any) {
      console.error('Failed to save fashion center settings:', err);
      ui.alert('Ошибка сохранения: ' + (err?.message || 'Не удалось сохранить'));
    } finally {
      setSavingCenter(false);
    }
  };

  const handleOpenAddLeader = () => {
    setEditingLeaderIndex(null);
    setLeaderForm({
      id: 'leader-' + Date.now(),
      name: '',
      roleAz: '',
      roleRu: '',
      roleEn: '',
      photoUrl: '',
      bioAz: '',
      bioRu: '',
      bioEn: '',
      email: ''
    });
    setShowLeaderModal(true);
  };

  const handleOpenEditLeader = (index: number) => {
    setEditingLeaderIndex(index);
    setLeaderForm({ ...centerData.leaders[index] });
    setShowLeaderModal(true);
  };

  const handleSaveLeaderForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaderForm.name.trim()) {
      ui.alert('Пожалуйста, укажите имя руководителя');
      return;
    }
    const updated = [...centerData.leaders];
    if (editingLeaderIndex !== null && editingLeaderIndex >= 0) {
      updated[editingLeaderIndex] = { ...leaderForm };
    } else {
      updated.push({
        ...leaderForm,
        id: leaderForm.id || 'leader-' + Date.now()
      });
    }
    setCenterData(prev => ({ ...prev, leaders: updated }));
    setShowLeaderModal(false);
    ui.alert(editingLeaderIndex !== null ? 'Данные руководителя обновлены' : 'Руководитель добавлен в список');
  };

  const handleDeleteLeader = (index: number) => {
    const leader = centerData.leaders[index];
    if (!window.confirm(`Вы уверены, что хотите удалить руководителя «${leader?.name || ''}»?`)) return;
    const updated = centerData.leaders.filter((_, i) => i !== index);
    setCenterData(prev => ({ ...prev, leaders: updated }));
  };

  const handleMoveLeader = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= centerData.leaders.length) return;
    const updated = [...centerData.leaders];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setCenterData(prev => ({ ...prev, leaders: updated }));
  };

  const handleResetLeadersToDefault = () => {
    if (!window.confirm('Сбросить список руководителей к составу по умолчанию?')) return;
    setCenterData(prev => ({ ...prev, leaders: DEFAULT_LEADERS }));
    ui.alert('Список руководителей сброшен к составу по умолчанию');
  };

  const handleLeaderPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLeaderPhoto(true);
    try {
      const url = await uploadMediaFile(file);
      setLeaderForm(prev => ({ ...prev, photoUrl: url }));
      ui.alert('Фотография успешно загружена');
    } catch (err: any) {
      console.error(err);
      ui.alert('Ошибка загрузки фото: ' + (err?.message || 'Не удалось загрузить'));
    } finally {
      setUploadingLeaderPhoto(false);
    }
  };

 // Social Links Management
 const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>(DEFAULT_SOCIAL_LINKS);
 const [savingSocials, setSavingSocials] = useState(false);
 const [socialsSuccessMessage, setSocialsSuccessMessage] = useState(false);

 const fetchSocialLinks = async () => {
 try {
 const snap = await getDoc(doc(db, 'siteSettings', 'socialLinks'));
 if (snap.exists()) {
 const data = snap.data();
 if (Array.isArray(data.links) && data.links.length > 0) {
 setSocialLinks(data.links);
 }
 }
 } catch (err) {
 console.error('Failed to fetch social links:', err);
 }
 };

 const handleAddSocialLink = () => {
 const newId = 'soc_' + Date.now();
 const newLink: SocialLinkItem = {
 id: newId,
 platform: 'instagram',
 url: '',
 label: 'Instagram',
 isActive: true,
 order: socialLinks.length,
 };
 setSocialLinks(prev => [...prev, newLink]);
 };

 const handleUpdateSocialLink = (id: string, updates: Partial<SocialLinkItem>) => {
 setSocialLinks(prev => prev.map(item => {
 if (item.id === id) {
 const updated = { ...item, ...updates };
 if (updates.platform && (!item.label || item.label.trim() === '' || SOCIAL_PLATFORMS_META.some(p => p.name === item.label))) {
 const matchedMeta = SOCIAL_PLATFORMS_META.find(p => p.id === updates.platform);
 if (matchedMeta) {
 updated.label = matchedMeta.name;
 }
 }
 return updated;
 }
 return item;
 }));
 };

 const handleDeleteSocialLink = async (id: string) => {
 if (!await ui.confirm('Are you sure you want to remove this social link?')) return;
 setSocialLinks(prev => prev.filter(item => item.id !== id).map((item, idx) => ({ ...item, order: idx })));
 };

 const handleMoveSocialLink = (index: number, direction: 'up' | 'down') => {
 const targetIndex = direction === 'up' ? index - 1 : index + 1;
 if (targetIndex < 0 || targetIndex >= socialLinks.length) return;
 const list = [...socialLinks];
 const item = list[index];
 list[index] = list[targetIndex];
 list[targetIndex] = item;
 setSocialLinks(list.map((it, idx) => ({ ...it, order: idx })));
 };

 const handleResetSocialsToDefault = async () => {
 if (!await ui.confirm('Reset all social links to default Azerbaijan Fashion Week configuration?')) return;
 setSocialLinks(DEFAULT_SOCIAL_LINKS);
 };

 const handleSaveSocialLinks = async (e?: React.FormEvent) => {
 if (e) e.preventDefault();
 setSavingSocials(true);
 setSocialsSuccessMessage(false);
 try {
 await setDoc(doc(db, 'siteSettings', 'socialLinks'), {
 links: socialLinks,
 updatedAt: Date.now(),
 updatedBy: currentUser?.email || 'admin'
 });
 setSocialsSuccessMessage(true);
 ui.alert('Social networks and footer links updated successfully!');
 setTimeout(() => setSocialsSuccessMessage(false), 4000);
 } catch (err) {
 console.error('Failed to save social links:', err);
 ui.alert('Failed to save social links to database');
 } finally {
 setSavingSocials(false);
 }
 };

 // User Actions: Golden Needle Toggle
 const handleToggleGoldenNeedle = async (user: any) => {
 const newStatus = !user.hasGoldenNeedle;
 try {
 await updateDoc(doc(db, 'users', user.id), {
 hasGoldenNeedle: newStatus,
 goldenNeedleGrantedAt: newStatus ? Date.now() : null
 });

 // If user is linked to a designer doc, update it too
 if (user.designerId) {
 await updateDoc(doc(db, 'designers', user.designerId), {
 hasGoldenNeedle: newStatus
 });
 }

 fetchUsers();
 ui.alert(newStatus ? 'Golden Needle (Qızıl İynə) granted to user!' : 'Golden Needle removed from user.');
 } catch (err) {
 console.error('Failed to update Golden Needle:', err);
 ui.alert('Error updating Golden Needle status');
 }
 };

 // User Actions: Silver Needle Toggle
 const handleToggleSilverNeedle = async (user: any) => {
 const newStatus = !user.hasSilverNeedle;
 try {
 await updateDoc(doc(db, 'users', user.id), {
 hasSilverNeedle: newStatus,
 silverNeedleStatus: newStatus ? 'approved' : 'none',
 silverNeedleGrantedAt: newStatus ? Date.now() : null
 });

 fetchUsers();
 ui.alert(newStatus ? 'Silver Needle (Gümüş İynə) granted to user!' : 'Silver Needle removed from user.');
 } catch (err) {
 console.error('Failed to update Silver Needle:', err);
 ui.alert('Error updating Silver Needle status');
 }
 };

 // User Actions: Model Badge Toggle
 const handleToggleModelBadge = async (user: any) => {
 const newStatus = !user.hasModelBadge;
 try {
 await updateDoc(doc(db, 'users', user.id), {
 hasModelBadge: newStatus,
 modelVerificationStatus: newStatus ? 'verified' : 'rejected',
 modelVerifiedAt: newStatus ? Date.now() : null,
 modelVerifiedByAgency: newStatus ? (user.modelAgencyName || 'Administration') : null,
 isModel: true
 });

 if (newStatus) {
 await addDoc(collection(db, 'notifications'), {
 userId: user.id,
 type: 'model_verified',
 title: 'Статус модели подтвержден! 😎',
 message: `Ваш статус модели официально подтвержден. Возле вашего имени теперь отображается значок 😎.`,
 read: false,
 createdAt: serverTimestamp()
 });
 }

 fetchUsers();
 ui.alert(newStatus ? 'Статус модели и значок 😎 успешно присвоены!' : 'Значок модели отозван.');
 } catch (err) {
 console.error('Failed to update Model Badge:', err);
 ui.alert('Ошибка при изменении статуса модели');
 }
 };

 // User Actions: Grant Subscription
 const handleSaveSubscription = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!subModalUser) return;
 try {
 const now = Date.now();
 let expiresAt: number | null = null;
 if (subDuration === '1m') expiresAt = now + 30 * 24 * 60 * 60 * 1000;
 else if (subDuration === '3m') expiresAt = now + 90 * 24 * 60 * 60 * 1000;
 else if (subDuration === '6m') expiresAt = now + 180 * 24 * 60 * 60 * 1000;
 else if (subDuration === '1y') expiresAt = now + 365 * 24 * 60 * 60 * 1000;
 else if (subDuration === 'lifetime') expiresAt = null;

 await updateDoc(doc(db, 'users', subModalUser.id), {
 subscriptionTier: subTier,
 subscriptionExpiresAt: expiresAt,
 subscriptionGrantedByAdmin: true,
 subscriptionGrantedAt: now
 });

 fetchUsers();
 ui.alert(`Subscription [${subTier.toUpperCase()}] assigned successfully!`);
 setSubModalUser(null);
 } catch (err) {
 console.error('Failed to update subscription:', err);
 ui.alert('Failed to update subscription');
 }
 };

 // User Actions: Link Brand
 const handleSaveBrandLink = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!brandModalUser) return;

 try {
 let targetBrandName = '';
 let targetDesignerId: string | null = null;

 if (selectedBrandDesignerId) {
 const found = designers.find(d => d.id === selectedBrandDesignerId);
 targetBrandName = found ? found.name : customBrandInput;
 targetDesignerId = selectedBrandDesignerId;
 } else {
 targetBrandName = customBrandInput.trim() || brandModalUser.name;
 }

 if (!targetBrandName) {
 ui.alert('Please enter or select a brand name');
 return;
 }

 // Update user doc
 await updateDoc(doc(db, 'users', brandModalUser.id), {
 brandName: targetBrandName,
 designerId: targetDesignerId,
 isDesigner: true,
 hasGoldenNeedle: true,
 goldenNeedleGrantedAt: Date.now()
 });

 // Update designer doc if selected
 if (targetDesignerId) {
 await updateDoc(doc(db, 'designers', targetDesignerId), {
 linkedUserId: brandModalUser.id,
 linkedUserName: brandModalUser.name || brandModalUser.email,
 linkedUserHandle: brandModalUser.handle || `@${brandModalUser.name?.toLowerCase().replace(/\s+/g, '') || 'designer'}`,
 hasGoldenNeedle: true
 });
 }

 fetchUsers();
 fetchCollection('designers', setDesigners);
 ui.alert(`Brand "${targetBrandName}" successfully linked to ${brandModalUser.name || brandModalUser.email}! Direct messaging is now enabled.`);
 setBrandModalUser(null);
 setSelectedBrandDesignerId('');
 setCustomBrandInput('');
 } catch (err) {
 console.error('Failed to link brand:', err);
 ui.alert('Failed to link brand to user');
 }
 };

 const handleUnlinkBrand = async (user: any) => {
 if (!await ui.confirm(`Disconnect brand "${user.brandName}" from ${user.name || user.email}?`)) return;
 try {
 if (user.designerId) {
 await updateDoc(doc(db, 'designers', user.designerId), {
 linkedUserId: null,
 linkedUserName: null,
 linkedUserHandle: null
 });
 }

 await updateDoc(doc(db, 'users', user.id), {
 brandName: null,
 designerId: null,
 isDesigner: false
 });

 fetchUsers();
 fetchCollection('designers', setDesigners);
 ui.alert('Brand disconnected successfully.');
 } catch (err) {
 console.error('Failed to unlink brand:', err);
 ui.alert('Failed to unlink brand');
 }
 };

 const handleAddSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!addModalData.name) return;

 const saveToFirebase = async (collectionName: string, data: any) => {
 try {
 if (addModalEditingId) {
 await updateDoc(doc(db, collectionName, String(addModalEditingId)), data);
 } else {
 await addDoc(collection(db, collectionName), { ...data, createdAt: serverTimestamp() });
 }
 } catch (err) {
 handleFirestoreError(err, addModalEditingId ? OperationType.UPDATE : OperationType.CREATE, collectionName);
 }
 };

 if (addModalType === 'designers') {
 await saveToFirebase('designers', {
 name: addModalData.name, designerName: addModalData.details || 'N/A', instagram: addModalData.instagram, website: addModalData.website
 });
 fetchCollection('designers', setDesigners);
 } else if (addModalType === 'education') {
 const facultiesArray = addModalData.facultiesStr
 ? addModalData.facultiesStr.split('\n').map((f: string) => f.trim()).filter(Boolean)
 : [];
 await saveToFirebase('education', {
 name: addModalData.name,
 nameRu: addModalData.nameRu || '',
 category: addModalData.category || 'higher_state',
 badge: addModalData.badge || '',
 details: addModalData.details || '',
 note: addModalData.note || '',
 website: addModalData.website || '',
 imageUrl: addModalData.imageUrl || '',
 faculties: facultiesArray,
 number: Number(addModalData.number) || 1
 });
 fetchCollection('education', setEducation);
 } else if (addModalType === 'agencies') {
 const focusArr = addModalData.program
 ? addModalData.program.split(',').map(s => s.trim()).filter(Boolean)
 : ['Scouting', 'Placement'];

 await saveToFirebase('agencies', {
 name: addModalData.name,
 location: addModalData.location || addModalData.details || 'Баку, Азербайджан',
 description: addModalData.bio || addModalData.details || '',
 bio: addModalData.bio || addModalData.details || '',
 focus: focusArr,
 image: addModalData.imageUrl || 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&w=800&q=80',
 imageUrl: addModalData.imageUrl || '',
 instagram: addModalData.instagram || '',
 website: addModalData.website || ''
 });
 fetchCollection('agencies', setAgencies);
 } else if (addModalType === 'job') {
 try {
 await addDoc(collection(db, 'vacancies'), {
 title: addModalData.name,
 description: addModalData.details,
 location: addModalData.location,
 salary: addModalData.salary,
 type: addModalData.type,
 employerId: 'PLATFORM_ADMIN',
 createdAt: serverTimestamp()
 });
 ui.alert('Vacancy posted successfully');
 } catch (err) {
 handleFirestoreError(err, OperationType.CREATE, 'vacancies');
 }
 } else if (addModalType === 'news') {
      // 1. Sanitize HTML content: convert any embedded Base64 data URLs to short /uploads/ URLs
      const sanitizedContent = await sanitizeAndPersistHtmlMedia(addModalData.bio || '');

      // 2. Sanitize and ensure lightweight URLs for all images in array
      const rawImages = Array.isArray(addModalData.images) ? addModalData.images : [];
      const imagesList: NewsMediaItem[] = [];
      for (let i = 0; i < rawImages.length; i++) {
        const item = rawImages[i];
        if (typeof item === 'string') {
          const cleanUrl = await uploadBase64Media(item);
          imagesList.push({ id: 'img_' + i, url: cleanUrl, type: 'image', alignment: 'full' });
        } else if (item && item.url) {
          const cleanUrl = await uploadBase64Media(item.url);
          imagesList.push({ ...item, url: cleanUrl });
        }
      }

      // 3. Sanitize and ensure lightweight URLs for all videos in array
      const rawVideos = Array.isArray(addModalData.videos) ? addModalData.videos : [];
      const videosList: NewsMediaItem[] = [];
      for (let i = 0; i < rawVideos.length; i++) {
        const item = rawVideos[i];
        if (typeof item === 'string') {
          const cleanUrl = await uploadBase64Media(item);
          videosList.push({ id: 'vid_' + i, url: cleanUrl, type: 'video', alignment: 'full' });
        } else if (item && item.url) {
          const cleanUrl = await uploadBase64Media(item.url);
          videosList.push({ ...item, url: cleanUrl });
        }
      }

      let coverUrl = addModalData.imageUrl || (imagesList.length > 0 ? imagesList[0].url : '');
      if (coverUrl && coverUrl.startsWith('data:')) {
        coverUrl = await uploadBase64Media(coverUrl);
      }

      let mainVideoUrl = addModalData.videoUrl || (videosList.length > 0 ? videosList[0].url : '');
      if (mainVideoUrl && mainVideoUrl.startsWith('data:')) {
        mainVideoUrl = await uploadBase64Media(mainVideoUrl);
      }

      await saveToFirebase('news', {
        title: addModalData.name,
        content: sanitizedContent,
        imageUrl: coverUrl,
        images: imagesList,
        videoUrl: mainVideoUrl,
        videos: videosList,
        mediaLayout: addModalData.mediaLayout || 'hero_carousel',
        date: new Date().toISOString()
      });
      fetchCollection('news', setNews);
 } else if (addModalType === 'sponsors') {
 await saveToFirebase('sponsors', {
 name: addModalData.name, imageUrl: addModalData.imageUrl, website: addModalData.website
 });
 fetchCollection('sponsors', setSponsors);
 }
 setAddModalType(null);
 setAddModalEditingId(null);
 setAddModalData(INITIAL_MODAL_DATA);
 };

 const startEditMockItem = (type: 'designers'|'education'|'agencies'|'sponsors'|'news', selected: any) => {
 setAddModalType(type);
 setAddModalEditingId(selected.id);
 if (type === 'education') {
 setAddModalData({
 ...INITIAL_MODAL_DATA,
 name: selected.name || '',
 nameRu: selected.nameRu || '',
 category: selected.category || 'higher_state',
 badge: selected.badge || '',
 details: selected.details || selected.description || '',
 note: selected.note || '',
 website: selected.website || '',
 imageUrl: selected.imageUrl || selected.image || '',
 number: selected.number || 1,
 facultiesStr: Array.isArray(selected.faculties) ? selected.faculties.join('\n') : (selected.faculties || '')
 });
 } else if (type === 'agencies') {
 const focusText = Array.isArray(selected.focus)
 ? selected.focus.join(', ')
 : (selected.focus || '');
 setAddModalData({
 ...INITIAL_MODAL_DATA,
 name: selected.name || '',
 location: selected.location || 'Баку, Азербайджан',
 details: selected.location || '',
 bio: selected.description || selected.bio || selected.details || '',
 program: focusText,
 imageUrl: selected.image || selected.imageUrl || '',
 instagram: selected.instagram || '',
 website: selected.website || ''
 });
 } else if (type === 'news') {
      const rawImages = Array.isArray(selected.images) ? selected.images : (selected.imageUrl ? [selected.imageUrl] : []);
      const parsedImages: NewsMediaItem[] = rawImages.map((img: any, idx: number) => {
        if (typeof img === 'string') {
          return { id: `img_${idx}_${Date.now()}`, url: img, type: 'image' as const, alignment: 'full' as const, isCover: idx === 0 || img === selected.imageUrl };
        }
        return {
          id: img.id || `img_${idx}_${Date.now()}`,
          url: img.url,
          type: 'image' as const,
          caption: img.caption || '',
          alignment: img.alignment || 'full',
          isCover: img.isCover || img.url === selected.imageUrl || idx === 0
        };
      });

      const rawVideos = Array.isArray(selected.videos) ? selected.videos : (selected.videoUrl ? [selected.videoUrl] : []);
      const parsedVideos: NewsMediaItem[] = rawVideos.map((vid: any, idx: number) => {
        if (typeof vid === 'string') {
          return { id: `vid_${idx}_${Date.now()}`, url: vid, type: 'video' as const, alignment: 'full' as const };
        }
        return {
          id: vid.id || `vid_${idx}_${Date.now()}`,
          url: vid.url,
          type: 'video' as const,
          caption: vid.caption || '',
          alignment: vid.alignment || 'full'
        };
      });

      setAddModalData({
        ...INITIAL_MODAL_DATA,
        name: selected.title || selected.name || '',
        details: selected.focus || selected.details || '',
        location: selected.location || '',
        bio: selected.bio || selected.content || '',
        links: selected.links || '',
        instagram: selected.instagram || '',
        whatsapp: selected.whatsapp || '',
        otherLinks: selected.otherLinks || '',
        program: selected.program || '',
        price: selected.price || '',
        website: selected.website || '',
        imageUrl: selected.imageUrl || (parsedImages[0]?.url || ''),
        videoUrl: selected.videoUrl || (parsedVideos[0]?.url || ''),
        images: parsedImages,
        videos: parsedVideos,
        mediaLayout: selected.mediaLayout || 'hero_carousel'
      });
    } else {
 setAddModalData({ 
 ...INITIAL_MODAL_DATA,
 name: selected.name || selected.title || '', 
 details: selected.focus || selected.details || '',
 location: selected.location || '',
 bio: selected.bio || selected.content || '',
 links: selected.links || '',
 instagram: selected.instagram || '',
 whatsapp: selected.whatsapp || '',
 otherLinks: selected.otherLinks || '',
 program: selected.program || '',
 price: selected.price || '',
 website: selected.website || '',
 imageUrl: selected.imageUrl || '',
 videoUrl: selected.videoUrl || ''
 });
 }
 };

 const deleteMockItem = async (type: 'designers'|'education'|'agencies'|'sponsors'|'news', id: string) => {
   if (!await ui.confirm('Delete this entry?')) return;
   try {
     if (type === 'news') {
       const newsItem = news.find(n => n.id === id);
       if (newsItem) {
         const mediaUrls = extractAllMediaUrlsFromNews(newsItem);
         if (mediaUrls.length > 0) {
           deleteMediaUrls(mediaUrls).catch(err => console.warn('Cloudinary media deletion failed:', err));
         }
       }
     }
     await deleteDoc(doc(db, type, id));
     if (type === 'designers') fetchCollection('designers', setDesigners);
     if (type === 'education') fetchCollection('education', setEducation);
     if (type === 'agencies') fetchCollection('agencies', setAgencies);
     if (type === 'sponsors') fetchCollection('sponsors', setSponsors);
     if (type === 'news') fetchCollection('news', setNews);
   } catch (err) {
     handleFirestoreError(err, OperationType.DELETE, type);
   }
 };

 const handleDesignerExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files && e.target.files[0]) {
 const reader = new FileReader();
 reader.onload = async (event) => {
 const data = event.target?.result;
 const workbook = XLSX.read(data, { type: 'array' });
 const sheetName = workbook.SheetNames[0];
 const worksheet = workbook.Sheets[sheetName];
 const json = XLSX.utils.sheet_to_json<any>(worksheet);
 
 if (json.length === 0) return;
 
 let count = 0;
 for (const row of json) {
 const keys = Object.keys(row);
 const getVal = (possibleKeys: string[]) => {
 const key = keys.find(k => possibleKeys.includes(k.toLowerCase().trim()));
 return key ? row[key] : '';
 };

 const name = getVal(['name']);
 if (!name) continue;

 const designer = {
 name,
 focus: getVal(['focus', 'category']),
 bio: getVal(['bio', 'description']),
 links: getVal(['website', 'links']),
 instagram: getVal(['instagram']),
 whatsapp: getVal(['whatsapp']),
 otherLinks: getVal(['other links', 'other']),
 imageUrl: getVal(['imageurl', 'photo', 'image']),
 createdAt: serverTimestamp()
 };

 try {
 await addDoc(collection(db, 'designers'), designer);
 count++;
 } catch (err) {
 console.error("Error adding designer from excel", err);
 }
 }
 
 if (count > 0) {
 fetchCollection('designers', setDesigners);
 ui.alert(`${count} designers imported successfully from Excel!`);
 }
 };
 reader.readAsArrayBuffer(e.target.files[0]);
 }
 e.target.value = '';
 };

 const handleEducationCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files && e.target.files[0]) {
 const reader = new FileReader();
 reader.onload = (event) => {
 const text = event.target?.result as string;
 const rows = text.split('\n').filter(r => r.trim());
 if (rows.length < 2) return;
 const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
 
 const parsedEdu = rows.slice(1).map((row, index) => {
 const values = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || row.split(',').map(v => v.trim());
 const eq: any = { id: Date.now() + index };
 headers.forEach((header, idx) => {
 const val = values[idx] || '';
 if (header === 'name' || header === 'institute') eq.name = val;
 if (header === 'program') eq.program = val;
 if (header === 'location') eq.location = val;
 if (header === 'price') eq.price = val;
 if (header === 'website') eq.website = val;
 if (header === 'imageurl' || header === 'photo') eq.imageUrl = val;
 });
 return eq;
 }).filter((eq: any) => eq.name);

 if (parsedEdu.length > 0) {
 const newE = [...education, ...parsedEdu];
 setEducation(newE);
 localStorage.setItem('MOCK_EDUCATION', JSON.stringify(newE));
 ui.alert(`${parsedEdu.length} programs imported successfully!`);
 }
 };
 reader.readAsText(e.target.files[0]);
 }
 e.target.value = '';
 };

 const handleAgencyCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files && e.target.files[0]) {
 const reader = new FileReader();
 reader.onload = (event) => {
 const text = event.target?.result as string;
 const rows = text.split('\n').filter(r => r.trim());
 if (rows.length < 2) return;
 const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
 
 const parsedAgencies = rows.slice(1).map((row, index) => {
 const values = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || row.split(',').map(v => v.trim());
 const a: any = { id: Date.now() + index };
 headers.forEach((header, idx) => {
 const val = values[idx] || '';
 if (header === 'name') a.name = val;
 if (header === 'website') a.website = val;
 if (header === 'focus' || header === 'category' || header === 'details') a.details = val;
 if (header === 'bio' || header === 'description') a.bio = val;
 if (header === 'imageurl' || header === 'photo' || header === 'logo') a.imageUrl = val;
 });
 return a;
 }).filter((a: any) => a.name);

 if (parsedAgencies.length > 0) {
 const newA = [...agencies, ...parsedAgencies];
 setAgencies(newA);
 localStorage.setItem('MOCK_AGENCIES', JSON.stringify(newA));
 ui.alert(`${parsedAgencies.length} agencies imported successfully!`);
 }
 };
 reader.readAsText(e.target.files[0]);
 }
 e.target.value = '';
 };

 const [formData, setFormData] = useState({
 id: '', title: '', description: '', date: '', endDate: '', location: '', imageUrl: '', price: 0, totalTickets: 100, ticketTiers: [] as {name: string, price: number}[], externalTicketUrl: ''
 });
 const [isEditingEvent, setIsEditingEvent] = useState(false);
 const [showEventForm, setShowEventForm] = useState(false);

 useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'events') fetchEvents();
      if (activeTab === 'users' || activeTab === 'stats') fetchUsers();
      if (activeTab === 'tickets') fetchTickets();
      if (activeTab === 'sponsorships') fetchSponsorships();
      if (activeTab === 'careers') { fetchJobApplications(); fetchVacancies(); }
      if (activeTab === 'about_us') { fetchAboutUsData(); fetchCenterData(); }
      if (activeTab === 'ff_ai') fetchFfAiDocs();
    }
 }, [isAdmin, activeTab]);

 const fetchFfAiDocs = async () => {
 try {
 const qs = await getDocs(collection(db, 'ffAiKnowledge'));
 setFfAiDocs(qs.docs.map(d => ({ id: d.id, ...d.data() })));
 } catch (err) {
 console.error('Error fetching ffAiKnowledge:', err);
 }
 };

 const handleSaveFfAiDoc = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!ffAiForm.title.trim() || !ffAiForm.content.trim()) {
 ui.alert('Title and Content are required.');
 return;
 }
 setLoading(true);
 try {
 const payload = {
 title: ffAiForm.title.trim(),
 institution: ffAiForm.institution.trim(),
 category: ffAiForm.category || 'university_guide',
 content: ffAiForm.content.trim(),
 faculties: ffAiForm.faculties ? ffAiForm.faculties.split(',').map(s => s.trim()).filter(Boolean) : [],
 tuition: ffAiForm.tuition.trim(),
 admissionRequirements: ffAiForm.admissionRequirements.trim(),
 deadlines: ffAiForm.deadlines.trim(),
 language: ffAiForm.language || 'az,ru,en',
 updatedAt: serverTimestamp()
 };

 if (editingFfAiDoc) {
 await updateDoc(doc(db, 'ffAiKnowledge', editingFfAiDoc.id), payload);
 ui.alert('Knowledge entry updated successfully.');
 } else {
 await addDoc(collection(db, 'ffAiKnowledge'), {
 ...payload,
 createdAt: serverTimestamp()
 });
 ui.alert('Knowledge entry added to FF AI database.');
 }

 setShowFfAiModal(false);
 setEditingFfAiDoc(null);
 setFfAiForm({
 title: '',
 institution: '',
 category: 'university_guide',
 content: '',
 faculties: '',
 tuition: '',
 admissionRequirements: '',
 deadlines: '',
 language: 'az,ru,en'
 });
 fetchFfAiDocs();
 } catch (err: any) {
 console.error(err);
 ui.alert('Failed to save knowledge item: ' + err.message);
 } finally {
 setLoading(false);
 }
 };

 const handleDeleteFfAiDoc = async (id: string) => {
 if (!confirm('Are you sure you want to remove this knowledge doc from FF AI?')) return;
 try {
 await deleteDoc(doc(db, 'ffAiKnowledge', id));
 setFfAiDocs(prev => prev.filter(d => d.id !== id));
 ui.alert('Doc removed.');
 } catch (err: any) {
 ui.alert('Error deleting: ' + err.message);
 }
 };

 const handleTestFfAi = async () => {
 if (!ffAiTestPrompt.trim() || ffAiTestLoading) return;
 setFfAiTestLoading(true);
 setFfAiTestResult('');
 try {
 const res = await apiFetch('/api/education-ai-chat', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 message: ffAiTestPrompt.trim(),
 history: [],
 locale: 'ru'
 })
 });
 const data = await res.json();
 setFfAiTestResult(data.reply || 'No response returned.');
 } catch (err: any) {
 setFfAiTestResult('Error: ' + err.message);
 } finally {
 setFfAiTestLoading(false);
 }
 };

 const fetchSponsorships = async () => {
 try {
 const qs = await getDocs(collection(db, 'sponsorships'));
 setSponsorships(qs.docs.map(d => ({ id: d.id, ...d.data() })));
 } catch (err) {
 handleFirestoreError(err, OperationType.GET, 'sponsorships');
 }
 };

 const fetchJobApplications = async () => {
 try {
 const qs = await getDocs(collection(db, 'jobApplications'));
 setJobApplications(qs.docs.map(d => ({ id: d.id, ...d.data() })));
 } catch (err) {
 handleFirestoreError(err, OperationType.GET, 'jobApplications');
 }
 };

 const fetchEvents = async () => {
 try {
 const qs = await getDocs(collection(db, 'events'));
 setEvents(qs.docs.map(d => ({ id: d.id, ...d.data() })));
 } catch (err) {
 handleFirestoreError(err, OperationType.GET, 'events');
 }
 };

 
 const handleFileUpload = async (file: File, maxSize: number = 15000000, typeName: string = 'Image'): Promise<string | null> => {
 if (file.size > maxSize) {
 ui.alert(`${typeName} too large (Max ${Math.round(maxSize / 1000000)}MB)`);
 return null;
 }
 setLoading(true);
 try {
 const url = await uploadMediaFile(file);
 return url;
 } catch (err: any) {
 console.error('File upload error:', err);
 ui.alert(err.message || 'Failed to upload file');
 return null;
 } finally {
 setLoading(false);
 }
 };

 const fetchUsers = async () => {
 try {
 const qs = await getDocs(collection(db, 'users'));
 setUsers(qs.docs.map(d => ({ id: d.id, ...d.data() })));
 } catch (err) {
 handleFirestoreError(err, OperationType.GET, 'users');
 }
 };

 const fetchTickets = async () => {
 try {
 const qs = await getDocs(collection(db, 'tickets'));
 setTickets(qs.docs.map(d => ({ id: d.id, ...d.data() })));
 } catch (err) {
 handleFirestoreError(err, OperationType.GET, 'tickets');
 }
 };

 if (!isAdmin) {
 return <div className="p-12 text-center text-brand-dark/50 font-bold uppercase tracking-widest">{t('no_events') || 'Access Denied'}</div>;
 }

 const handleEventSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 try {
 const timestamp = Date.now();
 const eventDate = new Date(formData.date).getTime() || timestamp;
 const eventEndDate = formData.endDate ? new Date(formData.endDate).getTime() : null;
 
 if (isEditingEvent && formData.id) {
 const eventRef = doc(db, 'events', formData.id);
 const eventData = events.find(ev => ev.id === formData.id);
 await updateDoc(eventRef, {
 title: formData.title || 'Untitled Event', description: formData.description || 'No description', date: eventDate,
 endDate: eventEndDate,
 location: formData.location || 'TBA', imageUrl: formData.imageUrl || '', price: Number(formData.price) || 0, ticketTiers: formData.ticketTiers || [], externalTicketUrl: formData.externalTicketUrl || '',
 totalTickets: Number(formData.totalTickets) || 1,
 availableTickets: (Number(formData.totalTickets) || 1) - (eventData.totalTickets - eventData.availableTickets),
 updatedAt: timestamp
 });
 } else {
 const eventId = crypto.randomUUID();
 const eventRef = doc(db, 'events', eventId);
 await setDoc(eventRef, {
 title: formData.title || 'Untitled Event', description: formData.description || 'No description', date: eventDate,
 endDate: eventEndDate,
 location: formData.location || 'TBA', imageUrl: formData.imageUrl || '', price: Number(formData.price) || 0, ticketTiers: formData.ticketTiers || [], externalTicketUrl: formData.externalTicketUrl || '',
 totalTickets: Number(formData.totalTickets) || 1, availableTickets: Number(formData.totalTickets) || 1,
 createdAt: timestamp, updatedAt: timestamp
 });
 }
 setShowEventForm(false);
 fetchEvents();
 ui.alert(isEditingEvent ? 'Event updated!' : 'Event created!');
 } catch (err) {
 handleFirestoreError(err, isEditingEvent ? OperationType.UPDATE : OperationType.CREATE, 'events');
 } finally {
 setLoading(false);
 }
 };

 const handleDeleteEvent = async (id: string) => {
 if (!await ui.confirm('Are you sure you want to delete this event?')) return;
 try {
 await deleteDoc(doc(db, 'events', id));
 fetchEvents();
 } catch (err) {
 handleFirestoreError(err, OperationType.DELETE, 'events');
 }
 };

 const startEditEvent = (ev: any) => {
 setFormData({
 id: ev.id, title: ev.title, description: ev.description, location: ev.location,
 imageUrl: ev.imageUrl, price: ev.price, totalTickets: ev.totalTickets, ticketTiers: ev.ticketTiers || [], externalTicketUrl: ev.externalTicketUrl || '',
 date: ev.date ? new Date(ev.date).toISOString().slice(0, 16) : '',
 endDate: ev.endDate ? new Date(ev.endDate).toISOString().slice(0, 16) : ''
 });
 setIsEditingEvent(true);
 setShowEventForm(true);
 };

 const handleUpdateUserRole = async (userId: string, newRole: string, createdAt: number) => {
 try {
 await updateDoc(doc(db, 'users', userId), { role: newRole });
 fetchUsers();
 } catch (err) {
 handleFirestoreError(err, OperationType.UPDATE, 'users');
 }
 };

 const handleDeleteUser = async (id: string) => {
 if (!await ui.confirm('Are you sure you want to delete this user? This will permanently remove their account, profile, and all associated data from Firebase.')) return;
 try {
 // 1. Instantly remove from local UI list for smooth UX
 setUsers(prev => prev.filter(u => u.id !== id));

 // 2. Delete user doc directly in Firestore
 await deleteDoc(doc(db, 'users', id));

 // 3. Cascade unlink any designer linked to this user
 try {
 const designersSnap = await getDocs(query(collection(db, 'designers'), where('linkedUserId', '==', id)));
 for (const d of designersSnap.docs) {
 await updateDoc(doc(db, 'designers', d.id), {
 linkedUserId: null,
 linkedUserName: null,
 linkedUserHandle: null,
 hasGoldenNeedle: false,
 });
 }
 } catch (e) {
 console.warn('Designer unlink on user delete error:', e);
 }

 // 4. Cascade delete user notifications
 try {
 const notifsSnap = await getDocs(query(collection(db, 'notifications'), where('userId', '==', id)));
 for (const n of notifsSnap.docs) {
 await deleteDoc(doc(db, 'notifications', n.id));
 }
 } catch (e) {
 console.warn('Notifications delete on user delete error:', e);
 }

 // 5. Cascade delete user applications
 try {
 const appsSnap = await getDocs(query(collection(db, 'job_applications'), where('userId', '==', id)));
 for (const a of appsSnap.docs) {
 await deleteDoc(doc(db, 'job_applications', a.id));
 }
 } catch (e) {
 console.warn('Job applications delete error:', e);
 }

 // 6. Call backend server to purge Firebase Auth account
 if (currentUser) {
 try {
 const token = await currentUser.getIdToken();
 await apiFetch('/api/admin/delete-user', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({ targetUserId: id })
 });
 } catch (apiErr) {
 console.warn('Auth deletion API call error:', apiErr);
 }
 }

 toast.success('Пользователь и связанные данные успешно удалены из Firebase');
 fetchUsers();
 } catch (err) {
 handleFirestoreError(err, OperationType.DELETE, 'users');
 fetchUsers();
 }
 };

 const handleDeleteTicket = async (id: string) => {
 if (!await ui.confirm('Are you sure you want to delete this ticket?')) return;
 try {
 await deleteDoc(doc(db, 'tickets', id));
 fetchTickets();
 } catch (err) {
 handleFirestoreError(err, OperationType.DELETE, 'tickets');
 }
 };

  return (
    <div className="bg-brand-light min-h-screen pb-16">
      {/* 1. EDITORIAL HERO HEADER */}
      <section className="border-b border-brand-dark/[0.08] bg-brand-light pt-6 pb-6 sm:py-10 px-4 sm:px-8 relative overflow-hidden shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-brand-accent px-3 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15 font-mono">
                System Administration
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono text-brand-dark/50 uppercase tracking-wider">
                • {userRole ? userRole.toUpperCase() : 'ADMIN'} CONSOLE
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-normal tracking-tight text-brand-dark leading-[1.02]">
              Admin Console / <span className="italic text-brand-accent font-serif font-normal">Панель управления</span>
            </h1>
            <p className="text-xs sm:text-sm text-brand-dark/65 mt-1.5 max-w-xl font-normal leading-relaxed">
              Управление показами, аккредитациями дизайнеров, заявками агентств, институтами моды и глобальными параметрами платформы.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                setActiveTab('site_modules');
                setSearchParams({ tab: 'site_modules' });
              }}
              className="bg-brand-accent hover:bg-brand-accent/90 text-white px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider font-bold flex items-center gap-2 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Sliders size={14} />
              <span>Разделы & Функции</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>
            <span className="text-[10px] sm:text-[11px] font-mono uppercase text-brand-dark/50 tracking-wider">
              AZ/FSHN ROOT ACCESS
            </span>
          </div>
        </div>
      </section>

      {/* 2. EDITORIAL TABS NAVIGATION (2 ROWS FOR INSTANT VISIBILITY) */}
      <div className="border-b border-brand-dark/[0.08] bg-white sticky top-14 sm:top-16 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2.5 space-y-1.5">
          {(() => {
            const half = Math.ceil(allowedTabs.length / 2);
            const row1 = allowedTabs.slice(0, half);
            const row2 = allowedTabs.slice(half);

            const renderTabBtn = (tab: string) => {
              const isTabActive = activeTab === tab;
              const isSiteModules = tab === 'site_modules';
              const tabLabel = isSiteModules
                ? '⚡ Разделы & Функции'
                : tab === 'homepage_materials'
                ? '🎬 Главная & Медиа'
                : tab === 'giveaways'
                ? '🎁 Розыгрыши билетов'
                : tab === 'events'
                ? '📅 Показы & События'
                : tab === 'stats'
                ? '📊 Статистика'
                : tab === 'users'
                ? '👥 Пользователи'
                : tab === 'ff_ai' 
                ? 'Fashion AI Core' 
                : tab === 'socials' 
                ? 'Socials & Footer' 
                : tab === 'about_us' 
                ? 'О нас и Центр моды' 
                : tab === 'designer_verifications'
                ? `🪡 Верификация дизайнеров (${designerApplications.filter(a => a.status === 'pending').length})`
                : tab.replace('_', ' ');

              return (
                <button 
                  key={tab} 
                  onClick={() => {
                    setActiveTab(tab as any);
                    setSearchParams({ tab });
                  }}
                  className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full font-semibold uppercase tracking-wider text-[11px] sm:text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isTabActive 
                      ? 'bg-brand-dark text-white shadow-2xs ring-1 ring-brand-dark/20' 
                      : isSiteModules
                      ? 'text-brand-accent bg-brand-accent/10 border border-brand-accent/30 hover:bg-brand-accent/20 font-bold'
                      : 'text-brand-dark/70 hover:text-brand-dark hover:bg-brand-dark/[0.05]'
                  }`}
                >
                  <span>{tabLabel}</span>
                </button>
              );
            };

            return (
              <>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {row1.map(renderTabBtn)}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {row2.map(renderTabBtn)}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 py-8 sm:py-12 animate-in fade-in duration-300">
        {activeTab === 'homepage_materials' && (
          <HomeMaterialsAdminTab />
        )}

        {activeTab === 'site_modules' && (
          <SiteModulesAdminTab />
        )}

        {activeTab === 'giveaways' && (
          <TicketGiveawaysAdminTab />
        )}

        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-brand-dark/[0.08] pb-4">
              <div>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                  Schedule & Runways
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark mt-1">Manage Events</h2>
              </div>
              {!showEventForm && (
                <button onClick={() => {
                  setFormData({ id: '', title: '', description: '', date: '', endDate: '', location: '', imageUrl: '', price: 0, totalTickets: 100, ticketTiers: [], externalTicketUrl: '' });
                  setIsEditingEvent(false);
                  setShowEventForm(true);
                }} className="rounded-full bg-brand-dark hover:bg-brand-accent text-white px-5 py-2.5 font-semibold text-xs uppercase tracking-wider transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5">
                  <Plus size={14} /> Create New Event
                </button>
              )}
            </div>

            {showEventForm ? (
              <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 md:p-10 mb-8 shadow-xs">
                <div className="flex justify-between items-center mb-6 border-b border-brand-dark/[0.08] pb-4">
                  <h3 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-brand-dark">{isEditingEvent ? 'Edit Event' : t('create_event')}</h3>
                  <button onClick={() => setShowEventForm(false)} className="w-8 h-8 rounded-full border border-brand-dark/10 hover:bg-brand-dark hover:text-white flex items-center justify-center transition-colors cursor-pointer"><X size={16} /></button>
                </div>
                <form onSubmit={handleEventSubmit} className="flex flex-col gap-6 relative z-10">
                  <div>
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">{t('event_title')}</label>
                    <input required type="text" className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 focus:outline-none focus:bg-white focus:border-brand-accent transition-all text-sm font-medium text-brand-dark"
                      value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">{t('event_description')}</label>
                    <textarea required rows={4} className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-3 focus:outline-none focus:bg-white focus:border-brand-accent transition-all text-sm font-normal text-brand-dark resize-none leading-relaxed"
                      value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">Start Date</label>
                      <input required type="datetime-local" className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 focus:outline-none focus:bg-white focus:border-brand-accent transition-all text-xs font-medium text-brand-dark"
                        value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">End Date (Optional)</label>
                      <input type="datetime-local" className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 focus:outline-none focus:bg-white focus:border-brand-accent transition-all text-xs font-medium text-brand-dark"
                        value={formData.endDate || ''} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">Location</label>
                      <input required type="text" className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 focus:outline-none focus:bg-white focus:border-brand-accent transition-all text-sm font-medium text-brand-dark"
                        value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">Image URL / File</label>
                    <div className="flex gap-3 items-center">
                      <input type="url" required={!formData.imageUrl} className="flex-1 bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 focus:outline-none focus:bg-white focus:border-brand-accent transition-all text-xs font-mono text-brand-dark"
                        value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
                      <span className="font-mono text-brand-dark/40 text-xs text-center">OR</span>
                      <label className="cursor-pointer bg-brand-dark text-white font-semibold uppercase tracking-wider text-xs px-4 py-2.5 rounded-full hover:bg-brand-accent transition-colors block text-center shadow-2xs">
                        Upload
                        <input type="file" accept="image/*" className="hidden" onChange={async e => {
                          if (e.target.files && e.target.files[0]) {
                            const url = await handleFileUpload(e.target.files[0]);
                            if(url) setFormData({...formData, imageUrl: url});
                          }
                        }} />
                      </label>
                    </div>
                    {formData.imageUrl && formData.imageUrl.startsWith('data:image') && (
                      <div className="mt-3 w-20 h-20 border border-brand-dark/[0.1] rounded-xl overflow-hidden bg-brand-muted/20 shrink-0">
                        <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">External Ticket URL (e.g. iTickets)</label>
                    <input type="url" className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 focus:outline-none focus:bg-white focus:border-brand-accent transition-all text-xs font-mono text-brand-dark"
                      value={formData.externalTicketUrl || ''} onChange={e => setFormData({...formData, externalTicketUrl: e.target.value})} placeholder="Leave blank to sell tickets internally" />
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">Base Price (AZN)</label>
                      <input required type="number" min="0" step="0.01" className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 focus:outline-none focus:bg-white focus:border-brand-accent transition-all text-sm font-semibold text-brand-dark"
                        value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">Total Tickets</label>
                      <input required type="number" min="1" className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 focus:outline-none focus:bg-white focus:border-brand-accent transition-all text-sm font-semibold text-brand-dark"
                        value={formData.totalTickets} onChange={e => setFormData({...formData, totalTickets: Number(e.target.value)})} />
                    </div>
                  </div>

                  <div className="border border-brand-dark/[0.08] rounded-2xl p-5 bg-brand-muted/20">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark">Ticket Tiers (Optional)</label>
                      <button type="button" onClick={() => setFormData({...formData, ticketTiers: [...(formData.ticketTiers || []), {name: 'VIP', price: 0}]})} className="rounded-full bg-brand-dark text-white px-3.5 py-1 font-semibold uppercase tracking-wider text-[11px] hover:bg-brand-accent transition-colors shadow-2xs cursor-pointer">+ Add Tier</button>
                    </div>
                    <div className="flex flex-col gap-3">
                      {formData.ticketTiers?.map((tier, idx) => (
                        <div key={idx} className="flex gap-3 items-center">
                          <input type="text" placeholder="Tier Name" className="flex-1 bg-white border border-brand-dark/[0.12] rounded-xl px-3 py-2 focus:outline-none focus:border-brand-accent transition-all text-xs font-medium" value={tier.name} onChange={async e => { const newTiers = [...formData.ticketTiers]; newTiers[idx].name = e.target.value; setFormData({...formData, ticketTiers: newTiers}); }} />
                          <input type="number" min="0" step="0.01" placeholder="Price" className="w-28 bg-white border border-brand-dark/[0.12] rounded-xl px-3 py-2 focus:outline-none focus:border-brand-accent transition-all text-xs font-medium" value={tier.price} onChange={async e => { const newTiers = [...formData.ticketTiers]; newTiers[idx].price = Number(e.target.value); setFormData({...formData, ticketTiers: newTiers}); }} />
                          <button type="button" onClick={() => { const newTiers = [...formData.ticketTiers]; newTiers.splice(idx, 1); setFormData({...formData, ticketTiers: newTiers}); }} className="w-8 h-8 rounded-full border border-brand-dark/10 text-brand-dark hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-xs font-bold cursor-pointer">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button disabled={loading} type="submit" className="w-full bg-brand-dark text-white rounded-full py-3.5 font-semibold uppercase tracking-wider text-xs hover:bg-brand-accent transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed mt-2 text-center cursor-pointer">
                    {loading ? 'Saving...' : (isEditingEvent ? 'Update Event' : t('create_event'))}
                  </button>
                </form>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {events.map((ev: any, idx: number) => (
                  <div key={ev.id} className="bg-white rounded-2xl border border-brand-dark/[0.08] p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-brand-accent/30 transition-all shadow-xs">
                    <div className="flex items-center gap-4">
                      <img src={ev.imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover border border-brand-dark/[0.08] shrink-0" />
                      <div>
                        <h4 className="text-lg font-serif font-medium text-brand-dark">{ev.title}</h4>
                        <p className="text-xs font-mono text-brand-dark/60 mt-1">
                          {new Date(ev.date).toLocaleDateString()} 
                          {ev.endDate && ` - ${new Date(ev.endDate).toLocaleDateString()}`} &middot; <span className="font-semibold text-brand-accent">{ev.availableTickets} / {ev.totalTickets} left</span>
                        </p>
                        {ev.location && (
                          <p className="text-[11px] text-brand-dark/50 mt-0.5">{ev.location}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <div className="flex gap-1 border border-brand-dark/[0.08] rounded-full p-1 bg-brand-muted/30">
                        <button onClick={() => handleMoveRow('events', events, setEvents, idx, 'up')} disabled={idx === 0} title="Переместить выше" className="w-7 h-7 rounded-full border border-brand-dark/10 bg-white hover:bg-brand-dark hover:text-white disabled:opacity-20 transition-colors flex items-center justify-center cursor-pointer"><ArrowUp size={13}/></button>
                        <button onClick={() => handleMoveRow('events', events, setEvents, idx, 'down')} disabled={idx === events.length - 1} title="Переместить ниже" className="w-7 h-7 rounded-full border border-brand-dark/10 bg-white hover:bg-brand-dark hover:text-white disabled:opacity-20 transition-colors flex items-center justify-center cursor-pointer"><ArrowDown size={13}/></button>
                      </div>
                      <button onClick={() => startEditEvent(ev)} title="Редактировать" className="w-9 h-9 rounded-full border border-brand-dark/[0.12] hover:bg-brand-dark hover:text-white transition-colors bg-white flex items-center justify-center text-brand-dark shadow-2xs cursor-pointer">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDeleteEvent(ev.id)} title="Удалить" className="w-9 h-9 rounded-full border border-brand-dark/[0.12] hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors bg-white flex items-center justify-center text-brand-dark shadow-2xs cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

          {activeTab === 'stats' && (
          <div className="space-y-8">
            <UserActivityCharts users={users} />

            <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 md:p-10 shadow-xs">
              <div className="mb-6 border-b border-brand-dark/[0.08] pb-4">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                  Analytics & Reach
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark mt-1">User Demographics & Interests</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['industry', 'degree', 'interestLevel', 'ageGroup', 'primaryGoal'].map(field => {
                  const counts = users.reduce((acc, user) => {
                    const val = user[field] || 'Not specified';
                    acc[val] = (acc[val] || 0) + 1;
                    return acc;
                  }, {});
                  return (
                    <div key={field} className="rounded-2xl border border-brand-dark/[0.08] bg-brand-muted/20 p-5 space-y-3 shadow-2xs">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark border-b border-brand-dark/[0.08] pb-2">{field.replace(/([A-Z])/g, ' $1').trim()}</h3>
                      <div className="space-y-2">
                        {Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([key, count]) => (
                          <div key={key} className="flex justify-between items-center text-xs font-mono">
                            <span className="text-brand-dark/80">{key}</span>
                            <span className="bg-brand-dark text-white px-2.5 py-0.5 rounded-full font-semibold text-[11px]">{String(count)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

          {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-3xl border border-brand-dark/[0.08] p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/40" />
                  <input 
                    type="text" 
                    placeholder="Search user by name, email, @handle, brand..." 
                    value={userSearch} 
                    onChange={e => setUserSearch(e.target.value)} 
                    className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-full pl-11 pr-4 py-2 font-mono text-xs text-brand-dark focus:outline-none focus:bg-white focus:border-brand-accent transition-all"
                  />
                </div>
                <div className="text-xs font-mono text-brand-dark/60 hidden sm:block">
                  Total: <span className="font-bold text-brand-dark">{users.length}</span>
                </div>
              </div>

              <div className="flex gap-3 w-full md:w-auto justify-end">
                <button onClick={() => setShowInviteModal(true)} className="rounded-full bg-brand-dark text-white px-5 py-2.5 font-semibold uppercase tracking-wider text-xs hover:bg-brand-accent transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5">
                  <Plus size={14} /> Pre-Assign Role
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-brand-dark/[0.08] bg-white shadow-xs">
              <table className="w-full text-left font-normal border-collapse min-w-[950px]">
                <thead>
                  <tr className="border-b border-brand-dark/[0.08] bg-brand-muted/30 text-brand-dark/70 font-mono uppercase tracking-wider text-[11px]">
                    <th className="p-4 border-r border-brand-dark/[0.06] font-semibold">User / Account</th>
                    <th className="p-4 border-r border-brand-dark/[0.06] font-semibold text-center">Needle Badges 🪡</th>
                    <th className="p-4 border-r border-brand-dark/[0.06] font-semibold">Linked Brand</th>
                    <th className="p-4 border-r-2 border-brand-dark/[0.06] font-semibold">Subscription</th>
                    <th className="p-4 border-r border-brand-dark/[0.06] font-semibold">Role</th>
                    <th className="p-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(u => {
                      if (!userSearch) return true;
                      const q = userSearch.toLowerCase();
                      return (
                        (u.name && u.name.toLowerCase().includes(q)) ||
                        (u.email && u.email.toLowerCase().includes(q)) ||
                        (u.handle && u.handle.toLowerCase().includes(q)) ||
                        (u.brandName && u.brandName.toLowerCase().includes(q))
                      );
                    })
                    .map(u => {
                      const isSubActive = u.subscriptionTier && u.subscriptionTier !== 'free' && (!u.subscriptionExpiresAt || u.subscriptionExpiresAt > Date.now());
                      const expiresLabel = u.subscriptionExpiresAt ? `Exp: ${new Date(u.subscriptionExpiresAt).toLocaleDateString()}` : 'Lifetime';

                      return (
                        <tr key={u.id} className="border-b border-brand-dark/[0.05] hover:bg-brand-muted/20 transition-colors last:border-b-0">
                          {/* User details */}
                          <td className="p-4 border-r border-brand-dark/[0.06]">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full border border-brand-dark/[0.12] bg-brand-muted/40 overflow-hidden flex items-center justify-center shrink-0">
                                {u.photoURL ? (
                                  <img src={u.photoURL} alt={u.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="font-serif font-bold text-sm text-brand-dark uppercase">{(u.name || u.email || 'U')[0]}</span>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 font-medium text-brand-dark leading-tight flex-wrap">
                                  <Link to={`/u/${u.handle ? u.handle.replace('@', '') : u.name}`} target="_blank" className="hover:text-brand-accent hover:underline flex items-center gap-1 font-serif text-sm">
                                    {u.name || 'Anonymous User'}
                                    <ExternalLink size={12} className="opacity-40" />
                                  </Link>
                                  {u.hasGoldenNeedle && <GoldenNeedleBadge size="sm" showLabel={false} />}
                                  {(u.hasSilverNeedle || u.silverNeedleStatus === 'approved') && <SilverNeedleBadge size="sm" showLabel={false} />}
                                  {u.hasModelBadge && <ModelVerifiedBadge size="sm" showLabel={false} />}
                                </div>
                                <div className="text-xs text-brand-dark/50 font-mono mt-0.5">{u.email}</div>
                                {u.handle && <div className="text-[11px] text-brand-accent font-mono font-semibold">{u.handle}</div>}
                                {u.modelAgencyName && (
                                  <div className="text-[10px] font-mono text-brand-dark/70 mt-0.5">
                                    Агентство: <span className="font-semibold text-brand-dark">{u.modelAgencyName}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Needle Badges & Toggles */}
                          <td className="p-4 border-r border-brand-dark/[0.06] text-center">
                            <div className="flex flex-col gap-2 max-w-[200px] mx-auto">
                              {/* Model Badge */}
                              <div className="flex items-center justify-between gap-1 p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <div className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-amber-900">
                                  <span>😎 Model</span>
                                  {u.hasModelBadge && <Check size={12} className="text-emerald-700 font-black" />}
                                </div>
                                <button 
                                  onClick={() => handleToggleModelBadge(u)}
                                  className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                                    u.hasModelBadge 
                                      ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100' 
                                      : 'border-brand-dark bg-brand-dark text-white hover:bg-brand-accent'
                                  }`}
                                >
                                  {u.hasModelBadge ? 'Revoke' : '+ Verify'}
                                </button>
                              </div>

                              {/* Golden Needle */}
                              <div className="flex items-center justify-between gap-1 p-1.5 rounded-xl bg-amber-50 border border-amber-300/60">
                                <div className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-amber-900">
                                  <span>🪡 Golden</span>
                                  {u.hasGoldenNeedle && <Check size={12} className="text-emerald-700 font-black" />}
                                </div>
                                <button 
                                  onClick={() => handleToggleGoldenNeedle(u)}
                                  className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                                    u.hasGoldenNeedle 
                                      ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100' 
                                      : 'border-brand-dark bg-brand-dark text-white hover:bg-brand-accent'
                                  }`}
                                >
                                  {u.hasGoldenNeedle ? 'Revoke' : '+ Grant'}
                                </button>
                              </div>

                              {/* Silver Needle */}
                              <div className="flex items-center justify-between gap-1 p-1.5 rounded-xl bg-slate-100 border border-slate-300/60">
                                <div className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-slate-800">
                                  <span>🪡 Silver</span>
                                  {(u.hasSilverNeedle || u.silverNeedleStatus === 'approved') && <Check size={12} className="text-emerald-700 font-black" />}
                                </div>
                                <button 
                                  onClick={() => handleToggleSilverNeedle(u)}
                                  className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                                    (u.hasSilverNeedle || u.silverNeedleStatus === 'approved')
                                      ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100' 
                                      : 'border-brand-dark bg-brand-dark text-white hover:bg-brand-accent'
                                  }`}
                                >
                                  {(u.hasSilverNeedle || u.silverNeedleStatus === 'approved') ? 'Revoke' : '+ Grant'}
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Linked Brand */}
                          <td className="p-4 border-r border-brand-dark/[0.06]">
                            {u.brandName ? (
                              <div className="flex flex-col gap-1.5 items-start">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-brand-dark/[0.12] bg-brand-muted/30 text-brand-dark text-xs font-semibold shadow-2xs">
                                  <Sparkles size={12} className="text-amber-500" />
                                  {u.brandName}
                                </div>
                                <button 
                                  onClick={() => handleUnlinkBrand(u)}
                                  className="text-[10px] uppercase tracking-wider text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <Unlink size={10} /> Disconnect
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => {
                                  setBrandModalUser(u);
                                  setSelectedBrandDesignerId('');
                                  setCustomBrandInput('');
                                }}
                                className="text-xs uppercase tracking-wider font-semibold text-brand-dark/70 rounded-full border border-dashed border-brand-dark/30 px-3 py-1 hover:border-brand-accent hover:text-brand-accent transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Link2 size={12} /> Link Brand
                              </button>
                            )}
                          </td>

                          {/* Subscription Status & Expiration */}
                          <td className="p-4 border-r border-brand-dark/[0.06]">
                            <div className="flex flex-col gap-1 items-start">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] uppercase font-mono tracking-wider px-2.5 py-0.5 font-semibold rounded-full border ${
                                  isSubActive 
                                    ? 'bg-brand-accent/10 border-brand-accent/30 text-brand-accent' 
                                    : 'bg-transparent border-brand-dark/20 text-brand-dark/50'
                                }`}>
                                  {u.subscriptionTier || 'Free'}
                                </span>
                                {isSubActive && <Crown size={12} className="text-brand-accent" />}
                              </div>
                              {isSubActive && (
                                <span className="text-[10px] font-mono text-brand-dark/50 font-normal">{expiresLabel}</span>
                              )}
                              <button 
                                onClick={() => {
                                  setSubModalUser(u);
                                  setSubTier(u.subscriptionTier && u.subscriptionTier !== 'free' ? u.subscriptionTier : 'pro');
                                  setSubDuration('1m');
                                }}
                                className="text-[10px] uppercase font-mono font-semibold text-brand-accent hover:underline mt-0.5 cursor-pointer"
                              >
                                {isSubActive ? 'Edit Plan / Extend' : '+ Give Premium'}
                              </button>
                            </div>
                          </td>

                          {/* Role Dropdown */}
                          <td className="p-4 border-r border-brand-dark/[0.06]">
                            <select 
                              value={u.role || 'user'}
                              onChange={(e) => handleUpdateUserRole(u.id, e.target.value, u.createdAt)}
                              className="text-xs uppercase tracking-wider font-mono font-semibold rounded-xl border border-brand-dark/[0.12] bg-white px-2.5 py-1 focus:outline-none focus:border-brand-accent cursor-pointer"
                              disabled={userRole !== 'superadmin' && userRole !== 'admin'}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                              <option value="news_editor">News Editor</option>
                              <option value="content_editor">Content Editor</option>
                              <option value="ticket_editor">Ticket Editor</option>
                            </select>
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-center">
                            <button 
                              onClick={() => handleDeleteUser(u.id)} 
                              className="rounded-full border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400 px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

          {activeTab === 'about_us' && (
          <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 md:p-10 shadow-xs">
            {/* Top Unified Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-brand-dark/[0.08] pb-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                    Официальный раздел /about
                  </span>
                  <span className="text-[10px] font-mono text-brand-dark/40 uppercase tracking-wider">
                    • О нас & Центр Развития Моды
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark mt-1">
                  Управление разделом «О нас» и «Центр развития моды»
                </h2>
                <p className="text-brand-dark/60 text-xs sm:text-sm mt-1 font-normal max-w-3xl leading-relaxed">
                  Редактирование всей институциональной информации платформы, миссии, официальной статистики, манифеста, руководства (Direction Board) и контактов для страницы <code className="bg-brand-muted/50 px-2 py-0.5 rounded text-xs font-mono font-bold">/about</code>.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Link 
                  to="/about" 
                  target="_blank" 
                  className="rounded-full border border-brand-dark/20 hover:bg-brand-dark hover:text-white px-4 py-2 font-semibold uppercase tracking-wider text-xs transition-colors shadow-2xs flex items-center gap-1.5 text-brand-dark"
                >
                  <ExternalLink size={14} /> Открыть /about
                </Link>
                <button
                  type="button"
                  onClick={() => { fetchAboutUsData(); fetchCenterData(); }}
                  className="w-9 h-9 rounded-full border border-brand-dark/20 hover:bg-brand-dark hover:text-white flex items-center justify-center transition-colors cursor-pointer text-brand-dark"
                  title="Обновить данные"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Sub-tabs switcher: О нас (Платформа) vs Центр развития модной индустрии */}
            <div className="flex items-center gap-2 mb-8 bg-brand-muted/40 p-1.5 rounded-2xl border border-brand-dark/[0.08] w-fit">
              <button
                type="button"
                onClick={() => setAboutSubTab('about')}
                className={`px-5 py-2.5 rounded-xl font-semibold uppercase tracking-wider text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  aboutSubTab === 'about'
                    ? 'bg-brand-dark text-white shadow-xs'
                    : 'text-brand-dark/70 hover:text-brand-dark hover:bg-white/60'
                }`}
              >
                <FileText size={14} />
                <span>1. О нас & Платформа</span>
              </button>

              <button
                type="button"
                onClick={() => setAboutSubTab('center')}
                className={`px-5 py-2.5 rounded-xl font-semibold uppercase tracking-wider text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  aboutSubTab === 'center'
                    ? 'bg-brand-accent text-white shadow-xs'
                    : 'text-brand-dark/70 hover:text-brand-dark hover:bg-white/60'
                }`}
              >
                <Landmark size={14} />
                <span>2. Центр Развития Модной Индустрии</span>
                {centerData.leaders && centerData.leaders.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-white/20 text-white">
                    {centerData.leaders.length}
                  </span>
                )}
              </button>
            </div>

            {/* Sub-Tab 1: О нас (Платформа) */}
            {aboutSubTab === 'about' && (
              <div className="animate-in fade-in duration-300">
<form onSubmit={handleSaveAboutUs} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">Main Headline / Page Title</label>
                  <input 
                    type="text" 
                    required
                    value={aboutUsData.title} 
                    onChange={e => setAboutUsData({...aboutUsData, title: e.target.value})} 
                    className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:bg-white focus:border-brand-accent text-sm text-brand-dark transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">Subtitle / Tagline</label>
                  <input 
                    type="text" 
                    required
                    value={aboutUsData.subtitle} 
                    onChange={e => setAboutUsData({...aboutUsData, subtitle: e.target.value})} 
                    className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:bg-white focus:border-brand-accent text-sm text-brand-dark transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">Core Mission Statement</label>
                <textarea 
                  rows={3}
                  value={aboutUsData.mission} 
                  onChange={e => setAboutUsData({...aboutUsData, mission: e.target.value})} 
                  className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-3 font-normal focus:outline-none focus:bg-white focus:border-brand-accent text-sm text-brand-dark resize-none transition-all leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">Platform Vision & Strategic Goals</label>
                <textarea 
                  rows={3}
                  value={aboutUsData.vision} 
                  onChange={e => setAboutUsData({...aboutUsData, vision: e.target.value})} 
                  className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-3 font-normal focus:outline-none focus:bg-white focus:border-brand-accent text-sm text-brand-dark resize-none transition-all leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">Custom Story Narrative (HTML / Rich Text)</label>
                <div className="rounded-2xl border border-brand-dark/[0.12] overflow-hidden bg-white shadow-2xs">
                  <ReactQuill 
                    theme="snow"
                    value={aboutUsData.storyHtml}
                    onChange={html => setAboutUsData({...aboutUsData, storyHtml: html})}
                    placeholder="Leave blank to display the dynamic localized defaults, or customize with custom paragraphs..."
                  />
                </div>
              </div>

              {/* Key Stats Grid */}
              <div className="border border-brand-dark/[0.08] rounded-2xl p-6 bg-brand-muted/20">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark mb-4 flex items-center gap-2">
                  <Sparkles size={14} className="text-brand-accent" /> Key Platform Counters / Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-brand-dark/70 font-semibold block mb-1">Resident Designers</label>
                    <input 
                      type="text" 
                      value={aboutUsData.designersCount} 
                      onChange={e => setAboutUsData({...aboutUsData, designersCount: e.target.value})} 
                      className="w-full bg-white border border-brand-dark/[0.12] rounded-xl p-2.5 font-mono font-semibold text-sm text-center focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-brand-dark/70 font-semibold block mb-1">Runway & Shows</label>
                    <input 
                      type="text" 
                      value={aboutUsData.eventsCount} 
                      onChange={e => setAboutUsData({...aboutUsData, eventsCount: e.target.value})} 
                      className="w-full bg-white border border-brand-dark/[0.12] rounded-xl p-2.5 font-mono font-semibold text-sm text-center focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-brand-dark/70 font-semibold block mb-1">Academies & Schools</label>
                    <input 
                      type="text" 
                      value={aboutUsData.institutionsCount} 
                      onChange={e => setAboutUsData({...aboutUsData, institutionsCount: e.target.value})} 
                      className="w-full bg-white border border-brand-dark/[0.12] rounded-xl p-2.5 font-mono font-semibold text-sm text-center focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-brand-dark/70 font-semibold block mb-1">Community Members</label>
                    <input 
                      type="text" 
                      value={aboutUsData.communityCount} 
                      onChange={e => setAboutUsData({...aboutUsData, communityCount: e.target.value})} 
                      className="w-full bg-white border border-brand-dark/[0.12] rounded-xl p-2.5 font-mono font-semibold text-sm text-center focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Channels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">Partnership Email</label>
                  <input 
                    type="email" 
                    value={aboutUsData.contactEmail} 
                    onChange={e => setAboutUsData({...aboutUsData, contactEmail: e.target.value})} 
                    className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl p-3 font-medium text-xs font-mono text-brand-dark focus:outline-none focus:bg-white focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">Headquarters Address</label>
                  <input 
                    type="text" 
                    value={aboutUsData.contactAddress} 
                    onChange={e => setAboutUsData({...aboutUsData, contactAddress: e.target.value})} 
                    className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl p-3 font-medium text-xs text-brand-dark focus:outline-none focus:bg-white focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">Phone / Contact</label>
                  <input 
                    type="text" 
                    value={aboutUsData.contactPhone} 
                    onChange={e => setAboutUsData({...aboutUsData, contactPhone: e.target.value})} 
                    className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl p-3 font-medium text-xs font-mono text-brand-dark focus:outline-none focus:bg-white focus:border-brand-accent"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={savingAboutUs}
                className="bg-brand-dark text-white rounded-full py-3.5 px-8 font-semibold uppercase tracking-wider text-xs hover:bg-brand-accent transition-colors flex items-center justify-center gap-2 mt-4 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Save size={16} /> {savingAboutUs ? 'Saving Changes...' : 'Save About Us Settings'}
              </button>
            </form>
              </div>
            )}

            {/* Sub-Tab 2: Центр Развития Модной Индустрии */}
            {aboutSubTab === 'center' && (
              <div className="animate-in fade-in duration-300">
<form onSubmit={handleSaveCenter} className="flex flex-col gap-8">
              
              {/* 1. Название и Миссия */}
              <div className="space-y-4">
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-dark flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-accent" />
                  1. Основные заголовки и позиционирование
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">
                      Официальное название Центра
                    </label>
                    <input 
                      type="text" 
                      required
                      value={centerData.centerTitle} 
                      onChange={e => setCenterData({...centerData, centerTitle: e.target.value})} 
                      placeholder="Центр Развития Модной Индустрии Азербайджана"
                      className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:bg-white focus:border-brand-accent text-sm text-brand-dark transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">
                      Краткое описание / Миссия
                    </label>
                    <input 
                      type="text" 
                      required
                      value={centerData.centerSubtitle} 
                      onChange={e => setCenterData({...centerData, centerSubtitle: e.target.value})} 
                      placeholder="Официальный центр поддержки азербайджанских кутюрье..."
                      className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:bg-white focus:border-brand-accent text-sm text-brand-dark transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Манифест и стратегия */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-dark flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-accent" />
                    2. Манифест и стратегические направления (Rich Text)
                  </h3>
                  <span className="text-[11px] font-mono text-brand-dark/50">
                    Оставьте пустым для отображения стандартных блоков
                  </span>
                </div>
                <div className="rounded-2xl border border-brand-dark/[0.12] overflow-hidden bg-white shadow-2xs">
                  <ReactQuill 
                    theme="snow"
                    value={centerData.centerManifestoHtml}
                    onChange={html => setCenterData({...centerData, centerManifestoHtml: html})}
                    placeholder="Напишите официальный манифест Центра, стратегические цели (Глобальный экспорт, Культурное наследие, Гранты и инкубация)..."
                  />
                </div>
              </div>

              {/* 3. Руководство Центра (Direction Board) */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-brand-dark/[0.08] pb-3">
                  <div>
                    <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-dark flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-accent" />
                      3. Руководство Центра & Direction Board ({centerData.leaders?.length || 0})
                    </h3>
                    <p className="text-xs text-brand-dark/60 mt-0.5">
                      Члены дирекции, кураторы направлений и эксперты Центра, отображаемые на сайте.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetLeadersToDefault}
                      className="px-3 py-1.5 border border-brand-dark/20 rounded-full font-mono text-[11px] uppercase font-semibold text-brand-dark/70 hover:text-brand-dark hover:bg-brand-muted transition-colors cursor-pointer"
                    >
                      По умолчанию
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAddLeader}
                      className="px-4 py-1.5 bg-brand-dark hover:bg-brand-accent text-white rounded-full font-semibold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Plus size={13} /> Добавить руководителя
                    </button>
                  </div>
                </div>

                {centerData.leaders && centerData.leaders.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {centerData.leaders.map((leader, idx) => (
                      <div 
                        key={leader.id || idx} 
                        className="border border-brand-dark/[0.1] rounded-2xl bg-brand-muted/20 p-4 flex flex-col justify-between hover:border-brand-dark/30 transition-all shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            <img 
                              src={leader.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'} 
                              alt={leader.name}
                              className="w-12 h-12 rounded-xl object-cover border border-brand-dark/15 shrink-0 bg-white"
                              onError={e => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="font-serif font-bold text-base text-brand-dark truncate">
                                {leader.name}
                              </h4>
                              <p className="text-[11px] font-mono text-brand-accent font-semibold truncate">
                                {leader.roleRu || leader.roleAz || leader.roleEn}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1 text-xs text-brand-dark/70 mb-3 bg-white/60 p-2.5 rounded-xl border border-brand-dark/[0.06]">
                            <div className="text-[10px] font-mono uppercase text-brand-dark/50">Должности:</div>
                            <div className="truncate"><strong className="text-brand-dark">AZ:</strong> {leader.roleAz || '—'}</div>
                            <div className="truncate"><strong className="text-brand-dark">RU:</strong> {leader.roleRu || '—'}</div>
                            <div className="truncate"><strong className="text-brand-dark">EN:</strong> {leader.roleEn || '—'}</div>
                            {leader.email && (
                              <div className="text-[11px] font-mono text-brand-dark/80 pt-1 border-t border-brand-dark/[0.06] truncate">
                                ✉ {leader.email}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-between pt-2 border-t border-brand-dark/[0.08]">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveLeader(idx, 'up')}
                              className="w-7 h-7 rounded-lg border border-brand-dark/15 flex items-center justify-center hover:bg-brand-dark hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                              title="Поднять выше"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === centerData.leaders.length - 1}
                              onClick={() => handleMoveLeader(idx, 'down')}
                              className="w-7 h-7 rounded-lg border border-brand-dark/15 flex items-center justify-center hover:bg-brand-dark hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                              title="Опустить ниже"
                            >
                              <ArrowDown size={12} />
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditLeader(idx)}
                              className="px-2.5 py-1 rounded-lg bg-brand-dark/5 hover:bg-brand-dark hover:text-white text-xs font-semibold text-brand-dark transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 size={12} /> Редактировать
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLeader(idx)}
                              className="w-7 h-7 rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                              title="Удалить"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-brand-dark/20 rounded-2xl bg-brand-muted/10">
                    <p className="text-xs text-brand-dark/60 font-mono">Список руководителей пуст</p>
                    <button
                      type="button"
                      onClick={handleResetLeadersToDefault}
                      className="mt-2 text-xs font-semibold text-brand-accent underline cursor-pointer"
                    >
                      Загрузить официальный состав по умолчанию
                    </button>
                  </div>
                )}
              </div>

              {/* 4. Штаб-квартира и контакты Центра */}
              <div className="space-y-4">
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-dark flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-accent" />
                  4. Официальная штаб-квартира и контакты Центра
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">
                      Адрес штаб-квартиры
                    </label>
                    <input 
                      type="text" 
                      value={centerData.centerAddress} 
                      onChange={e => setCenterData({...centerData, centerAddress: e.target.value})} 
                      placeholder="Bakı Şəhəri, Nizami küç. 44 / Heydər Əliyev Mərkəzi"
                      className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 font-medium text-xs text-brand-dark focus:outline-none focus:bg-white focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">
                      Телефон Центра
                    </label>
                    <input 
                      type="text" 
                      value={centerData.centerPhone} 
                      onChange={e => setCenterData({...centerData, centerPhone: e.target.value})} 
                      placeholder="+994 (12) 598-2026"
                      className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 font-medium text-xs font-mono text-brand-dark focus:outline-none focus:bg-white focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">
                      Email Центра
                    </label>
                    <input 
                      type="email" 
                      value={centerData.centerEmail} 
                      onChange={e => setCenterData({...centerData, centerEmail: e.target.value})} 
                      placeholder="official@fashiondevelopment.az"
                      className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 font-medium text-xs font-mono text-brand-dark focus:outline-none focus:bg-white focus:border-brand-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-brand-dark/[0.08] flex items-center justify-between">
                <button 
                  type="submit" 
                  disabled={savingCenter}
                  className="bg-brand-dark text-white rounded-full py-3.5 px-8 font-semibold uppercase tracking-wider text-xs hover:bg-brand-accent transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <Save size={16} /> {savingCenter ? 'Сохранение...' : 'Сохранить параметры Центра развития моды'}
                </button>
                <span className="text-[11px] font-mono text-brand-dark/50 hidden sm:inline">
                  ✓ Автоматическая синхронизация с /about
                </span>
              </div>
            </form>
              </div>
            )}
          </div>
        )}

          {activeTab === 'socials' && (
          <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 md:p-10 shadow-xs">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 border-b border-brand-dark/[0.08] pb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15 flex items-center gap-1">
                    <Share2 size={12} /> Official Channels
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark mt-1">
                  Social Networks & Footer Links
                </h2>
                <p className="text-brand-dark/60 text-xs sm:text-sm font-normal mt-1">
                  Configure official social media links and buttons displayed in the website footer and mobile navigation.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleResetSocialsToDefault}
                  className="px-4 py-2 bg-white border border-brand-dark/[0.15] hover:bg-brand-muted rounded-full text-brand-dark text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <RotateCcw size={13} /> Reset Defaults
                </button>

                <button
                  type="button"
                  onClick={handleAddSocialLink}
                  className="px-4 py-2 bg-brand-muted/50 text-brand-dark hover:bg-brand-dark hover:text-white rounded-full border border-brand-dark/[0.15] text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus size={14} /> Add Social Channel
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveSocialLinks()}
                  disabled={savingSocials}
                  className="px-6 py-2 bg-brand-accent text-white hover:bg-brand-dark rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} /> {savingSocials ? 'Saving...' : 'Save All Changes'}
                </button>
              </div>
            </div>

            {/* Real-Time Live Preview Box */}
            <div className="mb-8 border border-brand-dark/[0.08] rounded-2xl bg-brand-muted/20 p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-3 border-b border-brand-dark/[0.06] pb-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark flex items-center gap-1.5">
                  <Sparkles size={13} className="text-brand-accent" /> Live Footer Preview
                </span>
                <span className="text-[10px] font-mono text-brand-dark/50 uppercase">
                  {socialLinks.filter(l => l.isActive && l.url).length} Active Channels
                </span>
              </div>
              <div className="bg-white rounded-xl border border-brand-dark/[0.08] p-5 text-center shadow-xs">
                <SocialLinksBar links={socialLinks} variant="desktop-footer" />
              </div>
            </div>

            {/* Social Links List Editor */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-brand-dark/[0.08]">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark">
                  Configured Channels ({socialLinks.length})
                </span>
                <span className="text-xs text-brand-dark/50 font-normal hidden sm:inline">
                  Reorder with arrows, select network, and paste official URLs
                </span>
              </div>

              {socialLinks.length === 0 ? (
                <div className="text-center py-10 rounded-2xl border-2 border-dashed border-brand-dark/15 bg-brand-muted/10">
                  <p className="text-sm font-medium text-brand-dark/60 mb-3">No social channels configured</p>
                  <button
                    type="button"
                    onClick={handleAddSocialLink}
                    className="px-5 py-2 bg-brand-dark text-white rounded-full font-semibold text-xs uppercase tracking-wider shadow-2xs hover:bg-brand-accent transition-colors"
                  >
                    + Add First Social Channel
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {socialLinks.map((item, idx) => {
                    const meta = SOCIAL_PLATFORMS_META.find(p => p.id === item.platform);
                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border transition-all duration-200 shadow-2xs ${
                          item.isActive ? 'bg-white border-brand-dark/[0.08] hover:border-brand-accent/30' : 'bg-brand-muted/30 border-brand-dark/[0.05] opacity-75'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                          {/* Order Controls & Platform Icon Indicator */}
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => handleMoveSocialLink(idx, 'up')}
                                disabled={idx === 0}
                                className="w-6 h-6 rounded-full border border-brand-dark/10 hover:bg-brand-dark hover:text-white disabled:opacity-20 flex items-center justify-center transition-colors cursor-pointer"
                                title="Move Up"
                              >
                                <ArrowUp size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveSocialLink(idx, 'down')}
                                disabled={idx === socialLinks.length - 1}
                                className="w-6 h-6 rounded-full border border-brand-dark/10 hover:bg-brand-dark hover:text-white disabled:opacity-20 flex items-center justify-center transition-colors cursor-pointer"
                                title="Move Down"
                              >
                                <ArrowDown size={11} />
                              </button>
                            </div>

                            <div className="w-10 h-10 rounded-full border border-brand-dark/[0.1] bg-brand-muted/30 flex items-center justify-center text-brand-dark shrink-0">
                              {renderSocialIcon(item.platform, 18)}
                            </div>

                            {/* Network Selector Dropdown */}
                            <div className="w-40 sm:w-44">
                              <label className="text-[10px] font-mono uppercase tracking-wider text-brand-dark/60 font-semibold block mb-1">
                                Network
                              </label>
                              <select
                                value={item.platform}
                                onChange={(e) => handleUpdateSocialLink(item.id, { platform: e.target.value as SocialPlatform })}
                                className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-brand-accent cursor-pointer"
                              >
                                {SOCIAL_PLATFORMS_META.map((plat) => (
                                  <option key={plat.id} value={plat.id}>
                                    {plat.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Custom Label & URL Inputs */}
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                            <div>
                              <label className="text-[10px] font-mono uppercase tracking-wider text-brand-dark/60 font-semibold block mb-1">
                                Display Label (Optional)
                              </label>
                              <input
                                type="text"
                                value={item.label || ''}
                                placeholder={meta?.name || 'Label'}
                                onChange={(e) => handleUpdateSocialLink(item.id, { label: e.target.value })}
                                className="w-full bg-brand-muted/20 border border-brand-dark/[0.12] rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:bg-white focus:border-brand-accent"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-mono uppercase tracking-wider text-brand-dark/60 font-semibold block mb-1">
                                URL Target
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="url"
                                  value={item.url}
                                  placeholder={meta?.placeholder || 'https://...'}
                                  onChange={(e) => handleUpdateSocialLink(item.id, { url: e.target.value })}
                                  className="w-full bg-brand-muted/20 border border-brand-dark/[0.12] rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:bg-white focus:border-brand-accent"
                                />
                                {item.url && (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-8 h-8 rounded-xl border border-brand-dark/[0.1] hover:bg-brand-muted flex items-center justify-center text-brand-dark/60 shrink-0"
                                    title="Test Link"
                                  >
                                    <ExternalLink size={13} />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Visibility Toggle & Delete Action */}
                          <div className="flex items-center gap-2 self-end lg:self-center">
                            <button
                              type="button"
                              onClick={() => handleUpdateSocialLink(item.id, { isActive: !item.isActive })}
                              className={`px-3 py-1.5 rounded-full text-xs font-mono font-semibold uppercase tracking-wider border transition-all cursor-pointer ${
                                item.isActive
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-brand-muted/40 text-brand-dark/40 border-brand-dark/15'
                              }`}
                            >
                              {item.isActive ? 'Active' : 'Hidden'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSocialLink(item.id)}
                              className="w-8 h-8 rounded-full border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete Social Channel"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

          {activeTab === 'designer_verifications' as any && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 md:p-10 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-brand-dark/[0.08] pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-[#7a0000] text-white px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1">
                      <Scissors size={12} /> Designer Verification Queue
                    </span>
                    <GoldenNeedleBadge size="xs" showLabel />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark mt-1">
                    Заявки на верификацию дизайнеров и Золотую Иглу ({designerApplications.length})
                  </h2>
                  <p className="text-xs sm:text-sm font-normal text-brand-dark/60 mt-1">
                    Проверьте документы заявителей (şəxsiyyət vəsiqəsi) и регистрационные данные модного дома. Одобрение автоматически присуждает знак «Золотая Игла» (Qızıl İynə) и открывает раздел «Написать в Direct Chat».
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={fetchDesignerApplications}
                    className="px-4 py-2 border border-brand-dark/[0.15] bg-brand-muted/40 hover:bg-brand-dark hover:text-white rounded-full font-semibold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <RefreshCw size={13} />
                    <span>Обновить заявки</span>
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 mb-6 bg-brand-muted/30 p-1.5 rounded-full border border-brand-dark/[0.08] w-fit">
                {[
                  { id: 'pending', label: 'Ожидают проверки', count: designerApplications.filter(a => a.status === 'pending').length },
                  { id: 'approved', label: 'Одобренные', count: designerApplications.filter(a => a.status === 'approved').length },
                  { id: 'rejected', label: 'Отклоненные', count: designerApplications.filter(a => a.status === 'rejected').length },
                  { id: 'all', label: 'Все заявки', count: designerApplications.length }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setDesignerAppFilter(f.id as any)}
                    className={`px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider rounded-full transition-all flex items-center gap-2 cursor-pointer ${
                      designerAppFilter === f.id
                        ? 'bg-brand-dark text-white shadow-2xs font-semibold'
                        : 'text-brand-dark/70 hover:text-brand-dark hover:bg-white/60'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className={`px-1.5 py-0.2 font-mono text-[10px] rounded-full ${
                      designerAppFilter === f.id ? 'bg-[#7a0000] text-white' : 'bg-brand-dark/10 text-brand-dark'
                    }`}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Applications List */}
              {loadingDesignerApps ? (
                <div className="py-12 text-center font-mono text-xs text-brand-dark/60">
                  Загрузка заявок дизайнеров...
                </div>
              ) : designerApplications.filter(a => designerAppFilter === 'all' || a.status === designerAppFilter).length === 0 ? (
                <div className="p-8 rounded-2xl border-2 border-dashed border-brand-dark/15 bg-brand-muted/10 text-center">
                  <p className="text-sm font-medium text-brand-dark/60">Нет заявок в категории «{designerAppFilter}».</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {designerApplications
                    .filter(a => designerAppFilter === 'all' || a.status === designerAppFilter)
                    .map(app => {
                      const normName = (app.brandName || '').trim().toLowerCase();
                      const existingBrand = designers.find(d => (d.name || '').trim().toLowerCase() === normName);
                      const alreadyApprovedDesigner = users.find(u => (u.designerBrandName?.trim()?.toLowerCase() === normName || u.brandName?.trim()?.toLowerCase() === normName) && (u.hasGoldenNeedle || u.designerVerificationStatus === 'approved') && u.id !== app.userId);

                      return (
                        <div
                          key={app.id}
                          className="bg-white rounded-2xl border-2 border-brand-dark/[0.08] hover:border-brand-accent/40 p-5 flex flex-col justify-between space-y-4 transition-all shadow-xs"
                        >
                          <div>
                            {/* Status & Date */}
                            <div className="flex justify-between items-center mb-3">
                              <span
                                className={`px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider rounded-full border flex items-center gap-1 ${
                                  app.status === 'approved'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : app.status === 'rejected'
                                    ? 'bg-red-50 text-red-800 border-red-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`}
                              >
                                {app.status === 'approved' && <Check size={11} />}
                                {app.status === 'rejected' && <X size={11} />}
                                {app.status === 'pending' && <Clock size={11} />}
                                <span>{app.status === 'approved' ? 'Одобрено (Золотая Игла)' : app.status === 'rejected' ? 'Отклонено' : 'На рассмотрении'}</span>
                              </span>

                              <span className="text-[11px] font-mono text-brand-dark/50">
                                {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '—'}
                              </span>
                            </div>

                            {/* Brand Match Info */}
                            {alreadyApprovedDesigner ? (
                              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1 mb-3">
                                <div className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-800">
                                  <AlertCircle size={15} className="shrink-0" />
                                  <span>⚠️ Внимание: Бренд уже подтвержден у другого пользователя!</span>
                                </div>
                                <p className="text-[11px] leading-relaxed">
                                  Пользователь <strong>{alreadyApprovedDesigner.name}</strong> ({alreadyApprovedDesigner.email}) уже имеет подтвержденный профиль для «{app.brandName}».
                                </p>
                              </div>
                            ) : existingBrand ? (
                              <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] flex items-center gap-1.5 mb-3">
                                <Info size={13} className="text-blue-700 shrink-0" />
                                <span>ℹ️ Бренд есть в каталоге A-Z (будет привязан к этому пользователю)</span>
                              </div>
                            ) : (
                              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-center gap-1.5 mb-3">
                                <CheckCircle2 size={13} className="text-emerald-700 shrink-0" />
                                <span>✨ Новый бренд (будет автоматически добавлен в реестр дизайнеров)</span>
                              </div>
                            )}

                            {/* Brand Name */}
                            <h3 className="text-lg font-serif font-medium text-brand-dark flex items-center gap-2">
                              <span>{app.brandName}</span>
                              <GoldenNeedleBadge size="xs" showLabel={false} />
                            </h3>

                            {/* Applicant details */}
                            <div className="mt-2.5 space-y-1.5 text-xs text-brand-dark/75 font-normal">
                              <div>
                                <strong className="font-semibold text-brand-dark">ФИО дизайнера:</strong>{' '}
                                <span className="font-bold text-brand-dark">
                                  {app.applicantFirstName} {app.applicantLastName} {app.applicantPatronymic || ''}
                                </span>
                              </div>
                              <div>
                                <strong className="font-semibold text-brand-dark">Телефон:</strong>{' '}
                                <span className="font-mono text-brand-dark font-bold">{app.phoneNumber || '—'}</span>
                              </div>
                              <div>
                                <strong className="font-semibold text-brand-dark">Email:</strong> {app.userEmail} &middot;{' '}
                                <span className="font-mono text-brand-accent font-semibold">{app.userHandle || `@${app.userEmail?.split('@')[0]}`}</span>
                              </div>
                              <div>
                                <strong className="font-semibold text-brand-dark">Роль / Должность:</strong> {app.designerRole || 'Главный дизайнер'}
                              </div>
                              {app.foundingYear && (
                                <div>
                                  <strong className="font-semibold text-brand-dark">Год основания:</strong> {app.foundingYear}
                                </div>
                              )}
                              {app.brandAddress && (
                                <div>
                                  <strong className="font-semibold text-brand-dark">Адрес студии / ателье:</strong> {app.brandAddress}
                                </div>
                              )}
                              {app.instagram && (
                                <div>
                                  <strong className="font-semibold text-brand-dark">Instagram:</strong>{' '}
                                  <a href={app.instagram.startsWith('http') ? app.instagram : `https://instagram.com/${app.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="font-mono text-brand-accent hover:underline">
                                    {app.instagram}
                                  </a>
                                </div>
                              )}
                              {app.website && (
                                <div>
                                  <strong className="font-semibold text-brand-dark">Website:</strong>{' '}
                                  <a href={app.website.startsWith('http') ? app.website : `https://${app.website}`} target="_blank" rel="noopener noreferrer" className="font-mono text-brand-accent hover:underline">
                                    {app.website}
                                  </a>
                                </div>
                              )}
                              {app.comment && (
                                <div className="p-2 bg-brand-light rounded-lg border border-brand-dark/10 text-[11px] text-brand-dark/80 italic">
                                  "{app.comment}"
                                </div>
                              )}
                            </div>

                            {/* Photos (Şəxsiyyət vəsiqəsi & Personal Photo) */}
                            {(app.idCardPhotoUrl || app.idDocumentUrl || app.personalPhotoUrl) && (
                              <div className="mt-3.5 pt-3 border-t border-brand-dark/[0.06] space-y-2">
                                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark/60">
                                  Прикрепленные документы и фотографии:
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                  {(app.idCardPhotoUrl || app.idDocumentUrl) && (
                                    <div
                                      onClick={() => setDesignerZoomImage({ 
                                        url: app.idCardPhotoUrl || app.idDocumentUrl, 
                                        caption: `Şəxsiyyət vəsiqəsi — ${app.brandName} (${app.applicantFirstName} ${app.applicantLastName})` 
                                      })}
                                      className="group cursor-pointer flex items-center gap-2 p-1.5 rounded-xl bg-brand-light border border-brand-dark/15 hover:border-brand-accent transition-all"
                                    >
                                      <img
                                        src={app.idCardPhotoUrl || app.idDocumentUrl}
                                        alt="Şəxsiyyət vəsiqəsi"
                                        className="w-14 h-9 object-cover rounded-lg border border-brand-dark/20"
                                      />
                                      <div className="text-[10px] font-mono font-bold text-brand-dark group-hover:text-brand-accent">
                                        Şəxsiyyət vəsiqəsi 🔍
                                      </div>
                                    </div>
                                  )}

                                  {app.personalPhotoUrl && (
                                    <div
                                      onClick={() => setDesignerZoomImage({ 
                                        url: app.personalPhotoUrl, 
                                        caption: `Личное фото дизайнера — ${app.applicantFirstName} ${app.applicantLastName}` 
                                      })}
                                      className="group cursor-pointer flex items-center gap-2 p-1.5 rounded-xl bg-brand-light border border-brand-dark/15 hover:border-brand-accent transition-all"
                                    >
                                      <img
                                        src={app.personalPhotoUrl}
                                        alt="Личное фото"
                                        className="w-9 h-9 object-cover rounded-full border border-brand-dark/20"
                                      />
                                      <div className="text-[10px] font-mono font-bold text-brand-dark group-hover:text-brand-accent">
                                        Фото дизайнера 🔍
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Rejection Reason if any */}
                            {app.status === 'rejected' && app.rejectionReason && (
                              <div className="mt-2 p-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 font-medium">
                                <strong>Причина отклонения:</strong> {app.rejectionReason}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="pt-3 border-t border-brand-dark/[0.06] flex flex-wrap items-center justify-between gap-2">
                            <Link
                              to={`/u/${(app.userHandle || app.userId).replace('@', '')}`}
                              target="_blank"
                              className="text-xs font-semibold uppercase tracking-wider text-brand-dark hover:text-brand-accent flex items-center gap-1"
                            >
                              <ExternalLink size={12} /> Профиль заявителя
                            </Link>

                            <div className="flex items-center gap-2">
                              {app.status !== 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveDesignerApp(app)}
                                  className="px-4 py-2 rounded-full bg-[#7a0000] text-white text-xs font-semibold uppercase tracking-wider hover:bg-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <Sparkles size={13} className="text-amber-300" />
                                  <span>Одобрить (Золотая Игла + Direct Chat)</span>
                                </button>
                              )}

                              {app.status !== 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() => handleRejectDesignerApp(app)}
                                  className="px-3.5 py-1.5 rounded-full border border-red-300 bg-red-50 text-red-800 text-xs font-semibold uppercase tracking-wider hover:bg-red-700 hover:text-white transition-colors cursor-pointer shadow-2xs"
                                >
                                  Отклонить
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'designers' as any && (
          <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 md:p-10 shadow-xs">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-brand-dark/[0.08] pb-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                    Fashion Houses & Designers
                  </span>
                  <span className="bg-brand-dark text-white px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider">
                    {designerTabSortAsc ? 'Алфавитный порядок (А → Я)' : 'Обратный порядок (Я → А)'}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark mt-1">Бренды и дизайнеры (Алфавитный порядок)</h2>
                <p className="text-xs font-mono text-brand-dark/60 mt-1">
                  Отображаются в строгом алфавитном порядке. Найдено: <span className="font-bold text-brand-dark">{designersAlphabeticalList.length}</span> из {designers.length} брендов
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button 
                  type="button"
                  onClick={() => setDesignerTabSortAsc(!designerTabSortAsc)} 
                  className="bg-brand-muted/30 text-brand-dark px-4 py-2 font-mono font-semibold uppercase tracking-wider text-xs border border-brand-dark/[0.12] rounded-full hover:bg-brand-dark hover:text-white transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <span>{designerTabSortAsc ? 'Сортировка: А → Я' : 'Сортировка: Я → А'}</span>
                </button>
                <button onClick={handleSeedDesigners} className="bg-white text-brand-dark px-4 py-2 font-semibold uppercase tracking-wider text-xs border border-brand-dark/[0.15] rounded-full hover:bg-brand-muted transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer">
                  <RefreshCw size={13} /> Сбросить 55
                </button>
                <label className="bg-brand-muted/40 text-brand-dark px-4 py-2 font-semibold uppercase tracking-wider text-xs border border-brand-dark/[0.15] rounded-full hover:bg-brand-dark hover:text-white transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5">
                  <Upload size={13} /> + Импорт Excel/CSV
                  <input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleDesignerExcelUpload} />
                </label>
                <button onClick={() => setAddModalType('designers')} className="bg-brand-dark text-white px-5 py-2 font-semibold uppercase tracking-wider text-xs rounded-full hover:bg-brand-accent transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5">
                  <Plus size={14} /> + Добавить бренд
                </button>
              </div>
            </div>

            {/* Banner linking to designer_verifications */}
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Scissors size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-bold text-brand-dark flex items-center gap-2">
                    <span>Верификация дизайнеров одежды (Золотая Игла + Direct Chat)</span>
                    <GoldenNeedleBadge size="xs" showLabel={false} />
                  </h3>
                  <p className="text-xs text-brand-dark/70 mt-0.5">
                    Заявок на рассмотрении: <strong className="text-[#7a0000]">{designerApplications.filter(a => a.status === 'pending').length}</strong>. Проверяйте документы и утверждайте резидентов.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('designer_verifications' as any);
                  setSearchParams({ tab: 'designer_verifications' });
                }}
                className="px-4 py-2 rounded-full bg-[#7a0000] text-white font-mono text-xs uppercase font-bold tracking-wider hover:bg-black transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
              >
                <span>Очередь верификации ({designerApplications.filter(a => a.status === 'pending').length})</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* Alphabetical Search Filter */}
            <div className="mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-dark/40" />
                <input
                  type="text"
                  value={designerTabSearch}
                  onChange={e => setDesignerTabSearch(e.target.value)}
                  placeholder="Поиск по алфавиту (название, дизайнер)..."
                  className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm font-mono text-brand-dark focus:outline-none focus:bg-white focus:border-brand-accent shadow-2xs"
                />
              </div>
              <span className="text-xs font-mono text-brand-dark/50">
                Сортировка: {designerTabSortAsc ? 'A-Z / А-Я' : 'Z-A / Я-А'}
              </span>
            </div>

            <div className="rounded-2xl border border-brand-dark/[0.08] overflow-x-auto text-left bg-white shadow-xs">
              <table className="w-full font-normal border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b border-brand-dark/[0.08] bg-brand-muted/30 text-brand-dark/70 font-mono uppercase tracking-wider text-[11px]">
                    <th className="p-3.5 border-r border-brand-dark/[0.06] w-14 text-center font-semibold">№</th>
                    <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Название бренда (Brand)</th>
                    <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Дизайнер / Основатель</th>
                    <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Instagram</th>
                    <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Website</th>
                    <th className="p-3.5 font-semibold text-center">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {designersAlphabeticalList.map((d, idx) => (
                    <tr key={d.id} className="border-b border-brand-dark/[0.05] hover:bg-brand-muted/20 transition-colors last:border-b-0">
                      <td className="p-3.5 border-r border-brand-dark/[0.06] text-center font-mono text-xs text-brand-dark/50 font-bold">
                        {idx + 1}
                      </td>
                      <td className="p-3.5 border-r border-brand-dark/[0.06] font-serif font-medium text-brand-dark text-sm">{d.name}</td>
                      <td className="p-3.5 border-r border-brand-dark/[0.06] text-xs text-brand-dark/80">{d.designerName || d.focus || d.details || '—'}</td>
                      <td className="p-3.5 border-r border-brand-dark/[0.06] text-xs font-mono text-brand-dark/70">{d.instagram || d.social || '—'}</td>
                      <td className="p-3.5 border-r border-brand-dark/[0.06] text-xs font-mono text-brand-dark/70">{d.website || d.links || '—'}</td>
                      <td className="p-3.5">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => startEditMockItem('designers', d)} className="rounded-full border border-brand-dark/[0.12] px-3 py-1 text-xs font-mono font-medium hover:bg-brand-dark hover:text-white transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"><Edit2 size={11}/> Редактировать</button>
                          <button onClick={() => deleteMockItem('designers', d.id)} className="rounded-full border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1 text-xs font-mono font-medium transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"><Trash2 size={11}/> Удалить</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {designersAlphabeticalList.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-brand-dark/50 text-xs font-mono">Ни один бренд не найден по запросу.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

          {activeTab === 'sponsorships' && (
          <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 md:p-10 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-brand-dark/[0.08] pb-6">
              <div>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                  Partnership & Brand Inquiries
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark mt-1">Заявки и письма от спонсоров</h2>
                <p className="text-xs font-mono text-brand-dark/60 mt-1">
                  Всего обращений: <span className="font-bold text-brand-dark">{sponsorships.length}</span>. Нажмите «Читать письмо» для полного просмотра текста спонсора.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchSponsorships}
                className="px-4 py-2 border border-brand-dark/[0.15] bg-brand-muted/40 hover:bg-brand-dark hover:text-white rounded-full font-semibold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
              >
                <RefreshCw size={13} />
                <span>Обновить список</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-brand-dark/[0.08] bg-white shadow-xs">
              <table className="w-full text-left font-normal border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b border-brand-dark/[0.08] bg-brand-muted/30 text-brand-dark/70 font-mono uppercase tracking-wider text-[11px]">
                    <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold w-28">Дата</th>
                    <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Бренд / Компания</th>
                    <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Email</th>
                    <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Письмо спонсора (Предложение)</th>
                    <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold text-center w-28">Статус</th>
                    <th className="p-3.5 font-semibold text-center w-36">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {sponsorships.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-brand-dark/50 text-xs font-mono">Заявок от спонсоров пока нет.</td></tr>
                  ) : (
                    sponsorships.map(s => {
                      const letterPreview = s.message || s.letter || s.proposal || s.comment || '';
                      return (
                        <tr key={s.id} className="border-b border-brand-dark/[0.05] hover:bg-brand-muted/20 transition-colors last:border-b-0">
                          <td className="p-3.5 border-r border-brand-dark/[0.06] text-xs font-mono text-brand-dark/60">
                            {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="p-3.5 border-r border-brand-dark/[0.06] font-serif font-medium text-brand-dark text-sm">
                            {s.brandName || s.brand || '—'}
                          </td>
                          <td className="p-3.5 border-r border-brand-dark/[0.06] text-xs font-mono text-brand-accent">
                            <a href={`mailto:${s.email}`} className="hover:underline">{s.email}</a>
                          </td>
                          <td className="p-3.5 border-r border-brand-dark/[0.06] text-xs text-brand-dark/80 max-w-xs">
                            {letterPreview ? (
                              <p className="line-clamp-2 leading-relaxed">{letterPreview}</p>
                            ) : (
                              <span className="font-mono text-brand-dark/40 italic">Письмо не прикреплено</span>
                            )}
                          </td>
                          <td className="p-3.5 border-r border-brand-dark/[0.06] text-center">
                            <select
                              value={s.status || 'pending'}
                              onChange={e => handleUpdateSponsorshipStatus(s.id, e.target.value)}
                              className={`rounded-full px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider border cursor-pointer focus:outline-none ${
                                s.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : s.status === 'contacted'
                                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                                  : s.status === 'declined'
                                  ? 'bg-red-50 text-red-800 border-red-300'
                                  : 'bg-amber-50 text-amber-800 border-amber-300'
                              }`}
                            >
                              <option value="pending">Ожидает</option>
                              <option value="contacted">Связались</option>
                              <option value="approved">Одобрено</option>
                              <option value="declined">Отклонено</option>
                            </select>
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedSponsorship(s)}
                              className="px-3 py-1.5 rounded-full bg-brand-dark hover:bg-brand-accent text-white text-[11px] font-mono font-semibold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1 mx-auto"
                            >
                              <Eye size={12} />
                              <span>Читать</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

          {activeTab === 'sponsors' as any && (
          <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 md:p-10 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-brand-dark/[0.08] pb-6">
              <div>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                  Official Backers
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark mt-1">Manage Sponsors (Logos)</h2>
                <p className="text-xs font-mono text-brand-dark/60 mt-1">Total sponsors: <span className="font-bold text-brand-dark">{sponsors.length}</span></p>
              </div>
              <button onClick={() => setAddModalType('sponsors')} className="bg-brand-dark text-white px-5 py-2 font-semibold uppercase tracking-wider text-xs rounded-full hover:bg-brand-accent transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5">
                <Plus size={14} /> + Add Sponsor
              </button>
            </div>
            <div className="rounded-2xl border border-brand-dark/[0.08] overflow-x-auto text-left bg-white shadow-xs">
              <table className="w-full font-normal border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-brand-dark/[0.08] bg-brand-muted/30 text-brand-dark/70 font-mono uppercase tracking-wider text-[11px]">
                    <th className="p-3.5 border-r border-brand-dark/[0.06] w-20 text-center font-semibold">Порядок</th>
                    <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Logo</th>
                    <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Name</th>
                    <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Website</th>
                    <th className="p-3.5 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sponsors.map((s, idx) => (
                    <tr key={s.id} className="border-b border-brand-dark/[0.05] hover:bg-brand-muted/20 transition-colors last:border-b-0">
                      <td className="p-3.5 border-r border-brand-dark/[0.06] text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => handleMoveRow('sponsors', sponsors, setSponsors, idx, 'up')} disabled={idx === 0} title="Выше" className="w-6 h-6 rounded-full border border-brand-dark/10 hover:bg-brand-dark hover:text-white disabled:opacity-20 flex items-center justify-center transition-colors cursor-pointer"><ArrowUp size={11}/></button>
                          <button onClick={() => handleMoveRow('sponsors', sponsors, setSponsors, idx, 'down')} disabled={idx === sponsors.length - 1} title="Ниже" className="w-6 h-6 rounded-full border border-brand-dark/10 hover:bg-brand-dark hover:text-white disabled:opacity-20 flex items-center justify-center transition-colors cursor-pointer"><ArrowDown size={11}/></button>
                        </div>
                      </td>
                      <td className="p-3.5 border-r border-brand-dark/[0.06]">
                        {s.imageUrl ? (
                          <div className="w-14 h-14 rounded-xl border border-brand-dark/[0.08] bg-brand-muted/20 flex items-center justify-center p-1.5 overflow-hidden">
                            <img src={s.imageUrl} alt={s.name} className="max-w-full max-h-full object-contain" />
                          </div>
                        ) : (
                          <span className="text-xs text-brand-dark/40 font-mono">—</span>
                        )}
                      </td>
                      <td className="p-3.5 border-r border-brand-dark/[0.06] font-serif font-medium text-brand-dark text-sm">{s.name}</td>
                      <td className="p-3.5 border-r border-brand-dark/[0.06] text-xs font-mono text-brand-dark/70">
                        {s.website ? (
                          <a href={s.website} target="_blank" rel="noreferrer" className="text-brand-accent underline hover:text-brand-dark">
                            {s.website}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="p-3.5">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => startEditMockItem('sponsors', s)} className="rounded-full border border-brand-dark/[0.12] px-3 py-1 text-xs font-mono font-medium hover:bg-brand-dark hover:text-white transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"><Edit2 size={11}/> Edit</button>
                          <button onClick={() => deleteMockItem('sponsors', s.id)} className="rounded-full border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1 text-xs font-mono font-medium transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"><Trash2 size={11}/> Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sponsors.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-brand-dark/50 text-xs">No sponsors added.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

          {activeTab === 'news' as any && (
          <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 md:p-10 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-brand-dark/[0.08] pb-6">
              <div>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                  Editorial & Press
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark mt-1">Manage News / Updates</h2>
                <p className="text-xs font-mono text-brand-dark/60 mt-1">Published articles: <span className="font-bold text-brand-dark">{news.length}</span></p>
              </div>
              <button onClick={() => setAddModalType('news')} className="bg-brand-dark text-white px-5 py-2 font-semibold uppercase tracking-wider text-xs rounded-full hover:bg-brand-accent transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5">
                <Plus size={14} /> + Post News
              </button>
            </div>
            <div className="rounded-2xl border border-brand-dark/[0.08] overflow-x-auto text-left bg-white shadow-xs">
              <table className="w-full font-normal border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-brand-dark/[0.08] bg-brand-muted/30 text-brand-dark/70 font-mono uppercase tracking-wider text-[11px]">
                    <th className="p-3.5 border-r border-brand-dark/[0.06] w-20 text-center font-semibold">Порядок</th>
                    <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Date</th>
                    <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Title</th>
                    <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Content</th>
                    <th className="p-3.5 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {news.map((n, idx) => (
                    <tr key={n.id} className="border-b border-brand-dark/[0.05] hover:bg-brand-muted/20 transition-colors last:border-b-0">
                      <td className="p-3.5 border-r border-brand-dark/[0.06] text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => handleMoveRow('news', news, setNews, idx, 'up')} disabled={idx === 0} title="Выше" className="w-6 h-6 rounded-full border border-brand-dark/10 hover:bg-brand-dark hover:text-white disabled:opacity-20 flex items-center justify-center transition-colors cursor-pointer"><ArrowUp size={11}/></button>
                          <button onClick={() => handleMoveRow('news', news, setNews, idx, 'down')} disabled={idx === news.length - 1} title="Ниже" className="w-6 h-6 rounded-full border border-brand-dark/10 hover:bg-brand-dark hover:text-white disabled:opacity-20 flex items-center justify-center transition-colors cursor-pointer"><ArrowDown size={11}/></button>
                        </div>
                      </td>
                      <td className="p-3.5 border-r border-brand-dark/[0.06] font-mono text-xs text-brand-dark/60">{new Date(n.date).toLocaleDateString()}</td>
                      <td className="p-3.5 border-r border-brand-dark/[0.06] font-serif font-medium text-brand-dark text-sm">{n.title}</td>
                      <td className="p-3.5 border-r border-brand-dark/[0.06]">
                        <div className="line-clamp-2 max-w-xs text-xs font-normal text-brand-dark/70" dangerouslySetInnerHTML={{ __html: n.content }} />
                      </td>
                      <td className="p-3.5">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => startEditMockItem('news', n)} className="rounded-full border border-brand-dark/[0.12] px-3 py-1 text-xs font-mono font-medium hover:bg-brand-dark hover:text-white transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"><Edit2 size={11}/> Edit</button>
                          <button onClick={() => deleteMockItem('news', n.id)} className="rounded-full border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1 text-xs font-mono font-medium transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"><Trash2 size={11}/> Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {news.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-brand-dark/50 text-xs">No news posted.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

          {activeTab === 'careers' && (
          <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 md:p-10 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-brand-dark/[0.08] pb-6">
              <div>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                  Talent & Careers Moderation
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark mt-1">Карьера, вакансии и модерация</h2>
                <p className="text-xs font-mono text-brand-dark/60 mt-1">
                  Управление опубликованными вакансиями, модерация статусов, удаление и просмотр откликов соискателей.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => { fetchVacancies(); fetchJobApplications(); }}
                  className="px-4 py-2 border border-brand-dark/[0.15] bg-brand-muted/40 hover:bg-brand-dark hover:text-white rounded-full font-semibold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                >
                  <RefreshCw size={13} />
                  <span>Обновить</span>
                </button>
                <button onClick={() => setAddModalType('job')} className="bg-brand-dark text-white px-5 py-2 font-semibold uppercase tracking-wider text-xs rounded-full hover:bg-brand-accent transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5">
                  <Plus size={14} /> + Добавить вакансию
                </button>
              </div>
            </div>

            {/* Sub-tabs switcher */}
            <div className="flex flex-wrap gap-2 border-b border-brand-dark/[0.08] pb-4">
              <button
                type="button"
                onClick={() => setCareersSubTab('vacancies')}
                className={`px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  careersSubTab === 'vacancies'
                    ? 'bg-brand-dark text-white font-semibold shadow-2xs'
                    : 'bg-brand-muted/30 text-brand-dark/70 hover:bg-brand-muted/60'
                }`}
              >
                <span>Управление вакансиями</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  careersSubTab === 'vacancies' ? 'bg-brand-accent text-white' : 'bg-brand-dark/10 text-brand-dark'
                }`}>
                  {vacancies.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCareersSubTab('applications')}
                className={`px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  careersSubTab === 'applications'
                    ? 'bg-brand-dark text-white font-semibold shadow-2xs'
                    : 'bg-brand-muted/30 text-brand-dark/70 hover:bg-brand-muted/60'
                }`}
              >
                <span>Отклики кандидатов</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  careersSubTab === 'applications' ? 'bg-brand-accent text-white' : 'bg-brand-dark/10 text-brand-dark'
                }`}>
                  {jobApplications.length}
                </span>
              </button>
            </div>

            {careersSubTab === 'vacancies' ? (
              <div className="space-y-4">
                {/* Vacancy Filter Tabs */}
                <div className="flex flex-wrap gap-1.5 bg-brand-muted/30 p-1.5 rounded-full border border-brand-dark/[0.08] w-fit">
                  {[
                    { id: 'all', label: 'Все вакансии', count: vacancies.length },
                    { id: 'active', label: 'Активные', count: vacancies.filter(v => v.status === 'active' || !v.status).length },
                    { id: 'pending', label: 'На модерации', count: vacancies.filter(v => v.status === 'pending' || v.status === 'pending_review').length },
                    { id: 'closed', label: 'Закрытые / Архив', count: vacancies.filter(v => v.status === 'closed').length }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setVacancyFilter(f.id as any)}
                      className={`px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider rounded-full transition-all flex items-center gap-2 cursor-pointer ${
                        vacancyFilter === f.id
                          ? 'bg-brand-dark text-white shadow-2xs font-semibold'
                          : 'text-brand-dark/70 hover:text-brand-dark hover:bg-white/60'
                      }`}
                    >
                      <span>{f.label}</span>
                      <span className={`px-1.5 py-0.2 font-mono text-[10px] rounded-full ${
                        vacancyFilter === f.id ? 'bg-[#7a0000] text-white' : 'bg-brand-dark/10 text-brand-dark'
                      }`}>
                        {f.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Vacancies Table */}
                <div className="overflow-x-auto rounded-2xl border border-brand-dark/[0.08] bg-white shadow-xs">
                  <table className="w-full text-left font-normal border-collapse min-w-[750px]">
                    <thead>
                      <tr className="border-b border-brand-dark/[0.08] bg-brand-muted/30 text-brand-dark/70 font-mono uppercase tracking-wider text-[11px]">
                        <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Должность / Вакансия</th>
                        <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Компания / Бренд</th>
                        <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Тип / Зарплата</th>
                        <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold text-center w-36">Статус модерации</th>
                        <th className="p-3.5 font-semibold text-center w-48">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vacanciesLoading ? (
                        <tr><td colSpan={5} className="p-8 text-center text-brand-dark/50 text-xs font-mono">Загрузка вакансий...</td></tr>
                      ) : vacancies
                          .filter(v => {
                            if (vacancyFilter === 'all') return true;
                            if (vacancyFilter === 'active') return v.status === 'active' || !v.status;
                            if (vacancyFilter === 'pending') return v.status === 'pending' || v.status === 'pending_review';
                            if (vacancyFilter === 'closed') return v.status === 'closed';
                            return true;
                          })
                          .length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-brand-dark/50 text-xs font-mono">В выбранной категории вакансий нет.</td></tr>
                      ) : (
                        vacancies
                          .filter(v => {
                            if (vacancyFilter === 'all') return true;
                            if (vacancyFilter === 'active') return v.status === 'active' || !v.status;
                            if (vacancyFilter === 'pending') return v.status === 'pending' || v.status === 'pending_review';
                            if (vacancyFilter === 'closed') return v.status === 'closed';
                            return true;
                          })
                          .map(v => (
                            <tr key={v.id} className="border-b border-brand-dark/[0.05] hover:bg-brand-muted/20 transition-colors last:border-b-0">
                              <td className="p-3.5 border-r border-brand-dark/[0.06]">
                                <div className="font-serif font-medium text-brand-dark text-sm">{v.title}</div>
                                <div className="text-[11px] font-mono text-brand-dark/50 mt-0.5">{v.department || v.category || 'Общая категория'} • {v.location || 'Баку'}</div>
                              </td>
                              <td className="p-3.5 border-r border-brand-dark/[0.06] font-medium text-brand-dark text-xs">
                                {v.company || v.brand || 'Azerbaijan Fashion Hub'}
                              </td>
                              <td className="p-3.5 border-r border-brand-dark/[0.06] text-xs font-mono text-brand-dark/70">
                                <div>{v.type || 'Full-time'}</div>
                                <div className="text-brand-accent font-semibold mt-0.5">{v.salary || 'По договоренности'}</div>
                              </td>
                              <td className="p-3.5 border-r border-brand-dark/[0.06] text-center">
                                <select
                                  value={v.status || 'active'}
                                  onChange={e => handleUpdateVacancyStatus(v.id, e.target.value)}
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider border cursor-pointer focus:outline-none ${
                                    v.status === 'active' || !v.status
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : v.status === 'closed'
                                      ? 'bg-red-50 text-red-800 border-red-300'
                                      : 'bg-amber-50 text-amber-800 border-amber-300'
                                  }`}
                                >
                                  <option value="active">Активна</option>
                                  <option value="pending">На модерации</option>
                                  <option value="closed">Закрыта</option>
                                </select>
                              </td>
                              <td className="p-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedVacancyDetails(v)}
                                    className="p-1.5 rounded-full border border-brand-dark/[0.12] hover:bg-brand-dark hover:text-white text-brand-dark transition-colors cursor-pointer shadow-2xs"
                                    title="Просмотреть описание"
                                  >
                                    <Eye size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedVacancyDetails(v)}
                                    className="p-1.5 rounded-full border border-brand-dark/[0.12] hover:bg-brand-dark hover:text-white text-brand-dark transition-colors cursor-pointer shadow-2xs"
                                    title="Редактировать"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteVacancy(v.id, v.title)}
                                    className="p-1.5 rounded-full border border-red-200 hover:bg-red-600 hover:text-white text-red-600 transition-colors cursor-pointer shadow-2xs"
                                    title="Удалить вакансию"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Job Applications Table */
              <div className="overflow-x-auto rounded-2xl border border-brand-dark/[0.08] bg-white shadow-xs">
                <table className="w-full text-left font-normal border-collapse min-w-[650px]">
                  <thead>
                    <tr className="border-b border-brand-dark/[0.08] bg-brand-muted/30 text-brand-dark/70 font-mono uppercase tracking-wider text-[11px]">
                      <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Дата</th>
                      <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Имя кандидата</th>
                      <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Email</th>
                      <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">ID вакансии</th>
                      <th className="p-3.5 font-semibold text-center">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobApplications.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-brand-dark/50 text-xs font-mono">Откликов кандидатов пока нет.</td></tr>
                    ) : (
                      jobApplications.map(j => (
                        <tr key={j.id} className="border-b border-brand-dark/[0.05] hover:bg-brand-muted/20 transition-colors last:border-b-0">
                          <td className="p-3.5 border-r border-brand-dark/[0.06] text-xs font-mono text-brand-dark/60">{new Date(j.createdAt).toLocaleDateString()}</td>
                          <td className="p-3.5 border-r border-brand-dark/[0.06] font-serif font-medium text-brand-dark text-sm">{j.name}</td>
                          <td className="p-3.5 border-r border-brand-dark/[0.06] text-xs font-mono text-brand-accent">{j.email}</td>
                          <td className="p-3.5 border-r border-brand-dark/[0.06] text-xs font-mono text-brand-dark/60">{j.jobId}</td>
                          <td className="p-3.5 text-center">
                            <span className="rounded-full px-3 py-0.5 border border-brand-dark/[0.1] bg-brand-muted/20 text-brand-dark uppercase tracking-wider text-[10px] font-mono font-semibold">
                              {j.status || 'Received'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

          {activeTab === 'education' as any && (
          <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 md:p-10 shadow-xs">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-8 border-b border-brand-dark/[0.08] pb-6">
              <div>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                  Academies & Universities
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark mt-1">Учебные заведения моды</h2>
                <p className="text-xs font-mono text-brand-dark/60 mt-1">Всего заведений: <span className="font-bold text-brand-dark">{education.length}</span></p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button onClick={handleSeedEducation} className="bg-white text-brand-dark px-4 py-2 font-semibold uppercase tracking-wider text-xs border border-brand-dark/[0.15] rounded-full hover:bg-brand-muted transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer">
                  <RefreshCw size={13} /> Загрузить Стандартные (17)
                </button>
                <label className="bg-brand-muted/40 text-brand-dark px-4 py-2 font-semibold uppercase tracking-wider text-xs border border-brand-dark/[0.15] rounded-full hover:bg-brand-dark hover:text-white transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5">
                  <Upload size={13} /> + Import CSV
                  <input type="file" accept=".csv" className="hidden" onChange={handleEducationCsvUpload} />
                </label>
                <button onClick={() => setAddModalType('education')} className="bg-brand-dark text-white px-5 py-2 font-semibold uppercase tracking-wider text-xs rounded-full hover:bg-brand-accent transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5">
                  <Plus size={14} /> + Добавить заведение
                </button>
              </div>
            </div>

            {/* Section Filters */}
            <div className="flex flex-wrap gap-1.5 mb-6 bg-brand-muted/30 p-1.5 rounded-full border border-brand-dark/[0.08] w-fit">
              {[
                { id: 'all', label: 'Все заведения' },
                { id: 'higher_state', label: 'I. Гос. Университеты' },
                { id: 'higher_private', label: 'I. Частные Университеты' },
                { id: 'private_school', label: 'II. Частные Школы Моды' },
                { id: 'other', label: 'Другие' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setEduCategoryFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    eduCategoryFilter === tab.id
                      ? 'bg-brand-dark text-white shadow-2xs font-semibold'
                      : 'text-brand-dark/70 hover:text-brand-dark hover:bg-white/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-brand-dark/[0.08] overflow-x-auto text-left bg-white shadow-xs">
              <table className="w-full font-normal border-collapse min-w-[850px]">
                <thead>
                  <tr className="border-b border-brand-dark/[0.08] bg-brand-muted/30 text-brand-dark/70 font-mono uppercase tracking-wider text-[11px]">
                    <th className="p-3.5 border-r border-brand-dark/[0.06] w-20 text-center font-semibold">Порядок</th>
                    <th className="p-3.5 border-r border-brand-dark/[0.06] w-12 text-center font-semibold">№</th>
                    <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Название (AZ / RU)</th>
                    <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Раздел / Секция</th>
                    <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Бейдж</th>
                    <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Направления</th>
                    <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Сайт</th>
                    <th className="p-3.5 font-semibold text-center">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {education
                    .filter(e => eduCategoryFilter === 'all' || e.category === eduCategoryFilter)
                    .map((e, idx) => {
                      const categoryLabel = 
                        e.category === 'higher_state' ? 'I. Высшее (Гос)' :
                        e.category === 'higher_private' ? 'I. Высшее (Частное)' :
                        e.category === 'private_school' ? 'II. Школа Моды' : 'Другое';

                      const facultyCount = Array.isArray(e.faculties) ? e.faculties.length : 0;

                      return (
                        <tr key={e.id} className="border-b border-brand-dark/[0.05] hover:bg-brand-muted/20 transition-colors last:border-b-0">
                          <td className="p-3.5 border-r border-brand-dark/[0.06] text-center">
                            <div className="flex justify-center gap-1">
                              <button onClick={() => handleMoveRow('education', education, setEducation, idx, 'up')} disabled={idx === 0} title="Выше" className="w-6 h-6 rounded-full border border-brand-dark/10 hover:bg-brand-dark hover:text-white disabled:opacity-20 flex items-center justify-center transition-colors cursor-pointer"><ArrowUp size={11}/></button>
                              <button onClick={() => handleMoveRow('education', education, setEducation, idx, 'down')} disabled={idx === education.length - 1} title="Ниже" className="w-6 h-6 rounded-full border border-brand-dark/10 hover:bg-brand-dark hover:text-white disabled:opacity-20 flex items-center justify-center transition-colors cursor-pointer"><ArrowDown size={11}/></button>
                            </div>
                          </td>
                          <td className="p-3.5 border-r border-brand-dark/[0.06] text-center text-xs font-mono text-brand-dark/60">{e.number || idx + 1}</td>
                          <td className="p-3.5 border-r border-brand-dark/[0.06] max-w-xs">
                            <div className="font-serif font-medium text-brand-dark text-sm">{e.name}</div>
                            {e.nameRu && <div className="text-xs text-brand-dark/50 font-normal italic mt-0.5">{e.nameRu}</div>}
                          </td>
                          <td className="p-3.5 border-r border-brand-dark/[0.06]">
                            <span className={`inline-block px-2.5 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold rounded-full border ${
                              e.category === 'higher_state' ? 'bg-blue-50 text-blue-900 border-blue-200' :
                              e.category === 'higher_private' ? 'bg-purple-50 text-purple-900 border-purple-200' :
                              e.category === 'private_school' ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-gray-50 text-gray-800 border-gray-200'
                            }`}>
                              {categoryLabel}
                            </span>
                          </td>
                          <td className="p-3.5 border-r border-brand-dark/[0.06] text-xs font-mono text-brand-dark/70">
                            {e.badge || '—'}
                          </td>
                          <td className="p-3.5 border-r border-brand-dark/[0.06] text-xs">
                            {facultyCount > 0 ? (
                              <span className="bg-brand-muted/50 border border-brand-dark/[0.08] px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold text-brand-dark">
                                {facultyCount} направл.
                              </span>
                            ) : (
                              <span className="text-brand-dark/40 font-mono text-xs">—</span>
                            )}
                          </td>
                          <td className="p-3.5 border-r border-brand-dark/[0.06] text-xs">
                            {e.website ? (
                              <a href={e.website} target="_blank" rel="noreferrer" className="text-brand-accent underline hover:text-brand-dark truncate max-w-[120px] block font-mono">
                                Link
                              </a>
                            ) : <span className="text-brand-dark/40 font-mono">—</span>}
                          </td>
                          <td className="p-3.5">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => startEditMockItem('education', e)} className="rounded-full border border-brand-dark/[0.12] px-3 py-1 text-xs font-mono font-medium hover:bg-brand-dark hover:text-white transition-colors flex items-center gap-1 shadow-2xs cursor-pointer">
                                <Edit2 size={11}/> Edit
                              </button>
                              <button onClick={() => deleteMockItem('education', e.id)} className="rounded-full border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1 text-xs font-mono font-medium transition-colors flex items-center gap-1 shadow-2xs cursor-pointer">
                                <Trash2 size={11}/> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {education.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-brand-dark/50 text-xs">
                        Учебные заведения пока не добавлены. Нажмите &quot;Загрузить Стандартные (17)&quot; чтобы инициализировать список.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

          {activeTab === 'agencies' as any && (
          <div className="space-y-8">
            {/* Agency Applications Review Hub */}
            <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 md:p-10 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-brand-dark/[0.08] pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-[#7a0000] text-white px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck size={12} /> Verification Queue
                    </span>
                    <AgencyBadge size="xs" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark mt-1">
                    Заявки на получение статуса агентства ({agencyApplications.length})
                  </h2>
                  <p className="text-xs sm:text-sm font-normal text-brand-dark/60 mt-1">
                    Рассмотрите заявки от модельных агентств. Одобрение автоматически присваивает статус официального агентства и возможность верифицировать моделей (😎).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchAgencyApplications}
                  className="px-4 py-2 border border-brand-dark/[0.15] bg-brand-muted/40 hover:bg-brand-dark hover:text-white rounded-full font-semibold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                >
                  <RefreshCw size={13} />
                  <span>Обновить заявки</span>
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 mb-6 bg-brand-muted/30 p-1.5 rounded-full border border-brand-dark/[0.08] w-fit">
                {[
                  { id: 'pending', label: 'Ожидают проверки', count: agencyApplications.filter(a => a.status === 'pending').length },
                  { id: 'approved', label: 'Одобренные', count: agencyApplications.filter(a => a.status === 'approved').length },
                  { id: 'rejected', label: 'Отклоненные', count: agencyApplications.filter(a => a.status === 'rejected').length },
                  { id: 'all', label: 'Все заявки', count: agencyApplications.length }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setAgencyAppFilter(f.id as any)}
                    className={`px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider rounded-full transition-all flex items-center gap-2 cursor-pointer ${
                      agencyAppFilter === f.id
                        ? 'bg-brand-dark text-white shadow-2xs font-semibold'
                        : 'text-brand-dark/70 hover:text-brand-dark hover:bg-white/60'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className={`px-1.5 py-0.2 font-mono text-[10px] rounded-full ${
                      agencyAppFilter === f.id ? 'bg-[#7a0000] text-white' : 'bg-brand-dark/10 text-brand-dark'
                    }`}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Applications List */}
              {loadingAgencyApps ? (
                <div className="py-12 text-center font-mono text-xs text-brand-dark/60">
                  Загрузка заявок агентств...
                </div>
              ) : agencyApplications.filter(a => agencyAppFilter === 'all' || a.status === agencyAppFilter).length === 0 ? (
                <div className="p-8 rounded-2xl border-2 border-dashed border-brand-dark/15 bg-brand-muted/10 text-center">
                  <p className="text-sm font-medium text-brand-dark/60">Нет заявок в категории «{agencyAppFilter}».</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {agencyApplications
                    .filter(a => agencyAppFilter === 'all' || a.status === agencyAppFilter)
                    .map(app => {
                      const normName = (app.agencyName || '').trim().toLowerCase();
                      const alreadyApprovedAgency = agencies.find(a => a.name.trim().toLowerCase() === normName && a.hasAgencyBadge);
                      const alreadyApprovedRep = users.find(u => u.representedAgencyName?.trim()?.toLowerCase() === normName && u.agencyVerificationStatus === 'approved' && u.id !== app.userId);
                      const otherApprovedApp = agencyApplications.find(other => other.id !== app.id && other.agencyName?.trim()?.toLowerCase() === normName && other.status === 'approved');
                      const otherPendingApp = agencyApplications.find(other => other.id !== app.id && other.agencyName?.trim()?.toLowerCase() === normName && other.status === 'pending');

                      const hasConflict = alreadyApprovedAgency || alreadyApprovedRep || otherApprovedApp;

                      return (
                        <div
                          key={app.id}
                          className={`bg-white rounded-2xl border-2 p-5 flex flex-col justify-between space-y-4 transition-all shadow-xs ${
                            hasConflict ? 'border-red-300' : 'border-brand-dark/[0.08] hover:border-brand-accent/30'
                          }`}
                        >
                          <div>
                            {/* Status & Date */}
                            <div className="flex justify-between items-center mb-3">
                              <span
                                className={`px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider rounded-full border flex items-center gap-1 ${
                                  app.status === 'approved'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : app.status === 'rejected'
                                    ? 'bg-red-50 text-red-800 border-red-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`}
                              >
                                {app.status === 'approved' && <Check size={11} />}
                                {app.status === 'rejected' && <X size={11} />}
                                {app.status === 'pending' && <ShieldCheck size={11} />}
                                <span>{app.status === 'approved' ? 'Одобрено' : app.status === 'rejected' ? 'Отклонено' : 'На рассмотрении'}</span>
                              </span>

                              <span className="text-[11px] font-mono text-brand-dark/50">
                                {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '—'}
                              </span>
                            </div>

                            {/* ANTI-SPAM & DUPLICATE WARNING */}
                            {hasConflict ? (
                              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-1 mb-3">
                                <div className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-red-800">
                                  <AlertCircle size={15} className="shrink-0" />
                                  <span>⚠️ ВНИМАНИЕ: Агентство УЖЕ ПОДТВЕРЖДЕНО!</span>
                                </div>
                                <p className="text-[11px] leading-relaxed">
                                  В реестре уже есть подтвержденное агентство «{app.agencyName}». Представитель: <strong>{alreadyApprovedRep?.name || otherApprovedApp?.applicantFirstName || alreadyApprovedAgency?.linkedUserName || 'Утверждено'}</strong> ({alreadyApprovedRep?.email || otherApprovedApp?.userEmail || ''}). Возможно повторное или мошенническое обращение!
                                </p>
                              </div>
                            ) : otherPendingApp ? (
                              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1 mb-3">
                                <div className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-800">
                                  <AlertCircle size={15} className="shrink-0" />
                                  <span>⚠️ ДУБЛИКАТ: Есть другая заявка на рассмотрении!</span>
                                </div>
                                <p className="text-[11px] leading-relaxed">
                                  Для «{app.agencyName}» ожидает рассмотрения другая заявка от {otherPendingApp.applicantFirstName} {otherPendingApp.applicantLastName} ({otherPendingApp.userEmail}).
                                </p>
                              </div>
                            ) : (
                              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-center gap-1.5 mb-3">
                                <CheckCircle2 size={13} className="text-emerald-700 shrink-0" />
                                <span>✅ Новое уникальное агентство (в реестре нет совпадений)</span>
                              </div>
                            )}

                            {/* Agency Title */}
                            <h3 className="text-lg font-serif font-medium text-brand-dark flex items-center gap-2">
                              <span>{app.agencyName}</span>
                              <AgencyBadge size="sm" />
                            </h3>

                            {/* Applicant Details */}
                            <div className="mt-2.5 space-y-1.5 text-xs text-brand-dark/75 font-normal">
                              <div>
                                <strong className="font-semibold text-brand-dark">ФИО представителя:</strong>{' '}
                                <span className="font-bold text-brand-dark">
                                  {app.applicantFirstName} {app.applicantLastName} {app.applicantPatronymic || ''}
                                </span>
                              </div>
                              <div>
                                <strong className="font-semibold text-brand-dark">Телефон:</strong>{' '}
                                <span className="font-mono text-brand-dark font-bold">{app.phoneNumber || '—'}</span>
                              </div>
                              <div>
                                <strong className="font-semibold text-brand-dark">Email:</strong> {app.userEmail} &middot;{' '}
                                <span className="font-mono text-brand-accent font-semibold">{app.userHandle || `@${app.userEmail?.split('@')[0]}`}</span>
                              </div>
                              {app.agencyAddress && (
                                <div>
                                  <strong className="font-semibold text-brand-dark">Адрес агентства:</strong> {app.agencyAddress}
                                </div>
                              )}
                              {app.foundingYear && (
                                <div>
                                  <strong className="font-semibold text-brand-dark">Год основания:</strong> {app.foundingYear}
                                </div>
                              )}
                            </div>

                            {/* PHOTOS (Şəxsiyyət vəsiqəsi & Personal Photo) */}
                            {(app.idCardPhotoUrl || app.idDocumentUrl || app.personalPhotoUrl) && (
                              <div className="mt-3.5 pt-3 border-t border-brand-dark/[0.06] space-y-2">
                                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark/60">
                                  Прикрепленные фотографии:
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                  {(app.idCardPhotoUrl || app.idDocumentUrl) && (
                                    <div
                                      onClick={() => setAgencyZoomImage({ 
                                        url: app.idCardPhotoUrl || app.idDocumentUrl, 
                                        caption: `Şəxsiyyət vəsiqəsi — ${app.agencyName} (${app.applicantFirstName} ${app.applicantLastName})` 
                                      })}
                                      className="group cursor-pointer flex items-center gap-2 p-1.5 rounded-xl bg-brand-light border border-brand-dark/15 hover:border-brand-accent transition-all"
                                    >
                                      <img
                                        src={app.idCardPhotoUrl || app.idDocumentUrl}
                                        alt="Şəxsiyyət vəsiqəsi"
                                        className="w-14 h-9 object-cover rounded-lg border border-brand-dark/20"
                                      />
                                      <div className="text-[10px] font-mono font-bold text-brand-dark group-hover:text-brand-accent">
                                        Şəxsiyyət vəsiqəsi 🔍
                                      </div>
                                    </div>
                                  )}

                                  {app.personalPhotoUrl && (
                                    <div
                                      onClick={() => setAgencyZoomImage({ 
                                        url: app.personalPhotoUrl, 
                                        caption: `Личное фото заявителя — ${app.applicantFirstName} ${app.applicantLastName}` 
                                      })}
                                      className="group cursor-pointer flex items-center gap-2 p-1.5 rounded-xl bg-brand-light border border-brand-dark/15 hover:border-brand-accent transition-all"
                                    >
                                      <img
                                        src={app.personalPhotoUrl}
                                        alt="Личное фото"
                                        className="w-9 h-9 object-cover rounded-full border border-brand-dark/20"
                                      />
                                      <div className="text-[10px] font-mono font-bold text-brand-dark group-hover:text-brand-accent">
                                        Личное фото 🔍
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Rejection Reason if any */}
                            {app.status === 'rejected' && app.rejectionReason && (
                              <div className="mt-2 p-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 font-medium">
                                <strong>Причина отклонения:</strong> {app.rejectionReason}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="pt-3 border-t border-brand-dark/[0.06] flex flex-wrap items-center justify-between gap-2">
                            <Link
                              to={`/u/${(app.userHandle || app.userId).replace('@', '')}`}
                              target="_blank"
                              className="text-xs font-semibold uppercase tracking-wider text-brand-dark hover:text-brand-accent flex items-center gap-1"
                            >
                              <ExternalLink size={12} /> Профиль заявителя
                            </Link>

                            <div className="flex items-center gap-2">
                              {app.status !== 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveAgencyApp(app)}
                                  className="px-3.5 py-1.5 rounded-full bg-[#7a0000] text-white text-xs font-semibold uppercase tracking-wider hover:bg-black transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                                >
                                  <ShieldCheck size={13} />
                                  <span>Одобрить агентство</span>
                                </button>
                              )}

                              {app.status !== 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() => handleRejectAgencyApp(app)}
                                  className="px-3 py-1.5 rounded-full border border-red-300 bg-red-50 text-red-800 text-xs font-semibold uppercase tracking-wider hover:bg-red-700 hover:text-white transition-colors cursor-pointer shadow-2xs"
                                >
                                  Отклонить
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <AgencyModelVerificationCard isSuperAdmin={true} onModelVerified={() => fetchUsers()} />

            <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 md:p-10 shadow-xs">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-brand-dark/[0.08] pb-6">
                <div>
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                    Official Agencies Directory
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark mt-1">Модельные агентства</h2>
                  <p className="text-xs font-mono text-brand-dark/60 mt-1">
                    Всего в базе данных: <span className="font-bold text-brand-dark">{agencies.length}</span> агентств
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button onClick={handleSeedAgencies} className="bg-white text-brand-dark px-4 py-2 font-semibold uppercase tracking-wider text-xs border border-brand-dark/[0.15] rounded-full hover:bg-brand-muted transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer">
                    <RefreshCw size={13} /> Сбросить / Загрузить агентства
                  </button>
                  <label className="bg-brand-muted/40 text-brand-dark px-4 py-2 font-semibold uppercase tracking-wider text-xs border border-brand-dark/[0.15] rounded-full hover:bg-brand-dark hover:text-white transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5">
                    <Upload size={13} /> + Импорт CSV
                    <input type="file" accept=".csv" className="hidden" onChange={handleAgencyCsvUpload} />
                  </label>
                  <button onClick={() => setAddModalType('agencies')} className="bg-brand-dark text-white px-5 py-2 font-semibold uppercase tracking-wider text-xs rounded-full hover:bg-brand-accent transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5">
                    <Plus size={14} /> + Добавить агентство
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-brand-dark/[0.08] overflow-x-auto text-left bg-white shadow-xs">
                <table className="w-full font-normal border-collapse min-w-[850px]">
                  <thead>
                    <tr className="border-b border-brand-dark/[0.08] bg-brand-muted/30 text-brand-dark/70 font-mono uppercase tracking-wider text-[11px]">
                      <th className="p-3.5 border-r border-brand-dark/[0.06] w-20 text-center font-semibold">Порядок</th>
                      <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Название агентства</th>
                      <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Локация</th>
                      <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Описание</th>
                      <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Специализации</th>
                      <th className="p-3.5 border-r border-brand-dark/[0.06] font-semibold">Instagram / Сайт</th>
                      <th className="p-3.5 font-semibold text-center">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agencies.map((a, idx) => (
                      <tr key={a.id} className="border-b border-brand-dark/[0.05] hover:bg-brand-muted/20 transition-colors last:border-b-0">
                        <td className="p-3.5 border-r border-brand-dark/[0.06] text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => handleMoveRow('agencies', agencies, setAgencies, idx, 'up')} disabled={idx === 0} title="Выше" className="w-6 h-6 rounded-full border border-brand-dark/10 hover:bg-brand-dark hover:text-white disabled:opacity-20 flex items-center justify-center transition-colors cursor-pointer"><ArrowUp size={11}/></button>
                            <button onClick={() => handleMoveRow('agencies', agencies, setAgencies, idx, 'down')} disabled={idx === agencies.length - 1} title="Ниже" className="w-6 h-6 rounded-full border border-brand-dark/10 hover:bg-brand-dark hover:text-white disabled:opacity-20 flex items-center justify-center transition-colors cursor-pointer"><ArrowDown size={11}/></button>
                          </div>
                        </td>
                        <td className="p-3.5 border-r border-brand-dark/[0.06] font-serif font-medium text-brand-dark text-sm">{a.name}</td>
                        <td className="p-3.5 border-r border-brand-dark/[0.06] text-xs font-mono text-brand-dark/70 whitespace-nowrap">{a.location || '—'}</td>
                        <td className="p-3.5 border-r border-brand-dark/[0.06] text-xs text-brand-dark/70 max-w-xs truncate">{a.description || a.bio || a.details || '—'}</td>
                        <td className="p-3.5 border-r border-brand-dark/[0.06] text-xs font-mono text-brand-dark/70">{Array.isArray(a.focus) ? a.focus.join(', ') : (a.focus || '—')}</td>
                        <td className="p-3.5 border-r border-brand-dark/[0.06] text-xs font-mono text-brand-dark/70 space-y-0.5">
                          {a.instagram && <div className="truncate">IG: {a.instagram}</div>}
                          {a.website && <div className="truncate text-brand-accent underline">Web: {a.website}</div>}
                          {!a.instagram && !a.website && <span>—</span>}
                        </td>
                        <td className="p-3.5">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => startEditMockItem('agencies', a)} className="rounded-full border border-brand-dark/[0.12] px-3 py-1 text-xs font-mono font-medium hover:bg-brand-dark hover:text-white transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"><Edit2 size={11}/> Edit</button>
                            <button onClick={() => deleteMockItem('agencies', a.id)} className="rounded-full border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1 text-xs font-mono font-medium transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"><Trash2 size={11}/> Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {agencies.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-brand-dark/50 text-xs">Нет агентств в базе данных.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ff_ai' as any && (
          <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 md:p-10 shadow-xs">
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b-2 border-brand-dark pb-6">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <span className="bg-brand-dark text-[#c1ff72] font-mono text-xs font-bold px-2 py-0.5 uppercase tracking-widest border border-brand-dark">
 Superadmin Only
 </span>
 <span className="bg-brand-accent text-white font-mono text-xs font-bold px-2 py-0.5 uppercase tracking-widest border border-brand-dark">
 RAG Knowledge Base
 </span>
 </div>
 <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-brand-dark font-display">
 FF AI Knowledge Base (Education & Admissions)
 </h2>
 <p className="text-xs sm:text-sm font-medium text-brand-dark/70 mt-1">
 Загружайте сюда данные университетов, факультетов, условий поступления, цен и портфолио. Бот в разделе Education использует эту базу для ответов студентам на нескольких языках.
 </p>
 </div>
 
 <div className="flex flex-wrap gap-3 w-full md:w-auto">
 <button 
 onClick={() => {
 setEditingFfAiDoc(null);
 setFfAiForm({
 title: '',
 institution: '',
 category: 'university_guide',
 content: '',
 faculties: '',
 tuition: '',
 admissionRequirements: '',
 deadlines: '',
 language: 'az,ru,en'
 });
 setShowFfAiModal(true);
 }} 
 className="bg-brand-accent text-white px-5 py-3 font-bold uppercase tracking-widest text-xs border-2 border-brand-dark hover:bg-brand-dark transition-all flex items-center gap-2 shrink-0"
 >
 <Plus size={16} />
 + Добавить материал для бота
 </button>
 </div>
 </div>

 {/* Quick Filter / Search */}
 <div className="flex flex-col sm:flex-row justify-between items-stretch gap-4 mb-6">
 <div className="relative flex-1">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-dark/50" size={16} />
 <input 
 type="text" 
 placeholder="Поиск по базе знаний (ВУЗ, факультет, ключевые слова)..." 
 value={ffAiSearch} 
 onChange={e => setFfAiSearch(e.target.value)} 
 className="w-full bg-brand-light border-2 border-brand-dark pl-10 pr-4 py-2.5 text-xs sm:text-sm font-bold focus:outline-none focus:border-brand-accent"
 />
 </div>
 </div>

 {/* Documents Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
 {ffAiDocs
 .filter(d => 
 !ffAiSearch ||
 (d.title && d.title.toLowerCase().includes(ffAiSearch.toLowerCase())) ||
 (d.institution && d.institution.toLowerCase().includes(ffAiSearch.toLowerCase())) ||
 (d.content && d.content.toLowerCase().includes(ffAiSearch.toLowerCase()))
 )
 .map(docItem => (
 <div key={docItem.id} className="border-3 border-brand-dark bg-white p-5 flex flex-col justify-between">
 <div>
 <div className="flex justify-between items-start gap-2 mb-2">
 <span className="bg-brand-muted text-brand-dark font-mono text-[10px] font-bold px-2 py-0.5 uppercase border border-brand-dark">
 {docItem.category || 'university_guide'}
 </span>
 <span className="text-[10px] font-mono text-brand-dark/50">
 {docItem.language || 'az,ru,en'}
 </span>
 </div>

 <h3 className="text-lg font-black uppercase tracking-tight text-brand-dark mb-1">
 {docItem.title}
 </h3>
 {docItem.institution && (
 <p className="text-xs font-bold text-brand-accent uppercase tracking-wider mb-3">
 {docItem.institution}
 </p>
 )}

 {docItem.tuition && (
 <div className="mb-2 text-xs font-mono text-brand-dark">
 <strong>Оплата:</strong> {docItem.tuition}
 </div>
 )}

 {docItem.admissionRequirements && (
 <div className="mb-2 text-xs text-brand-dark/80">
 <strong>Требования:</strong> {docItem.admissionRequirements}
 </div>
 )}

 <div className="mt-3 p-3 bg-brand-muted/30 border border-brand-dark/20 text-xs text-brand-dark/90 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
 {docItem.content}
 </div>
 </div>

 <div className="pt-4 mt-4 border-t border-brand-dark/20 flex justify-between items-center">
 <button 
 onClick={() => {
 setEditingFfAiDoc(docItem);
 setFfAiForm({
 title: docItem.title || '',
 institution: docItem.institution || '',
 category: docItem.category || 'university_guide',
 content: docItem.content || '',
 faculties: Array.isArray(docItem.faculties) ? docItem.faculties.join(', ') : '',
 tuition: docItem.tuition || '',
 admissionRequirements: docItem.admissionRequirements || '',
 deadlines: docItem.deadlines || '',
 language: docItem.language || 'az,ru,en'
 });
 setShowFfAiModal(true);
 }}
 className="px-3 py-1.5 bg-brand-light hover:bg-brand-dark hover:text-white border-2 border-brand-dark font-bold text-xs uppercase tracking-wider transition-colors"
 >
 Редактировать
 </button>

 <button 
 onClick={() => handleDeleteFfAiDoc(docItem.id)}
 className="p-1.5 text-red-600 hover:text-white hover:bg-red-600 border border-transparent hover:border-brand-dark transition-colors"
 title="Delete"
 >
 <Trash2 size={16} />
 </button>
 </div>
 </div>
 ))}

 {ffAiDocs.length === 0 && (
 <div className="col-span-1 md:col-span-2 p-10 text-center border-2 border-dashed border-brand-dark/40 bg-brand-muted/20">
 <p className="text-sm font-bold uppercase tracking-widest text-brand-dark/60 mb-3">
 В базе данных FF AI пока нет дополнительных документов.
 </p>
 <p className="text-xs text-brand-dark/50 max-w-md mx-auto mb-4">
 Бот сейчас использует данные из каталога раздела Education. Нажмите «Добавить материал», чтобы расширить знания бота подробными текстами об экзаменах, проходных баллах и стипендиях.
 </p>
 </div>
 )}
 </div>

 {/* AI Testing Playground */}
 <div className="border-3 border-brand-dark bg-brand-muted p-6">
 <h3 className="text-lg font-black uppercase tracking-tight text-brand-dark mb-2 flex items-center gap-2">
 <Bot size={20} className="text-brand-accent" />
 Тестирование FF AI (Admin Playground)
 </h3>
 <p className="text-xs text-brand-dark/70 mb-4">
 Проверьте, как бот отвечает на вопросы на основе загруженной базы знаний:
 </p>

 <div className="flex gap-2 mb-4">
 <input 
 type="text" 
 value={ffAiTestPrompt} 
 onChange={e => setFfAiTestPrompt(e.target.value)} 
 placeholder="Например: Какие документы нужны для поступления в ADRA на дизайн одежды?"
 className="flex-1 bg-white border-2 border-brand-dark p-3 text-xs sm:text-sm font-bold focus:outline-none focus:border-brand-accent"
 />
 <button 
 onClick={handleTestFfAi}
 disabled={ffAiTestLoading || !ffAiTestPrompt.trim()}
 className="bg-brand-dark text-white px-6 py-3 font-bold uppercase text-xs tracking-widest border-2 border-brand-dark hover:bg-brand-accent transition-colors disabled:opacity-50"
 >
 {ffAiTestLoading ? 'Думает...' : 'Тест'}
 </button>
 </div>

 {ffAiTestResult && (
 <div className="p-4 bg-white border-2 border-brand-dark text-xs sm:text-sm text-brand-dark whitespace-pre-wrap">
 <strong className="block font-mono text-[10px] uppercase tracking-widest text-brand-accent mb-2">Ответ FF AI:</strong>
 {ffAiTestResult}
 </div>
 )}
 </div>
 </div>
 )}

 {/* Modal for adding/editing FF AI knowledge */}
 {showFfAiModal && (
 <div className="fixed inset-0 bg-brand-dark/80 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm">
          <form onSubmit={handleSaveFfAiDoc} className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
 <div className="flex justify-between items-center mb-6 border-b-2 border-brand-dark pb-3">
 <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-brand-dark font-display">
 {editingFfAiDoc ? 'Редактировать материал FF AI' : 'Добавить материал для FF AI'}
 </h3>
 <button type="button" onClick={() => setShowFfAiModal(false)} className="text-brand-dark hover:text-brand-accent">
 <X size={24} />
 </button>
 </div>

 <div className="space-y-4 text-xs sm:text-sm font-bold text-brand-dark">
 <div>
 <label className="block uppercase tracking-wider mb-1">Заголовок документа / Тема *</label>
 <input 
 type="text" 
 required
 value={ffAiForm.title} 
 onChange={e => setFfAiForm({...ffAiForm, title: e.target.value})} 
 placeholder="Например: Правила приема и портфолио ADRA 2026"
 className="w-full bg-white border-2 border-brand-dark p-2.5 font-medium focus:outline-none focus:border-brand-accent"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block uppercase tracking-wider mb-1">Учебное заведение</label>
 <input 
 type="text" 
 value={ffAiForm.institution} 
 onChange={e => setFfAiForm({...ffAiForm, institution: e.target.value})} 
 placeholder="Например: Azərbaycan Dövlət Rəssamlıq Akademiyası"
 className="w-full bg-white border-2 border-brand-dark p-2.5 font-medium focus:outline-none focus:border-brand-accent"
 />
 </div>
 <div>
 <label className="block uppercase tracking-wider mb-1">Категория</label>
 <select 
 value={ffAiForm.category} 
 onChange={e => setFfAiForm({...ffAiForm, category: e.target.value})}
 className="w-full bg-white border-2 border-brand-dark p-2.5 font-medium focus:outline-none focus:border-brand-accent"
 >
 <option value="university_guide">ВУЗ / Руководство</option>
 <option value="admission_rules">Правила приема и экзамены</option>
 <option value="portfolio_guide">Требования к портфолио</option>
 <option value="tuition_scholarships">Стоимость и гранты</option>
 <option value="courses_vocational">Курсы и лицеи</option>
 </select>
 </div>
 </div>

 <div>
 <label className="block uppercase tracking-wider mb-1">Факультеты (через запятую)</label>
 <input 
 type="text" 
 value={ffAiForm.faculties} 
 onChange={e => setFfAiForm({...ffAiForm, faculties: e.target.value})} 
 placeholder="Geyim dizaynı, Tekstil sənəti, Moda marketinqi"
 className="w-full bg-white border-2 border-brand-dark p-2.5 font-medium focus:outline-none focus:border-brand-accent"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block uppercase tracking-wider mb-1">Стоимость обучения / Гранты</label>
 <input 
 type="text" 
 value={ffAiForm.tuition} 
 onChange={e => setFfAiForm({...ffAiForm, tuition: e.target.value})} 
 placeholder="2500 AZN / Dövlət sifarişi mövcuddur"
 className="w-full bg-white border-2 border-brand-dark p-2.5 font-medium focus:outline-none focus:border-brand-accent"
 />
 </div>
 <div>
 <label className="block uppercase tracking-wider mb-1">Дедлайны / Сроки подачи</label>
 <input 
 type="text" 
 value={ffAiForm.deadlines} 
 onChange={e => setFfAiForm({...ffAiForm, deadlines: e.target.value})} 
 placeholder="Июль - Август ежегодно"
 className="w-full bg-white border-2 border-brand-dark p-2.5 font-medium focus:outline-none focus:border-brand-accent"
 />
 </div>
 </div>

 <div>
 <label className="block uppercase tracking-wider mb-1">Требования к поступлению</label>
 <input 
 type="text" 
 value={ffAiForm.admissionRequirements} 
 onChange={e => setFfAiForm({...ffAiForm, admissionRequirements: e.target.value})} 
 placeholder="DİM 1-ci qrup və ya qabiliyyət imtahanı (rəsm, kompozisiya)"
 className="w-full bg-white border-2 border-brand-dark p-2.5 font-medium focus:outline-none focus:border-brand-accent"
 />
 </div>

 <div>
 <label className="block uppercase tracking-wider mb-1">Полный текст материала для базы знаний ИИ *</label>
 <textarea 
 required
 rows={6}
 value={ffAiForm.content} 
 onChange={e => setFfAiForm({...ffAiForm, content: e.target.value})} 
 placeholder="Опишите подробно все детали: история, кафедры, преподаватели, контакты приемной комиссии, советы по прохождению творческого конкурса..."
 className="w-full bg-white border-2 border-brand-dark p-2.5 font-medium focus:outline-none focus:border-brand-accent font-mono text-xs"
 />
 </div>
 </div>

 <div className="flex justify-end gap-3 mt-6 pt-4 border-t-2 border-brand-dark">
 <button 
 type="button" 
 onClick={() => setShowFfAiModal(false)}
 className="px-5 py-2.5 bg-brand-light border-2 border-brand-dark font-bold text-xs uppercase tracking-widest hover:bg-brand-muted"
 >
 Отмена
 </button>
 <button 
 type="submit" 
 disabled={loading}
 className="px-6 py-2.5 bg-brand-accent text-white border-2 border-brand-dark font-black text-xs uppercase tracking-widest hover:bg-brand-dark"
 >
 {loading ? 'Сохранение...' : 'Сохранить в базу FF AI'}
 </button>
 </div>
 </form>
 </div>
 )}

 {addModalType && (
 <div className="fixed inset-0 bg-brand-dark/75 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md overflow-y-auto">
 <form onSubmit={handleAddSubmit} className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 w-full max-w-xl max-h-[90vh] flex flex-col justify-between overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
 <div className="flex justify-between items-center mb-4 sm:mb-6">
 <h3 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-brand-dark">
 {addModalEditingId ? 'Edit' : 'Add'} {addModalType === 'job' ? 'Job' : addModalType === 'designers' ? 'Designer' : addModalType === 'education' ? 'Program' : addModalType === 'news' ? 'News' : addModalType === 'sponsors' ? 'Sponsor' : 'Agency'}
 </h3>
 <button type="button" onClick={() => setAddModalType(null)} className="text-brand-dark hover:text-brand-accent transition-colors">
 <X size={24} />
 </button>
 </div>
 
 <div className="space-y-4 mb-6 max-h-[65vh] overflow-y-auto pr-2">
 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">
 {addModalType === 'job' ? 'Title' : addModalType === 'education' ? 'University Name' : addModalType === 'designers' ? 'Brand Name' : 'Name'}
 </label>
 <input required type="text" className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.name} onChange={e => setAddModalData({...addModalData, name: e.target.value})} />
 </div>
 
 {addModalType === 'job' && (
 <>
 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">Description</label>
 <textarea className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent h-24 resize-none"
 value={addModalData.details} onChange={e => setAddModalData({...addModalData, details: e.target.value})} />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">Location</label>
 <input type="text" className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.location} onChange={e => setAddModalData({...addModalData, location: e.target.value})} />
 </div>
 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">Type</label>
 <select className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.type} onChange={e => setAddModalData({...addModalData, type: e.target.value})}>
 <option value="Full-time">Full-time</option>
 <option value="Part-time">Part-time</option>
 <option value="Contract">Contract</option>
 <option value="Internship">Internship</option>
 </select>
 </div>
 </div>
 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">Salary</label>
 <input type="text" className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.salary} onChange={e => setAddModalData({...addModalData, salary: e.target.value})} />
 </div>
 </>
 )}

 {addModalType === 'designers' && (
 <>
 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">Имя дизайнера / Основатель (Designer / Founder)</label>
 <input type="text" placeholder="например: Əli Əliyev Əli" className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.details} onChange={e => setAddModalData({...addModalData, details: e.target.value})} />
 </div>
 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">Ссылка на Instagram (Instagram URL)</label>
 <input type="text" placeholder="https://instagram.com/..." className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.instagram} onChange={e => setAddModalData({...addModalData, instagram: e.target.value})} />
 </div>
 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">Веб-сайт (Website URL)</label>
 <input type="text" placeholder="https://..." className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.website} onChange={e => setAddModalData({...addModalData, website: e.target.value})} />
 </div>
 </>
 )}
 {addModalType === 'education' && (
 <>
 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">Название на русском (Name in Russian)</label>
 <input type="text" placeholder="например: Азербайджанский государственный университет..." className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.nameRu} onChange={e => setAddModalData({...addModalData, nameRu: e.target.value})} />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">Раздел / Секция (Category)</label>
 <select className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.category} onChange={e => setAddModalData({...addModalData, category: e.target.value as any})}>
 <option value="higher_state">I. Высшие — Государственные университеты</option>
 <option value="higher_private">I. Высшие — Частные университеты</option>
 <option value="private_school">II. Частные школы и академии моды</option>
 <option value="other">Другие курсы / заведения</option>
 </select>
 </div>
 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">Порядковый номер (Order №)</label>
 <input type="number" className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.number} onChange={e => setAddModalData({...addModalData, number: Number(e.target.value)})} />
 </div>
 </div>

 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">Бейдж / Автор / Метка (Badge)</label>
 <input type="text" placeholder="например: Əli Əliyev Əli, С 2016 года..." className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.badge} onChange={e => setAddModalData({...addModalData, badge: e.target.value})} />
 </div>

 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">Факультеты / Направления (1 на строку)</label>
 <textarea placeholder="Факультет дизайна&#10;Кафедра Fashion Design..." className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent h-28 resize-y"
 value={addModalData.facultiesStr} onChange={e => setAddModalData({...addModalData, facultiesStr: e.target.value})} />
 </div>

 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">Описание / Детали (Description)</label>
 <textarea placeholder="Краткое описание..." className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent h-24 resize-y"
 value={addModalData.details} onChange={e => setAddModalData({...addModalData, details: e.target.value})} />
 </div>

 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">Заметка / Примечание (Note)</label>
 <input type="text" placeholder="например: Открыт в 2023 году..." className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.note} onChange={e => setAddModalData({...addModalData, note: e.target.value})} />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">Ссылка на сайт (Website URL)</label>
 <input type="text" placeholder="https://..." className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.website} onChange={e => setAddModalData({...addModalData, website: e.target.value})} />
 </div>
 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">Ссылка на картинку (Image URL)</label>
 <input type="text" placeholder="https://..." className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.imageUrl} onChange={e => setAddModalData({...addModalData, imageUrl: e.target.value})} />
 </div>
 </div>
 </>
 )}

 {addModalType === 'agencies' && (
 <div className="space-y-4">
 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">
 Локация (Location)
 </label>
 <input 
 type="text" 
 placeholder="например: Баку, Азербайджан..."
 className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.location} 
 onChange={e => setAddModalData({...addModalData, location: e.target.value})} 
 />
 </div>

 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">
 Описание агентства (Agency Description)
 </label>
 <textarea 
 rows={4}
 placeholder="Введите подробное описание модельного агентства..."
 className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent text-sm"
 value={addModalData.bio} 
 onChange={e => setAddModalData({...addModalData, bio: e.target.value})} 
 />
 </div>

 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">
 Специализации / Focus (через запятую)
 </label>
 <input 
 type="text" 
 placeholder="например: Fashion Shows, Runway, Scouting, Commercials"
 className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.program} 
 onChange={e => setAddModalData({...addModalData, program: e.target.value})} 
 />
 </div>

 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">
 Ссылка на изображение (Image URL)
 </label>
 <input 
 type="text" 
 placeholder="https://images.unsplash.com/..."
 className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.imageUrl} 
 onChange={e => setAddModalData({...addModalData, imageUrl: e.target.value})} 
 />
 </div>

 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">
 Instagram URL
 </label>
 <input 
 type="text" 
 placeholder="https://instagram.com/..."
 className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.instagram} 
 onChange={e => setAddModalData({...addModalData, instagram: e.target.value})} 
 />
 </div>

 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">
 Официальный сайт (Website URL)
 </label>
 <input 
 type="text" 
 placeholder="https://..."
 className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.website} 
 onChange={e => setAddModalData({...addModalData, website: e.target.value})} 
 />
 </div>
 </div>
 )}

 {addModalType === 'news' && (
          <>
            {/* Media Manager for up to 35 photos & 5 videos with layout control */}
            <NewsEditorMediaManager
              images={addModalData.images || []}
              videos={addModalData.videos || []}
              coverImageUrl={addModalData.imageUrl}
              mediaLayout={addModalData.mediaLayout || 'hero_carousel'}
              onUpdateImages={(updatedImages) => {
                const cover = updatedImages.find(i => i.isCover)?.url || updatedImages[0]?.url || '';
                setAddModalData(prev => ({
                  ...prev,
                  images: updatedImages,
                  imageUrl: cover || prev.imageUrl
                }));
              }}
              onUpdateVideos={(updatedVideos) => {
                const mainVid = updatedVideos[0]?.url || '';
                setAddModalData(prev => ({
                  ...prev,
                  videos: updatedVideos,
                  videoUrl: mainVid || prev.videoUrl
                }));
              }}
              onSetCoverImage={(coverUrl) => {
                setAddModalData(prev => ({
                  ...prev,
                  imageUrl: coverUrl
                }));
              }}
              onChangeMediaLayout={(layout) => {
                setAddModalData(prev => ({
                  ...prev,
                  mediaLayout: layout
                }));
              }}
              onInsertIntoEditor={(htmlSnippet) => {
                setAddModalData(prev => ({
                  ...prev,
                  bio: (prev.bio || '') + htmlSnippet
                }));
              }}
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block">
                  Текст новости и верстка статьи
                </label>
                <span className="font-mono text-[11px] text-brand-dark/60">
                  Поддерживает форматирование, заголовки, списки, цитаты и врезки фото
                </span>
              </div>

              <div className="bg-white border-2 border-brand-dark mb-4 group-focus-within:border-brand-accent min-h-[320px] mb-8">
                <ReactQuill 
                  theme="snow"
                  value={addModalData.bio} 
                  onChange={val => setAddModalData({...addModalData, bio: val})}
                  className="font-sans text-brand-dark h-full pb-10"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                      [{ 'align': [] }],
                      [{'list': 'ordered'}, {'list': 'bullet'}],
                      ['link', 'image', 'video'],
                      ['clean']
                    ]
                  }}
                />
              </div>
            </div>
          </>
        )}

 {addModalType === 'sponsors' && (
 <>
 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">Website</label>
 <input type="text" className="w-full bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.website} onChange={e => setAddModalData({...addModalData, website: e.target.value})} />
 </div>
 <div>
 <label className="text-sm uppercase tracking-widest text-brand-dark font-bold block mb-2">Logo URL</label>
 <div className="flex gap-4 items-center">
 <input type="url" placeholder="Image URL..." className="flex-1 bg-brand-light border-2 border-brand-dark p-3 font-bold focus:outline-none focus:border-brand-accent"
 value={addModalData.imageUrl} onChange={e => setAddModalData({...addModalData, imageUrl: e.target.value})} />
 <span className="font-bold uppercase tracking-widest text-brand-dark/50 text-xs text-center">OR</span>
 <label className="cursor-pointer bg-brand-dark text-brand-light font-bold uppercase tracking-widest px-4 py-3 border-2 border-brand-dark hover:bg-brand-accent transition-colors">
 Upload
 <input type="file" accept="image/*" className="hidden" onChange={async e => {
 if (e.target.files && e.target.files[0]) {
 const url = await handleFileUpload(e.target.files[0]);
 if(url) setAddModalData({...addModalData, imageUrl: url});
 }
 }} />
 </label>
 </div>
 {addModalData.imageUrl && (
 <div className="mt-4 h-16 w-32 border-2 border-brand-dark overflow-hidden bg-brand-muted shrink-0 p-2">
 <img src={addModalData.imageUrl} alt="Preview" className="w-full h-full object-contain" />
 </div>
 )}
 </div>
 </>
 )}
 </div>
 
 <div className="flex gap-4">
 <button type="submit" className="flex-1 bg-brand-dark hover:bg-brand-accent text-white font-semibold uppercase tracking-wider text-xs py-3 rounded-full transition-colors shadow-2xs cursor-pointer">
 {addModalEditingId ? 'Save' : 'Add'}
 </button>
 <button type="button" onClick={() => { setAddModalType(null); setAddModalEditingId(null); }} className="flex-1 border border-brand-dark/[0.15] bg-white hover:bg-brand-muted text-brand-dark font-semibold uppercase tracking-wider text-xs py-3 rounded-full transition-colors shadow-2xs cursor-pointer">
 Cancel
 </button>
 </div>
 </form>
 </div>
 )}

 {/* SUBSCRIPTION ASSIGNMENT MODAL */}
 {subModalUser && (
        <div className="fixed inset-0 bg-brand-dark/75 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <form onSubmit={handleSaveSubscription} className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 border-b border-brand-dark/[0.08] pb-4">
              <div>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                  Tier Privileges
                </span>
                <h3 className="text-xl font-serif font-normal tracking-tight text-brand-dark mt-1 flex items-center gap-2">
                  <Crown size={18} className="text-brand-accent" /> Assign Subscription
                </h3>
                <p className="text-xs text-brand-dark/60 font-mono mt-0.5">{subModalUser.name || subModalUser.email}</p>
              </div>
              <button type="button" onClick={() => setSubModalUser(null)} className="w-8 h-8 rounded-full border border-brand-dark/10 hover:bg-brand-dark hover:text-white flex items-center justify-center transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">Select Tier</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['free', 'basic', 'pro', 'vip'] as const).map(tier => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setSubTier(tier)}
                      className={`py-2 px-3 rounded-xl border text-xs font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                        subTier === tier 
                          ? 'bg-brand-dark text-white border-brand-dark shadow-2xs' 
                          : 'bg-brand-muted/20 border-brand-dark/[0.1] text-brand-dark/70 hover:bg-brand-muted/50'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">Validity Duration</label>
                <select
                  value={subDuration}
                  onChange={e => setSubDuration(e.target.value as any)}
                  className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 text-xs font-mono font-medium text-brand-dark focus:outline-none focus:bg-white focus:border-brand-accent transition-all cursor-pointer"
                >
                  <option value="1m">1 Month (+30 days)</option>
                  <option value="3m">3 Months (+90 days)</option>
                  <option value="6m">6 Months (+180 days)</option>
                  <option value="1y">1 Year (+365 days)</option>
                  <option value="lifetime">Lifetime Access</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={subModalSaving}
                className="flex-1 bg-brand-dark hover:bg-brand-accent text-white font-semibold uppercase tracking-wider text-xs py-3 rounded-full transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {subModalSaving ? 'Saving...' : 'Apply Subscription'}
              </button>
              <button
                type="button"
                onClick={() => setSubModalUser(null)}
                className="flex-1 border border-brand-dark/[0.15] bg-white hover:bg-brand-muted text-brand-dark font-semibold uppercase tracking-wider text-xs py-3 rounded-full transition-colors shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {brandModalUser && (
        <div className="fixed inset-0 bg-brand-dark/75 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <form onSubmit={handleSaveBrandLink} className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 border-b border-brand-dark/[0.08] pb-4">
              <div>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                  Designer Link
                </span>
                <h3 className="text-xl font-serif font-normal tracking-tight text-brand-dark mt-1 flex items-center gap-2">
                  <Link2 size={18} className="text-brand-accent" /> Connect Brand to Designer
                </h3>
                <p className="text-xs text-brand-dark/60 font-mono mt-0.5">User: {brandModalUser.name || brandModalUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBrandModalUser(null);
                  setBrandSearchQuery('');
                }}
                className="w-8 h-8 rounded-full border border-brand-dark/10 hover:bg-brand-dark hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">
                  Select Registered Designer Brand ({designers.length})
                </label>
                <input
                  type="text"
                  placeholder="Filter brands..."
                  value={brandSearchQuery}
                  onChange={e => setBrandSearchQuery(e.target.value)}
                  className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2 text-xs font-mono text-brand-dark focus:outline-none focus:bg-white focus:border-brand-accent mb-2"
                />
                <div className="max-h-40 overflow-y-auto border border-brand-dark/[0.1] rounded-xl divide-y divide-brand-dark/[0.06] bg-white">
                  {designers
                    .filter(d => !brandSearchQuery || d.name.toLowerCase().includes(brandSearchQuery.toLowerCase()))
                    .map(d => (
                      <div
                        key={d.id}
                        onClick={() => {
                          setSelectedBrandDesignerId(d.id);
                          setCustomBrandInput('');
                        }}
                        className={`p-2.5 text-xs font-medium cursor-pointer transition-colors flex items-center justify-between ${
                          selectedBrandDesignerId === d.id
                            ? 'bg-brand-dark text-white'
                            : 'hover:bg-brand-muted/40 text-brand-dark'
                        }`}
                      >
                        <span className="font-serif font-medium">{d.name}</span>
                        {selectedBrandDesignerId === d.id && <Check size={13} />}
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">
                  Or Enter Custom Brand Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maison de Couture"
                  value={customBrandInput}
                  onChange={e => {
                    setCustomBrandInput(e.target.value);
                    if (e.target.value) setSelectedBrandDesignerId('');
                  }}
                  className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 text-xs font-medium text-brand-dark focus:outline-none focus:bg-white focus:border-brand-accent"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={brandModalSaving}
                className="flex-1 bg-brand-dark hover:bg-brand-accent text-white font-semibold uppercase tracking-wider text-xs py-3 rounded-full transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {brandModalSaving ? 'Linking...' : 'Link Brand'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBrandModalUser(null);
                  setBrandSearchQuery('');
                }}
                className="flex-1 border border-brand-dark/[0.15] bg-white hover:bg-brand-muted text-brand-dark font-semibold uppercase tracking-wider text-xs py-3 rounded-full transition-colors shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PRE-ASSIGN ROLE MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-brand-dark/75 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <form onSubmit={handleInviteAdmin} className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 border-b border-brand-dark/[0.08] pb-4">
              <div>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                  Access Management
                </span>
                <h3 className="text-xl font-serif font-normal tracking-tight text-brand-dark mt-1">Pre-Assign User Role</h3>
              </div>
              <button type="button" onClick={() => setShowInviteModal(false)} className="w-8 h-8 rounded-full border border-brand-dark/10 hover:bg-brand-dark hover:text-white flex items-center justify-center transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">User Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="editor@baku-fashion-week.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 font-mono text-xs text-brand-dark focus:outline-none focus:bg-white focus:border-brand-accent transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 font-mono text-xs text-brand-dark focus:outline-none focus:bg-white focus:border-brand-accent transition-all cursor-pointer"
                >
                  <option value="admin">Admin (Full Access)</option>
                  <option value="news_editor">News Editor</option>
                  <option value="content_editor">Content Editor</option>
                  <option value="ticket_editor">Ticket Editor</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-brand-dark hover:bg-brand-accent text-white font-semibold uppercase tracking-wider text-xs py-3 rounded-full transition-colors shadow-2xs cursor-pointer">
                Assign Role
              </button>
              <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 border border-brand-dark/[0.15] bg-white hover:bg-brand-muted text-brand-dark font-semibold uppercase tracking-wider text-xs py-3 rounded-full transition-colors shadow-2xs cursor-pointer">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Fashion Center Leader Edit/Add Modal */}
      {showLeaderModal && (
        <div className="fixed inset-0 bg-brand-dark/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <form 
            onSubmit={handleSaveLeaderForm}
            className="bg-white rounded-3xl border border-brand-dark/[0.1] max-w-2xl w-full p-6 sm:p-8 shadow-xl my-8 relative max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-brand-dark/[0.08]">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-accent">
                  AFDC DIRECTION BOARD
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-normal text-brand-dark">
                  {editingLeaderIndex !== null ? 'Редактировать руководителя' : 'Добавить руководителя'}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowLeaderModal(false)}
                className="w-8 h-8 rounded-full border border-brand-dark/15 hover:bg-brand-dark hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 text-left mb-6">
              {/* Photo & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">
                    ФИО Руководителя *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={leaderForm.name} 
                    onChange={e => setLeaderForm({...leaderForm, name: e.target.value})} 
                    placeholder="Əli Əliyev Əli"
                    className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 font-medium text-xs text-brand-dark focus:outline-none focus:bg-white focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">
                    Рабочий Email (Опционально)
                  </label>
                  <input 
                    type="email" 
                    value={leaderForm.email || ''} 
                    onChange={e => setLeaderForm({...leaderForm, email: e.target.value})} 
                    placeholder="direction@fashiondevelopment.az"
                    className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2.5 font-medium text-xs font-mono text-brand-dark focus:outline-none focus:bg-white focus:border-brand-accent"
                  />
                </div>
              </div>

              {/* Photo Upload & Preview */}
              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 block mb-1.5">
                  Фотография руководителя
                </label>
                <div className="flex items-center gap-4">
                  <img 
                    src={leaderForm.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'} 
                    alt="Preview" 
                    className="w-14 h-14 rounded-2xl object-cover border border-brand-dark/15 shrink-0 bg-white"
                  />
                  <div className="flex-1 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <input 
                      type="url" 
                      value={leaderForm.photoUrl} 
                      onChange={e => setLeaderForm({...leaderForm, photoUrl: e.target.value})} 
                      placeholder="https://... или загрузите файл"
                      className="flex-1 bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-2 text-xs font-mono text-brand-dark focus:outline-none focus:bg-white focus:border-brand-accent"
                    />
                    <label className="cursor-pointer bg-brand-dark hover:bg-brand-accent text-white px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-colors shrink-0 flex items-center justify-center gap-1.5">
                      <Upload size={13} />
                      <span>{uploadingLeaderPhoto ? 'Загрузка...' : 'Загрузить фото'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        disabled={uploadingLeaderPhoto}
                        onChange={handleLeaderPhotoUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Roles in 3 languages */}
              <div className="border border-brand-dark/[0.08] rounded-2xl p-4 bg-brand-muted/20 space-y-3">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark/80 block">
                  Должность на 3 языках (AZ, RU, EN)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-brand-dark/60 block mb-1">
                      Azərbaycan dili (AZ)
                    </label>
                    <input 
                      type="text" 
                      value={leaderForm.roleAz} 
                      onChange={e => setLeaderForm({...leaderForm, roleAz: e.target.value})} 
                      placeholder="Mərkəzin Rəhbəri & Baş Direktor"
                      className="w-full bg-white border border-brand-dark/[0.12] rounded-lg px-3 py-1.5 text-xs text-brand-dark focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-brand-dark/60 block mb-1">
                      Русский язык (RU)
                    </label>
                    <input 
                      type="text" 
                      value={leaderForm.roleRu} 
                      onChange={e => setLeaderForm({...leaderForm, roleRu: e.target.value})} 
                      placeholder="Руководитель Центра & Гендиректор"
                      className="w-full bg-white border border-brand-dark/[0.12] rounded-lg px-3 py-1.5 text-xs text-brand-dark focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-brand-dark/60 block mb-1">
                      English (EN)
                    </label>
                    <input 
                      type="text" 
                      value={leaderForm.roleEn} 
                      onChange={e => setLeaderForm({...leaderForm, roleEn: e.target.value})} 
                      placeholder="Managing Director & Head"
                      className="w-full bg-white border border-brand-dark/[0.12] rounded-lg px-3 py-1.5 text-xs text-brand-dark focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Bios in 3 languages */}
              <div className="border border-brand-dark/[0.08] rounded-2xl p-4 bg-brand-muted/20 space-y-3">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark/80 block">
                  Биография / Достижения на 3 языках (AZ, RU, EN)
                </span>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-brand-dark/60 block mb-1">
                      Биография (AZ)
                    </label>
                    <textarea 
                      rows={2}
                      value={leaderForm.bioAz} 
                      onChange={e => setLeaderForm({...leaderForm, bioAz: e.target.value})} 
                      placeholder="Azərbaycan dəb sənayesinin beynəlxalq səviyyədə təmsil olunması..."
                      className="w-full bg-white border border-brand-dark/[0.12] rounded-lg p-2.5 text-xs text-brand-dark focus:outline-none focus:border-brand-accent resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-brand-dark/60 block mb-1">
                      Биография (RU)
                    </label>
                    <textarea 
                      rows={2}
                      value={leaderForm.bioRu} 
                      onChange={e => setLeaderForm({...leaderForm, bioRu: e.target.value})} 
                      placeholder="Эксперт с опытом развития модной индустрии..."
                      className="w-full bg-white border border-brand-dark/[0.12] rounded-lg p-2.5 text-xs text-brand-dark focus:outline-none focus:border-brand-accent resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-brand-dark/60 block mb-1">
                      Биография (EN)
                    </label>
                    <textarea 
                      rows={2}
                      value={leaderForm.bioEn} 
                      onChange={e => setLeaderForm({...leaderForm, bioEn: e.target.value})} 
                      placeholder="Expert with years of experience spearheading fashion initiatives..."
                      className="w-full bg-white border border-brand-dark/[0.12] rounded-lg p-2.5 text-xs text-brand-dark focus:outline-none focus:border-brand-accent resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-brand-dark/[0.08]">
              <button 
                type="submit" 
                className="flex-1 bg-brand-dark hover:bg-brand-accent text-white font-semibold uppercase tracking-wider text-xs py-3 rounded-full transition-colors shadow-2xs cursor-pointer"
              >
                {editingLeaderIndex !== null ? 'Обновить данные' : 'Добавить руководителя'}
              </button>
              <button 
                type="button" 
                onClick={() => setShowLeaderModal(false)} 
                className="flex-1 border border-brand-dark/[0.15] bg-white hover:bg-brand-muted text-brand-dark font-semibold uppercase tracking-wider text-xs py-3 rounded-full transition-colors shadow-2xs cursor-pointer"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Agency & Designer Document & Photo Zoom Modal */}
      {(agencyZoomImage || designerZoomImage) && (
        <ImageZoomModal
          isOpen={true}
          imageUrl={(agencyZoomImage || designerZoomImage)!.url}
          caption={(agencyZoomImage || designerZoomImage)!.caption}
          onClose={() => { setAgencyZoomImage(null); setDesignerZoomImage(null); }}
        />
      )}

 </div>
    </div>
 );
}

