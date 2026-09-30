import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Search, BookOpen, GraduationCap, CheckCircle2, X, Sparkles, ExternalLink, ArrowRight, Building } from 'lucide-react';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTranslation } from 'react-i18next';
import { DEFAULT_EDUCATION_INSTITUTIONS } from '../data/defaultEducation';
import EducationAiAdvisor from '../components/EducationAiAdvisor';

export interface EducationInstitution {
  id: string;
  number?: number;
  name: string; // Official name in AZ
  nameRu?: string; // Russian translation/name
  category: 'higher_state' | 'higher_private' | 'private_school' | 'other';
  sectionTitle?: string;
  badge?: string;
  details?: string;
  faculties?: string[];
  note?: string;
  website?: string;
  image?: string;
}

export default function Education() {
  const { t } = useTranslation();
  const [selectedInst, setSelectedInst] = useState<EducationInstitution | null>(null);
  const [filter, setFilter] = useState<'all' | 'higher' | 'higher_state' | 'higher_private' | 'private_school' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [institutions, setInstitutions] = useState<EducationInstitution[]>([]);
  const [loading, setLoading] = useState(true);

  // Lock body scroll and prevent page scrolling when institution modal popup is open
  useEffect(() => {
    if (selectedInst) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = 'hidden';
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setSelectedInst(null);
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [selectedInst]);

  useEffect(() => {
    const loadEducation = async () => {
      setLoading(true);
      try {
        let snap = await getDocs(collection(db, 'education'));
        if (snap.empty) {
          // Auto-seed default institutions into Firestore on first load
          for (const item of DEFAULT_EDUCATION_INSTITUTIONS) {
            await addDoc(collection(db, 'education'), {
              ...item,
              createdAt: serverTimestamp()
            });
          }
          snap = await getDocs(collection(db, 'education'));
        }

        const loadedList: EducationInstitution[] = snap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            number: data.number,
            name: data.name || 'Educational Institution',
            nameRu: data.nameRu || '',
            category: data.category || 'higher_state',
            badge: data.badge || '',
            details: data.details || data.description || '',
            faculties: Array.isArray(data.faculties) ? data.faculties : [],
            note: data.note || '',
            website: data.website || '',
            image: data.imageUrl || data.image || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80'
          };
        });

        // Sort by category order then by number
        const categoryOrder = { higher_state: 1, higher_private: 2, private_school: 3, other: 4 };
        loadedList.sort((a, b) => {
          const catA = categoryOrder[a.category] || 5;
          const catB = categoryOrder[b.category] || 5;
          if (catA !== catB) return catA - catB;
          return (a.number || 99) - (b.number || 99);
        });

        setInstitutions(loadedList);
      } catch (err) {
        console.error('Failed to load education institutions from Firestore:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEducation();
  }, []);

  const filtered = institutions.filter(item => {
    const matchesCategory =
      filter === 'all'
        ? true
        : filter === 'higher'
        ? item.category === 'higher_state' || item.category === 'higher_private'
        : item.category === filter;

    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.nameRu && item.nameRu.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.faculties && item.faculties.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const higherStateList = filtered.filter(item => item.category === 'higher_state');
  const higherPrivateList = filtered.filter(item => item.category === 'higher_private');
  const privateSchoolList = filtered.filter(item => item.category === 'private_school');
  const otherList = filtered.filter(item => item.category === 'other');

  const countState = institutions.filter(i => i.category === 'higher_state').length;
  const countPrivate = institutions.filter(i => i.category === 'higher_private').length;
  const countSchools = institutions.filter(i => i.category === 'private_school').length;
  const countOther = institutions.filter(i => i.category === 'other').length;

  return (
    <div className="animate-in fade-in duration-700 bg-brand-light min-h-screen text-brand-dark overflow-x-hidden pb-24 lg:pb-16">
      
      {/* 1. MAGAZINE EDITORIAL HERO HEADER */}
      <section className="border-b border-brand-dark/[0.08] bg-brand-light pt-6 pb-6 sm:py-10 px-4 sm:px-8 relative overflow-hidden shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6 relative z-10">
          <div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-normal tracking-tight text-brand-dark leading-[1.05]">
              Education & <span className="italic text-brand-accent font-serif font-normal">Academies</span>
            </h1>
            <p className="text-xs sm:text-sm text-brand-dark/70 font-normal max-w-2xl mt-2 sm:mt-3 leading-relaxed">
              {t('education_subtitle', 'Официальный гид по высшим учебным заведениям, государственным академиям (ADRA, ADMİU), частным школам моды и творческим курсам Азербайджана.')}
            </p>
          </div>

          {/* Quick Counts Badge */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <div className="px-3.5 py-2 rounded-full border border-brand-dark/[0.08] bg-white text-xs font-mono font-medium tracking-wider flex items-center gap-2 shadow-2xs">
              <GraduationCap size={15} className="text-brand-accent" />
              <span>{institutions.length} ИНСТИТУТОВ & ШКОЛ</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-8">
        
        {/* FF AI Education Advisor Chatbot Widget */}
        <EducationAiAdvisor />

        {/* Filter Pills & Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all shadow-2xs ${
                filter === 'all'
                  ? 'bg-brand-dark text-white shadow-xs'
                  : 'bg-white text-brand-dark/70 border border-brand-dark/10 hover:border-brand-accent hover:text-brand-dark'
              }`}
            >
              {t('filter_all', 'Все')} ({institutions.length})
            </button>
            <button
              onClick={() => setFilter('higher')}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all shadow-2xs ${
                filter === 'higher'
                  ? 'bg-brand-dark text-white shadow-xs'
                  : 'bg-white text-brand-dark/70 border border-brand-dark/10 hover:border-brand-accent hover:text-brand-dark'
              }`}
            >
              {t('section_higher_edu', 'ВУЗы')} ({countState + countPrivate})
            </button>
            <button
              onClick={() => setFilter('higher_state')}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all shadow-2xs ${
                filter === 'higher_state'
                  ? 'bg-brand-dark text-white shadow-xs'
                  : 'bg-white text-brand-dark/70 border border-brand-dark/10 hover:border-brand-accent hover:text-brand-dark'
              }`}
            >
              {t('section_state_uni', 'Государственные')} ({countState})
            </button>
            <button
              onClick={() => setFilter('higher_private')}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all shadow-2xs ${
                filter === 'higher_private'
                  ? 'bg-brand-dark text-white shadow-xs'
                  : 'bg-white text-brand-dark/70 border border-brand-dark/10 hover:border-brand-accent hover:text-brand-dark'
              }`}
            >
              {t('section_private_uni', 'Частные ВУЗы')} ({countPrivate})
            </button>
            <button
              onClick={() => setFilter('private_school')}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all shadow-2xs ${
                filter === 'private_school'
                  ? 'bg-brand-dark text-white shadow-xs'
                  : 'bg-white text-brand-dark/70 border border-brand-dark/10 hover:border-brand-accent hover:text-brand-dark'
              }`}
            >
              {t('section_private_schools', 'Школы & Курсы')} ({countSchools})
            </button>
            {countOther > 0 && (
              <button
                onClick={() => setFilter('other')}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all shadow-2xs ${
                  filter === 'other'
                    ? 'bg-brand-dark text-white shadow-xs'
                    : 'bg-white text-brand-dark/70 border border-brand-dark/10 hover:border-brand-accent hover:text-brand-dark'
                }`}
              >
                Другие ({countOther})
              </button>
            )}
          </div>

          <div className="relative w-full md:w-72 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-dark/40" size={15} />
            <input
              type="text"
              placeholder="Поиск заведения..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-brand-dark/15 rounded-full pl-9 pr-4 py-2 text-xs text-brand-dark focus:outline-none focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/30 placeholder:text-brand-dark/40 shadow-2xs transition-all"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-20 text-center text-xs font-mono uppercase tracking-widest text-brand-dark/40">
            Загрузка каталога образования...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center rounded-3xl border border-brand-dark/[0.08] bg-white p-8 space-y-3">
            <GraduationCap size={32} className="mx-auto text-brand-dark/30" />
            <h3 className="text-base font-display font-bold uppercase text-brand-dark">Заведения не найдены</h3>
            <p className="text-xs text-brand-dark/60 max-w-sm mx-auto">
              Попробуйте изменить поисковый запрос или выбрать другую категорию
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* SECTION 1: Высшие учебные заведения (Государственные) */}
            {higherStateList.length > 0 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-brand-dark/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                      РАЗДЕЛ I.1
                    </span>
                    <h2 className="text-base sm:text-lg font-display font-bold uppercase tracking-tight text-brand-dark">
                      {t('section_higher_edu', 'Высшие учебные заведения')} — {t('section_state_uni', 'Государственные')}
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono text-brand-dark/40 uppercase hidden sm:inline">STATE UNIVERSITIES</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {higherStateList.map((inst, index) => (
                    <RenderInstitutionCard
                      key={inst.id}
                      inst={inst}
                      index={index}
                      onSelect={setSelectedInst}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 2: Высшие учебные заведения (Частные) */}
            {higherPrivateList.length > 0 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-brand-dark/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                      РАЗДЕЛ I.2
                    </span>
                    <h2 className="text-base sm:text-lg font-display font-bold uppercase tracking-tight text-brand-dark">
                      {t('section_higher_edu', 'Высшие учебные заведения')} — {t('section_private_uni', 'Частные')}
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono text-brand-dark/40 uppercase hidden sm:inline">PRIVATE UNIVERSITIES</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {higherPrivateList.map((inst, index) => (
                    <RenderInstitutionCard
                      key={inst.id}
                      inst={inst}
                      index={index}
                      onSelect={setSelectedInst}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 3: Частные школы и курсы */}
            {privateSchoolList.length > 0 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-brand-dark/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                      РАЗДЕЛ II
                    </span>
                    <h2 className="text-base sm:text-lg font-display font-bold uppercase tracking-tight text-brand-dark">
                      {t('section_private_schools', 'Школы моды, лицеи & профессиональные курсы')}
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono text-brand-dark/40 uppercase hidden sm:inline">VOCATIONAL & COURSES</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {privateSchoolList.map((inst, index) => (
                    <RenderInstitutionCard
                      key={inst.id}
                      inst={inst}
                      index={index}
                      onSelect={setSelectedInst}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 4: Другие заведения */}
            {otherList.length > 0 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-brand-dark/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                      РАЗДЕЛ III
                    </span>
                    <h2 className="text-base sm:text-lg font-display font-bold uppercase tracking-tight text-brand-dark">
                      Другие специализированные учебные центры
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono text-brand-dark/40 uppercase hidden sm:inline">OTHER ACADEMIES</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {otherList.map((inst, index) => (
                    <RenderInstitutionCard
                      key={inst.id}
                      inst={inst}
                      index={index}
                      onSelect={setSelectedInst}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: DETAIL MODAL FOR SELECTED INSTITUTION */}
      <AnimatePresence>
        {selectedInst && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto overscroll-contain"
            role="dialog"
            aria-modal="true"
          >
            <div 
              className="fixed inset-0 cursor-pointer" 
              onClick={() => setSelectedInst(null)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-2xl bg-white rounded-3xl border border-brand-dark/[0.08] shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col overscroll-contain"
            >
              {/* Modal Hero Image */}
              {selectedInst.image && (
                <div className="relative h-48 sm:h-64 overflow-hidden bg-brand-muted">
                  <img
                    src={selectedInst.image}
                    alt={selectedInst.name}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Close button on image */}
                  <button
                    onClick={() => setSelectedInst(null)}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 text-white hover:bg-brand-accent transition-colors flex items-center justify-center backdrop-blur-md"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>

                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    {selectedInst.badge && (
                      <span className="bg-brand-accent text-white font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block mb-1.5 shadow-2xs">
                        {selectedInst.badge}
                      </span>
                    )}
                    <h3 className="font-display font-bold text-xl sm:text-2xl uppercase tracking-tight leading-tight text-white drop-shadow-sm">
                      {selectedInst.name}
                    </h3>
                  </div>
                </div>
              )}

              {/* Modal Body */}
              <div className="p-6 sm:p-8 space-y-6 max-h-[60vh] overflow-y-auto overscroll-contain">
                {!selectedInst.image && (
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-brand-dark/[0.08]">
                    <div>
                      {selectedInst.badge && (
                        <span className="bg-brand-accent text-white font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block mb-1.5 shadow-2xs">
                          {selectedInst.badge}
                        </span>
                      )}
                      <h3 className="font-display font-bold text-xl sm:text-2xl uppercase tracking-tight text-brand-dark">
                        {selectedInst.name}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedInst(null)}
                      className="w-9 h-9 rounded-full border border-brand-dark/15 text-brand-dark hover:bg-brand-muted flex items-center justify-center shrink-0"
                      aria-label="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}

                {selectedInst.nameRu && (
                  <p className="text-sm font-medium text-brand-dark/65">
                    {selectedInst.nameRu}
                  </p>
                )}

                {selectedInst.details && (
                  <div className="p-4 rounded-2xl bg-brand-light border border-brand-dark/[0.08]">
                    <p className="text-xs sm:text-sm text-brand-dark/80 leading-relaxed font-normal">
                      {selectedInst.details}
                    </p>
                  </div>
                )}

                {selectedInst.faculties && selectedInst.faculties.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-brand-dark flex items-center gap-2">
                      <BookOpen size={15} className="text-brand-accent" />
                      <span>Направления подготовки & Факультеты:</span>
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedInst.faculties.map((fac, i) => (
                        <li key={i} className="p-2.5 rounded-xl bg-stone-50 border border-brand-dark/[0.06] flex items-start gap-2 text-xs font-medium text-brand-dark">
                          <CheckCircle2 size={15} className="text-brand-accent shrink-0 mt-0.5" />
                          <span className="break-words">{fac}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedInst.note && (
                  <div className="p-4 rounded-2xl bg-brand-accent/5 border border-brand-accent/20 text-xs text-brand-dark/80 leading-relaxed font-normal">
                    <strong className="font-semibold text-brand-accent block mb-1">Примечание:</strong>
                    {selectedInst.note}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 sm:p-6 bg-stone-50/70 border-t border-brand-dark/[0.08] flex flex-col sm:flex-row gap-3 justify-between items-center">
                {selectedInst.website ? (
                  <a
                    href={selectedInst.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-brand-dark text-white hover:bg-brand-accent transition-colors text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xs"
                  >
                    <Globe size={14} />
                    <span>Официальный сайт</span>
                    <ExternalLink size={12} />
                  </a>
                ) : <div />}

                <button
                  onClick={() => setSelectedInst(null)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-brand-dark/15 text-brand-dark hover:bg-white transition-colors text-xs font-semibold uppercase tracking-wider shadow-2xs"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RenderInstitutionCard({
  inst,
  index,
  onSelect
}: {
  inst: EducationInstitution;
  index: number;
  onSelect: (inst: EducationInstitution) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="group rounded-3xl border border-brand-dark/[0.08] bg-white shadow-xs hover:border-brand-accent/30 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
    >
      <div>
        {/* Card Header Image */}
        {inst.image && (
          <div className="relative h-44 sm:h-48 overflow-hidden bg-brand-muted">
            <img
              src={inst.image}
              alt={inst.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              crossOrigin="anonymous"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white font-mono text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-2xs">
              #{inst.number || index + 1}
            </div>

            {inst.badge && (
              <div className="absolute top-3 right-3 bg-brand-accent text-white font-mono text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-2xs">
                {inst.badge}
              </div>
            )}
          </div>
        )}

        <div className="p-5 sm:p-6 space-y-3">
          <h3 className="font-display font-bold text-base sm:text-lg uppercase tracking-tight text-brand-dark group-hover:text-brand-accent transition-colors leading-tight">
            {inst.name}
          </h3>

          {inst.nameRu && (
            <p className="text-xs text-brand-dark/60 font-medium line-clamp-1">
              {inst.nameRu}
            </p>
          )}

          {inst.details && (
            <p className="text-xs text-brand-dark/70 font-normal line-clamp-2 leading-relaxed">
              {inst.details}
            </p>
          )}

          {inst.faculties && inst.faculties.length > 0 && (
            <div className="pt-1 flex flex-wrap gap-1.5">
              {inst.faculties.slice(0, 2).map((fac, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-stone-100 text-brand-dark/80 font-medium truncate max-w-[220px]"
                >
                  {fac}
                </span>
              ))}
              {inst.faculties.length > 2 && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-brand-accent/5 text-brand-accent font-medium">
                  +{inst.faculties.length - 2} еще
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-6 pt-0 mt-auto">
        <button
          onClick={() => onSelect(inst)}
          className="w-full py-2.5 px-4 rounded-full bg-brand-light border border-brand-dark/15 text-brand-dark hover:bg-brand-dark hover:text-white hover:border-brand-dark transition-all font-semibold uppercase tracking-wider text-xs flex items-center justify-between group/btn shadow-2xs"
        >
          <span>Подробнее о заведении</span>
          <ArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}
