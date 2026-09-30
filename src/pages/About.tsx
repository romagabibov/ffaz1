import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import GoldenNeedleBadge from '../components/GoldenNeedleBadge';
import { 
  Award, Compass, ShieldCheck, Globe2, Users, ArrowRight, Edit3, 
  Sparkles, Mail, Phone, MapPin, Landmark
} from 'lucide-react';
import { Link } from 'react-router';
import { LeaderMember, DEFAULT_LEADERS } from '../data/defaultLeaders';

export type { LeaderMember };

interface AboutData {
  title?: string;
  subtitle?: string;
  storyHtml?: string;
  mission?: string;
  centerTitle?: string;
  centerSubtitle?: string;
  centerManifestoHtml?: string;
  centerAddress?: string;
  centerPhone?: string;
  centerEmail?: string;
  stats?: {
    designersCount?: string;
    eventsCount?: string;
    institutionsCount?: string;
    communityCount?: string;
  };
  leaders?: LeaderMember[];
  contactEmail?: string;
  contactAddress?: string;
  contactPhone?: string;
}

export default function About() {
  const { t, i18n } = useTranslation();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'about' | 'center'>('about');
  const [data, setData] = useState<AboutData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAboutData = async () => {
      try {
        const docRef = doc(db, 'settings', 'about');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setData(snap.data() as AboutData);
        } else {
          const altSnap = await getDoc(doc(db, 'siteSettings', 'aboutUs'));
          if (altSnap.exists()) {
            setData(altSnap.data() as AboutData);
          }
        }
      } catch (err) {
        console.error('Error fetching about data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAboutData();
  }, []);

  const defaultTitle = t('about_page_title', 'AZ Fashion Hub & Azerbaijan Fashion Platform');
  const defaultSubtitle = t('about_page_subtitle', 'The premier ecosystem connecting designers, models, creative agencies, fashion academies, and audiences in Azerbaijan.');
  const defaultMission = t('about_mission_text', 'Our mission is to establish Baku as a global fashion destination, empower independent designers with modern digital tools, curate high-caliber runway events, and foster authentic creative collaboration.');

  const leadersList = data?.leaders && data.leaders.length > 0 ? data.leaders : DEFAULT_LEADERS;

  return (
    <div className="bg-brand-light min-h-screen pb-24 lg:pb-16 animate-in fade-in duration-500 text-brand-dark">
      
      {/* 1. MAGAZINE EDITORIAL HERO HEADER */}
      <section className="border-b border-brand-dark/[0.08] bg-brand-light pt-6 pb-6 sm:py-10 px-4 sm:px-8 md:px-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Top Folio Meta */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-brand-accent px-3 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15 font-mono">
                {t('official_platform', 'Official Platform')}
              </span>
              <GoldenNeedleBadge size="sm" showLabel />
            </div>

            {isAdmin && (
              <Link
                to={activeTab === 'center' ? "/admin?tab=about_us&section=center" : "/admin?tab=about_us&section=about"}
                className="bg-brand-accent text-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-brand-dark transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Edit3 size={13} />
                <span>
                  {activeTab === 'center' 
                    ? (i18n.language === 'az' ? 'Mərkəzi redaktə et' : 'Редактировать Центр в админке') 
                    : t('edit_in_admin', 'Edit in Admin Console')}
                </span>
              </Link>
            )}
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-normal tracking-tight text-brand-dark leading-[1.02] mb-3">
            {activeTab === 'about' 
              ? (data?.title || defaultTitle) 
              : (data?.centerTitle || (i18n.language === 'az' ? 'Azərbaycan Dəb Sənayesinin İnkişafı Mərkəzi' : 'Центр Развития Модной Индустрии Азербайджана'))
            }
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-brand-dark/70 max-w-3xl leading-relaxed font-normal">
            {activeTab === 'about'
              ? (data?.subtitle || defaultSubtitle)
              : (data?.centerSubtitle || (i18n.language === 'az' 
                  ? 'Azərbaycan modelyerlərinin, milli sənətkarlıq ənənələrinin və qlobal moda bazarına inteqrasiyanın dövlət və ictimai inkişaf mərkəzi.' 
                  : 'Официальный центр поддержки азербайджанских кутюрье, сохранения богатого национального ремесла и вывода отечественных брендов на международную арену.'))
            }
          </p>

          {/* ELEGANT PILL SWITCHER TABS */}
          <div className="mt-6 sm:mt-8 p-1 bg-brand-muted/60 rounded-full border border-brand-dark/[0.08] inline-flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full">
            <button
              onClick={() => setActiveTab('about')}
              className={`px-4 sm:px-6 py-2 rounded-full font-semibold uppercase tracking-wider text-xs transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                activeTab === 'about'
                  ? 'bg-brand-dark text-white shadow-2xs'
                  : 'text-brand-dark/70 hover:text-brand-dark'
              }`}
            >
              <Compass size={14} className={activeTab === 'about' ? 'text-brand-accent' : ''} />
              <span>{t('about_tab_main', 'О нас / About Platform')}</span>
            </button>

            <button
              onClick={() => setActiveTab('center')}
              className={`px-4 sm:px-6 py-2 rounded-full font-semibold uppercase tracking-wider text-xs transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                activeTab === 'center'
                  ? 'bg-brand-accent text-white shadow-2xs'
                  : 'text-brand-dark/70 hover:text-brand-dark'
              }`}
            >
              <Landmark size={14} />
              <span>{i18n.language === 'az' ? 'Dəb Mərkəzi' : 'Центр развития моды'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* TAB 1: ABOUT PLATFORM */}
      {activeTab === 'about' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 pt-8 sm:pt-12 animate-in fade-in duration-300">
          
          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10 sm:mb-14">
            <div className="rounded-2xl border border-brand-dark/[0.08] bg-white p-5 sm:p-6 shadow-2xs hover:border-brand-accent/30 transition-all">
              <div className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal text-brand-dark tracking-tight mb-1">
                {data?.stats?.designersCount || '55+'}
              </div>
              <div className="text-[10px] sm:text-[11px] font-mono font-semibold uppercase tracking-wider text-brand-dark/60">
                {t('resident_designers', 'Resident Designers')}
              </div>
            </div>

            <div className="rounded-2xl border border-brand-dark/[0.08] bg-white p-5 sm:p-6 shadow-2xs hover:border-brand-accent/30 transition-all">
              <div className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal text-brand-accent tracking-tight mb-1">
                {data?.stats?.eventsCount || '20+'}
              </div>
              <div className="text-[10px] sm:text-[11px] font-mono font-semibold uppercase tracking-wider text-brand-dark/60">
                {t('runway_events', 'Runway & Shows')}
              </div>
            </div>

            <div className="rounded-2xl border border-brand-dark/[0.08] bg-white p-5 sm:p-6 shadow-2xs hover:border-brand-accent/30 transition-all">
              <div className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal text-brand-dark tracking-tight mb-1">
                {data?.stats?.institutionsCount || '15+'}
              </div>
              <div className="text-[10px] sm:text-[11px] font-mono font-semibold uppercase tracking-wider text-brand-dark/60">
                {t('academies_schools', 'Academies & Schools')}
              </div>
            </div>

            <div className="rounded-2xl border border-brand-dark/[0.08] bg-white p-5 sm:p-6 shadow-2xs hover:border-brand-accent/30 transition-all">
              <div className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal text-brand-dark tracking-tight mb-1">
                {data?.stats?.communityCount || '10K+'}
              </div>
              <div className="text-[10px] sm:text-[11px] font-mono font-semibold uppercase tracking-wider text-brand-dark/60">
                {t('fashion_community', 'Fashion Community')}
              </div>
            </div>
          </div>

          {/* Story & Manifesto */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 mb-14">
            <div className="lg:col-span-8 space-y-8">
              <div className="rounded-3xl border border-brand-dark/[0.08] bg-white p-6 sm:p-10 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <Compass size={20} className="text-brand-accent" />
                  <span className="text-[10px] sm:text-xs font-mono font-semibold uppercase tracking-widest text-brand-dark/50">
                    PHILOSOPHY & VISION
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-normal tracking-tight text-brand-dark mb-6">
                  {t('our_story_title', 'Our Vision & Purpose')}
                </h2>

                {data?.storyHtml ? (
                  <div 
                    className="prose prose-brand max-w-none text-brand-dark/85 font-normal leading-relaxed text-sm sm:text-base"
                    dangerouslySetInnerHTML={{ __html: data.storyHtml }} 
                  />
                ) : (
                  <div className="space-y-4 text-brand-dark/80 font-normal text-sm sm:text-base leading-relaxed">
                    <p>
                      {t('about_p1', 'Azerbaijan Fashion Future is the central digital hub and official cultural catalyst for contemporary fashion in Azerbaijan. We bridge the rich heritage of Azerbaijani craftsmanship, silk weaving, and carpet art with modern avant-garde design, high-tech textiles, and international runway standards.')}
                    </p>
                    <p>
                      {t('about_p2', 'Our platform brings together established couturiers (such as Rufat Ismayil, Afffair, Uventa, Scandar, and Menzer Hajiyeva) with emerging talents, modeling agencies, educational academies, and fashion enthusiasts worldwide.')}
                    </p>
                    <p>
                      {t('about_p3', 'Through our interactive community feed, verified designer profiles with the prestigious Golden Needle (Qızıl İynə) badge, and direct messaging channels, we foster real-time creative collaborations, career opportunities, and direct commercial relationships.')}
                    </p>
                  </div>
                )}
              </div>

              {/* Mission Box (Editorial Luxury Noir Panel) */}
              <div className="rounded-3xl bg-[#141010] text-white p-6 sm:p-10 border border-brand-dark/20 shadow-md relative overflow-hidden">
                <div className="flex items-center gap-2.5 mb-3 text-brand-accent">
                  <Award size={20} />
                  <span className="text-[10px] sm:text-xs font-mono font-semibold uppercase tracking-widest text-white/70">
                    PRIMARY MANDATE
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-white mb-3">
                  {t('mission_statement', 'Our Core Mission')}
                </h3>
                <p className="text-sm sm:text-base text-white/80 leading-relaxed font-normal">
                  {data?.mission || defaultMission}
                </p>
              </div>
            </div>

            {/* Sidebar Pillars & Contact */}
            <div className="lg:col-span-4 space-y-6 sm:space-y-8">
              {/* Pillars */}
              <div className="rounded-3xl border border-brand-dark/[0.08] bg-white p-6 sm:p-7 shadow-xs">
                <h3 className="text-base font-serif font-normal uppercase tracking-wider text-brand-dark mb-5 border-b border-brand-dark/[0.08] pb-3">
                  {t('platform_pillars', 'Key Pillars')}
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-brand-accent/5 border border-brand-accent/15 flex items-center justify-center text-brand-accent shrink-0 mt-0.5">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <strong className="block font-display font-semibold text-xs uppercase tracking-wide text-brand-dark">
                        {t('pillar_verified', 'Verified Profiles')}
                      </strong>
                      <span className="text-xs text-brand-dark/65 font-normal leading-normal">
                        {t('pillar_verified_desc', 'Golden Needle accreditation for official designers & brands.')}
                      </span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-brand-accent/5 border border-brand-accent/15 flex items-center justify-center text-brand-accent shrink-0 mt-0.5">
                      <Globe2 size={16} />
                    </div>
                    <div>
                      <strong className="block font-display font-semibold text-xs uppercase tracking-wide text-brand-dark">
                        {t('pillar_global', 'Global Bridge')}
                      </strong>
                      <span className="text-xs text-brand-dark/65 font-normal leading-normal">
                        {t('pillar_global_desc', 'Connecting Baku with Milan, Paris, London, and New York fashion weeks.')}
                      </span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-brand-accent/5 border border-brand-accent/15 flex items-center justify-center text-brand-accent shrink-0 mt-0.5">
                      <Users size={16} />
                    </div>
                    <div>
                      <strong className="block font-display font-semibold text-xs uppercase tracking-wide text-brand-dark">
                        {t('pillar_direct', 'Direct Connection')}
                      </strong>
                      <span className="text-xs text-brand-dark/65 font-normal leading-normal">
                        {t('pillar_direct_desc', 'Direct messaging with resident couturiers and agency casting directors.')}
                      </span>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Contact Box */}
              <div className="rounded-3xl border border-brand-dark/[0.08] bg-white p-6 sm:p-7 shadow-xs">
                <h3 className="text-base font-serif font-normal uppercase tracking-wider text-brand-dark mb-4 border-b border-brand-dark/[0.08] pb-3">
                  {t('contact_partnership', 'Contact & Partnerships')}
                </h3>
                <div className="space-y-3.5 text-xs text-brand-dark font-normal">
                  <div>
                    <span className="text-brand-dark/45 uppercase tracking-widest block font-mono text-[10px] mb-0.5">{t('email', 'Email')}</span>
                    <a href={`mailto:${data?.contactEmail || 'press@azfashionevents.com'}`} className="hover:text-brand-accent transition-colors font-mono text-xs underline">
                      {data?.contactEmail || 'press@azfashionevents.com'}
                    </a>
                  </div>
                  <div>
                    <span className="text-brand-dark/45 uppercase tracking-widest block font-mono text-[10px] mb-0.5">{t('location', 'Location')}</span>
                    <span className="text-brand-dark/80">{data?.contactAddress || 'Baku, Azerbaijan • Heydar Aliyev Centre & Nizami Str.'}</span>
                  </div>
                  <div>
                    <span className="text-brand-dark/45 uppercase tracking-widest block font-mono text-[10px] mb-0.5">{t('phone', 'Phone')}</span>
                    <span className="font-mono text-brand-dark/80">{data?.contactPhone || '+994 (12) 598-0000'}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-brand-dark/[0.06] flex flex-col gap-2">
                  <Link
                    to="/designers"
                    className="bg-brand-accent text-white text-center py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-brand-dark transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <span>{t('explore_designers', 'Explore Designers')}</span>
                    <ArrowRight size={13} />
                  </Link>
                  <Link
                    to="/events"
                    className="border border-brand-dark/15 text-center py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider text-brand-dark hover:border-brand-accent hover:text-brand-accent transition-colors shadow-2xs"
                  >
                    {t('view_calendar', 'View Event Calendar')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ЦЕНТР РАЗВИТИЯ МОДНОЙ ИНДУСТРИИ АЗЕРБАЙДЖАНА */}
      {activeTab === 'center' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 pt-8 sm:pt-12 animate-in fade-in duration-300">
          
          {/* Manifesto & Purpose */}
          <div className="rounded-3xl border border-brand-dark/[0.08] bg-white p-6 sm:p-10 md:p-12 mb-12 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-brand-accent px-3 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15 font-mono">
                Official Entity
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono text-brand-dark/50 uppercase tracking-wider">
                • Azərbaycan Respublikası
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl md:text-5xl font-serif font-normal tracking-tight text-brand-dark mb-6">
              {i18n.language === 'az' 
                ? 'Mərkəzin Missiyası və Strateji Məqsədləri' 
                : 'Миссия и стратегические задачи Центра'}
            </h2>

            {data?.centerManifestoHtml ? (
              <div 
                className="prose prose-brand max-w-none text-brand-dark/85 font-normal leading-relaxed text-sm sm:text-base"
                dangerouslySetInnerHTML={{ __html: data.centerManifestoHtml }}
              />
            ) : (
              <div className="space-y-6 text-brand-dark/80 font-normal text-sm sm:text-base leading-relaxed">
                <p>
                  <strong className="text-brand-dark font-semibold">Центр Развития Модной Индустрии Азербайджана (Azərbaycan Dəb Sənayesinin İnkişafı Mərkəzi)</strong> создан как единый стратегический орган и институциональный мост, объединяющий независимых дизайнеров, дома моды, шелкоткацкие и текстильные мануфактуры, профильные университеты и государственные структуры.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-4">
                  <div className="rounded-2xl border border-brand-dark/[0.08] p-5 sm:p-6 bg-brand-muted/30 hover:bg-white transition-all shadow-2xs hover:border-brand-accent/30">
                    <div className="w-9 h-9 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center font-mono font-bold text-xs mb-3">
                      01
                    </div>
                    <h4 className="font-display font-bold text-sm uppercase tracking-wide text-brand-dark mb-1.5">
                      Глобальный экспорт
                    </h4>
                    <p className="text-xs text-brand-dark/70 font-normal leading-relaxed">
                      Организация участия азербайджанских брендов на неделях моды в Милане, Париже, Лондоне и Дубае с выходом на зарубежные байерские шоурумы.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-brand-dark/[0.08] p-5 sm:p-6 bg-brand-muted/30 hover:bg-white transition-all shadow-2xs hover:border-brand-accent/30">
                    <div className="w-9 h-9 rounded-xl bg-brand-dark text-white flex items-center justify-center font-mono font-bold text-xs mb-3">
                      02
                    </div>
                    <h4 className="font-display font-bold text-sm uppercase tracking-wide text-brand-dark mb-1.5">
                      Культурное наследие
                    </h4>
                    <p className="text-xs text-brand-dark/70 font-normal leading-relaxed">
                      Сохранение и интеграция шекинского шелка, келагаи, ковроткачества и традиционных орнаментов в современный кутюр и прет-а-порте.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-brand-dark/[0.08] p-5 sm:p-6 bg-brand-muted/30 hover:bg-white transition-all shadow-2xs hover:border-brand-accent/30">
                    <div className="w-9 h-9 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center font-mono font-bold text-xs mb-3">
                      03
                    </div>
                    <h4 className="font-display font-bold text-sm uppercase tracking-wide text-brand-dark mb-1.5">
                      Гранты и инкубация
                    </h4>
                    <p className="text-xs text-brand-dark/70 font-normal leading-relaxed">
                      Финансовые субсидии, мастер-классы с мировыми менторами и юридическая поддержка для молодых выпускников академий моды.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Leadership Team Section */}
          <div className="mb-14">
            <div className="flex items-center gap-3 mb-6 sm:mb-8 border-b border-brand-dark/[0.08] pb-4">
              <Users size={24} className="text-brand-accent" />
              <div>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-serif font-normal tracking-tight text-brand-dark">
                  {i18n.language === 'az' ? 'Mərkəzin Rəhbərliyi' : 'Руководство Центра'}
                </h3>
                <p className="text-xs font-mono uppercase tracking-widest text-brand-dark/50 mt-0.5">
                  Leadership Team & Direction Board
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {leadersList.map((leader) => {
                const role = i18n.language === 'az' ? leader.roleAz : i18n.language === 'en' ? leader.roleEn : leader.roleRu;
                const bio = i18n.language === 'az' ? leader.bioAz : i18n.language === 'en' ? leader.bioEn : leader.bioRu;

                return (
                  <div 
                    key={leader.id}
                    className="rounded-3xl border border-brand-dark/[0.08] bg-white overflow-hidden flex flex-col justify-between transition-all group hover:border-brand-accent/40 shadow-xs"
                  >
                    <div>
                      <div className="relative aspect-[4/5] overflow-hidden bg-brand-muted">
                        <img 
                          src={leader.photoUrl} 
                          alt={leader.name}
                          className="w-full h-full object-cover grayscale-[15%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                          crossOrigin="anonymous"
                        />
                        <div className="absolute top-3 left-3 bg-brand-dark/85 backdrop-blur-md text-white font-mono text-[9px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Leadership
                        </div>
                      </div>

                      <div className="p-6">
                        <h4 className="text-xl sm:text-2xl font-serif font-normal text-brand-dark group-hover:text-brand-accent transition-colors mb-1">
                          {leader.name}
                        </h4>
                        <p className="text-xs font-mono text-brand-accent uppercase tracking-wider mb-3 font-semibold pb-2 border-b border-brand-dark/[0.06]">
                          {role}
                        </p>
                        <p className="text-xs sm:text-sm font-normal text-brand-dark/75 leading-relaxed">
                          {bio}
                        </p>
                      </div>
                    </div>

                    {leader.email && (
                      <div className="p-6 pt-0 mt-auto">
                        <a 
                          href={`mailto:${leader.email}`}
                          className="inline-flex items-center gap-1.5 text-xs font-mono text-brand-dark/70 hover:text-brand-accent transition-colors underline"
                        >
                          <Mail size={13} />
                          <span>{leader.email}</span>
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Official Center Headquarters Box */}
          <div className="rounded-3xl bg-[#141010] text-white p-8 sm:p-10 border border-brand-dark/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md mb-8">
            <div>
              <div className="flex items-center gap-2 text-brand-accent font-mono text-xs uppercase tracking-widest mb-2 font-semibold">
                <MapPin size={15} />
                <span>Qərargah / Штаб-квартира</span>
              </div>
              <h4 className="text-xl sm:text-2xl md:text-3xl font-serif font-normal tracking-tight text-white mb-2">
                {data?.centerAddress || 'Bakı Şəhəri, Nizami küç. 44 / Heydər Əliyev Mərkəzi'}
              </h4>
              <p className="text-xs sm:text-sm text-white/70 font-normal">
                Telefon: {data?.centerPhone || '+994 (12) 598-2026'} • Email: {data?.centerEmail || 'official@fashiondevelopment.az'}
              </p>
            </div>

            <Link
              to="/careers"
              className="bg-brand-accent text-white px-7 py-3 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-white hover:text-brand-dark transition-all shadow-sm shrink-0"
            >
              Сотрудничество & Вакансии
            </Link>
          </div>

        </div>
      )}
    </div>
  );
}
