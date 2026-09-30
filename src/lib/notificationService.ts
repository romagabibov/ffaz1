import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocs, 
  writeBatch,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { AppNotification, NotificationType } from '../types';

export const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

export interface CreateNotificationParams {
  userId: string; // Recipient user ID
  type: NotificationType;
  fromUserId?: string;
  fromUserName?: string;
  fromUserAvatar?: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  title?: string;
  message?: string;
  link?: string;
  targetId?: string;
  metadata?: Record<string, any>;
}

/**
 * Creates a notification in Firestore.
 * Note: Direct chat messages are handled natively via device notification shade & conversations,
 * and are deliberately excluded from this collection.
 */
export async function createNotification(params: CreateNotificationParams): Promise<string | null> {
  const senderId = params.fromUserId || params.senderId;
  const senderName = params.fromUserName || params.senderName;
  const senderAvatar = params.fromUserAvatar || params.senderAvatar;

  // Do not send notification to oneself
  if (senderId && senderId === params.userId) {
    return null;
  }

  // Direct chat messages go to device notification shade only, not here
  if (params.type === 'message') {
    return null;
  }

  try {
    const notifsRef = collection(db, 'notifications');
    const newDoc = doc(notifsRef);
    const notificationData: Record<string, any> = {
      userId: params.userId,
      type: params.type,
      read: false,
      createdAt: Date.now(),
      fromUserId: senderId || 'system',
      fromUserName: senderName || 'System',
    };

    if (senderAvatar) notificationData.fromUserAvatar = senderAvatar;
    if (params.title) notificationData.title = params.title;
    if (params.message) notificationData.message = params.message;
    if (params.link) notificationData.link = params.link;
    if (params.targetId) notificationData.targetId = params.targetId;
    if (params.metadata) notificationData.metadata = params.metadata;

    await setDoc(newDoc, notificationData);
    return newDoc.id;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

/**
 * Subscribes to real-time activity and system notifications for a given user within the last 15 days.
 * Message notifications are excluded so they appear exclusively in the device notification shade and chat.
 */
export function subscribeToUserNotifications(
  userId: string,
  callback: (notifications: AppNotification[]) => void,
  daysLimit: number = 15
) {
  const cutoffTime = Date.now() - daysLimit * 24 * 60 * 60 * 1000;
  const notifsRef = collection(db, 'notifications');
  
  const q = query(
    notifsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(100)
  );

  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs
      .map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as AppNotification[];

    // Filter strictly by the 15-day window and exclude direct chat messages
    const recentItems = items.filter(n => n.createdAt >= cutoffTime && n.type !== 'message');
    callback(recentItems);
  }, (err) => {
    console.error('Error subscribing to notifications:', err);
    // Fallback: simpler query if index is needed
    const fallbackQ = query(
      notifsRef,
      where('userId', '==', userId)
    );
    return onSnapshot(fallbackQ, (snapshot) => {
      const items = snapshot.docs
        .map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as AppNotification[];
      
      const filtered = items
        .filter(n => n.createdAt >= cutoffTime && n.type !== 'message')
        .sort((a, b) => b.createdAt - a.createdAt);
      callback(filtered);
    });
  });
}

/**
 * Marks a specific notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, { read: true });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
}

/**
 * Marks all unread notifications for a user as read
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const notifsRef = collection(db, 'notifications');
    const q = query(
      notifsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(d.ref, { read: true });
    });
    await batch.commit();
  } catch (error) {
    console.error('Failed to mark all as read:', error);
  }
}

/**
 * Deletes a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Failed to delete notification:', error);
  }
}

/**
 * Clears all read notifications for a user
 */
export async function clearReadNotifications(userId: string): Promise<void> {
  try {
    const notifsRef = collection(db, 'notifications');
    const q = query(
      notifsRef,
      where('userId', '==', userId),
      where('read', '==', true)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (error) {
    console.error('Failed to clear read notifications:', error);
  }
}
