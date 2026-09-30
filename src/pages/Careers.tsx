import { useUI } from '../context/UIContext';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
 MapPin, 
 Lock, 
 Briefcase, 
 Plus, 
 HelpCircle, 
 Trash2, 
 CheckCircle2, 
 ListPlus, 
 Sparkles, 
 X, 
 ArrowRight, 
 Calendar, 
 FileText, 
 ChevronRight,
 Eye,
 Send,
  Building2,
  GraduationCap,
  Users,
  ExternalLink,
  CreditCard,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { apiFetch } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { uploadMediaFile } from '../lib/upload';
import { CustomQuestion, CustomAnswer } from '../types';
import { isSubscriptionActive } from '../lib/communityLimits';

const QUICK_QUESTION_PRESETS: Array<{ question: string; type: 'text' | 'yes_no' | 'number' | 'textarea'; required: boolean }> = [
 { question: "How many years of relevant professional experience do you have in the fashion or creative industry?", type: "number", required: true },
 { question: "What is your expected monthly salary / compensation (in AZN)?", type: "number", required: true },
 { question: "What is your earliest possible start date or notice period?", type: "text", required: true },
 { question: "Please provide a direct link to your online Portfolio, Lookbook, Behance, or Instagram.", type: "text", required: false },
 { question: "Do you have experience working backstage or on runway shows during Fashion Weeks?", type: "yes_no", required: false },
 { question: "Are you available for on-site work in Baku, or strictly remote?", type: "text", required: true },
 { question: "Which fashion design tools are you most proficient in (CLO3D, Marvelous Designer, Illustrator, Photoshop, etc.)?", type: "text", required: false },
 { question: "What languages do you speak fluently (Azerbaijani, English, Russian, Turkish, etc.)?", type: "text", required: true },
 { question: "Are you legally authorized to work in Azerbaijan?", type: "yes_no", required: true },
 { question: "Briefly explain why you are interested in joining this specific project/brand.", type: "textarea", required: false }
];

