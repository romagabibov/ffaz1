import { useUI } from '../context/UIContext';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  deleteDoc,
  getDoc,
  getDocs,
  where,
  limit
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { apiFetch } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Heart,
  MessageCircle,
  Send,
  Trash2,
  Image,
  Sparkles,
  Share2,
  Flame,
  Pin,
  Clock,
  Users,
  Crown,
  Globe,
  Lock,
  ArrowUp,
  Hash,
  Check,
  Radio,
  Tag,
  TrendingUp,
  Images,
  Plus,
  Loader2,
  AlertCircle,
  Video,
  Film,
  Link2,
  X,
  ArrowRight
} from 'lucide-react';
import { uploadMediaFile } from '../lib/upload';
import { getTimestampMillis } from '../lib/dateUtils';
import { moderateContent } from '../lib/moderation';
import { createNotification } from '../lib/notificationService';
import GoldenNeedleBadge from '../components/GoldenNeedleBadge';
import SilverNeedleBadge from '../components/SilverNeedleBadge';
import ModelVerifiedBadge from '../components/ModelVerifiedBadge';
import AgencyBadge from '../components/AgencyBadge';
import FeedLiveChat from '../components/FeedLiveChat';
import FeedPostGallery from '../components/FeedPostGallery';
import FeedPostVideoPlayer from '../components/FeedPostVideoPlayer';

interface PostPhotoItem {
  id: string;
  localPreviewUrl: string;
  remoteUrl?: string;
  status: 'optimizing' | 'uploading' | 'ready' | 'error';
  progress: number;
  stageLabel: string;
  file: File;
}

type RealmType = 'public' | 'pro';
type SubFeedType = 'for_you' | 'following' | 'trending' | 'recent';
type TrendTimeframe = 'day' | 'week' | 'month';

interface AnalyzedTopic {
  tag: string;
  count: number;
  score: number;
  isHot: boolean;
  momentumLabel: string;
  engagement: number;
}

const MOOD_TAGS = ['#OOTD', '#Backstage', '#Couture', '#DesignDrop', '#Casting', '#TrendTalk', '#Collab'];

