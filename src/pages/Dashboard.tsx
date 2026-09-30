import LinkedInStyleProfile from "../components/LinkedInStyleProfile";
import AvatarCustomizerModal from "../components/AvatarCustomizerModal";
import ImageZoomModal from "../components/ImageZoomModal";
import GoldenNeedleBadge from "../components/GoldenNeedleBadge";
import ModelVerifiedBadge from "../components/ModelVerifiedBadge";
import AgencyBadge from "../components/AgencyBadge";
import AgencyModelVerificationCard from "../components/AgencyModelVerificationCard";
import AgencyManagementHub from "../components/AgencyManagementHub";
import DesignerManagementHub from "../components/DesignerManagementHub";
import ModelAgencyInvitationCard from "../components/ModelAgencyInvitationCard";
import ModelAgencyPortal from "../components/ModelAgencyPortal";
import { useUI } from '../context/UIContext';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router';
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { getOrCreateConversation } from '../lib/chatService';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { uploadMediaFile } from '../lib/upload';
import { getTimestampMillis } from '../lib/dateUtils';
import { Ticket, Event, GiveawayEntry } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { Briefcase, Menu, X, Edit3, Trash2, Heart, MessageSquare, Dices, Sparkles, ZoomIn, Maximize2, ChevronDown, ChevronUp, User, FileText, Mail, GraduationCap, Award, ExternalLink, HelpCircle, CheckCircle2, Copy, Check, Share2, AtSign, Building2, Crown, Zap, Clock, Bookmark, AlertCircle, Search, Filter, RotateCcw, CheckCheck, ThumbsUp, UserCheck, XCircle, Scissors, Lock, Star, Gift, Trophy, Calendar, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { createNotification } from '../lib/notificationService';

interface PopulatedTicket extends Ticket {
 event?: Event;
}

interface Post {
 id: string;
 userId: string;
 imageUrl: string;
 description?: string;
 likes: number;
 comments: number;
 createdAt?: any;
}

export default function Dashboard() {
 const ui = useUI();
 const navigate = useNavigate();

 const { t } = useTranslation();
 const { currentUser, dbUser } = useAuth();
 const [tickets, setTickets] = useState<PopulatedTicket[]>([]);
 const [giveawayEntries, setGiveawayEntries] = useState<GiveawayEntry[]>([]);
 const [posts, setPosts] = useState<Post[]>([]);
 const [vacancies, setVacancies] = useState<any[]>([]);
 const [applications, setApplications] = useState<Record<string, any[]>>({});
 const [loading, setLoading] = useState(true);
	const [searchParams, setSearchParams] = useSearchParams();
	const tabParam = searchParams.get("tab");
	const [activeTab, setActiveTab] = useState<"tickets" | "portfolio" | "model" | "designer" | "employer" | "agency-models" | "edit-profile" | "feed-activity">("portfolio");
	const [modelBroadcastsCount, setModelBroadcastsCount] = useState<number>(0);
	const [candidateFilter, setCandidateFilter] = useState<Record<string, 'all' | 'pending' | 'approved' | 'postponed' | 'rejected'>>({});
	const [candidateSearch, setCandidateSearch] = useState<Record<string, string>>({});
	const [updatingCandidateId, setUpdatingCandidateId] = useState<string | null>(null);
	const [candidateToDelete, setCandidateToDelete] = useState<{ vacancyId: string; vacancyTitle: string; app: any } | null>(null);

	const handleUpdateCandidateStatus = async (
		vacancyId: string, 
		app: any, 
		newStatus: 'approved' | 'postponed' | 'rejected' | 'pending', 
		vacancyTitle: string
	) => {
		if (!currentUser) return;
		setUpdatingCandidateId(app.id);
		try {
			await updateDoc(doc(db, 'jobApplications', app.id), {
				status: newStatus,
				updatedAt: Date.now()
			});

			setApplications(prev => ({
				...prev,
				[vacancyId]: (prev[vacancyId] || []).map(a => a.id === app.id ? { ...a, status: newStatus } : a)
			}));

			// Send notification to candidate if registered user
			if (app.userId && app.userId !== currentUser.uid) {
				let notifTitle = '';
				let notifMessage = '';
				if (newStatus === 'approved') {
					notifTitle = t('notif_app_approved_title', 'Кандидатура одобрена!');
					notifMessage = t('notif_app_approved_msg', `Работодатель одобрил вашу заявку на вакансию "${vacancyTitle}".`);
				} else if (newStatus === 'postponed') {
					notifTitle = t('notif_app_postponed_title', 'Заявка отложена для рассмотрения');
					notifMessage = t('notif_app_postponed_msg', `Ваша заявка на вакансию "${vacancyTitle}" отложена для дальнейшего рассмотрения.`);
				} else if (newStatus === 'rejected') {
					notifTitle = t('notif_app_rejected_title', 'Статус заявки обновлен');
					notifMessage = t('notif_app_rejected_msg', `Статус вашей заявки на вакансию "${vacancyTitle}" был изменен.`);
				}

				if (notifTitle) {
					await createNotification({
						userId: app.userId,
						type: 'job_status',
						fromUserId: currentUser.uid,
						fromUserName: dbUser?.name || 'Работодатель',
						fromUserAvatar: dbUser?.avatarUrl || '',
						title: notifTitle,
						message: notifMessage,
						link: '/careers',
						targetId: app.id,
						metadata: { jobId: vacancyId, status: newStatus }
					});
				}
			}

			if (newStatus === 'approved') {
				toast.success(t('candidate_approved_toast', 'Кандидат успешно одобрен!'));
			} else if (newStatus === 'postponed') {
				toast.info(t('candidate_postponed_toast', 'Кандидат отложен для дальнейшего рассмотрения'));
			} else if (newStatus === 'rejected') {
				toast.info(t('candidate_rejected_toast', 'Отклик кандидата отклонен'));
			} else {
				toast.success(t('candidate_status_updated', 'Статус кандидата обновлен'));
			}
		} catch (error: any) {
			console.error('Error updating candidate status:', error);
			toast.error(error.message || 'Ошибка обновления статуса');
		} finally {
			setUpdatingCandidateId(null);
		}
	};

	const handleConfirmDeleteCandidate = async () => {
		if (!candidateToDelete) return;
		const { vacancyId, app } = candidateToDelete;
		setUpdatingCandidateId(app.id);
		try {
			await deleteDoc(doc(db, 'jobApplications', app.id));
			setApplications(prev => ({
				...prev,
				[vacancyId]: (prev[vacancyId] || []).filter(a => a.id !== app.id)
			}));
			toast.success(t('candidate_deleted_toast', 'Анкета кандидата удалена'));
			setCandidateToDelete(null);
		} catch (error: any) {
			console.error('Error deleting candidate:', error);
			toast.error(error.message || 'Ошибка удаления кандидата');
		} finally {
			setUpdatingCandidateId(null);
		}
	};

	useEffect(() => {
		if (tabParam === 'notifications') {
			navigate('/notifications', { replace: true });
			return;
		}
		if (tabParam && ["tickets", "portfolio", "model", "designer", "employer", "agency-models", "edit-profile", "feed-activity"].includes(tabParam)) {
			setActiveTab(tabParam as any);
		}
	}, [tabParam, navigate]);

	useEffect(() => {
		if (!currentUser) return;
		const agencyName = dbUser?.modelAgencyName || dbUser?.modelVerifiedByAgency;
		if (!agencyName) {
			setModelBroadcastsCount(0);
			return;
		}
		const qB = query(collection(db, "agency_broadcasts"), orderBy("createdAt", "desc"));
		const unsub = onSnapshot(qB, (snap) => {
			const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
			const relevant = list.filter(b => {
				const matchesAgency = agencyName && b.agencyName && b.agencyName.trim().toLowerCase() === agencyName.trim().toLowerCase();
				const isRecipient = b.recipientUserIds && b.recipientUserIds.includes(currentUser.uid);
				return matchesAgency || isRecipient;
			});
			setModelBroadcastsCount(relevant.length);
		}, () => {
			setModelBroadcastsCount(0);
		});
		return () => unsub();
	}, [currentUser?.uid, dbUser?.modelAgencyName, dbUser?.modelVerifiedByAgency]);
 const fileInputRef = useRef<HTMLInputElement>(null);

 const [feedPosts, setFeedPosts] = useState<any[]>([]);
 const [feedComments, setFeedComments] = useState<any[]>([]);

 const handleContactApplicant = async (app: any) => {
 if (!currentUser) return;
 try {
 const convId = await getOrCreateConversation(
 {
 uid: currentUser.uid,
 displayName: dbUser?.name || currentUser.displayName || 'Employer',
 email: currentUser.email,
 photoURL: dbUser?.avatarUrl || currentUser.photoURL,
 role: dbUser?.role || 'user'
 },
 {
 id: app.userId,
 name: app.name || 'Applicant',
 email: app.email || '',
 avatarUrl: app.profileData?.generalInfo?.avatarUrl || '',
 role: 'user',
 headline: app.profileData?.generalInfo?.headline || `Applicant for opportunity`
 }
 );
 navigate(`/messages?conversationId=${convId}`);
 } catch (error) {
 console.error('Error starting direct chat with applicant:', error);
 navigate(`/messages?userId=${app.userId}&name=${encodeURIComponent(app.name || 'Applicant')}`);
 }
 };

 useEffect(() => {
 if (!currentUser) return;
 
 // fetch feedPosts for the user
 const qFeedPosts = query(collection(db, 'feedPosts'), where('userId', '==', currentUser.uid));
 const unsubscribeFeedPosts = onSnapshot(qFeedPosts, (snapshot) => {
 const fd = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
 fd.sort((a,b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
 setFeedPosts(fd);
 }, (error) => {
 console.error("Dashboard feedPosts snapshot error", error);
 });

 const qFeedCom = query(collection(db, 'feedComments'), where('userId', '==', currentUser.uid));
 const unsubscribeFeedCom = onSnapshot(qFeedCom, (snapshot) => {
 const cd = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
 cd.sort((a,b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
 setFeedComments(cd);
 }, (error) => {
 console.error("Dashboard feedCom snapshot error", error);
 });

 return () => {
 unsubscribeFeedPosts();
 unsubscribeFeedCom();
 };
 }, [currentUser]);

 const [profileForm, setProfileForm] = useState({
 name: '', industry: '', degree: '', interestLevel: '', ageGroup: '', primaryGoal: '', avatarUrl: '', bio: '', links: ''
 });
 const [updatingProfile, setUpdatingProfile] = useState(false);
 const [selectedPost, setSelectedPost] = useState<Post | null>(null);
 const [postDescription, setPostDescription] = useState('');
 const [isEditingPost, setIsEditingPost] = useState(false);
 const [isPostMenuOpen, setIsPostMenuOpen] = useState(false);
 const [showAvatarModal, setShowAvatarModal] = useState(false);
 const [copiedLink, setCopiedLink] = useState(false);
 const [zoomImage, setZoomImage] = useState<{ url: string; caption?: string } | null>(null);
 const [expandedApplicants, setExpandedApplicants] = useState<Record<string, boolean>>({});

 const toggleApplicant = (appId: string) => {
 setExpandedApplicants(prev => ({ ...prev, [appId]: !prev[appId] }));
 };

 useEffect(() => {
 if (dbUser) {
 setProfileForm({
 name: dbUser.name || '',
 industry: dbUser.industry || '',
 degree: dbUser.degree || '',
 interestLevel: dbUser.interestLevel || '',
 ageGroup: dbUser.ageGroup || '',
 primaryGoal: dbUser.primaryGoal || '',
 avatarUrl: dbUser.avatarUrl || '',
 bio: dbUser.bio || '',
 links: dbUser.links || ''
 });
 }
 }, [dbUser]);

 useEffect(() => {
 if (!currentUser) return;

 // 1. Real-time Subscription for User Tickets
 const qTickets = query(collection(db, 'tickets'), where('userId', '==', currentUser.uid));
 const unsubTickets = onSnapshot(qTickets, async (snapshots) => {
 const tickData: PopulatedTicket[] = [];
 for (const d of snapshots.docs) {
 const tData = { id: d.id, ...d.data() } as Ticket;
 try {
 const evDoc = await getDoc(doc(db, 'events', tData.eventId));
 if (evDoc.exists()) {
 tickData.push({ ...tData, event: { id: evDoc.id, ...evDoc.data() } as Event });
 } else {
 tickData.push({ ...tData });
 }
 } catch (e) {
 tickData.push({ ...tData });
 }
 }
 tickData.sort((a, b) => (b.purchaseDate || 0) - (a.purchaseDate || 0));
 setTickets(tickData);
 }, (err) => {
 console.warn('Failed to listen to tickets:', err);
 });

 // 2. Real-time Subscription for Giveaway Entries
 const qGiveaways = query(collection(db, 'giveaway_entries'), where('userId', '==', currentUser.uid));
 const unsubGiveaways = onSnapshot(qGiveaways, (snapshots) => {
 const gData = snapshots.docs.map(d => ({ id: d.id, ...d.data() } as GiveawayEntry));
 gData.sort((a, b) => (b.enteredAt || 0) - (a.enteredAt || 0));
 setGiveawayEntries(gData);
 }, (err) => {
 console.warn('Failed to listen to giveaway entries:', err);
 });

 const fetchData = async () => {
 try {
 setLoading(true);

 // Fetch Posts
 const pQ = query(collection(db, 'posts'), where('userId', '==', currentUser.uid));
 const pSnapshots = await getDocs(pQ);
 const pData: Post[] = pSnapshots.docs.map(d => ({ id: d.id, ...d.data() } as Post));
 pData.sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
 setPosts(pData);

 // Fetch Vacancies
 let vQ;
 if (dbUser.role === 'admin' || dbUser.role === 'superadmin') {
 vQ = query(collection(db, 'vacancies'));
 } else {
 vQ = query(collection(db, 'vacancies'), where('employerId', '==', currentUser.uid));
 }
 let vSnapshots: any = { docs: [] };
 try {
 vSnapshots = await getDocs(vQ);
 } catch (e) {
 console.error("Failed to fetch vacancies:", e);
 }
 const vData = vSnapshots.docs.map((d: any) => ({ id: d.id, ...d.data() }));
 setVacancies(vData);

 // Fetch Applications for these vacancies
 if (vData.length > 0) {
 const allApps: Record<string, any[]> = {};
 for (const v of vData) {
 let aQ;
 if (dbUser.role === 'admin' || dbUser.role === 'superadmin') {
 aQ = query(collection(db, 'jobApplications'), where('jobId', '==', v.id));
 } else {
 aQ = query(collection(db, 'jobApplications'), where('employerId', '==', currentUser.uid), where('jobId', '==', v.id));
 }
 let aSnap: any = { docs: [] };
 try {
 aSnap = await getDocs(aQ);
 } catch (e) {
 console.error("Failed to fetch applications:", e);
 }
 
 const applicantsData = await Promise.all(aSnap.docs.map(async (docSnap: any) => {
 const appData = { id: docSnap.id, ...docSnap.data() } as any;
 
 // Fetch Applicant's profile/posts to show to employer
 const pQuery = query(collection(db, 'posts'), where('userId', '==', appData.userId));
 try {
 const uPostsSnap = await getDocs(pQuery);
 appData.portfolioPosts = uPostsSnap.docs.map(p => ({ id: p.id, ...p.data() }));
 } catch (e) {
 appData.portfolioPosts = [];
 }
 return appData;
 }));
 allApps[v.id] = applicantsData;
 }
 setApplications(allApps);
 }

 } catch (err) {
 console.error(err);
 } finally {
 setLoading(false);
 }
 };
 fetchData();

 return () => {
 unsubTickets();
 unsubGiveaways();
 };
 }, [currentUser]);

 
 const handleImageUpload = async (file: File): Promise<string | null> => {
 if (file.size > 15 * 1024 * 1024) {
 ui.alert('Image too large (Max 15MB)');
 return null;
 }
 setLoading(true);
 try {
 const url = await uploadMediaFile(file);
 return url;
 } catch (err: any) {
 console.error('Upload error:', err);
 ui.alert(err.message || 'Failed to upload image');
 return null;
 } finally {
 setLoading(false);
 }
 };

 const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 if (!e.target.files || !e.target.files[0] || !currentUser) return;
 const file = e.target.files[0];
 const url = await handleImageUpload(file);
 if (!url) return;
 try {
 const newPostRef = await addDoc(collection(db, 'posts'), {
 userId: currentUser.uid,
 imageUrl: url,
 likes: 0,
 comments: 0,
 createdAt: serverTimestamp()
 });
 const newPost = {
 id: newPostRef.id,
 userId: currentUser.uid,
 imageUrl: url,
 likes: 0,
 comments: 0,
 createdAt: serverTimestamp()
 };
 setPosts(prev => [newPost, ...prev]);
 } catch (err) {
 handleFirestoreError(err, OperationType.CREATE, 'posts');
 }
 };

 const handleUpdateProfile = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!currentUser || !dbUser) return;
 
 setUpdatingProfile(true);
 try {
 await updateDoc(doc(db, 'users', currentUser.uid), {
 ...profileForm,
 lastProfileUpdate: Date.now()
 });
 ui.alert('Profile updated successfully!');
 setActiveTab('portfolio');
 } catch (err) {
 handleFirestoreError(err, OperationType.UPDATE, 'users');
 } finally {
 setUpdatingProfile(false);
 }
 };

 const handleUpdatePost = async () => {
 if (!selectedPost) return;
 try {
 await updateDoc(doc(db, 'posts', selectedPost.id), {
 description: postDescription
 });
 setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, description: postDescription } : p));
 setSelectedPost(prev => prev ? { ...prev, description: postDescription } : null);
 setIsEditingPost(false);
 setIsPostMenuOpen(false);
 ui.alert(t('post_updated_alert', 'Post description updated!'));
 } catch (err) {
 handleFirestoreError(err, OperationType.UPDATE, 'posts');
 }
 };

 const handleDeletePost = async (postId: string) => {
 if (!await ui.confirm(t('confirm_delete_post', 'Are you sure you want to delete this post?'))) return;
 try {
 await deleteDoc(doc(db, 'posts', postId));
 setPosts(prev => prev.filter(p => p.id !== postId));
 setSelectedPost(null);
 } catch (err) {
 handleFirestoreError(err, OperationType.DELETE, 'posts');
 }
 };

 if (loading) return (
 <div className="flex justify-center p-20">
 <div className="w-8 h-8 rounded-full border-2 border-brand-accent border-t-transparent animate-spin"></div>
 </div>
 );

 return (
 <div className="animate-in fade-in duration-700 min-h-screen bg-brand-light text-brand-dark overflow-x-hidden">
 {/* 2. MAIN DOSSIER & WORKSPACE CONTAINER */}
 <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-10 space-y-8">
 {/* Profile Card (Editorial Luxury Atelier Card) */}
 <div className="rounded-3xl border border-brand-dark/[0.08] bg-white p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
 {/* Avatar with luxury ring */}
	<div className="relative group shrink-0">
		<div 
			onClick={() => setActiveTab('edit-profile')}
			title="Click to edit profile"
			className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full p-1 border-2 border-brand-dark/15 group-hover:border-brand-accent transition-all cursor-pointer overflow-hidden bg-brand-muted/40 shadow-xs"
		>
			<img 
				src={dbUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.uid}`} 
				alt="Profile" 
				className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-300"
				crossOrigin="anonymous"
			/>
		</div>
	</div>

 <div className="flex flex-col flex-grow items-center md:items-start text-center md:text-left min-w-0 max-w-full">
 {/* Name + Badges + Handle */}
 <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mb-2">
 <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-brand-dark flex items-center gap-2 break-words">
 <span className="break-words">{dbUser?.name || currentUser?.email?.split('@')[0] || 'user'}</span>
 {dbUser?.hasGoldenNeedle && (
 <GoldenNeedleBadge size="lg" />
 )}
 {dbUser?.hasModelBadge && (
 <ModelVerifiedBadge size="lg" showLabel agencyName={dbUser?.modelVerifiedByAgency || dbUser?.modelAgencyName} />
 )}
 {(dbUser?.hasAgencyBadge || dbUser?.isAgency || dbUser?.isAgencyRepresentative) && (
 <AgencyBadge size="lg" showLabel agencyName={dbUser?.representedAgencyName} />
 )}
 </h2>
					<div className="flex items-center gap-2 flex-wrap">
						<span className="inline-flex items-center gap-1 rounded-full bg-brand-light border border-brand-dark/10 font-mono text-xs px-3 py-1 text-brand-dark/80 font-medium">
							{dbUser?.handle || (dbUser?.username ? `@${dbUser.username}` : `@${currentUser?.email?.split('@')[0] || 'user'}`)}
						</span>
						{dbUser?.subscriptionTier === 'elite' || dbUser?.subscriptionTier === 'vip' ? (
							<span className="inline-flex items-center gap-1 rounded-full bg-stone-900 text-amber-300 border border-amber-400/30 px-3 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider shadow-2xs">
								<Crown size={12} className="text-amber-400" /> FFAZ ELITE VIP
							</span>
						) : dbUser?.subscriptionTier === 'pro' || dbUser?.subscriptionTier === 'creator' ? (
							<span className="inline-flex items-center gap-1 rounded-full bg-brand-accent text-white px-3 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider shadow-2xs">
								FFAZ PRO
							</span>
						) : (
							<span className="inline-flex items-center gap-1 rounded-full bg-brand-muted text-brand-dark/70 border border-brand-dark/15 px-3 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider shadow-2xs">
								FFAZ FREE
							</span>
						)}
					</div>
 </div>

 {/* Quick action buttons row */}
 <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-5">
 <button 
 onClick={() => setActiveTab('edit-profile')} 
 className="h-8 px-3.5 rounded-full bg-brand-dark text-white font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5 hover:bg-brand-accent transition-colors shadow-2xs"
 >
 <Edit3 size={12} />
 <span>{t('edit_profile', 'Edit Profile')}</span>
 </button>

 

 <button
 onClick={() => {
 const u = dbUser?.handle?.replace(/^@+/, '') || dbUser?.username || currentUser?.uid || '';
 navigator.clipboard.writeText(`${window.location.origin}/@${u}`);
 setCopiedLink(true);
 setTimeout(() => setCopiedLink(false), 2000);
 }}
 className={`h-8 px-3.5 rounded-full border text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs ${
 copiedLink 
 ? 'bg-brand-accent text-white border-brand-accent' 
 : 'bg-white text-brand-dark border-brand-dark/10 hover:border-brand-accent hover:text-brand-accent'
 }`}
 title="Copy public profile link"
 >
 {copiedLink ? <Check size={12} /> : <Copy size={11} />}
 <span>{copiedLink ? t('copied', 'Copied') : t('copy_link', 'Copy @Link')}</span>
 </button>

 </div>
 
 {/* Stats row */}
 <div className="flex gap-6 sm:gap-10 mb-5 font-semibold text-brand-dark text-xs sm:text-sm">
 <div className="flex flex-col md:flex-row md:gap-1.5 items-center">
 <span className="text-base sm:text-lg font-bold font-mono text-brand-dark">{posts.length}</span> 
 <span className="text-brand-dark/60 uppercase tracking-wider text-[11px]">{t('posts_stat', 'posts')}</span>
 </div>
 <div className="flex flex-col md:flex-row md:gap-1.5 items-center">
 <span className="text-base sm:text-lg font-bold font-mono text-brand-dark">0</span> 
 <span className="text-brand-dark/60 uppercase tracking-wider text-[11px]">{t('followers_stat', 'followers')}</span>
 </div>
 <div className="flex flex-col md:flex-row md:gap-1.5 items-center">
 <span className="text-base sm:text-lg font-bold font-mono text-brand-dark">0</span> 
 <span className="text-brand-dark/60 uppercase tracking-wider text-[11px]">{t('following_stat', 'following')}</span>
 </div>
 </div>
 
 {/* Bio & Details */}
 <div className="text-brand-dark text-center md:text-left max-w-full">
 {dbUser?.industry && (
								<p className="font-semibold text-xs uppercase tracking-wider text-brand-accent mb-1">{dbUser.industry}</p>
							)}
 {dbUser?.bio && (
 <p className="text-xs sm:text-sm text-brand-dark/80 border-l-2 border-brand-accent pl-3 mb-2 max-w-xl whitespace-pre-wrap">{dbUser.bio}</p>
 )}
 {dbUser?.links && (
 <a href={dbUser.links.startsWith('http') ? dbUser.links : `https://${dbUser.links}`} target="_blank" rel="noopener noreferrer" className="text-brand-accent font-medium hover:underline text-xs sm:text-sm break-all inline-flex items-center gap-1">
 <ExternalLink size={12} />
 <span>{dbUser.links}</span>
 </a>
 )}
 </div>
 </div>
 </div>

 {/* Navigation Tabs (Editorial Pill Bar) */}
 <div className="border-b border-brand-dark/[0.08] pb-5 overflow-x-auto scrollbar-hide">
 <div className="inline-flex p-1.5 rounded-full bg-white border border-brand-dark/[0.08] shadow-2xs gap-1.5 min-w-max">
 <button 
 onClick={() => setActiveTab('portfolio')}
 className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs uppercase tracking-wider transition-all ${
 activeTab === 'portfolio' 
 ? 'bg-brand-dark text-white shadow-2xs' 
 : 'text-brand-dark/70 hover:text-brand-dark'
 }`}
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
 <span>{t('tab_portfolio', 'Portfolio')}</span>
 </button>
 <button 
 onClick={() => setActiveTab('tickets')}
 className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs uppercase tracking-wider transition-all ${
 activeTab === 'tickets' 
 ? 'bg-brand-dark text-white shadow-2xs' 
 : 'text-brand-dark/70 hover:text-brand-dark'
 }`}
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
 <span>{t('tab_tickets', 'My Tickets')}</span>
 </button>
 <button 
 onClick={() => setActiveTab('feed-activity')}
 className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs uppercase tracking-wider transition-all ${
 activeTab === 'feed-activity' 
 ? 'bg-brand-dark text-white shadow-2xs' 
 : 'text-brand-dark/70 hover:text-brand-dark'
 }`}
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
 <span>{t('tab_activity', 'Activity')}</span>
 </button>

				

				{/* Model Cabinet Tab - For verified models, models in agencies, or pending invitations */}
				{(Boolean(dbUser?.isModel || dbUser?.hasModelBadge || dbUser?.modelAgencyName || dbUser?.modelVerificationStatus === "pending" || dbUser?.industry === "model") || dbUser?.role === "admin" || dbUser?.role === "superadmin") && (
					<button 
						onClick={() => setActiveTab("model")}
						className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer ${
							activeTab === "model" 
								? "bg-[#7a0000] text-white shadow-2xs" 
								: "text-brand-dark/70 hover:text-brand-dark"
						}`}
					>
						<Sparkles size={14} className={activeTab === "model" ? "text-amber-300" : "text-brand-accent"} />
						<span>Модель</span>
						{dbUser?.hasModelBadge && (
							<span className="text-[10px]" title="Официальная модель">😎</span>
						)}
						{dbUser?.modelVerificationStatus === "pending" && (
							<span className="bg-amber-100 text-amber-800 text-[9px] font-mono px-1.5 py-0.2 rounded-full border border-amber-300">
								Заявка
							</span>
						)}
						{modelBroadcastsCount > 0 && (
							<span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
								activeTab === "model" ? "bg-white/20 text-white" : "bg-brand-muted text-brand-dark"
							}`}>
								{modelBroadcastsCount}
							</span>
						)}
					</button>
				)}

				{/* Designer Cabinet Tab */}
				{(Boolean(dbUser?.isDesigner || dbUser?.hasGoldenNeedle || dbUser?.designerBrandName || dbUser?.designerVerificationStatus || dbUser?.industry === 'fashion_design' || dbUser?.industry === 'designer') || dbUser?.role === 'admin' || dbUser?.role === 'superadmin') && (
					<button 
						onClick={() => setActiveTab('designer')}
						className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer ${
							activeTab === 'designer' 
								? 'bg-[#7a0000] text-white shadow-2xs' 
								: 'text-brand-dark/70 hover:text-brand-dark'
						}`}
					>
						<Scissors size={14} className={activeTab === 'designer' ? 'text-amber-300' : 'text-brand-accent'} />
						<span>Дизайнер</span>
						{dbUser?.hasGoldenNeedle && (
							<span className="text-[10px]" title="Золотая Игла">🪡</span>
						)}
					</button>
				)}

 {/* Agency Models Management Tab - Strictly for modeling agencies */}
 {(Boolean(dbUser?.isAgency || dbUser?.industry === 'agency' || dbUser?.industry === 'agency_rep' || dbUser?.agencyVerificationStatus === 'approved' || dbUser?.agencyVerificationStatus === 'pending') || dbUser?.role === 'admin' || dbUser?.role === 'superadmin') && (
 <button 
 onClick={() => setActiveTab('agency-models')}
 className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs uppercase tracking-wider transition-all ${
 activeTab === 'agency-models' 
 ? 'bg-[#7a0000] text-white shadow-2xs' 
 : 'text-brand-dark/70 hover:text-brand-dark'
 }`}
 >
 <Building2 size={14} />
 <span>Модельное агентство</span>
 {dbUser?.agencyVerificationStatus === 'pending' && (
 <span className="bg-amber-100 text-amber-800 text-[9px] font-mono px-1.5 py-0.2 rounded-full border border-amber-300">
 7 дней
 </span>
 )}
 {dbUser?.agencyVerificationStatus === 'approved' && (
 <span className="bg-emerald-100 text-emerald-800 text-[9px] font-mono px-1.5 py-0.2 rounded-full border border-emerald-300">
 Одобрено
 </span>
 )}
 </button>
 )}

 {(vacancies.length > 0 || dbUser?.role === 'admin' || dbUser?.role === 'superadmin' || dbUser?.subscriptionTier === 'elite' || dbUser?.subscriptionTier === 'business' || dbUser?.hasJobPostingAccess) && (
 <button 
 onClick={() => setActiveTab('employer')}
 className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs uppercase tracking-wider transition-all ${
 activeTab === 'employer' 
 ? 'bg-brand-dark text-white shadow-2xs' 
 : 'text-brand-dark/70 hover:text-brand-dark'
 }`}
 >
 <Briefcase size={14} />
 <span>{t('tab_employer', 'Employer Hub')}</span>
 </button>
 )}
 </div>
 </div>

