import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { apiFetch } from '../lib/apiClient';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Event, TicketTier, GiveawayEntry } from '../types';
import { 
  Calendar, 
  MapPin, 
  Share2, 
  Sparkles, 
  Check, 
  ChevronLeft, 
  Clock, 
  Ticket, 
  Bookmark, 
  ArrowRight,
  ShieldCheck,
  Flame,
  ExternalLink,
  QrCode,
  X,
  User,
  Mail,
  Phone,
  CheckCircle2,
  Award,
  Layers,
  Info,
  Gift,
  Crown,
  Trophy
} from 'lucide-react';
import { toast } from 'sonner';

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { currentUser, dbUser } = useAuth();
  const navigate = useNavigate();

  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // VIP Level 3 Subscriber Check
  const isTier3Subscriber =
    dbUser?.subscriptionTier === 'vip' ||
    dbUser?.subscriptionTier === 'elite' ||
    dbUser?.role === 'admin' ||
    dbUser?.role === 'superadmin';

  // Tier 3 Ticket Giveaway Entry State
  const [giveawayEntry, setGiveawayEntry] = useState<GiveawayEntry | null>(null);
  const [isEnteringGiveaway, setIsEnteringGiveaway] = useState(false);

  // Booking Modal States
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid || !id) return;
    try {
      const q = query(
        collection(db, 'giveaway_entries'),
        where('eventId', '==', id),
        where('userId', '==', currentUser.uid)
      );
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const docData = snap.docs[0];
          setGiveawayEntry({ id: docData.id, ...docData.data() } as GiveawayEntry);
        } else {
          setGiveawayEntry(null);
        }
      });
      return () => unsub();
    } catch (err) {
      console.warn('Giveaway entry fetch error:', err);
    }
  }, [id, currentUser?.uid]);

  useEffect(() => {
    if (!id) return;
    const fetchEvent = async () => {
      try {
        const d = await getDoc(doc(db, 'events', id));
        if (d.exists()) {
          const evData = { id: d.id, ...d.data() } as Event;
          setEvent(evData);
          if (evData.ticketTiers && evData.ticketTiers.length > 0) {
            setSelectedTier(evData.ticketTiers[0]);
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `events/${id}`);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();

    try {
      const saved = JSON.parse(localStorage.getItem('az_saved_events') || '[]');
      setIsSaved(saved.includes(id));
    } catch {
      setIsSaved(false);
    }
  }, [id]);

  useEffect(() => {
    if (currentUser || dbUser) {
      setGuestName(dbUser?.name || currentUser?.displayName || '');
      setGuestEmail(dbUser?.email || currentUser?.email || '');
      setGuestPhone((dbUser as any)?.phone || '');
    }
  }, [currentUser, dbUser]);

  const handleShare = () => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        toast.success(t('link_copied', 'Event link copied to clipboard!'));
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSave = () => {
    if (!id) return;
    try {
      const saved = JSON.parse(localStorage.getItem('az_saved_events') || '[]');
      let next: string[];
      if (saved.includes(id)) {
        next = saved.filter((item: string) => item !== id);
        setIsSaved(false);
      } else {
        next = [...saved, id];
        setIsSaved(true);
        toast.success(t('event_saved_feed', 'Event saved to your personal schedule!'));
      }
      localStorage.setItem('az_saved_events', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleEnterGiveaway = async () => {
    if (!currentUser) {
      toast.info('Пожалуйста, войдите в аккаунт для участия в розыгрыше.');
      navigate('/login');
      return;
    }

    if (!isTier3Subscriber) {
      toast.error('Розыгрыш билетов доступен эксклюзивно для подписчиков 3-го уровня (Elite VIP).');
      return;
    }

    if (giveawayEntry) {
      toast.success('Вы уже участвуете в розыгрыше билета на этот показ!');
      return;
    }

    if (!event) return;

    try {
      setIsEnteringGiveaway(true);
      const newEntry = {
        eventId: id || event.id,
        eventTitle: event.title || 'Fashion Runway Show',
        eventDate: event.date || Date.now(),
        eventLocation: event.location || 'Baku, Azerbaijan',
        eventImageUrl: event.imageUrl || '',
        userId: currentUser.uid,
        userName: dbUser?.name || currentUser.displayName || 'VIP Guest',
        userEmail: currentUser.email || '',
        userHandle: dbUser?.handle || dbUser?.username || '',
        userAvatar: dbUser?.avatarUrl || '',
        subscriptionTier: dbUser?.subscriptionTier || 'vip',
        enteredAt: Date.now(),
        isWinner: false,
        status: 'entered'
      };

      await addDoc(collection(db, 'giveaway_entries'), newEntry);
      toast.success('🎉 Вы успешно зарегистрированы в розыгрыше! Ваша попытка добавлена в личный кабинет.');
    } catch (err) {
      console.error('Error entering giveaway:', err);
      toast.error('Ошибка при регистрации в розыгрыше. Попробуйте снова.');
    } finally {
      setIsEnteringGiveaway(false);
    }
  };

  const handleOpenBooking = (tier?: TicketTier) => {
    const directUrl = event?.externalTicketUrl || (event as any)?.ticketUrl || (event as any)?.bookingUrl;
    if (directUrl && typeof directUrl === 'string' && directUrl.trim() !== '') {
      const formattedUrl = directUrl.trim().startsWith('http://') || directUrl.trim().startsWith('https://')
        ? directUrl.trim()
        : `https://${directUrl.trim()}`;
      window.open(formattedUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (tier) {
      setSelectedTier(tier);
    } else if (event?.ticketTiers && event.ticketTiers.length > 0) {
      setSelectedTier(event.ticketTiers[0]);
    } else {
      setSelectedTier({
        name: 'General Admission',
        price: event?.price || 0
      });
    }
    setBookingSuccess(null);
    setBookingModalOpen(true);
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !guestEmail.trim()) {
      toast.error('Пожалуйста, заполните имя и email');
      return;
    }

    setIsSubmittingBooking(true);
    try {
      let passId = `BFW-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      let serverQr = '';

      if (currentUser && id) {
        const res = await apiFetch('/api/tickets/purchase', {
          method: 'POST',
          body: JSON.stringify({
            eventId: id,
            tierName: selectedTier?.name || 'General Admission',
            quantity: ticketQuantity,
            guestName,
            guestEmail,
            guestPhone
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.qrCodeData) serverQr = data.qrCodeData;
          if (data.ticketId) passId = data.ticketId;
        }
      }

      const confirmed = {
        passId,
        qrCodeData: serverQr,
        tierName: selectedTier?.name || 'General Admission',
        pricePerTicket: selectedTier?.price ?? (event?.price || 0),
        quantity: ticketQuantity,
        totalAmount: (selectedTier?.price ?? (event?.price || 0)) * ticketQuantity,
        guestName,
        guestEmail,
        guestPhone,
        eventTitle: event?.title || 'Fashion Event',
        eventDate: event?.date || Date.now(),
        eventLocation: event?.location || 'Baku, Azerbaijan'
      };
      setBookingSuccess(confirmed);
      setIsSubmittingBooking(false);
      toast.success('Электронный пропуск успешно забронирован!');
    } catch (err: any) {
      console.error('Booking error:', err);
      setIsSubmittingBooking(false);
      toast.error('Ошибка бронирования билета');
    }
  };

  const getGoogleCalendarUrl = (): string => {
    if (!event || !event.date) return '';
    const start = new Date(event.date);
    const end = (event as any).endDate ? new Date((event as any).endDate) : new Date(start.getTime() + 2.5 * 60 * 60 * 1000);
    const formatTime = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const title = encodeURIComponent(event.title || 'Fashion Event');
    const details = encodeURIComponent(event.description || 'Azerbaijan Fashion Week Runway Presentation');
    const location = encodeURIComponent(event.location || 'Heydar Aliyev Center, Baku');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatTime(start)}/${formatTime(end)}&details=${details}&location=${location}`;
  };

  const getGoogleMapsUrl = (): string => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event?.location || 'Heydar Aliyev Center, Baku, Azerbaijan')}`;
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8">
        <div className="w-10 h-10 border-2 border-brand-accent border-r-transparent rounded-full animate-spin mb-4" />
        <span className="font-mono text-xs uppercase tracking-widest text-brand-dark/60">
          [LOADING RUNWAY DOSSIER...]
        </span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <h2 className="text-2xl font-serif text-brand-dark">Event Not Found</h2>
        <p className="text-xs text-brand-dark/60">The requested fashion show or runway dossier does not exist.</p>
        <button
          onClick={() => navigate('/events')}
          className="px-5 py-2.5 rounded-full bg-brand-dark text-white text-xs font-semibold uppercase tracking-wider"
        >
          All Shows
        </button>
      </div>
    );
  }

  const lowestPrice =
    event.ticketTiers && event.ticketTiers.length > 0
      ? Math.min(...event.ticketTiers.map((tier) => tier.price))
      : event.price;

  const eventDate = event.date ? new Date(event.date) : null;
  const endDate = (event as any).endDate ? new Date((event as any).endDate) : null;

  return (
    <div className="animate-in fade-in duration-700 min-h-screen bg-brand-light text-brand-dark pt-2 sm:pt-4 pb-32 sm:pb-20 w-full max-w-full overflow-x-hidden">
      
      {/* Top Mobile Floating App Navigation Bar (Raised by 50% upwards) */}
      <div className="sm:hidden sticky top-[34px] z-30 bg-brand-light/95 backdrop-blur-xl border-b border-brand-dark/[0.08] px-4 py-1.5 flex items-center justify-between shadow-2xs transition-all">
        <button 
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/events');
            }
          }}
          className="w-8.5 h-8.5 rounded-full border border-brand-dark/15 bg-white flex items-center justify-center text-brand-dark active:scale-95 shadow-2xs cursor-pointer"
          aria-label="Back"
        >
          <ChevronLeft size={18} />
        </button>

        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/20">
          OFFICIAL RUNWAY
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleSave}
            className={`w-8.5 h-8.5 rounded-full border flex items-center justify-center transition-all shadow-2xs cursor-pointer ${
              isSaved ? 'bg-brand-accent text-white border-brand-accent' : 'bg-white border-brand-dark/15 text-brand-dark'
            }`}
            aria-label="Save"
          >
            <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={handleShare}
            className="w-8.5 h-8.5 rounded-full border border-brand-dark/15 bg-white text-brand-dark flex items-center justify-center shadow-2xs cursor-pointer"
            aria-label="Share"
          >
            {copied ? <Check size={14} /> : <Share2 size={14} />}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-10">
        
        {/* Desktop Back Breadcrumb */}
        <div className="hidden sm:flex items-center justify-between gap-4 mb-6">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/events');
              }
            }}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-dark/60 hover:text-brand-accent transition-colors group cursor-pointer"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span>{t('back_to_events', 'Back to Runway Schedule')}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSave}
              className={`px-4 py-2 rounded-full border text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                isSaved ? 'bg-brand-accent text-white border-brand-accent' : 'bg-white border-brand-dark/15 text-brand-dark hover:border-brand-accent'
              }`}
            >
              <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
              <span>{isSaved ? 'Saved' : 'Save Show'}</span>
            </button>
            <button
              onClick={handleShare}
              className="px-4 py-2 rounded-full border border-brand-dark/15 bg-white hover:border-brand-accent text-xs font-semibold uppercase tracking-wider text-brand-dark flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              {copied ? <Check size={14} /> : <Share2 size={14} />}
              <span>{copied ? t('copied', 'Copied') : t('share_event', 'Share')}</span>
            </button>
          </div>
        </div>

        {/* Unified Master Runway Dossier Card (Single Cohesive Whole) */}
        <div className="rounded-3xl border border-brand-dark/[0.08] bg-white shadow-xs overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-brand-dark/[0.08] items-stretch">
            
            {/* LEFT: Poster Image Banner & Quick Actions (Seamlessly Integrated) */}
            <div className="lg:col-span-5 p-4 pt-6 sm:p-6 lg:p-7 bg-brand-muted/10 flex flex-col justify-between gap-6">
              <div className="space-y-4 sm:space-y-4 pt-2 sm:pt-0">
                <div className="relative rounded-2xl overflow-hidden border border-brand-dark/[0.08] bg-white shadow-2xs p-1.5 mt-2 sm:mt-0">
                  <div className="aspect-[4/3] sm:aspect-[3/4] w-full rounded-xl overflow-hidden bg-stone-900 relative flex items-center justify-center">
                    {event.imageUrl ? (
                      <>
                        {/* Ambient luxury backdrop blur so the full image floats gracefully without harsh borders */}
                        <img
                          src={event.imageUrl}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 w-full h-full object-cover filter blur-2xl opacity-40 scale-110 pointer-events-none select-none"
                          crossOrigin="anonymous"
                        />
                        {/* Full uncropped image fitting completely */}
                        <img
                          src={event.imageUrl}
                          alt={event.title}
                          className="w-full h-full object-contain relative z-10 select-none"
                          crossOrigin="anonymous"
                        />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl sm:text-5xl font-display font-bold text-brand-dark/20">
                        AZ FASHION
                      </div>
                    )}

                    {/* Overlay Badge */}
                    <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-brand-dark/85 backdrop-blur-md text-white font-display text-xs font-bold shadow-md border border-white/10">
                      {lowestPrice ? `Admission: ${lowestPrice} AZN` : 'Open Schedule'}
                    </div>

                    {event.availableTickets !== undefined && event.availableTickets <= 10 && event.availableTickets > 0 && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-amber-500/90 text-white font-mono text-[10px] font-bold shadow-md flex items-center gap-1 backdrop-blur-md">
                        <Flame size={11} /> LIMITED PASSES
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Link Buttons under Poster */}
                <div className="grid grid-cols-2 gap-2.5 mt-3 sm:mt-0">
                  <a
                    href={getGoogleCalendarUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl border border-brand-dark/[0.08] bg-white hover:border-brand-accent text-brand-dark text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-2xs"
                  >
                    <Calendar size={14} className="text-brand-accent shrink-0" />
                    <span className="truncate">В календарь</span>
                    <ExternalLink size={12} className="opacity-60" />
                  </a>

                  <a
                    href={getGoogleMapsUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl border border-brand-dark/[0.08] bg-white hover:border-brand-accent text-brand-dark text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-2xs"
                  >
                    <MapPin size={14} className="text-brand-accent shrink-0" />
                    <span className="truncate">На карте</span>
                    <ExternalLink size={12} className="opacity-60" />
                  </a>
                </div>
              </div>

              {/* Fast Booking Callout in Left Wing */}
              <div className="pt-4 border-t border-brand-dark/[0.08] space-y-3">
                {/* 1. VIP Level 3 Exclusive Ticket Giveaway (Visible only to Tier 3 subscribers) */}
                {isTier3Subscriber && (
                  <div className="p-4 rounded-2xl bg-linear-to-br from-amber-500/10 via-brand-accent/5 to-white border border-amber-500/30 shadow-2xs space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                          <Crown size={12} />
                        </span>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 font-bold">
                          РОЗЫГРЫШ • LEVEL 3 VIP
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 border border-amber-500/30">
                        ELITE PASS
                      </span>
                    </div>

                    {giveawayEntry ? (
                      <div className="space-y-2">
                        {giveawayEntry.isWinner ? (
                          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs">
                              <Trophy size={14} className="text-emerald-600" />
                              <span>🎉 ВЫ ВЫИГРАЛИ БИЛЕТ!</span>
                            </div>
                            <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                              Поздравляем! Ваш персональный VIP-пропуск подтвержден и сохранен в вашем кабинете в разделе билетов.
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-950 space-y-1">
                            <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-900">
                              <CheckCircle2 size={14} className="text-amber-600" />
                              <span>Вы участвуете в розыгрыше</span>
                            </div>
                            <p className="text-[11px] text-amber-900/75 leading-relaxed">
                              Ваша заявка принята. Итоги розыгрыша и статус победы появятся в личном кабинете.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <p className="text-xs text-brand-dark/75 leading-relaxed">
                          Эксклюзив для подписчиков 3-го уровня (Elite VIP): бесплатный розыгрыш VIP-пропуска на этот показ.
                        </p>

                        <button
                          onClick={handleEnterGiveaway}
                          disabled={isEnteringGiveaway}
                          className="w-full py-3 px-4 rounded-full bg-linear-to-r from-amber-600 to-brand-accent hover:from-amber-700 hover:to-brand-dark text-white font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          <Gift size={15} />
                          <span>{isEnteringGiveaway ? 'Регистрация...' : 'Выиграть билет'}</span>
                          <Sparkles size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Standard Pass / Booking Direct Box */}
                <div className="hidden lg:block p-4 rounded-2xl bg-white border border-brand-dark/[0.08] shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-brand-dark/50 font-bold">
                      ADMISSION PASS
                    </span>
                    <span className="font-display font-bold text-sm text-brand-accent">
                      {lowestPrice ? `${lowestPrice} AZN` : 'Free / Open'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenBooking()}
                    className="w-full py-3 rounded-full bg-brand-accent hover:bg-brand-dark text-white font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                  >
                    <Ticket size={15} />
                    <span>Забронировать билет</span>
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: Editorial Event Dossier (Merged into Unified Whole) */}
            <div className="lg:col-span-7 flex flex-col gap-6 p-5 sm:p-8 md:p-10">
            
            {/* Header Folio */}
            <div className="space-y-2.5 border-b border-brand-dark/[0.08] pb-6">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-brand-dark/60 font-mono">
                  BAKU FASHION WEEK
                </span>
                <span className="text-brand-dark/20">•</span>
                <span className="text-[10px] sm:text-[11px] font-mono text-brand-accent font-semibold uppercase tracking-wider">
                  RUNWAY SHOW
                </span>
                {event.availableTickets !== undefined && event.availableTickets <= 10 && event.availableTickets > 0 && (
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 border border-amber-500/20 flex items-center gap-1">
                    <Flame size={10} /> LIMITED PASSES
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-normal text-brand-dark leading-tight break-words">
                {event.title}
              </h1>

              <p className="text-xs sm:text-sm text-brand-dark/60 font-normal leading-relaxed break-words">
                Официальный показ недели моды в Баку с участием ведущих кутюрье, дизайнеров и международных байеров.
              </p>
            </div>

            {/* Key Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Date & Time */}
              <div className="p-4 rounded-2xl border border-brand-dark/[0.08] bg-brand-muted/30 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center shrink-0">
                  <Calendar size={18} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-brand-dark/50 block font-semibold">
                    ДАТА И ВРЕМЯ / DATE & TIME
                  </span>
                  <span className="font-display font-semibold text-xs sm:text-sm text-brand-dark block mt-0.5">
                    {eventDate ? eventDate.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '--'}
                    {endDate && ` - ${endDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
                  </span>
                  <span className="text-[11px] text-brand-dark/60 font-mono">
                    {eventDate ? eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '19:30'} AZT (Баку)
                  </span>
                </div>
              </div>

              {/* Location */}
              <div className="p-4 rounded-2xl border border-brand-dark/[0.08] bg-brand-muted/30 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center shrink-0">
                  <MapPin size={18} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-brand-dark/50 block font-semibold">
                    ЛОКАЦИЯ / VENUE
                  </span>
                  <span className="font-display font-semibold text-xs sm:text-sm text-brand-dark block mt-0.5 truncate max-w-full sm:max-w-[280px]" title={event.location}>
                    {event.location || 'Heydar Aliyev Center • Baku'}
                  </span>
                  <a
                    href={getGoogleMapsUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-brand-accent font-medium hover:underline inline-flex items-center gap-1 mt-0.5"
                  >
                    <span>Открыть на карте</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              {/* Admission Price */}
              <div className="p-4 rounded-2xl border border-brand-dark/[0.08] bg-brand-muted/30 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center shrink-0">
                  <Ticket size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-brand-dark/50 block font-semibold">
                    СТОИМОСТЬ / ADMISSION
                  </span>
                  <span className="font-display font-semibold text-xs sm:text-sm text-brand-dark block mt-0.5">
                    {lowestPrice ? `от ${lowestPrice} AZN` : 'Свободный вход / Open'}
                  </span>
                  <span className="text-[11px] text-brand-dark/60">
                    {event.ticketTiers?.length ? `${event.ticketTiers.length} категории билетов` : 'Guest Pass'}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="p-4 rounded-2xl border border-brand-dark/[0.08] bg-brand-muted/30 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-brand-dark/50 block font-semibold">
                    СТАТУС ПОКАЗА / STATUS
                  </span>
                  <span className="font-display font-semibold text-xs sm:text-sm text-brand-dark block mt-0.5">
                    Confirmed Runway
                  </span>
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Бронирование активно
                  </span>
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="space-y-2 border-t border-brand-dark/[0.08] pt-6">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/60 flex items-center gap-1.5">
                <Info size={13} className="text-brand-accent" />
                <span>ОПИСАНИЕ И ПРОГРАММА / RUNWAY DETAILS</span>
              </h3>
              <p className="text-sm sm:text-base text-brand-dark/80 font-normal leading-relaxed whitespace-pre-wrap break-words">
                {event.description || 'Эксклюзивный показ официального расписания Azerbaijan Fashion Week. Презентация премьерных кутюрных лукбуков, авангардных коллекций сезона и коммерческих коллабораций ведущих домов моды.'}
              </p>
            </div>

            {/* TICKET TIERS SECTION (Pure Informational Overview) */}
            <div className="space-y-3.5 border-t border-brand-dark/[0.08] pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 flex items-center gap-1.5">
                  <Ticket size={13} className="text-brand-accent" />
                  <span>КАТЕГОРИИ БИЛЕТОВ И ПРОПУСКОВ / TICKET TIERS</span>
                </h3>
                <span className="text-[11px] font-mono text-brand-dark/50">
                  {event.ticketTiers && event.ticketTiers.length > 0 ? `${event.ticketTiers.length} категории` : '1 категория'}
                </span>
              </div>

              {event.ticketTiers && event.ticketTiers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {event.ticketTiers.map((tier, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-brand-dark/[0.08] bg-brand-muted/20 flex flex-col justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-display font-bold text-sm text-brand-dark uppercase tracking-wide">
                          {tier.name}
                        </span>
                        <span className="font-display font-bold text-sm sm:text-base text-brand-accent shrink-0 font-mono">
                          {tier.price > 0 ? `${tier.price} AZN` : 'Free'}
                        </span>
                      </div>
                      <p className="text-xs text-brand-dark/65 leading-relaxed">
                        {tier.name.toLowerCase().includes('vip') 
                          ? 'Первый ряд подиума (Front Row), проход на бэкстейдж и доступ в закрытый VIP Lounge.'
                          : tier.name.toLowerCase().includes('front')
                          ? 'Первый ряд подиума, официальная брошюра и эксклюзивный гифт-бэг недели моды.'
                          : 'Доступ в зрительный зал на показ с закрепленным посадочным местом.'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-brand-dark/[0.08] bg-brand-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm text-brand-dark uppercase">
                        General Admission Runway Pass
                      </span>
                      <span className="font-display font-bold text-sm text-brand-accent font-mono">
                        {event.price ? `${event.price} AZN` : 'Бесплатно / Free'}
                      </span>
                    </div>
                    <p className="text-xs text-brand-dark/65 mt-1">
                      Стандартный электронный пропуск на показ по предварительной аккредитации с посадочным местом.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* RUNWAY TIMELINE SCHEDULE */}
            <div className="space-y-3.5 border-t border-brand-dark/[0.08] pt-6">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 flex items-center gap-1.5">
                <Clock size={13} className="text-brand-accent" />
                <span>ТАЙМЛАЙН И РАСПИСАНИЕ ВЕЧЕРА / RUNWAY TIMELINE</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-brand-muted/25 border border-brand-dark/[0.06] flex items-start gap-3">
                  <span className="font-mono font-bold text-brand-accent text-[11px] shrink-0 mt-0.5">18:30</span>
                  <div>
                    <span className="font-semibold text-brand-dark block">Red Carpet & Photo Call</span>
                    <span className="text-brand-dark/60 text-[11px]">Welcome cocktails, media photo zone and designer arrivals.</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-brand-muted/25 border border-brand-dark/[0.06] flex items-start gap-3">
                  <span className="font-mono font-bold text-brand-accent text-[11px] shrink-0 mt-0.5">19:30</span>
                  <div>
                    <span className="font-semibold text-brand-dark block">Runway Presentation</span>
                    <span className="text-brand-dark/60 text-[11px]">Opening ceremony and main couture runway showcase.</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-brand-muted/25 border border-brand-dark/[0.06] flex items-start gap-3">
                  <span className="font-mono font-bold text-brand-accent text-[11px] shrink-0 mt-0.5">20:30</span>
                  <div>
                    <span className="font-semibold text-brand-dark block">Atelier Showroom & Buyer Meet</span>
                    <span className="text-brand-dark/60 text-[11px]">Showroom review, collection orders & buyer insights.</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-brand-muted/25 border border-brand-dark/[0.06] flex items-start gap-3">
                  <span className="font-mono font-bold text-brand-accent text-[11px] shrink-0 mt-0.5">21:15</span>
                  <div>
                    <span className="font-semibold text-brand-dark block">Grand Finale & After-Party</span>
                    <span className="text-brand-dark/60 text-[11px]">VIP lounge reception with resident DJs and partner awards.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* DRESS CODE & VENUE POLICY */}
            <div className="space-y-3.5 border-t border-brand-dark/[0.08] pt-6">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-brand-accent" />
                <span>ДРЕСС-КОД И ПРАВИЛА ВХОДА / ADMISSION POLICY</span>
              </h3>

              <div className="p-4 rounded-2xl bg-brand-muted/20 border border-brand-dark/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase font-bold text-brand-accent px-2 py-0.5 rounded-full bg-brand-accent/10 border border-brand-accent/20">
                      DRESS CODE: BLACK TIE / HAUTE COUTURE
                    </span>
                  </div>
                  <p className="text-brand-dark/70 text-[11px] leading-relaxed">
                    Вход в зрительный зал закрывается ровно за 15 минут до начала показа. Электронный билет с QR-кодом проверяется на стойке аккредитации.
                  </p>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS (VISIBLE ON BOTH MOBILE AND DESKTOP) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-6 border-t border-brand-dark/[0.08]">
              <button
                onClick={() => handleOpenBooking()}
                className="w-full sm:w-auto px-7 py-4 rounded-full bg-brand-accent text-white hover:bg-brand-dark transition-all font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer"
              >
                <Ticket size={16} />
                <span>
                  {event?.externalTicketUrl ? 'Купить билет / Buy Tickets' : 'Получить билет / Get Pass'}
                </span>
                {event?.externalTicketUrl ? <ExternalLink size={14} /> : <ArrowRight size={14} />}
              </button>

              <Link
                to="/events"
                className="w-full sm:w-auto px-6 py-4 rounded-full border border-brand-dark/15 bg-white hover:border-brand-accent text-brand-dark font-semibold text-xs uppercase tracking-wider transition-colors shadow-2xs text-center cursor-pointer"
              >
                {t('view_calendar', 'Все показы расписания')}
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>

      {/* FIXED MOBILE DOCK ABOVE BOTTOM NAVIGATION BAR (Never collides with Layout bottom nav!) */}
      <div className="sm:hidden fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] inset-x-3 z-30 bg-brand-dark/95 text-white backdrop-blur-xl border border-white/15 p-3 rounded-2xl shadow-xl flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[9px] font-mono text-white/60 uppercase tracking-widest block font-semibold truncate">
            ADMISSION
          </span>
          <span className="font-display font-bold text-sm text-white">
            {lowestPrice ? `${lowestPrice} AZN` : 'Free / Open'}
          </span>
        </div>

        <button
          onClick={() => handleOpenBooking()}
          className="px-5 py-2.5 rounded-full bg-brand-accent text-white active:scale-95 font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
        >
          <Ticket size={14} />
          <span>Забронировать</span>
        </button>
      </div>

      {/* INTERACTIVE TICKET BOOKING & PASS GENERATION MODAL */}
      {bookingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-brand-card rounded-3xl border border-brand-dark/15 shadow-2xl p-6 sm:p-8 text-brand-dark">
            
            {/* Modal Close */}
            <button
              onClick={() => setBookingModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full border border-brand-dark/15 bg-white flex items-center justify-center text-brand-dark hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            {!bookingSuccess ? (
              <form onSubmit={handleConfirmBooking} className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent">
                      RUNWAY PASS RESERVATION
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-serif text-brand-dark">
                    Бронирование билета на показ
                  </h3>
                  <p className="text-xs text-brand-dark/60 mt-0.5">
                    {event.title} • {eventDate ? eventDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : ''}
                  </p>
                </div>

                {/* Tier Selection */}
                {event.ticketTiers && event.ticketTiers.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-brand-dark/70 font-semibold block">
                      Выберите категорию пропуска:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {event.ticketTiers.map((tier, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => setSelectedTier(tier)}
                          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                            selectedTier?.name === tier.name
                              ? 'border-brand-accent bg-brand-accent/5 ring-1 ring-brand-accent'
                              : 'border-brand-dark/15 bg-white hover:border-brand-accent/40'
                          }`}
                        >
                          <span className="font-semibold text-xs uppercase">{tier.name}</span>
                          <span className="font-display font-bold text-sm text-brand-accent mt-1">
                            {tier.price > 0 ? `${tier.price} AZN` : 'Free'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-brand-dark/15 bg-white">
                  <div>
                    <span className="text-xs font-semibold text-brand-dark block">Количество билетов</span>
                    <span className="text-[10px] text-brand-dark/50">Максимум 4 пропуска в одном бронировании</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={ticketQuantity <= 1}
                      onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
                      className="w-8 h-8 rounded-full border border-brand-dark/20 flex items-center justify-center font-bold text-sm disabled:opacity-30 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-display font-bold text-sm w-4 text-center">{ticketQuantity}</span>
                    <button
                      type="button"
                      disabled={ticketQuantity >= 4}
                      onClick={() => setTicketQuantity(Math.min(4, ticketQuantity + 1))}
                      className="w-8 h-8 rounded-full border border-brand-dark/20 flex items-center justify-center font-bold text-sm disabled:opacity-30 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Attendee Form */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-brand-dark/70 font-semibold block mb-1">
                      ФИО Гостя / Full Name
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-3.5 text-brand-dark/40" />
                      <input
                        type="text"
                        required
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Əli Əliyev Əli"
                        className="w-full bg-white border border-brand-dark/15 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-brand-dark outline-none focus:border-brand-accent transition-colors shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-brand-dark/70 font-semibold block mb-1">
                      Email для отправки билета
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-3.5 text-brand-dark/40" />
                      <input
                        type="email"
                        required
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="aynur@example.com"
                        className="w-full bg-white border border-brand-dark/15 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-brand-dark outline-none focus:border-brand-accent transition-colors shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-brand-dark/70 font-semibold block mb-1">
                      Телефон (для SMS-уведомления)
                    </label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3.5 top-3.5 text-brand-dark/40" />
                      <input
                        type="tel"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="+994 50 123 45 67"
                        className="w-full bg-white border border-brand-dark/15 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-brand-dark outline-none focus:border-brand-accent transition-colors shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Total & Submit */}
                <div className="pt-2 border-t border-brand-dark/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-brand-dark/50 uppercase block">ИТОГО К ОПЛАТЕ / ВСЕГО</span>
                    <span className="font-display font-bold text-lg text-brand-dark">
                      {((selectedTier?.price ?? (event.price || 0)) * ticketQuantity) > 0 
                        ? `${(selectedTier?.price ?? (event.price || 0)) * ticketQuantity} AZN` 
                        : 'Бесплатно / Free'}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingBooking}
                    className="px-6 py-3.5 rounded-full bg-brand-accent text-white font-semibold text-xs uppercase tracking-wider hover:bg-brand-dark transition-all disabled:opacity-50 shadow-xs cursor-pointer"
                  >
                    {isSubmittingBooking ? 'Оформление...' : 'Подтвердить бронь'}
                  </button>
                </div>
              </form>
            ) : (
              /* Success Receipt View with QR Badge */
              <div className="text-center space-y-5 animate-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/20">
                    АККРЕДИТАЦИЯ ПОДТВЕРЖДЕНА
                  </span>
                  <h3 className="text-xl sm:text-2xl font-serif text-brand-dark mt-2">
                    Ваш пропуск на показ оформлен!
                  </h3>
                  <p className="text-xs text-brand-dark/60 mt-1">
                    Подтверждение и QR-код отправлены на <strong>{bookingSuccess.guestEmail}</strong>.
                  </p>
                </div>

                {/* Digital Ticket Pass Card */}
                <div className="p-5 rounded-2xl bg-white border border-brand-dark/15 text-left space-y-3 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand-accent/5 rounded-bl-full pointer-events-none" />
                  
                  <div className="flex items-center justify-between border-b border-brand-dark/10 pb-3">
                    <div>
                      <span className="text-[9px] font-mono text-brand-dark/50 uppercase block">PASS ID</span>
                      <span className="font-mono font-bold text-xs text-brand-accent">{bookingSuccess.passId}</span>
                    </div>
                    <div className="w-12 h-12 bg-brand-dark text-white rounded-xl flex items-center justify-center">
                      <QrCode size={28} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[9px] font-mono text-brand-dark/50 uppercase block">ГОСТЬ</span>
                      <span className="font-semibold text-brand-dark truncate block">{bookingSuccess.guestName}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-brand-dark/50 uppercase block">КАТЕГОРИЯ</span>
                      <span className="font-semibold text-brand-accent block truncate">{bookingSuccess.tierName}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-brand-dark/50 uppercase block">КОЛИЧЕСТВО</span>
                      <span className="font-semibold text-brand-dark">{bookingSuccess.quantity} билет(а)</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-brand-dark/50 uppercase block">ЛОКАЦИЯ</span>
                      <span className="font-semibold text-brand-dark truncate block">{bookingSuccess.eventLocation}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <button
                    onClick={() => setBookingModalOpen(false)}
                    className="w-full py-3 rounded-full bg-brand-dark text-white text-xs font-semibold uppercase tracking-wider hover:bg-brand-accent transition-colors cursor-pointer"
                  >
                    Готово
                  </button>
                  <a
                    href={getGoogleCalendarUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-full border border-brand-dark/15 bg-white text-brand-dark text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:border-brand-accent transition-colors"
                  >
                    <Calendar size={13} />
                    <span>Добавить в календарь</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
