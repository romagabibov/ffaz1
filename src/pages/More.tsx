import React from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  Calendar, 
  GraduationCap, 
  Building2, 
  Briefcase, 
  Crown, 
  Newspaper, 
  MessageSquare, 
  Bell, 
  User, 
  Compass, 
  Globe, 
  Sun, 
  Moon, 
  LogOut, 
  ArrowRight, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  HeartHandshake
} from 'lucide-react';
import { SocialLinksBar, DEFAULT_SOCIAL_LINKS } from '../components/SocialLinks';
import GoldenNeedleBadge from '../components/GoldenNeedleBadge';
import ModelVerifiedBadge from '../components/ModelVerifiedBadge';
import AgencyBadge from '../components/AgencyBadge';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function More() {
  const { t, i18n } = useTranslation();
  const { currentUser, dbUser } = useAuth();
  const navigate = useNavigate();

  const isDark = document.documentElement.classList.contains('dark');
  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (e) {
      console.error(e);
    }
  };

  const socialLinks = [
    { platform: 'instagram', url: 'https://instagram.com/azerbaijanfashionweek' },
    { platform: 'tiktok', url: 'https://tiktok.com/@azerbaijanfashionweek' },
    { platform: 'telegram', url: 'https://t.me/azerbaijanfashionweek' },
    { platform: 'youtube', url: 'https://youtube.com/@azerbaijanfashionweek' }
  ];

  return (
    <div className="animate-in fade-in duration-700 min-h-screen bg-brand-light text-brand-dark overflow-x-hidden pb-24 lg:pb-16">
      
      {/* 1. MAGAZINE EDITORIAL HERO HEADER */}
      <section className="border-b border-brand-dark/[0.08] bg-brand-light pt-6 pb-6 sm:py-10 px-4 sm:px-8 relative overflow-hidden shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4 relative z-10">
          <div>
            <div className="mb-2">
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-brand-accent px-3 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15 font-mono inline-block">
                AZERBAIJAN FASHION DIRECTORY
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-serif font-normal tracking-tight text-brand-dark">
              More / <span className="italic text-brand-accent font-serif font-normal">Разделы</span>
            </h1>
            <p className="text-xs sm:text-sm text-brand-dark/65 mt-1.5 max-w-2xl font-normal leading-relaxed">
              {t('more_directory_subtitle', 'Полный каталог разделов Азербайджанской Недели Моды: дизайнеры, модельные агентства, открытые кастинги, образование и личный кабинет.')}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {currentUser ? (
              <Link
                to="/dashboard"
                className="px-5 py-2.5 rounded-full bg-brand-dark text-white hover:bg-brand-accent transition-colors flex items-center gap-2 font-semibold text-xs uppercase tracking-wider shadow-2xs"
              >
                <User size={13} />
                <span>Личный кабинет</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-5 py-2.5 rounded-full bg-brand-dark text-white hover:bg-brand-accent transition-colors flex items-center gap-2 font-semibold text-xs uppercase tracking-wider shadow-2xs"
              >
                <User size={13} />
                <span>{t('login_email', 'Войти')}</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 2. MAIN SECTIONS CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-8">

        {/* User Profile Teaser Card (Clickable directly to profile without separate 'досье' button) */}
        {currentUser ? (
          <Link
            to="/dashboard"
            className="rounded-3xl border border-brand-dark/[0.08] bg-white p-5 sm:p-7 shadow-xs flex items-center justify-between gap-4 hover:border-brand-accent/40 hover:shadow-md transition-all group block"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 border-2 border-brand-dark/15 overflow-hidden shrink-0 bg-brand-muted/30 group-hover:scale-105 transition-transform">
                <img
                  src={dbUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`}
                  alt="Avatar"
                  className="w-full h-full object-cover rounded-full"
                  crossOrigin="anonymous"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-display font-bold text-base sm:text-xl text-brand-dark group-hover:text-brand-accent transition-colors truncate">
                    {dbUser?.name || currentUser.email?.split('@')[0]}
                  </h3>
                  {dbUser?.hasGoldenNeedle && <GoldenNeedleBadge size="sm" />}
                  {dbUser?.hasModelBadge && <ModelVerifiedBadge size="sm" />}
                  {(dbUser?.hasAgencyBadge || dbUser?.isAgency) && <AgencyBadge size="sm" />}
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs text-brand-dark/60">
                  <span className="font-mono">{dbUser?.handle || `@${currentUser.email?.split('@')[0]}`}</span>
                  <span>•</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider text-[10px] ${
                    dbUser?.subscriptionTier === 'elite' 
                      ? 'bg-amber-50 text-amber-900 border border-amber-300' 
                      : dbUser?.subscriptionTier === 'pro'
                      ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20'
                      : 'bg-brand-light text-brand-dark/70 border border-brand-dark/10'
                  }`}>
                    {dbUser?.subscriptionTier === 'elite' ? '👑 Elite VIP' : dbUser?.subscriptionTier === 'pro' ? '⚡ Pro' : 'Free Member'}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-10 h-10 rounded-full border border-brand-dark/10 bg-brand-light flex items-center justify-center text-brand-dark/40 group-hover:text-brand-accent group-hover:border-brand-accent/30 transition-all shrink-0">
              <ChevronRight size={18} />
            </div>
          </Link>
        ) : (
          <Link
            to="/login"
            className="rounded-3xl border border-brand-dark/[0.08] bg-white p-5 sm:p-7 shadow-xs flex items-center justify-between gap-4 hover:border-brand-accent/40 hover:shadow-md transition-all group block"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-brand-accent/5 border border-brand-accent/15 flex items-center justify-center text-brand-accent shrink-0 group-hover:scale-105 transition-transform">
                <User size={22} />
              </div>
              <div>
                <h3 className="font-display font-bold text-base sm:text-lg text-brand-dark group-hover:text-brand-accent transition-colors">
                  Войти в профиль / Досье ателье
                </h3>
                <p className="text-xs text-brand-dark/60 mt-0.5">
                  Управление профилем дизайнера, модели или агентства
                </p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full border border-brand-dark/10 bg-brand-light flex items-center justify-center text-brand-dark/40 group-hover:text-brand-accent group-hover:border-brand-accent/30 transition-all shrink-0">
              <ChevronRight size={18} />
            </div>
          </Link>
        )}

        {/* 2. DIRECTORY SECTIONS GRID (Non-duplicated catalog sections) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-brand-dark/[0.08]">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-brand-accent" />
              <h2 className="text-base sm:text-lg font-display font-bold uppercase tracking-tight text-brand-dark">
                Каталог & Индустрия Моды
              </h2>
            </div>
            <span className="text-[10px] font-mono text-brand-dark/40 uppercase">OFFICIAL REGISTRY</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Designers */}
            <Link
              to="/designers"
              className="group p-5 sm:p-6 rounded-3xl border border-brand-dark/[0.08] bg-white hover:border-brand-accent/30 hover:shadow-md transition-all flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-accent/5 border border-brand-accent/15 flex items-center justify-center text-brand-accent group-hover:scale-110 transition-transform">
                  <Sparkles size={22} />
                </div>
                <span className="text-[10px] font-mono font-medium text-brand-dark/50 uppercase">Directory</span>
              </div>
              <div>
                <h3 className="text-lg font-display font-bold uppercase text-brand-dark group-hover:text-brand-accent transition-colors flex items-center justify-between">
                  <span>{t('designers', 'Дизайнеры')}</span>
                  <ArrowRight size={15} className="text-brand-dark/30 group-hover:text-brand-accent group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-brand-dark/65 mt-1 line-clamp-2">
                  Официальный каталог азербайджанских брендов, кутюрье, лукбуки и контакты.
                </p>
              </div>
            </Link>

            {/* Agencies */}
            <Link
              to="/agencies"
              className="group p-5 sm:p-6 rounded-3xl border border-brand-dark/[0.08] bg-white hover:border-brand-accent/30 hover:shadow-md transition-all flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-accent/5 border border-brand-accent/15 flex items-center justify-center text-brand-accent group-hover:scale-110 transition-transform">
                  <Building2 size={22} />
                </div>
                <span className="text-[10px] font-mono font-medium text-brand-dark/50 uppercase">Agencies</span>
              </div>
              <div>
                <h3 className="text-lg font-display font-bold uppercase text-brand-dark group-hover:text-brand-accent transition-colors flex items-center justify-between">
                  <span>Модельные агентства</span>
                  <ArrowRight size={15} className="text-brand-dark/30 group-hover:text-brand-accent group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-brand-dark/65 mt-1 line-clamp-2">
                  Официальный реестр агентств, бук моделей и верификация со значком 😎.
                </p>
              </div>
            </Link>

            {/* Opportunities / Castings */}
            <Link
              to="/opportunities"
              className="group p-5 sm:p-6 rounded-3xl border border-brand-dark/[0.08] bg-white hover:border-brand-accent/30 hover:shadow-md transition-all flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-accent/5 border border-brand-accent/15 flex items-center justify-center text-brand-accent group-hover:scale-110 transition-transform">
                  <Briefcase size={22} />
                </div>
                <span className="text-[10px] font-mono font-medium text-brand-dark/50 uppercase">Castings</span>
              </div>
              <div>
                <h3 className="text-lg font-display font-bold uppercase text-brand-dark group-hover:text-brand-accent transition-colors flex items-center justify-between">
                  <span>Кастинги & Вакансии</span>
                  <ArrowRight size={15} className="text-brand-dark/30 group-hover:text-brand-accent group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-brand-dark/65 mt-1 line-clamp-2">
                  Открытые кастинги моделей для подиума, вакансии брендов и стажировки.
                </p>
              </div>
            </Link>

            {/* Education */}
            <Link
              to="/education"
              className="group p-5 sm:p-6 rounded-3xl border border-brand-dark/[0.08] bg-white hover:border-brand-accent/30 hover:shadow-md transition-all flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-accent/5 border border-brand-accent/15 flex items-center justify-center text-brand-accent group-hover:scale-110 transition-transform">
                  <GraduationCap size={22} />
                </div>
                <span className="text-[10px] font-mono font-medium text-brand-dark/50 uppercase">Academy</span>
              </div>
              <div>
                <h3 className="text-lg font-display font-bold uppercase text-brand-dark group-hover:text-brand-accent transition-colors flex items-center justify-between">
                  <span>Образование & Академия</span>
                  <ArrowRight size={15} className="text-brand-dark/30 group-hover:text-brand-accent group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-brand-dark/65 mt-1 line-clamp-2">
                  ВУЗы моды и дизайна в Баку (ADRA, ADMİU), курсы, портфолио и FF AI Advisor.
                </p>
              </div>
            </Link>

            {/* News */}
            <Link
              to="/news"
              className="group p-5 sm:p-6 rounded-3xl border border-brand-dark/[0.08] bg-white hover:border-brand-accent/30 hover:shadow-md transition-all flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-accent/5 border border-brand-accent/15 flex items-center justify-center text-brand-accent group-hover:scale-110 transition-transform">
                  <Newspaper size={22} />
                </div>
                <span className="text-[10px] font-mono font-medium text-brand-dark/50 uppercase">Editorial</span>
              </div>
              <div>
                <h3 className="text-lg font-display font-bold uppercase text-brand-dark group-hover:text-brand-accent transition-colors flex items-center justify-between">
                  <span>Новости & Статьи</span>
                  <ArrowRight size={15} className="text-brand-dark/30 group-hover:text-brand-accent group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-brand-dark/65 mt-1 line-clamp-2">
                  Редакционные статьи, хроника показов, интервью с кутюрье и обзоры сезона.
                </p>
              </div>
            </Link>

            {/* Volunteers */}
            <Link
              to="/volunteers"
              className="group p-5 sm:p-6 rounded-3xl border border-brand-dark/[0.08] bg-white hover:border-brand-accent/30 hover:shadow-md transition-all flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-accent/5 border border-brand-accent/15 flex items-center justify-center text-brand-accent group-hover:scale-110 transition-transform">
                  <HeartHandshake size={22} />
                </div>
                <span className="text-[10px] font-mono font-medium text-brand-dark/50 uppercase">Volunteers</span>
              </div>
              <div>
                <h3 className="text-lg font-display font-bold uppercase text-brand-dark group-hover:text-brand-accent transition-colors flex items-center justify-between">
                  <span>Волонтерская программа</span>
                  <ArrowRight size={15} className="text-brand-dark/30 group-hover:text-brand-accent group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-brand-dark/65 mt-1 line-clamp-2">
                  Заявки на участие в организации показов, бэкстейдже и координации гостей.
                </p>
              </div>
            </Link>

            {/* About AFW */}
            <Link
              to="/about"
              className="group p-5 sm:p-6 rounded-3xl border border-brand-dark/[0.08] bg-white hover:border-brand-accent/30 hover:shadow-md transition-all flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-accent/5 border border-brand-accent/15 flex items-center justify-center text-brand-accent group-hover:scale-110 transition-transform">
                  <ShieldCheck size={22} />
                </div>
                <span className="text-[10px] font-mono font-medium text-brand-dark/50 uppercase">AFW Story</span>
              </div>
              <div>
                <h3 className="text-lg font-display font-bold uppercase text-brand-dark group-hover:text-brand-accent transition-colors flex items-center justify-between">
                  <span>О Неделе Моды</span>
                  <ArrowRight size={15} className="text-brand-dark/30 group-hover:text-brand-accent group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-brand-dark/65 mt-1 line-clamp-2">
                  Миссия Azerbaijan Fashion Week, оргкомитет, международные связи и ценности.
                </p>
              </div>
            </Link>

            {/* Careers */}
            <Link
              to="/careers"
              className="group p-5 sm:p-6 rounded-3xl border border-brand-dark/[0.08] bg-white hover:border-brand-accent/30 hover:shadow-md transition-all flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-accent/5 border border-brand-accent/15 flex items-center justify-center text-brand-accent group-hover:scale-110 transition-transform">
                  <Briefcase size={22} />
                </div>
                <span className="text-[10px] font-mono font-medium text-brand-dark/50 uppercase">Career</span>
              </div>
              <div>
                <h3 className="text-lg font-display font-bold uppercase text-brand-dark group-hover:text-brand-accent transition-colors flex items-center justify-between">
                  <span>Карьера & Партнерство</span>
                  <ArrowRight size={15} className="text-brand-dark/30 group-hover:text-brand-accent group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-brand-dark/65 mt-1 line-clamp-2">
                  Вакансии в оргкомитете, спонсорские интеграции и предложения для брендов.
                </p>
              </div>
            </Link>

            {/* Notifications link for quick access */}
            <Link
              to={currentUser ? "/notifications" : "/login"}
              className="group p-5 sm:p-6 rounded-3xl border border-brand-dark/[0.08] bg-white hover:border-brand-accent/30 hover:shadow-md transition-all flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-accent/5 border border-brand-accent/15 flex items-center justify-center text-brand-accent group-hover:scale-110 transition-transform">
                  <Bell size={22} />
                </div>
                <span className="text-[10px] font-mono font-medium text-brand-dark/50 uppercase">Alerts</span>
              </div>
              <div>
                <h3 className="text-lg font-display font-bold uppercase text-brand-dark group-hover:text-brand-accent transition-colors flex items-center justify-between">
                  <span>Уведомления</span>
                  <ArrowRight size={15} className="text-brand-dark/30 group-hover:text-brand-accent group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-brand-dark/65 mt-1 line-clamp-2">
                  Системные уведомления, приглашения на кастинги и статус верификации.
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* 3. PREFERENCES & SYSTEM BAR */}
        <section className="rounded-3xl border border-brand-dark/[0.08] bg-white p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Language Segmented Control */}
            <div className="flex items-center border border-brand-dark/15 rounded-full p-1 bg-brand-light/80 text-xs font-semibold shadow-2xs">
              <button
                onClick={() => changeLanguage('en')}
                className={`px-3 py-1.5 rounded-full transition-all ${i18n.language === 'en' ? 'bg-brand-dark text-white shadow-2xs' : 'text-brand-dark/70 hover:text-brand-dark'}`}
              >
                EN
              </button>
              <button
                onClick={() => changeLanguage('az')}
                className={`px-3 py-1.5 rounded-full transition-all ${i18n.language === 'az' ? 'bg-brand-dark text-white shadow-2xs' : 'text-brand-dark/70 hover:text-brand-dark'}`}
              >
                AZ
              </button>
              <button
                onClick={() => changeLanguage('ru')}
                className={`px-3 py-1.5 rounded-full transition-all ${i18n.language === 'ru' ? 'bg-brand-dark text-white shadow-2xs' : 'text-brand-dark/70 hover:text-brand-dark'}`}
              >
                RU
              </button>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="px-4 py-2 rounded-full border border-brand-dark/15 bg-white text-brand-dark hover:border-brand-accent transition-colors text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-2xs"
            >
              {isDark ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-brand-dark" />}
              <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 rounded-full border border-brand-dark/20 text-brand-dark hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors font-semibold text-xs uppercase tracking-wider flex items-center gap-2 shadow-2xs"
              >
                <LogOut size={14} />
                <span>{t('logout', 'Выйти из аккаунта')}</span>
              </button>
            ) : (
              <Link
                to="/login"
                className="px-5 py-2.5 rounded-full bg-brand-dark text-white hover:bg-brand-accent transition-colors font-semibold text-xs uppercase tracking-wider flex items-center gap-2 shadow-2xs"
              >
                <User size={14} />
                <span>{t('login_email', 'Войти')}</span>
              </Link>
            )}
          </div>
        </section>

        {/* 4. FOOTER SOCIAL LINKS */}
        <div className="pt-2 flex flex-col items-center justify-center text-center space-y-3">
          <SocialLinksBar links={DEFAULT_SOCIAL_LINKS} variant="desktop-footer" />
          <p className="text-[11px] font-mono uppercase tracking-widest text-brand-dark/40">
            &copy; {new Date().getFullYear()} AZERBAIJAN FASHION WEEK • ALL RIGHTS RESERVED
          </p>
        </div>

      </div>
    </div>
  );
}
