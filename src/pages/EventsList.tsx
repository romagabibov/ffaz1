import React, { useEffect, useState, useMemo, useRef } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useTranslation } from 'react-i18next';
import { Event } from '../types';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  X, 
  Clock, 
  Sparkles, 
  ArrowRight,
  ChevronDown,
  Search,
  SlidersHorizontal,
  Share2,
  Bookmark,
  Check,
  Ticket,
  Flame,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';

function parseEventDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val === 'number') {
    return new Date(val < 10000000000 ? val * 1000 : val);
  }
  if (val?.toDate && typeof val.toDate === 'function') {
    return val.toDate();
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function isEventOnDate(event: Event, targetDate: Date): boolean {
  const start = parseEventDate(event.date);
  if (!start) return false;

  const targetDayTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
  const startDayTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();

  if ((event as any).endDate) {
    const end = parseEventDate((event as any).endDate);
    if (end) {
      const endDayTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
      return targetDayTime >= startDayTime && targetDayTime <= endDayTime;
    }
  }

  return targetDayTime === startDayTime;
}

export default function EventsList() {
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States (Concert Tour Style)
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('all'); // 'all' or 'YYYY-MM'
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [isCalendarGridExpanded, setIsCalendarGridExpanded] = useState(true);
  const eventsListRef = useRef<HTMLDivElement>(null);

  // Calendar Navigator Month State
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  // Saved / bookmarked event IDs (Local state for Social Network DNA)
  const [savedEventIds, setSavedEventIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('az_saved_events') || '[]');
    } catch {
      return [];
    }
  });

  const toggleSaveEvent = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSavedEventIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem('az_saved_events', JSON.stringify(next));
      if (!prev.includes(id)) {
        toast.success(t('event_saved_feed', 'Event saved to your personal schedule!'));
      }
      return next;
    });
  };

  const handleShare = (e: React.MouseEvent, event: Event) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/event/${event.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast.success(t('event_link_copied', 'Event link copied to clipboard!'));
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Event[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Event);
        });
        setEvents(data);
        setLoading(false);

        // Auto-focus calendar on upcoming month with events if current month is empty
        if (data.length > 0) {
          const now = new Date();
          const hasCurrentMonth = data.some((ev) => {
            const d = parseEventDate(ev.date);
            return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          });
          if (!hasCurrentMonth) {
            const firstEvDate = parseEventDate(data[0].date);
            if (firstEvDate) {
              setCurrentMonthDate(new Date(firstEvDate.getFullYear(), firstEvDate.getMonth(), 1));
            }
          }
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'events');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // Compute available months from all events for the top concert filter pills
  const availableMonths = useMemo(() => {
    const monthsMap = new Map<string, { key: string; label: string; date: Date; count: number }>();
    events.forEach((ev) => {
      const d = parseEventDate(ev.date);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString(i18n.language || 'en', { month: 'short', year: 'numeric' }).toUpperCase();
      if (!monthsMap.has(key)) {
        monthsMap.set(key, { key, label, date: new Date(d.getFullYear(), d.getMonth(), 1), count: 0 });
      }
      monthsMap.get(key)!.count += 1;
    });

    return Array.from(monthsMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events, i18n.language]);

  // Compute available locations for filter
  const availableLocations = useMemo(() => {
    const setLoc = new Set<string>();
    events.forEach((e) => {
      if (e.location) {
        const loc = e.location.split(',')[0].trim();
        if (loc) setLoc.add(loc);
      }
    });
    return Array.from(setLoc);
  }, [events]);

  // Days in calendar month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDayRaw = new Date(year, month, 1).getDay();
  const startOffset = (startDayRaw + 6) % 7; // Monday = 0

  const calendarDays = useMemo(() => {
    const days: { date: Date; dayNum: number; isCurrentMonth: boolean; events: Event[] }[] = [];
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    for (let i = startOffset - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthTotalDays - i);
      const dayEvs = events.filter((e) => isEventOnDate(e, prevDate));
      days.push({ date: prevDate, dayNum: prevMonthTotalDays - i, isCurrentMonth: false, events: dayEvs });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const thisDate = new Date(year, month, i);
      const dayEvs = events.filter((e) => isEventOnDate(e, thisDate));
      days.push({ date: thisDate, dayNum: i, isCurrentMonth: true, events: dayEvs });
    }

    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dayEvs = events.filter((e) => isEventOnDate(e, nextDate));
      days.push({ date: nextDate, dayNum: i, isCurrentMonth: false, events: dayEvs });
    }

    return days;
  }, [year, month, startOffset, daysInMonth, events]);

  // Filtered Events List (Concert Tour filtering engine)
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const d = parseEventDate(ev.date);
      if (!d) return false;

      // 1. Specific Date Filter (if user clicked a day in calendar)
      if (selectedDate && !isEventOnDate(ev, selectedDate)) {
        return false;
      }

      // 2. Month Filter
      if (selectedMonthKey !== 'all') {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key !== selectedMonthKey) return false;
      }

      // 3. Location Filter
      if (selectedLocation !== 'all') {
        if (!ev.location || !ev.location.toLowerCase().includes(selectedLocation.toLowerCase())) {
          return false;
        }
      }

      // 4. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = ev.title?.toLowerCase().includes(q);
        const matchDesc = ev.description?.toLowerCase().includes(q);
        const matchLoc = ev.location?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchLoc) return false;
      }

      return true;
    });
  }, [events, selectedDate, selectedMonthKey, selectedLocation, searchQuery]);

  // Group events by month for magazine tour list layout
  const groupedEventsByMonth = useMemo(() => {
    const groups: { monthTitle: string; events: Event[] }[] = [];
    filteredEvents.forEach((ev) => {
      const d = parseEventDate(ev.date);
      if (!d) return;
      const monthTitle = d.toLocaleString(i18n.language || 'en', { month: 'long', year: 'numeric' }).toUpperCase();
      let group = groups.find((g) => g.monthTitle === monthTitle);
      if (!group) {
        group = { monthTitle, events: [] };
        groups.push(group);
      }
      group.events.push(ev);
    });
    return groups;
  }, [filteredEvents, i18n.language]);

  const clearAllFilters = () => {
    setSelectedDate(null);
    setSelectedMonthKey('all');
    setSelectedLocation('all');
    setSearchQuery('');
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const isSelectedDate = (d: Date) => {
    if (!selectedDate) return false;
    return (
      d.getDate() === selectedDate.getDate() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getFullYear() === selectedDate.getFullYear()
    );
  };

  // When calendar collapses, immediately reset scroll so month header never dips under sticky bar or calendar
  useEffect(() => {
    if (!isCalendarGridExpanded && window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [isCalendarGridExpanded]);

  const handleCalendarDayClick = (d: Date) => {
    if (selectedDate && isSelectedDate(d)) {
      setSelectedDate(null);
    } else {
      setSelectedDate(d);
      setSelectedMonthKey('all'); // specific date takes priority
      setTimeout(() => {
        if (eventsListRef.current) {
          const navOffset = 140; // Total height of fixed navbar + sticky filter strip
          const elementPosition = eventsListRef.current.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - navOffset;
          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth',
          });
        }
      }, 100);
    }
  };

  return (
    <div className="animate-in fade-in duration-700 min-h-screen flex flex-col bg-brand-light text-brand-dark overflow-x-hidden">
      {/* CONCERT TOUR-STYLE CALENDAR FILTER STRIP */}
      <section className="sticky top-[60px] sm:top-[68px] z-30 bg-brand-light/95 backdrop-blur-xl border-b border-brand-dark/[0.08] shadow-[0_4px_20px_-8px_rgba(18,18,18,0.04)] py-2.5 sm:py-3 px-3 sm:px-8 md:px-12 -translate-y-[30%]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Month Pills Filter Strip (Concert Band Style) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => {
                setSelectedMonthKey('all');
                setSelectedDate(null);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 shadow-2xs ${
                selectedMonthKey === 'all' && !selectedDate
                  ? 'bg-brand-dark text-white font-bold'
                  : 'bg-white text-brand-dark/70 hover:text-brand-dark hover:border-brand-dark/25 border border-brand-dark/15'
              }`}
            >
              {t('all_dates', 'All Dates')} ({events.length})
            </button>

            {availableMonths.map((m) => {
              const isMonthActive = selectedMonthKey === m.key && !selectedDate;
              return (
                <button
                  key={m.key}
                  onClick={() => {
                    setSelectedMonthKey(m.key);
                    setSelectedDate(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 shadow-2xs ${
                    isMonthActive
                      ? 'bg-brand-accent text-white font-bold border border-brand-accent'
                      : 'bg-white text-brand-dark/70 hover:text-brand-dark hover:border-brand-dark/25 border border-brand-dark/15'
                  }`}
                >
                  <span>{m.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isMonthActive ? 'bg-white/20 text-white' : 'bg-brand-dark/[0.07] text-brand-dark'}`}>
                    {m.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search and Secondary Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Calendar Jump / Toggle Button */}
            <button
              onClick={() => {
                setIsCalendarGridExpanded((prev) => !prev);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 shadow-2xs border cursor-pointer ${
                isCalendarGridExpanded || selectedDate
                  ? 'bg-brand-accent text-white border-brand-accent shadow-xs'
                  : 'bg-white text-brand-dark hover:border-brand-accent border-brand-dark/15'
              }`}
              title={isCalendarGridExpanded ? "Свернуть календарь событий" : "Открыть календарь событий по датам"}
            >
              <CalendarIcon size={13} className={isCalendarGridExpanded || selectedDate ? 'text-white' : 'text-brand-accent'} />
              <span className="hidden sm:inline">
                {isCalendarGridExpanded ? 'Свернуть календарь' : 'Календарь дат'}
              </span>
              <span className="sm:hidden">
                {isCalendarGridExpanded ? 'Свернуть' : 'Даты'}
              </span>
              <ChevronDown 
                size={13} 
                className={`transition-transform duration-200 ${isCalendarGridExpanded ? 'rotate-180 text-white/90' : 'text-brand-dark/50'}`} 
              />
              {selectedDate && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
            </button>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-dark/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search_tour_shows', 'Search shows, venue...')}
                className="w-full pl-8 pr-3 py-1.5 rounded-full bg-white border border-brand-dark/15 text-xs text-brand-dark placeholder:text-brand-dark/40 focus:outline-none focus:border-brand-accent shadow-2xs transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-dark/40 hover:text-brand-dark"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* City Selector */}
            {availableLocations.length > 0 && (
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-3 py-1.5 rounded-full bg-white border border-brand-dark/15 text-xs text-brand-dark uppercase tracking-wider focus:outline-none focus:border-brand-accent shadow-2xs cursor-pointer transition-colors"
              >
                <option value="all">{t('all_cities', 'All Cities')}</option>
                {availableLocations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            )}

            {/* Clear active filter button */}
            {(selectedDate || selectedMonthKey !== 'all' || selectedLocation !== 'all' || searchQuery) && (
              <button
                onClick={clearAllFilters}
                className="p-1.5 rounded-full hover:bg-brand-muted text-brand-accent hover:text-brand-dark transition-colors"
                title={t('reset_filters', 'Reset filters')}
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Indicator Bar */}
        {(selectedDate || selectedMonthKey !== 'all' || selectedLocation !== 'all' || searchQuery) && (
          <div className="max-w-7xl mx-auto pt-2.5 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-brand-dark/50 font-mono text-[11px] uppercase tracking-wider">Filtered by:</span>
            {selectedDate && (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-brand-accent text-white text-[11px] font-medium shadow-xs">
                <span>{selectedDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <button onClick={() => setSelectedDate(null)}><X size={11} /></button>
              </span>
            )}
            {selectedMonthKey !== 'all' && !selectedDate && (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-brand-dark text-brand-light text-[11px] font-medium shadow-xs">
                <span>Month: {selectedMonthKey}</span>
                <button onClick={() => setSelectedMonthKey('all')}><X size={11} /></button>
              </span>
            )}
            {selectedLocation !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-brand-muted border border-brand-dark/15 text-brand-dark text-[11px] font-medium shadow-xs">
                <span>City: {selectedLocation}</span>
                <button onClick={() => setSelectedLocation('all')}><X size={11} /></button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-brand-muted border border-brand-dark/15 text-brand-dark text-[11px] font-medium shadow-xs">
                <span>"{searchQuery}"</span>
                <button onClick={() => setSearchQuery('')}><X size={11} /></button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-[11px] text-brand-accent hover:underline font-medium ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </section>

      {/* 3. EXPANDABLE MONTHLY CALENDAR GRID (Shows when user clicks "Calendar Grid") */}
      <AnimatePresence>
        {isCalendarGridExpanded && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="border-b border-brand-dark/[0.08] bg-brand-muted/30 overflow-hidden relative z-0"
          >
            <div className="max-w-7xl mx-auto pt-10 sm:pt-14 pb-6 px-4 sm:px-8 md:px-12">
              {/* Calendar Section Header & Month Navigation */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-brand-dark/[0.08]">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-serif font-normal text-brand-dark">
                    {currentMonthDate.toLocaleString(i18n.language || 'ru', { month: 'long', year: 'numeric' }).toUpperCase()}
                  </h3>
                  <p className="text-xs text-brand-dark/60 mt-0.5 font-normal">
                    Нажмите на подсвеченный день, чтобы мгновенно отфильтровать список показов
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                  {/* Quick Month Switchers if events exist in multiple months */}
                  {availableMonths.length > 1 && (
                    <div className="hidden lg:flex items-center gap-1.5 mr-2 p-1 bg-white rounded-full border border-brand-dark/15 shadow-2xs">
                      {availableMonths.map((m) => {
                        const isCurrentActive =
                          currentMonthDate.getFullYear() === m.date.getFullYear() &&
                          currentMonthDate.getMonth() === m.date.getMonth();
                        return (
                          <button
                            key={m.key}
                            onClick={() => setCurrentMonthDate(m.date)}
                            className={`px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                              isCurrentActive
                                ? 'bg-brand-accent text-white font-bold shadow-xs'
                                : 'text-brand-dark hover:bg-brand-accent/10'
                            }`}
                          >
                            <span>{m.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isCurrentActive ? 'bg-white/20 text-white' : 'bg-brand-dark/[0.08]'}`}>
                              {m.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-full border border-brand-dark/15 shadow-2xs">
                    <button
                      onClick={() => setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                      className="p-1.5 rounded-full hover:bg-brand-dark hover:text-white transition-all cursor-pointer text-brand-dark"
                      title="Предыдущий месяц"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentMonthDate(new Date())}
                      className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-brand-dark hover:text-white transition-all cursor-pointer text-brand-dark"
                    >
                      {t('today', 'Сегодня')}
                    </button>
                    <button
                      onClick={() => setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                      className="p-1.5 rounded-full hover:bg-brand-dark hover:text-white transition-all cursor-pointer text-brand-dark"
                      title="Следующий месяц"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Quick collapse button in calendar header */}
                  <button
                    onClick={() => setIsCalendarGridExpanded(false)}
                    className="p-2 rounded-full bg-white hover:bg-brand-dark hover:text-white text-brand-dark border border-brand-dark/15 shadow-2xs transition-all cursor-pointer flex items-center gap-1 text-xs"
                    title="Свернуть календарь"
                  >
                    <X size={15} />
                    <span className="hidden sm:inline text-[11px] font-semibold uppercase pr-1">Свернуть</span>
                  </button>
                </div>
              </div>

              {/* Calendar Days Wrapper with mobile horizontal protection */}
              <div className="overflow-x-auto no-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0 pb-1">
                <div className="min-w-[300px]">
                  {/* Day names header */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center font-mono text-[9px] sm:text-xs font-bold uppercase tracking-wider text-brand-dark/60 pb-2">
                    {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map((day) => (
                      <div key={day} className="py-1">{day}</div>
                    ))}
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-2.5">
                    {calendarDays.map((cell, idx) => {
                      const hasShows = cell.events.length > 0;
                      const isCellSelected = isSelectedDate(cell.date);
                      const isCurrentDay = isToday(cell.date);

                      return (
                        <button
                          key={idx}
                          onClick={() => handleCalendarDayClick(cell.date)}
                          className={`min-h-[50px] sm:min-h-[82px] p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl flex flex-col justify-between text-left transition-all relative border cursor-pointer ${
                            isCellSelected
                              ? 'bg-brand-accent text-white border-brand-accent shadow-lg scale-[1.03] z-10 ring-2 ring-brand-accent/40'
                              : hasShows
                              ? 'bg-brand-accent/10 text-brand-dark border-brand-accent/40 hover:bg-brand-accent hover:text-white shadow-xs hover:scale-[1.02]'
                              : cell.isCurrentMonth
                              ? 'bg-white/80 text-brand-dark/70 border-brand-dark/[0.08] hover:bg-white hover:border-brand-dark/20'
                              : 'bg-transparent text-brand-dark/20 border-transparent hover:text-brand-dark/40'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={`text-xs sm:text-base font-serif font-medium ${isCurrentDay && !isCellSelected ? 'text-brand-accent font-bold underline' : ''}`}>
                              {cell.dayNum}
                            </span>
                            {hasShows && (
                              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCellSelected ? 'bg-white' : 'bg-brand-accent'}`} />
                                <span className={`relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 ${isCellSelected ? 'bg-white' : 'bg-brand-accent'}`} />
                              </span>
                            )}
                          </div>

                          {hasShows && (
                            <div className={`w-full truncate text-[8px] sm:text-[10px] font-mono tracking-tight font-bold mt-0.5 sm:mt-1 px-1 sm:px-1.5 py-0.5 rounded sm:rounded-md text-center ${
                              isCellSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-brand-accent text-white'
                            }`}>
                              {cell.events.length} <span className="hidden xs:inline">{cell.events.length === 1 ? 'показ' : cell.events.length < 5 ? 'показа' : 'показов'}</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Selected Date Feedback Bar & Collapse Button */}
              <div className="mt-4 pt-3 border-t border-brand-dark/[0.08] flex items-center justify-between gap-3 text-xs flex-wrap">
                <button
                  onClick={() => setIsCalendarGridExpanded(false)}
                  className="px-3 py-1.5 rounded-full bg-white hover:bg-brand-dark hover:text-white text-brand-dark/70 border border-brand-dark/15 font-mono text-[11px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <span>↑ Свернуть календарь</span>
                </button>

                <div className="flex items-center gap-2">
                  {selectedDate ? (
                    <div className="flex items-center gap-2 bg-brand-accent text-white px-3.5 py-1.5 rounded-full font-mono text-xs font-semibold shadow-xs">
                      <span>
                        🎯 Выбрана дата: {selectedDate.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        onClick={() => setSelectedDate(null)}
                        className="ml-1 bg-white/20 hover:bg-white/30 text-white rounded-full p-0.5 cursor-pointer"
                        title="Сбросить фильтр даты"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono text-brand-dark/50">
                      Нажмите на любой подсвеченный день, чтобы отобразить показы
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* 4. MAIN SECTION: CONCERT TOUR DATES LIST (По списку) */}
      <main ref={eventsListRef} className="flex-1 max-w-7xl mx-auto w-full pt-12 sm:pt-16 pb-16 px-4 sm:px-8 md:px-12 scroll-mt-36 relative z-10 bg-brand-light">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-2 border-brand-accent border-r-transparent rounded-full animate-spin mb-4" />
            <p className="font-mono text-xs uppercase tracking-widest text-brand-dark/70">
              [LOADING RUNWAY TOUR ARCHIVE...]
            </p>
          </div>
        ) : filteredEvents.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 px-6 max-w-xl mx-auto rounded-3xl border border-brand-dark/[0.08] bg-brand-muted/30 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-brand-accent/10 text-brand-accent mx-auto flex items-center justify-center mb-4">
              <CalendarIcon size={22} />
            </div>
            <h3 className="text-2xl font-serif font-normal text-brand-dark mb-2">
              {t('no_shows_for_filter', 'No Shows Scheduled')}
            </h3>
            <p className="text-sm text-brand-dark/70 mb-6 font-normal">
              {t('no_shows_desc', 'There are no runway shows matching your current filter criteria. Reset the filter to view all upcoming tour dates.')}
            </p>
            <button
              onClick={clearAllFilters}
              className="brand-button px-6 py-3 text-xs inline-flex items-center gap-2"
            >
              <RotateCcw size={14} />
              <span>{t('show_all_tour_dates', 'Show All Tour Dates')}</span>
            </button>
          </div>
        ) : (
          /* Concert Tour Dates Groups */
          <div className="space-y-12">
            {groupedEventsByMonth.map((group) => (
              <section key={group.monthTitle} className="space-y-4 scroll-mt-36 relative z-20">
                {/* Month Group Header */}
                <div className="flex items-center justify-between border-b border-brand-dark/[0.08] pb-3 pt-2 sm:pt-3 relative z-20 bg-brand-light">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl sm:text-3xl font-serif font-normal text-brand-dark tracking-tight">
                      {group.monthTitle}
                    </h2>
                    <span className="font-mono text-[10px] sm:text-xs text-brand-accent font-semibold px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/20">
                      {group.events.length} {group.events.length === 1 ? 'SHOW' : 'SHOWS'}
                    </span>
                  </div>
                </div>

                {/* Tour List Rows (Music Concert Website Style) */}
                <div className="space-y-3">
                  {group.events.map((ev) => {
                    const start = parseEventDate(ev.date);
                    const end = (ev as any).endDate ? parseEventDate((ev as any).endDate) : null;
                    const isSaved = savedEventIds.includes(ev.id);

                    const dayNumber = start ? start.getDate() : '--';
                    const weekday = start ? start.toLocaleString(i18n.language || 'en', { weekday: 'short' }).toUpperCase() : '';
                    const monthShort = start ? start.toLocaleString(i18n.language || 'en', { month: 'short' }).toUpperCase() : '';
                    const timeStr = start ? start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '19:30';

                    const lowestPrice =
                      ev.ticketTiers && ev.ticketTiers.length > 0
                        ? Math.min(...ev.ticketTiers.map((t) => t.price))
                        : ev.price;

                    return (
                      <article
                        key={ev.id}
                        className="group relative rounded-3xl border border-brand-dark/[0.08] bg-white p-4 sm:p-5 md:p-6 transition-all duration-300 hover:border-brand-accent/30 hover:shadow-[0_12px_36px_-12px_rgba(18,18,18,0.08)] hover:-translate-y-0.5 shadow-2xs"
                      >
                        {/* MOBILE APP LAYOUT (Below md) */}
                        <div className="md:hidden flex flex-col w-full">
                          {/* Banner Poster with Floating Pill Badges */}
                          <div className="relative w-full rounded-2xl overflow-hidden bg-brand-muted/30 border border-brand-dark/[0.08] mb-3">
                            <Link to={`/event/${ev.id}`} className="w-full block">
                              {ev.imageUrl ? (
                                <img
                                  src={ev.imageUrl}
                                  alt={ev.title}
                                  className="w-full h-auto object-contain block"
                                  crossOrigin="anonymous"
                                />
                              ) : (
                                <div className="w-full aspect-[16/9] flex items-center justify-center font-display text-xl text-brand-dark/30">
                                  AZ FASHION
                                </div>
                              )}
                            </Link>

                            {/* Floating Date Pill */}
                            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-brand-dark/90 backdrop-blur-md text-white font-mono text-[10px] font-semibold flex items-center gap-1.5 shadow-md border border-white/10">
                              <span className="text-brand-accent font-bold">{weekday} {dayNumber}</span>
                              <span>•</span>
                              <span>{monthShort} {timeStr}</span>
                            </div>

                            {/* Floating Action Icons */}
                            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                              <button
                                onClick={(e) => toggleSaveEvent(e, ev.id)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md backdrop-blur-md transition-all ${
                                  isSaved ? 'bg-brand-accent text-white' : 'bg-white/95 text-brand-dark hover:bg-white'
                                }`}
                                aria-label="Save Show"
                              >
                                <Bookmark size={13} fill={isSaved ? 'currentColor' : 'none'} />
                              </button>
                              <button
                                onClick={(e) => handleShare(e, ev)}
                                className="w-7 h-7 rounded-full bg-white/95 backdrop-blur-md text-brand-dark hover:bg-white flex items-center justify-center shadow-md transition-all"
                                aria-label="Share Event"
                              >
                                <Share2 size={13} />
                              </button>
                            </div>

                            {/* Floating Admission Pill */}
                            <div className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-md text-brand-dark font-display text-xs font-bold shadow-md border border-brand-dark/10">
                              {lowestPrice ? `${lowestPrice} AZN` : t('open_schedule', 'Open Schedule')}
                            </div>
                          </div>

                          {/* Mobile Event Meta & Body */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-brand-accent/5 text-brand-accent border border-brand-accent/20 font-mono">
                                OFFICIAL RUNWAY
                              </span>
                              {ev.availableTickets !== undefined && ev.availableTickets <= 10 && ev.availableTickets > 0 && (
                                <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 border border-amber-500/20 flex items-center gap-1">
                                  <Flame size={9} /> LIMITED PASSES
                                </span>
                              )}
                            </div>

                            <Link to={`/event/${ev.id}`}>
                              <h3 className="text-lg font-display font-bold text-brand-dark leading-tight line-clamp-2">
                                {ev.title}
                              </h3>
                            </Link>

                            <div className="flex items-center gap-1.5 text-xs text-brand-dark/70 font-normal">
                              <MapPin size={13} className="text-brand-accent shrink-0" />
                              <span className="truncate">{ev.location || 'Heydar Aliyev Center • Baku'}</span>
                            </div>

                            {/* Full-width Touch CTA */}
                            <div className="pt-2">
                              <Link
                                to={`/event/${ev.id}`}
                                className="w-full py-3 rounded-full bg-brand-dark text-white hover:bg-brand-accent transition-colors flex items-center justify-center gap-2 font-semibold text-xs uppercase tracking-wider shadow-2xs active:scale-[0.98]"
                              >
                                <span>{t('view_tickets_cta', 'Билеты & Досье показа')}</span>
                                <ArrowRight size={13} />
                              </Link>
                            </div>
                          </div>
                        </div>

                        {/* DESKTOP & TABLET ROW LAYOUT (md: and above) */}
                        <div className="hidden md:flex flex-row items-center justify-between gap-5 w-full">
                          {/* LEFT SECTION: Tour Date Badge & Thumbnail */}
                          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                            {/* Concert Tour Date Block */}
                            <div className="w-20 sm:w-22 h-20 sm:h-24 rounded-2xl bg-brand-muted/60 border border-brand-dark/[0.08] flex flex-col items-center justify-center text-center p-2 shrink-0 group-hover:border-brand-accent/30 transition-colors shadow-2xs">
                              <span className="text-[10px] sm:text-[11px] font-bold text-brand-accent uppercase tracking-wider">
                                {weekday}
                              </span>
                              <span className="font-display text-3xl sm:text-4xl font-bold leading-none text-brand-dark my-0.5">
                                {dayNumber}
                              </span>
                              <span className="text-[10px] sm:text-[11px] font-semibold text-brand-dark/70 uppercase tracking-wider">
                                {monthShort}
                              </span>
                            </div>

                            {/* Event Poster Thumbnail */}
                            <Link 
                              to={`/event/${ev.id}`}
                              className="w-20 sm:w-22 h-20 sm:h-24 rounded-2xl overflow-hidden bg-brand-muted border border-brand-dark/[0.08] shrink-0 relative block"
                            >
                              {ev.imageUrl ? (
                                <img
                                  src={ev.imageUrl}
                                  alt={ev.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  crossOrigin="anonymous"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-display text-xl text-brand-dark/30">
                                  AZ
                                </div>
                              )}
                            </Link>
                          </div>

                          {/* CENTER SECTION: Event Details & Metadata */}
                          <div className="flex-1 min-w-0 pr-0 lg:pr-6">
                            {/* Badges / Category row */}
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full bg-brand-accent/5 text-brand-accent border border-brand-accent/20 font-mono">
                                OFFICIAL RUNWAY
                              </span>
                              {ev.availableTickets !== undefined && ev.availableTickets <= 10 && ev.availableTickets > 0 && (
                                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 border border-amber-500/20 flex items-center gap-1">
                                  <Flame size={10} /> LIMITED PASSES
                                </span>
                              )}
                              <span className="text-[11px] text-brand-dark/60 font-medium flex items-center gap-1">
                                <Clock size={11} /> {timeStr} AZT
                              </span>
                            </div>

                            {/* Title */}
                            <Link to={`/event/${ev.id}`}>
                              <h3 className="text-xl sm:text-2xl font-display font-semibold text-brand-dark group-hover:text-brand-accent transition-colors leading-tight mb-2 truncate">
                                {ev.title}
                              </h3>
                            </Link>

                            {/* Venue / Location */}
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-brand-dark/75 font-normal">
                              <MapPin size={13} className="text-brand-accent shrink-0" />
                              <span className="truncate">{ev.location || 'Heydar Aliyev Center • Baku'}</span>
                            </div>
                          </div>

                          {/* RIGHT SECTION: Price & Ticket Action */}
                          <div className="flex flex-col items-end justify-center gap-3 shrink-0">
                            {/* Price */}
                            <div className="text-right">
                              <div className="text-[10px] uppercase tracking-wider font-semibold text-brand-dark/50 font-mono">
                                ADMISSION
                              </div>
                              <div className="font-display text-lg sm:text-xl font-semibold text-brand-dark">
                                {lowestPrice ? `${lowestPrice} AZN` : t('open_schedule', 'Open Schedule')}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => toggleSaveEvent(e, ev.id)}
                                className={`p-2.5 rounded-full border transition-all shadow-xs ${
                                  isSaved
                                    ? 'bg-brand-accent text-white border-brand-accent'
                                    : 'bg-brand-light border-brand-dark/15 text-brand-dark hover:border-brand-dark'
                                }`}
                                title={isSaved ? 'Saved in personal calendar' : 'Save show'}
                                aria-label="Save Show"
                              >
                                <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
                              </button>

                              <button
                                onClick={(e) => handleShare(e, ev)}
                                className="p-2.5 rounded-full border border-brand-dark/15 bg-brand-light text-brand-dark hover:border-brand-dark transition-all shadow-xs"
                                title="Share event link"
                                aria-label="Share Event"
                              >
                                <Share2 size={14} />
                              </button>

                              <Link
                                to={`/event/${ev.id}`}
                                className="px-5 py-2.5 rounded-full bg-brand-dark text-white hover:bg-brand-accent text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-xs group/btn whitespace-nowrap transition-colors"
                              >
                                <span>{t('view_tickets_cta', 'Tickets / Details')}</span>
                                <ArrowRight size={13} className="transition-transform group-hover/btn:translate-x-1" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