export default function Careers() {
 const ui = useUI();
 const { t, i18n } = useTranslation();

 const location = useLocation();
 const { currentUser, dbUser, isAdmin } = useAuth();
 const [activeTab, setActiveTab] = useState<'vacancy' | 'internship' | 'volunteer' | 'post'>('vacancy');
 const [showVolunteerModal, setShowVolunteerModal] = useState(false);
 const [selectedJobDetails, setSelectedJobDetails] = useState<any | null>(null);
 const [searchLocation, setSearchLocation] = useState('');
 const [applyingJob, setApplyingJob] = useState<any | null>(null);
 const [applyForm, setApplyForm] = useState({ name: '', email: '', coverLetter: '', cvUrl: '' });
 const [applyAnswers, setApplyAnswers] = useState<Record<string, string>>({});
 const [applyStatus, setApplyStatus] = useState('');
 
 const [jobs, setJobs] = useState<any[]>([]);
 
 const [postForm, setPostForm] = useState<{
 title: string;
 description: string;
 location: string;
 companyName: string;
 type: string;
 customQuestions: CustomQuestion[];
 }>({
 title: '',
 description: '',
 location: '',
 companyName: '',
 type: 'vacancy',
 customQuestions: []
 });

 const [selectedPresetIndex, setSelectedPresetIndex] = useState<string>('');
 const [customQuestionText, setCustomQuestionText] = useState('');
 const [customQuestionType, setCustomQuestionType] = useState<'text' | 'yes_no' | 'number' | 'textarea'>('text');
 const [customQuestionRequired, setCustomQuestionRequired] = useState(true);

 const [showPayment, setShowPayment] = useState(false);
 const [postStatus, setPostStatus] = useState('');
 const [showUpgradePlanModal, setShowUpgradePlanModal] = useState(false);
 const [paymentCardHolder, setPaymentCardHolder] = useState(dbUser?.name || '');
 const [paymentCardNumber, setPaymentCardNumber] = useState('');
 const [paymentCardExpiry, setPaymentCardExpiry] = useState('');
 const [paymentCardCvc, setPaymentCardCvc] = useState('');
 const [paymentMethod, setPaymentMethod] = useState<'card' | 'birbank' | 'apple_pay'>('card');

 const isUserSubActive = isSubscriptionActive(dbUser);
 const canApplyAndSeeEmployers = isAdmin || (isUserSubActive && ['creator', 'pro', 'elite', 'business'].includes(dbUser?.subscriptionTier || ''));
 const hasIncludedPlanAccess = isAdmin || (isUserSubActive && ['pro', 'elite', 'business'].includes(dbUser?.subscriptionTier || ''));
 const singleJobCredits = Number(dbUser?.singleJobCredits || 0);

 useEffect(() => {
   const params = new URLSearchParams(location.search);
   if (params.get('post') === 'true' || params.get('tab') === 'post') {
     setActiveTab('post');
   } else if (location.pathname.includes('internships')) {
     setActiveTab('internship');
   } else if (location.pathname.includes('volunteers')) {
     setActiveTab('volunteer');
   } else {
     setActiveTab('vacancy');
   }
 }, [location]);

 useEffect(() => {
 const q = query(collection(db, 'vacancies'), orderBy('createdAt', 'desc'));
 const unsubscribe = onSnapshot(q, (snapshot) => {
 const dbJobs = snapshot.docs.map(doc => ({
 id: doc.id,
 ...doc.data()
 }));
 setJobs(dbJobs);
 });
 return unsubscribe;
 }, []);

 const filteredJobs = jobs.filter(j => 
 j.type === activeTab && 
 (!searchLocation.trim() || 
 (j.location && j.location.toLowerCase().includes(searchLocation.toLowerCase().trim())) || 
 (j.title && j.title.toLowerCase().includes(searchLocation.toLowerCase().trim())))
 );

 const handleFileUpload = async (file: File): Promise<string | null> => {
 if (file.size > 15 * 1024 * 1024) {
 ui.alert('File too large (Max 15MB)');
 return null;
 }
 try {
 const url = await uploadMediaFile(file);
 return url;
 } catch (err: any) {
 console.error('File upload error:', err);
 ui.alert(err.message || 'Failed to upload file');
 return null;
 }
 };

 const handleAddPresetQuestion = (indexStr: string) => {
 if (!indexStr && indexStr !== '0') return;
 const index = parseInt(indexStr, 10);
 if (isNaN(index) || index < 0 || index >= QUICK_QUESTION_PRESETS.length) return;
 const preset = QUICK_QUESTION_PRESETS[index];

 // Check if already added
 const alreadyExists = (postForm.customQuestions || []).some(q => q.question.toLowerCase() === preset.question.toLowerCase());
 if (alreadyExists) {
 ui.alert('This question is already in your question list.');
 return;
 }

 const newQuestion: CustomQuestion = {
 id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
 question: preset.question,
 type: preset.type,
 required: preset.required
 };

 setPostForm(prev => ({
 ...prev,
 customQuestions: [...(prev.customQuestions || []), newQuestion]
 }));
 setSelectedPresetIndex('');
 };

 const handleAddCustomQuestion = () => {
 if (!customQuestionText.trim()) {
 ui.alert('Please enter a question text.');
 return;
 }

 const newQuestion: CustomQuestion = {
 id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
 question: customQuestionText.trim(),
 type: customQuestionType,
 required: customQuestionRequired
 };

 setPostForm(prev => ({
 ...prev,
 customQuestions: [...(prev.customQuestions || []), newQuestion]
 }));
 setCustomQuestionText('');
 setCustomQuestionType('text');
 setCustomQuestionRequired(true);
 };

 const handleRemoveQuestion = (id: string) => {
 setPostForm(prev => ({
 ...prev,
 customQuestions: (prev.customQuestions || []).filter(q => q.id !== id)
 }));
 };

 const handleToggleQuestionRequired = (id: string) => {
 setPostForm(prev => ({
 ...prev,
 customQuestions: (prev.customQuestions || []).map(q => q.id === id ? { ...q, required: !q.required } : q)
 }));
 };

 const handleApply = (job: any) => {
 if (job.type === 'volunteer') {
 setShowVolunteerModal(true);
 } else {
 if (!currentUser) {
 navigate('/login');
 return;
 }
 if (!canApplyAndSeeEmployers) {
 setShowUpgradePlanModal(true);
 return;
 }
 setApplyingJob(job);
 setApplyForm({ name: dbUser?.name || currentUser.displayName || '', email: currentUser.email || '', coverLetter: '', cvUrl: '' });
 
 // Initialize custom answers default values
 const initialAnswers: Record<string, string> = {};
 if (job.customQuestions && Array.isArray(job.customQuestions)) {
 job.customQuestions.forEach((q: CustomQuestion) => {
 initialAnswers[q.id] = q.type === 'yes_no' ? 'Yes' : '';
 });
 }
 setApplyAnswers(initialAnswers);
 }
 };

 const submitApplication = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!applyingJob || !currentUser) return;

 // Validate required custom questions
 if (applyingJob.customQuestions && Array.isArray(applyingJob.customQuestions)) {
 for (const q of applyingJob.customQuestions) {
 const ans = applyAnswers[q.id];
 if (q.required && (!ans || !String(ans).trim())) {
 ui.alert(`Please answer the required question: "${q.question}"`);
 return;
 }
 }
 }

 const formattedCustomAnswers: CustomAnswer[] = (applyingJob.customQuestions || []).map((q: CustomQuestion) => ({
 questionId: q.id,
 question: q.question,
 answer: applyAnswers[q.id] || '',
 type: q.type
 }));

 try {
 setApplyStatus('submitting');
 await addDoc(collection(db, 'jobApplications'), {
 jobId: applyingJob.id,
 employerId: applyingJob.employerId || '',
 userId: currentUser.uid,
 name: applyForm.name,
 email: applyForm.email,
 coverLetter: applyForm.coverLetter,
 cvUrl: applyForm.cvUrl,
 customAnswers: formattedCustomAnswers,
 profileData: dbUser?.profileData || null,
 hasGoldenNeedle: !!dbUser?.hasGoldenNeedle,
 status: 'pending',
 createdAt: serverTimestamp()
 });
 setApplyStatus('success');
 setTimeout(() => {
 setApplyStatus('');
 setApplyingJob(null);
 setApplyAnswers({});
 }, 2000);
 } catch (err) {
 console.error(err);
 setApplyStatus('error');
 }
 };

 const navigate = useNavigate();

 const handlePostSubmit = async (e: React.FormEvent) => {
   e.preventDefault();
   if (!currentUser) {
     ui.alert("Пожалуйста, войдите в аккаунт для публикации вакансии.");
     navigate('/login');
     return;
   }
   if (!postForm.title?.trim() || !postForm.description?.trim()) {
     ui.alert("Пожалуйста, заполните название и описание вакансии.");
     return;
   }

   const company = postForm.companyName?.trim() || dbUser?.brandName || dbUser?.name || 'Fashion Brand / House';
   const userVacancies = jobs.filter(j => j.employerId === currentUser?.uid);

   if (hasIncludedPlanAccess) {
     const maxAllowed = (isAdmin || dbUser?.role === 'admin' || dbUser?.role === 'superadmin')
       ? Infinity
       : (dbUser?.subscriptionTier === 'elite' ? 10 : 5);

     if (userVacancies.length >= maxAllowed) {
       ui.alert(`На вашем тарифе (${dbUser?.subscriptionTier === 'elite' ? 'Elite' : 'Pro'}) исчерпан лимит вакансий (максимум ${maxAllowed}). Удалите неактуальные вакансии в личном кабинете или перейдите на более высокий тариф.`);
       return;
     }

     try {
       await addDoc(collection(db, 'vacancies'), {
         employerId: currentUser.uid,
         employerName: dbUser?.name || 'Anonymous',
         companyName: company,
         title: postForm.title.trim(),
         description: postForm.description.trim(),
         location: postForm.location?.trim() || 'Baku, Azerbaijan',
         type: postForm.type,
         customQuestions: postForm.customQuestions || [],
         isPaid: true,
         createdAt: serverTimestamp()
       });
       ui.alert('Вакансия успешно опубликована!');
       setPostForm({ title: '', description: '', location: '', companyName: '', type: 'vacancy', customQuestions: [] });
       setActiveTab('vacancy');
     } catch(err: any) {
       console.error(err);
       ui.alert('Ошибка создания вакансии: ' + err.message);
     }
   } else {
     // Free tier: check if user has purchased singleJobCredits
     const currentCredits = Number(dbUser?.singleJobCredits || 0);
     if (currentCredits > 0) {
       try {
         // Decrement credit atomically
         await updateDoc(doc(db, 'users', currentUser.uid), {
           singleJobCredits: Math.max(0, currentCredits - 1),
          hasJobPostingAccess: true
         });

         await addDoc(collection(db, 'vacancies'), {
           employerId: currentUser.uid,
           employerName: dbUser?.name || 'Anonymous',
           companyName: company,
           title: postForm.title.trim(),
           description: postForm.description.trim(),
           location: postForm.location?.trim() || 'Baku, Azerbaijan',
           type: postForm.type,
           customQuestions: postForm.customQuestions || [],
           isPaid: true,
           createdAt: serverTimestamp()
         });

         ui.alert('Вакансия успешно опубликована с использованием оплаченного слота!');
         setPostForm({ title: '', description: '', location: '', companyName: '', type: 'vacancy', customQuestions: [] });
         setActiveTab('vacancy');
       } catch(err: any) {
         console.error(err);
         ui.alert('Ошибка публикации: ' + err.message);
       }
     } else {
       // Free user with NO credits: MUST pay 7 AZN!
       setShowPayment(true);
     }
   }
 };

 const processPayment = async () => {
   if (!currentUser) return;
   setPostStatus('processing');
   const company = postForm.companyName?.trim() || dbUser?.brandName || dbUser?.name || 'Fashion Brand / House';

   setTimeout(async () => {
     try {
       const res = await apiFetch('/api/vacancies', {
         method: 'POST',
         body: JSON.stringify({
           companyName: company,
           title: postForm.title.trim(),
           description: postForm.description.trim(),
           location: postForm.location?.trim() || 'Baku, Azerbaijan',
           type: postForm.type,
           customQuestions: postForm.customQuestions || [],
           isPaid: true
         })
       });

       if (!res.ok) {
         const errData = await res.json().catch(() => ({}));
         throw new Error(errData.error || 'Payment failed');
       }

       setPostStatus('success');
       setTimeout(() => {
         setShowPayment(false);
         setPostStatus('');
         setPostForm({ title: '', description: '', location: '', companyName: '', type: 'vacancy', customQuestions: [] });
         setActiveTab('vacancy');
       }, 1500);
     } catch(e: any) {
       console.error(e);
       setPostStatus('error');
       ui.alert('Ошибка проведения платежа: ' + e.message);
     }
   }, 1500);
 };

 return (
 <div className="animate-in fade-in duration-700 bg-brand-light min-h-screen relative pb-16">
      {/* 1. EDITORIAL HERO HEADER */}
      <section className="border-b border-brand-dark/[0.08] bg-brand-light pt-6 pb-6 sm:py-10 px-4 sm:px-8 relative overflow-hidden shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
          <div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-normal tracking-tight text-brand-dark leading-[1.02]">
              {i18n.language === 'az' ? 'Vakansiyalar və Kastinqlər' : i18n.language === 'en' ? 'Careers & Castings' : 'Вакансии & Кастинги'}
            </h1>
            <p className="text-xs sm:text-sm text-brand-dark/65 mt-1.5 max-w-xl font-normal leading-relaxed">
              Официальные кастинги моделей, стажировки у ведущих кутюрье, вакансии модных домов и волонтёрство на Неделе Моды.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('post')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-brand-accent text-white font-semibold uppercase tracking-wider text-xs hover:bg-brand-dark transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
            >
              <Plus size={14} />
              <span>
                {hasIncludedPlanAccess 
                  ? 'Разместить вакансию (Включено)' 
                  : singleJobCredits > 0 
                    ? `Разместить вакансию (${singleJobCredits} слот)` 
                    : 'Разместить вакансию (7 AZN)'}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. EDITORIAL TABS NAVIGATION (Luxury Pill Bar) */}
      <div className="border-b border-brand-dark/[0.08] bg-white sticky top-14 sm:top-16 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2.5 overflow-x-auto scrollbar-none flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button 
              onClick={() => setActiveTab('vacancy')}
              className={`px-4 py-1.5 rounded-full font-semibold uppercase tracking-wider text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'vacancy' 
                  ? 'bg-brand-dark text-white shadow-2xs' 
                  : 'text-brand-dark/70 hover:text-brand-dark hover:bg-brand-dark/[0.05]'
              }`}
            >
              <Briefcase size={13} />
              <span>{t('vacancies', 'Vacancies')}</span>
            </button>

            <button 
              onClick={() => setActiveTab('internship')}
              className={`px-4 py-1.5 rounded-full font-semibold uppercase tracking-wider text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'internship' 
                  ? 'bg-brand-dark text-white shadow-2xs' 
                  : 'text-brand-dark/70 hover:text-brand-dark hover:bg-brand-dark/[0.05]'
              }`}
            >
              <GraduationCap size={13} />
              <span>{t('internships', 'Internships')}</span>
            </button>

            <button 
              onClick={() => setActiveTab('volunteer')}
              className={`px-4 py-1.5 rounded-full font-semibold uppercase tracking-wider text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'volunteer' 
                  ? 'bg-brand-dark text-white shadow-2xs' 
                  : 'text-brand-dark/70 hover:text-brand-dark hover:bg-brand-dark/[0.05]'
              }`}
            >
              <Users size={13} />
              <span>{t('volunteers', 'Volunteers')}</span>
            </button>
          </div>

          <button 
            onClick={() => {
              if (activeTab === 'volunteer') {
                setShowVolunteerModal(true);
              } else {
                setActiveTab('post');
              }
            }}
            className={`px-4 sm:px-5 py-1.5 rounded-full font-semibold uppercase tracking-wider text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'post' 
                ? 'bg-brand-accent text-white shadow-2xs' 
                : 'text-brand-accent hover:bg-brand-accent/10 border border-brand-accent/20'
            }`}
          >
            <Plus size={13} />
            <span>
              {activeTab === 'volunteer' 
                ? '+ Волонтерство (Coyora Studio)' 
                : hasIncludedPlanAccess 
                  ? '+ Вакансия (Включено)' 
                  : singleJobCredits > 0 
                    ? `+ Вакансия (${singleJobCredits} слот)` 
                    : '+ Вакансия (7 AZN)'}
            </span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex flex-col md:flex-row gap-8">
        {activeTab === 'post' ? (
        <div className="w-full bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-10 shadow-xs max-w-3xl mx-auto animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-brand-accent px-3 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15 font-mono">
              Fashion Opportunities
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono text-brand-dark/50 uppercase tracking-wider">
              • Direct Placement
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal tracking-tight text-brand-dark mb-2">
            Post an Opportunity / <span className="italic text-brand-accent font-serif font-normal">Разместить вакансию</span>
          </h2>
          <p className="text-xs sm:text-sm text-brand-dark/70 font-normal mb-6 max-w-xl leading-relaxed">
            Reach top-tier fashion designers, stylists, runway models, stage coordinators, and creative talents across Azerbaijan.
          </p>

          {/* Pricing & Access Tier Status Banner */}
          {hasIncludedPlanAccess ? (
            <div className="mb-6 p-4 rounded-2xl bg-brand-muted/40 border border-brand-dark/[0.08] flex items-center gap-3 text-xs text-brand-dark">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Тариф {dbUser?.subscriptionTier === 'elite' ? 'FFAZ Elite VIP' : 'FFAZ Pro'}:</span> публикация вакансий бренда включена в вашу активную подписку.
              </div>
            </div>
          ) : singleJobCredits > 0 ? (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-800">
              <Sparkles size={18} className="text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Оплаченный слот доступен:</span> у вас есть <strong>{singleJobCredits}</strong> оплаченный слот для размещения вакансии. Слот будет использован при публикации.
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-2xl bg-brand-accent/5 border border-brand-accent/20 flex items-center gap-3 text-xs text-brand-dark">
              <ShieldCheck size={18} className="text-brand-accent shrink-0" />
              <div>
                <span className="font-bold">Тариф Free:</span> разовое коммерческое размещение вакансии стоит <strong>7 AZN</strong> на 30 дней. Окно защищенной оплаты откроется после заполнения формы.
              </div>
            </div>
          )}
          
          <form onSubmit={handlePostSubmit} className="flex flex-col gap-6">
            <div>
              <label className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/80 mb-2 block">
                Job Title / Должность *
              </label>
              <input 
                type="text" 
                required 
                value={postForm.title} 
                onChange={e => setPostForm({...postForm, title: e.target.value})} 
                className="w-full bg-brand-muted/40 border border-brand-dark/[0.12] rounded-xl p-3.5 text-sm font-medium text-brand-dark outline-none focus:border-brand-accent focus:bg-white transition-all placeholder:text-brand-dark/40" 
                placeholder="e.g. Senior Fashion Stylist / Backstage Coordinator" 
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/80 mb-2 block">
                  Company / Brand Name *
                </label>
                <input 
                  type="text" 
                  value={postForm.companyName} 
                  onChange={e => setPostForm({...postForm, companyName: e.target.value})} 
                  className="w-full bg-brand-muted/40 border border-brand-dark/[0.12] rounded-xl p-3.5 text-sm font-medium text-brand-dark outline-none focus:border-brand-accent focus:bg-white transition-all placeholder:text-brand-dark/40" 
                  placeholder="e.g. AYAN Couture / Baku Fashion Lab" 
                />
              </div>
              <div>
                <label className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/80 mb-2 block">
                  Location / Локация
                </label>
                <input 
                  type="text" 
                  value={postForm.location} 
                  onChange={e => setPostForm({...postForm, location: e.target.value})} 
                  className="w-full bg-brand-muted/40 border border-brand-dark/[0.12] rounded-xl p-3.5 text-sm font-medium text-brand-dark outline-none focus:border-brand-accent focus:bg-white transition-all placeholder:text-brand-dark/40" 
                  placeholder="e.g. Baku, AZ or Remote" 
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/80 mb-2 block">
                Category / Категория
              </label>
              <select 
                value={postForm.type} 
                onChange={e => {
                  const val = e.target.value;
                  setPostForm({...postForm, type: val});
                  if (val === 'volunteer') {
                    setShowVolunteerModal(true);
                  }
                }} 
                className="w-full bg-brand-muted/40 border border-brand-dark/[0.12] rounded-xl p-3.5 text-xs sm:text-sm font-medium text-brand-dark outline-none focus:border-brand-accent focus:bg-white transition-all"
              >
                <option value="vacancy">Vacancy (Вакансия)</option>
                <option value="internship">Internship (Стажировка)</option>
                <option value="volunteer">Volunteer (Волонтерство на показах • Coyora Studio)</option>
              </select>

              {postForm.type === 'volunteer' && (
                <div className="mt-3 p-4 bg-brand-accent/[0.05] border-2 border-brand-accent rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center text-brand-accent shrink-0 mt-0.5">
                      <ExternalLink size={16} />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-brand-accent">
                        [ОФИЦИАЛЬНАЯ КООРДИНАЦИЯ • COYORA STUDIO]
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-brand-dark leading-relaxed font-sans">
                        По делам волонтерства курирует компания <strong>Coyora Studio</strong> — настоятельно рекомендуется связаться с ними: <strong className="text-brand-accent">coyora.studio</strong>.
                      </p>
                    </div>
                  </div>

                  <a
                    href="https://coyora.studio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-dark text-white px-4 py-2.5 rounded-full font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs w-full sm:w-auto"
                  >
                    <span>Перейти на сайт coyora.studio</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/80 mb-2 block">
                Description & Requirements / Описание и требования *
              </label>
              <textarea 
                required 
                value={postForm.description} 
                onChange={e => setPostForm({...postForm, description: e.target.value})} 
                className="w-full bg-brand-muted/40 border border-brand-dark/[0.12] rounded-xl p-3.5 text-sm font-medium text-brand-dark outline-none focus:border-brand-accent focus:bg-white transition-all h-36 resize-none placeholder:text-brand-dark/40 leading-relaxed" 
                placeholder="Describe the role, key responsibilities, prerequisites and what you are looking for in fashion candidates..."
              />
            </div>

            {/* Custom Screening Questions Section */}
            <div className="rounded-2xl border border-brand-dark/[0.1] bg-brand-muted/30 p-5 sm:p-7 space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3.5 border-b border-brand-dark/[0.08]">
                <div>
                  <h3 className="text-sm sm:text-base font-serif font-normal uppercase tracking-wider text-brand-dark flex items-center gap-2">
                    <HelpCircle size={18} className="text-brand-accent" />
                    Applicant Screening Questions
                  </h3>
                  <p className="text-xs text-brand-dark/65 mt-0.5 font-normal">
                    Ask targeted questions candidates must answer during the application flow
                  </p>
                </div>
                <span className="bg-brand-accent/10 text-brand-accent px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider rounded-full border border-brand-accent/20">
                  {postForm.customQuestions?.length || 0} Questions
                </span>
              </div>

              {/* 1. Quick Preset Dropdown Menu */}
              <div className="space-y-2 bg-white rounded-xl border border-brand-dark/[0.08] p-4 shadow-2xs">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark flex items-center gap-1.5">
                  <Sparkles size={14} className="text-brand-accent" /> 
                  Quick Question Presets / Готовые шаблоны
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select 
                    value={selectedPresetIndex}
                    onChange={(e) => {
                      setSelectedPresetIndex(e.target.value);
                      if (e.target.value !== '') {
                        handleAddPresetQuestion(e.target.value);
                      }
                    }}
                    className="flex-1 bg-brand-muted/40 border border-brand-dark/[0.12] rounded-lg p-2.5 text-xs font-medium text-brand-dark outline-none focus:border-brand-accent cursor-pointer"
                  >
                    <option value="">-- Choose a ready question template to add instantly --</option>
                    {QUICK_QUESTION_PRESETS.map((preset, idx) => (
                      <option key={idx} value={idx}>
                        [{preset.type.toUpperCase()}] {preset.question}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Custom Question Input Menu */}
              <div className="space-y-3 bg-white rounded-xl border border-brand-dark/[0.08] p-4 shadow-2xs">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark flex items-center gap-1.5">
                  <ListPlus size={14} className="text-brand-accent" /> 
                  Write Custom Question / Свой вопрос кандидату
                </label>
                <input 
                  type="text" 
                  value={customQuestionText}
                  onChange={(e) => setCustomQuestionText(e.target.value)}
                  placeholder="e.g. What is your experience with CLO3D? / Can you travel for runway weeks?"
                  className="w-full bg-brand-muted/40 border border-brand-dark/[0.12] rounded-lg p-2.5 text-xs sm:text-sm font-medium text-brand-dark outline-none focus:border-brand-accent transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomQuestion();
                    }
                  }}
                />
                
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-brand-dark">
                      <span className="font-mono text-[11px] text-brand-dark/70 uppercase">Format:</span>
                      <select 
                        value={customQuestionType}
                        onChange={(e) => setCustomQuestionType(e.target.value as any)}
                        className="bg-brand-muted/50 border border-brand-dark/[0.12] rounded-md px-2.5 py-1 text-xs font-medium text-brand-dark"
                      >
                        <option value="text">Short Text</option>
                        <option value="textarea">Paragraph / Long Text</option>
                        <option value="yes_no">Yes / No (Да / Нет)</option>
                        <option value="number">Numeric (Число)</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-1.5 text-xs text-brand-dark cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={customQuestionRequired}
                        onChange={(e) => setCustomQuestionRequired(e.target.checked)}
                        className="w-3.5 h-3.5 accent-brand-accent rounded"
                      />
                      <span className="font-medium text-[11px]">Required</span>
                    </label>
                  </div>

                  <button 
                    type="button"
                    onClick={handleAddCustomQuestion}
                    className="bg-brand-dark hover:bg-brand-accent text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-full transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <Plus size={13} /> 
                    <span>Add Question</span>
                  </button>
                </div>
              </div>

              {/* 3. List of Active Configured Questions */}
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark/70 block">
                  Configured Questions for Applicants:
                </label>
                {(!postForm.customQuestions || postForm.customQuestions.length === 0) ? (
                  <div className="p-4 border border-dashed border-brand-dark/20 rounded-xl bg-white text-center text-xs text-brand-dark/50 font-normal">
                    No screening questions added yet. Use the dropdown presets or write a custom question above.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {postForm.customQuestions.map((q, idx) => (
                      <div 
                        key={q.id} 
                        className="bg-white rounded-xl border border-brand-dark/[0.08] p-3 flex items-start sm:items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                          <span className="bg-brand-accent/10 text-brand-accent font-mono font-bold text-[10px] px-2 py-0.5 rounded-full shrink-0 border border-brand-accent/20">
                            Q{idx + 1}
                          </span>
                          <span className="font-medium text-xs sm:text-sm text-brand-dark truncate flex-1">
                            {q.question}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="bg-brand-muted text-brand-dark/70 text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border border-brand-dark/[0.06]">
                            {q.type}
                          </span>
                          <button 
                            type="button"
                            onClick={() => handleToggleQuestionRequired(q.id)}
                            className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full transition-colors ${
                              q.required ? 'bg-brand-dark text-white' : 'bg-brand-muted text-brand-dark/50 hover:text-brand-dark'
                            }`}
                            title="Toggle required / optional"
                          >
                            {q.required ? 'Required' : 'Optional'}
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleRemoveQuestion(q.id)}
                            className="text-brand-dark/40 hover:text-brand-accent p-1 transition-colors"
                            title="Remove question"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-brand-accent hover:bg-brand-dark text-white p-4 font-semibold uppercase tracking-wider text-xs sm:text-sm rounded-full transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              <span>
                {hasIncludedPlanAccess 
                  ? 'Опубликовать вакансию (Включено в план)' 
                  : singleJobCredits > 0 
                    ? `Опубликовать (Использовать оплаченный слот: ${singleJobCredits})` 
                    : 'Перейти к оплате и публикации (7 AZN)'}
              </span>
            </button>
          </form>
        </div>
      ) : (
 <>
 {/* Sidebar */}
 <div className="w-full md:w-1/4 flex flex-col gap-4">
 <div className="bg-brand-light border-2 border-brand-dark p-6 card-brutal">
 <h2 className="font-bold uppercase tracking-widest border-b-2 border-brand-dark pb-2 mb-4">Filters</h2>
 
 <div className="space-y-4">
 <div>
 <label className="text-xs font-bold uppercase tracking-widest text-brand-dark/50 block mb-2">Location / Keyword</label>
 <div className="flex items-center gap-2 border-2 border-brand-dark px-2 bg-brand-light">
 <MapPin size={16} className="text-brand-dark/60" />
 <input 
 type="text" 
 value={searchLocation}
 onChange={e => setSearchLocation(e.target.value)}
 placeholder="Baku, remote, stylist..." 
 className="w-full py-2 outline-none font-bold text-sm bg-transparent" 
 />
 {searchLocation && (
 <button 
 type="button"
 onClick={() => setSearchLocation('')}
 className="text-xs font-bold text-brand-dark/50 hover:text-brand-dark p-1"
 >
 <X size={14} />
 </button>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Feed */}
 <div className="w-full md:w-3/4 flex flex-col gap-4">
 {activeTab === 'volunteer' && (
 <div className="bg-brand-accent/[0.04] border-2 border-brand-accent rounded-3xl p-6 sm:p-7 space-y-3.5 shadow-2xs">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="space-y-1.5 flex-1">
 <div className="flex items-center gap-2">
 <span className="bg-brand-accent text-white font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full">
 Официальный партнер • Coyora Studio
 </span>
 </div>
 <h3 className="font-serif text-xl sm:text-2xl font-normal tracking-tight text-brand-dark">
 Координация волонтерских программ на показах
 </h3>
 <p className="text-xs sm:text-sm text-brand-dark/80 font-normal leading-relaxed font-sans">
 По делам волонтерства курирует компания <strong>Coyora Studio</strong> — для размещения волонтерских позиций и участия в показах настоятельно рекомендуется связаться с ними: <strong className="text-brand-accent">coyora.studio</strong>.
 </p>
 </div>

 <a
 href="https://coyora.studio"
 target="_blank"
 rel="noopener noreferrer"
 className="shrink-0 bg-brand-dark hover:bg-brand-accent text-white px-5 py-3 rounded-full font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
 >
 <span>Перейти на сайт coyora.studio</span>
 <ExternalLink size={14} className="text-amber-300" />
 </a>
 </div>
 </div>
 )}
 {filteredJobs.length === 0 ? (
 <div className="bg-white rounded-3xl border border-dashed border-brand-dark/20 p-12 text-center font-mono text-xs uppercase tracking-wider text-brand-dark/50 shadow-2xs">
 {searchLocation ? 'No opportunities match your filter.' : 'No openings found.'}
 </div>
 ) : (
 filteredJobs.map((job, index) => (
 <motion.div 
 key={job.id}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: index * 0.08 }}
 onClick={() => setSelectedJobDetails(job)}
 className="bg-brand-light border-2 border-brand-dark p-6 card-brutal hover:-translate-y-1 hover:-translate-x-1 transition-all group relative cursor-pointer"
 >
 <div className="flex justify-between items-start gap-3 mb-2.5">
 <div className="space-y-1 min-w-0 flex-1">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="bg-brand-dark text-brand-light px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
 {job.type || 'Vacancy'}
 </span>
 {job.createdAt && (
 <span className="text-[11px] font-bold text-brand-dark/50 uppercase tracking-wider">
 {new Date(job.createdAt.seconds * 1000).toLocaleDateString()}
 </span>
 )}
 </div>
 <h3 className="text-xl font-bold uppercase tracking-tight text-brand-dark group-hover:text-brand-accent transition-colors">
 {job.title}
 </h3>

 {/* Company / Brand Name display */}
 <div className="pt-1 flex items-center gap-2 flex-wrap">
 {canApplyAndSeeEmployers ? (
 <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-brand-dark bg-brand-muted/80 px-2 py-0.5 border border-brand-dark/30">
 <Building2 size={13} className="text-brand-accent shrink-0" />
 <span>{job.companyName || job.employerName || 'Fashion House'}</span>
 </div>
 ) : (
 <div className="flex items-center gap-2 flex-wrap">
 <span className="filter blur-[4.5px] select-none text-xs font-black uppercase text-brand-dark/70 pointer-events-none bg-brand-muted px-2.5 py-0.5 border border-brand-dark/20 inline-block">
 {job.companyName || job.employerName || 'Fashion Brand Name'}
 </span>
 <span className="text-[10px] font-black uppercase tracking-wider text-[#c1ff72] bg-brand-dark px-2 py-0.5 border border-brand-dark flex items-center gap-1">
 <Lock size={10} /> {t('locked_employer', 'Бренд скрыт (Free)')}
 </span>
 </div>
 )}
 </div>
 </div>
 </div>
 
 <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-widest text-brand-dark/70 mb-4 mt-2">
 <span className="flex items-center gap-1.5 bg-brand-muted/70 px-2 py-1 border border-brand-dark/30">
 <MapPin size={13} className="text-brand-accent shrink-0" /> {job.location || 'Baku, Azerbaijan'}
 </span>
 {job.customQuestions?.length > 0 && (
 <span className="bg-brand-muted border border-brand-dark px-2 py-1 text-[11px] font-bold text-brand-dark flex items-center gap-1">
 <HelpCircle size={12} /> {job.customQuestions.length} {t('screening_questions_included', 'Screening Questions')}
 </span>
 )}
 </div>
 
 <p className="text-brand-dark/80 text-sm font-normal mb-5 line-clamp-3 leading-relaxed">
 {job.description}
 </p>
 
 <div className="flex items-center justify-between pt-3 border-t-2 border-brand-dark/10">
 <button 
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setSelectedJobDetails(job);
 }}
 className="bg-brand-dark text-[#c1ff72] px-5 py-2.5 font-bold uppercase tracking-widest text-xs border-2 border-brand-dark hover:bg-brand-accent hover:text-brand-dark hover:border-brand-accent transition-all flex items-center gap-2"
 >
 <span>{t('view_job_details', 'View Details')} & {job.type === 'volunteer' ? 'Sign Up' : t('apply_now', 'Apply')}</span>
 <ArrowRight size={14} />
 </button>

 <span className="text-[11px] font-bold uppercase tracking-wider text-brand-dark/50 group-hover:text-brand-dark transition-colors hidden sm:inline-flex items-center gap-1">
 <span>{t('view_job_details', 'View Details')}</span>
 <ChevronRight size={14} />
 </span>
 </div>
 </motion.div>
 ))
 )}
 </div>
 </>
 )}
 </div>

 {/* Vacancy Details Modal with Complete Author Information & Apply CTA */}
 {selectedJobDetails && (
 <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 overflow-y-auto">
 <div 
 className="fixed inset-0 bg-brand-dark/75 backdrop-blur-md transition-opacity" 
 onClick={() => setSelectedJobDetails(null)}
 />
 
 <div className="relative z-10 bg-white rounded-3xl border border-brand-dark/[0.08] max-w-2xl w-full my-8 max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
 {/* Modal Header */}
 <div className="p-6 sm:p-8 border-b border-brand-dark/[0.08] bg-white flex items-start justify-between gap-4 shrink-0">
 <div className="space-y-2 flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="bg-brand-dark text-[#c1ff72] px-2.5 py-0.5 text-xs font-black uppercase tracking-widest border border-brand-dark">
 {selectedJobDetails.type || 'Vacancy'}
 </span>
 <span className="bg-brand-muted text-brand-dark px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border border-brand-dark/40 flex items-center gap-1">
 <Calendar size={12} />
 {selectedJobDetails.createdAt ? new Date(selectedJobDetails.createdAt.seconds * 1000).toLocaleDateString() : 'Active Opportunity'}
 </span>
 </div>
 
 <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark leading-tight">
 {selectedJobDetails.title}
 </h2>

 {/* Company banner */}
 <div className="pt-2">
 {canApplyAndSeeEmployers ? (
 <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-brand-dark bg-brand-muted/80 px-3 py-1.5 border-2 border-brand-dark">
 <Building2 size={15} className="text-brand-accent shrink-0" />
 <span>{selectedJobDetails.companyName || selectedJobDetails.employerName || 'Fashion Brand'}</span>
 </div>
 ) : (
 <div className="p-3 bg-brand-muted/40 border-2 border-dashed border-brand-dark flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div className="flex items-center gap-2">
 <span className="filter blur-[4.5px] select-none text-xs font-black uppercase text-brand-dark/60 pointer-events-none bg-brand-muted px-2.5 py-1 border border-brand-dark/20 inline-block">
 {selectedJobDetails.companyName || selectedJobDetails.employerName || 'Haute Couture House'}
 </span>
 <span className="text-[10px] font-black uppercase tracking-wider text-[#c1ff72] bg-brand-dark px-2 py-0.5 flex items-center gap-1">
 <Lock size={10} /> Скрыто для Free
 </span>
 </div>
 <button
 type="button"
 onClick={() => {
 setSelectedJobDetails(null);
 setShowUpgradePlanModal(true);
 }}
 className="text-xs font-black uppercase tracking-widest text-brand-accent hover:underline flex items-center gap-1"
 >
 Узнать контакты и откликнуться на тарифе Pro →
 </button>
 </div>
 )}
 </div>
 
 <div className="flex items-center gap-4 flex-wrap text-xs font-bold uppercase tracking-widest text-brand-dark/70 pt-1">
 <span className="flex items-center gap-1.5 bg-brand-muted/70 px-2.5 py-1 border border-brand-dark/30">
 <MapPin size={14} className="text-brand-accent shrink-0" />
 {selectedJobDetails.location || 'Baku, Azerbaijan'}
 </span>
 {selectedJobDetails.customQuestions?.length > 0 && (
 <span className="flex items-center gap-1.5 bg-[#c1ff72]/40 border border-brand-dark px-2.5 py-1 text-[11px] font-bold text-brand-dark">
 <HelpCircle size={13} /> {selectedJobDetails.customQuestions.length} {t('screening_questions_included', 'Screening Questions')}
 </span>
 )}
 </div>
 </div>

 <button 
 type="button"
 onClick={() => setSelectedJobDetails(null)}
 className="p-2 border-2 border-brand-dark bg-brand-muted hover:bg-brand-dark hover:text-brand-light transition-colors shrink-0"
 aria-label="Close details"
 >
 <X size={20} />
 </button>
 </div>

 {/* Modal Scrollable Body with Author's Full Description & Information */}
 <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 bg-brand-muted/15">
 <div className="space-y-3">
 <div className="flex items-center justify-between gap-2 border-b-2 border-brand-dark/20 pb-2">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-dark">
 <FileText size={16} className="text-brand-dark" />
 <span>{t('job_description_label', 'Role Description & Requirements')}</span>
 </div>
 </div>

 <div className="bg-brand-light border-2 border-brand-dark p-5 sm:p-6">
 <p className="text-brand-dark font-normal leading-relaxed text-sm sm:text-base whitespace-pre-wrap">
 {selectedJobDetails.description}
 </p>
 </div>
 </div>

 {/* Author Screening Questionnaire Information Box */}
 {selectedJobDetails.customQuestions && selectedJobDetails.customQuestions.length > 0 && (
 <div className="border-2 border-brand-dark bg-brand-light p-4 space-y-2">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark">
 <HelpCircle size={16} className="text-brand-accent shrink-0" />
 <span>{t('screening_questions_included', 'Screening Questions')} ({selectedJobDetails.customQuestions.length})</span>
 </div>
 <p className="text-xs text-brand-dark/70 font-medium leading-relaxed">
 The author of this vacancy has added {selectedJobDetails.customQuestions.length} questions for candidates. You will be able to answer them when applying.
 </p>
 </div>
 )}
 </div>

 {/* Modal Footer / Action CTA */}
 <div className="p-4 sm:p-6 border-t-3 border-brand-dark bg-brand-light flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
 <button
 type="button"
 onClick={() => setSelectedJobDetails(null)}
 className="w-full sm:w-auto px-5 py-3 border-2 border-brand-dark bg-transparent text-brand-dark font-bold uppercase tracking-widest text-xs hover:bg-brand-muted transition-colors"
 >
 {t('close', 'Close')}
 </button>

 <button
 type="button"
 onClick={() => {
 const job = selectedJobDetails;
 setSelectedJobDetails(null);
 handleApply(job);
 }}
 className="w-full sm:w-auto flex-1 bg-brand-dark text-[#c1ff72] border-2 border-brand-dark px-6 py-3.5 font-bold uppercase tracking-widest text-sm hover:bg-brand-accent hover:text-brand-dark hover:border-brand-accent transition-all flex items-center justify-center gap-2"
 >
 <span>{selectedJobDetails.type === 'volunteer' ? 'Sign Up via Partner Site' : t('apply_now', 'Apply for this Role')}</span>
 <ArrowRight size={16} />
 </button>
 </div>
 </div>
 </div>
 )}

 {showPayment && (
  <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
    <div className="relative z-10 bg-brand-card rounded-3xl border border-brand-dark/[0.12] p-6 sm:p-8 max-w-lg w-full shadow-2xl my-8 animate-in zoom-in-95 duration-200">
      
      {/* Close button */}
      <button 
        type="button" 
        onClick={() => {
          if (postStatus !== 'processing') {
            setShowPayment(false);
          }
        }} 
        className="absolute top-6 right-6 w-8 h-8 rounded-full border border-brand-dark/15 flex items-center justify-center hover:bg-brand-muted transition-colors cursor-pointer text-brand-dark"
      >
        <X size={16} />
      </button>

      {postStatus === 'processing' || postStatus === 'success' ? (
        <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
          {postStatus === 'processing' ? (
            <>
              <div className="w-14 h-14 rounded-full border-4 border-brand-accent/20 border-t-brand-accent animate-spin mb-5"></div>
              <h4 className="text-xl font-serif font-bold text-brand-dark mb-2">
                Авторизация платежа (7 AZN)...
              </h4>
              <p className="text-xs font-mono text-brand-dark/60 max-w-sm">
                Выполняется защищенное списание через банковский шлюз 3D Secure.
              </p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 mb-4">
                <CheckCircle2 size={28} />
              </div>
              <h4 className="text-2xl font-serif font-bold text-brand-dark mb-1">
                Оплата 7 AZN прошла успешно!
              </h4>
              <p className="text-xs text-brand-dark/70 max-w-sm">
                Вакансия опубликована в официальном каталоге «Карьера».
              </p>
            </>
          )}
        </div>
      ) : (
        <form onSubmit={(e) => {
          e.preventDefault();
          processPayment();
        }}>
          {/* Header */}
          <div className="mb-5 pb-4 border-b border-brand-dark/[0.08]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-accent px-2 py-0.5 rounded-full bg-brand-accent/10">
                Разовое размещение • 30 дней
              </span>
            </div>
            <h3 className="text-2xl font-serif font-bold text-brand-dark">
              Оплата публикации вакансии
            </h3>
            <p className="text-xs text-brand-dark/65 mt-0.5">
              Прямой сбор откликов и анкет кандидатов модной индустрии
            </p>
          </div>

          {/* Item Breakdown */}
          <div className="bg-white rounded-2xl border border-brand-dark/[0.08] p-4 mb-4 shadow-2xs flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand-dark/50 font-bold block">
                Услуга
              </span>
              <h4 className="text-sm font-serif font-bold text-brand-dark">
                {postForm.title || 'Размещение вакансии / кастинга'}
              </h4>
              <p className="text-[11px] text-brand-dark/60">
                1 публикация на 30 дней • {postForm.companyName || 'Бренд / Модный дом'}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-2xl font-display font-bold text-brand-accent">7</span>
              <span className="text-xs font-mono font-bold text-brand-dark ml-1">AZN</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="mb-4">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-brand-dark/70 font-bold mb-1.5">
              Способ оплаты
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-2.5 rounded-xl border text-center font-mono text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  paymentMethod === 'card' 
                    ? 'border-brand-accent bg-brand-accent/5 text-brand-dark font-bold ring-2 ring-brand-accent/20' 
                    : 'border-brand-dark/[0.1] bg-white text-brand-dark/70 hover:bg-brand-muted/20'
                }`}
              >
                <CreditCard size={16} className={paymentMethod === 'card' ? 'text-brand-accent' : 'text-brand-dark/60'} />
                <span className="text-[10px]">Карта</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('birbank')}
                className={`p-2.5 rounded-xl border text-center font-mono text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  paymentMethod === 'birbank' 
                    ? 'border-brand-accent bg-brand-accent/5 text-brand-dark font-bold ring-2 ring-brand-accent/20' 
                    : 'border-brand-dark/[0.1] bg-white text-brand-dark/70 hover:bg-brand-muted/20'
                }`}
              >
                <Smartphone size={16} className={paymentMethod === 'birbank' ? 'text-brand-accent' : 'text-brand-dark/60'} />
                <span className="text-[10px]">Birbank</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('apple_pay')}
                className={`p-2.5 rounded-xl border text-center font-mono text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  paymentMethod === 'apple_pay' 
                    ? 'border-brand-accent bg-brand-accent/5 text-brand-dark font-bold ring-2 ring-brand-accent/20' 
                    : 'border-brand-dark/[0.1] bg-white text-brand-dark/70 hover:bg-brand-muted/20'
                }`}
              >
                <Sparkles size={16} className={paymentMethod === 'apple_pay' ? 'text-brand-accent' : 'text-brand-dark/60'} />
                <span className="text-[10px]">Apple Pay</span>
              </button>
            </div>
          </div>

          {/* Card Inputs */}
          <div className="space-y-3 mb-4 text-xs font-mono">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-brand-dark/70 font-bold mb-1">
                Имя держателя карты *
              </label>
              <input 
                type="text" 
                required
                value={paymentCardHolder}
                onChange={e => setPaymentCardHolder(e.target.value)}
                placeholder="Əli Əliyev Əli"
                className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2.5 text-xs font-mono uppercase text-brand-dark outline-none focus:border-brand-accent transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-brand-dark/70 font-bold mb-1">
                Номер карты *
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  required
                  value={paymentCardNumber}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
                    setPaymentCardNumber(raw.replace(/(\d{4})(?=\d)/g, '$1 '));
                  }}
                  placeholder="4169 7400 0000 0000"
                  maxLength={19}
                  className="w-full bg-white border border-brand-dark/[0.12] rounded-xl pl-3.5 pr-16 py-2.5 text-xs font-mono text-brand-dark outline-none focus:border-brand-accent transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-brand-dark/40 uppercase">
                  VISA • MC
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-brand-dark/70 font-bold mb-1">
                  Срок (MM/YY) *
                </label>
                <input 
                  type="text" 
                  required
                  value={paymentCardExpiry}
                  onChange={e => {
                    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
                    if (raw.length >= 3) raw = raw.slice(0, 2) + '/' + raw.slice(2);
                    setPaymentCardExpiry(raw);
                  }}
                  placeholder="12/28"
                  maxLength={5}
                  className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2.5 text-xs font-mono text-brand-dark outline-none focus:border-brand-accent transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-brand-dark/70 font-bold mb-1">
                  CVV / CVC *
                </label>
                <input 
                  type="password" 
                  required
                  value={paymentCardCvc}
                  onChange={e => setPaymentCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="•••"
                  maxLength={4}
                  className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2.5 text-xs font-mono text-brand-dark outline-none focus:border-brand-accent transition-all"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-brand-muted/40 rounded-xl border border-brand-dark/[0.06] flex items-center gap-2 text-[11px] text-brand-dark/70 mb-5">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>Безопасный 3D Secure расчет (Leobank, Birbank, ABB, Pasha Bank).</span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowPayment(false)}
              className="px-5 py-2.5 rounded-full border border-brand-dark/20 text-xs font-semibold uppercase tracking-wider text-brand-dark hover:bg-brand-muted transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-7 py-2.5 rounded-full bg-brand-accent hover:bg-brand-dark text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <Lock size={13} />
              <span>Оплатить 7 AZN</span>
            </button>
          </div>
        </form>
      )}

    </div>
  </div>
 )}

 {/* Upgrade Plan Modal */}
 {showUpgradePlanModal && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-xs" onClick={() => setShowUpgradePlanModal(false)}></div>
 <div className="relative z-10 bg-brand-light border-4 border-brand-dark p-6 sm:p-8 max-w-lg w-full card-brutal text-center animate-in fade-in zoom-in-95 duration-150">
 <div className="w-14 h-14 bg-brand-dark text-[#c1ff72] border-2 border-brand-dark mx-auto flex items-center justify-center mb-4">
 <Lock size={26} />
 </div>
 <h3 className="text-2xl font-black uppercase tracking-tight text-brand-dark mb-2">
 Доступно на тарифе Pro и Elite VIP
 </h3>
 <p className="text-sm font-bold text-brand-dark/75 mb-6 leading-relaxed">
 На тарифе <span className="font-black text-brand-dark">Free</span> вакансии доступны только для ознакомления (название бренда скрыто). Чтобы видеть прямого работодателя и отправлять отклики со своим портфолио, перейдите на тариф <span className="text-[#7a0000] font-black">FFAZ Pro (25 AZN)</span> или <span className="text-[#7a0000] font-black">FFAZ Elite VIP</span>.
 </p>
 <div className="flex flex-col gap-3">
 <button
 onClick={() => {
 setShowUpgradePlanModal(false);
 navigate('/plans');
 }}
 className="w-full bg-brand-dark text-[#c1ff72] border-2 border-brand-dark px-5 py-4 font-black uppercase tracking-widest hover:bg-brand-accent hover:text-brand-dark transition-all text-xs flex items-center justify-center gap-2"
 >
 <span>Посмотреть тарифы и подключить</span>
 <ArrowRight size={14} />
 </button>
 <button
 onClick={() => setShowUpgradePlanModal(false)}
 className="w-full bg-transparent text-brand-dark border-2 border-brand-dark px-4 py-3 font-bold uppercase tracking-widest hover:bg-brand-muted transition-colors text-xs"
 >
 Закрыть
 </button>
 </div>
 </div>
 </div>
 )}

 {showVolunteerModal && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm" onClick={() => setShowVolunteerModal(false)}></div>
 <div className="relative z-10 bg-brand-light border-4 border-brand-dark p-8 md:p-10 max-w-lg w-full card-brutal text-center space-y-4 shadow-2xl">
 <div className="w-12 h-12 rounded-full bg-brand-accent/10 border-2 border-brand-accent text-brand-accent flex items-center justify-center mx-auto">
 <ExternalLink size={24} />
 </div>
 <h3 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-dark">
 Волонтерские программы • Coyora Studio
 </h3>
 <p className="text-brand-dark font-medium leading-relaxed text-sm font-sans">
 По делам волонтерства курирует компания <strong>Coyora Studio</strong> — настоятельно рекомендуется связаться с ними: <strong className="text-brand-accent">coyora.studio</strong>.
 </p>
 <div className="flex flex-col gap-3 pt-2">
 <a 
 href="https://coyora.studio" 
 target="_blank" 
 rel="noopener noreferrer" 
 onClick={() => setShowVolunteerModal(false)}
 className="w-full bg-brand-accent text-white border-2 border-brand-dark px-4 py-3.5 font-bold uppercase tracking-widest text-xs hover:bg-brand-dark transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
 >
 <span>Перейти на сайт coyora.studio</span>
 <ExternalLink size={14} />
 </a>
 <button 
 onClick={() => setShowVolunteerModal(false)}
 className="w-full bg-transparent text-brand-dark border-2 border-brand-dark px-4 py-3 font-bold uppercase tracking-widest text-xs hover:bg-brand-dark hover:text-white transition-colors cursor-pointer"
 >
 Закрыть
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Applying Job Modal with Dynamic Screening Questions */}
 {applyingJob && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
 <div className="fixed inset-0 bg-brand-dark/80 backdrop-blur-xs" onClick={() => !applyStatus && setApplyingJob(null)}></div>
 <div className="relative z-10 bg-brand-light border-4 border-brand-dark p-6 md:p-8 max-w-xl w-full card-brutal my-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
 <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b-2 border-brand-dark/20">
 <div>
 <h3 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-dark">
 Apply for {applyingJob.title}
 </h3>
 <p className="text-xs font-bold uppercase tracking-widest text-brand-dark/60 mt-1">
 {applyingJob.location || 'Remote'} • {applyingJob.type}
 </p>
 </div>
 <button
 type="button"
 onClick={() => !applyStatus && setApplyingJob(null)}
 className="p-1.5 border-2 border-brand-dark bg-brand-muted hover:bg-brand-dark hover:text-brand-light transition-colors shrink-0"
 >
 <X size={18} />
 </button>
 </div>

 <form onSubmit={submitApplication} className="flex flex-col gap-4">
 <div>
 <label className="text-xs font-bold uppercase tracking-widest text-brand-dark mb-1 block">Full Name *</label>
 <input type="text" required placeholder="Əli Əliyev Əli" value={applyForm.name} onChange={e => setApplyForm({...applyForm, name: e.target.value})} className="w-full bg-brand-muted border-2 border-brand-dark p-3.5 font-bold uppercase tracking-widest text-sm outline-none focus:bg-brand-light" />
 </div>

 <div>
 <label className="text-xs font-bold uppercase tracking-widest text-brand-dark mb-1 block">Email Address *</label>
 <input type="email" required placeholder="you@example.com" value={applyForm.email} onChange={e => setApplyForm({...applyForm, email: e.target.value})} className="w-full bg-brand-muted border-2 border-brand-dark p-3.5 font-bold tracking-wide text-sm outline-none focus:bg-brand-light" />
 </div>

 <div>
 <label className="text-xs font-bold uppercase tracking-widest text-brand-dark mb-1 block">Cover Letter (Optional)</label>
 <textarea placeholder="Introduce yourself and share why you are a great fit..." value={applyForm.coverLetter} onChange={e => setApplyForm({...applyForm, coverLetter: e.target.value})} className="w-full bg-brand-muted border-2 border-brand-dark p-3.5 font-bold tracking-wide text-sm h-24 resize-none outline-none focus:bg-brand-light"></textarea>
 </div>
 
 <div>
 <label className="text-xs font-bold uppercase tracking-widest text-brand-dark mb-1 block">Resume / CV (PDF)</label>
 <div className="w-full bg-brand-muted border-2 border-brand-dark p-3 font-bold uppercase tracking-widest text-xs flex items-center justify-between">
 <span className="truncate mr-2">{applyForm.cvUrl ? '✓ CV Attached' : 'Attach PDF CV'}</span>
 <label className="cursor-pointer bg-brand-dark text-brand-light px-3.5 py-1.5 hover:bg-brand-accent transition-colors text-xs font-bold shrink-0">
 {applyForm.cvUrl ? 'Change CV' : 'Upload CV'}
 <input type="file" accept="application/pdf" className="hidden" onChange={async (e) => {
 if (e.target.files && e.target.files[0]) {
 setApplyStatus('submitting');
 const url = await handleFileUpload(e.target.files[0]);
 if (url) {
 setApplyForm({...applyForm, cvUrl: url});
 }
 setApplyStatus('');
 }
 }} />
 </label>
 </div>
 </div>

 {/* Dynamic Screening Questions from Employer */}
 {applyingJob.customQuestions && applyingJob.customQuestions.length > 0 && (
 <div className="border-3 border-brand-dark bg-brand-muted/40 p-4 sm:p-5 space-y-4 mt-2">
 <div className="flex items-center gap-2 pb-2 border-b-2 border-brand-dark/20">
 <HelpCircle size={18} className="text-brand-dark" />
 <h4 className="font-bold uppercase tracking-widest text-xs text-brand-dark">
 Employer Screening Questions ({applyingJob.customQuestions.length})
 </h4>
 </div>

 <div className="space-y-4">
 {applyingJob.customQuestions.map((q: CustomQuestion, idx: number) => (
 <div key={q.id || idx} className="space-y-1.5 bg-brand-light border-2 border-brand-dark p-3.5">
 <label className="font-bold text-xs uppercase tracking-wider text-brand-dark block">
 <span className="text-brand-dark/60 mr-1.5">Q{idx + 1}.</span>
 {q.question} {q.required && <span className="text-red-500">*</span>}
 </label>

 {/* Render appropriate input based on question type */}
 {q.type === 'textarea' ? (
 <textarea
 required={q.required}
 value={applyAnswers[q.id] || ''}
 onChange={(e) => setApplyAnswers({ ...applyAnswers, [q.id]: e.target.value })}
 placeholder="Write your answer..."
 className="w-full bg-brand-muted border-2 border-brand-dark p-2.5 text-xs font-semibold text-brand-dark h-20 resize-none outline-none focus:bg-brand-light"
 />
 ) : q.type === 'yes_no' ? (
 <div className="flex gap-3 pt-1">
 {['Yes', 'No'].map((choice) => (
 <label 
 key={choice}
 className={`flex-1 py-2 px-3 border-2 border-brand-dark text-xs font-bold uppercase tracking-wider text-center cursor-pointer transition-colors ${
 (applyAnswers[q.id] || 'Yes') === choice 
 ? 'bg-brand-dark text-[#c1ff72]' 
 : 'bg-brand-muted text-brand-dark hover:bg-brand-muted/60'
 }`}
 >
 <input 
 type="radio" 
 name={`q_${q.id}`} 
 value={choice} 
 checked={(applyAnswers[q.id] || 'Yes') === choice}
 onChange={() => setApplyAnswers({ ...applyAnswers, [q.id]: choice })}
 className="hidden"
 />
 {choice}
 </label>
 ))}
 </div>
 ) : q.type === 'number' ? (
 <input
 type="number"
 required={q.required}
 value={applyAnswers[q.id] || ''}
 onChange={(e) => setApplyAnswers({ ...applyAnswers, [q.id]: e.target.value })}
 placeholder="e.g. 3"
 className="w-full bg-brand-muted border-2 border-brand-dark p-2.5 text-xs font-bold text-brand-dark outline-none focus:bg-brand-light"
 />
 ) : (
 <input
 type="text"
 required={q.required}
 value={applyAnswers[q.id] || ''}
 onChange={(e) => setApplyAnswers({ ...applyAnswers, [q.id]: e.target.value })}
 placeholder="Your answer..."
 className="w-full bg-brand-muted border-2 border-brand-dark p-2.5 text-xs font-semibold text-brand-dark outline-none focus:bg-brand-light"
 />
 )}
 </div>
 ))}
 </div>
 </div>
 )}

 <button disabled={applyStatus === 'submitting' || applyStatus === 'success'} className="w-full bg-brand-dark text-brand-light border-2 border-brand-dark px-4 py-4 font-bold uppercase tracking-widest hover:bg-brand-accent hover:border-brand-accent transition-colors mt-2 disabled:opacity-50">
 {applyStatus === 'submitting' ? 'Submitting...' : (applyStatus === 'success' ? 'Application Sent!' : 'Submit Application')}
 </button>
 {applyStatus === 'error' && <p className="text-red-500 font-bold uppercase text-xs tracking-widest text-center mt-1">Error submitting application. Please try again.</p>}
 {!applyStatus || applyStatus === 'error' ? (
 <button type="button" onClick={() => setApplyingJob(null)} className="w-full bg-transparent text-brand-dark border-2 border-brand-dark px-4 py-3 font-bold uppercase tracking-widest hover:bg-brand-muted transition-colors">
 Cancel
 </button>
 ) : null}
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
