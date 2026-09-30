import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Calendar, Share2, X, Sparkles, ExternalLink, 
  Check, ArrowRight, Eye, Newspaper, Clock, Images, Film
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { NewsArticleMediaGallery } from '../components/NewsArticleMediaGallery';

export function createNewsSlug(title: string): string {
  if (!title) return '';
  
  // Transliteration map for Cyrillic and Azerbaijani/Turkish characters
  const charMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
    'я': 'ya',
    // Azerbaijani & Turkish
    'ə': 'e', 'ç': 'ch', 'ğ': 'gh', 'ı': 'i', 'ö': 'o', 'ş': 'sh', 'ü': 'u'
  };

  let str = title.toLowerCase().trim();
  
  // Replace mapped characters
  str = str.split('').map(char => charMap[char] || char).join('');
  
  // Replace any non-alphanumeric characters with hyphens
  str = str
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return str || 'article';
}

export function getNewsSlug(article: any): string {
  if (!article) return '';
  if (article.slug && typeof article.slug === 'string' && article.slug.trim()) {
    return article.slug.trim();
  }
  if (article.title) {
    return createNewsSlug(article.title);
  }
  return article.id;
}

export default function News() {
  const { id: routeNewsId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const findArticle = (list: any[], param: string) => {
    if (!param) return null;
    const decoded = decodeURIComponent(param).toLowerCase().trim();
    
    return list.find(item => {
      if (item.id === param || item.id === decoded) return true;
      if (item.slug && item.slug.toLowerCase().trim() === decoded) return true;
      if (item.title) {
        const generatedSlug = createNewsSlug(item.title);
        if (generatedSlug === decoded) return true;
        if (item.title.toLowerCase().trim() === decoded) return true;
      }
      return false;
    }) || null;
  };

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
        const qs = await getDocs(q);
        const fetchedNews = qs.docs.map(d => ({ id: d.id, ...d.data() }));
        setNews(fetchedNews);

        // If route has an identifier, match article by slug/title/id
        if (routeNewsId) {
          const found = findArticle(fetchedNews, routeNewsId);
          if (found) {
            setSelectedArticle(found);
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'news');
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  // Update selected article if URL route param changes
  useEffect(() => {
    if (news.length > 0 && routeNewsId) {
      const found = findArticle(news, routeNewsId);
      if (found) {
        setSelectedArticle(found);
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    } else if (!routeNewsId && selectedArticle) {
      setSelectedArticle(null);
    }
  }, [routeNewsId, news]);

  // Handle escape key to close open article
  useEffect(() => {
    if (selectedArticle) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeArticle();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [selectedArticle]);

  const openArticle = (item: any) => {
    setSelectedArticle(item);
    const slug = getNewsSlug(item);
    navigate(`/news/${slug}`, { replace: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeArticle = () => {
    setSelectedArticle(null);
    navigate('/news', { replace: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShare = async (item: any) => {
    const slug = getNewsSlug(item);
    const url = `${window.location.origin}/news/${slug}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t('link_copied', 'Ссылка на новость скопирована!'));
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const formatDate = (item: any) => {
    if (!item) return '';
    try {
      if (item.createdAt?.toMillis) {
        return format(item.createdAt.toMillis(), 'dd MMMM yyyy');
      }
      if (item.date) {
        return format(new Date(item.date), 'dd MMMM yyyy');
      }
    } catch {
      return '';
    }
    return '';
  };

  return (
    <div className="bg-brand-light min-h-screen pb-16">
      <AnimatePresence mode="wait">
        {selectedArticle ? (
          /* =========================================================================
             ARTICLE DETAIL VIEW (Header always remains visible and sticky at the top)
             ========================================================================= */
          <motion.article 
            key={`article-${selectedArticle.id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex flex-col bg-brand-light"
          >
            {/* Sub-Header Navigation Bar below main Header */}
            <div className="sticky top-[68px] z-40 bg-white/95 backdrop-blur-md border-b border-brand-dark/[0.08] px-4 sm:px-8 py-3 flex items-center justify-between gap-4 shrink-0 shadow-2xs">
              <button
                onClick={closeArticle}
                className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-brand-dark hover:text-brand-accent transition-colors group cursor-pointer"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                <span>{t('back_to_news', 'Назад к новостям')}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleShare(selectedArticle)}
                  className="h-8.5 px-3 rounded-full border border-brand-dark/[0.12] bg-white font-mono text-xs font-semibold uppercase tracking-wider text-brand-dark hover:bg-brand-dark hover:text-white transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  {copied ? <Check size={13} className="text-green-600" /> : <Share2 size={13} />}
                  <span className="hidden sm:inline">{copied ? t('copied', 'Скопировано!') : t('share', 'Поделиться')}</span>
                </button>

                <button
                  onClick={closeArticle}
                  className="h-8.5 w-8.5 rounded-full border border-brand-dark/[0.12] bg-white text-brand-dark hover:bg-brand-accent hover:text-white transition-all flex items-center justify-center shadow-2xs cursor-pointer"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Article Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-8 md:px-12 py-8 sm:py-12 space-y-6 sm:space-y-8 w-full">
              {/* Meta & Date */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-brand-accent text-white font-mono text-[10px] font-semibold uppercase tracking-widest px-3 py-0.5 rounded-full">
                  AZ/FSHN JOURNAL
                </span>
                {formatDate(selectedArticle) && (
                  <div className="flex items-center gap-1.5 font-mono text-xs uppercase text-brand-dark/70">
                    <Calendar size={13} className="text-brand-accent" />
                    <span>{formatDate(selectedArticle)}</span>
                  </div>
                )}
              </div>

              {/* Article Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-normal tracking-tight text-brand-dark leading-[1.05] break-words">
                {selectedArticle.title}
              </h1>

              {/* Hero Image / Video Media / Carousel (up to 35 photos & 5 videos) */}
              <NewsArticleMediaGallery
                images={selectedArticle.images || (selectedArticle.imageUrl ? [selectedArticle.imageUrl] : [])}
                videos={selectedArticle.videos || (selectedArticle.videoUrl ? [selectedArticle.videoUrl] : [])}
                coverImageUrl={selectedArticle.imageUrl}
                videoUrl={selectedArticle.videoUrl}
                title={selectedArticle.title}
                mediaLayout={selectedArticle.mediaLayout || 'hero_carousel'}
              />

              {/* Main Text Content */}
              <div className="prose prose-base sm:prose-lg max-w-none text-brand-dark font-sans leading-relaxed break-words
                prose-headings:font-serif prose-headings:font-normal prose-headings:tracking-tight
                prose-p:mb-6 prose-p:leading-relaxed prose-p:text-brand-dark/85
                prose-a:text-brand-accent prose-a:underline hover:prose-a:text-brand-dark
                prose-img:rounded-xl prose-img:border prose-img:border-brand-dark/[0.08]
                prose-blockquote:border-l-2 prose-blockquote:border-brand-accent prose-blockquote:bg-brand-muted/40 prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:font-serif prose-blockquote:italic
                prose-ul:list-disc prose-ol:list-decimal
                [&_.news-media-block]:clear-both [&_.news-media-block.news-align-left]:float-none sm:[&_.news-media-block.news-align-left]:float-left sm:[&_.news-media-block.news-align-left]:mr-6 sm:[&_.news-media-block.news-align-left]:mb-4
                [&_.news-media-block.news-align-right]:float-none sm:[&_.news-media-block.news-align-right]:float-right sm:[&_.news-media-block.news-align-right]:ml-6 sm:[&_.news-media-block.news-align-right]:mb-4
                [&_.news-media-block.news-align-center]:mx-auto [&_.news-media-block.news-align-center]:text-center
                [&_.news-gallery-grid]:clear-both [&_.news-video-block]:clear-both"
              >
                <div 
                  dangerouslySetInnerHTML={{ __html: selectedArticle.content || selectedArticle.bio || '' }} 
                />
              </div>

              {/* Source or External Links if available */}
              {selectedArticle.sourceUrl && (
                <div className="pt-6 border-t border-brand-dark/[0.08] flex items-center justify-between flex-wrap gap-4">
                  <span className="font-mono text-xs uppercase text-brand-dark/60">
                    {t('source', 'Источник')}:
                  </span>
                  <a
                    href={selectedArticle.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-xs sm:text-sm font-semibold uppercase text-brand-accent hover:underline max-w-full"
                  >
                    <span className="truncate max-w-[240px] xs:max-w-[280px] sm:max-w-md break-all">{selectedArticle.sourceUrl}</span>
                    <ExternalLink size={13} className="shrink-0" />
                  </a>
                </div>
              )}

              {/* Read Also / Другие новости section */}
              {(() => {
                const relatedNews = news.filter(item => item.id !== selectedArticle.id).slice(0, 3);
                if (relatedNews.length === 0) return null;

                return (
                  <div className="pt-10 pb-16 border-t border-brand-dark/[0.08] mt-8">
                    <div className="flex items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-2">
                        <Newspaper size={18} className="text-brand-accent" />
                        <h3 className="font-serif font-normal text-xl sm:text-2xl tracking-tight text-brand-dark">
                          {t('read_also', 'Читать также')}
                        </h3>
                      </div>
                      <button
                        onClick={closeArticle}
                        className="font-mono text-xs font-semibold uppercase tracking-wider text-brand-dark/70 hover:text-brand-accent transition-colors cursor-pointer"
                      >
                        {t('view_all_news', 'Все новости →')}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                      {relatedNews.map(rel => {
                        const relDate = formatDate(rel);
                        return (
                          <div
                            key={rel.id}
                            onClick={() => openArticle(rel)}
                            className="group cursor-pointer rounded-2xl border border-brand-dark/[0.08] bg-white overflow-hidden flex flex-col h-full hover:shadow-xs hover:border-brand-accent/30 transition-all duration-200"
                          >
                            {rel.imageUrl ? (
                              <div className="aspect-[16/10] bg-brand-muted overflow-hidden relative">
                                <img
                                  src={rel.imageUrl}
                                  alt={rel.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                              </div>
                            ) : (
                              <div className="h-28 bg-brand-muted/50 flex items-center justify-center p-4">
                                <Newspaper size={24} className="text-brand-dark/30" />
                              </div>
                            )}

                            <div className="p-4 flex-grow flex flex-col justify-between">
                              <div>
                                {relDate && (
                                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-brand-dark/55 mb-2">
                                    <Calendar size={11} className="text-brand-accent" />
                                    <span>{relDate}</span>
                                  </div>
                                )}
                                <h4 className="text-sm font-serif font-normal tracking-tight text-brand-dark line-clamp-2 group-hover:text-brand-accent transition-colors leading-snug">
                                  {rel.title}
                                </h4>
                              </div>

                              <div className="pt-3 mt-3 border-t border-brand-dark/[0.06] flex items-center justify-between text-brand-accent font-semibold text-[11px] uppercase tracking-wider">
                                <span>{t('read_more', 'Читать')}</span>
                                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </motion.article>
        ) : (
          /* =========================================================================
             NEWS GRID & HERO ARCHIVE VIEW
             ========================================================================= */
          <motion.div
            key="news-grid-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* 1. MAGAZINE EDITORIAL HERO HEADER */}
            <section className="border-b border-brand-dark/[0.08] bg-brand-light pt-6 pb-6 sm:py-10 px-4 sm:px-8 relative overflow-hidden shrink-0">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
                <div>
                  <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-normal tracking-tight text-brand-dark leading-[1.02]">
                    {i18n.language === 'az' ? 'Dəb Xəbərləri' : i18n.language === 'en' ? 'Fashion News' : 'Новости моды'}
                  </h1>
                  <p className="text-xs sm:text-sm text-brand-dark/65 mt-1.5 max-w-xl font-normal leading-relaxed">
                    Эксклюзивные репортажи, премьеры коллекций, кутюрные хроники Баку и ключевые события индустрии.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] sm:text-[11px] font-mono uppercase text-brand-dark/50 tracking-wider">
                    Issue No. 2026 • Live Archive
                  </span>
                </div>
              </div>
            </section>

            {/* 2. NEWS GRID CONTAINER */}
            <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 py-8 sm:py-12">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <div className="w-8 h-8 border-3 border-brand-dark/20 border-t-brand-accent rounded-full animate-spin" />
                  <span className="font-mono text-xs font-semibold uppercase tracking-widest text-brand-dark/60">
                    {t('loading_news', 'Loading dispatches...')}
                  </span>
                </div>
              ) : news.length === 0 ? (
                <div className="text-center font-mono text-xs uppercase tracking-widest text-brand-dark/50 py-24 border border-dashed border-brand-dark/15 rounded-3xl p-8 bg-white">
                  {t('no_news_available', 'No news articles published yet.')}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {news.map(item => {
                    const formattedDate = formatDate(item);
                    return (
                      <article 
                        key={item.id} 
                        className="group rounded-2xl border border-brand-dark/[0.08] bg-white overflow-hidden flex flex-col h-full shadow-2xs hover:shadow-md hover:border-brand-accent/30 transition-all duration-300"
                      >
                        {/* Thumbnail */}
                        {item.imageUrl ? (
                          <div 
                            onClick={() => openArticle(item)}
                            className="aspect-[16/10] bg-brand-muted overflow-hidden relative cursor-pointer"
                          >
                            <img 
                              src={item.imageUrl} 
                              alt={item.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" 
                            />
                            {/* Badges for photo count and video */}
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                              {Array.isArray(item.images) && item.images.length > 1 && (
                                <span className="bg-brand-dark/85 backdrop-blur-sm text-white font-mono text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border border-white/20 flex items-center gap-1 shadow-2xs">
                                  <Images size={10} className="text-brand-accent" />
                                  <span>{item.images.length}</span>
                                </span>
                              )}
                              {((Array.isArray(item.videos) && item.videos.length > 0) || item.videoUrl) && (
                                <span className="bg-brand-accent text-white font-mono text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                  <Film size={10} />
                                  <span>{Array.isArray(item.videos) ? item.videos.length : 1}</span>
                                </span>
                              )}
                            </div>
                            <div className="absolute inset-0 bg-brand-dark/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="bg-brand-dark/90 backdrop-blur-sm text-white font-mono text-xs font-semibold uppercase px-3.5 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5 shadow-sm">
                                <Eye size={13} />
                                {t('read_article', 'Читать')}
                              </span>
                            </div>
                          </div>
                        ) : item.videoUrl ? (
                          <div className="aspect-[16/10] bg-brand-dark flex items-center justify-center">
                            <iframe 
                              src={item.videoUrl.replace('watch?v=', 'embed/')} 
                              className="w-full h-full" 
                              title={item.title}
                              allowFullScreen
                            />
                          </div>
                        ) : null}

                        {/* Body */}
                        <div className="p-5 sm:p-6 flex-grow flex flex-col justify-between">
                          <div>
                            {formattedDate && (
                              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-brand-dark/55 mb-2.5">
                                <Calendar size={12} className="text-brand-accent" />
                                <span>{formattedDate}</span>
                              </div>
                            )}
                            <h2 
                              onClick={() => openArticle(item)}
                              className="text-lg sm:text-xl font-serif font-normal tracking-tight text-brand-dark mb-2.5 break-words group-hover:text-brand-accent cursor-pointer transition-colors leading-snug"
                            >
                              {item.title}
                            </h2>
                            {item.content && (
                              <div 
                                className="text-xs sm:text-sm text-brand-dark/70 line-clamp-3 leading-relaxed font-normal mb-4"
                                dangerouslySetInnerHTML={{ __html: item.content.replace(/<[^>]*>?/gm, ' ') }}
                              />
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-4 border-t border-brand-dark/[0.08] mt-auto">
                            <button 
                              onClick={() => openArticle(item)} 
                              className="inline-flex items-center gap-1.5 text-brand-accent font-semibold uppercase tracking-wider text-xs hover:text-brand-dark transition-colors group-hover:translate-x-0.5 cursor-pointer"
                            >
                              <span>{t('read_full', 'Читать далее')}</span>
                              <ArrowRight size={13} />
                            </button>

                            <button
                              onClick={() => handleShare(item)}
                              title={t('share', 'Поделиться')}
                              className="p-2 text-brand-dark/50 hover:text-brand-dark hover:bg-brand-muted/60 rounded-full transition-all cursor-pointer"
                            >
                              <Share2 size={14} />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
