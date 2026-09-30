import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

export interface SiteFeatureConfig {
  id: string;
  nameRu: string;
  nameAz: string;
  nameEn: string;
  category: 'page' | 'feature' | 'home_section';
  path?: string;
  descriptionRu: string;
  enabled: boolean;
  icon?: string;
}

export const DEFAULT_SITE_FEATURES: Record<string, SiteFeatureConfig> = {
  // --- Pages / Routes ---
  page_home: {
    id: 'page_home',
    nameRu: 'Главная страница',
    nameAz: 'Əsas Səhifə',
    nameEn: 'Home Page',
    category: 'page',
    path: '/',
    descriptionRu: 'Главный экран платформы Azerbaijan Fashion Week с интерактивными блоками и анонсами',
    enabled: true,
    icon: 'Home'
  },
  page_events: {
    id: 'page_events',
    nameRu: 'Показы и Календарь (Events)',
    nameAz: 'Dəb Nümayişləri',
    nameEn: 'Runway Events',
    category: 'page',
    path: '/events',
    descriptionRu: 'Расписание показов, интерактивный календарь дат и покупка билетов на шоу',
    enabled: true,
    icon: 'Calendar'
  },
  page_feed: {
    id: 'page_feed',
    nameRu: 'Модная Лента (Feed)',
    nameAz: 'Dəb Lenti',
    nameEn: 'Fashion Feed',
    category: 'page',
    path: '/feed',
    descriptionRu: 'Публикации участников индустрии, лукбуки, фотографии и обсуждения коллекций',
    enabled: true,
    icon: 'Compass'
  },
  page_messages: {
    id: 'page_messages',
    nameRu: 'Личные Сообщения и Чат',
    nameAz: 'Mesajlar & Çat',
    nameEn: 'Direct Chat',
    category: 'page',
    path: '/messages',
    descriptionRu: 'Внутренний мессенджер для прямого общения с дизайнерами, агентствами и моделями',
    enabled: true,
    icon: 'MessageSquare'
  },
  page_designers: {
    id: 'page_designers',
    nameRu: 'Каталог Дизайнеров',
    nameAz: 'Dizaynerlər',
    nameEn: 'Designers Directory',
    category: 'page',
    path: '/designers',
    descriptionRu: 'Алфавитный реестр модных домов, резидентов и карточки дизайнеров с контактами',
    enabled: true,
    icon: 'Sparkles'
  },
  page_education: {
    id: 'page_education',
    nameRu: 'Образование & Академии',
    nameAz: 'Təhsil & Akademiyalar',
    nameEn: 'Education & Academies',
    category: 'page',
    path: '/education',
    descriptionRu: 'Университеты, факультеты дизайна, академии и курсы модной индустрии',
    enabled: true,
    icon: 'GraduationCap'
  },
  page_agencies: {
    id: 'page_agencies',
    nameRu: 'Модельные Агентства',
    nameAz: 'Model Agentlikləri',
    nameEn: 'Model Agencies',
    category: 'page',
    path: '/agencies',
    descriptionRu: 'Каталог официальных модельных агентств, кастингов и контактов представителей',
    enabled: true,
    icon: 'Building2'
  },
  page_opportunities: {
    id: 'page_opportunities',
    nameRu: 'Кастинги & Вакансии',
    nameAz: 'Kastinqlər & Vakansiyalar',
    nameEn: 'Careers & Castings',
    category: 'page',
    path: '/opportunities',
    descriptionRu: 'Вакансии, поиск моделей на подиум, стажировки и гранты для дизайнеров',
    enabled: true,
    icon: 'Briefcase'
  },
  page_news: {
    id: 'page_news',
    nameRu: 'Новости Моды & Статьи',
    nameAz: 'Dəb Xəbərləri',
    nameEn: 'Fashion News & Editorial',
    category: 'page',
    path: '/news',
    descriptionRu: 'Редакционные обзоры, репортажи с показов и хроника модных событий',
    enabled: true,
    icon: 'Newspaper'
  },
  page_about: {
    id: 'page_about',
    nameRu: 'О нас & Центр Моды',
    nameAz: 'Haqqımızda',
    nameEn: 'About & Fashion Center',
    category: 'page',
    path: '/about',
    descriptionRu: 'Миссия Azerbaijan Fashion Week, Центр Развития Модной Индустрии и руководство',
    enabled: true,
    icon: 'Layers'
  },
  page_subscriptions: {
    id: 'page_subscriptions',
    nameRu: 'Тарифные Планы (Подписки)',
    nameAz: 'Abunəlik Planları',
    nameEn: 'Subscription Plans',
    category: 'page',
    path: '/subscriptions',
    descriptionRu: 'Планы PRO, Business, Creator и доступ к расширенным функциям платформы',
    enabled: true,
    icon: 'Crown'
  },

  // --- Functions & Key Capabilities ---
  func_ai_advisor: {
    id: 'func_ai_advisor',
    nameRu: 'AI-Консультант (FF AI Advisor)',
    nameAz: 'Süni İntellekt Məsləhətçisi',
    nameEn: 'FF AI Fashion Advisor',
    category: 'feature',
    descriptionRu: 'Умный ассистент по образованию в сфере моды, подбору вузов и поступлению',
    enabled: true,
    icon: 'Bot'
  },
  func_ticket_booking: {
    id: 'func_ticket_booking',
    nameRu: 'Покупка & Бронирование Билетов',
    nameAz: 'Bilet Satışı',
    nameEn: 'Ticket Booking System',
    category: 'feature',
    descriptionRu: 'Возможность приобретения билетов на показы и генерация QR-кодов доступа',
    enabled: true,
    icon: 'Ticket'
  },
  func_job_applications: {
    id: 'func_job_applications',
    nameRu: 'Отклики на Вакансии и Кастинги',
    nameAz: 'Kastinq Müraciətləri',
    nameEn: 'Casting & Job Applications',
    category: 'feature',
    descriptionRu: 'Форма подачи резюме, портфолио моделей и прямого отклика на кастинги',
    enabled: true,
    icon: 'Send'
  },
  func_needle_badges: {
    id: 'func_needle_badges',
    nameRu: 'Знаки отличия «Золотая & Серебряная игла»',
    nameAz: 'Qızıl & Gümüş İynə Nişanları',
    nameEn: 'Golden & Silver Needle Badges',
    category: 'feature',
    descriptionRu: 'Официальные бейджи признания мастерства дизайнеров в профилях и каталоге',
    enabled: true,
    icon: 'Award'
  },
  func_agency_applications: {
    id: 'func_agency_applications',
    nameRu: 'Подача заявок агентств',
    nameAz: 'Agentlik Müraciətləri',
    nameEn: 'Agency Registration Portal',
    category: 'feature',
    descriptionRu: 'Регистрация новых агентств и запрос официального бейджа верификации',
    enabled: true,
    icon: 'ShieldCheck'
  },
  func_sound_effects: {
    id: 'func_sound_effects',
    nameRu: 'Звуковые эффекты платформы',
    nameAz: 'Səs Effektləri',
    nameEn: 'Interactive Sound Effects',
    category: 'feature',
    descriptionRu: 'Аудио-отклик при кликах, получении сообщений и уведомлений',
    enabled: true,
    icon: 'Volume2'
  },

  // --- Home Screen Sections ---
  home_hero_banner: {
    id: 'home_hero_banner',
    nameRu: 'Главный баннер и видео (Hero Banner)',
    nameAz: 'Əsas Banner və Video',
    nameEn: 'Hero Header & Video Banner',
    category: 'home_section',
    path: '/',
    descriptionRu: 'Вступительный экран с брендингом Baku Fashion Week, видеопоказом и кнопками перехода',
    enabled: true,
    icon: 'Image'
  },
  home_ticker: {
    id: 'home_ticker',
    nameRu: 'Бегущая строка на Главной (Marquee Ticker)',
    nameAz: 'Hərəkətli Xətt',
    nameEn: 'Marquee Ticker Strip',
    category: 'home_section',
    path: '/',
    descriptionRu: 'Динамическая бегущая строка с разделами недели моды под главным баннером',
    enabled: true,
    icon: 'Sliders'
  },
  home_manifesto: {
    id: 'home_manifesto',
    nameRu: 'Блок манифеста и философии (Manifesto)',
    nameAz: 'Manifest və Missiya',
    nameEn: 'Manifesto & Mission Block',
    category: 'home_section',
    path: '/',
    descriptionRu: 'Блок «Elevating Style» с описанием миссии платформы и переходом к календарю',
    enabled: true,
    icon: 'Layers'
  },
  home_partners_strip: {
    id: 'home_partners_strip',
    nameRu: 'Форма партнёрства (Sponsor a Show)',
    nameAz: 'Tərəfdaşlıq Müraciəti',
    nameEn: 'Sponsor a Show Section',
    category: 'home_section',
    path: '/',
    descriptionRu: 'Раздел преимуществ спонсорства и форма прямой подачи заявки для брендов',
    enabled: true,
    icon: 'Building2'
  },
  home_sponsors_marquee: {
    id: 'home_sponsors_marquee',
    nameRu: 'Лента спонсоров и партнеров (Sponsors Marquee)',
    nameAz: 'Sponsor Loqoları',
    nameEn: 'Sponsors Logos Strip',
    category: 'home_section',
    path: '/',
    descriptionRu: 'Анимированная лента логотипов официальных партнеров и спонсоров недели моды',
    enabled: true,
    icon: 'Building'
  },
  home_newsletter: {
    id: 'home_newsletter',
    nameRu: 'Блок подписки (Join Front Row / Newsletter)',
    nameAz: 'Bülletenə Abunəlik',
    nameEn: 'Newsletter Subscription',
    category: 'home_section',
    path: '/',
    descriptionRu: 'Форма подписки на эксклюзивные анонсы коллекций по Email и WhatsApp',
    enabled: true,
    icon: 'Send'
  }
};