export default function Feed() {
  const ui = useUI();
  const { t } = useTranslation();
  const { currentUser, dbUser, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Top Realm: Public vs Pro Lounge
  const [realm, setRealm] = useState<RealmType>('public');

  // Threads Sub-Feed Stream
  const [subFeed, setSubFeed] = useState<SubFeedType>('for_you');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [trendTimeframe, setTrendTimeframe] = useState<TrendTimeframe>('day');
  const [rawPosts, setRawPosts] = useState<any[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [postPhotos, setPostPhotos] = useState<PostPhotoItem[]>([]);
  const MAX_POST_PHOTOS = 5;
  const [postVideoUrl, setPostVideoUrl] = useState<string>('');
  const [videoUploadStatus, setVideoUploadStatus] = useState<'idle' | 'uploading' | 'ready' | 'error'>('idle');
  const [videoUploadProgress, setVideoUploadProgress] = useState<number>(0);
  const [videoLinkModalOpen, setVideoLinkModalOpen] = useState(false);
  const [videoInputUrl, setVideoInputUrl] = useState('');
  const [newPostTag, setNewPostTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [authorsInfo, setAuthorsInfo] = useState<Record<string, any>>({});
  const authorsCacheRef = useRef<Record<string, any>>({});

  // Live Chat drawer state
  const [isLiveChatOpen, setIsLiveChatOpen] = useState(false);
  // Pro Video Modal state
  const [showProVideoModal, setShowProVideoModal] = useState(false);
  // New Posts Pill Indicator
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [likedHeartEffect, setLikedHeartEffect] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const lastPostCountRef = useRef<number>(0);

  // Determine if user has Pro privileges
  const hasProAccess = useMemo(() => {
    if (isAdmin) return true;
    if (!dbUser) return false;
    const tier = dbUser.subscriptionTier;
    const isProTier = tier === 'pro' || tier === 'elite' || tier === 'business' || tier === 'creator';
    const isLinkedDesigner = Boolean(dbUser.isDesigner || dbUser.designerId);
    return isProTier || isLinkedDesigner;
  }, [dbUser, isAdmin]);

  // Load Feed Posts Real-Time (Limit 100 for comprehensive timeframe trend analysis)
  useEffect(() => {
    const q = query(collection(db, 'feedPosts'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const postsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));

      if (lastPostCountRef.current > 0 && postsData.length > lastPostCountRef.current) {
        setHasNewPosts(true);
      }
      lastPostCountRef.current = postsData.length;

      setRawPosts(postsData);

      // Fetch user info for authors
      const missingUserIds: string[] = Array.from(
        new Set(
          postsData
            .map(p => String(p.userId || ''))
            .filter(uid => Boolean(uid) && !authorsCacheRef.current[uid])
        )
      );

      if (missingUserIds.length > 0) {
        await Promise.all(
          missingUserIds.map(async (uid: string) => {
            try {
              const udoc = await getDoc(doc(db, 'users', uid));
              if (udoc.exists()) {
                authorsCacheRef.current[uid] = udoc.data();
              }
            } catch (e) {
              console.warn('Error fetching user for post:', e);
            }
          })
        );
        setAuthorsInfo({ ...authorsCacheRef.current });
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch Current User Likes
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'feedLikes'), where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const likes = new Set<string>();
      snapshot.docs.forEach(d => {
        likes.add(d.data().postId);
      });
      setUserLikes(likes);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch comments for active post
  useEffect(() => {
    if (!selectedPost) return;
    const q = query(collection(db, 'feedComments'), where('postId', '==', selectedPost.id));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const commentsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      commentsData.sort((a, b) => getTimestampMillis(a.createdAt) - getTimestampMillis(b.createdAt));
      setComments(commentsData);

      // Fetch authors for comments
      const authors: Record<string, any> = { ...authorsInfo };
      for (const c of commentsData) {
        if (!authors[c.userId] && !authorsCacheRef.current[c.userId]) {
          try {
            const udoc = await getDoc(doc(db, 'users', c.userId));
            if (udoc.exists()) {
              authorsCacheRef.current[c.userId] = udoc.data();
              authors[c.userId] = udoc.data();
            }
          } catch (e) {
            console.error('Error fetching comment user:', e);
          }
        }
      }
      setAuthorsInfo({ ...authorsCacheRef.current });
    });

    return () => unsubscribe();
  }, [selectedPost]);

  // -------------------------------------------------------------
  // SYSTEM TOPIC RELEVANCE ANALYSIS ENGINE (Day / Week / Month)
  // -------------------------------------------------------------
  const analyzedTopics = useMemo<AnalyzedTopic[]>(() => {
    const now = Date.now();
    const windowMs =
      trendTimeframe === 'day'
        ? 24 * 60 * 60 * 1000
        : trendTimeframe === 'week'
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;

    // Filter posts for the selected realm (public vs pro)
    const realmPosts = rawPosts.filter(p => (realm === 'pro' ? p.isClosed === true : !p.isClosed));
    const activePosts = realmPosts.length > 0 ? realmPosts : rawPosts;

    const statsMap: Record<
      string,
      { count: number; likes: number; comments: number; recentMentions: number; tagDisplay: string }
    > = {};

    const registerOccurrence = (rawTag: string, post: any, postTime: number) => {
      if (!rawTag) return;
      let clean = rawTag.trim();
      if (!clean.startsWith('#')) clean = `#${clean}`;
      if (clean.length < 2) return;

      const normKey = clean.toLowerCase();
      if (!statsMap[normKey]) {
        statsMap[normKey] = {
          count: 0,
          likes: 0,
          comments: 0,
          recentMentions: 0,
          tagDisplay: clean
        };
      }

      statsMap[normKey].count += 1;
      statsMap[normKey].likes += Number(post.likesCount || 0);
      statsMap[normKey].comments += Number(post.commentsCount || 0);

      // Check if inside the recent 40% window (velocity spike)
      const age = now - postTime;
      if (age >= 0 && age <= windowMs * 0.4) {
        statsMap[normKey].recentMentions += 1;
      }
    };

    activePosts.forEach(post => {
      const postTime = getTimestampMillis(post.createdAt) || now;
      const age = now - postTime;

      // Inside timeframe window gets full weight; outside gets temporal decay factor
      const isInWindow = age <= windowMs;
      const weight = isInWindow ? 1 : Math.max(0.05, 1 - age / (30 * 24 * 60 * 60 * 1000));

      if (weight > 0.1) {
        if (post.tag) {
          registerOccurrence(post.tag, post, postTime);
        }

        if (post.content) {
          // Extract hashtags like #Couture, #BakuFashionWeek, etc.
          const foundHashtags = post.content.match(/#[\p{L}\p{N}_]+/gu);
          if (foundHashtags) {
            foundHashtags.forEach((t: string) => registerOccurrence(t, post, postTime));
          }

          // Semantic fashion keyword recognition
          const FASHION_KEYWORDS: Array<{ word: string; tag: string }> = [
            { word: 'couture', tag: '#Couture' },
            { word: 'backstage', tag: '#Backstage' },
            { word: 'runway', tag: '#Runway' },
            { word: 'baku fashion', tag: '#BakuFashionWeek' },
            { word: 'fashion week', tag: '#BakuFashionWeek' },
            { word: 'silk', tag: '#EcoSilk' },
            { word: 'casting', tag: '#Casting' },
            { word: 'trendtalk', tag: '#TrendTalk' },
            { word: 'designdrop', tag: '#DesignDrop' },
            { word: 'ootd', tag: '#OOTD' },
            { word: 'collab', tag: '#Collab' },
            { word: 'karabakh', tag: '#KarabakhSilk' },
            { word: 'atelier', tag: '#Atelier' },
            { word: 'vintage', tag: '#Vintage' },
            { word: 'sustainable', tag: '#EcoFashion' }
          ];

          const contentLower = post.content.toLowerCase();
          FASHION_KEYWORDS.forEach(kw => {
            if (contentLower.includes(kw.word)) {
              registerOccurrence(kw.tag, post, postTime);
            }
          });
        }
      }
    });

    // Baseline topics calibrated for fashion ecosystem across day/week/month
    const BASELINE_TOPICS: Array<{
      tag: string;
      baseScore: { day: number; week: number; month: number };
      momentum: { day: string; week: string; month: string };
    }> = [
      {
        tag: '#BakuFashionWeek',
        baseScore: { day: 65, week: 85, month: 120 },
        momentum: { day: '🔥 Hot', week: '🔥 Top 1', month: '🔥 +64%' }
      },
      {
        tag: '#Couture',
        baseScore: { day: 50, week: 75, month: 110 },
        momentum: { day: '⚡ +38%', week: '⚡ +52%', month: '+45%' }
      },
      {
        tag: '#Backstage',
        baseScore: { day: 45, week: 60, month: 90 },
        momentum: { day: '⚡ Rising', week: '+29%', month: '+32%' }
      },
      {
        tag: '#TrendTalk',
        baseScore: { day: 40, week: 55, month: 85 },
        momentum: { day: '+24%', week: '+35%', month: '+28%' }
      },
      {
        tag: '#DesignDrop',
        baseScore: { day: 38, week: 50, month: 80 },
        momentum: { day: '⚡ New', week: '+22%', month: '+30%' }
      },
      {
        tag: '#Casting',
        baseScore: { day: 30, week: 42, month: 65 },
        momentum: { day: 'Urgent', week: '⚡ Active', month: '+18%' }
      },
      {
        tag: '#OOTD',
        baseScore: { day: 25, week: 38, month: 60 },
        momentum: { day: '+15%', week: '+20%', month: '+25%' }
      },
      {
        tag: '#EcoSilk',
        baseScore: { day: 20, week: 35, month: 55 },
        momentum: { day: 'Trend', week: '+18%', month: '+22%' }
      },
      {
        tag: '#Collab',
        baseScore: { day: 18, week: 30, month: 50 },
        momentum: { day: 'Connect', week: '+14%', month: '+19%' }
      }
    ];

    const results: AnalyzedTopic[] = Object.entries(statsMap).map(([, stat]) => {
      const engagement = stat.likes * 2 + stat.comments * 3.5;
      const velocity = stat.count > 0 ? stat.recentMentions / stat.count : 0;
      const timeframeVelocityWeight = trendTimeframe === 'day' ? 35 : trendTimeframe === 'week' ? 25 : 15;
      const score = stat.count * 25 + engagement * 2.0 + stat.recentMentions * timeframeVelocityWeight;

      const isHot = score > 50 || stat.recentMentions >= 2;
      const momentumLabel = isHot
        ? '🔥 Hot'
        : stat.recentMentions > 0
        ? `⚡ +${Math.round(20 + velocity * 50)}%`
        : `${stat.count} posts`;

      return {
        tag: stat.tagDisplay,
        count: stat.count,
        score,
        engagement,
        isHot,
        momentumLabel
      };
    });

    // Merge baseline topics
    BASELINE_TOPICS.forEach(base => {
      const existing = results.find(r => r.tag.toLowerCase() === base.tag.toLowerCase());
      const basePoints = base.baseScore[trendTimeframe];
      const baseMom = base.momentum[trendTimeframe];

      if (existing) {
        existing.score += basePoints;
        if (existing.score >= 80) existing.isHot = true;
        if (!existing.momentumLabel || existing.momentumLabel.includes('0 posts')) {
          existing.momentumLabel = baseMom;
        }
      } else {
        results.push({
          tag: base.tag,
          count: 0,
          score: basePoints,
          engagement: 0,
          isHot: base.tag === '#BakuFashionWeek' || (trendTimeframe === 'month' && base.tag === '#Couture'),
          momentumLabel: baseMom
        });
      }
    });

    results.sort((a, b) => b.score - a.score);
    return results;
  }, [rawPosts, realm, trendTimeframe]);

  // -------------------------------------------------------------
  // THREADS ALGORITHMIC SCORING ENGINE ("For You" Algorithm)
  // -------------------------------------------------------------
  const rankedPosts = useMemo(() => {
    // 1. Filter by Realm (Public vs Pro Lounge)
    let filtered = rawPosts.filter(p => {
      if (realm === 'pro') return p.isClosed === true;
      return !p.isClosed;
    });

    // 2. Filter by Tag if active
    if (selectedTagFilter) {
      const targetLower = selectedTagFilter.toLowerCase().trim();
      const bareFilter = targetLower.replace(/^#/, '');
      filtered = filtered.filter(p => {
        const postTag = (p.tag || '').toLowerCase().trim();
        const postContent = (p.content || '').toLowerCase();
        return (
          postTag === targetLower ||
          postTag.replace(/^#/, '') === bareFilter ||
          postContent.includes(targetLower) ||
          postContent.includes(`#${bareFilter}`)
        );
      });
    }

    const now = Date.now();
    const userFollowing = new Set<string>(dbUser?.following || []);

    // 3. Apply Sub-Feed Logic
    if (subFeed === 'following') {
      if (!currentUser) return [];
      return filtered.filter(p => userFollowing.has(p.userId) || p.userId === currentUser.uid);
    }

    if (subFeed === 'recent') {
      return [...filtered].sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
    }

    if (subFeed === 'trending') {
      return [...filtered].sort((a, b) => {
        // 1. Pinned or marked Top publications always rise to the very top
        const aPinned = Boolean(a.isTop || a.isPinned || a.pinned);
        const bPinned = Boolean(b.isTop || b.isPinned || b.pinned);
        if (aPinned !== bPinned) return bPinned ? 1 : -1;

        // 2. Exact likes and comments counts (safely handling number, array, or string)
        const aLikes = Number(a.likesCount ?? (Array.isArray(a.likes) ? a.likes.length : a.likes) ?? 0) || 0;
        const bLikes = Number(b.likesCount ?? (Array.isArray(b.likes) ? b.likes.length : b.likes) ?? 0) || 0;

        const aComments = Number(a.commentsCount ?? (Array.isArray(a.comments) ? a.comments.length : a.comments) ?? 0) || 0;
        const bComments = Number(b.commentsCount ?? (Array.isArray(b.comments) ? b.comments.length : b.comments) ?? 0) || 0;

        // 3. Creator reputation boost for verified designers, Golden Needle winners, brands & subscription tiers
        const aAuthor = authorsInfo[a.userId];
        const bAuthor = authorsInfo[b.userId];
        let aBoost = 0;
        let bBoost = 0;
        if (aAuthor?.hasGoldenNeedle) aBoost += 25;
        if (bAuthor?.hasGoldenNeedle) bBoost += 25;
        if (aAuthor?.isDesigner || aAuthor?.brandName) aBoost += 20;
        if (bAuthor?.isDesigner || bAuthor?.brandName) bBoost += 20;
        if (aAuthor?.subscriptionTier === 'elite' || aAuthor?.subscriptionTier === 'vip') aBoost += 35;
        if (bAuthor?.subscriptionTier === 'elite' || bAuthor?.subscriptionTier === 'vip') bBoost += 35;
        if (aAuthor?.subscriptionTier === 'pro' || aAuthor?.subscriptionTier === 'creator' || aAuthor?.subscriptionTier === 'business') aBoost += 20;
        if (bAuthor?.subscriptionTier === 'pro' || bAuthor?.subscriptionTier === 'creator' || bAuthor?.subscriptionTier === 'business') bBoost += 20;

        // 4. Calculate total trending score: likes and comments directly push publications to the top
        const aScore = (aLikes * 10) + (aComments * 20) + aBoost;
        const bScore = (bLikes * 10) + (bComments * 20) + bBoost;

        if (bScore !== aScore) {
          return bScore - aScore;
        }

        // 5. Stable Tie-breaker: Newer posts first
        return getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt);
      });
    }

    // Default: 'for_you' (Threads-style Smart Algorithmic Recommendation)
    return [...filtered].sort((a, b) => {
      const aPinned = Boolean(a.isTop || a.isPinned || a.pinned);
      const bPinned = Boolean(b.isTop || b.isPinned || b.pinned);
      if (aPinned !== bPinned) return bPinned ? 1 : -1;
      const aTime = getTimestampMillis(a.createdAt);
      const bTime = getTimestampMillis(b.createdAt);
      const aAgeHours = Math.max(0.1, (now - aTime) / (1000 * 60 * 60));
      const bAgeHours = Math.max(0.1, (now - bTime) / (1000 * 60 * 60));

      // Time decay factor
      const aTimeFactor = 1 / Math.pow(aAgeHours + 1.8, 1.25);
      const bTimeFactor = 1 / Math.pow(bAgeHours + 1.8, 1.25);

      // Engagement velocity
      const aHasImages = Boolean((a.images && a.images.length > 0) || a.imageUrl);
      const bHasImages = Boolean((b.images && b.images.length > 0) || b.imageUrl);
      let aEngagement = (a.likesCount || 0) * 4.0 + (a.commentsCount || 0) * 7.5 + (aHasImages ? 12 : 2);
      let bEngagement = (b.likesCount || 0) * 4.0 + (b.commentsCount || 0) * 7.5 + (bHasImages ? 12 : 2);

      // Creator & Affinity Boosts
      const aAuthor = authorsInfo[a.userId];
      const bAuthor = authorsInfo[b.userId];

      // Pro plan: +30% Boost охвата постов в рекомендациях сообщества
      if (aAuthor?.subscriptionTier === 'pro' || aAuthor?.subscriptionTier === 'creator') {
        aEngagement = aEngagement * 1.30;
      } else if (aAuthor?.subscriptionTier === 'elite' || aAuthor?.subscriptionTier === 'vip') {
        aEngagement = aEngagement * 1.50;
      }

      if (bAuthor?.subscriptionTier === 'pro' || bAuthor?.subscriptionTier === 'creator') {
        bEngagement = bEngagement * 1.30;
      } else if (bAuthor?.subscriptionTier === 'elite' || bAuthor?.subscriptionTier === 'vip') {
        bEngagement = bEngagement * 1.50;
      }

      let aBoost = 0;
      let bBoost = 0;

      if (userFollowing.has(a.userId)) aBoost += 25;
      if (userFollowing.has(b.userId)) bBoost += 25;

      if (aAuthor?.hasGoldenNeedle) aBoost += 25;
      if (bAuthor?.hasGoldenNeedle) bBoost += 25;

      if (aAuthor?.brandName || aAuthor?.isDesigner) aBoost += 20;
      if (bAuthor?.brandName || bAuthor?.isDesigner) bBoost += 20;

      if (aAuthor?.subscriptionTier === 'elite' || aAuthor?.subscriptionTier === 'vip') aBoost += 30;
      if (bAuthor?.subscriptionTier === 'elite' || bAuthor?.subscriptionTier === 'vip') bBoost += 30;

      if (aAuthor?.subscriptionTier === 'pro' || aAuthor?.subscriptionTier === 'business' || aAuthor?.subscriptionTier === 'creator') aBoost += 15;
      if (bAuthor?.subscriptionTier === 'pro' || bAuthor?.subscriptionTier === 'business' || bAuthor?.subscriptionTier === 'creator') bBoost += 15;

      const aScore = (aEngagement + aBoost + 5) * aTimeFactor;
      const bScore = (bEngagement + bBoost + 5) * bTimeFactor;

      return bScore - aScore;
    });
  }, [rawPosts, realm, subFeed, selectedTagFilter, dbUser, currentUser, authorsInfo]);

  // Handlers for high-speed multi-photo upload with instant preview & progress bars
  const uploadSinglePhotoItem = async (item: PostPhotoItem) => {
    try {
      const url = await uploadMediaFile(item.file, (stage, percent) => {
        setPostPhotos(prev =>
          prev.map(p => {
            if (p.id !== item.id) return p;
            let label = t('stage_optimizing', 'Сжатие...');
            if (stage === 'uploading') label = t('stage_uploading', 'Загрузка...');
            if (stage === 'ready') label = t('stage_ready', 'Готово');
            if (stage === 'error') label = t('stage_error', 'Ошибка');

            return {
              ...p,
              status: stage,
              progress: percent,
              stageLabel: label,
            };
          })
        );
      });

      if (url) {
        setPostPhotos(prev =>
          prev.map(p =>
            p.id === item.id
              ? {
                  ...p,
                  status: 'ready',
                  progress: 100,
                  remoteUrl: url,
                  stageLabel: t('stage_ready', 'Готово'),
                }
              : p
          )
        );
      }
    } catch (err: any) {
      console.error('Photo upload failed:', err);
      setPostPhotos(prev =>
        prev.map(p =>
          p.id === item.id
            ? {
                ...p,
                status: 'error',
                progress: 0,
                stageLabel: t('stage_error', 'Ошибка'),
              }
            : p
        )
      );
    }
  };

  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const currentCount = postPhotos.length;
    const availableSlots = MAX_POST_PHOTOS - currentCount;

    if (availableSlots <= 0) {
      ui.alert(t('max_photos_limit', `Достигнут лимит: максимум ${MAX_POST_PHOTOS} фото для одной публикации.`));
      e.target.value = '';
      return;
    }

    let filesToProcess = files;
    if (files.length > availableSlots) {
      filesToProcess = files.slice(0, availableSlots);
      ui.alert(
        t(
          'max_photos_truncated',
          `Выбрано больше лимита. Добавлено ${availableSlots} фото (максимум ${MAX_POST_PHOTOS} в одной публикации).`
        )
      );
    }

    // Safety check: max 25MB before pre-flight compression
    for (const f of filesToProcess) {
      if (f.size > 25 * 1024 * 1024) {
        ui.alert(t('file_too_big', `Файл "${f.name}" слишком большой (максимум 25 МБ).`));
        e.target.value = '';
        return;
      }
    }

    // Step 1: Create immediate local preview items (photos appear in preview INSTANTLY!)
    const newItems: PostPhotoItem[] = filesToProcess.map((file, idx) => ({
      id: `photo_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
      localPreviewUrl: URL.createObjectURL(file),
      status: 'optimizing',
      progress: 15,
      stageLabel: t('stage_optimizing', 'Сжатие...'),
      file,
    }));

    setPostPhotos(prev => [...prev, ...newItems].slice(0, MAX_POST_PHOTOS));
    e.target.value = '';

    // Step 2: Concurrently optimize and upload each photo with live stage feedback
    for (const item of newItems) {
      uploadSinglePhotoItem(item);
    }
  };

  const handleRemovePhoto = (idToRemove: string) => {
    setPostPhotos(prev => {
      const target = prev.find(p => p.id === idToRemove);
      if (target?.localPreviewUrl) {
        URL.revokeObjectURL(target.localPreviewUrl);
      }
      return prev.filter(p => p.id !== idToRemove);
    });
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!hasProAccess && !isAdmin) {
      setShowProVideoModal(true);
      e.target.value = '';
      return;
    }

    if (file.size > 80 * 1024 * 1024) {
      ui.alert(t('video_too_big', 'Видеофайл слишком большой (максимум 80 МБ).'));
      e.target.value = '';
      return;
    }

    setVideoUploadStatus('uploading');
    setVideoUploadProgress(15);
    // Clear photos when attaching video
    setPostPhotos([]);

    try {
      const url = await uploadMediaFile(file, (stage, percent) => {
        if (stage === 'uploading') setVideoUploadProgress(percent);
        if (stage === 'ready') setVideoUploadProgress(100);
      });

      if (url) {
        setPostVideoUrl(url);
        setVideoUploadStatus('ready');
      }
    } catch (err) {
      console.error('Video upload failed:', err);
      setVideoUploadStatus('error');
      ui.alert(t('video_upload_error', 'Не удалось загрузить видеофайл.'));
    } finally {
      e.target.value = '';
    }
  };

  const handleAddVideoUrl = () => {
    if (!videoInputUrl.trim()) return;
    if (!hasProAccess && !isAdmin) {
      setShowProVideoModal(true);
      return;
    }
    setPostVideoUrl(videoInputUrl.trim());
    setVideoUploadStatus('ready');
    setPostPhotos([]);
    setVideoInputUrl('');
    setVideoLinkModalOpen(false);
  };

  const handleRemoveVideo = () => {
    setPostVideoUrl('');
    setVideoUploadStatus('idle');
    setVideoUploadProgress(0);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      ui.alert(t('login_required_post', 'Please log in to post.'));
      return;
    }

    if (realm === 'pro' && !hasProAccess) {
      navigate('/plans');
      return;
    }

    const readyPhotos = postPhotos.filter(p => p.status === 'ready' && p.remoteUrl);
    const isAnyPhotoUploading = postPhotos.some(p => p.status === 'optimizing' || p.status === 'uploading');

    if (isAnyPhotoUploading || videoUploadStatus === 'uploading') {
      ui.alert(t('wait_media_finish', 'Пожалуйста, дождитесь завершения обработки и загрузки медиа...'));
      return;
    }

    if (!newPostContent.trim() && readyPhotos.length === 0 && !postVideoUrl.trim()) return;

    setIsSubmitting(true);
    try {
      const moderation = await moderateContent(newPostContent);
      if (!moderation.isAllowed) {
        ui.alert(t('moderation_warning', 'Warning: ') + moderation.reason);
        await updateDoc(doc(db, 'users', currentUser.uid), {
          warnings: increment(1)
        });
        setIsSubmitting(false);
        return;
      }

      const finalUrls = readyPhotos.map(p => p.remoteUrl!).slice(0, MAX_POST_PHOTOS);
      const postData: any = {
        userId: currentUser.uid,
        content: newPostContent,
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
        isClosed: realm === 'pro',
        images: finalUrls,
        imageUrl: finalUrls[0] || '',
        videoUrl: postVideoUrl.trim() || ''
      };

      if (newPostTag.trim()) {
        postData.tag = newPostTag.trim();
      }

      await addDoc(collection(db, 'feedPosts'), postData);

      // Clean up object URLs
      postPhotos.forEach(p => {
        if (p.localPreviewUrl) URL.revokeObjectURL(p.localPreviewUrl);
      });

      setNewPostContent('');
      setPostPhotos([]);
      setPostVideoUrl('');
      setVideoUploadStatus('idle');
      setVideoUploadProgress(0);
      setNewPostTag('');
      setHasNewPosts(false);
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      console.error('Feed post error:', e);
      ui.alert(t('feed_post_error', 'Error posting to feed'));
    }
    setIsSubmitting(false);
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) {
      ui.alert(t('login_required_like', 'Please log in to like.'));
      return;
    }

    const isLiked = userLikes.has(postId);

    // Quick pop animation
    setLikedHeartEffect(postId);
    setTimeout(() => setLikedHeartEffect(null), 800);

    const targetPost = rawPosts.find(p => p.id === postId);
    const prevLikes = Number(targetPost?.likesCount ?? (Array.isArray(targetPost?.likes) ? targetPost?.likes.length : targetPost?.likes) ?? 0) || 0;
    const nextLikes = Math.max(0, prevLikes + (isLiked ? -1 : 1));

    // 1. Instant Optimistic State Updates so publications immediately rise up in Trending!
    setUserLikes(prev => {
      const next = new Set(prev);
      if (isLiked) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });

    setRawPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, likesCount: nextLikes } : p))
    );

    try {
      const res = await apiFetch(`/api/feed/${postId}/like`, {
        method: 'POST'
      });

      if (!res.ok) {
        throw new Error('Failed to toggle like');
      }

      const data = await res.json();

      // If newly liked, send notification to author
      if (data.liked) {
        const post = rawPosts.find(p => p.id === postId);
        if (post && post.userId && post.userId !== currentUser.uid) {
          createNotification({
            userId: post.userId,
            type: 'like',
            title: currentUser.displayName || 'New Like',
            message: 'liked your post in the feed',
            senderId: currentUser.uid,
            senderName: currentUser.displayName || 'User',
            senderAvatar: currentUser.photoURL || '',
            link: '/feed'
          }).catch(err => console.warn('Failed to send like notification:', err));
        }
      }
    } catch (e) {
      console.error('Like error:', e);
      // Revert optimistic updates
      setUserLikes(prev => {
        const next = new Set(prev);
        if (isLiked) next.add(postId);
        else next.delete(postId);
        return next;
      });
      setRawPosts(prev =>
        prev.map(p => (p.id === postId ? { ...p, likesCount: prevLikes } : p))
      );
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      ui.alert(t('login_required_comment', 'Please log in to comment.'));
      return;
    }
    if (!newComment.trim() || !selectedPost) return;

    const targetPostId = selectedPost.id;
    const targetPost = rawPosts.find(p => p.id === targetPostId);
    const prevComments = Number(targetPost?.commentsCount ?? (Array.isArray(targetPost?.comments) ? targetPost?.comments.length : targetPost?.comments) ?? 0) || 0;
    const nextComments = prevComments + 1;

    // Optimistic update for comment count so post immediately gains trending score
    setRawPosts(prev =>
      prev.map(p => (p.id === targetPostId ? { ...p, commentsCount: nextComments } : p))
    );

    setIsSubmitting(true);
    try {
      const moderation = await moderateContent(newComment);
      if (!moderation.isAllowed) {
        ui.alert(t('comment_moderation_error', "Your comment couldn't be published: ") + moderation.reason);
        // Revert comment count
        setRawPosts(prev =>
          prev.map(p => (p.id === targetPostId ? { ...p, commentsCount: prevComments } : p))
        );
        setIsSubmitting(false);
        return;
      }

      const res = await apiFetch(`/api/feed/${selectedPost.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: newComment.trim() })
      });

      if (!res.ok) {
        throw new Error('Failed to post comment');
      }

      // Send notification
      if (selectedPost.userId && selectedPost.userId !== currentUser.uid) {
        createNotification({
          userId: selectedPost.userId,
          type: 'comment',
          title: currentUser.displayName || 'New Comment',
          message: `commented: "${newComment.trim().length > 40 ? newComment.trim().slice(0, 37) + '...' : newComment.trim()}"`,
          senderId: currentUser.uid,
          senderName: currentUser.displayName || 'User',
          senderAvatar: currentUser.photoURL || '',
          link: '/feed'
        }).catch(err => console.warn('Failed to send comment notification:', err));
      }

      setNewComment('');
    } catch (e) {
      console.error('Error commenting:', e);
      // Revert comment count on error
      setRawPosts(prev =>
        prev.map(p => (p.id === targetPostId ? { ...p, commentsCount: prevComments } : p))
      );
    }
    setIsSubmitting(false);
  };

  const handleToggleTop = async (postId: string, newTopStatus: boolean) => {
    if (!currentUser) {
      ui.alert(t('login_required_like', 'Please log in'));
      return;
    }

    // Optimistic UI update
    setRawPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, isTop: newTopStatus } : p))
    );

    try {
      await updateDoc(doc(db, 'feedPosts', postId), {
        isTop: newTopStatus
      });
      ui.alert(
        newTopStatus
          ? t('post_pinned_trending', 'Публикация поднята в ТОП раздела в тренде!')
          : t('post_unpinned_trending', 'Публикация снята с ТОПА')
      );
    } catch (e) {
      console.error('Error toggling top publication:', e);
      setRawPosts(prev =>
        prev.map(p => (p.id === postId ? { ...p, isTop: !newTopStatus } : p))
      );
      ui.alert(t('error_toggling_top', 'Не удалось обновить статус публикации'));
    }
  };

  const handleDeletePost = async (postId: string, postCreatedAt?: any, authorId?: string) => {
    const isMe = currentUser?.uid === authorId;
    const postCreatedAtMillis = getTimestampMillis(postCreatedAt);
    const now = Date.now();
    const ageHours = postCreatedAtMillis > 0 ? (now - postCreatedAtMillis) / (1000 * 60 * 60) : 0;

    // 24-hour deletion lock rule
    if (isMe && !isAdmin) {
      if (postCreatedAtMillis > 0 && ageHours < 24) {
        const remainingHours = Math.ceil(24 - ageHours);
        ui.alert(t('feed_post_delete_locked_24h', `In this room, posts cannot be deleted for 24 hours after publishing to preserve thread integrity. (${remainingHours}h remaining)`));
        return;
      }
    }

    if (!await ui.confirm(t('confirm_delete_post', 'Delete this post?'))) return;

    try {
      await deleteDoc(doc(db, 'feedPosts', postId));
    } catch (e) {
      console.error('Error deleting post:', e);
      ui.alert(t('failed_delete_post', 'Failed to delete post.'));
    }
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    if (!await ui.confirm(t('confirm_delete_comment', 'Delete this comment?'))) return;

    try {
      const res = await apiFetch(`/api/feed/${postId}/comments/${commentId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('Failed to delete comment');
      }
    } catch (e) {
      console.error('Error deleting comment:', e);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!currentUser || !dbUser) {
      ui.alert(t('login_required_post', 'Please log in'));
      return;
    }

    try {
      const isFollowing = dbUser.following?.includes(targetUserId);
      const followingList = dbUser.following || [];
      const newFollowing = isFollowing
        ? followingList.filter(id => id !== targetUserId)
        : [...followingList, targetUserId];

      await updateDoc(doc(db, 'users', currentUser.uid), {
        following: newFollowing
      });

      const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
      if (targetUserDoc.exists()) {
        const targetData = targetUserDoc.data();
        const followersList = targetData.followers || [];
        const newFollowers = isFollowing
          ? followersList.filter((id: string) => id !== currentUser.uid)
          : [...followersList, currentUser.uid];

        await updateDoc(doc(db, 'users', targetUserId), {
          followers: newFollowers
        });
      }

      if (!isFollowing) {
        await addDoc(collection(db, 'notifications'), {
          userId: targetUserId,
          type: 'follow',
          fromUserId: currentUser.uid,
          fromUserName: dbUser.name || 'Someone',
          createdAt: serverTimestamp(),
          read: false
        });
      }
    } catch (e) {
      console.error('Error following user:', e);
    }
  };

  const handleCopyLink = (postId: string) => {
    const url = `${window.location.origin}/feed#post-${postId}`;
    navigator.clipboard.writeText(url);
    setCopiedPostId(postId);
    setTimeout(() => setCopiedPostId(null), 2500);
  };

  const getUserProfileLink = (author: any, userId: string) => {
    if (author?.handle) return `/u/${author.handle.replace('@', '').trim()}`;
    if (author?.username) return `/u/${author.username}`;
    return `/u/${userId}`;
  };

  return (
    <div className="bg-brand-light min-h-screen pb-24 overflow-x-hidden" ref={topRef}>
      {/* Floating New Posts Pill */}
      <AnimatePresence>
        {hasNewPosts && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-40"
          >
            <button
              onClick={() => {
                setHasNewPosts(false);
                topRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-brand-accent text-white px-5 py-2 rounded-full font-medium text-xs uppercase tracking-wider shadow-lg hover:scale-105 transition-all flex items-center gap-2"
            >
              <Sparkles size={14} />
              {t('new_posts_pill', 'New Posts Available')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-3 sm:pt-5 pb-6 sm:pb-10">
        {/* 1. TOP REALM SWITCHER: Public vs Pro Lounge */}
        <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-brand-muted/40 rounded-full border border-brand-dark/[0.08]">
          <button
            onClick={() => setRealm('public')}
            className={`py-2.5 sm:py-3 px-4 rounded-full font-medium uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              realm === 'public'
                ? 'bg-brand-dark text-white shadow-xs'
                : 'text-brand-dark/75 hover:text-brand-dark'
            }`}
          >
            <Globe size={15} />
            <span>{t('feed_realm_public', 'Public Feed')}</span>
          </button>

          <button
            onClick={() => setRealm('pro')}
            className={`py-2.5 sm:py-3 px-4 rounded-full font-medium uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all relative ${
              realm === 'pro'
                ? 'bg-brand-accent text-white shadow-xs'
                : 'text-brand-accent/85 hover:text-brand-accent'
            }`}
          >
            <Crown size={15} className={realm === 'pro' ? 'text-amber-200' : 'text-brand-accent'} />
            <span>{t('feed_realm_pro', 'Pro Lounge (VIP)')}</span>
            {!hasProAccess && (
              <span className="text-[9px] bg-brand-dark/10 text-brand-dark font-semibold px-2 py-0.5 rounded-full border border-brand-dark/10 hidden sm:inline-block">
                VIP
              </span>
            )}
          </button>
        </div>

        {/* PRO REALM PAYWALL / BANNER (If Free User enters Pro realm) */}
        {realm === 'pro' && !hasProAccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 rounded-3xl border border-brand-dark/15 bg-gradient-to-br from-[#181313] via-[#201818] to-brand-dark text-white p-6 sm:p-8 shadow-md relative overflow-hidden"
          >
            <div className="flex items-center gap-3.5 mb-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-400 shrink-0">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-display font-semibold uppercase tracking-tight text-white">
                  {t('pro_feed_banner_title', 'FFAZ Pro & Designers Lounge')}
                </h3>
                <p className="text-xs uppercase text-amber-200/80 font-medium tracking-wider">
                  Exclusive High-Fashion VIP Network
                </p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-white/80 mb-6 leading-relaxed">
              {t('pro_feed_banner_desc', 'Exclusive backstage looks, couture previews, casting calls & buyer insights from verified designers.')}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/plans"
                className="bg-brand-accent text-white hover:bg-white hover:text-brand-dark font-medium text-xs sm:text-sm uppercase tracking-wider px-6 py-3 rounded-full transition-all shadow-sm"
              >
                {t('pro_upgrade_cta', 'Upgrade to Pro (19 AZN/mo)')}
              </Link>
              <button
                onClick={() => setRealm('public')}
                className="bg-transparent text-white/80 font-medium text-xs uppercase tracking-wider px-5 py-3 rounded-full border border-white/20 hover:border-white hover:text-white transition-colors"
              >
                ← Return to Public Feed
              </button>
            </div>
          </motion.div>
        )}

        {/* Embedded Real-Time Live Chat Component */}
        <FeedLiveChat
          channel={realm === 'pro' ? 'pro' : 'public'}
          isOpen={isLiveChatOpen}
          onToggle={() => setIsLiveChatOpen(!isLiveChatOpen)}
          hasProAccess={hasProAccess}
          onUpgradeClick={() => navigate('/plans')}
        />

        {/* 2. THREADS SUB-FEED TABS (For You / Following / Trending / Latest) */}
        <div className="p-1 mb-5 bg-brand-muted/40 rounded-full border border-brand-dark/[0.08] flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSubFeed('for_you')}
            className={`flex-1 min-w-fit shrink-0 py-2 sm:py-2.5 px-3 rounded-full font-medium uppercase tracking-wider text-[11px] sm:text-xs flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              subFeed === 'for_you'
                ? 'bg-brand-dark text-white shadow-2xs'
                : 'text-brand-dark/70 hover:text-brand-dark'
            }`}
          >
            <Sparkles size={13} />
            <span>{t('feed_tab_for_you', 'For You')}</span>
          </button>

          <button
            onClick={() => setSubFeed('following')}
            className={`flex-1 min-w-fit shrink-0 py-2 sm:py-2.5 px-3 rounded-full font-medium uppercase tracking-wider text-[11px] sm:text-xs flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              subFeed === 'following'
                ? 'bg-brand-dark text-white shadow-2xs'
                : 'text-brand-dark/70 hover:text-brand-dark'
            }`}
          >
            <Users size={13} />
            <span>{t('feed_tab_following', 'Following')}</span>
          </button>

          <button
            onClick={() => setSubFeed('trending')}
            className={`flex-1 min-w-fit shrink-0 py-2 sm:py-2.5 px-3 rounded-full font-medium uppercase tracking-wider text-[11px] sm:text-xs flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              subFeed === 'trending'
                ? 'bg-brand-dark text-white shadow-2xs'
                : 'text-brand-dark/70 hover:text-brand-dark'
            }`}
          >
            <Flame size={13} />
            <span>{t('feed_tab_trending', 'Trending')}</span>
          </button>

          <button
            onClick={() => setSubFeed('recent')}
            className={`flex-1 min-w-fit shrink-0 py-2 sm:py-2.5 px-3 rounded-full font-medium uppercase tracking-wider text-[11px] sm:text-xs flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              subFeed === 'recent'
                ? 'bg-brand-dark text-white shadow-2xs'
                : 'text-brand-dark/70 hover:text-brand-dark'
            }`}
          >
            <Clock size={13} />
            <span>{t('feed_tab_recent', 'Latest')}</span>
          </button>
        </div>

        {/* Trending Top Publications Live Banner */}
        {subFeed === 'trending' && (
          <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-brand-dark text-white flex items-center justify-between gap-4 border border-brand-dark/10 shadow-xs">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#7A0000] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Flame size={20} className="fill-white" />
              </div>
              <div className="min-w-0">
                <h4 className="font-display font-semibold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                  <span>{t('trending_top_header', 'В ТРЕНДЕ: ТОПОВЫЕ ПУБЛИКАЦИИ')}</span>
                  <span className="text-[9px] bg-white/20 text-white px-2 py-0.5 rounded-full uppercase font-mono font-bold tracking-widest">
                    LIVE RANKING
                  </span>
                </h4>
                <p className="text-[11px] sm:text-xs text-white/70 font-normal mt-0.5 truncate sm:whitespace-normal">
                  {t('trending_top_desc', 'Публикации с наибольшим числом лайков и обсуждений поднимаются на самый верх в реальном времени.')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. POST COMPOSER */}
        {currentUser ? (
          <form 
            onSubmit={handlePost} 
            className="rounded-3xl border border-brand-dark/[0.08] bg-white p-5 sm:p-6 mb-8 shadow-xs transition-colors"
          >
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full border border-brand-dark/10 overflow-hidden bg-brand-muted shrink-0 flex items-center justify-center font-bold text-xs">
                  {dbUser?.avatarUrl ? (
                    <img src={dbUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    dbUser?.name?.charAt(0) || '?'
                  )}
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-dark truncate">
                  {dbUser?.name || 'You'}
                </span>
                <span className="text-[10px] font-mono text-brand-dark/45 hidden sm:inline">
                  • {realm === 'pro' ? 'Pro Lounge' : 'Public Feed'}
                </span>
                {realm === 'pro' && (
                  <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full uppercase font-semibold">
                    PRO POST
                  </span>
                )}
              </div>

                {/* Tag Selector Pill (CSS selector 2) */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-dark/40 shrink-0 hidden sm:inline-flex items-center gap-1">
                    <Sparkles size={11} className="text-brand-accent" />
                    {trendTimeframe === 'day' ? 'Today:' : trendTimeframe === 'week' ? 'Week:' : 'Month:'}
                  </span>
                  {analyzedTopics.slice(0, 5).map(topic => (
                    <button
                      type="button"
                      key={topic.tag}
                      onClick={() => setNewPostTag(newPostTag === topic.tag ? '' : topic.tag)}
                      className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border uppercase transition-colors shrink-0 flex items-center gap-1 ${
                        newPostTag === topic.tag 
                          ? 'bg-brand-dark text-white border-brand-dark shadow-2xs' 
                          : 'bg-brand-muted/30 text-brand-dark/70 border-brand-dark/[0.08] hover:border-brand-accent hover:text-brand-accent'
                      }`}
                      title={`${topic.tag} • Relevance score: ${Math.round(topic.score)}`}
                    >
                      <span>{topic.tag}</span>
                      {topic.isHot && <span className="text-[9px]">🔥</span>}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder={
                  realm === 'pro'
                    ? "Share backstage preview, haute couture updates, or talent casting..."
                    : t('share_post', "What's on your mind? Discuss fashion, events, or share your work...")
                }
                className="w-full bg-brand-muted/25 border border-brand-dark/[0.08] rounded-2xl p-4 text-xs sm:text-sm outline-none focus:bg-white focus:border-brand-accent/40 focus:ring-1 focus:ring-brand-accent/20 transition-all resize-none mb-3.5 min-h-[95px] text-brand-dark"
              />

              {/* Multi-Photo Preview Grid (Up to 5 photos) with Instant Previews, Progress Bars & Carousel Badge */}
              {postPhotos.length > 0 && (
                <div className="mb-4 p-3.5 rounded-2xl bg-brand-muted/20 border border-brand-dark/[0.08]">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 px-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-brand-dark/85 flex items-center gap-1.5 font-semibold">
                      <Images size={13} className="text-brand-accent" />
                      {t('post_gallery_count', 'Галерея')}: {postPhotos.length} / {MAX_POST_PHOTOS} {t('photos', 'фото')}
                      {postPhotos.length > 1 && (
                        <span className="ml-1.5 px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent text-[9px] font-semibold tracking-normal lowercase flex items-center gap-1">
                          <Sparkles size={10} />
                          слайдер / карусель
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-mono text-brand-dark/50">
                      {postPhotos.length >= MAX_POST_PHOTOS 
                        ? t('limit_reached', 'Лимит достигнут') 
                        : t('slots_left', `Свободно слотов: ${MAX_POST_PHOTOS - postPhotos.length}`)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                    {postPhotos.map((photo, idx) => (
                      <div 
                        key={photo.id} 
                        className="relative aspect-square rounded-xl overflow-hidden border border-brand-dark/15 bg-brand-muted/30 group shadow-2xs"
                      >
                        {/* Instant local preview image */}
                        <img 
                          src={photo.localPreviewUrl || photo.remoteUrl} 
                          alt={`Preview ${idx + 1}`} 
                          className="w-full h-full object-cover transition-transform duration-300" 
                          loading="lazy"
                          decoding="async"
                        />

                        {/* Top index badge */}
                        <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-white font-mono text-[9px] px-1.5 py-0.5 rounded-md z-20 pointer-events-none">
                          #{idx + 1}
                        </div>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo.id)}
                          className="absolute top-1.5 right-1.5 z-20 bg-white/90 hover:bg-red-500 hover:text-white text-brand-dark rounded-full p-1 transition-colors shadow-xs cursor-pointer"
                          title={t('remove_photo', 'Удалить это фото')}
                        >
                          <Trash2 size={12} />
                        </button>

                        {/* PROGRESS BAR OVERLAY ON TOP OF PHOTO */}
                        {photo.status !== 'ready' && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex flex-col justify-end p-2 transition-all">
                            {/* Stage & Percentage text */}
                            <div className="flex items-center justify-between text-[10px] font-mono font-medium text-white mb-1 drop-shadow-xs">
                              <span className="flex items-center gap-1">
                                {photo.status === 'optimizing' && <Sparkles size={11} className="text-amber-300 animate-spin" />}
                                {photo.status === 'uploading' && <Loader2 size={11} className="text-sky-300 animate-spin" />}
                                {photo.status === 'error' && <AlertCircle size={11} className="text-red-400" />}
                                <span className="truncate max-w-[65px]">{photo.stageLabel}</span>
                              </span>
                              <span className="font-semibold text-brand-accent">
                                {photo.progress}%
                              </span>
                            </div>

                            {/* Animated Progress Bar */}
                            <div className="w-full bg-white/25 rounded-full h-1.5 overflow-hidden backdrop-blur-xs">
                              <div 
                                className={`h-full transition-all duration-300 ease-out rounded-full ${
                                  photo.status === 'error' ? 'bg-red-500' : 'bg-brand-accent'
                                }`}
                                style={{ width: `${Math.max(8, photo.progress)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Ready success checkmark */}
                        {photo.status === 'ready' && (
                          <div 
                            className="absolute bottom-1.5 right-1.5 bg-green-600/90 backdrop-blur-xs text-white rounded-full p-1 shadow-xs z-10 flex items-center justify-center pointer-events-none"
                            title="Готово"
                          >
                            <Check size={11} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    ))}

                    {postPhotos.length < MAX_POST_PHOTOS && (
                      <label 
                        className="aspect-square rounded-xl border border-dashed border-brand-dark/25 hover:border-brand-accent hover:bg-brand-accent/5 flex flex-col items-center justify-center cursor-pointer transition-colors text-brand-dark/60 hover:text-brand-accent"
                      >
                        <Plus size={18} />
                        <span className="text-[10px] font-mono mt-1 uppercase font-semibold">+ Еще</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={postPhotos.length >= MAX_POST_PHOTOS}
                          onChange={handleMultipleImagesUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Video Upload Progress Bar */}
              {videoUploadStatus === 'uploading' && (
                <div className="mb-4 p-4 rounded-2xl bg-brand-muted/30 border border-brand-dark/[0.08]">
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="flex items-center gap-2 text-brand-dark font-semibold">
                      <Loader2 size={14} className="animate-spin text-brand-accent" />
                      <span>Загрузка видеофайла...</span>
                    </span>
                    <span className="text-brand-accent font-bold">{videoUploadProgress}%</span>
                  </div>
                  <div className="w-full bg-brand-dark/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-brand-accent h-full transition-all duration-300 rounded-full"
                      style={{ width: `${Math.max(10, videoUploadProgress)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Video Attached Preview */}
              {postVideoUrl && (
                <div className="mb-4 p-3.5 rounded-2xl bg-black/90 border border-brand-dark/20 text-white shadow-xs">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-mono uppercase tracking-wider text-white/90 flex items-center gap-1.5 font-semibold">
                      <Film size={13} className="text-brand-accent" />
                      Видео прикреплено
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveVideo}
                      className="text-xs font-mono text-red-400 hover:text-red-300 flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span>Удалить видео</span>
                    </button>
                  </div>
                  <div className="rounded-xl overflow-hidden max-h-[320px] aspect-video bg-black flex items-center justify-center">
                    {postVideoUrl.includes('youtube.com') || postVideoUrl.includes('youtu.be') ? (
                      <iframe
                        src={postVideoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                        className="w-full h-full"
                        title="Video preview"
                      />
                    ) : postVideoUrl.includes('vimeo.com') ? (
                      <iframe
                        src={`https://player.vimeo.com/video/${postVideoUrl.split('vimeo.com/')[1]}`}
                        className="w-full h-full"
                        title="Video preview"
                      />
                    ) : (
                      <video
                        src={postVideoUrl}
                        controls
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Video Link Inline Input */}
              {videoLinkModalOpen && (
                <div className="mb-4 p-3.5 rounded-2xl bg-brand-muted/30 border border-brand-dark/15 flex flex-col sm:flex-row items-center gap-2">
                  <div className="relative flex-1 w-full">
                    <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-dark/50" />
                    <input
                      type="url"
                      value={videoInputUrl}
                      onChange={(e) => setVideoInputUrl(e.target.value)}
                      placeholder="Вставьте ссылку на видео (YouTube, Vimeo, MP4)..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-brand-dark/15 rounded-xl text-brand-dark outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={handleAddVideoUrl}
                      disabled={!videoInputUrl.trim()}
                      className="px-4 py-2 bg-brand-accent hover:bg-brand-dark text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      Прикрепить
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoLinkModalOpen(false)}
                      className="p-2 text-brand-dark/60 hover:text-brand-dark hover:bg-black/5 rounded-xl transition-colors cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-brand-dark/[0.06]">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Photo / Multi-Photo Carousel Button */}
                  {!postVideoUrl && (
                    <label 
                      className={`cursor-pointer bg-brand-card border border-brand-dark/[0.12] text-brand-dark px-3.5 py-2 rounded-full flex items-center text-xs font-semibold uppercase tracking-wider hover:border-brand-accent hover:text-brand-accent transition-all shadow-2xs ${
                        postPhotos.length >= MAX_POST_PHOTOS ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      <Images size={14} className="mr-1.5 text-brand-accent" />
                      <span>
                        {postPhotos.length > 0 
                          ? `Фото (${postPhotos.length}/${MAX_POST_PHOTOS})` 
                          : 'Фото / Карусель'}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*"
                        multiple
                        disabled={postPhotos.length >= MAX_POST_PHOTOS}
                        onChange={handleMultipleImagesUpload}
                        className="hidden" 
                      />
                    </label>
                  )}

                  {/* Video File Upload Button (Premium / Pro Exclusive) */}
                  {postPhotos.length === 0 && !postVideoUrl && (
                    hasProAccess ? (
                      <label 
                        className="cursor-pointer bg-brand-card border border-brand-dark/[0.12] text-brand-dark px-3.5 py-2 rounded-full flex items-center text-xs font-semibold uppercase tracking-wider hover:border-brand-accent hover:text-brand-accent transition-all shadow-2xs"
                      >
                        <Video size={14} className="mr-1.5 text-brand-accent" />
                        <span>Видеофайл</span>
                        <input 
                          type="file" 
                          accept="video/mp4,video/webm,video/quicktime"
                          onChange={handleVideoUpload}
                          className="hidden" 
                        />
                      </label>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowProVideoModal(true)}
                        className="bg-brand-card border border-amber-500/35 text-brand-dark px-3.5 py-2 rounded-full flex items-center text-xs font-semibold uppercase tracking-wider hover:border-amber-500 hover:text-amber-700 transition-all shadow-2xs cursor-pointer group"
                        title="Публикация видео доступна на тарифах Pro / Elite"
                      >
                        <Video size={14} className="mr-1.5 text-amber-600" />
                        <span>Видеофайл</span>
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[9px] font-mono font-bold flex items-center gap-0.5">
                          <Crown size={9} className="text-amber-600 fill-amber-600" /> PRO
                        </span>
                      </button>
                    )
                  )}

                  {/* Video URL Link Button (Premium / Pro Exclusive) */}
                  {postPhotos.length === 0 && !postVideoUrl && (
                    hasProAccess ? (
                      <button
                        type="button"
                        onClick={() => setVideoLinkModalOpen(!videoLinkModalOpen)}
                        className={`bg-brand-card border border-brand-dark/[0.12] text-brand-dark px-3.5 py-2 rounded-full flex items-center text-xs font-semibold uppercase tracking-wider hover:border-brand-accent hover:text-brand-accent transition-all shadow-2xs cursor-pointer ${
                          videoLinkModalOpen ? 'border-brand-accent text-brand-accent' : ''
                        }`}
                      >
                        <Link2 size={14} className="mr-1.5 text-brand-accent" />
                        <span>Ссылка</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowProVideoModal(true)}
                        className="bg-brand-card border border-amber-500/35 text-brand-dark px-3.5 py-2 rounded-full flex items-center text-xs font-semibold uppercase tracking-wider hover:border-amber-500 hover:text-amber-700 transition-all shadow-2xs cursor-pointer group"
                        title="Вставка видео доступна на тарифах Pro / Elite"
                      >
                        <Link2 size={14} className="mr-1.5 text-amber-600" />
                        <span>Ссылка</span>
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[9px] font-mono font-bold flex items-center gap-0.5">
                          <Crown size={9} className="text-amber-600 fill-amber-600" /> PRO
                        </span>
                      </button>
                    )
                  )}

                  {/* Uploading progress indicator for the overall queue */}
                  {postPhotos.some(p => p.status === 'optimizing' || p.status === 'uploading') && (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-brand-accent animate-pulse px-2">
                      <Loader2 size={13} className="animate-spin" />
                      <span>{t('uploading_photos_progress', 'Обработка и загрузка фото...')}</span>
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={
                    isSubmitting || 
                    videoUploadStatus === 'uploading' ||
                    postPhotos.some(p => p.status === 'optimizing' || p.status === 'uploading') || 
                    (!newPostContent.trim() && postPhotos.filter(p => p.status === 'ready').length === 0 && !postVideoUrl.trim())
                  }
                  className="bg-brand-accent text-white px-7 py-2 rounded-full font-semibold uppercase tracking-wider text-xs hover:bg-brand-dark transition-all disabled:opacity-50 shadow-xs cursor-pointer disabled:cursor-not-allowed ml-auto"
                >
                  {isSubmitting ? t('posting', 'Posting...') : t('publish', 'Post')}
                </button>
              </div>
            </form>
        ) : (
          <div className="rounded-3xl border border-brand-dark/[0.08] bg-white p-5 sm:p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <p className="font-medium text-xs sm:text-sm text-brand-dark">
              {t('feed_login_prompt', 'Log in to join the conversation, share photos, and follow creators.')}
            </p>
            <Link
              to="/login"
              className="bg-brand-dark text-white px-6 py-2.5 rounded-full font-semibold uppercase tracking-wider text-xs hover:bg-brand-accent transition-colors shrink-0 w-full sm:w-auto text-center shadow-xs"
            >
              {t('login_email', 'Login / Register')}
            </Link>
          </div>
        )}

        {/* 4. POSTS STREAM */}
        {rankedPosts.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-3xl border border-brand-dark/[0.08] bg-white shadow-xs">
            <p className="text-sm sm:text-base font-medium text-brand-dark/70">
              {subFeed === 'following' 
                ? 'No posts from followed creators yet. Switch to "For You" to discover designers!'
                : t('no_posts_yet', 'No posts yet.')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col space-y-6">
            {rankedPosts.map((post, postRankIndex) => {
              const author = authorsInfo[post.userId];
              const profileLink = getUserProfileLink(author, post.userId);
              const isLiked = userLikes.has(post.id);
              const isMe = currentUser?.uid === post.userId;

              return (
                <motion.article 
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ layout: { duration: 0.35, ease: 'easeOut' } }}
                  key={post.id} 
                  id={`post-${post.id}`}
                  className={`rounded-3xl border bg-white p-5 sm:p-7 shadow-xs hover:border-brand-accent/25 hover:shadow-md transition-all duration-300 relative overflow-hidden ${
                    post.isTop ? 'border-[#7A0000]/40 ring-1 ring-[#7A0000]/20' : 'border-brand-dark/[0.08]'
                  }`}
                >
                  {/* Heart Pop Effect Overlay */}
                  <AnimatePresence>
                    {likedHeartEffect === post.id && (
                      <motion.div
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 1.8, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                      >
                        <Heart size={80} className="text-red-500 fill-red-500 drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Header Row */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Link 
                        to={profileLink} 
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-brand-dark/10 overflow-hidden bg-brand-muted shrink-0 flex items-center justify-center text-sm font-semibold text-brand-dark hover:border-brand-accent transition-colors shadow-2xs"
                      >
                        {author?.avatarUrl ? (
                          <img src={author.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          author?.name?.charAt(0) || '?'
                        )}
                      </Link>

                      <div className="min-w-0">
                        <div className="font-display font-semibold text-brand-dark text-sm sm:text-base leading-tight flex flex-wrap items-center gap-2">
                          <Link to={profileLink} className="hover:text-brand-accent transition-colors truncate">
                            {author?.name || 'Unknown Creator'}
                          </Link>

                          {author?.hasGoldenNeedle && (
                            <GoldenNeedleBadge size="sm" />
                          )}

                          {(author?.hasSilverNeedle || author?.silverNeedleStatus === 'approved') && (
                            <SilverNeedleBadge size="sm" />
                          )}

                          {author?.hasModelBadge && (
                            <ModelVerifiedBadge size="sm" agencyName={author?.modelAgencyName || author?.modelVerifiedByAgency} />
                          )}

                          {(author?.hasAgencyBadge || author?.isAgency || author?.isAgencyRepresentative) && (
                            <AgencyBadge size="sm" agencyName={author?.representedAgencyName} />
                          )}

                          {author?.brandName && (
                            <span className="text-[10px] bg-brand-accent/5 text-brand-accent font-semibold uppercase px-2.5 py-0.5 rounded-full border border-brand-accent/20">
                              Brand: {author.brandName}
                            </span>
                          )}

                          {/* Official Subscription Distinction Badges */}
                          {(author?.subscriptionTier === 'elite' || author?.subscriptionTier === 'vip') ? (
                            <span className="text-[10px] bg-stone-900 text-amber-300 border border-amber-400/30 font-mono font-bold uppercase px-2 py-0.5 rounded-full tracking-wider shadow-2xs flex items-center gap-1">
                              <Crown size={10} className="text-amber-400" /> ELITE VIP
                            </span>
                          ) : (author?.subscriptionTier === 'pro' || author?.subscriptionTier === 'creator') ? (
                            <span className="text-[10px] bg-brand-accent text-white font-mono font-bold uppercase px-2 py-0.5 rounded-full tracking-wider shadow-2xs">
                              PRO
                            </span>
                          ) : null}

                          {post.isClosed && (
                            <span className="text-[9px] bg-brand-accent text-white uppercase px-2 py-0.5 rounded-full font-semibold tracking-wider">
                              PRO
                            </span>
                          )}

                          {post.isTop && (
                            <span className="text-[10px] bg-[#7A0000] text-white font-mono uppercase px-2.5 py-0.5 rounded-full font-bold tracking-wider flex items-center gap-1 shadow-2xs">
                              <Flame size={11} className="fill-white" />
                              <span>{t('top_publication_badge', 'ТОП ПУБЛИКАЦИЯ')}</span>
                            </span>
                          )}

                          {subFeed === 'trending' && !post.isTop && ((post.likesCount || 0) > 0 || (post.commentsCount || 0) > 0) && postRankIndex < 3 && (
                            <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full font-bold tracking-wider flex items-center gap-1 shadow-2xs ${
                              postRankIndex === 0
                                ? 'bg-amber-600 text-white'
                                : postRankIndex === 1
                                ? 'bg-brand-dark text-white'
                                : 'bg-brand-dark/70 text-white'
                            }`}>
                              <Flame size={11} className="fill-white" />
                              <span>#{postRankIndex + 1} {t('feed_tab_trending', 'В ТРЕНДЕ')}</span>
                            </span>
                          )}

                          {currentUser?.uid !== post.userId && currentUser && (
                            <button 
                              onClick={() => handleFollow(post.userId)} 
                              className="text-xs font-semibold text-brand-accent uppercase tracking-wider hover:underline ml-1"
                            >
                              {dbUser?.following?.includes(post.userId) ? t('unfollow', 'Unfollow') : `+ ${t('follow', 'Follow')}`}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-1 text-xs text-brand-dark/55 flex-wrap font-normal">
                          {author?.handle && <span className="font-medium text-brand-dark/70">{author.handle}</span>}
                          {author?.handle && <span>•</span>}
                          <span>
                            {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'recently'}
                          </span>
                          {post.tag && (
                            <>
                              <span>•</span>
                              <span className="text-brand-accent font-semibold">{post.tag}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Copy Link Button */}
                      <button
                        onClick={() => handleCopyLink(post.id)}
                        className="text-brand-dark/45 hover:text-brand-dark p-2 rounded-full hover:bg-brand-muted/50 transition-colors"
                        title="Copy Link"
                      >
                        {copiedPostId === post.id ? (
                          <Check size={16} className="text-green-600" />
                        ) : (
                          <Share2 size={16} />
                        )}
                      </button>

                      {/* Pin to Top Publication (Author or Admin) */}
                      {(isMe || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => handleToggleTop(post.id, !post.isTop)}
                          className={`p-2 rounded-full hover:bg-brand-muted/50 transition-colors ${
                            post.isTop ? 'text-[#7A0000]' : 'text-brand-dark/40 hover:text-[#7A0000]'
                          }`}
                          title={post.isTop ? t('unpin_top', 'Снять с топа') : t('pin_top', 'Поднять в ТОП (В тренде)')}
                        >
                          <Flame size={16} className={post.isTop ? 'fill-[#7A0000]' : ''} />
                        </button>
                      )}

                      {/* Delete button or 24h locked badge */}
                      {(() => {
                        const isMe = currentUser?.uid === post.userId;
                        const postMillis = getTimestampMillis(post.createdAt);
                        const ageHours = postMillis > 0 ? (Date.now() - postMillis) / (1000 * 60 * 60) : 0;
                        const isLockedFromDeletion = isMe && !isAdmin && ageHours < 24;

                        if (isLockedFromDeletion) {
                          const rem = Math.ceil(24 - ageHours);
                          return (
                            <span 
                              className="inline-flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full"
                              title={`Post is locked for 24h (${rem}h remaining)`}
                            >
                              <Lock size={10} />
                              <span>24h lock</span>
                            </span>
                          );
                        }

                        if (isMe || isAdmin) {
                          return (
                            <button 
                              onClick={() => handleDeletePost(post.id, post.createdAt, post.userId)} 
                              className="text-brand-dark/40 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-brand-muted/50" 
                              title="Delete post"
                            >
                              <Trash2 size={16} />
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  {/* Post Content */}
                  {post.content && (
                    <p className="text-sm sm:text-base font-normal text-brand-dark mb-4 whitespace-pre-wrap leading-relaxed break-words">
                      {post.content}
                    </p>
                  )}
                  
                  {/* Post Media: Video or Multi-Photo Gallery Carousel */}
                  {post.videoUrl ? (
                    <FeedPostVideoPlayer
                      videoUrl={post.videoUrl}
                      postId={post.id}
                      onLike={handleLike}
                      isLiked={isLiked}
                    />
                  ) : (() => {
                    const postImages = post.images && Array.isArray(post.images) && post.images.length > 0
                      ? post.images
                      : (post.imageUrl ? [post.imageUrl] : []);
                    return postImages.length > 0 ? (
                      <FeedPostGallery
                        images={postImages}
                        postId={post.id}
                        onLike={handleLike}
                        isLiked={isLiked}
                      />
                    ) : null;
                  })()}

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-3.5 border-t border-brand-dark/[0.06] text-brand-dark">
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => handleLike(post.id)} 
                        className={`flex items-center gap-1.5 transition-all hover:text-red-500 ${isLiked ? 'text-red-500' : 'text-brand-dark/70'}`}
                      >
                        <Heart 
                          size={19} 
                          fill={isLiked ? "currentColor" : "none"} 
                          className={`transition-transform active:scale-75 ${isLiked ? 'scale-110' : ''}`} 
                        />
                        <span className="font-semibold text-xs sm:text-sm">{post.likesCount || 0}</span>
                      </button>

                      <button 
                        onClick={() => setSelectedPost(selectedPost?.id === post.id ? null : post)} 
                        className={`flex items-center gap-1.5 hover:text-brand-accent transition-colors ${selectedPost?.id === post.id ? 'text-brand-accent' : 'text-brand-dark/70'}`}
                      >
                        <MessageCircle size={19} />
                        <span className="font-semibold text-xs sm:text-sm">{post.commentsCount || 0}</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleCopyLink(post.id)}
                      className="text-xs font-semibold uppercase tracking-wider text-brand-dark/60 hover:text-brand-accent flex items-center gap-1.5 transition-colors"
                    >
                      {copiedPostId === post.id ? t('copied', 'Copied!') : t('copy_post_link', 'Share')}
                    </button>
                  </div>

                  {/* Comments Box */}
                  {selectedPost?.id === post.id && (
                    <div className="mt-5 border-t border-brand-dark/[0.08] pt-5">
                      <h4 className="font-display font-semibold uppercase tracking-wider text-brand-dark mb-3 text-xs">
                        {t('comments', 'Comments')} ({comments.length})
                      </h4>

                      <div className="space-y-2.5 mb-4">
                        {comments.length === 0 ? (
                          <p className="text-xs text-brand-dark/50 italic py-2">
                            No comments yet. Be the first to start the discussion!
                          </p>
                        ) : (
                          comments.map(comment => {
                            const commentAuthor = authorsInfo[comment.userId];
                            return (
                              <div key={comment.id} className="bg-brand-muted/20 p-3.5 rounded-2xl border border-brand-dark/[0.06]">
                                <div className="flex justify-between items-start mb-1">
                                  <div className="font-semibold text-xs text-brand-dark flex items-center gap-1.5">
                                    <Link to={getUserProfileLink(commentAuthor, comment.userId)} className="hover:text-brand-accent">
                                      {commentAuthor?.name || 'Unknown User'}
                                    </Link>
                                    {commentAuthor?.hasGoldenNeedle && (
                                      <GoldenNeedleBadge size="xs" />
                                    )}
                                    {commentAuthor?.hasModelBadge && (
                                      <ModelVerifiedBadge size="xs" />
                                    )}
                                    {commentAuthor?.subscriptionTier === 'elite' && (
                                      <span className="text-[9px] bg-stone-900 text-amber-300 border border-amber-400/30 font-mono font-bold uppercase px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                        <Crown size={9} className="text-amber-400" /> ELITE
                                      </span>
                                    )}
                                    {commentAuthor?.subscriptionTier === 'pro' && (
                                      <span className="text-[9px] bg-brand-accent text-white font-mono font-bold uppercase px-1.5 py-0.5 rounded-full">
                                        PRO
                                      </span>
                                    )}
                                  </div>
                                  {(currentUser?.uid === comment.userId || isAdmin) && (
                                    <button 
                                      onClick={() => handleDeleteComment(comment.id, post.id)} 
                                      className="text-brand-dark/40 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                                <p className="font-normal text-brand-dark text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                                  {comment.content}
                                </p>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {currentUser ? (
                        <form onSubmit={handleComment} className="flex gap-2">
                          <input 
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={t('write_comment', "Write a comment...")}
                            className="flex-1 bg-brand-muted/25 border border-brand-dark/[0.08] rounded-full px-4 py-2 text-xs sm:text-sm outline-none focus:bg-white focus:border-brand-accent/40 focus:ring-1 focus:ring-brand-accent/20 transition-all text-brand-dark"
                          />
                          <button 
                            type="submit" 
                            disabled={isSubmitting || !newComment.trim()} 
                            className="bg-brand-accent text-white px-5 py-2 rounded-full hover:bg-brand-dark transition-all disabled:opacity-50 font-semibold uppercase text-xs shadow-xs"
                          >
                            <Send size={14} />
                          </button>
                        </form>
                      ) : (
                        <div className="p-3 bg-brand-muted/30 rounded-2xl text-xs text-center text-brand-dark/75">
                          <Link to="/login" className="text-brand-accent font-semibold underline uppercase">
                            Log in
                          </Link> to leave a reply
                        </div>
                      )}
                    </div>
                  )}
                </motion.article>
              );
            })}
          </div>
        )}
      </div>

      {/* Pro Video Upgrade Modal */}
      <AnimatePresence>
        {showProVideoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowProVideoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="bg-white border-2 border-brand-dark rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-center relative overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setShowProVideoModal(false)}
                className="absolute top-4 right-4 text-brand-dark/40 hover:text-brand-dark p-2 rounded-full hover:bg-brand-light transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="w-14 h-14 bg-gradient-to-tr from-amber-500 to-amber-200 text-brand-dark rounded-2xl flex items-center justify-center mx-auto shadow-md">
                <Crown size={28} className="fill-brand-dark" />
              </div>

              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                  FFAZ PRO & ELITE EXCLUSIVE
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-brand-dark mt-2.5">
                  Публикация видео в ленте
                </h3>
                <p className="text-xs sm:text-sm text-brand-dark/70 mt-2 leading-relaxed font-sans">
                  Загрузка видеофайлов (MP4, WebM до 80MB) и прикрепление внешних ссылок на видео (YouTube / Vimeo) доступны эксклюзивно для пользователей с тарифами Pro и Elite.
                </p>
              </div>

              <div className="bg-brand-muted/40 rounded-2xl p-4 border border-brand-dark/[0.08] text-left text-xs font-mono space-y-2">
                <div className="flex items-center gap-2 text-brand-dark">
                  <Check size={14} className="text-green-600 shrink-0" />
                  <span>Прямые видеоролики и превью в ленте</span>
                </div>
                <div className="flex items-center gap-2 text-brand-dark">
                  <Check size={14} className="text-green-600 shrink-0" />
                  <span>До 5–10 публикаций в день вместо 1</span>
                </div>
                <div className="flex items-center gap-2 text-brand-dark">
                  <Check size={14} className="text-green-600 shrink-0" />
                  <span>Доступ в закрытый Pro Lounge дизайнеров</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowProVideoModal(false);
                    navigate('/plans');
                  }}
                  className="flex-1 bg-brand-accent hover:bg-brand-dark text-white py-3 px-5 rounded-full font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Повысить тариф</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowProVideoModal(false)}
                  className="py-3 px-5 border border-brand-dark/20 text-brand-dark hover:bg-brand-light rounded-full font-mono text-xs font-semibold uppercase transition-colors cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