{activeTab === "model" && dbUser && (
					<div className="max-w-5xl mx-auto">
						<ModelAgencyPortal user={dbUser} />
					</div>
				)}

 {activeTab === 'agency-models' && dbUser && (
 <div className="max-w-5xl mx-auto">
 <AgencyManagementHub user={dbUser} />
 </div>
 )}

 {activeTab === 'designer' && dbUser && (
 <div className="max-w-5xl mx-auto">
 <DesignerManagementHub user={dbUser} />
 </div>
 )}


        {activeTab === 'employer' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-brand-dark/[0.08]">
              <div>
                <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark">
                  {t('my_posted_opps', 'My Posted Opportunities')} / <span className="italic text-brand-accent font-serif">Мои вакансии</span>
                </h2>
                <p className="text-xs text-brand-dark/60 mt-0.5">Управление кандидатами: одобрение, сохранение на рассмотрение и удаление откликов</p>
              </div>
              <span className="text-[11px] font-mono text-brand-accent bg-brand-accent/10 border border-brand-accent/20 px-3 py-1 rounded-full font-semibold uppercase shrink-0">
                {vacancies.length} Opportunities
              </span>
            </div>
            
            {vacancies.map(v => {
              const allAppsForV = applications[v.id] || [];
              const currentFilter = candidateFilter[v.id] || 'all';
              const currentSearch = (candidateSearch[v.id] || '').toLowerCase().trim();

              const approvedCount = allAppsForV.filter(a => a.status === 'approved').length;
              const postponedCount = allAppsForV.filter(a => a.status === 'postponed' || a.status === 'under_review' || a.status === 'shortlisted').length;
              const pendingCount = allAppsForV.filter(a => !a.status || a.status === 'pending').length;
              const rejectedCount = allAppsForV.filter(a => a.status === 'rejected').length;

              const filteredApplicants = allAppsForV.filter(app => {
                // Status filter
                if (currentFilter === 'approved' && app.status !== 'approved') return false;
                if (currentFilter === 'postponed' && !(app.status === 'postponed' || app.status === 'under_review' || app.status === 'shortlisted')) return false;
                if (currentFilter === 'pending' && !(app.status === 'pending' || !app.status)) return false;
                if (currentFilter === 'rejected' && app.status !== 'rejected') return false;

                // Search query filter
                if (currentSearch) {
                  const nameMatch = (app.name || '').toLowerCase().includes(currentSearch);
                  const emailMatch = (app.email || '').toLowerCase().includes(currentSearch);
                  const headlineMatch = (app.profileData?.generalInfo?.headline || '').toLowerCase().includes(currentSearch);
                  const skillsMatch = (app.profileData?.skills || []).some((s: string) => s.toLowerCase().includes(currentSearch));
                  return nameMatch || emailMatch || headlineMatch || skillsMatch;
                }
                return true;
              });

              return (
                <div key={v.id} className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 shadow-xs space-y-6">
                  {/* Vacancy Header Card */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-brand-dark/[0.08]">
                    <div>
                      <span className="inline-block text-[10px] font-mono font-semibold uppercase text-brand-accent bg-brand-accent/5 border border-brand-accent/15 px-2.5 py-0.5 rounded-full mb-2">
                        {v.type}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-brand-dark mb-1">{v.title}</h3>
                      <p className="font-mono text-xs text-brand-dark/60 uppercase tracking-wider">
                        {v.location} • {v.createdAt?.seconds ? new Date(v.createdAt.seconds * 1000).toLocaleDateString() : 'Active'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="bg-brand-dark text-white px-4 py-2 rounded-full font-mono font-semibold text-xs sm:text-sm uppercase tracking-wider shrink-0 shadow-2xs">
                        {allAppsForV.length} {t('applicants_count', 'Applicants')}
                      </div>
                    </div>
                  </div>

                  {/* Candidate Filter Tabs & Search Bar */}
                  {allAppsForV.length > 0 && (
                    <div className="space-y-3 pb-2 border-b border-brand-dark/[0.06]">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Status Filter Pills */}
                        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-brand-muted/40 rounded-2xl border border-brand-dark/[0.06]">
                          <button
                            type="button"
                            onClick={() => setCandidateFilter(prev => ({ ...prev, [v.id]: 'all' }))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                              currentFilter === 'all'
                                ? 'bg-white text-brand-dark shadow-2xs border border-brand-dark/[0.08]'
                                : 'text-brand-dark/60 hover:text-brand-dark'
                            }`}
                          >
                            <span>{t('status_all', 'Все')}</span>
                            <span className="text-[10px] bg-brand-muted px-1.5 py-0.2 rounded-full border border-brand-dark/10">
                              {allAppsForV.length}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCandidateFilter(prev => ({ ...prev, [v.id]: 'approved' }))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                              currentFilter === 'approved'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            <CheckCircle2 size={13} />
                            <span>{t('status_approved', 'Одобрены')}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              currentFilter === 'approved' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {approvedCount}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCandidateFilter(prev => ({ ...prev, [v.id]: 'postponed' }))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                              currentFilter === 'postponed'
                                ? 'bg-amber-600 text-white shadow-2xs'
                                : 'text-amber-800 hover:bg-amber-50'
                            }`}
                          >
                            <Clock size={13} />
                            <span>{t('status_postponed', 'Отложены')}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              currentFilter === 'postponed' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                            }`}>
                              {postponedCount}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCandidateFilter(prev => ({ ...prev, [v.id]: 'pending' }))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                              currentFilter === 'pending'
                                ? 'bg-brand-dark text-white shadow-2xs'
                                : 'text-brand-dark/60 hover:text-brand-dark'
                            }`}
                          >
                            <User size={13} />
                            <span>{t('status_pending', 'Новые')}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              currentFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-brand-muted text-brand-dark/70'
                            }`}>
                              {pendingCount}
                            </span>
                          </button>

                          {rejectedCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setCandidateFilter(prev => ({ ...prev, [v.id]: 'rejected' }))}
                              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                                currentFilter === 'rejected'
                                  ? 'bg-rose-600 text-white shadow-2xs'
                                  : 'text-rose-700 hover:bg-rose-50'
                              }`}
                            >
                              <X size={13} />
                              <span>{t('status_rejected', 'Отклонены')}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                currentFilter === 'rejected' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {rejectedCount}
                              </span>
                            </button>
                          )}
                        </div>

                        {/* Search in candidates */}
                        <div className="relative w-full sm:w-64 min-w-0">
                          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-dark/40" />
                          <input
                            type="text"
                            placeholder={t('search_candidates_placeholder', 'Поиск по кандидатам...')}
                            value={candidateSearch[v.id] || ''}
                            onChange={(e) => setCandidateSearch(prev => ({ ...prev, [v.id]: e.target.value }))}
                            className="w-full bg-brand-muted/30 border border-brand-dark/[0.08] rounded-full pl-9 pr-8 py-1.5 text-xs text-brand-dark placeholder:text-brand-dark/40 focus:outline-none focus:border-brand-dark"
                          />
                          {candidateSearch[v.id] && (
                            <button
                              type="button"
                              onClick={() => setCandidateSearch(prev => ({ ...prev, [v.id]: '' }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-dark/40 hover:text-brand-dark"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Candidates List Header */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="font-mono text-xs uppercase font-bold tracking-wider text-brand-dark flex items-center gap-2">
                        <User size={16} className="text-brand-accent" />
                        {t('applicants_count', 'Applicants')} ({filteredApplicants.length} / {allAppsForV.length})
                      </h4>
                      {filteredApplicants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const allExpanded = filteredApplicants.every((a: any) => expandedApplicants[a.id]);
                            const nextState = { ...expandedApplicants };
                            filteredApplicants.forEach((a: any) => {
                              nextState[a.id] = !allExpanded;
                            });
                            setExpandedApplicants(nextState);
                          }}
                          className="text-xs font-mono font-semibold uppercase tracking-wider text-brand-dark/70 hover:text-brand-accent transition-colors cursor-pointer"
                        >
                          {filteredApplicants.every((a: any) => expandedApplicants[a.id]) ? t('collapse_all', 'Collapse All') : t('expand_all', 'Expand All')}
                        </button>
                      )}
                    </div>

                    {allAppsForV.length === 0 ? (
                      <div className="p-8 rounded-2xl border border-dashed border-brand-dark/15 text-center bg-brand-muted/20">
                        <p className="text-xs sm:text-sm font-medium text-brand-dark/60 font-mono uppercase tracking-wider">
                          {t('no_applications_yet', 'No applications received yet.')}
                        </p>
                      </div>
                    ) : filteredApplicants.length === 0 ? (
                      <div className="p-8 rounded-2xl border border-dashed border-brand-dark/15 text-center bg-brand-muted/20">
                        <p className="text-xs sm:text-sm font-medium text-brand-dark/60 font-mono uppercase tracking-wider">
                          {t('no_candidates_in_filter', 'Кандидатов с выбранным статусом не найдено.')}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setCandidateFilter(prev => ({ ...prev, [v.id]: 'all' }));
                            setCandidateSearch(prev => ({ ...prev, [v.id]: '' }));
                          }}
                          className="mt-3 text-xs font-mono font-bold text-brand-accent uppercase tracking-wider hover:underline"
                        >
                          {t('show_all', 'Сбросить фильтр и показать всех')}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredApplicants.map((app: any, index: number) => {
                          const isExpanded = !!expandedApplicants[app.id];
                          const appStatus = app.status || 'pending';
                          const isUpdating = updatingCandidateId === app.id;

                          return (
                            <div 
                              key={app.id} 
                              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                                appStatus === 'approved'
                                  ? 'border-emerald-500/30 bg-emerald-500/[0.02]'
                                  : appStatus === 'postponed' || appStatus === 'under_review' || appStatus === 'shortlisted'
                                  ? 'border-amber-500/30 bg-amber-500/[0.02]'
                                  : appStatus === 'rejected'
                                  ? 'border-rose-500/20 bg-rose-500/[0.01]'
                                  : isExpanded 
                                  ? 'border-brand-dark/[0.12] bg-white shadow-xs' 
                                  : 'border-brand-dark/[0.08] bg-brand-muted/20 hover:bg-brand-muted/40'
                              }`}
                            >
                              {/* Applicant Menu Header Row (Clickable) */}
                              <div 
                                onClick={() => toggleApplicant(app.id)}
                                className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none"
                                role="button"
                                tabIndex={0}
                                aria-expanded={isExpanded}
                              >
                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                  {/* Avatar / Status Ring */}
                                  <div className={`w-11 h-11 rounded-full border shrink-0 flex items-center justify-center font-mono font-bold text-xs relative ${
                                    appStatus === 'approved'
                                      ? 'bg-emerald-600 text-white border-emerald-500 ring-2 ring-emerald-500/20'
                                      : appStatus === 'postponed' || appStatus === 'under_review' || appStatus === 'shortlisted'
                                      ? 'bg-amber-600 text-white border-amber-500 ring-2 ring-amber-500/20'
                                      : appStatus === 'rejected'
                                      ? 'bg-rose-700 text-white border-rose-600'
                                      : isExpanded
                                      ? 'bg-brand-accent text-white border-brand-accent'
                                      : 'bg-brand-dark text-white border-brand-dark/20'
                                  }`}>
                                    {app.name ? app.name.slice(0, 2).toUpperCase() : `#${index + 1}`}
                                    {appStatus === 'approved' && (
                                      <div className="absolute -bottom-1 -right-1 bg-white text-emerald-600 rounded-full p-0.5 shadow-2xs">
                                        <CheckCircle2 size={12} />
                                      </div>
                                    )}
                                    {(appStatus === 'postponed' || appStatus === 'under_review' || appStatus === 'shortlisted') && (
                                      <div className="absolute -bottom-1 -right-1 bg-white text-amber-600 rounded-full p-0.5 shadow-2xs">
                                        <Clock size={12} />
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h5 className="font-semibold text-sm sm:text-base text-brand-dark truncate flex items-center gap-1.5">
                                        <span>{app.name || t('anonymous_applicant', 'Anonymous Applicant')}</span>
                                        {(app.hasGoldenNeedle || app.profileData?.hasGoldenNeedle) && (
                                          <GoldenNeedleBadge size="sm" />
                                        )}
                                      </h5>

                                      {/* Status Badges */}
                                      {appStatus === 'approved' && (
                                        <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/25 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                                          <CheckCircle2 size={11} /> {t('status_approved', 'Одобрен')}
                                        </span>
                                      )}
                                      {(appStatus === 'postponed' || appStatus === 'under_review' || appStatus === 'shortlisted') && (
                                        <span className="bg-amber-500/10 text-amber-800 border border-amber-500/25 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                                          <Clock size={11} /> {t('status_postponed', 'Отложен на рассмотрение')}
                                        </span>
                                      )}
                                      {appStatus === 'rejected' && (
                                        <span className="bg-rose-500/10 text-rose-700 border border-rose-500/20 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                                          <X size={11} /> {t('status_rejected', 'Отклонен')}
                                        </span>
                                      )}
                                      {appStatus === 'pending' && (
                                        <span className="bg-brand-muted text-brand-dark/70 border border-brand-dark/10 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                                          <User size={11} /> {t('status_pending', 'Новый отклик')}
                                        </span>
                                      )}

                                      {app.profileData?.generalInfo?.headline && (
                                        <span className="text-xs text-brand-dark/60 border-l border-brand-dark/20 pl-2 truncate hidden md:inline">
                                          {app.profileData.generalInfo.headline}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-brand-dark/60 flex items-center gap-1.5 mt-0.5 font-mono">
                                      <Mail size={12} />
                                      <span className="truncate">{app.email}</span>
                                    </p>
                                  </div>
                                </div>

                                {/* Right Actions Group & Status Buttons */}
                                <div className="flex items-center gap-2 flex-wrap shrink-0 justify-end" onClick={(e) => e.stopPropagation()}>
                                  {/* Approve Button */}
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleUpdateCandidateStatus(v.id, app, 'approved', v.title)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-mono font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                      appStatus === 'approved'
                                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/30'
                                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-600/25'
                                    }`}
                                    title={t('action_approve', 'Одобрить кандидата')}
                                  >
                                    <Check size={13} />
                                    <span>{t('action_approve', 'Одобрить')}</span>
                                  </button>

                                  {/* Postpone Button */}
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleUpdateCandidateStatus(v.id, app, 'postponed', v.title)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-mono font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                      appStatus === 'postponed' || appStatus === 'under_review' || appStatus === 'shortlisted'
                                        ? 'bg-amber-600 text-white ring-2 ring-amber-500/30'
                                        : 'bg-amber-50 text-amber-900 hover:bg-amber-600 hover:text-white border border-amber-600/25'
                                    }`}
                                    title={t('action_postpone', 'Отложить для дальнейшего рассмотрения')}
                                  >
                                    <Clock size={13} />
                                    <span>{t('action_postpone', 'Отложить')}</span>
                                  </button>

                                  {/* Delete Button */}
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => setCandidateToDelete({ vacancyId: v.id, vacancyTitle: v.title, app })}
                                    className="p-2 rounded-full text-brand-dark/40 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                                    title={t('action_delete', 'Удалить анкету')}
                                  >
                                    <Trash2 size={14} />
                                  </button>

                                  {/* CV badge if present */}
                                  {app.cvUrl && (
                                    <a
                                      href={app.cvUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-brand-accent/10 text-brand-accent px-2.5 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider rounded-full border border-brand-accent/20 flex items-center gap-1 hover:bg-brand-accent hover:text-white transition-colors"
                                      title="Open CV"
                                    >
                                      <FileText size={11} /> CV
                                    </a>
                                  )}

                                  {/* Expand Indicator */}
                                  <button
                                    type="button"
                                    onClick={() => toggleApplicant(app.id)}
                                    className={`p-1.5 rounded-full border border-brand-dark/10 transition-transform cursor-pointer ${
                                      isExpanded ? 'bg-brand-dark text-white rotate-180' : 'bg-white text-brand-dark'
                                    }`}
                                    title={isExpanded ? 'Collapse' : 'Expand'}
                                  >
                                    <ChevronDown size={14} />
                                  </button>
                                </div>
                              </div>

                              {/* Expanded Applicant Dossier */}
                              {isExpanded && (
                                <div className="border-t border-brand-dark/[0.08] p-5 sm:p-7 bg-white space-y-6 animate-in slide-in-from-top-2 duration-200">
                                  {/* Status Decision & Action Bar */}
                                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-brand-muted/20 border border-brand-dark/[0.08]">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/60 mr-1">
                                        Статус решения:
                                      </span>
                                      
                                      <button
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => handleUpdateCandidateStatus(v.id, app, 'approved', v.title)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                          appStatus === 'approved'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-white text-emerald-800 border border-emerald-500/30 hover:bg-emerald-50'
                                        }`}
                                      >
                                        <CheckCircle2 size={13} /> {t('action_approve', 'Одобрить')}
                                      </button>

                                      <button
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => handleUpdateCandidateStatus(v.id, app, 'postponed', v.title)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                          appStatus === 'postponed' || appStatus === 'under_review' || appStatus === 'shortlisted'
                                            ? 'bg-amber-600 text-white'
                                            : 'bg-white text-amber-900 border border-amber-500/30 hover:bg-amber-50'
                                        }`}
                                      >
                                        <Clock size={13} /> {t('action_postpone', 'Отложить')}
                                      </button>

                                      <button
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => handleUpdateCandidateStatus(v.id, app, 'rejected', v.title)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                          appStatus === 'rejected'
                                            ? 'bg-rose-600 text-white'
                                            : 'bg-white text-rose-700 border border-rose-500/30 hover:bg-rose-50'
                                        }`}
                                      >
                                        <X size={13} /> {t('action_reject', 'Отклонить')}
                                      </button>

                                      {appStatus !== 'pending' && (
                                        <button
                                          type="button"
                                          disabled={isUpdating}
                                          onClick={() => handleUpdateCandidateStatus(v.id, app, 'pending', v.title)}
                                          className="px-2.5 py-1.5 rounded-full text-[11px] font-mono text-brand-dark/60 hover:text-brand-dark border border-brand-dark/15 hover:bg-brand-muted/40 transition-colors flex items-center gap-1 cursor-pointer"
                                          title={t('action_reset_status', 'Вернуть в новые')}
                                        >
                                          <RotateCcw size={11} /> {t('action_reset_status', 'Сбросить')}
                                        </button>
                                      )}
                                    </div>

                                    {/* Direct Contact & Delete Actions */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <button 
                                        type="button"
                                        onClick={() => handleContactApplicant(app)}
                                        className="bg-brand-accent hover:bg-brand-dark text-white px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                      >
                                        <MessageSquare size={13} /> {t('message_candidate', 'Message Candidate')}
                                      </button>
                                      {app.email && (
                                        <a 
                                          href={`mailto:${app.email}`} 
                                          className="bg-white hover:bg-brand-dark hover:text-white border border-brand-dark/[0.12] px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider text-brand-dark transition-colors flex items-center gap-1.5 shadow-2xs"
                                        >
                                          <Mail size={13} /> {t('email_action', 'Email')}
                                        </a>
                                      )}
                                      {app.cvUrl && (
                                        <a 
                                          href={app.cvUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="bg-white hover:bg-brand-dark hover:text-white text-brand-dark border border-brand-dark/[0.12] px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-2xs"
                                        >
                                          <FileText size={13} /> {t('open_cv', 'Open CV')}
                                          <ExternalLink size={11} />
                                        </a>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => setCandidateToDelete({ vacancyId: v.id, vacancyTitle: v.title, app })}
                                        className="bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                        title={t('action_delete', 'Удалить кандидата')}
                                      >
                                        <Trash2 size={13} /> {t('action_delete', 'Удалить')}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Screening Questions & Candidate Answers */}
                                  {app.customAnswers && app.customAnswers.length > 0 && (
                                    <div className="rounded-2xl border border-brand-dark/[0.08] bg-brand-muted/20 p-5 space-y-3.5">
                                      <h6 className="font-mono font-bold uppercase tracking-wider text-xs text-brand-dark flex items-center gap-1.5 pb-2.5 border-b border-brand-dark/[0.08]">
                                        <HelpCircle size={14} className="text-brand-accent" />
                                        {t('screening_responses', { count: app.customAnswers.length, defaultValue: `Screening Question Responses (${app.customAnswers.length})` })}
                                      </h6>
                                      <div className="space-y-2.5">
                                        {app.customAnswers.map((qa: any, qaIdx: number) => (
                                          <div key={qa.questionId || qaIdx} className="bg-white rounded-xl border border-brand-dark/[0.08] p-3.5 space-y-1 shadow-2xs">
                                            <div className="text-xs font-medium text-brand-dark/70">
                                              <span className="font-mono font-bold text-brand-accent mr-1.5">Q{qaIdx + 1}:</span>
                                              {qa.question}
                                            </div>
                                            <div className="text-xs sm:text-sm font-semibold text-brand-dark pl-2 border-l-2 border-brand-accent">
                                              {qa.answer ? qa.answer : <span className="text-brand-dark/40 italic font-normal">{t('no_answer_provided', 'No answer provided')}</span>}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Cover Letter */}
                                  {app.coverLetter && (
                                    <div className="space-y-1.5">
                                      <h6 className="font-mono font-bold uppercase tracking-wider text-xs text-brand-dark flex items-center gap-1.5">
                                        <FileText size={13} className="text-brand-accent" /> {t('cover_letter', 'Cover Letter')}
                                      </h6>
                                      <div className="bg-brand-muted/20 rounded-xl p-4 border border-brand-dark/[0.08] text-xs sm:text-sm text-brand-dark leading-relaxed whitespace-pre-wrap">
                                        {app.coverLetter}
                                      </div>
                                    </div>
                                  )}

                                  {/* Full Profile Data (if attached) */}
                                  {app.profileData && (
                                    <div className="space-y-4">
                                      {app.profileData.generalInfo && (
                                        <div className="bg-brand-muted/20 rounded-xl p-4 border border-brand-dark/[0.08]">
                                          <h6 className="font-mono font-bold uppercase tracking-wider text-[11px] text-brand-dark/70 mb-1">{t('headline_and_bio', 'Headline & Bio')}</h6>
                                          <p className="font-semibold text-sm text-brand-dark">{app.profileData.generalInfo.headline}</p>
                                          {app.profileData.generalInfo.bio && (
                                            <p className="text-xs text-brand-dark/70 mt-1 leading-relaxed">{app.profileData.generalInfo.bio}</p>
                                          )}
                                        </div>
                                      )}

                                      {/* Experience */}
                                      {app.profileData.experience?.length > 0 && (
                                        <div>
                                          <h6 className="font-mono font-bold uppercase tracking-wider text-xs text-brand-dark mb-2.5 flex items-center gap-1.5">
                                            <Briefcase size={13} className="text-brand-accent" /> {t('experience', 'Experience')}
                                          </h6>
                                          <div className="space-y-2">
                                            {app.profileData.experience.map((exp: any, i: number) => (
                                              <div key={i} className="border-l-2 border-brand-accent pl-3 py-1">
                                                <p className="font-semibold text-xs sm:text-sm text-brand-dark">{exp.title} at {exp.company}</p>
                                                <p className="text-[11px] font-mono text-brand-dark/50">{exp.startDate} - {exp.current ? 'Present' : exp.endDate}</p>
                                                {exp.description && <p className="text-xs text-brand-dark/70 mt-0.5">{exp.description}</p>}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {app.profileData.skills?.length > 0 && (
                                        <div>
                                          <h6 className="font-mono font-bold uppercase tracking-wider text-xs text-brand-dark mb-2 flex items-center gap-1.5">
                                            <Award size={13} className="text-brand-accent" /> {t('skills_label', 'Skills')} ({app.profileData.skills.length})
                                          </h6>
                                          <div className="flex flex-wrap gap-1.5">
                                            {app.profileData.skills.map((skill: string, i: number) => (
                                              <span key={i} className="bg-brand-muted/70 border border-brand-dark/[0.08] px-2.5 py-0.5 text-xs font-mono rounded-md text-brand-dark">
                                                {skill}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Portfolio Work Items with Zoom */}
                                  <div className="border-t border-brand-dark/[0.08] pt-4">
                                    <h6 className="font-mono font-bold uppercase tracking-wider text-xs text-brand-dark mb-3">
                                      {t('applicant_portfolio', { count: app.portfolioPosts?.length || 0, defaultValue: `Applicant's Portfolio (${app.portfolioPosts?.length || 0})` })}
                                    </h6>
                                    {(!app.portfolioPosts || app.portfolioPosts.length === 0) ? (
                                      <p className="text-xs font-mono text-brand-dark/50">{t('no_portfolio_posts', "Applicant hasn't attached any portfolio posts.")}</p>
                                    ) : (
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {app.portfolioPosts.map((p: any) => (
                                          <div 
                                            key={p.id} 
                                            onClick={() => setZoomImage({ url: p.imageUrl, caption: p.description || `${app.name}'s portfolio item` })}
                                            className="aspect-square rounded-xl border border-brand-dark/[0.08] overflow-hidden bg-brand-muted cursor-zoom-in group relative shadow-2xs"
                                            title="Click to enlarge photo"
                                          >
                                            <img src={p.imageUrl} alt="Portfolio item" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            <div className="absolute inset-0 bg-brand-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                              <ZoomIn size={16} className="text-white" />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'portfolio' && (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-brand-dark/[0.08]">
 <div>
 <h2 className="text-xl sm:text-2xl font-display font-bold text-brand-dark uppercase tracking-tight">{t('gallery_and_portfolio', 'Gallery & Portfolio')}</h2>
 <p className="text-xs text-brand-dark/60 mt-0.5">High-resolution archive of looks, editorial campaigns, and runway appearances</p>
 </div>
 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
 <button 
 onClick={() => fileInputRef.current?.click()}
 className="bg-brand-dark text-white px-5 py-2.5 rounded-full font-semibold uppercase tracking-wider text-xs hover:bg-brand-accent transition-colors flex items-center gap-2 shadow-2xs self-start sm:self-auto shrink-0"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
 <span>{t('upload_post', 'Upload Post')}</span>
 </button>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-6">
 {posts.length > 0 ? posts.map((post) => (
 <div 
 key={post.id} 
 onClick={() => { 
 setSelectedPost(post); 
 setPostDescription(post.description || ''); 
 setIsEditingPost(false);
 setIsPostMenuOpen(false);
 }}
 className="aspect-square bg-brand-muted/30 rounded-2xl relative group overflow-hidden border border-brand-dark/[0.08] shadow-xs cursor-pointer"
 >
 <img 
 src={post.imageUrl} 
 alt="Portfolio item" 
 className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
 crossOrigin="anonymous"
 />
 <div className="absolute inset-0 bg-brand-dark/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3 text-white font-bold p-2 backdrop-blur-2xs">
 <div className="flex items-center gap-4 text-xs md:text-sm">
 <div className="flex items-center gap-1.5"><Heart size={15} className="text-[#7a0000] fill-[#7a0000]" /> {post.likes}</div>
 <div className="flex items-center gap-1.5"><MessageSquare size={15} /> {post.comments}</div>
 </div>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setZoomImage({ url: post.imageUrl, caption: post.description });
 }}
 className="bg-brand-accent text-white px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider hover:scale-105 transition-transform flex items-center gap-1 shadow-sm"
 title="Enlarge & Zoom Photo"
 >
 <ZoomIn size={13} /> <span>{t('zoom', 'Zoom')}</span>
 </button>
 </div>
 </div>
 )) : (
 <div className="col-span-full text-center p-16 sm:p-20 rounded-3xl border border-dashed border-brand-dark/20 bg-white shadow-2xs">
 <p className="text-xl font-display font-semibold uppercase tracking-wider text-brand-dark/70">{t('no_posts_yet', 'No posts yet.')}</p>
 <p className="text-xs text-brand-dark/50 mt-1 max-w-sm mx-auto">Upload looks, runway snapshots, or atelier creations to populate your public archive.</p>
 <button 
 onClick={() => fileInputRef.current?.click()}
 className="mt-4 bg-brand-dark text-white px-5 py-2.5 rounded-full font-semibold uppercase tracking-wider text-xs hover:bg-brand-accent transition-colors inline-flex items-center gap-2 shadow-2xs"
 >
 {t('upload_post', 'Upload First Post')}
 </button>
 </div>
 )}
 </div>
 </div>
 )}

 {activeTab === 'tickets' && (
 <div className="space-y-6">
 <div className="pb-2 border-b border-brand-dark/[0.08]">
 <h2 className="text-xl sm:text-2xl font-display font-bold text-brand-dark uppercase tracking-tight">{t('tab_tickets', 'Fashion Week Tickets & Passes')}</h2>
 <p className="text-xs text-brand-dark/60 mt-0.5">Exclusive passes, runway admissions, and digital QR vouchers</p>
 </div>

	{/* VIP Front Row Lottery Card (Matching Elite VIP Perks) */}
	{(dbUser?.subscriptionTier === 'elite' || dbUser?.subscriptionTier === 'vip') ? (
		<div className="rounded-3xl border border-amber-400/30 bg-stone-900 text-white p-5 sm:p-6 shadow-md relative overflow-hidden">
			<div className="flex items-start gap-4">
				<div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
					<Crown size={22} />
				</div>
				<div className="flex-1">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
							FFAZ ELITE VIP PRIVILEGE
						</span>
						<span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-400/30 px-2 py-0.5 rounded-full uppercase">
							✓ Заявка на Front Row активна
						</span>
					</div>
					<h3 className="text-base sm:text-lg font-serif font-bold text-white mt-1">
						🎟️ Розыгрыш VIP-пригласительных и Front Row на Недели Моды
					</h3>
					<p className="text-xs text-white/75 mt-1 leading-relaxed max-w-2xl">
						Как активный подписчик тарифа <strong>FFAZ Elite VIP</strong>, вы автоматически зарегистрированы во всех закрытых розыгрышах персональных пропусков первого ряда (Front Row) на Azerbaijan Fashion Week и Baku Fashion Week. При выигрыше именной VIP-пропуск с QR-кодом появится в этом списке.
					</p>
				</div>
			</div>
		</div>
	) : (
		<div className="rounded-3xl border border-brand-dark/[0.08] bg-white p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div className="flex items-center gap-3.5">
				<div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 border border-amber-500/20 flex items-center justify-center shrink-0">
					<Crown size={18} />
				</div>
				<div>
					<h4 className="text-sm font-semibold text-brand-dark">
						🎟️ Розыгрыш VIP-пригласительных и Front Row на Недели Моды
					</h4>
					<p className="text-xs text-brand-dark/60 mt-0.5">
						Доступно на тарифе <strong>FFAZ Elite VIP</strong> (49 AZN / 40 AZN год). Подписчики Elite VIP автоматически участвуют в закрытых розыгрышах билетов первого ряда.
					</p>
				</div>
			</div>
			<Link
				to="/plans"
				className="px-4 py-2 rounded-full bg-brand-dark text-white hover:bg-brand-accent text-xs font-semibold uppercase tracking-wider transition-colors shrink-0 shadow-2xs text-center"
			>
				Узнать подробнее →
			</Link>
		</div>
	)}
	{/* VIP Level 3 User's Active Giveaway Entries Section */}
	{giveawayEntries.length > 0 && (
		<div className="space-y-4 pt-2">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Gift size={18} className="text-amber-600" />
					<h3 className="text-sm sm:text-base font-display font-bold uppercase tracking-wider text-brand-dark">
						Мои заявки на розыгрыш билетов ({giveawayEntries.length})
					</h3>
				</div>
				<span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
					ELITE VIP GIVEAWAY
				</span>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{giveawayEntries.map((entry) => (
					<div
						key={entry.id}
						className={`rounded-2xl border p-4.5 sm:p-5 flex flex-col justify-between gap-3 relative overflow-hidden transition-all shadow-xs ${
							entry.isWinner 
								? 'bg-emerald-50/70 border-emerald-400/40 ring-1 ring-emerald-500/30' 
								: 'bg-white border-brand-dark/[0.08]'
						}`}
					>
						<div>
							<div className="flex items-center justify-between gap-2 mb-2">
								{entry.isWinner ? (
									<span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] bg-emerald-600 text-white shadow-2xs">
										<Trophy size={11} />
										<span>ВЫ ВЫИГРАЛИ БИЛЕТ!</span>
									</span>
								) : (
									<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider text-[10px] bg-amber-500/10 text-amber-800 border border-amber-500/25">
										<CheckCircle2 size={11} className="text-amber-600" />
										<span>Заявка принята • Участвуете</span>
									</span>
								)}

								<span className="text-[10px] font-mono text-brand-dark/50">
									{new Date(entry.enteredAt).toLocaleDateString()}
								</span>
							</div>

							<h4 className="font-display font-bold text-base text-brand-dark leading-snug mb-1">
								{entry.eventTitle}
							</h4>

							<div className="text-xs text-brand-dark/70 space-y-0.5">
								{entry.eventLocation && (
									<p className="flex items-center gap-1 text-[11px] text-brand-dark/60">
										<MapPin size={12} className="text-brand-accent shrink-0" />
										<span className="truncate">{entry.eventLocation}</span>
									</p>
								)}
								{entry.eventDate && (
									<p className="flex items-center gap-1 text-[11px] text-brand-dark/60">
										<Calendar size={12} className="text-brand-accent shrink-0" />
										<span>{new Date(entry.eventDate).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
									</p>
								)}
							</div>
						</div>

						<div className="pt-3 border-t border-brand-dark/[0.08] flex items-center justify-between text-[11px]">
							<span className="text-brand-dark/60">
								{entry.isWinner 
									? '🎉 VIP Пропуск подтвержден' 
									: '⏳ Ожидание розыгрыша автогенератором'}
							</span>
							<Link
								to={`/event/${entry.eventId}`}
								className="text-brand-accent hover:underline font-semibold flex items-center gap-1"
							>
								<span>Показ</span>
								<ExternalLink size={10} />
							</Link>
						</div>
					</div>
				))}
			</div>
		</div>
	)}

  {/* 1. Winner VIP Passes with Digital QR code */}
  {giveawayEntries.filter(e => e.isWinner).length > 0 && (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2">
        <Trophy size={18} className="text-emerald-600" />
        <h3 className="text-sm sm:text-base font-display font-bold uppercase tracking-wider text-brand-dark">
          Электронные VIP-билеты победителя ({giveawayEntries.filter(e => e.isWinner).length})
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {giveawayEntries.filter(e => e.isWinner).map((winnerEntry) => {
          const qrCodeStr = `BFW-VIP-WON-${winnerEntry.id.slice(0, 8).toUpperCase()}-${winnerEntry.eventId}`;
          return (
            <div 
              key={`winner-card-${winnerEntry.id}`} 
              className="rounded-3xl border border-emerald-500/40 bg-linear-to-br from-emerald-50/70 via-white to-amber-50/40 p-5 sm:p-7 flex flex-col sm:flex-row gap-6 relative overflow-hidden shadow-xs hover:shadow-md transition-all ring-1 ring-emerald-500/20"
            >
              <div className="shrink-0 bg-white p-3 rounded-2xl border border-emerald-500/30 w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center self-center sm:self-start shadow-2xs">
                <QRCodeSVG value={qrCodeStr} size={110} className="w-full h-full text-emerald-950" />
              </div>

              <div className="flex-col flex justify-between flex-grow min-w-0">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] bg-emerald-600 text-white shadow-2xs">
                      <Trophy size={11} /> ● VIP WINNER PASS
                    </span>
                    <span className="text-[10px] font-mono text-emerald-900/60 uppercase">
                      VIP-PASS-{winnerEntry.id.slice(0, 6).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-display font-bold uppercase tracking-tight mb-3 text-brand-dark leading-snug break-words">
                    {winnerEntry.eventTitle}
                  </h3>
                  <div className="text-xs uppercase tracking-wider text-brand-dark/80 font-medium flex flex-col gap-1.5">
                    {winnerEntry.eventDate && (
                      <div className="flex items-center gap-2">
                        <span className="text-brand-dark/50 shrink-0 w-12 font-mono text-[11px]">{t('ticket_date', 'Date')}</span>
                        <span className="text-brand-dark font-semibold truncate">
                          {new Date(winnerEntry.eventDate).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                    {winnerEntry.eventLocation && (
                      <div className="flex items-center gap-2">
                        <span className="text-brand-dark/50 shrink-0 w-12 font-mono text-[11px]">{t('ticket_loc', 'Loc')}</span>
                        <span className="text-brand-dark font-semibold truncate">{winnerEntry.eventLocation}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-2.5 border-t border-emerald-500/20 text-[11px] text-emerald-900/80 flex items-center justify-between">
                  <span>Именной VIP-пропуск (Front Row)</span>
                  <span className="font-mono text-[10px] font-bold text-emerald-700 uppercase">✓ Verified Winner</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )}

  {/* 2. Standard Purchased Tickets List */}
  {tickets.length > 0 && (
    <div className="space-y-4 pt-2">
      {giveawayEntries.length > 0 && (
        <h3 className="text-sm sm:text-base font-display font-bold uppercase tracking-wider text-brand-dark">
          Купленные билеты ({tickets.length})
        </h3>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {tickets.map((ticket, i) => (
          <div 
            key={ticket.id} 
            className={`rounded-3xl border p-5 sm:p-7 flex flex-col sm:flex-row gap-6 relative overflow-hidden shadow-xs transition-all hover:shadow-md ${
              ticket.status === 'active' 
                ? 'bg-white border-brand-accent/25' 
                : 'bg-brand-light/60 border-brand-dark/[0.08]'
            }`}
          >
            {ticket.status !== 'active' && (
              <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center backdrop-blur-2xs p-4 text-center">
                <span className="text-xl sm:text-2xl font-display font-bold uppercase tracking-tight text-brand-dark border border-brand-dark/20 px-6 py-2 rounded-full bg-white rotate-[-3deg] shadow-xs">
                  {ticket.status === 'used' ? t('ticket_used') : t('ticket_cancelled')}
                </span>
              </div>
            )}
            
            <div className="shrink-0 bg-white p-3 rounded-2xl border border-brand-dark/10 w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center self-center sm:self-start shadow-2xs">
              <QRCodeSVG value={ticket.qrCodeData} size={110} className="w-full h-full text-[var(--brand-dark)]" />
            </div>
            
            <div className="flex-col flex justify-between flex-grow min-w-0">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`inline-flex px-3 py-0.5 rounded-full font-semibold uppercase tracking-wider text-[10px] border ${
                    ticket.status === 'active' 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                      : 'bg-brand-light text-brand-dark/60 border-brand-dark/10'
                  }`}>
                    {ticket.status === 'active' ? '● VIP PASS ACTIVE' : ticket.status?.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono text-brand-dark/50 uppercase">
                    FFAZ-TKT-{ticket.id?.slice(0, 6)}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-display font-bold uppercase tracking-tight mb-3 text-brand-dark leading-snug break-words">
                  {ticket.event?.title || 'Fashion Week Runway'}
                </h3>
                <div className="text-xs uppercase tracking-wider text-brand-dark/80 font-medium flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-brand-dark/50 shrink-0 w-12 font-mono text-[11px]">{t('ticket_date', 'Date')}</span>
                    <span className="text-brand-dark font-semibold truncate">
                      {ticket.event ? new Date(ticket.event.date).toLocaleDateString() : 'N/A'}
                      {ticket.event && (ticket.event as any).endDate && ` - ${new Date((ticket.event as any).endDate).toLocaleDateString()}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-brand-dark/50 shrink-0 w-12 font-mono text-[11px]">{t('ticket_loc', 'Loc')}</span>
                    <span className="text-brand-dark font-semibold truncate">{ticket.event?.location || 'Baku, Azerbaijan'}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-2.5 border-t border-brand-dark/[0.08] text-[11px] text-brand-dark/60 flex items-center justify-between">
                <span>{t('ticket_purchased', { date: new Date(ticket.purchaseDate).toLocaleDateString(), defaultValue: `Purchased: ${new Date(ticket.purchaseDate).toLocaleDateString()}` })}</span>
                <span className="font-mono text-[10px]">Verified Pass</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )}

  {/* 3. Empty state: ONLY when user has neither tickets nor giveaway entries */}
  {tickets.length === 0 && giveawayEntries.length === 0 && (
    <div className="text-center p-12 sm:p-16 rounded-3xl border border-dashed border-brand-dark/20 max-w-lg mx-auto bg-white shadow-2xs">
      <p className="text-lg font-display font-semibold uppercase tracking-wider text-brand-dark/70">{t('no_tickets', 'No tickets found.')}</p>
      <p className="text-xs text-brand-dark/50 mt-1">Book runway seats in Fashion Calendar or win passes with Elite VIP.</p>
      <Link to="/calendar" className="mt-4 inline-block px-5 py-2.5 rounded-full bg-brand-dark text-white font-semibold text-xs uppercase tracking-wider hover:bg-brand-accent transition-colors shadow-2xs">
        Открыть календарь показов
      </Link>
    </div>
  )}
</div>
)}

 {activeTab === 'feed-activity' && (
          <div className="space-y-12 animate-in fade-in duration-300">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-brand-dark/[0.08] mb-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark">
                    {t('my_posts', 'My Posts')} / <span className="italic text-brand-accent font-serif">Мои публикации</span>
                  </h2>
                  <p className="text-xs text-brand-dark/60 mt-0.5">Все публикации и медиа-материалы, размещенные вами в ленте</p>
                </div>
                <span className="text-[11px] font-mono text-brand-accent bg-brand-accent/10 border border-brand-accent/20 px-3 py-0.5 rounded-full font-semibold uppercase">
                  {feedPosts.length} Posts
                </span>
              </div>

              <div className="space-y-4">
                {feedPosts.length === 0 ? (
                  <div className="text-center font-mono text-xs uppercase tracking-widest text-brand-dark/50 py-16 border border-dashed border-brand-dark/20 rounded-3xl p-8 bg-white shadow-2xs">
                    {t('no_posts_yet', 'No posts published yet.')}
                  </div>
                ) : feedPosts.map(p => (
                  <div key={p.id} className="rounded-2xl border border-brand-dark/[0.08] bg-white p-6 shadow-2xs hover:border-brand-accent/30 transition-all">
                    <p className="font-sans text-sm sm:text-base text-brand-dark mb-4 leading-relaxed">{p.content}</p>
                    {(() => {
                      const postImgs = p.images && Array.isArray(p.images) && p.images.length > 0 
                        ? p.images 
                        : (p.imageUrl ? [p.imageUrl] : []);
                      if (postImgs.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-2.5 mb-4">
                          {postImgs.map((imgUrl: string, idx: number) => (
                            <div 
                              key={idx}
                              onClick={() => setZoomImage({ url: imgUrl, caption: `${p.content || 'Photo'} (${idx + 1}/${postImgs.length})` })}
                              className="w-24 sm:w-28 aspect-square rounded-xl border border-brand-dark/[0.08] overflow-hidden relative group cursor-zoom-in shadow-2xs bg-brand-muted/20"
                              title="Click to enlarge photo"
                            >
                              <img 
                                src={imgUrl} 
                                alt={`Post photo ${idx + 1}`} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                loading="lazy" 
                                decoding="async" 
                              />
                              <div className="absolute inset-0 bg-brand-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <ZoomIn size={14} className="text-white drop-shadow-md" />
                              </div>
                              {postImgs.length > 1 && (
                                <div className="absolute bottom-1 right-1 bg-black/70 text-white font-mono text-[8px] px-1 py-0.5 rounded-sm">
                                  #{idx + 1}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    <div className="flex flex-wrap gap-4 text-xs font-mono uppercase tracking-wider text-brand-dark/60 pt-3 border-t border-brand-dark/[0.06]">
                      <span>Likes: <strong className="text-brand-dark">{p.likesCount || 0}</strong></span>
                      <span>•</span>
                      <span>Comments: <strong className="text-brand-dark">{p.commentsCount || 0}</strong></span>
                      <span>•</span>
                      <span>{p.createdAt?.toDate().toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between pb-3 border-b border-brand-dark/[0.08] mb-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark">
                    {t('my_comments', 'My Comments')} / <span className="italic text-brand-accent font-serif">Мои комментарии</span>
                  </h2>
                  <p className="text-xs text-brand-dark/60 mt-0.5">История ваших комментариев под записями сообщества</p>
                </div>
                <span className="text-[11px] font-mono text-brand-dark/60 bg-brand-muted border border-brand-dark/10 px-3 py-0.5 rounded-full font-semibold uppercase">
                  {feedComments.length} Comments
                </span>
              </div>

              <div className="space-y-3">
                {feedComments.length === 0 ? (
                  <div className="text-center font-mono text-xs uppercase tracking-widest text-brand-dark/50 py-16 border border-dashed border-brand-dark/20 rounded-3xl p-8 bg-white shadow-2xs">
                    {t('no_comments_yet', 'No comments yet.')}
                  </div>
                ) : feedComments.map(c => (
                  <div key={c.id} className="rounded-2xl border border-brand-dark/[0.08] bg-white p-5 shadow-2xs border-l-4 border-l-brand-accent space-y-2">
                    <p className="font-serif italic text-brand-dark text-sm sm:text-base leading-relaxed">“{c.content}”</p>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-brand-dark/50">
                      {t('commented_on', { date: c.createdAt?.toDate().toLocaleDateString(), defaultValue: `Commented on ${c.createdAt?.toDate().toLocaleDateString()}` })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'edit-profile' && dbUser && (
 <div className="max-w-4xl mx-auto">
 <LinkedInStyleProfile user={dbUser} onComplete={() => setActiveTab('portfolio')} />
 </div>
 )}

 </div>

 {selectedPost && (
 <div className="fixed inset-0 bg-brand-dark/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
 <div className="bg-brand-light border-4 border-brand-dark max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col md:flex-row">
 {/* Photo section with click-to-zoom */}
 <div 
 onClick={() => setZoomImage({ url: selectedPost.imageUrl, caption: selectedPost.description })}
 title="Click to zoom in / enlarge full screen"
 className="w-full md:w-1/2 aspect-square bg-brand-dark border-r-0 md:border-r-4 border-b-4 md:border-b-0 border-brand-dark flex items-center justify-center overflow-hidden relative group cursor-zoom-in"
 >
 <img 
 src={selectedPost.imageUrl} 
 alt="Post" 
 className="w-full h-full object-contain md:object-cover group-hover:scale-105 transition-transform duration-300"
 crossOrigin="anonymous"
 />
 <div className="absolute inset-0 bg-brand-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
 <div className="bg-[#7a0000] text-white px-3 py-1.5 font-bold uppercase tracking-widest text-xs border-2 border-brand-dark flex items-center gap-1.5">
 <ZoomIn size={16} />
 {t('zoom', 'Click to Zoom')}
 </div>
 </div>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setZoomImage({ url: selectedPost.imageUrl, caption: selectedPost.description });
 }}
 title="Open Zoom Lightbox"
 className="absolute bottom-3 right-3 bg-brand-dark/90 hover:bg-brand-dark text-[#7a0000] p-2 border-2 border-[#7a0000] transition-transform hover:scale-110 z-10"
 >
 <Maximize2 size={16} />
 </button>
 </div>
 <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between">
 <div>
 {/* Header: Author + Three-lines Settings/Menu Button + Close Button */}
 <div className="flex items-center justify-between border-b-2 border-brand-dark pb-4 mb-6">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full border-2 border-brand-dark overflow-hidden bg-brand-muted shrink-0">
 <img 
 src={dbUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.uid}`} 
 alt="Profile" 
 className="w-full h-full object-cover"
 />
 </div>
 <div>
 <h4 className="font-bold text-brand-dark leading-tight">{dbUser?.name || currentUser?.email?.split('@')[0] || 'User'}</h4>
 <span className="text-xs font-bold uppercase tracking-widest text-brand-dark/50">
 {selectedPost.createdAt?.toDate ? selectedPost.createdAt.toDate().toLocaleDateString() : 'Portfolio item'}
 </span>
 </div>
 </div>

 <div className="flex items-center gap-2">
 {/* Three lines menu button on the right next to the photo */}
 <div className="relative">
 <button 
 type="button"
 onClick={() => setIsPostMenuOpen(!isPostMenuOpen)}
 title="Photo settings and options"
 className="p-2 border-2 border-brand-dark hover:bg-brand-dark hover:text-brand-light transition-colors flex items-center justify-center bg-brand-light"
 >
 <Menu size={18} />
 </button>

 {isPostMenuOpen && (
 <div className="absolute right-0 top-full mt-2 w-52 bg-brand-light border-2 border-brand-dark z-30 flex flex-col font-bold uppercase tracking-widest text-xs">
 <button 
 type="button"
 onClick={() => { 
 setIsEditingPost(true); 
 setIsPostMenuOpen(false); 
 }} 
 className="px-4 py-3 text-left hover:bg-brand-muted flex items-center gap-2 text-brand-dark border-b border-brand-dark/20"
 >
 <Edit3 size={14} />
 {t('edit_desc_settings', 'Edit Description / Settings')}
 </button>
 <button 
 type="button"
 onClick={() => { 
 setIsPostMenuOpen(false); 
 handleDeletePost(selectedPost.id); 
 }} 
 className="px-4 py-3 text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
 >
 <Trash2 size={14} />
 {t('delete_photo', 'Delete Photo')}
 </button>
 </div>
 )}
 </div>

 {/* Close button */}
 <button 
 type="button"
 onClick={() => { 
 setSelectedPost(null); 
 setIsEditingPost(false); 
 setIsPostMenuOpen(false); 
 }} 
 className="p-1.5 text-brand-dark hover:text-brand-accent transition-colors"
 >
 <X size={24} />
 </button>
 </div>
 </div>
 
 {/* View Mode (Default): Shows photo description */}
 {!isEditingPost ? (
 <div className="space-y-6">
 <div className="space-y-2">
 <span className="text-xs font-bold uppercase tracking-widest text-brand-dark/60 block">{t('desc_label', 'Description')}</span>
 {selectedPost.description ? (
 <p className="text-brand-dark font-medium text-base whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
 {selectedPost.description}
 </p>
 ) : (
 <div className="p-4 border-2 border-dashed border-brand-dark/30 bg-brand-muted text-brand-dark/60 text-sm font-bold uppercase tracking-wider">
 {t('no_desc_hint', 'No description provided. Click the 3-lines menu (☰) above to add a caption or edit settings.')}
 </div>
 )}
 </div>

 <div className="flex items-center gap-6 pt-4 border-t-2 border-brand-dark/20 text-brand-dark font-bold text-sm uppercase tracking-widest">
 <div className="flex items-center gap-2">
 <Heart size={16} className="text-brand-accent fill-brand-accent" />
 <span>{t('likes_count', { count: selectedPost.likes || 0, defaultValue: `${selectedPost.likes || 0} Likes` })}</span>
 </div>
 <div className="flex items-center gap-2">
 <MessageSquare size={16} />
 <span>{t('comments_count', { count: selectedPost.comments || 0, defaultValue: `${selectedPost.comments || 0} Comments` })}</span>
 </div>
 </div>
 </div>
 ) : (
 /* Edit/Settings Mode: Accessible via 3-lines menu */
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <label className="text-xs font-bold uppercase tracking-widest text-brand-dark">{t('edit_photo_desc', 'Edit Photo Description')}</label>
 <span className="text-xs font-bold text-brand-dark/50">{postDescription.length}/2000</span>
 </div>
 <textarea 
 value={postDescription} 
 onChange={e => setPostDescription(e.target.value)} 
 maxLength={2000}
 className="w-full bg-brand-muted border-2 border-brand-dark p-4 font-bold text-brand-dark min-h-[160px] outline-none resize-none focus:border-brand-accent"
 placeholder="Write a caption or description for this photo..."
 />
 <div className="flex gap-3 pt-2">
 <button 
 type="button"
 onClick={handleUpdatePost} 
 className="flex-1 bg-brand-dark text-brand-light px-4 py-3 font-bold uppercase tracking-widest text-xs hover:bg-brand-accent transition-colors"
 >
 {t('save_changes', 'Save Changes')}
 </button>
 <button 
 type="button"
 onClick={() => { 
 setIsEditingPost(false); 
 setPostDescription(selectedPost.description || ''); 
 }} 
 className="px-4 py-3 border-2 border-brand-dark font-bold uppercase tracking-widest text-xs hover:bg-brand-muted transition-colors"
 >
 {t('cancel', 'Cancel')}
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Footer controls if needed */}
 {!isEditingPost && (
 <div className="mt-6 pt-4 border-t-2 border-brand-dark/20 flex justify-end">
 <button 
 type="button"
 onClick={() => setIsEditingPost(true)}
 className="border-2 border-brand-dark px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-brand-dark hover:text-brand-light transition-colors flex items-center gap-2"
 >
 <Edit3 size={14} />
 {t('edit_details', 'Edit Details')}
 </button>
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 {/* Candidate Deletion Confirmation Modal */}
      {candidateToDelete && (
        <div 
          className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCandidateToDelete(null);
          }}
        >
          <div className="bg-white rounded-3xl border border-brand-dark/[0.1] max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-serif text-brand-dark font-normal">
                {t('confirm_delete_candidate_title', 'Удалить анкету кандидата')}
              </h3>
              <p className="text-xs text-brand-dark/60 leading-relaxed">
                {t('confirm_delete_candidate_desc', 'Вы уверены, что хотите безвозвратно удалить анкету и материалы этого кандидата из вакансии? Это действие нельзя отменить.')}
              </p>
              <div className="mt-3 p-3.5 rounded-2xl bg-brand-muted/30 border border-brand-dark/[0.08] text-xs font-mono text-left space-y-1">
                <div className="font-semibold text-brand-dark truncate">
                  {candidateToDelete.app.name || t('anonymous_applicant', 'Анонимный кандидат')}
                </div>
                <div className="text-brand-dark/60 truncate">{candidateToDelete.app.email}</div>
                <div className="text-brand-accent text-[11px] truncate pt-1 border-t border-brand-dark/[0.06]">
                  Вакансия: {candidateToDelete.vacancyTitle}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCandidateToDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-full border border-brand-dark/[0.15] text-xs font-semibold uppercase tracking-wider text-brand-dark hover:bg-brand-muted transition-colors cursor-pointer"
              >
                {t('cancel', 'Отмена')}
              </button>
              <button
                type="button"
                disabled={updatingCandidateId === candidateToDelete.app.id}
                onClick={handleConfirmDeleteCandidate}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={13} />
                {t('action_delete', 'Удалить')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Studio / Randomizer Modal */}
 <AvatarCustomizerModal
 isOpen={showAvatarModal}
 onClose={() => setShowAvatarModal(false)}
 currentAvatarUrl={dbUser?.avatarUrl}
 userId={currentUser?.uid || ''}
 />

 {/* Image Zoom & Lightbox Modal */}
 <ImageZoomModal
 isOpen={!!zoomImage}
 imageUrl={zoomImage?.url || ''}
 caption={zoomImage?.caption}
 onClose={() => setZoomImage(null)}
 />
 </div>
 );
}
