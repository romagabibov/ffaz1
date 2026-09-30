import { getTimestampMillis } from './dateUtils';

export const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface DailyQuotaStatus {
  tierName: string;
  limit: number;
  sentCount: number;
  remainingCount: number;
  isLimitReached: boolean;
  isAdmin: boolean;
  nextResetTimestamp: number | null; // epoch ms when the next message slot unlocks (message publication time + 24h)
  resetAtFormatted: string; // e.g. "завтра в 02:00" or "сегодня в 14:30"
  timeUntilResetLabel: string; // e.g. "через 16 ч. 12 мин."
}

/**
 * Checks whether user has an active paid subscription (verifying expiration timestamp)
 */
export function isSubscriptionActive(dbUser: any): boolean {
  if (!dbUser) return false;
  if (dbUser.role === 'superadmin' || dbUser.role === 'admin') {
    return true;
  }
  const tier = String(dbUser.subscriptionTier || 'free').toLowerCase();
  if (tier === 'free' || tier === 'guest' || !tier) {
    return false;
  }
  if (['pro', 'elite', 'vip', 'business', 'creator'].includes(tier)) {
    const now = Date.now();
    if (dbUser.subscriptionValidUntil && Number(dbUser.subscriptionValidUntil) < now) {
      return false;
    }
    if (dbUser.subscriptionExpiresAt && Number(dbUser.subscriptionExpiresAt) < now) {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * Returns daily message quota based on subscription tier:
 * - Free / Guest / None: 1 message per 24 hours from publication moment
 * - Pro: 5 messages per 24 hours from publication moment
 * - Elite: Unlimited (Infinity)
 * - Superadmin / Admin: Unlimited (Infinity)
 */
export function getDailyLiveMessageLimit(dbUser: any): number {
  if (dbUser?.role === 'superadmin' || dbUser?.role === 'admin') {
    return Infinity;
  }
  if (!isSubscriptionActive(dbUser)) {
    return 1;
  }
  const tier = String(dbUser?.subscriptionTier || 'free').toLowerCase();
  if (tier === 'elite' || tier === 'vip' || tier === 'business') {
    return Infinity;
  }
  if (tier === 'pro' || tier === 'creator') {
    return 5;
  }
  return 1;
}

/**
 * Returns human-readable tier label
 */
export function getTierDisplayLabel(dbUser: any): string {
  if (dbUser?.role === 'superadmin' || dbUser?.role === 'admin') {
    return 'Admin';
  }
  if (!isSubscriptionActive(dbUser)) {
    return 'FFAZ Free';
  }
  const tier = String(dbUser?.subscriptionTier || 'free').toLowerCase();
  if (tier === 'elite' || tier === 'vip' || tier === 'business') {
    return 'FFAZ Elite VIP';
  }
  if (tier === 'pro' || tier === 'creator') {
    return 'FFAZ Pro';
  }
  return 'FFAZ Free';
}

/**
 * Formats epoch ms into human-readable relative label:
 * If nextResetTimestamp is today: "сегодня в 14:00"
 * If nextResetTimestamp is tomorrow: "завтра в 02:00"
 */
export function formatResetTargetTime(timestamp: number, now: number = Date.now()): string {
  const targetDate = new Date(timestamp);
  const nowDate = new Date(now);

  const timeStr = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isSameDay = targetDate.getFullYear() === nowDate.getFullYear() &&
    targetDate.getMonth() === nowDate.getMonth() &&
    targetDate.getDate() === nowDate.getDate();

  if (isSameDay) {
    return `сегодня в ${timeStr}`;
  }

  const tomorrow = new Date(nowDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = targetDate.getFullYear() === tomorrow.getFullYear() &&
    targetDate.getMonth() === tomorrow.getMonth() &&
    targetDate.getDate() === tomorrow.getDate();

  if (isTomorrow) {
    return `завтра в ${timeStr}`;
  }

  return `${targetDate.toLocaleDateString([], { day: 'numeric', month: 'short' })} в ${timeStr}`;
}

/**
 * Formats duration until target timestamp in hours/minutes/seconds
 */
export function formatTimeUntilTimestamp(targetMillis: number, now: number = Date.now()): string {
  const diff = Math.max(0, targetMillis - now);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `через ${hours} ч. ${minutes} мин.`;
  }
  if (minutes > 0) {
    return `через ${minutes} мин.`;
  }
  return `через ${Math.max(1, seconds)} сек.`;
}

/**
 * Returns all active items for user published within the rolling 24-hour window, sorted oldest to newest.
 */
export function getActive24hUserItems(
  items: Array<{ createdAt: any; userId?: string }>,
  currentUserId?: string,
  now: number = Date.now()
): Array<{ item: { createdAt: any; userId?: string }; timestamp: number }> {
  if (!currentUserId || !items || items.length === 0) return [];
  const cutoff = now - ROLLING_WINDOW_MS;

  const validItems: Array<{ item: { createdAt: any; userId?: string }; timestamp: number }> = [];

  for (const item of items) {
    if (item.userId !== currentUserId) continue;
    const rawTime = getTimestampMillis(item.createdAt);
    // If createdAt is still pending from local Firestore write, treat as current timestamp
    const timestamp = rawTime > 0 ? rawTime : now;
    // Active if published within the rolling 24-hour window
    if (timestamp > cutoff) {
      validItems.push({ item, timestamp });
    }
  }

  // Sort ascending (oldest first)
  validItems.sort((a, b) => a.timestamp - b.timestamp);
  return validItems;
}

/**
 * Counts how many items a user published within the rolling 24h window from the moment of publication.
 */
export function countDailyUserItems(
  items: Array<{ createdAt: any; userId?: string }>,
  currentUserId?: string,
  now: number = Date.now()
): number {
  return getActive24hUserItems(items, currentUserId, now).length;
}

/**
 * Computes full rolling 24-hour quota evaluation starting from post publication moment
 */
export function evaluateDailyQuota(
  dbUser: any,
  currentUserId?: string,
  items: Array<{ createdAt: any; userId?: string }> = [],
  now: number = Date.now()
): DailyQuotaStatus {
  const isAdmin = Boolean(dbUser?.role === 'superadmin' || dbUser?.role === 'admin');
  const limit = getDailyLiveMessageLimit(dbUser);
  const tierName = getTierDisplayLabel(dbUser);

  if (isAdmin || limit === Infinity) {
    return {
      tierName,
      limit: Infinity,
      sentCount: 0,
      remainingCount: Infinity,
      isLimitReached: false,
      isAdmin: true,
      nextResetTimestamp: null,
      resetAtFormatted: '',
      timeUntilResetLabel: ''
    };
  }

  const activeItems = getActive24hUserItems(items, currentUserId, now);
  const sentCount = activeItems.length;
  const isLimitReached = sentCount >= limit;
  const remainingCount = Math.max(0, limit - sentCount);

  let nextResetTimestamp: number | null = null;
  let resetAtFormatted = '';
  let timeUntilResetLabel = '';

  if (activeItems.length > 0) {
    // When limit is reached, next slot unlocks 24 hours after the oldest message in the active quota
    const relevantIndex = isLimitReached ? (activeItems.length - limit) : 0;
    const oldestRelevantItem = activeItems[Math.max(0, relevantIndex)];
    if (oldestRelevantItem) {
      nextResetTimestamp = oldestRelevantItem.timestamp + ROLLING_WINDOW_MS;
      resetAtFormatted = formatResetTargetTime(nextResetTimestamp, now);
      timeUntilResetLabel = formatTimeUntilTimestamp(nextResetTimestamp, now);
    }
  }

  return {
    tierName,
    limit,
    sentCount,
    remainingCount,
    isLimitReached,
    isAdmin: false,
    nextResetTimestamp,
    resetAtFormatted,
    timeUntilResetLabel
  };
}
