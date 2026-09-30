import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { collection, getDocs, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { ArrowRight, Sparkles, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useSiteFeatures } from '../context/SiteFeaturesContext';
import { useAuth } from '../context/AuthContext';
import SectionControlWrapper from '../components/SectionControlWrapper';
import { DEFAULT_HOME_SETTINGS, HomeContentSettings } from '../components/admin/HomeMaterialsAdminTab';

function TypingEffect({ texts, typingSpeed = 50, deletingSpeed = 30, pauseTime = 1500 }: { texts: string[], typingSpeed?: number, deletingSpeed?: number, pauseTime?: number }) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const textsKey = texts.join('|');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentList = textsKey.split('|');
    const safeIndex = currentIndex % (currentList.length || 1);
    const currentText = currentList[safeIndex] || '';

    if (isDeleting) {
      if (displayText.length > 0) {
        timer = setTimeout(() => {
          setDisplayText(prev => prev.slice(0, -1));
        }, deletingSpeed);
      } else {
        setIsDeleting(false);
        setCurrentIndex((prev) => (prev + 1) % currentList.length);
      }
    } else {
      if (displayText.length < currentText.length) {
        timer = setTimeout(() => {
          setDisplayText(prev => currentText.slice(0, prev.length + 1));
        }, typingSpeed);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, pauseTime);
      }
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, currentIndex, textsKey, typingSpeed, deletingSpeed, pauseTime]);

  return (
    <span className="font-serif italic font-normal text-brand-accent px-2.5 sm:px-3.5 py-1 ml-1 sm:ml-2 inline-flex items-center justify-start min-w-[105px] xs:min-w-[125px] sm:min-w-[170px] md:min-w-[210px] h-[34px] sm:h-[40px] md:h-[46px] text-lg sm:text-2xl md:text-3xl bg-brand-accent/5 border border-brand-accent/20 rounded-full shrink-0 select-none overflow-hidden align-middle">
      <span className="truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none inline-block leading-none">
        {displayText || '\u00A0'}
      </span>
      <span className="w-[2px] sm:w-[2.5px] shrink-0 h-[0.85em] bg-brand-accent ml-[4px] animate-pulse inline-block align-middle"></span>
    </span>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const [subEmail, setSubEmail] = useState('');
  const [subWhatsapp, setSubWhatsapp] = useState('');
  const [subStatus, setSubStatus] = useState('');
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [sponsorshipForm, setSponsorshipForm] = useState({ brandName: '', email: '', message: '' });
  const [sponsorshipStatus, setSponsorshipStatus] = useState('');
  const [homeSettings, setHomeSettings] = useState<HomeContentSettings>(DEFAULT_HOME_SETTINGS);

  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'settings', 'home_content'), (snap) => {
        if (snap.exists()) {
          setHomeSettings({ ...DEFAULT_HOME_SETTINGS, ...snap.data() } as HomeContentSettings);
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn('Failed to listen to home_content settings:', e);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sponsorsSnap = await getDocs(collection(db, 'sponsors'));
        setSponsors(sponsorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Failed to fetch sponsors:', err);
      }
    };
    fetchData();
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subEmail) return;
    try {
      setSubStatus('subscribing');
      await addDoc(collection(db, 'subscribers'), {
        email: subEmail,
        whatsapp: subWhatsapp,
        createdAt: serverTimestamp()
      });
      setSubStatus('success');
      toast.success(t('newsletter_subscribed', 'Welcome to the Front Row! You are now subscribed.'));
      setSubEmail('');
      setSubWhatsapp('');
      setTimeout(() => setSubStatus(''), 3000);
    } catch (err) {
      setSubStatus('error');
      toast.error(t('error_subscribing', 'Error subscribing. Please try again.'));
    }
  };

  const handleSponsorshipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorshipForm.brandName || !sponsorshipForm.email) return;
    try {
      setSponsorshipStatus('submitting');
      await addDoc(collection(db, 'sponsorships'), {
        ...sponsorshipForm,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSponsorshipStatus('success');
      toast.success(t('sponsorship_sent', 'Sponsorship request sent successfully! Our team will contact you.'));
      setSponsorshipForm({ brandName: '', email: '', message: '' });
      setTimeout(() => setSponsorshipStatus(''), 3000);
    } catch (err) {
      setSponsorshipStatus('error');
      toast.error(t('error_submitting', 'Error submitting request. Please try again.'));
    }
  };

  return (
    <div className="flex flex-col bg-brand-light text-brand-dark transition-colors duration-300">
      {/* 1. Hero Section */}
      <SectionControlWrapper
        featureId="home_hero_banner"
        title="Главный баннер & Видео (Hero)"
        subtitle="Первый вступительный экран с заголовком и видеопоказом"
      >
        <section className="flex flex-col lg:flex-row min-h-[calc(100vh-68px)] border-b border-brand-dark/[0.07] overflow-hidden w-full max-w-full items-stretch">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full lg:w-1/2 flex flex-col justify-center p-5 sm:p-10 md:p-14 lg:p-20 xl:p-24 relative z-10 max-w-full overflow-hidden box-border"
          >
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <span className="w-6 h-[1.5px] bg-brand-accent/60"></span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-accent px-3 py-1 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                {homeSettings.heroBadgeText || 'AZERBAIJAN FASHION ECOSYSTEM'}
              </span>
            </div>
            
            <h1 className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-7xl xl:text-[5.25rem] font-display font-bold leading-[0.98] tracking-tight uppercase mb-6 sm:mb-8 text-brand-dark overflow-hidden break-words max-w-full">
              {homeSettings.heroTitleLine1 || 'Fashion'}<br />
              <span className="text-brand-accent font-display">{homeSettings.heroTitleLine2 || 'Future'}</span><br />
              {homeSettings.heroTitleLine3 || 'Azerbaijan'}
            </h1>
            
            <div className="text-base sm:text-xl md:text-2xl font-normal tracking-normal text-brand-dark/80 mb-10 sm:mb-12 flex flex-wrap items-center gap-2 max-w-full break-words min-h-[3.25rem] sm:min-h-[3.5rem]">
              <span className="shrink-0">{t('discover_the_next', 'Discover the next')}</span>
              <TypingEffect texts={
                (homeSettings.heroTypingWords || 'fashion., designer., event., sponsor., internship., vacancy.')
                  .split(',')
                  .map(w => w.trim())
                  .filter(Boolean)
              } />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-auto max-w-full">
              <Link to={homeSettings.heroPrimaryBtnLink || '/events'} className="brand-button flex items-center justify-center gap-3 text-center px-8 py-4 group">
                <span>{homeSettings.heroPrimaryBtnLabel || t('explore_events', 'Explore Events')}</span>
                <ArrowRight size={15} className="shrink-0 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to={homeSettings.heroSecondaryBtnLink || '/designers'} className="brand-button-outline flex items-center justify-center gap-3 px-8 py-4">
                {homeSettings.heroSecondaryBtnLabel || t('az_designers', 'A-Z Designers')}
              </Link>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="w-full lg:w-1/2 p-4 sm:p-6 lg:p-8 flex items-center justify-center"
          >
            <div className="w-full h-[52vh] lg:h-[84vh] relative rounded-3xl overflow-hidden border border-brand-dark/[0.08] shadow-[0_20px_60px_-25px_rgba(28,25,23,0.15)] group bg-brand-dark">
              <video 
                key={homeSettings.heroVideoUrl}
                autoPlay 
                loop 
                muted 
                playsInline
                preload="metadata"
                poster={homeSettings.heroPosterUrl || "https://res.cloudinary.com/dcvsf3tnn/video/upload/so_0,w_1080,q_auto:low,f_auto/v1787602233/10622412-uhd_2160_4096_25fps_iqu16n.jpg"}
                className="absolute inset-0 w-full h-full object-cover transition-all duration-700 pointer-events-none"
                src={homeSettings.heroVideoUrl || "https://res.cloudinary.com/dcvsf3tnn/video/upload/q_auto:eco,vc_auto,w_1080,f_auto/v1787602233/10622412-uhd_2160_4096_25fps_iqu16n.mp4"}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none"></div>
              <div className="absolute bottom-6 right-6 font-mono text-[10px] tracking-widest uppercase text-white/90 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20">
                {homeSettings.heroVideoTag || 'RUNWAY LIVE ARCHIVE • BAKU'}
              </div>
            </div>
          </motion.div>
        </section>
      </SectionControlWrapper>

      {/* 2. Marquee Ticker */}
      <SectionControlWrapper
        featureId="home_ticker"
        title="Бегущая строка (Marquee Ticker)"
        subtitle="Динамическая полоса разделов недели моды под главным баннером"
      >
        <div className="marquee-container group">
          <div className="marquee-content group-hover:[animation-play-state:paused] flex items-center py-0.5">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="mx-6 flex items-center gap-6 text-white font-mono text-xs tracking-[0.2em]">
                <Link to="/events" className="hover:text-white/75 transition-colors cursor-pointer uppercase">{t('events', 'EVENTS')}</Link>
                <span className="text-white/40 text-[8px]">✦</span>
                <Link to="/feed" className="hover:text-white/75 transition-colors cursor-pointer uppercase">{t('nav_feed', 'FEED')}</Link>
                <span className="text-white/40 text-[8px]">✦</span>
                <Link to="/designers" className="hover:text-white/75 transition-colors cursor-pointer uppercase">{t('designers', 'DESIGNERS')}</Link>
                <span className="text-white/40 text-[8px]">✦</span>
                <Link to="/education" className="hover:text-white/75 transition-colors cursor-pointer uppercase">EDUCATION</Link>
                <span className="text-white/40 text-[8px]">✦</span>
                <Link to="/agencies" className="hover:text-white/75 transition-colors cursor-pointer uppercase">AGENCIES</Link>
                <span className="text-white/40 text-[8px]">✦</span>
              </span>
            ))}
          </div>
        </div>
      </SectionControlWrapper>

      {/* 3. About / Manifesto Section */}
      <SectionControlWrapper
        featureId="home_manifesto"
        title="Манифест и Философия (Manifesto)"
        subtitle="Блок Elevating Style с описанием миссии платформы"
      >
        <section className="flex flex-col md:flex-row border-b border-brand-dark/[0.07] overflow-hidden">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, margin: "-100px" }}
            className="w-full md:w-1/2 p-5 sm:p-10 md:p-18 lg:p-24 flex flex-col justify-center bg-brand-light"
          >
            <div className="font-mono font-semibold text-brand-accent mb-4 tracking-[0.2em] text-[11px] uppercase">
              {homeSettings.manifestoTag || '[01 // MANIFESTO]'}
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-serif font-normal mb-6 sm:mb-8 text-brand-dark tracking-tight break-words">
              {homeSettings.manifestoTitle || t('elevating_style', 'Elevating Style')}
            </h2>
            <p className="text-brand-dark/75 leading-relaxed mb-10 text-base sm:text-lg font-normal max-w-lg">
              {homeSettings.manifestoDesc || t('home_about_desc', 'Our platform connects fashion enthusiasts with the most prestigious events happening across the country. From avant-garde exhibitions to ready-to-wear runway shows, we curate the definitive calendar of Azerbaijani fashion.')}
            </p>
            <div>
              <Link to={homeSettings.manifestoBtnLink || '/events'} className="brand-button-outline px-6 py-3 text-xs inline-flex items-center gap-2 group">
                <span>{homeSettings.manifestoBtnLabel || t('view_calendar_btn', 'VIEW CALENDAR')}</span>
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="w-full md:w-1/2 p-4 sm:p-6 lg:p-8 flex items-center justify-center bg-brand-light"
          >
            <div className="w-full h-full min-h-[380px] sm:min-h-[480px] relative rounded-3xl overflow-hidden border border-brand-dark/[0.08] shadow-[0_20px_60px_-25px_rgba(28,25,23,0.15)] group bg-brand-muted">
              <img 
                key={homeSettings.manifestoImageUrl}
                src={homeSettings.manifestoImageUrl || "https://res.cloudinary.com/dcvsf3tnn/image/upload/f_auto,q_auto:good,w_1080,c_limit/v1787602162/taylor-heery-8p6s8h6BNjg-unsplash_u7zcz6.jpg"} 
                alt="Tech fashion aesthetic" 
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover rounded-3xl filter contrast-[1.02] transform-gpu hover:scale-105 transition-transform duration-700 ease-out will-change-transform" 
                crossOrigin="anonymous" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none rounded-3xl" />
              <div className="absolute bottom-6 right-6 font-mono text-[10px] tracking-widest uppercase text-white/90 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20">
                {homeSettings.manifestoImageTag || 'EDITORIAL ARCHIVE • BAKU'}
              </div>
            </div>
          </motion.div>
        </section>
      </SectionControlWrapper>

      {/* 4. Partners / Sponsorship Section */}
      <SectionControlWrapper
        featureId="home_partners_strip"
        title="Спонсорство и Партнёрство (Sponsor a Show)"
        subtitle="Форма подачи заявки на спонсорство для брендов"
      >
        <section className="p-5 sm:p-10 md:p-18 lg:p-24 border-b border-brand-dark/[0.07] overflow-hidden bg-brand-muted/30">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="max-w-7xl mx-auto"
          >
            <div className="mb-10 sm:mb-16 border-b border-brand-dark/[0.08] pb-6 sm:pb-8">
              <div className="font-mono font-semibold text-brand-accent mb-3 tracking-[0.2em] text-[11px] uppercase">
                [02 // ATELIER SPONSORSHIPS]
              </div>
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-serif font-normal tracking-tight mb-4 text-brand-dark break-words">
                {t('sponsor_a_show', 'Sponsor a Show')}
              </h2>
              <p className="text-brand-dark/70 font-normal text-base sm:text-lg max-w-2xl pt-2">
                {t('sponsor_subtitle', 'Partner with the most highly anticipated fashion events in Azerbaijan.')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-12 items-stretch">
              <div className="rounded-3xl border border-brand-dark/[0.08] p-5 sm:p-8 md:p-12 bg-brand-light/90 backdrop-blur-md shadow-xs flex flex-col justify-center">
                <h3 className="text-2xl sm:text-3xl font-serif font-normal text-brand-dark mb-6">{t('why_sponsor', 'Why Sponsor?')}</h3>
                <ul className="space-y-5 text-brand-dark/80 text-sm sm:text-base font-normal">
                  <li className="flex items-start gap-3.5">
                    <span className="text-brand-accent font-serif text-lg leading-none mt-0.5">✦</span>
                    <span>{t('sponsor_benefit_1', 'Brand visibility across digital, print, and physical spaces during fashion week.')}</span>
                  </li>
                  <li className="flex items-start gap-3.5">
                    <span className="text-brand-accent font-serif text-lg leading-none mt-0.5">✦</span>
                    <span>{t('sponsor_benefit_2', 'Direct engagement with an exclusive demographic of industry professionals, influencers, and high-net-worth individuals.')}</span>
                  </li>
                  <li className="flex items-start gap-3.5">
                    <span className="text-brand-accent font-serif text-lg leading-none mt-0.5">✦</span>
                    <span>{t('sponsor_benefit_3', 'VIP access and dedicated lounges for your premium clients.')}</span>
                  </li>
                </ul>
              </div>

              <motion.div 
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="rounded-3xl bg-brand-card text-brand-dark p-5 sm:p-8 md:p-12 border border-brand-dark/[0.08] shadow-sm"
              >
                <form className="flex flex-col gap-4 text-left" onSubmit={handleSponsorshipSubmit}>
                  <input 
                    type="text" 
                    placeholder={t('placeholder_brand_name', 'Brand Name')} 
                    required 
                    value={sponsorshipForm.brandName} 
                    onChange={e => setSponsorshipForm({ ...sponsorshipForm, brandName: e.target.value })} 
                    className="w-full bg-brand-muted/40 text-brand-dark border border-brand-dark/15 rounded-xl px-4 py-3.5 font-normal text-sm outline-none focus:border-brand-accent focus:bg-white transition-all shadow-xs" 
                  />
                  <input 
                    type="email" 
                    placeholder={t('placeholder_contact_email', 'Contact Email')} 
                    required 
                    value={sponsorshipForm.email} 
                    onChange={e => setSponsorshipForm({ ...sponsorshipForm, email: e.target.value })} 
                    className="w-full bg-brand-muted/40 text-brand-dark border border-brand-dark/15 rounded-xl px-4 py-3.5 font-normal text-sm outline-none focus:border-brand-accent focus:bg-white transition-all shadow-xs" 
                  />
                  <textarea 
                    placeholder={t('placeholder_message_details', 'Message / Details')} 
                    required 
                    value={sponsorshipForm.message} 
                    onChange={e => setSponsorshipForm({ ...sponsorshipForm, message: e.target.value })} 
                    className="w-full bg-brand-muted/40 text-brand-dark border border-brand-dark/15 rounded-xl px-4 py-3.5 font-normal text-sm outline-none focus:border-brand-accent focus:bg-white transition-all h-24 resize-none shadow-xs" 
                  />
                  <button 
                    disabled={sponsorshipStatus === 'submitting'} 
                    type="submit" 
                    className="brand-button w-full mt-2 disabled:opacity-50 py-3.5"
                  >
                    {sponsorshipStatus === 'submitting' ? t('submitting', 'Submitting...') : (sponsorshipStatus === 'success' ? t('submitted', 'Submitted!') : t('send_request', 'Send Request'))}
                  </button>
                  {sponsorshipStatus === 'error' && <p className="text-brand-accent font-mono font-bold text-xs uppercase tracking-widest">{t('error_submitting', 'Error submitting request.')}</p>}
                </form>
              </motion.div>
            </div>
          </motion.div>
        </section>
      </SectionControlWrapper>

      {/* 5. Sponsors Marquee */}
      <SectionControlWrapper
        featureId="home_sponsors_marquee"
        title="Лента брендов и спонсоров"
        subtitle="Бегущие логотипы официальных спонсоров недели моды"
      >
        <div className="group bg-brand-light border-b border-brand-dark/[0.07] py-8 md:py-12 overflow-hidden">
          <div className="marquee-content group-hover:[animation-play-state:paused] flex items-center">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="flex items-center">
                {sponsors.map(sponsor => (
                  <React.Fragment key={sponsor.id}>
                    <span className="mx-6 md:mx-10 grayscale hover:grayscale-0 transition-all duration-500 opacity-60 hover:opacity-100 flex items-center justify-center h-14 md:h-20">
                      <img 
                        src={sponsor.imageUrl} 
                        alt={sponsor.name} 
                        loading="lazy"
                        decoding="async"
                        className="h-full max-h-14 md:max-h-20 w-auto max-w-[160px] md:max-w-[220px] object-contain shrink-0" 
                      />
                    </span>
                    <span className="w-1.5 h-1.5 bg-brand-accent/40 rounded-full mx-4 md:mx-6 shrink-0"></span>
                  </React.Fragment>
                ))}
              </span>
            ))}
          </div>
        </div>
      </SectionControlWrapper>

      {/* 6. Newsletter / CTA */}
      <SectionControlWrapper
        featureId="home_newsletter"
        title="Блок подписки (Join Front Row)"
        subtitle="Форма подписки на рассылку по Email и WhatsApp"
      >
        <section className="bg-gradient-to-br from-[#801D2B] to-[#5C141F] text-white p-6 sm:p-12 md:p-24 text-center relative overflow-hidden border-b border-brand-dark/[0.08]">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/[0.03] rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-black/[0.15] rounded-full blur-2xl pointer-events-none"></div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="relative z-10 max-w-2xl mx-auto flex flex-col items-center"
          >
            <span className="text-[11px] font-mono tracking-[0.3em] uppercase text-white/75 mb-3 px-3.5 py-1 rounded-full bg-white/10 border border-white/20">
              NEWSLETTER EXCLUSIVE
            </span>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-serif font-normal mb-5 tracking-tight text-white leading-tight">
              {t('join_front_row', 'Join the Front Row')}
            </h2>
            <p className="text-white/80 mb-10 text-base sm:text-lg font-light max-w-lg leading-relaxed">
              {t('newsletter_desc', 'Subscribe to our newsletter for updates on upcoming collections, exclusive event information, and backstage news.')}
            </p>
            <form className="flex flex-col w-full max-w-xl gap-3 relative" onSubmit={handleSubscribe}>
              <div className="flex flex-col sm:flex-row gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/25 shadow-xl">
                <input 
                  type="email" 
                  placeholder={t('placeholder_enter_email', 'Enter your email')} 
                  required 
                  value={subEmail}
                  onChange={e => setSubEmail(e.target.value)}
                  className="flex-1 bg-white/95 text-brand-dark px-4 py-3.5 rounded-xl outline-none text-sm placeholder:text-stone-400" 
                />
                <input 
                  type="tel" 
                  placeholder={t('placeholder_whatsapp', 'WhatsApp (optional)')} 
                  value={subWhatsapp}
                  onChange={e => setSubWhatsapp(e.target.value)}
                  className="flex-1 bg-white/95 text-brand-dark px-4 py-3.5 rounded-xl outline-none text-sm placeholder:text-stone-400" 
                />
                <button 
                  disabled={subStatus === 'subscribing'} 
                  type="submit" 
                  className="bg-brand-dark text-white font-medium text-xs tracking-wider px-6 py-3.5 rounded-xl hover:bg-stone-800 transition-all disabled:opacity-50 shrink-0 shadow-sm"
                >
                  {subStatus === 'subscribing' ? '...' : (subStatus === 'success' ? t('done', 'DONE') : t('subscribe_btn', 'SUBSCRIBE'))}
                </button>
              </div>
              {subStatus === 'error' && <span className="text-rose-200 text-xs mt-1">{t('error_subscribing', 'Error subscribing. Try again.')}</span>}
            </form>
          </motion.div>
        </section>
      </SectionControlWrapper>
    </div>
  );
}
