import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, collection, getDocs, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { DEFAULT_AGENCIES } from '../data/defaultAgencies';
import { DEFAULT_DESIGNERS } from '../data/defaultDesigners';
import { Sparkles, Building2, User, ShieldCheck, Scissors, Award, Check, Upload, FileText, Phone, MapPin, Globe, Instagram } from 'lucide-react';
import ModelVerifiedBadge from '../components/ModelVerifiedBadge';
import AgencyBadge from '../components/AgencyBadge';
import GoldenNeedleBadge from '../components/GoldenNeedleBadge';
import { uploadMediaFile } from '../lib/upload';

export default function Onboarding() {
 const { currentUser, dbUser } = useAuth();
 const navigate = useNavigate();

 const [industry, setIndustry] = useState('');
 const [degree, setDegree] = useState('');
 const [interestLevel, setInterestLevel] = useState('');
 const [ageGroup, setAgeGroup] = useState('');
 const [primaryGoal, setPrimaryGoal] = useState('');

 // Model & Agency fields
 const [agenciesList, setAgenciesList] = useState<Array<{ id?: string; name: string }>>([]);
 const [selectedAgency, setSelectedAgency] = useState('');
 const [customAgencyName, setCustomAgencyName] = useState('');

 // Agency representative specific fields
 const [agencyRole, setAgencyRole] = useState('director');

 // Designer specific fields
 const [designersList, setDesignersList] = useState<Array<{ id?: string; name: string; designerName?: string }>>([]);
 const [selectedDesignerBrand, setSelectedDesignerBrand] = useState('');
 const [customDesignerBrandName, setCustomDesignerBrandName] = useState('');
 const [designerRole, setDesignerRole] = useState('Creative Director / Head Designer');

 const [submitting, setSubmitting] = useState(false);

 useEffect(() => {
 if (!currentUser) {
 navigate('/login');
 return;
 }
 const checkOnboarding = async () => {
 try {
 const d = await getDoc(doc(db, 'users', currentUser.uid));
 if (d.exists() && d.data().onboardingComplete) {
 navigate('/');
 }
 } catch (e) {}
 };
 checkOnboarding();

 // Fetch existing agencies from Firestore or use defaults
 const loadAgencies = async () => {
 try {
 const snap = await getDocs(collection(db, 'agencies'));
 if (!snap.empty) {
 const list = snap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
 setAgenciesList(list);
 } else {
 setAgenciesList(DEFAULT_AGENCIES.map(a => ({ name: a.name })));
 }
 } catch (err) {
 setAgenciesList(DEFAULT_AGENCIES.map(a => ({ name: a.name })));
 }
 };
 loadAgencies();

 // Fetch existing designers from Firestore or use defaults
 const loadDesigners = async () => {
 try {
 const snap = await getDocs(collection(db, 'designers'));
 if (!snap.empty) {
 const list = snap.docs.map(doc => ({ id: doc.id, name: doc.data().name, designerName: doc.data().designerName }));
 list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
 setDesignersList(list);
 } else {
 setDesignersList(DEFAULT_DESIGNERS.map(d => ({ name: d.name, designerName: d.designerName })));
 }
 } catch (err) {
 setDesignersList(DEFAULT_DESIGNERS.map(d => ({ name: d.name, designerName: d.designerName })));
 }
 };
 loadDesigners();
 }, [currentUser, navigate]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!currentUser) return;
 setSubmitting(true);

 try {
 const isModelSelected = industry === 'model';
 const isAgencySelected = industry === 'agency' || industry === 'agency_rep';
 const isDesignerSelected = industry === 'fashion_design' || industry === 'designer';

 let resolvedAgencyName = '';
 let resolvedAgencyId = '';

 if (isModelSelected || isAgencySelected) {
 if (selectedAgency === '__custom__') {
 resolvedAgencyName = customAgencyName.trim();
 } else if (selectedAgency === '__freelance__') {
 resolvedAgencyName = 'Freelance / Независимая';
 } else if (selectedAgency) {
 resolvedAgencyName = selectedAgency;
 const match = agenciesList.find(a => a.name === selectedAgency);
 if (match?.id) resolvedAgencyId = match.id;
 }
 }

 let resolvedDesignerBrandName = '';
 let resolvedDesignerId = '';

 if (isDesignerSelected) {
 if (selectedDesignerBrand === '__custom__') {
 resolvedDesignerBrandName = customDesignerBrandName.trim();
 } else if (selectedDesignerBrand) {
 resolvedDesignerBrandName = selectedDesignerBrand;
 const match = designersList.find(d => d.name === selectedDesignerBrand);
 if (match?.id) resolvedDesignerId = match.id;
 }
 }

 const updatePayload: Record<string, any> = {
 onboardingComplete: true,
 industry,
 degree,
 interestLevel,
 ageGroup,
 primaryGoal
 };

 if (isModelSelected) {
 updatePayload.isModel = true;
 updatePayload.modelAgencyName = resolvedAgencyName || 'Freelance';
 if (resolvedAgencyId) updatePayload.modelAgencyId = resolvedAgencyId;
 updatePayload.modelVerificationStatus = 'pending';
 updatePayload.hasModelBadge = false; // Verified by agency rep or admin
 } else if (isAgencySelected) {
 updatePayload.isAgency = true;
 updatePayload.isAgencyRepresentative = false;
 updatePayload.hasAgencyBadge = false;
 updatePayload.agencyVerificationStatus = 'none';
 updatePayload.representedAgencyName = resolvedAgencyName || '';
 if (resolvedAgencyId) updatePayload.representedAgencyId = resolvedAgencyId;
 updatePayload.agencyRole = agencyRole;
 } else if (isDesignerSelected) {
 updatePayload.isDesigner = true;
 updatePayload.designerBrandName = resolvedDesignerBrandName || '';
 updatePayload.brandName = resolvedDesignerBrandName || '';
 if (resolvedDesignerId) updatePayload.designerId = resolvedDesignerId;
 updatePayload.designerRole = designerRole;
 updatePayload.designerVerificationStatus = 'none';
 updatePayload.hasGoldenNeedle = false;
 }

 await setDoc(doc(db, 'users', currentUser.uid), updatePayload, { merge: true });
 
 if (isDesignerSelected) {
 navigate('/dashboard?tab=designer');
 } else if (isAgencySelected) {
 navigate('/dashboard?tab=agency-models');
 } else if (isModelSelected) {
 navigate('/dashboard?tab=model');
 } else {
 navigate('/');
 }
 } catch (err) {
 handleFirestoreError(err, OperationType.UPDATE, 'users');
 } finally {
 setSubmitting(false);
 }
 };

 if (!currentUser) return null;

 return (
 <div className="flex justify-center items-center py-12 px-4 animate-in fade-in duration-700 bg-brand-light min-h-[calc(100vh-80px)]">
 <div className="w-full max-w-2xl bg-brand-light border-4 border-brand-dark p-6 sm:p-10 md:p-12">
 <div className="flex items-center gap-2 mb-3">
 <span className="bg-brand-accent text-white px-2.5 py-0.5 text-xs font-bold uppercase tracking-widest font-mono">
 Onboarding
 </span>
 <span className="text-xs font-mono font-bold text-brand-dark/60">
 Azerbaijan Fashion Future
 </span>
 </div>

 <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tighter mb-3 text-brand-dark">
 Complete Your Profile
 </h1>
 <p className="text-brand-dark/70 font-bold uppercase tracking-widest text-xs sm:text-sm mb-8 border-b-2 border-brand-dark pb-6">
 Укажите вашу специализацию для персонализации ленты и доступа к возможностям.
 </p>

 <form onSubmit={handleSubmit} className="space-y-6">
 {/* Industry Selection */}
 <div className="space-y-2">
 <label className="text-xs uppercase tracking-widest text-brand-dark font-bold flex items-center justify-between">
 <span>Сфера деятельности / Industry</span>
 <span className="text-[10px] text-brand-accent font-mono font-bold">*Обязательно</span>
 </label>
 <select
 required
 value={industry}
 onChange={e => setIndustry(e.target.value)}
 className="w-full bg-transparent border-2 border-brand-dark p-3 focus:outline-none focus:border-brand-accent uppercase tracking-widest text-sm font-bold cursor-pointer"
 >
 <option value="" disabled>Выберите направление</option>
 <option value="agency">🏢 Модельное агентство (Знак отличия и поиск моделей)</option>
 <option value="model">🌟 Профессиональная модель (Подиум, Фото, Commercial)</option>
 <option value="agency_rep">🏢 Booker / Скаут / Представитель агентства</option>
 <option value="fashion_design">🪡 Дизайнер одежды (Бренд, Золотая Игла и Direct Chat)</option>
 <option value="marketing_pr">Marketing & PR</option>
 <option value="photography_media">Photography & Fashion Media</option>
 <option value="retail_buying">Retail & Buying</option>
 <option value="tech_ecommerce">Tech / E-commerce</option>
 <option value="student">Student / Студент</option>
 <option value="other">Other / Другое</option>
 </select>
 </div>

 {/* If Model is selected: Ask for Agency with choice or custom input */}
 {industry === 'model' && (
 <div className="p-5 bg-[#fffdf0] border-2 border-brand-dark space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
 <div className="flex items-center justify-between">
 <label className="text-xs uppercase tracking-widest text-brand-dark font-bold flex items-center gap-1.5">
 <Building2 size={16} className="text-brand-accent" />
 Из какого вы модельного агентства?
 </label>
 <ModelVerifiedBadge size="xs" />
 </div>
 <p className="text-xs text-brand-dark/70 font-semibold">
 Выберите агентство из списка или укажите вручную. Представитель агентства сможет подтвердить ваш профиль через @username, и возле вашего имени появится знак <strong className="text-brand-dark">😎</strong>.
 </p>

 <div className="space-y-2">
 <select
 required
 value={selectedAgency}
 onChange={e => setSelectedAgency(e.target.value)}
 className="w-full bg-white border-2 border-brand-dark p-3 focus:outline-none focus:border-brand-accent text-sm font-bold cursor-pointer"
 >
 <option value="" disabled>Выберите ваше модельное агентство</option>
 {agenciesList.map((ag, idx) => (
 <option key={ag.id || idx} value={ag.name}>
 {ag.name}
 </option>
 ))}
 <option value="__custom__">✍️ + Другое агентство (ввести название)</option>
 <option value="__freelance__">💃 Независимая модель (Freelance / Без агентства)</option>
 </select>
 </div>

 {selectedAgency === '__custom__' && (
 <div className="space-y-1.5 animate-in fade-in duration-200">
 <label className="text-[11px] uppercase tracking-wider font-bold text-brand-dark">
 Название вашего модельного агентства:
 </label>
 <input
 type="text"
 required
 value={customAgencyName}
 onChange={e => setCustomAgencyName(e.target.value)}
 placeholder="Например: Elite Models, Grace Model Agency..."
 className="w-full bg-white border-2 border-brand-dark p-3 text-sm font-bold text-brand-dark focus:outline-none focus:border-brand-accent"
 />
 </div>
 )}
 </div>
 )}

 {/* If Agency or Agency Representative is selected */}
 {(industry === 'agency' || industry === 'agency_rep') && (
 <div className="p-5 bg-[#fff8f8] border-2 border-[#7a0000] space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#7a0000]/20">
 <label className="text-xs uppercase tracking-widest text-[#7a0000] font-bold flex items-center gap-1.5">
 <Building2 size={16} className="text-[#7a0000]" />
 Какое модельное агентство вы регистрируете?
 </label>
 <AgencyBadge size="xs" showLabel agencyName="Model Agency" />
 </div>
 <div className="p-3 bg-white border border-[#7a0000]/30 text-xs text-brand-dark leading-relaxed font-semibold">
 🏢 <strong>Раздел агентства в профиле:</strong> После регистрации в вашем профиле появится эксклюзивный раздел «Модельное агентство», где вы сможете подтвердить статус представителя (загрузив şəxsiyyət vəsiqəsi и данные). После проверки администратором вам откроется доступ к поиску моделей, закрытой базе и рассылкам.
 </div>

 <div className="space-y-2">
 <select
 required
 value={selectedAgency}
 onChange={e => setSelectedAgency(e.target.value)}
 className="w-full bg-white border-2 border-brand-dark p-3 focus:outline-none focus:border-[#7a0000] text-sm font-bold cursor-pointer"
 >
 <option value="" disabled>Выберите агентство из каталога или добавьте новое</option>
 {agenciesList.map((ag, idx) => (
 <option key={ag.id || idx} value={ag.name}>
 🏢 {ag.name}
 </option>
 ))}
 <option value="__custom__">✍️ + Зарегистрировать новое модельное агентство</option>
 </select>
 </div>

 {selectedAgency === '__custom__' && (
 <div className="space-y-1.5 animate-in fade-in duration-200">
 <label className="text-[11px] uppercase tracking-wider font-bold text-brand-dark">
 Официальное название агентства:
 </label>
 <input
 type="text"
 required
 value={customAgencyName}
 onChange={e => setCustomAgencyName(e.target.value)}
 placeholder="Например: Venera Models, NL Model Management..."
 className="w-full bg-white border-2 border-brand-dark p-3 text-sm font-bold text-brand-dark focus:outline-none focus:border-[#7a0000]"
 />
 </div>
 )}

 <div className="space-y-1.5">
 <label className="text-[11px] uppercase tracking-wider font-bold text-brand-dark">
 Ваша должность / роль в агентстве:
 </label>
 <select
 value={agencyRole}
 onChange={e => setAgencyRole(e.target.value)}
 className="w-full bg-white border-2 border-brand-dark p-2.5 text-xs font-bold uppercase tracking-wider"
 >
 <option value="director">Директор / Основатель (Director / Founder)</option>
 <option value="booker">Букер (Head Booker / Booking Agent)</option>
 <option value="scout">Скаутер (Model Scout / Talent Hunter)</option>
 <option value="manager">Менеджер (Agency Manager / Producer)</option>
 </select>
 </div>
 </div>
 )}

 {/* If Fashion Designer is selected */}
 {(industry === 'fashion_design' || industry === 'designer') && (
 <div className="p-5 bg-[#fffdf0] border-2 border-[#7a0000] space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#7a0000]/20">
 <label className="text-xs uppercase tracking-widest text-[#7a0000] font-bold flex items-center gap-1.5">
 <Scissors size={16} className="text-[#7a0000]" />
 Какой бренд или модный дом вы представляете?
 </label>
 <GoldenNeedleBadge size="xs" showLabel />
 </div>
 <div className="p-3 bg-white border border-[#7a0000]/30 text-xs text-brand-dark leading-relaxed font-semibold">
 🪡 <strong>Раздел подтверждения в личном кабинете:</strong> После завершения регистрации в вашем профиле откроется раздел «Кабинет Дизайнера» для подтверждения профиля. Вы сможете загрузить şəxsiyyət vəsiqəsi и данные бренда. После одобрения администратором вам будет присвоен знак «Золотая Игла» (Qızıl İynə) и открыт персональный раздел «Direct Chat» для прямых заказов.
 </div>

 <div className="space-y-2">
 <select
 required
 value={selectedDesignerBrand}
 onChange={e => setSelectedDesignerBrand(e.target.value)}
 className="w-full bg-white border-2 border-brand-dark p-3 focus:outline-none focus:border-[#7a0000] text-sm font-bold cursor-pointer"
 >
 <option value="" disabled>Выберите бренд из каталога или укажите свой</option>
 {designersList.map((des, idx) => (
 <option key={des.id || idx} value={des.name}>
 🪡 {des.name} {des.designerName ? `(${des.designerName})` : ''}
 </option>
 ))}
 <option value="__custom__">✍️ + Зарегистрировать новый бренд / дом моды</option>
 </select>
 </div>

 {selectedDesignerBrand === '__custom__' && (
 <div className="space-y-1.5 animate-in fade-in duration-200">
 <label className="text-[11px] uppercase tracking-wider font-bold text-brand-dark">
 Официальное название бренда / модного дома:
 </label>
 <input
 type="text"
 required
 value={customDesignerBrandName}
 onChange={e => setCustomDesignerBrandName(e.target.value)}
 placeholder="Например: Atelier Baku, Maison De Soie..."
 className="w-full bg-white border-2 border-brand-dark p-3 text-sm font-bold text-brand-dark focus:outline-none focus:border-[#7a0000]"
 />
 </div>
 )}

 <div className="space-y-1.5">
 <label className="text-[11px] uppercase tracking-wider font-bold text-brand-dark">
 Ваша роль в бренде:
 </label>
 <select
 value={designerRole}
 onChange={e => setDesignerRole(e.target.value)}
 className="w-full bg-white border-2 border-brand-dark p-2.5 text-xs font-bold uppercase tracking-wider"
 >
 <option value="Creative Director / Head Designer">Главный дизайнер / Креативный директор</option>
 <option value="Founder / Brand Owner">Основатель / Владелец бренда</option>
 <option value="Fashion Designer">Дизайнер одежды</option>
 <option value="Couturier / Master Tailor">Кутюрье / Портной высшей категории</option>
 </select>
 </div>
 </div>
 )}

 {/* Education Level */}
 <div className="space-y-2">
 <label className="text-xs uppercase tracking-widest text-brand-dark font-bold">
 Degree / Education Level
 </label>
 <select
 required
 value={degree}
 onChange={e => setDegree(e.target.value)}
 className="w-full bg-transparent border-2 border-brand-dark p-3 focus:outline-none focus:border-brand-accent uppercase tracking-widest text-sm font-bold cursor-pointer"
 >
 <option value="" disabled>Select Level</option>
 <option value="highschool">High School</option>
 <option value="bachelors">Bachelor's Degree</option>
 <option value="masters">Master's Degree</option>
 <option value="phd">PhD</option>
 <option value="self_taught">Self-taught / None</option>
 </select>
 </div>

 {/* Interest Level */}
 <div className="space-y-2">
 <label className="text-xs uppercase tracking-widest text-brand-dark font-bold">
 Level of Interest in Fashion
 </label>
 <select
 required
 value={interestLevel}
 onChange={e => setInterestLevel(e.target.value)}
 className="w-full bg-transparent border-2 border-brand-dark p-3 focus:outline-none focus:border-brand-accent uppercase tracking-widest text-sm font-bold cursor-pointer"
 >
 <option value="" disabled>Select Interest</option>
 <option value="casual">Casual fan</option>
 <option value="enthusiast">Enthusiast / Hobbyist</option>
 <option value="professional">Professional</option>
 <option value="executive">Executive / Leader</option>
 </select>
 </div>

 {/* Age Group */}
 <div className="space-y-2">
 <label className="text-xs uppercase tracking-widest text-brand-dark font-bold">
 Age Group
 </label>
 <select
 required
 value={ageGroup}
 onChange={e => setAgeGroup(e.target.value)}
 className="w-full bg-transparent border-2 border-brand-dark p-3 focus:outline-none focus:border-brand-accent uppercase tracking-widest text-sm font-bold cursor-pointer"
 >
 <option value="" disabled>Select Age Group</option>
 <option value="under_18">Under 18</option>
 <option value="18_24">18-24</option>
 <option value="25_34">25-34</option>
 <option value="35_44">35-44</option>
 <option value="45_plus">45+</option>
 </select>
 </div>

 {/* Primary Goal */}
 <div className="space-y-2">
 <label className="text-xs uppercase tracking-widest text-brand-dark font-bold">
 Primary reason for joining
 </label>
 <select
 required
 value={primaryGoal}
 onChange={e => setPrimaryGoal(e.target.value)}
 className="w-full bg-transparent border-2 border-brand-dark p-3 focus:outline-none focus:border-brand-accent uppercase tracking-widest text-sm font-bold cursor-pointer"
 >
 <option value="" disabled>Select Primary Goal</option>
 <option value="networking">Networking</option>
 <option value="attend_events">Attend Events / Shows</option>
 <option value="find_jobs">Find Jobs / Internships / Bookings</option>
 <option value="sponsorship">Sponsorships / Partnerships</option>
 <option value="learning">Education / Learning</option>
 </select>
 </div>

 <button
 type="submit"
 disabled={submitting}
 className="w-full bg-brand-dark text-brand-light border-2 border-brand-dark px-4 py-5 font-bold uppercase tracking-widest hover:bg-brand-accent hover:border-brand-accent hover:translate-x-1 hover:translate-y-1 transition-all mt-4 disabled:opacity-50 cursor-pointer"
 >
 {submitting ? 'Saving Profile...' : 'Complete Setup'}
 </button>
 </form>
 </div>
 </div>
 );
}