const STORAGE_KEY = 'az_fashion_site_features_v1';
const VISUAL_MODE_STORAGE_KEY = 'az_fashion_visual_mode';

interface SiteFeaturesContextType {
  features: Record<string, SiteFeatureConfig>;
  loading: boolean;
  visualEditMode: boolean;
  setVisualEditMode: (active: boolean) => void;
  toggleFeature: (id: string, forceState?: boolean) => Promise<boolean>;
  isFeatureEnabled: (id: string) => boolean;
  isPathEnabled: (path: string) => boolean;
  resetToDefaults: () => Promise<void>;
  enableAll: () => Promise<void>;
}

const SiteFeaturesContext = createContext<SiteFeaturesContextType | null>(null);

export const useSiteFeatures = () => {
  const ctx = useContext(SiteFeaturesContext);
  if (!ctx) {
    throw new Error('useSiteFeatures must be used within SiteFeaturesProvider');
  }
  return ctx;
};

export const SiteFeaturesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [features, setFeatures] = useState<Record<string, SiteFeatureConfig>>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Merge with defaults to ensure any newly added keys exist
        return { ...DEFAULT_SITE_FEATURES, ...parsed };
      }
    } catch {}
    return DEFAULT_SITE_FEATURES;
  });

  const [loading, setLoading] = useState(true);
  const [visualEditMode, setVisualEditModeState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(VISUAL_MODE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const setVisualEditMode = (active: boolean) => {
    setVisualEditModeState(active);
    try {
      localStorage.setItem(VISUAL_MODE_STORAGE_KEY, active ? 'true' : 'false');
    } catch {}
    if (active) {
      toast.success('Визуальный режим управления разделами ВКЛЮЧЕН. Вы можете переходить по страницам сайта и включать/выключать разделы в 1 клик.');
    } else {
      toast.info('Визуальный режим управления выключен.');
    }
  };

  // Real-time synchronization with Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'siteSettings', 'features'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updated = { ...DEFAULT_SITE_FEATURES };
        
        Object.keys(DEFAULT_SITE_FEATURES).forEach((key) => {
          if (data[key] && typeof data[key].enabled === 'boolean') {
            updated[key] = {
              ...updated[key],
              enabled: data[key].enabled
            };
          } else if (typeof data[key] === 'boolean') {
            updated[key] = {
              ...updated[key],
              enabled: data[key]
            };
          }
        });

        setFeatures(updated);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }
      setLoading(false);
    }, (error) => {
      console.warn('Firestore siteSettings/features subscription error, using local state:', error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const toggleFeature = async (id: string, forceState?: boolean): Promise<boolean> => {
    const target = features[id];
    if (!target) return false;

    const nextState = forceState !== undefined ? forceState : !target.enabled;
    const updatedFeatures = {
      ...features,
      [id]: {
        ...target,
        enabled: nextState
      }
    };

    // Optimistic update
    setFeatures(updatedFeatures);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFeatures));
    } catch {}

    // Prepare payload for Firestore
    const payload: Record<string, boolean> = {};
    Object.keys(updatedFeatures).forEach((key) => {
      payload[key] = updatedFeatures[key].enabled;
    });

    try {
      await setDoc(doc(db, 'siteSettings', 'features'), payload, { merge: true });
      toast.success(`«${target.nameRu}» ${nextState ? 'ВКЛЮЧЕН' : 'ОТКЛЮЧЕН'}`);
      return true;
    } catch (err: any) {
      console.error('Failed to sync feature toggle to Firestore:', err);
      toast.error('Не удалось сохранить в облаке (проверьте права администратора)');
      return false;
    }
  };

  const isFeatureEnabled = (id: string): boolean => {
    const feat = features[id];
    return feat ? feat.enabled : true;
  };

  const isPathEnabled = (path: string): boolean => {
    // Exact or prefix match for routes
    const found = Object.values(features).find(
      (f) => f.category === 'page' && f.path && (f.path === path || (f.path !== '/' && path.startsWith(f.path)))
    );
    return found ? found.enabled : true;
  };

  const resetToDefaults = async () => {
    setFeatures(DEFAULT_SITE_FEATURES);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SITE_FEATURES));
      const payload: Record<string, boolean> = {};
      Object.keys(DEFAULT_SITE_FEATURES).forEach((key) => {
        payload[key] = DEFAULT_SITE_FEATURES[key].enabled;
      });
      await setDoc(doc(db, 'siteSettings', 'features'), payload, { merge: true });
      toast.success('Все разделы и функции сброшены к стандартным значениям');
    } catch (err) {
      console.error(err);
      toast.error('Ошибка сохранения стандартных настроек');
    }
  };

  const enableAll = async () => {
    const allEnabled = { ...features };
    const payload: Record<string, boolean> = {};
    Object.keys(allEnabled).forEach((k) => {
      allEnabled[k] = { ...allEnabled[k], enabled: true };
      payload[k] = true;
    });

    setFeatures(allEnabled);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allEnabled));
      await setDoc(doc(db, 'siteSettings', 'features'), payload, { merge: true });
      toast.success('Все разделы и функции включены');
    } catch (err) {
      console.error(err);
      toast.error('Ошибка включения');
    }
  };

  return (
    <SiteFeaturesContext.Provider
      value={{
        features,
        loading,
        visualEditMode,
        setVisualEditMode,
        toggleFeature,
        isFeatureEnabled,
        isPathEnabled,
        resetToDefaults,
        enableAll
      }}
    >
      {children}
    </SiteFeaturesContext.Provider>
  );
};
