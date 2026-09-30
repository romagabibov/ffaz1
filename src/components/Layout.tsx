import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
 Moon, Sun, Menu, X, MessageSquare, LogOut, Home, Compass, 
 Calendar, User, Sparkles, GraduationCap, Building2, Briefcase, 
 Newspaper, Layers, Bell, ChevronRight, HeartHandshake
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Conversation, SocialLinkItem } from '../types';
import { SocialLinksBar, DEFAULT_SOCIAL_LINKS } from './SocialLinks';
import { subscribeToUserNotifications } from '../lib/notificationService';
import { 
  initDeviceNotificationWorker, 
  showDeviceNotification 
} from '../lib/deviceNotificationService';
import { 
 playMessageReceivedSound, 
 playNotificationSound 
} from '../lib/soundEffects';
import { Toaster } from 'sonner';
import GoldenNeedleBadge from './GoldenNeedleBadge';
import ModelVerifiedBadge from './ModelVerifiedBadge';
import AgencyBadge from './AgencyBadge';
import { useSiteFeatures } from '../context/SiteFeaturesContext';
import VisualFeatureInspector from './admin/VisualFeatureInspector';

export default function Layout() {
 const { t, i18n } = useTranslation();
 const { currentUser, dbUser, isAdmin } = useAuth();
 const { isPathEnabled } = useSiteFeatures();
 const navigate = useNavigate();
 const location = useLocation();
 const [isDark, setIsDark] = useState(() => {
   try {
     const saved = localStorage.getItem('az_fashion_theme');
     if (saved) return saved === 'dark';
   } catch {}
   return document.documentElement.classList.contains('dark');
 });

 const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
 const [unreadTotal, setUnreadTotal] = useState(0);
 const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
 const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>(DEFAULT_SOCIAL_LINKS);
 const previousUnreadCountRef = useRef<number | null>(null);
 const previousUnreadNotifsRef = useRef<number | null>(null);
 const lastKnownMsgTimesRef = useRef<Record<string, number>>({});
 const isFirstConvLoadRef = useRef<boolean>(true);

 // Initialize service worker for native device shade notifications
 useEffect(() => {
   initDeviceNotificationWorker();
 }, []);

 // Subscribe to real-time siteSettings/socialLinks
 useEffect(() => {
 const unsub = onSnapshot(doc(db, 'siteSettings', 'socialLinks'), (docSnap) => {
 if (docSnap.exists()) {
 const data = docSnap.data();
 if (Array.isArray(data.links) && data.links.length > 0) {
 setSocialLinks(data.links);
 }
 }
 }, (err) => {
 console.warn('[Layout] Social links subscription fallback:', err);
 });

 return () => unsub();
 }, []);

 // Subscribe to real-time notifications count (last 15 days)
 useEffect(() => {
 if (!currentUser) {
 setUnreadNotifsCount(0);
 previousUnreadNotifsRef.current = null;
 return;
 }

 const unsubscribe = subscribeToUserNotifications(
 currentUser.uid,
 (notifs) => {
 const unread = notifs.filter(n => !n.read).length;
 if (previousUnreadNotifsRef.current !== null && unread > previousUnreadNotifsRef.current) {
 if (!location.pathname.startsWith('/notifications')) {
 playNotificationSound();
 }
 }
 previousUnreadNotifsRef.current = unread;
 setUnreadNotifsCount(unread);
 },
 15
 );

 return () => {
 if (typeof unsubscribe === 'function') unsubscribe();
 };
 }, [currentUser, location.pathname]);

  useEffect(() => {
    if (!currentUser) {
      setUnreadTotal(0);
      previousUnreadCountRef.current = null;
      lastKnownMsgTimesRef.current = {};
      isFirstConvLoadRef.current = true;
      return;
    }

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as Conversation;
        if (data.unreadCounts?.[currentUser.uid]) {
          count += data.unreadCounts[currentUser.uid];
        }

        // Check for new incoming message from the other participant
        if (data.lastMessage && data.lastMessage.senderId !== currentUser.uid && data.lastMessage.createdAt) {
          const prevTime = lastKnownMsgTimesRef.current[docSnap.id] || 0;
          const rawCreated = data.lastMessage.createdAt as any;
          const msgTime = typeof rawCreated === 'number'
            ? rawCreated
            : (rawCreated?.toMillis ? rawCreated.toMillis() : Date.now());

          if (!isFirstConvLoadRef.current && msgTime > prevTime) {
            // Trigger native notification in device notification shade (Android / iOS / Windows / macOS)
            const senderName = data.lastMessage.senderName || data.participantDetails?.[data.lastMessage.senderId]?.name || 'FFAZ Direct';
            const senderAvatar = data.participantDetails?.[data.lastMessage.senderId]?.avatarUrl || '';

            showDeviceNotification({
              title: `💬 ${senderName}`,
              body: data.lastMessage.text || 'Новое сообщение',
              icon: senderAvatar || '/icon.svg',
              tag: `chat_${docSnap.id}`,
              url: `/messages?user=${data.lastMessage.senderId}`
            });
          }

          lastKnownMsgTimesRef.current[docSnap.id] = msgTime;
        }
      });

      isFirstConvLoadRef.current = false;

      // Play sound if new unread message arrived and user is not inside active messages page
      if (previousUnreadCountRef.current !== null && count > previousUnreadCountRef.current) {
        if (!location.pathname.startsWith('/messages')) {
          playMessageReceivedSound();
        }
      }
      previousUnreadCountRef.current = count;
      setUnreadTotal(count);
    }, (err) => {
      console.error('Error listening for unread messages:', err);
    });

    return () => unsubscribe();
  }, [currentUser, location.pathname]);

 useEffect(() => {
   if (isDark) {
     document.documentElement.classList.add('dark');
     try { localStorage.setItem('az_fashion_theme', 'dark'); } catch {}
   } else {
     document.documentElement.classList.remove('dark');
     try { localStorage.setItem('az_fashion_theme', 'light'); } catch {}
   }
 }, [isDark]);

 const toggleTheme = () => setIsDark(!isDark);

 const handleLogout = async () => {
 await signOut(auth);
 setIsMobileMenuOpen(false);
 navigate('/');
 };

 const changeLanguage = (lng: string) => {
 i18n.changeLanguage(lng);
 try {
   localStorage.setItem('i18nextLng', lng);
 } catch {
   // ignore
 }
 };

 const closeMenu = () => setIsMobileMenuOpen(false);

 const isMessagesPage = location.pathname.startsWith('/messages') || location.pathname.startsWith('/chat');
 const searchParams = new URLSearchParams(location.search);
 const isChatConversationActive = isMessagesPage && !!searchParams.get('conversationId');

 const allNavLinks = useMemo(() => [
 { path: '/', label: t('home', 'Home') },
 { path: '/events', label: t('events', 'Events') },
 { path: '/feed', label: t('nav_feed', 'Feed') },
 { path: '/messages', label: t('nav_chat', 'Chat') },
 { path: '/designers', label: t('designers', 'Designers') },
 { path: '/education', label: t('nav_education', 'Education') },
 { path: '/agencies', label: t('nav_agencies', 'Agencies') },
 { path: '/opportunities', label: t('opportunities', 'Opportunities') },
 { path: '/news', label: t('nav_news', 'News') },
 ], [t]);

 const navLinks = useMemo(() => {
   return allNavLinks.filter((link) => isAdmin || isPathEnabled(link.path));
 }, [allNavLinks, isAdmin, isPathEnabled]);

 return (
 <>
 <Toaster 
 position="bottom-right" 
 theme={isDark ? 'dark' : 'light'}
 richColors 
 closeButton
 toastOptions={{
 className: 'font-mono text-xs border-2 border-brand-dark',
 }}
 />

      <div className={`flex flex-col font-sans relative bg-brand-light text-brand-dark transition-colors duration-300 w-full max-w-full ${isMessagesPage ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-screen overflow-x-hidden'}`}>
 <nav className="sticky top-0 z-50 bg-brand-light/85 backdrop-blur-xl border-b border-brand-dark/[0.07] px-4 sm:px-8 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3 transition-colors duration-300 min-h-[68px] shrink-0 flex items-center shadow-[0_4px_24px_-8px_rgba(28,25,23,0.03)]">
 <div className="w-full max-w-[1800px] mx-auto flex items-center justify-between gap-2 lg:gap-4">
 {/* Logo */}
 <Link to="/" onClick={closeMenu} className="group text-xl sm:text-2xl 2xl:text-3xl uppercase tracking-wider text-brand-dark flex items-center gap-2.5 shrink-0">
 <span className="group-hover:text-brand-accent transition-colors font-serif tracking-[0.18em] text-2xl sm:text-3xl font-normal">AZ/FSHN</span><span className="text-[9px] font-mono tracking-[0.25em] text-brand-accent font-bold px-2 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/20 hidden sm:inline-block">BAKU</span>
 </Link>
 
 {/* Desktop Navigation Links with Spring Layout Pill Indicator */}
 <div className="hidden lg:flex items-center gap-1 xl:gap-1.5 text-xs 2xl:text-sm font-medium tracking-wide overflow-x-auto no-scrollbar py-1 relative bg-brand-muted/50 p-1 rounded-full border border-brand-dark/[0.06]">
 {navLinks.map((link) => {
 const isActive = link.path === '/' 
 ? location.pathname === '/' 
 : location.pathname.startsWith(link.path);
 return (
 <Link
 key={link.path}
 to={link.path}
 className={`relative px-3.5 py-1.5 transition-all whitespace-nowrap text-[11px] 2xl:text-xs font-medium tracking-wider rounded-full ${
                isActive 
                  ? 'text-white font-semibold' 
                  : 'text-brand-dark/70 hover:text-brand-dark hover:bg-brand-dark/[0.04]'
              }`}
 >
 {isActive && (
 <motion.div layoutId="desktop-nav-active-pill" className="absolute inset-0 bg-brand-accent rounded-full shadow-[0_2px_12px_rgba(128,29,43,0.3)] -z-10" transition={{ type: "spring", stiffness: 420, damping: 32 }} />
 )}
 <span className="relative z-10 flex items-center gap-1"><span>{link.label}</span>{isAdmin && !isPathEnabled(link.path) && <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-red-600 text-white font-bold leading-none">OFF</span>}</span>
 </Link>
 );
 })}
 </div>

 {/* Desktop Right Actions (Notifications, User, Languages, Theme) */}
 <div className="hidden lg:flex items-center gap-2 shrink-0">

 {/* Notifications button */}
 <Link 
 to={currentUser ? "/notifications" : "/login"} 
 className={`relative h-9 w-9 rounded-full border border-brand-dark/15 dark:border-brand-dark/20 transition-all flex items-center justify-center text-xs font-bold uppercase tracking-wider shrink-0 hover:scale-105 active:scale-95 shadow-xs ${
            location.pathname === '/notifications'
              ? 'bg-brand-accent text-white border-brand-accent shadow-[0_2px_10px_rgba(128,29,43,0.3)]'
              : 'bg-brand-light/90 text-brand-dark hover:bg-brand-dark hover:text-brand-light hover:border-brand-dark'
          }`}
 title={t('notifications', 'Notifications')}
 aria-label={t('notifications', 'Notifications')}
 >
 <Bell size={15} className="shrink-0" />
 {unreadNotifsCount > 0 && (
 <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black min-w-4 h-4 px-1 rounded-full border border-brand-dark flex items-center justify-center leading-none animate-pulse">
 {unreadNotifsCount > 99 ? '99+' : unreadNotifsCount}
 </span>
 )}
 </Link>

 
 {currentUser && (
 <Link 
 to="/dashboard" 
 className={`h-9 w-9 rounded-full border border-brand-dark/15 dark:border-brand-dark/20 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 shadow-xs ${
              location.pathname === '/dashboard'
                ? 'bg-brand-accent text-white border-brand-accent shadow-[0_2px_10px_rgba(128,29,43,0.3)]'
                : 'bg-brand-light/90 text-brand-dark hover:bg-brand-dark hover:text-brand-light hover:border-brand-dark'
            }`}
 title={t('dashboard', 'Dashboard')}
 aria-label={t('dashboard', 'Dashboard')}
 >
 <User size={15} className="shrink-0" />
 </Link>
 )}

 {isAdmin && (
 <Link 
 to="/admin" 
 className={`h-9 w-9 rounded-full border border-brand-dark/15 dark:border-brand-dark/20 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 shadow-xs ${
              location.pathname.startsWith('/admin')
                ? 'bg-brand-accent text-white border-brand-accent shadow-[0_2px_10px_rgba(128,29,43,0.3)]'
                : 'bg-brand-light/90 text-brand-dark hover:bg-brand-dark hover:text-brand-light hover:border-brand-dark'
            }`}
 title={t('admin', 'Admin')}
 aria-label={t('admin', 'Admin')}
 >
 <Sparkles size={15} className="shrink-0" />
 </Link>
 )}

 {!currentUser ? (
 <Link 
 to="/login" 
 className="h-9 px-4 rounded-full border border-brand-dark/20 bg-brand-light/90 hover:bg-brand-dark hover:text-brand-light hover:border-brand-dark text-[11px] font-medium uppercase tracking-wider text-brand-dark transition-all whitespace-nowrap flex items-center shadow-xs hover:scale-105 active:scale-95"
 >
 {t('login_email')}
 </Link>
 ) : (
 <button 
 onClick={handleLogout} 
 title={t('logout')} 
 className="h-9 w-9 rounded-full border border-brand-dark/15 bg-brand-light/90 hover:bg-brand-accent hover:border-brand-accent hover:text-white text-brand-dark transition-all flex items-center justify-center shrink-0 shadow-xs hover:scale-105 active:scale-95"
 >
 <LogOut size={15} />
 </button>
 )}
 
 {/* Segmented Language Picker */}
 <div className="h-9 flex items-stretch border border-brand-dark/15 bg-brand-light/80 backdrop-blur-xs rounded-full p-0.5 text-[11px] font-medium overflow-hidden shadow-xs">
 <button 
 onClick={() => changeLanguage('en')} 
 className={`px-2.5 rounded-full flex items-center justify-center transition-all ${
                i18n.language === 'en' ? 'bg-brand-dark text-brand-light font-semibold shadow-xs' : 'text-brand-dark/70 hover:text-brand-dark hover:bg-brand-dark/[0.04]'
              }`}
 >
 EN
 </button>
 <button onClick={() => changeLanguage('az')} className={`px-2.5 rounded-full flex items-center justify-center transition-all ${
                i18n.language === 'az' ? 'bg-brand-dark text-brand-light font-semibold shadow-xs' : 'text-brand-dark/70 hover:text-brand-dark hover:bg-brand-dark/[0.04]'
              }`}>AZ</button>
 <button onClick={() => changeLanguage('ru')} className={`px-2.5 rounded-full flex items-center justify-center transition-all ${
                i18n.language === 'ru' ? 'bg-brand-dark text-brand-light font-semibold shadow-xs' : 'text-brand-dark/70 hover:text-brand-dark hover:bg-brand-dark/[0.04]'
              }`}>RU</button>
 </div>

 {/* Theme Toggle Button */}
 <button 
 onClick={toggleTheme} 
 title="Toggle theme" 
 className="h-9 w-9 rounded-full border border-brand-dark/15 bg-brand-light/90 hover:bg-brand-dark hover:text-brand-light hover:border-brand-dark text-brand-dark transition-all flex items-center justify-center shrink-0 shadow-xs hover:scale-105 active:scale-95"
 >
 {isDark ? <Sun size={15} /> : <Moon size={15} />}
 </button>
 </div>

 {/* Mobile / Tablet Header Controls (below lg) */}
 <div className="lg:hidden flex items-center gap-2">
 <Link 
 to={currentUser ? "/notifications" : "/login"} 
 onClick={closeMenu}
 className={`p-2 border border-brand-dark/40 transition-colors relative flex items-center justify-center ${
 location.pathname === '/notifications'
 ? 'bg-brand-dark text-brand-light'
 : 'bg-brand-light text-brand-dark hover:bg-brand-accent hover:text-white'
 }`}
 title="Notifications"
 >
 <Bell size={18} />
 {unreadNotifsCount > 0 && (
 <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black min-w-[17px] h-[17px] px-0.5 rounded-full border border-brand-dark flex items-center justify-center animate-pulse">
 {unreadNotifsCount > 99 ? '99+' : unreadNotifsCount}
 </span>
 )}
 </Link>

 <button onClick={toggleTheme} className="p-2 border border-brand-dark/40 bg-brand-light text-brand-dark hover:text-brand-accent transition-colors flex items-center justify-center">
 {isDark ? <Sun size={18} /> : <Moon size={18} />}
 </button>
 </div>
 </div>
 </nav>

 {/* Mobile / Tablet Bottom Action Sheet Menu (Editorial Luxury Directory) */}
  <AnimatePresence>
    {isMobileMenuOpen && (
      <>
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeMenu}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 lg:hidden"
        />

        {/* Bottom Sheet Drawer */}
        <motion.div 
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="fixed inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto bg-brand-light/98 backdrop-blur-2xl border-t border-brand-dark/[0.08] rounded-t-[36px] z-50 p-5 sm:p-7 shadow-[0_-20px_60px_rgba(0,0,0,0.15)] flex flex-col text-brand-dark lg:hidden"
        >
          {/* Pull / Drag Indicator Pill */}
          <div className="w-12 h-1 bg-brand-dark/20 rounded-full mx-auto mb-4 shrink-0" />

          {/* Editorial Header */}
          <div className="flex items-center justify-between border-b border-brand-dark/[0.08] pb-4 mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-brand-dark">
                {i18n.language === 'az' ? 'Bölmələr' : i18n.language === 'en' ? 'Platform Directory' : 'Разделы платформы'}
              </h2>
            </div>
            <button 
              onClick={closeMenu} 
              className="w-9 h-9 rounded-full border border-brand-dark/15 bg-white flex items-center justify-center text-brand-dark hover:border-brand-accent hover:text-brand-accent transition-colors shadow-2xs"
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          </div>

          {/* User Profile Teaser Card if logged in (clickable item to profile) */}
          {currentUser && (
            <Link
              to="/dashboard"
              onClick={closeMenu}
              className="mb-4 p-3.5 rounded-2xl border border-brand-dark/[0.08] bg-white shadow-2xs flex items-center justify-between gap-3 hover:border-brand-accent/40 transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full p-0.5 border border-brand-dark/15 overflow-hidden shrink-0 bg-brand-muted/30 group-hover:scale-105 transition-transform">
                  <img
                    src={dbUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`}
                    alt="Avatar"
                    className="w-full h-full object-cover rounded-full"
                    crossOrigin="anonymous"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-display font-bold text-sm text-brand-dark group-hover:text-brand-accent transition-colors truncate">{dbUser?.name || currentUser.email?.split('@')[0]}</span>
                    {dbUser?.hasGoldenNeedle && <GoldenNeedleBadge size="sm" />}
                    {dbUser?.hasModelBadge && <ModelVerifiedBadge size="sm" />}
                    {(dbUser?.hasAgencyBadge || dbUser?.isAgency) && <AgencyBadge size="sm" />}
                  </div>
                  <span className="text-[10px] font-mono text-brand-dark/60 block truncate">
                    {dbUser?.handle || `@${currentUser.email?.split('@')[0]}`}
                  </span>
                </div>
              </div>

              <ChevronRight size={16} className="text-brand-dark/30 group-hover:text-brand-accent group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          )}



          {/* Directory Sections Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <Link 
              to="/designers" 
              onClick={closeMenu} 
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-1 shadow-2xs ${
                location.pathname === '/designers' 
                  ? 'bg-brand-dark text-white border-brand-dark' 
                  : 'bg-white border-brand-dark/[0.08] hover:border-brand-accent/30 text-brand-dark'
              }`}
            >
              <div className="flex items-center justify-between">
                <Sparkles size={17} className={location.pathname === '/designers' ? 'text-brand-accent' : 'text-brand-accent'} />
                <span className="text-[9px] font-mono text-brand-dark/40 uppercase">Directory</span>
              </div>
              <div>
                <div className="text-xs font-display font-bold uppercase tracking-tight">{t('designers', 'Дизайнеры')}</div>
                <div className={`text-[10px] truncate ${location.pathname === '/designers' ? 'text-white/70' : 'text-brand-dark/60'}`}>Лукбуки и бренды</div>
              </div>
            </Link>

            <Link 
              to="/agencies" 
              onClick={closeMenu} 
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-1 shadow-2xs ${
                location.pathname === '/agencies' 
                  ? 'bg-brand-dark text-white border-brand-dark' 
                  : 'bg-white border-brand-dark/[0.08] hover:border-brand-accent/30 text-brand-dark'
              }`}
            >
              <div className="flex items-center justify-between">
                <Building2 size={17} className={location.pathname === '/agencies' ? 'text-brand-accent' : 'text-brand-accent'} />
                <span className="text-[9px] font-mono text-brand-dark/40 uppercase">Agencies</span>
              </div>
              <div>
                <div className="text-xs font-display font-bold uppercase tracking-tight">Агентства моделей</div>
                <div className={`text-[10px] truncate ${location.pathname === '/agencies' ? 'text-white/70' : 'text-brand-dark/60'}`}>Скаутинг и верификация</div>
              </div>
            </Link>

            <Link 
              to="/opportunities" 
              onClick={closeMenu} 
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-1 shadow-2xs ${
                location.pathname === '/opportunities' || location.pathname === '/vacancies'
                  ? 'bg-brand-dark text-white border-brand-dark' 
                  : 'bg-white border-brand-dark/[0.08] hover:border-brand-accent/30 text-brand-dark'
              }`}
            >
              <div className="flex items-center justify-between">
                <Briefcase size={17} className={location.pathname === '/opportunities' ? 'text-brand-accent' : 'text-brand-accent'} />
                <span className="text-[9px] font-mono text-brand-dark/40 uppercase">Jobs</span>
              </div>
              <div>
                <div className="text-xs font-display font-bold uppercase tracking-tight">Кастинги & Работа</div>
                <div className={`text-[10px] truncate ${location.pathname === '/opportunities' ? 'text-white/70' : 'text-brand-dark/60'}`}>Вакансии и гранты</div>
              </div>
            </Link>

            <Link 
              to="/news" 
              onClick={closeMenu} 
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-1 shadow-2xs ${
                location.pathname === '/news' 
                  ? 'bg-brand-dark text-white border-brand-dark' 
                  : 'bg-white border-brand-dark/[0.08] hover:border-brand-accent/30 text-brand-dark'
              }`}
            >
              <div className="flex items-center justify-between">
                <Newspaper size={17} className={location.pathname === '/news' ? 'text-brand-accent' : 'text-brand-accent'} />
                <span className="text-[9px] font-mono text-brand-dark/40 uppercase">Editorial</span>
              </div>
              <div>
                <div className="text-xs font-display font-bold uppercase tracking-tight">Новости & Статьи</div>
                <div className={`text-[10px] truncate ${location.pathname === '/news' ? 'text-white/70' : 'text-brand-dark/60'}`}>Обзоры и хроника</div>
              </div>
            </Link>

            <Link 
              to="/education" 
              onClick={closeMenu} 
              className={`col-span-2 p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-1 shadow-2xs ${
                location.pathname === '/education' 
                  ? 'bg-brand-dark text-white border-brand-dark' 
                  : 'bg-white border-brand-dark/[0.08] hover:border-brand-accent/30 text-brand-dark'
              }`}
            >
              <div className="flex items-center justify-between">
                <GraduationCap size={17} className={location.pathname === '/education' ? 'text-brand-accent' : 'text-brand-accent'} />
                <span className="text-[9px] font-mono text-brand-dark/40 uppercase">Academy</span>
              </div>
              <div>
                <div className="text-xs font-display font-bold uppercase tracking-tight">Образование & Академия</div>
                <div className={`text-[10px] truncate ${location.pathname === '/education' ? 'text-white/70' : 'text-brand-dark/60'}`}>ВУЗы моды, курсы и Fashion AI</div>
              </div>
            </Link>
          </div>

          {/* User Account & Communications Links */}
          <div className="border-t border-brand-dark/[0.08] pt-4 flex flex-col gap-2.5 mb-4">
            <Link 
              to={currentUser ? "/notifications" : "/login"} 
              onClick={closeMenu} 
              className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-semibold shadow-2xs transition-all ${
                location.pathname === '/notifications' ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white border-brand-dark/[0.08] text-brand-dark hover:border-brand-accent/30'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bell size={16} className="text-brand-accent" />
                <span className="uppercase tracking-wider">{t('notifications', 'Notifications')}</span>
              </div>
              {unreadNotifsCount > 0 ? (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadNotifsCount} {t('unread', 'unread')}
                </span>
              ) : (
                <span className="text-[10px] text-brand-dark/50 font-mono">15 days</span>
              )}
            </Link>

            {isAdmin && (
              <Link 
                to="/admin" 
                onClick={closeMenu} 
                className={`p-3 rounded-2xl border flex items-center gap-2.5 text-xs font-semibold shadow-2xs transition-all ${
                  location.pathname.startsWith('/admin') ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white border-brand-dark/[0.08] text-brand-dark hover:border-brand-accent/30'
                }`}
              >
                <Sparkles size={16} className="text-brand-accent" />
                <span className="uppercase tracking-wider">{t('admin', 'Admin')} Control Center</span>
              </Link>
            )}
          </div>

          {/* Preferences & Tools (Language, Theme, Sign in/out) */}
          <div className="border-t border-brand-dark/[0.08] pt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              {/* Language Picker */}
              <div className="flex items-center border border-brand-dark/15 bg-white p-1 rounded-full text-xs font-semibold shadow-2xs">
                <button onClick={() => { changeLanguage('en'); closeMenu(); }} className={`px-2.5 py-1 rounded-full transition-all ${i18n.language === 'en' ? 'bg-brand-dark text-white' : 'text-brand-dark/70 hover:text-brand-dark'}`}>EN</button>
                <button onClick={() => { changeLanguage('az'); closeMenu(); }} className={`px-2.5 py-1 rounded-full transition-all ${i18n.language === 'az' ? 'bg-brand-dark text-white' : 'text-brand-dark/70 hover:text-brand-dark'}`}>AZ</button>
                <button onClick={() => { changeLanguage('ru'); closeMenu(); }} className={`px-2.5 py-1 rounded-full transition-all ${i18n.language === 'ru' ? 'bg-brand-dark text-white' : 'text-brand-dark/70 hover:text-brand-dark'}`}>RU</button>
              </div>

              {/* Theme Toggle */}
              <button 
                onClick={() => toggleTheme()} 
                className="px-3.5 py-1.5 rounded-full border border-brand-dark/15 bg-white text-brand-dark hover:border-brand-accent text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                {isDark ? <Sun size={14} /> : <Moon size={14} />}
                <span>{isDark ? 'Light' : 'Dark'}</span>
              </button>
            </div>

            {/* Sign In / Sign Out */}
            {!currentUser ? (
              <Link 
                to="/login" 
                onClick={closeMenu} 
                className="w-full text-center py-2.5 rounded-full bg-brand-dark text-white hover:bg-brand-accent text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs"
              >
                {t('login_email', 'Войти')}
              </Link>
            ) : (
              <button 
                onClick={handleLogout} 
                className="w-full py-2.5 rounded-full bg-white text-brand-dark border border-brand-dark/15 hover:bg-red-500 hover:text-white hover:border-red-500 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-2xs"
              >
                <LogOut size={14} />
                <span>{t('logout', 'Выйти')}</span>
              </button>
            )}

            {/* Social Media Channels */}
            <div className="pt-2 flex flex-col items-center">
              <SocialLinksBar links={socialLinks} variant="mobile-drawer" />
            </div>

            {/* Legal Policies */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] font-medium uppercase tracking-wider text-brand-dark/50">
              <Link to="/about" onClick={closeMenu} className="hover:text-brand-accent transition-colors">{t('nav_about', 'About')}</Link>
              <span>•</span>
              <Link to="/privacy" onClick={closeMenu} className="hover:text-brand-accent transition-colors">{t('nav_privacy', 'Privacy')}</Link>
              <span>•</span>
              <Link to="/terms" onClick={closeMenu} className="hover:text-brand-accent transition-colors">{t('nav_terms', 'Terms')}</Link>
              <span>•</span>
              <Link to="/cookies" onClick={closeMenu} className="hover:text-brand-accent transition-colors">{t('nav_cookies', 'Cookies')}</Link>
            </div>
            <p className="text-center text-[9px] font-mono text-brand-dark/40 tracking-widest uppercase pb-2">
              &copy; {new Date().getFullYear()} AZ FASHION WEEK
            </p>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>

  <main className={`flex-1 w-full mx-auto ${isMessagesPage ? "h-[calc(100dvh-68px)] max-h-[calc(100dvh-68px)] overflow-hidden flex flex-col min-h-0" : "pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-0 overflow-x-hidden"}`}>
        <Outlet />
      </main>

  {/* Mobile / Tablet Fixed Bottom Navigation Bar (Hidden in Messages to maximize chat height) */}
  {(!isMessagesPage && (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-brand-light/95 backdrop-blur-2xl border-t border-brand-dark/[0.08] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around lg:hidden shadow-[0_-8px_30px_rgba(0,0,0,0.06)] transition-colors duration-300">
      {/* 1. Home Tab */}
      <Link 
        to="/" 
        onClick={closeMenu} 
        className={`flex flex-col items-center gap-1 p-1 min-w-[54px] transition-all ${
          location.pathname === '/' ? 'text-brand-accent' : 'text-brand-dark/60 hover:text-brand-dark'
        }`}
      >
        <div className={`p-1.5 rounded-full transition-all ${location.pathname === '/' ? 'bg-brand-accent text-white shadow-xs scale-105' : ''}`}>
          <Home size={18} strokeWidth={location.pathname === '/' ? 2.5 : 2} className={location.pathname === '/' ? 'text-white' : ''} />
        </div>
        <span className="text-[9px] uppercase font-semibold tracking-wider">{t('nav_home', 'Home')}</span>
      </Link>

      {/* 2. Feed Tab */}
      <Link 
        to="/feed" 
        onClick={closeMenu} 
        className={`flex flex-col items-center gap-1 p-1 min-w-[54px] transition-all ${
          location.pathname === '/feed' ? 'text-brand-accent' : 'text-brand-dark/60 hover:text-brand-dark'
        }`}
      >
        <div className={`p-1.5 rounded-full transition-all ${location.pathname === '/feed' ? 'bg-brand-accent text-white shadow-xs scale-105' : ''}`}>
          <Compass size={18} strokeWidth={location.pathname === '/feed' ? 2.5 : 2} className={location.pathname === '/feed' ? 'text-white' : ''} />
        </div>
        <span className="text-[9px] uppercase font-semibold tracking-wider">{t('nav_feed', 'Feed')}</span>
      </Link>

      {/* 3. Direct Chat Tab */}
      <Link 
        to={currentUser ? "/messages" : "/login"} 
        onClick={closeMenu} 
        className={`flex flex-col items-center gap-1 p-1 min-w-[54px] transition-all relative ${
          location.pathname === '/messages' || location.pathname === '/chat' ? 'text-brand-accent' : 'text-brand-dark/60 hover:text-brand-dark'
        }`}
      >
        <div className={`relative p-1.5 rounded-full transition-all ${location.pathname === '/messages' || location.pathname === '/chat' ? 'bg-brand-accent text-white shadow-xs scale-105' : ''}`}>
          <MessageSquare size={18} strokeWidth={location.pathname === '/messages' || location.pathname === '/chat' ? 2.5 : 2} className={location.pathname === '/messages' || location.pathname === '/chat' ? 'text-white' : ''} />
          {unreadTotal > 0 && (
            <span className="absolute -top-1 -right-1 bg-brand-accent text-white text-[9px] font-bold min-w-[16px] h-[16px] px-0.5 rounded-full border border-white flex items-center justify-center animate-pulse">
              {unreadTotal > 99 ? '99+' : unreadTotal}
            </span>
          )}
        </div>
        <span className="text-[9px] uppercase font-semibold tracking-wider">{t('nav_chat', 'Chat')}</span>
      </Link>

      {/* 4. Events / Runway Tab */}
      <Link 
        to="/events" 
        onClick={closeMenu} 
        className={`flex flex-col items-center gap-1 p-1 min-w-[54px] transition-all ${
          location.pathname === '/events' ? 'text-brand-accent' : 'text-brand-dark/60 hover:text-brand-dark'
        }`}
      >
        <div className={`p-1.5 rounded-full transition-all ${location.pathname === '/events' ? 'bg-brand-accent text-white shadow-xs scale-105' : ''}`}>
          <Calendar size={18} strokeWidth={location.pathname === '/events' ? 2.5 : 2} className={location.pathname === '/events' ? 'text-white' : ''} />
        </div>
        <span className="text-[9px] uppercase font-semibold tracking-wider">{t('nav_events', 'Events')}</span>
      </Link>

      {/* 5. More / Разделы Menu Trigger */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
        className={`flex flex-col items-center gap-1 p-1 min-w-[54px] transition-all ${
          isMobileMenuOpen || location.pathname === '/more' || location.pathname === '/sections' ? 'text-brand-accent' : 'text-brand-dark/60 hover:text-brand-dark'
        }`}
        aria-label="Toggle Navigation Menu"
      >
        <div className={`p-1.5 rounded-full transition-all ${isMobileMenuOpen || location.pathname === '/more' || location.pathname === '/sections' ? 'bg-brand-accent text-white shadow-xs scale-105' : ''}`}>
          {isMobileMenuOpen ? <X size={18} className="text-white" /> : <Menu size={18} />}
        </div>
        <span className="text-[9px] uppercase font-semibold tracking-wider">More</span>
      </button>
    </div>
  ))}

  {/* Desktop Footer (Hidden on Mobile and in Messages) */}
 <footer className={`${isMessagesPage ? 'hidden' : 'hidden lg:block'} border-t border-brand-dark/[0.07] p-12 md:p-16 text-center text-xs font-medium uppercase tracking-[0.16em] text-brand-dark/75 bg-brand-muted/40 transition-colors duration-300`}>
 {/* Social Media Network Buttons */}
 <div className="mb-8 flex flex-col items-center justify-center">
 <SocialLinksBar links={socialLinks} variant="desktop-footer" />
 </div>

 {/* Navigation Primary Links */}
 <div className="flex justify-center flex-wrap gap-6 sm:gap-8 mb-6">
 <Link to="/about" className="hover:text-brand-accent transition-colors">{t('nav_about', 'About Us')}</Link>
 <Link to="/plans" className="text-[#7a0000] hover:underline font-black transition-colors">{t('nav_plans', 'Plans & Subscriptions')}</Link>
 <Link to="/vacancies" className="hover:text-brand-accent transition-colors">{t('nav_vacancies', 'Vacancies')}</Link>
 <Link to="/volunteers" className="hover:text-brand-accent transition-colors">{t('nav_volunteers', 'Volunteers')}</Link>
 <Link to="/news" className="hover:text-brand-accent transition-colors">{t('nav_news', 'News')}</Link>
 <Link to="/designers" className="hover:text-brand-accent transition-colors">{t('nav_designers', 'Designers')}</Link>
 </div>

 {/* Navigation Legal Links (Duplicate About Us removed) */}
 <div className="flex justify-center flex-wrap gap-6 mb-8 text-xs text-brand-dark/70">
 <Link to="/privacy" className="hover:text-brand-dark transition-colors border-b-2 border-transparent hover:border-brand-dark pb-1">{t('nav_privacy', 'Privacy Policy')}</Link>
 <span>/</span>
 <Link to="/terms" className="hover:text-brand-dark transition-colors border-b-2 border-transparent hover:border-brand-dark pb-1">{t('nav_terms', 'Terms of Use')}</Link>
 <span>/</span>
 <Link to="/cookies" className="hover:text-brand-dark transition-colors border-b-2 border-transparent hover:border-brand-dark pb-1">{t('nav_cookies', 'Cookies Policy')}</Link>
 </div>

 &copy; {new Date().getFullYear()} AZ FASHION EVENTS. ALL RIGHTS RESERVED.
 </footer>
 </div>
 <VisualFeatureInspector />
 </>
 );
}
