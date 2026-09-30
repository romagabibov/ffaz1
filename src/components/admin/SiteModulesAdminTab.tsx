import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSiteFeatures, SiteFeatureConfig } from '../../context/SiteFeaturesContext';
import { 
  Sliders, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  Layout, 
  Compass, 
  Calendar, 
  GraduationCap, 
  Building2, 
  Briefcase, 
  Newspaper, 
  Crown, 
  Bot, 
  Ticket, 
  Send, 
  Award, 
  ShieldCheck, 
  Volume2, 
  Check, 
  X, 
  Search,
  MousePointerClick,
  MessageSquare,
  Home as HomeIcon,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export default function SiteModulesAdminTab() {
  const navigate = useNavigate();
  const { 
    features, 
    loading, 
    setVisualEditMode, 
    toggleFeature, 
    resetToDefaults, 
    enableAll 
  } = useSiteFeatures();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'page' | 'home_section' | 'feature'>('all');

  const featureList = Object.values(features);
  const totalCount = featureList.length;
  const activeCount = featureList.filter((f) => f.enabled).length;

  const handleLaunchVisualMode = (targetPath?: string) => {
    setVisualEditMode(true);
    navigate(targetPath || '/');
  };

  const filtered = featureList.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.nameRu.toLowerCase().includes(q) ||
        item.descriptionRu.toLowerCase().includes(q) ||
        (item.path && item.path.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'page':
        return <Layout size={16} className="text-brand-accent" />;
      case 'home_section':
        return <Layers size={16} className="text-amber-600" />;
      case 'feature':
        return <Sparkles size={16} className="text-purple-600" />;
      default:
        return <Sliders size={16} className="text-brand-dark" />;
    }
  };

  // Main interactive screens navigator
  const primaryScreens = [
    {
      id: 'page_home',
      name: 'Главный экран (Home)',
      path: '/',
      desc: 'Титульная страница, видеобаннер, слоган, манифест, спонсоры и рассылка',
      icon: <HomeIcon size={20} className="text-brand-accent" />,
      subItems: ['Главный баннер Hero', 'Бегущая строка', 'Манифест', 'Спонсорство', 'Логотипы', 'Рассылка']
    },
    {
      id: 'page_events',
      name: 'Показы & Календарь (Events)',
      path: '/events',
      desc: 'Расписание показов недель моды, интерактивный календарь дат и покупка билетов',
      icon: <Calendar size={20} className="text-brand-accent" />,
      subItems: ['Календарь дат', 'Список показов', 'Бронирование билетов']
    },
    {
      id: 'page_designers',
      name: 'Каталог Дизайнеров (Designers)',
      path: '/designers',
      desc: 'Алфавитный реестр домов моды, резиденты, контакты и знаки отличия',
      icon: <Sparkles size={20} className="text-brand-accent" />,
      subItems: ['Алфавитный список', 'Карточки резидентов', 'Золотая/Серебряная игла']
    },
    {
      id: 'page_education',
      name: 'Образование & Академии (Education)',
      path: '/education',
      desc: 'Институты, факультеты дизайна, академии и AI-консультант по поступлению',
      icon: <GraduationCap size={20} className="text-brand-accent" />,
      subItems: ['Каталог академий', 'FF AI Advisor', 'Программы обучения']
    },
    {
      id: 'page_agencies',
      name: 'Модельные Агентства (Agencies)',
      path: '/agencies',
      desc: 'Реестр модельных агентств, кастинги, подача заявок и верификация',
      icon: <Building2 size={20} className="text-brand-accent" />,
      subItems: ['Список агентств', 'Подача заявки агентства', 'Верификация моделей']
    },
    {
      id: 'page_opportunities',
      name: 'Кастинги & Вакансии (Careers)',
      path: '/opportunities',
      desc: 'Поиск моделей для показов, стажировки в домах моды и вакансии брендов',
      icon: <Briefcase size={20} className="text-brand-accent" />,
      subItems: ['Кастинги моделей', 'Вакансии брендов', 'Форма отклика']
    },
    {
      id: 'page_feed',
      name: 'Модная Лента (Feed)',
      path: '/feed',
      desc: 'Лента публикаций участников индустрии, лукбуки и обсуждения',
      icon: <Compass size={20} className="text-brand-accent" />,
      subItems: ['Посты и фотографии', 'Лайки и комментарии', 'Прямой эфир']
    },
    {
      id: 'page_messages',
      name: 'Личные Сообщения (Messages)',
      path: '/messages',
      desc: 'Прямые диалоги с дизайнерами, агентствами и контактами',
      icon: <MessageSquare size={20} className="text-brand-accent" />,
      subItems: ['Внутренний чат', 'Вложения и фото', 'Звуковые уведомления']
    },
    {
      id: 'page_news',
      name: 'Новости Моды & Статьи (News)',
      path: '/news',
      desc: 'Репортажи с подиумов, эксклюзивные интервью и статьи редакции',
      icon: <Newspaper size={20} className="text-brand-accent" />,
      subItems: ['Редакционные статьи', 'Архив новостей', 'Фоторепортажи']
    },
    {
      id: 'page_about',
      name: 'О нас & Центр Моды (About)',
      path: '/about',
      desc: 'Миссия Azerbaijan Fashion Week, Центр Развития Модной Индустрии',
      icon: <Layers size={20} className="text-brand-accent" />,
      subItems: ['История и миссия', 'Руководство', 'Центр развития']
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header Banner & Action Center */}
      <div className="bg-gradient-to-r from-brand-dark via-brand-dark to-stone-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 border border-brand-dark/[0.12] shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-brand-accent/20 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest text-brand-accent bg-brand-accent/15 border border-brand-accent/30 px-3 py-1 rounded-full">
              Platform Architecture & Feature Toggles
            </span>
            <span className="text-[11px] font-mono text-white/60">
              • Активно {activeCount} из {totalCount}
            </span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-serif font-normal tracking-tight text-white leading-tight">
            Управление активностью разделов и функций
          </h2>

          <p className="text-xs sm:text-sm text-white/80 font-normal leading-relaxed">
            Вы можете в реальном времени отключать или включать любые разделы платформы. 
            Также вы можете нажать <strong className="text-white">«Перейти на сайт в режиме настройки»</strong>: это откроет нужную страницу сайта с интерактивными кнопками прямо на экране, позволяя включать и выключать разделы в 1 клик на самом сайте.
          </p>

          {/* Quick Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleLaunchVisualMode('/')}
              className="bg-brand-accent hover:bg-brand-accent/90 text-white px-5 py-3 rounded-full text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <MousePointerClick size={16} />
              <span>Перейти на Главный экран в режиме настройки</span>
            </button>

            <button
              onClick={enableAll}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-full text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-white/20 cursor-pointer"
            >
              <CheckCircle2 size={15} />
              <span>Включить все</span>
            </button>

            <button
              onClick={resetToDefaults}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-full text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-white/20 cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Сбросить к стандарту</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE SCREEN NAVIGATOR (Переход на экраны для настройки) */}
      <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-accent bg-brand-accent/5 px-2.5 py-0.5 rounded-full border border-brand-accent/20">
              Interactive Screen Navigator
            </span>
            <span className="text-xs font-mono text-brand-dark/50">• Прямой переход & Live Switch</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-normal text-brand-dark tracking-tight mt-1">
            Экраны сайта: Включение, выключение и визуальный переход
          </h3>
          <p className="text-xs sm:text-sm text-brand-dark/65 font-normal mt-1">
            Нажмите переключатель, чтобы мгновенно включить или выключить раздел. Нажмите «Перейти на экран», чтобы открыть этот раздел на сайте с визуальными кнопками управления прямо поверх страницы.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {primaryScreens.map((screen) => {
            const feat = features[screen.id];
            const isEnabled = feat ? feat.enabled : true;

            return (
              <div
                key={screen.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                  isEnabled
                    ? 'bg-brand-light/40 border-brand-dark/[0.08] hover:border-brand-accent/30 shadow-2xs'
                    : 'bg-red-50/40 border-red-200/80 opacity-90'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isEnabled ? 'bg-white border border-brand-dark/[0.08] shadow-2xs' : 'bg-red-100 text-red-700'
                      }`}>
                        {screen.icon}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif font-normal text-base sm:text-lg text-brand-dark">
                            {screen.name}
                          </h4>
                          <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                            isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {isEnabled ? 'АКТИВЕН' : 'ОТКЛЮЧЕН'}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-brand-accent font-semibold block mt-0.5">
                          {screen.path}
                        </span>
                      </div>
                    </div>

                    {/* Quick Toggle Switch */}
                    <button
                      onClick={() => toggleFeature(screen.id)}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? 'bg-emerald-600' : 'bg-stone-300'
                      }`}
                      role="switch"
                      aria-checked={isEnabled}
                      title={isEnabled ? 'Нажмите, чтобы выключить раздел' : 'Нажмите, чтобы включить раздел'}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-xs text-brand-dark/70 font-normal leading-relaxed">
                    {screen.desc}
                  </p>

                  {/* Sub-elements pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {screen.subItems.map((sub, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono bg-white border border-brand-dark/[0.07] text-brand-dark/65 px-2 py-0.5 rounded-md"
                      >
                        ✦ {sub}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Action */}
                <div className="pt-3 border-t border-brand-dark/[0.06] flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-brand-dark/50">
                    {isEnabled ? 'Виден посетителям' : 'Скрыт от посетителей'}
                  </span>

                  <button
                    onClick={() => handleLaunchVisualMode(screen.path)}
                    className="bg-brand-dark hover:bg-brand-accent text-white px-3.5 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer hover:scale-102 active:scale-98"
                  >
                    <span>Перейти на экран</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Filter & Search Strip for All Modules */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white rounded-3xl border border-brand-dark/[0.08] p-4 sm:p-5 shadow-xs">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'all', label: `Все модули (${totalCount})` },
            { id: 'page', label: `Страницы сайта (${featureList.filter(f => f.category === 'page').length})` },
            { id: 'home_section', label: `Блоки Главного экрана (${featureList.filter(f => f.category === 'home_section').length})` },
            { id: 'feature', label: `Функции и сервисы (${featureList.filter(f => f.category === 'feature').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as any)}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === tab.id
                  ? 'bg-brand-dark text-white shadow-2xs'
                  : 'bg-brand-light text-brand-dark/70 hover:text-brand-dark hover:bg-brand-muted/50 border border-brand-dark/[0.08]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/40" />
          <input
            type="text"
            placeholder="Поиск по названию или пути..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-full pl-10 pr-4 py-2 font-mono text-xs text-brand-dark focus:outline-none focus:bg-white focus:border-brand-accent transition-all"
          />
        </div>
      </div>

      {/* 4. Complete List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filtered.map((item) => {
          const isEnabled = item.enabled;

          return (
            <div
              key={item.id}
              className={`p-5 sm:p-6 rounded-3xl border transition-all flex flex-col justify-between gap-4 ${
                isEnabled
                  ? 'bg-white border-brand-dark/[0.08] shadow-xs hover:border-brand-accent/30 hover:shadow-md'
                  : 'bg-stone-100/70 border-red-200/80 shadow-none opacity-85'
              }`}
            >
              {/* Card Top */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isEnabled ? 'bg-brand-muted/50 text-brand-dark' : 'bg-red-100 text-red-700'
                    }`}>
                      {getCategoryIcon(item.category)}
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-brand-dark/50 block">
                        {item.category === 'page' ? 'Страница' : item.category === 'home_section' ? 'Блок Главной' : 'Сервис / Модуль'}
                      </span>
                      {item.path && (
                        <span className="text-[11px] font-mono text-brand-accent font-semibold">
                          {item.path}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <button
                    onClick={() => toggleFeature(item.id)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isEnabled ? 'bg-emerald-600' : 'bg-stone-300'
                    }`}
                    role="switch"
                    aria-checked={isEnabled}
                    title={isEnabled ? 'Нажмите, чтобы выключить' : 'Нажмите, чтобы включить'}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-serif font-normal text-brand-dark tracking-tight">
                    {item.nameRu}
                  </h3>
                  <p className="text-xs text-brand-dark/65 font-normal mt-1 leading-relaxed">
                    {item.descriptionRu}
                  </p>
                </div>
              </div>

              {/* Card Bottom / Action */}
              <div className="pt-3 border-t border-brand-dark/[0.06] flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                  isEnabled
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-emerald-600' : 'bg-red-600'}`} />
                  {isEnabled ? 'Активен' : 'Отключён'}
                </span>

                {item.path && (
                  <button
                    onClick={() => handleLaunchVisualMode(item.path)}
                    className="text-xs font-mono font-semibold text-brand-dark/70 hover:text-brand-accent transition-colors flex items-center gap-1 cursor-pointer"
                    title="Перейти в визуальный режим на этой странице"
                  >
                    <span>Настроить на сайте</span>
                    <ExternalLink size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
