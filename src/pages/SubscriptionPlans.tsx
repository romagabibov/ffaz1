import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { apiFetch } from '../lib/apiClient';
import { useNavigate, Link } from 'react-router';
import { 
  Check, X, Sparkles, Award, ShieldCheck, Zap, Briefcase, 
  HelpCircle, ChevronDown, ChevronUp, Lock, Send, MessageSquare, 
  Eye, Star, Crown, Flame, ArrowRight, ExternalLink, CheckCircle2,
  Building2, Users, ArrowUpRight, CreditCard, Shield, AlertCircle,
  Clock, CheckCircle, RefreshCw, Smartphone, Plus
} from 'lucide-react';
import GoldenNeedleBadge from '../components/GoldenNeedleBadge';
import SilverNeedleBadge from '../components/SilverNeedleBadge';
import { useUI } from '../context/UIContext';
import { isSubscriptionActive } from '../lib/communityLimits';

export default function SubscriptionPlans() {
  const ui = useUI();
  const { dbUser, currentUser } = useAuth();
  const { t } = useTranslation();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showNeedleModal, setShowNeedleModal] = useState(false);
  const [needleBrandName, setNeedleBrandName] = useState('');
  const [needlePortfolioLink, setNeedlePortfolioLink] = useState('');
  const navigate = useNavigate();

  // Payment Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutTarget, setCheckoutTarget] = useState<'pro' | 'elite' | 'job_one_time' | null>(null);
  const [checkoutBillingCycle, setCheckoutBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'birbank' | 'apple_pay'>('card');
  const [cardHolder, setCardHolder] = useState(dbUser?.name || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [saveCard, setSaveCard] = useState(true);
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'success' | 'error'>('form');
  const [transactionId, setTransactionId] = useState('');
  
  // Downgrade confirmation modal
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);

  const isSubActive = isSubscriptionActive(dbUser);
  const currentTier = isSubActive 
    ? (dbUser?.subscriptionTier === 'creator' ? 'pro' : (dbUser?.subscriptionTier || 'free'))
    : 'free';

  // Open checkout for a paid plan or trigger free plan downgrade
  const handleInitiateTierChange = (tier: 'free' | 'pro' | 'elite' | 'job_one_time') => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (tier === 'free') {
      if (currentTier === 'pro' || currentTier === 'elite') {
        setShowDowngradeModal(true);
      } else {
        ui.alert('Вы уже находитесь на базовом тарифе Free.');
      }
      return;
    }

    setCheckoutTarget(tier);
    setCheckoutBillingCycle(billingCycle);
    setPaymentStep('form');
    setCardHolder(dbUser?.name || currentUser.displayName || '');
    setCardNumber('');
    setCardExpiry('');
    setCardCvc('');
    setShowCheckoutModal(true);
  };

  const handleConfirmDowngrade = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        subscriptionTier: 'free',
        billingCycle: null,
        subscriptionValidUntil: null,
        hasJobPostingAccess: false,
        vipGiveawayEntered: false
      });
      setShowDowngradeModal(false);
      ui.alert('Ваш аккаунт переведен на базовый тариф FFAZ Free.');
    } catch (err: any) {
      console.error(err);
      ui.alert('Ошибка смены тарифа: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Format Card Number (with spaces)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Format Expiry (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      raw = raw.slice(0, 2) + '/' + raw.slice(2);
    }
    setCardExpiry(raw);
  };

  // Execute Payment Simulation and Activate Subscription
  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !checkoutTarget) return;

    if (paymentMethod === 'card') {
      if (cardNumber.replace(/\s/g, '').length < 16) {
        ui.alert('Пожалуйста, введите корректный 16-значный номер карты.');
        return;
      }
      if (cardExpiry.length < 5) {
        ui.alert('Укажите срок действия карты в формате MM/YY.');
        return;
      }
      if (cardCvc.length < 3) {
        ui.alert('Укажите корректный 3-значный CVC/CVV код.');
        return;
      }
    }

    setPaymentStep('processing');
    const generatedTxId = 'FFAZ-' + Math.floor(100000 + Math.random() * 900000);
    setTransactionId(generatedTxId);

    // Process payment securely via server endpoint
    setTimeout(async () => {
      try {
        const amount = checkoutTarget === 'job_one_time'
          ? 7
          : (checkoutTarget === 'elite' 
            ? (checkoutBillingCycle === 'yearly' ? 480 : 49) 
            : (checkoutBillingCycle === 'yearly' ? 264 : 25));

        const res = await apiFetch('/api/subscriptions/purchase', {
          method: 'POST',
          body: JSON.stringify({
            planId: checkoutTarget === 'job_one_time' ? 'job_credit' : checkoutTarget,
            billingCycle: checkoutBillingCycle,
            amount
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Payment failed');
        }

        setPaymentStep('success');
      } catch (err: any) {
        console.error(err);
        setPaymentStep('error');
        ui.alert('Ошибка при проведении платежа: ' + err.message);
      }
    }, 1500);
  };

  const handleApplySilverNeedle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (!needlePortfolioLink.trim()) {
      ui.alert('Пожалуйста, укажите ссылку на портфолио или Instagram бренда.');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'needleApplications'), {
        userId: currentUser.uid,
        userName: dbUser?.name || currentUser.displayName || 'Anonymous',
        userEmail: currentUser.email,
        type: 'silver',
        brandName: needleBrandName.trim() || dbUser?.name,
        portfolioUrl: needlePortfolioLink.trim(),
        status: 'pending',
        fee: 40,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'users', currentUser.uid), {
        silverNeedleStatus: 'pending'
      });

      setShowNeedleModal(false);
      ui.alert('Заявка на Серебряную Иглу (40 AZN) принята! Экспертный совет рассмотрит ваши работы в течение 48 часов.');
    } catch (err: any) {
      console.error(err);
      ui.alert('Ошибка отправки заявки: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const faqItems = [
    {
      q: 'Как работает оплата и смена тарифа?',
      a: 'При выборе любого платного тарифа открывается безопасный раздел оплаты с поддержкой банковских карт Азербайджана (ABB, Kapital, Birbank, Leobank, Pasha Bank, Visa, MasterCard) и Apple Pay. После успешной авторизации статус вашего профиля и все привилегии тарифа активируются мгновенно.'
    },
    {
      q: 'Как работает разовое размещение вакансии за 7 AZN (7 манат)?',
      a: 'Если вам не требуется ежемесячная подписка, вы можете опубликовать разовую вакансию, кастинг или объявление о стажировке всего за 7 AZN. Вакансия размещается в официальном разделе «Карьера» на 30 дней, включает сбор резюме и портфолио соискателей, а также настройку скрининговых вопросов.'
    },
    {
      q: 'Как работают личные сообщения (Direct Chat) и запросы на диалог?',
      a: 'На бесплатном тарифе Free каждый пользователь может отправлять до 5 новых запросов на диалог в день любым участникам и дизайнерам каталога, а после принятия запроса общаться без ограничений. На тарифах Pro и Elite VIP ограничения на отправку новых запросов полностью сняты (безлимитные диалоги) с приоритетным статусом и отметкой в списке запросов. Во всех тарифах доступны голосовые сообщения, обмен фото, быстрые реакции ❤️, поиск по сообщениям, отмена отправки и удаление сообщений.'
    },
    {
      q: 'Как работает ограничение вакансий (блюр) на тарифе Free?',
      a: 'На бесплатном тарифе вы можете изучать описания позиций, требования и зарплатные вилки. Названия работодателей и контактные данные для прямого отклика скрыты блюром. Доступ к прямому отклику открывается на тарифах Pro и Elite VIP.'
    },
    {
      q: 'В чем разница между Pro и Elite VIP?',
      a: 'Тариф Pro (25 AZN/мес или 22 AZN/мес при оплате за год) создан для индивидуальных создателей (модели, фотографы, стилисты, визажисты) и дает прямой отклик на кастинги, приоритетное продвижение постов (+30% Boost), до 5 публикаций вакансий и живой чат сообщества. Тариф Elite VIP (49 AZN/мес или 40 AZN/мес при оплате за год) создан для дизайнеров и модных домов — он включает официальное внесение в Реестр дизайнеров, публикации до 10 вакансий бренда, доступ в VIP Lounge и участие в закрытых розыгрышах пригласительных на Неделю Моды.'
    },
    {
      q: 'Как работает розыгрыш билетов на показы Недели Моды на тарифе Elite VIP?',
      a: 'Среди всех активных подписчиков тарифа Elite VIP перед каждой Неделей моды и знаковыми событиями проводятся закрытые распределения VIP-пригласительных и пропусков в Front Row.'
    },
    {
      q: 'В чем разница между Серебряной и Золотой Иглой?',
      a: 'Серебряная Игла (Gümüş İynə) подтверждает, что профиль дизайнера или специалиста проверен экспертами на подлинность работ и профессионализм. Золотая Игла (Qızıl İynə) — высшая национальная награда модной индустрии Азербайджана, присуждаемая экспертным жюри признанным кутюрье.'
    },
    {
      q: 'Могу ли я переключить тариф или отменить подписку в любое время?',
      a: 'Да. Вы можете повысить уровень, сменить период или вернуться на базовый план в любой момент.'
    }
  ];

  const getTargetPlanPrice = () => {
    if (checkoutTarget === 'job_one_time') return '7 AZN';
    if (checkoutTarget === 'elite') {
      return checkoutBillingCycle === 'yearly' ? '480 AZN / год' : '49 AZN / мес';
    }
    return checkoutBillingCycle === 'yearly' ? '264 AZN / год' : '25 AZN / мес';
  };

  const getTargetPlanNumericPrice = () => {
    if (checkoutTarget === 'job_one_time') return 7;
    if (checkoutTarget === 'elite') {
      return checkoutBillingCycle === 'yearly' ? 480 : 49;
    }
    return checkoutBillingCycle === 'yearly' ? 264 : 25;
  };

  return (
    <div className="bg-brand-light min-h-screen text-brand-dark pb-24 lg:pb-20">
      
      {/* 1. EDITORIAL HERO HEADER */}
      <section className="border-b border-brand-dark/[0.08] bg-brand-light pt-6 pb-6 sm:py-10 px-4 sm:px-8 relative overflow-hidden shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-brand-accent px-3 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15 font-mono">
                AZ Fashion Network • Membership
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono text-brand-dark/50 uppercase tracking-wider">
                • Plans & Subscriptions
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-normal tracking-tight text-brand-dark leading-[1.05]">
              Тарифные планы & <span className="italic text-brand-accent font-serif font-normal">Подписки</span>
            </h1>
            <p className="text-xs sm:text-sm text-brand-dark/70 font-normal max-w-2xl mt-2 leading-relaxed">
              Инвестируйте в свою карьеру в индустрии моды. Прозрачные планы для создателей, независимых специалистов и признанных модных домов Азербайджана.
            </p>
          </div>

          {/* Billing Switcher (Pill Style) */}
          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            <div className="inline-flex bg-white p-1 rounded-full border border-brand-dark/[0.1] shadow-2xs">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-full font-semibold uppercase tracking-wider text-xs transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-brand-dark text-white shadow-2xs'
                    : 'text-brand-dark/70 hover:text-brand-dark'
                }`}
              >
                Помесячно
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-full font-semibold uppercase tracking-wider text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  billingCycle === 'yearly'
                    ? 'bg-brand-accent text-white shadow-2xs'
                    : 'text-brand-dark/70 hover:text-brand-dark'
                }`}
              >
                <span>На год</span>
                <span className="bg-white text-brand-dark text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full uppercase">
                  -20%
                </span>
              </button>
            </div>
            <span className="text-[11px] font-mono text-brand-dark/50">
              {billingCycle === 'yearly' ? '✓ Экономия 2 месяцев при годовой оплате' : '• Гибкая отмена в любой момент'}
            </span>
          </div>
        </div>
      </section>

      {/* 2. THREE PRICING CARDS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          
          {/* TIER 1: FREE */}
          <div className="rounded-3xl border border-brand-dark/[0.08] bg-brand-card p-5 sm:p-8 flex flex-col justify-between shadow-xs hover:border-brand-dark/20 hover:shadow-md transition-all">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-dark/50">
                  Базовый уровень
                </span>
                <span className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-muted text-brand-dark/80">
                  FREE
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-brand-dark mb-1">
                FFAZ Free
              </h2>
              <p className="text-xs text-brand-dark/65 mb-6 leading-relaxed">
                Студенты, начинающие и ценители моды
              </p>

              {/* Price */}
              <div className="mb-6 pb-6 border-b border-brand-dark/[0.08]">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-display font-bold text-brand-dark">0</span>
                  <span className="text-lg font-bold font-mono text-brand-dark/80">AZN</span>
                </div>
                <p className="text-xs text-brand-dark/50 mt-1">Бессрочный базовый доступ</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 text-xs text-brand-dark/80 mb-8">
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-brand-accent shrink-0 mt-0.5" />
                  <span>Просмотр ленты публикаций, новостей и коллекций</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-brand-accent shrink-0 mt-0.5" />
                  <span>Личные сообщения (Direct): до <strong className="font-semibold text-brand-dark">5 новых запросов в день</strong> (включая дизайнеров)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-brand-accent shrink-0 mt-0.5" />
                  <span><strong className="font-semibold text-brand-dark">Безлимитный чат</strong> после принятия запроса собеседником</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-brand-accent shrink-0 mt-0.5" />
                  <span>Функции чата: голосовые, фото, реакции ❤️, <strong className="font-semibold text-brand-dark">отмена отправки</strong> и удаление</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-brand-accent shrink-0 mt-0.5" />
                  <span>Просмотр вакансий и кастингов <span className="text-brand-dark/50">(контакты скрыты)</span></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-brand-accent shrink-0 mt-0.5" />
                  <span>Общий <strong className="font-semibold text-brand-dark">Fashion Community Live</strong> (1 сообщение в день)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-brand-accent shrink-0 mt-0.5" />
                  <span>Каталог дизайнеров и календарь показов</span>
                </li>
              </ul>
            </div>

            <div className="pt-2">
              <button 
                disabled={loading || currentTier === 'free' || currentTier === 'guest'} 
                onClick={() => handleInitiateTierChange('free')}
                className="w-full py-3 px-4 rounded-full font-semibold uppercase tracking-wider text-xs border border-brand-dark/20 text-brand-dark hover:bg-brand-dark hover:text-white transition-all disabled:opacity-40 cursor-pointer shadow-2xs"
              >
                {currentTier === 'free' || currentTier === 'guest' ? 'Текущий активный план' : 'Перейти на Free'}
              </button>
            </div>
          </div>

          {/* TIER 2: PRO */}
          <div className="rounded-3xl border-2 border-brand-accent bg-brand-card p-5 sm:p-8 flex flex-col justify-between shadow-lg relative ring-4 ring-brand-accent/5">
            {/* Badge */}
            <div className="absolute -top-3.5 right-6 bg-brand-accent text-white px-3.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider shadow-sm flex items-center gap-1.5">
              <Sparkles size={12} />
              <span>Популярный выбор</span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-accent">
                  Creative Pro
                </span>
                <span className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-accent/10 text-brand-accent">
                  PRO
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-brand-dark mb-1">
                FFAZ Pro
              </h2>
              <p className="text-xs text-brand-accent font-medium mb-6 leading-relaxed">
                Модели, фотографы, стилисты и визажисты
              </p>

              {/* Price */}
              <div className="mb-6 pb-6 border-b border-brand-dark/[0.08]">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-display font-bold text-brand-accent">
                    {billingCycle === 'yearly' ? '22' : '25'}
                  </span>
                  <span className="text-lg font-bold font-mono text-brand-dark">AZN</span>
                  <span className="text-xs text-brand-dark/60 font-medium">/ месяц</span>
                </div>
                <p className="text-xs text-brand-dark/50 mt-1">
                  {billingCycle === 'yearly' ? '264 AZN списывается за год (годовой тариф)' : 'Ежемесячный расчет'}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-3 text-xs text-brand-dark/85 mb-8">
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-brand-accent shrink-0 mt-0.5" />
                  <span><strong className="font-semibold text-brand-dark">Безлимитный Direct Chat</strong> — пишите дизайнерам и пользователям без лимитов</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-brand-accent shrink-0 mt-0.5" />
                  <span>Приоритетный статус запросов с отметкой <strong className="text-brand-accent font-mono">PRO</strong> в диалогах</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-brand-accent shrink-0 mt-0.5" />
                  <span>Полный функционал чата: аудио, фото, поиск, реакции ❤️, отмена отправки и удаление</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-brand-accent shrink-0 mt-0.5" />
                  <span><strong className="font-semibold text-brand-dark">Прямой отклик</strong> на все вакансии и кастинги с контактами</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-brand-accent shrink-0 mt-0.5" />
                  <span><strong className="font-semibold text-brand-dark">+30% Boost охвата</strong> постов в рекомендациях сообщества</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-brand-accent shrink-0 mt-0.5" />
                  <span>В день <strong className="font-semibold text-brand-dark">5 сообщений</strong> в Fashion Community Live</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-brand-accent shrink-0 mt-0.5" />
                  <span>Официальный знак отличия <strong className="text-brand-accent font-mono">PRO</strong> в профиле и ленте</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-brand-accent shrink-0 mt-0.5" />
                  <span>Размещение <strong className="font-semibold text-brand-dark">до 5 вакансий</strong></span>
                </li>
              </ul>
            </div>

            <div className="pt-2">
              <button 
                disabled={loading || currentTier === 'pro'} 
                onClick={() => handleInitiateTierChange('pro')}
                className="w-full py-3 px-4 rounded-full font-semibold uppercase tracking-wider text-xs bg-brand-accent text-white hover:bg-brand-dark transition-all disabled:opacity-40 cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <CreditCard size={14} />
                <span>{currentTier === 'pro' ? 'Текущий активный план' : 'Оплатить и активировать Pro'}</span>
              </button>
            </div>
          </div>

          {/* TIER 3: ELITE VIP */}
          <div className="rounded-3xl border border-stone-800 bg-stone-900 text-white p-5 sm:p-8 flex flex-col justify-between shadow-xl relative">
            {/* Top Amber Ribbon */}
            <div className="absolute -top-3.5 right-6 bg-amber-400 text-stone-950 px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5">
              <Crown size={12} />
              <span>Top Tier</span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-300">
                  Institutional
                </span>
                <span className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-300/30">
                  ELITE VIP
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-1">
                FFAZ Elite VIP
              </h2>
              <p className="text-xs text-white/60 mb-6 leading-relaxed">
                Кутюрье, дома моды, бренды и ключевые эксперты
              </p>

              {/* Price */}
              <div className="mb-6 pb-6 border-b border-white/10">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-display font-bold text-amber-300">
                    {billingCycle === 'yearly' ? '40' : '49'}
                  </span>
                  <span className="text-lg font-bold font-mono text-white">AZN</span>
                  <span className="text-xs text-white/60 font-medium">/ месяц</span>
                </div>
                <p className="text-xs text-white/50 mt-1">
                  {billingCycle === 'yearly' ? '480 AZN списывается за год (годовой тариф)' : 'Ежемесячный расчет'}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-3 text-xs text-white/90 mb-8">
                <li className="flex items-start gap-2.5 bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <Star size={16} className="text-amber-400 shrink-0 mt-0.5 fill-amber-400" />
                  <span className="font-semibold text-amber-200">
                    🎟️ Розыгрыш VIP-пригласительных и Front Row на Недели Моды
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>Высший VIP-статус в <strong className="text-white">Direct Chat</strong> с домами моды и экспертами</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>Официальное включение бренда в <strong className="text-white">Реестр дизайнеров</strong> (с проверкой)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>Размещение до <strong className="text-white">10 вакансий и кастингов</strong> бренда</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>Доступ в закрытый <strong className="text-white">VIP Pro Lounge</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>В день <strong className="text-white">10 сообщений</strong> в Fashion Community Live</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>Приоритетная заявка на знак <GoldenNeedleBadge size="xs" /> «Золотая / Серебряная Игла»</span>
                </li>
              </ul>
            </div>

            <div className="pt-2">
              <button 
                disabled={loading || currentTier === 'elite'} 
                onClick={() => handleInitiateTierChange('elite')}
                className="w-full py-3 px-4 rounded-full font-semibold uppercase tracking-wider text-xs bg-white text-stone-950 hover:bg-amber-400 transition-all disabled:opacity-40 cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <Crown size={14} />
                <span>{currentTier === 'elite' ? 'Текущий активный план' : 'Оплатить и активировать Elite VIP'}</span>
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 2.5 SINGLE JOB POSTING SECTION (7 AZN / 7 МАНАТ) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 mb-16">
        <div className="rounded-3xl border border-brand-accent/30 bg-gradient-to-br from-brand-card via-white to-brand-accent/5 p-7 sm:p-10 shadow-sm relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative z-10">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-accent/20 bg-brand-accent/10 px-3.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-brand-accent mb-3">
                <Briefcase size={13} />
                <span>Разовая услуга • One-Time Placement</span>
              </div>
              
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-brand-dark mb-2">
                Разовое размещение вакансии за <span className="text-brand-accent">7 AZN</span>
              </h3>
              
              <p className="text-xs sm:text-sm text-brand-dark/75 leading-relaxed font-normal">
                Ищете стилиста, модель, фотографа или ассистента на проект без оформления регулярной подписки? Опубликуйте разовую вакансию или кастинг в официальном разделе «Карьера» на 30 дней с прямым сбором откликов и портфолио кандидатов.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-5 text-xs text-brand-dark/85 font-medium">
                <div className="flex items-center gap-2">
                  <Check size={15} className="text-brand-accent shrink-0" />
                  <span>30 дней активного размещения в каталоге</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={15} className="text-brand-accent shrink-0" />
                  <span>Прямой сбор откликов и анкет кандидатов</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={15} className="text-brand-accent shrink-0" />
                  <span>Настройка индивидуальных скрининг-вопросов</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={15} className="text-brand-accent shrink-0" />
                  <span>Мгновенный запуск после оплаты (7 AZN)</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-brand-dark/[0.1] p-6 sm:p-7 text-center shadow-xs lg:w-72 shrink-0 w-full flex flex-col items-center justify-between">
              <div className="mb-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-brand-dark/50 font-bold block">
                  Единоразовый платеж
                </span>
                <div className="flex items-baseline justify-center gap-1 mt-1">
                  <span className="text-4xl font-display font-bold text-brand-accent">7</span>
                  <span className="text-lg font-bold font-mono text-brand-dark">AZN</span>
                  <span className="text-xs text-brand-dark/50">/ пост</span>
                </div>
                <span className="text-[11px] text-brand-dark/60 font-mono block mt-1">
                  1 вакансия • 30 дней
                </span>
                {Number(dbUser?.singleJobCredits || 0) > 0 && (
                  <span className="mt-2 inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold">
                    ✓ Доступно слотов: {dbUser?.singleJobCredits}
                  </span>
                )}
              </div>

              <div className="w-full flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleInitiateTierChange('job_one_time')}
                  className="w-full py-3.5 px-6 rounded-full bg-brand-accent hover:bg-brand-dark text-white font-semibold uppercase tracking-wider text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <CreditCard size={14} />
                  <span>Оплатить слот (7 AZN)</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/careers?post=true')}
                  className="w-full py-2.5 px-6 rounded-full border border-brand-dark/20 text-brand-dark hover:bg-brand-muted/40 font-semibold uppercase tracking-wider text-[11px] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Заполнить вакансию</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURE MATRIX / COMPARISON TABLE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 mb-16">
        <div className="rounded-3xl border border-brand-dark/[0.08] bg-brand-card overflow-hidden shadow-xs">
          
          <div className="p-6 sm:p-8 border-b border-brand-dark/[0.08] bg-brand-muted/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                Feature Comparison Matrix
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-dark mt-1.5">
                Сравнение возможностей тарифов
              </h2>
            </div>
            <div className="font-mono text-xs text-brand-dark/60">
              3 Уровня Доступа • Азербайджан
            </div>
          </div>

          <div className="overflow-x-auto no-scrollbar scroll-smooth">
            <div className="sm:hidden flex items-center justify-between text-[10px] font-mono text-brand-dark/50 px-4 py-2 bg-brand-muted/40 border-b border-brand-dark/[0.06]">
              <span>← Прокрутите вправо для сравнения →</span>
              <span className="text-brand-accent font-bold">3 ТАРИФА</span>
            </div>
            <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[620px] sm:min-w-[680px]">
              <thead>
                <tr className="border-b border-brand-dark/[0.08] bg-brand-dark text-white uppercase tracking-wider text-[11px] font-mono">
                  <th className="p-4">Возможности платформы</th>
                  <th className="p-4 text-center w-36">Free (0 AZN)</th>
                  <th className="p-4 text-center w-44 bg-brand-accent text-white">Pro ({billingCycle === 'yearly' ? '22' : '25'} AZN)</th>
                  <th className="p-4 text-center w-48 bg-stone-900 text-amber-300">Elite VIP ({billingCycle === 'yearly' ? '40' : '49'} AZN)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-dark/[0.06] text-brand-dark">
                <tr className="hover:bg-brand-muted/20 transition-colors">
                  <td className="p-4 font-medium">Просмотр ленты, новостей и коллекций</td>
                  <td className="p-4 text-center"><Check className="mx-auto text-brand-dark/70" size={17} /></td>
                  <td className="p-4 text-center bg-brand-accent/5"><Check className="mx-auto text-brand-accent" size={17} /></td>
                  <td className="p-4 text-center bg-stone-50"><Check className="mx-auto text-brand-dark" size={17} /></td>
                </tr>

                <tr className="hover:bg-brand-muted/20 transition-colors">
                  <td className="p-4 font-medium">Просмотр вакансий и кастингов</td>
                  <td className="p-4 text-center text-xs text-brand-dark/60">Скрыты контакты</td>
                  <td className="p-4 text-center bg-brand-accent/5 font-semibold text-brand-accent text-xs">Контакты открыты</td>
                  <td className="p-4 text-center bg-stone-50 font-semibold text-brand-dark text-xs">Контакты открыты</td>
                </tr>

                <tr className="hover:bg-brand-muted/20 transition-colors">
                  <td className="p-4 font-medium">Прямой отклик на все вакансии с портфолио</td>
                  <td className="p-4 text-center text-brand-dark/30">—</td>
                  <td className="p-4 text-center bg-brand-accent/5"><Check className="mx-auto text-brand-accent" size={17} /></td>
                  <td className="p-4 text-center bg-stone-50"><Check className="mx-auto text-brand-dark" size={17} /></td>
                </tr>

                <tr className="hover:bg-brand-muted/20 transition-colors">
                  <td className="p-4 font-medium">Буст постов в рекомендациях сообщества</td>
                  <td className="p-4 text-center text-xs text-brand-dark/50">Стандартный</td>
                  <td className="p-4 text-center bg-brand-accent/5 font-mono text-xs font-semibold text-brand-accent">+30% Boost</td>
                  <td className="p-4 text-center bg-stone-50 font-mono text-xs font-bold text-brand-dark">TOP Priority</td>
                </tr>

                <tr className="hover:bg-brand-muted/20 transition-colors">
                  <td className="p-4 font-medium">Сообщения в Fashion Community Live</td>
                  <td className="p-4 text-center text-xs text-brand-dark/70 font-mono">1 в день (чтение)</td>
                  <td className="p-4 text-center bg-brand-accent/5 text-xs font-mono font-semibold text-brand-accent">5 сообщений в день</td>
                  <td className="p-4 text-center bg-stone-50 text-xs font-mono font-bold text-brand-dark">10 сообщений / VIP</td>
                </tr>

                <tr className="hover:bg-brand-muted/20 transition-colors">
                  <td className="p-4 font-medium">Официальный знак отличия в профиле и ленте</td>
                  <td className="p-4 text-center text-brand-dark/30">—</td>
                  <td className="p-4 text-center bg-brand-accent/5 font-mono text-xs font-bold text-brand-accent">PRO</td>
                  <td className="p-4 text-center bg-stone-50 font-mono text-xs font-bold text-amber-600">ELITE VIP</td>
                </tr>

                <tr className="hover:bg-brand-muted/20 transition-colors">
                  <td className="p-4 font-medium">
                    <div>Личные сообщения (Direct Chat)</div>
                    <div className="text-[11px] text-brand-dark/50 font-normal">Запросы дизайнерам и участникам</div>
                  </td>
                  <td className="p-4 text-center text-xs font-mono text-brand-dark/80">До 5 новых запросов/день</td>
                  <td className="p-4 text-center bg-brand-accent/5 font-mono text-xs font-semibold text-brand-accent">Безлимитно (PRO статус)</td>
                  <td className="p-4 text-center bg-stone-50 font-mono text-xs font-bold text-brand-dark">Безлимитно (VIP статус)</td>
                </tr>

                <tr className="hover:bg-brand-muted/20 transition-colors">
                  <td className="p-4 font-medium">
                    <div>Функции диалогов</div>
                    <div className="text-[11px] text-brand-dark/50 font-normal">Голосовые сообщения, фото, реакции ❤️, поиск</div>
                  </td>
                  <td className="p-4 text-center"><Check className="mx-auto text-brand-dark/70" size={17} /></td>
                  <td className="p-4 text-center bg-brand-accent/5"><Check className="mx-auto text-brand-accent" size={17} /></td>
                  <td className="p-4 text-center bg-stone-50"><Check className="mx-auto text-brand-dark" size={17} /></td>
                </tr>

                <tr className="hover:bg-brand-muted/20 transition-colors">
                  <td className="p-4 font-medium">
                    <div>Управление сообщениями</div>
                    <div className="text-[11px] text-brand-dark/50 font-normal">Отмена отправки (у всех) и удаление у себя</div>
                  </td>
                  <td className="p-4 text-center"><Check className="mx-auto text-brand-dark/70" size={17} /></td>
                  <td className="p-4 text-center bg-brand-accent/5"><Check className="mx-auto text-brand-accent" size={17} /></td>
                  <td className="p-4 text-center bg-stone-50"><Check className="mx-auto text-brand-dark" size={17} /></td>
                </tr>

                <tr className="hover:bg-brand-muted/20 transition-colors">
                  <td className="p-4 font-medium">
                    <div>Приватность диалогов</div>
                    <div className="text-[11px] text-brand-dark/50 font-normal">Очистка истории при удалении чата (с чистого листа)</div>
                  </td>
                  <td className="p-4 text-center"><Check className="mx-auto text-brand-dark/70" size={17} /></td>
                  <td className="p-4 text-center bg-brand-accent/5"><Check className="mx-auto text-brand-accent" size={17} /></td>
                  <td className="p-4 text-center bg-stone-50"><Check className="mx-auto text-brand-dark" size={17} /></td>
                </tr>

                <tr className="hover:bg-brand-muted/20 transition-colors">
                  <td className="p-4 font-medium">Размещение вакансий и кастингов бренда</td>
                  <td className="p-4 text-center font-mono text-xs text-brand-accent font-semibold">Разово (7 AZN)</td>
                  <td className="p-4 text-center bg-brand-accent/5 font-mono text-xs font-semibold text-brand-accent">До 5 вакансий</td>
                  <td className="p-4 text-center bg-stone-50 font-mono text-xs font-bold text-brand-dark">До 10 вакансий</td>
                </tr>

                <tr className="hover:bg-brand-muted/20 transition-colors">
                  <td className="p-4 font-medium">Официальное включение в Реестр дизайнеров</td>
                  <td className="p-4 text-center text-brand-dark/30">—</td>
                  <td className="p-4 text-center bg-brand-accent/5 text-brand-dark/30">—</td>
                  <td className="p-4 text-center bg-stone-50 font-mono text-xs font-semibold text-brand-accent">Включено (с проверкой)</td>
                </tr>

                <tr className="hover:bg-brand-muted/20 transition-colors">
                  <td className="p-4 font-medium">Доступ в закрытый VIP Pro Lounge</td>
                  <td className="p-4 text-center text-brand-dark/30">—</td>
                  <td className="p-4 text-center bg-brand-accent/5 text-brand-dark/30">—</td>
                  <td className="p-4 text-center bg-stone-50"><Check className="mx-auto text-brand-dark" size={17} /></td>
                </tr>

                <tr className="hover:bg-brand-muted/20 transition-colors">
                  <td className="p-4 font-medium">🎟️ Розыгрыш VIP-билетов Front Row на Недели Моды</td>
                  <td className="p-4 text-center text-brand-dark/30">—</td>
                  <td className="p-4 text-center bg-brand-accent/5 text-brand-dark/30">—</td>
                  <td className="p-4 text-center bg-stone-50 font-mono text-xs font-bold text-amber-700 flex items-center justify-center gap-1.5 py-4">
                    <Crown size={15} /> Включено
                  </td>
                </tr>

                <tr className="hover:bg-brand-muted/20 transition-colors">
                  <td className="p-4 font-medium">Приоритетная заявка «Золотая / Серебряная Игла»</td>
                  <td className="p-4 text-center text-brand-dark/30">—</td>
                  <td className="p-4 text-center bg-brand-accent/5 text-brand-dark/30">—</td>
                  <td className="p-4 text-center bg-stone-50 font-mono text-xs font-semibold text-amber-600">Приоритет</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </section>

      {/* 4. SILVER NEEDLE CERTIFICATION AUDIT CARD */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 mb-16">
        <div className="rounded-3xl border border-brand-dark/[0.08] bg-white p-7 sm:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xs">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-dark/[0.08] bg-brand-light px-3 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-brand-dark mb-3">
              <SilverNeedleBadge size="xs" />
              <span>Официальная верификация • Gümüş İynə</span>
            </div>
            
            <h3 className="text-2xl sm:text-3xl font-serif font-bold text-brand-dark mb-2">
              Аудит авторства и знак «Серебряная Игла»
            </h3>
            
            <p className="text-xs sm:text-sm text-brand-dark/70 leading-relaxed">
              Экспертный совет Центра развития моды проводит аудит вашего портфолио, проверяет подлинность работ и присваивает профилю официальный знак отличия. Единоразовый сбор за экспертную комиссию.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowNeedleModal(true)}
            className="w-full md:w-auto px-7 py-3.5 bg-brand-dark text-white hover:bg-brand-accent rounded-full font-semibold uppercase tracking-wider text-xs transition-colors shrink-0 cursor-pointer shadow-2xs"
          >
            Подать заявку на аудит (40 AZN)
          </button>
        </div>
      </section>

      {/* 5. FAQ SECTION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-8 mb-16">
        <div className="text-center mb-8">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
            Вопросы и ответы
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-brand-dark mt-2">
            Часто задаваемые вопросы
          </h2>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="rounded-2xl border border-brand-dark/[0.08] bg-white overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-5 sm:p-6 text-left font-display font-semibold text-sm sm:text-base text-brand-dark flex justify-between items-center gap-4 cursor-pointer hover:bg-brand-muted/20 transition-colors"
                >
                  <span>{item.q}</span>
                  <div className="w-8 h-8 rounded-full border border-brand-dark/10 flex items-center justify-center shrink-0 bg-brand-light">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>
                {isOpen && (
                  <div className="p-5 sm:p-6 pt-0 text-xs sm:text-sm text-brand-dark/75 leading-relaxed border-t border-brand-dark/[0.05]">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. PAYMENT CHECKOUT MODAL */}
      {showCheckoutModal && checkoutTarget && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-brand-card rounded-3xl border border-brand-dark/[0.12] p-6 sm:p-8 max-w-xl w-full shadow-2xl relative my-8 animate-in zoom-in-95 duration-200">
            
            {/* Modal Close Button */}
            <button 
              type="button" 
              onClick={() => {
                if (paymentStep !== 'processing') {
                  setShowCheckoutModal(false);
                }
              }} 
              className="absolute top-6 right-6 w-8 h-8 rounded-full border border-brand-dark/15 flex items-center justify-center hover:bg-brand-muted transition-colors cursor-pointer text-brand-dark"
            >
              <X size={16} />
            </button>

            {paymentStep === 'form' && (
              <form onSubmit={handleProcessPayment}>
                {/* Header */}
                <div className="mb-6 pb-4 border-b border-brand-dark/[0.08]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-accent px-2 py-0.5 rounded-full bg-brand-accent/10">
                      Безопасная оплата • SSL 256-bit
                    </span>
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-brand-dark">
                    Оформление заказа & Оплата
                  </h3>
                  <p className="text-xs text-brand-dark/65 mt-0.5">
                    Официальный биллинг Azerbaijan Fashion Network
                  </p>
                </div>

                {/* Plan / Item Summary Card */}
                <div className="bg-white rounded-2xl border border-brand-dark/[0.08] p-4 sm:p-5 mb-5 shadow-2xs">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-brand-dark/50 font-bold block">
                        Выбранная услуга
                      </span>
                      <h4 className="text-lg font-serif font-bold text-brand-dark">
                        {checkoutTarget === 'elite' 
                          ? 'Тариф FFAZ Elite VIP' 
                          : checkoutTarget === 'pro' 
                            ? 'Тариф FFAZ Pro' 
                            : 'Разовое размещение вакансии'}
                      </h4>
                      <p className="text-xs text-brand-dark/70 mt-0.5">
                        {checkoutTarget === 'job_one_time'
                          ? '1 публикация вакансии / кастинга на 30 дней'
                          : checkoutBillingCycle === 'yearly' 
                            ? 'Годовая подписка (скидка 20% включена)' 
                            : 'Ежемесячная подписка с автопродлением'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-2xl font-display font-bold text-brand-accent">
                        {getTargetPlanNumericPrice()}
                      </span>
                      <span className="text-xs font-mono font-bold text-brand-dark ml-1">AZN</span>
                      <div className="text-[10px] font-mono text-brand-dark/50">
                        {checkoutTarget === 'job_one_time' ? 'разово' : checkoutBillingCycle === 'yearly' ? 'в год' : 'в месяц'}
                      </div>
                    </div>
                  </div>

                  {checkoutTarget !== 'job_one_time' && (
                    <div className="mt-4 pt-3 border-t border-brand-dark/[0.06] flex items-center justify-between">
                      <span className="text-xs font-mono text-brand-dark/70">Период оплаты:</span>
                      <div className="inline-flex bg-brand-muted/50 p-0.5 rounded-full border border-brand-dark/10">
                        <button
                          type="button"
                          onClick={() => setCheckoutBillingCycle('monthly')}
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider cursor-pointer ${
                            checkoutBillingCycle === 'monthly' ? 'bg-brand-dark text-white' : 'text-brand-dark/70'
                          }`}
                        >
                          Помесячно
                        </button>
                        <button
                          type="button"
                          onClick={() => setCheckoutBillingCycle('yearly')}
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider cursor-pointer ${
                            checkoutBillingCycle === 'yearly' ? 'bg-brand-accent text-white' : 'text-brand-dark/70'
                          }`}
                        >
                          На год (-20%)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Method Selector */}
                <div className="mb-5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-brand-dark/70 font-bold mb-2">
                    Способ оплаты
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-3 rounded-2xl border text-center font-mono text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        paymentMethod === 'card' 
                          ? 'border-brand-accent bg-brand-accent/5 text-brand-dark font-bold ring-2 ring-brand-accent/20' 
                          : 'border-brand-dark/[0.1] bg-white text-brand-dark/70 hover:bg-brand-muted/20'
                      }`}
                    >
                      <CreditCard size={18} className={paymentMethod === 'card' ? 'text-brand-accent' : 'text-brand-dark/60'} />
                      <span className="text-[11px]">Банковская карта</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('birbank')}
                      className={`p-3 rounded-2xl border text-center font-mono text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        paymentMethod === 'birbank' 
                          ? 'border-brand-accent bg-brand-accent/5 text-brand-dark font-bold ring-2 ring-brand-accent/20' 
                          : 'border-brand-dark/[0.1] bg-white text-brand-dark/70 hover:bg-brand-muted/20'
                      }`}
                    >
                      <Smartphone size={18} className={paymentMethod === 'birbank' ? 'text-brand-accent' : 'text-brand-dark/60'} />
                      <span className="text-[11px]">Birbank / Leobank</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('apple_pay')}
                      className={`p-3 rounded-2xl border text-center font-mono text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        paymentMethod === 'apple_pay' 
                          ? 'border-brand-accent bg-brand-accent/5 text-brand-dark font-bold ring-2 ring-brand-accent/20' 
                          : 'border-brand-dark/[0.1] bg-white text-brand-dark/70 hover:bg-brand-muted/20'
                      }`}
                    >
                      <Zap size={18} className={paymentMethod === 'apple_pay' ? 'text-brand-accent' : 'text-brand-dark/60'} />
                      <span className="text-[11px]">Apple Pay / Google</span>
                    </button>
                  </div>
                </div>

                {/* Card Form Fields */}
                <div className="space-y-3.5 mb-5">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-brand-dark/70 font-bold mb-1">
                      Имя на карте (Cardholder Name) *
                    </label>
                    <input 
                      type="text" 
                      required
                      value={cardHolder}
                      onChange={e => setCardHolder(e.target.value)}
                      placeholder="Əli Əliyev Əli"
                      className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2.5 text-xs font-mono uppercase text-brand-dark outline-none focus:border-brand-accent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-brand-dark/70 font-bold mb-1">
                      Номер карты (Card Number) *
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="4169 7400 0000 0000"
                        maxLength={19}
                        className="w-full bg-white border border-brand-dark/[0.12] rounded-xl pl-3.5 pr-20 py-2.5 text-xs font-mono text-brand-dark outline-none focus:border-brand-accent transition-all"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[9px] font-mono font-bold text-brand-dark/40 uppercase">
                        <span>VISA</span>
                        <span>•</span>
                        <span>MC</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-brand-dark/70 font-bold mb-1">
                        Срок действия (MM/YY) *
                      </label>
                      <input 
                        type="text" 
                        required
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        placeholder="12/28"
                        maxLength={5}
                        className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2.5 text-xs font-mono text-brand-dark outline-none focus:border-brand-accent transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-brand-dark/70 font-bold mb-1">
                        CVC / CVV код *
                      </label>
                      <input 
                        type="password" 
                        required
                        value={cardCvc}
                        onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="•••"
                        maxLength={4}
                        className="w-full bg-white border border-brand-dark/[0.12] rounded-xl px-3.5 py-2.5 text-xs font-mono text-brand-dark outline-none focus:border-brand-accent transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Secure Badge Info */}
                <div className="p-3 bg-brand-muted/40 rounded-xl border border-brand-dark/[0.06] flex items-center gap-2.5 text-[11px] text-brand-dark/70 mb-6">
                  <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                  <span>Платежи защищены 3D Secure и процессингом банков Азербайджана (ABB / Kapital / Visa / Mastercard).</span>
                </div>

                {/* Submit Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCheckoutModal(false)}
                    className="px-5 py-2.5 rounded-full border border-brand-dark/20 text-xs font-semibold uppercase tracking-wider text-brand-dark hover:bg-brand-muted transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-7 py-3 rounded-full bg-brand-accent hover:bg-brand-dark text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                  >
                    <Lock size={13} />
                    <span>Оплатить {getTargetPlanNumericPrice()} AZN</span>
                  </button>
                </div>
              </form>
            )}

            {paymentStep === 'processing' && (
              <div className="py-12 px-4 text-center flex flex-col items-center justify-center animate-in fade-in">
                <div className="w-16 h-16 rounded-full border-4 border-brand-accent/20 border-t-brand-accent animate-spin mb-6"></div>
                <h4 className="text-xl font-serif font-bold text-brand-dark mb-2">
                  Обработка платежа...
                </h4>
                <p className="text-xs font-mono text-brand-dark/60 max-w-sm">
                  Выполняется авторизация карты и 3D Secure верификация. Пожалуйста, не закрывайте окно.
                </p>
                <div className="mt-6 flex items-center gap-2 text-[11px] text-brand-dark/50 font-mono">
                  <Lock size={12} />
                  <span>Защищенное соединение с процессингом</span>
                </div>
              </div>
            )}

            {paymentStep === 'success' && (
              <div className="py-8 px-4 text-center flex flex-col items-center justify-center animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 mb-5">
                  <CheckCircle size={32} />
                </div>
                
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-2">
                  Оплата подтверждена • {transactionId}
                </span>

                <h4 className="text-2xl font-serif font-bold text-brand-dark mb-2">
                  {checkoutTarget === 'job_one_time' ? 'Размещение оплачено!' : 'Подписка успешно активирована!'}
                </h4>
                
                <p className="text-xs text-brand-dark/75 max-w-sm mb-6 leading-relaxed">
                  {checkoutTarget === 'job_one_time' 
                    ? 'Ваша вакансия успешно оплачена. Вы можете настроить описание и отклики в разделе «Карьера».' 
                    : `Поздравляем! Ваш профиль переведен на уровень ${checkoutTarget === 'elite' ? 'FFAZ Elite VIP' : 'FFAZ Pro'}. Все привилегии и функции активированы.`}
                </p>

                {/* Receipt Box */}
                <div className="w-full bg-white rounded-2xl border border-brand-dark/[0.08] p-4 text-left text-xs font-mono text-brand-dark/80 mb-6 space-y-2">
                  <div className="flex justify-between border-b border-brand-dark/[0.06] pb-2">
                    <span className="text-brand-dark/50">Номер транзакции:</span>
                    <span className="font-bold">{transactionId}</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-dark/[0.06] pb-2">
                    <span className="text-brand-dark/50">Сумма к оплате:</span>
                    <span className="font-bold text-brand-accent">{getTargetPlanNumericPrice()} AZN</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-dark/50">Статус:</span>
                    <span className="text-emerald-600 font-bold">Оплачено (Зачислено)</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowCheckoutModal(false);
                    if (checkoutTarget === 'job_one_time') {
                      navigate('/careers?post=true');
                    }
                  }}
                  className="w-full py-3 rounded-full bg-brand-dark hover:bg-brand-accent text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  {checkoutTarget === 'job_one_time' ? 'Перейти к созданию вакансии' : 'Готово (Перейти в профиль)'}
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 7. DOWNGRADE TO FREE CONFIRMATION MODAL */}
      {showDowngradeModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-brand-card rounded-3xl border border-brand-dark/[0.12] p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 mx-auto mb-4">
              <AlertCircle size={24} />
            </div>

            <h3 className="text-xl font-serif font-bold text-brand-dark text-center mb-2">
              Переход на базовый тариф Free
            </h3>

            <p className="text-xs text-brand-dark/75 text-center leading-relaxed mb-6 font-normal">
              При возврате на бесплатный тариф будут ограничены: безлимитные диалоги (лимит вернется к 5 запросам/день), приоритетный буст в ленте и бесплатные размещения вакансий.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => setShowDowngradeModal(false)}
                className="flex-1 py-2.5 rounded-full border border-brand-dark/20 text-xs font-semibold uppercase tracking-wider text-brand-dark hover:bg-brand-muted transition-colors cursor-pointer"
              >
                Оставить подписку
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmDowngrade}
                className="flex-1 py-2.5 rounded-full bg-brand-dark hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                {loading ? 'Перевод...' : 'Подтвердить переход'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. SILVER NEEDLE APPLICATION MODAL */}
      {showNeedleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form 
            onSubmit={handleApplySilverNeedle} 
            className="bg-brand-card rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-brand-dark/[0.08]">
              <div className="flex items-center gap-2.5">
                <SilverNeedleBadge size="md" />
                <div>
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent block">
                    Certification Audit
                  </span>
                  <h3 className="text-xl sm:text-2xl font-serif font-bold text-brand-dark">
                    Заявка на Серебряную Иглу
                  </h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowNeedleModal(false)} 
                className="w-8 h-8 rounded-full border border-brand-dark/15 flex items-center justify-center hover:bg-brand-muted transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-brand-dark/75 mb-6 leading-relaxed font-normal">
              Знак <strong className="font-semibold text-brand-dark">«Gümüş İynə»</strong> подтверждает профессиональный статус дизайнера или специалиста. Экспертный совет проверит подлинность работ и материалов в течение 48 часов.
            </p>

            <div className="space-y-4 text-xs font-mono text-brand-dark mb-6">
              <div>
                <label className="block uppercase tracking-wider mb-1.5 text-brand-dark/70 font-bold">
                  Название бренда / Имя дизайнера *
                </label>
                <input 
                  type="text" 
                  required
                  value={needleBrandName}
                  onChange={e => setNeedleBrandName(e.target.value)}
                  placeholder="Например: AYAN COUTURE / Əli Əliyev Əli"
                  className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-3 focus:outline-none focus:bg-brand-card focus:border-brand-accent transition-all font-sans text-sm text-brand-dark"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider mb-1.5 text-brand-dark/70 font-bold">
                  Ссылка на портфолио / Instagram бренда *
                </label>
                <input 
                  type="url" 
                  required
                  value={needlePortfolioLink}
                  onChange={e => setNeedlePortfolioLink(e.target.value)}
                  placeholder="https://instagram.com/your_brand"
                  className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-3 focus:outline-none focus:bg-white focus:border-brand-accent transition-all font-sans text-sm text-brand-dark"
                />
              </div>

              <div className="p-4 bg-brand-muted/40 rounded-2xl border border-brand-dark/[0.08] text-xs text-brand-dark/80 leading-relaxed font-sans">
                Разовый сбор экспертной комиссии: <strong className="text-brand-accent font-bold">40 AZN</strong>. После подтверждения знак отличия отобразится в вашем профиле и каталоге.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-brand-dark/[0.08]">
              <button
                type="button"
                onClick={() => setShowNeedleModal(false)}
                className="px-6 py-2.5 rounded-full border border-brand-dark/20 text-xs font-semibold uppercase tracking-wider text-brand-dark hover:bg-brand-muted transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-7 py-2.5 rounded-full bg-brand-dark hover:bg-brand-accent text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                {loading ? 'Отправка...' : 'Оплатить и подать (40 AZN)'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
