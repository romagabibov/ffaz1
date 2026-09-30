import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocs,
  serverTimestamp,
  increment,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from './firebase';
import { Conversation, ChatMessage, ParticipantDetail, User } from '../types';

/**
 * Generate a deterministic ID for a 1-on-1 conversation between two users
 */
export function getConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

/**
 * Get or create a direct conversation between two users with request workflow
 */
export async function getOrCreateConversation(
  currentUser: { 
    uid: string; 
    displayName?: string | null; 
    email?: string | null; 
    photoURL?: string | null; 
    role?: string;
    username?: string;
    handle?: string;
    subscriptionTier?: string;
    isDesigner?: boolean;
    hasGoldenNeedle?: boolean;
  },
  targetUser: { 
    id: string; 
    name: string; 
    email: string; 
    avatarUrl?: string; 
    role?: string; 
    headline?: string;
    username?: string;
    handle?: string;
    subscriptionTier?: string;
    isDesigner?: boolean;
    hasGoldenNeedle?: boolean;
  },
  initialStatus: 'pending' | 'accepted' = 'pending',
  isDesignerTarget: boolean = false
): Promise<string> {
  const conversationId = getConversationId(currentUser.uid, targetUser.id);
  const convRef = doc(db, 'conversations', conversationId);
  const convSnap = await getDoc(convRef);

  const currentHandle = currentUser.handle || (currentUser.username ? `@${currentUser.username}` : '');
  const targetHandle = targetUser.handle || (targetUser.username ? `@${targetUser.username}` : '');

  const currentDetail: ParticipantDetail = {
    id: currentUser.uid,
    name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
    email: currentUser.email || '',
    avatarUrl: currentUser.photoURL || '',
    role: currentUser.role || 'user',
    username: currentUser.username || '',
    handle: currentHandle,
    subscriptionTier: currentUser.subscriptionTier || 'free',
    isDesigner: Boolean(currentUser.isDesigner),
    hasGoldenNeedle: Boolean(currentUser.hasGoldenNeedle)
  };

  const targetDetail: ParticipantDetail = {
    id: targetUser.id,
    name: targetUser.name || 'User',
    email: targetUser.email || '',
    avatarUrl: targetUser.avatarUrl || '',
    role: targetUser.role || 'user',
    headline: targetUser.headline || '',
    username: targetUser.username || '',
    handle: targetHandle,
    subscriptionTier: targetUser.subscriptionTier || 'free',
    isDesigner: Boolean(targetUser.isDesigner),
    hasGoldenNeedle: Boolean(targetUser.hasGoldenNeedle)
  };

  if (!convSnap.exists()) {
    const isPriority = currentUser.subscriptionTier === 'pro' || currentUser.subscriptionTier === 'elite' || currentUser.role === 'admin' || currentUser.role === 'superadmin';
    const newConv: Conversation = {
      id: conversationId,
      participants: [currentUser.uid, targetUser.id],
      participantDetails: {
        [currentUser.uid]: currentDetail,
        [targetUser.id]: targetDetail
      },
      status: initialStatus,
      requestedBy: currentUser.uid,
      recipientId: targetUser.id,
      isPriorityRequest: isPriority,
      targetIsDesigner: isDesignerTarget || Boolean(targetUser.isDesigner || targetUser.hasGoldenNeedle),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      unreadCounts: {
        [currentUser.uid]: 0,
        [targetUser.id]: 0
      }
    };
    await setDoc(convRef, newConv);
  } else {
    // Refresh participant details if needed and remove currentUser from deletedBy if they are starting the chat again
    const existing = convSnap.data() as Conversation;
    const updatedDetails = {
      ...existing.participantDetails,
      [currentUser.uid]: { ...existing.participantDetails?.[currentUser.uid], ...currentDetail },
      [targetUser.id]: { ...existing.participantDetails?.[targetUser.id], ...targetDetail }
    };
    const updatedDeletedBy = (existing.deletedBy || []).filter((id) => id !== currentUser.uid);
    await updateDoc(convRef, { 
      participantDetails: updatedDetails,
      deletedBy: updatedDeletedBy
    });
  }

  return conversationId;
}

/**
 * Accept a pending conversation request
 */
export async function acceptConversationRequest(conversationId: string): Promise<void> {
  const convRef = doc(db, 'conversations', conversationId);
  await updateDoc(convRef, {
    status: 'accepted',
    updatedAt: Date.now()
  });
}

/**
 * Decline a pending conversation request
 */
export async function declineConversationRequest(conversationId: string): Promise<void> {
  const convRef = doc(db, 'conversations', conversationId);
  await updateDoc(convRef, {
    status: 'declined',
    updatedAt: Date.now()
  });
}

/**
 * Send a message within a conversation
 */
export async function sendChatMessage(
  conversationId: string,
  sender: { uid: string; name: string; avatarUrl?: string },
  text: string,
  recipientId: string,
  imageUrl?: string,
  audioData?: { audioUrl: string; audioDuration: number; waveform?: number[] }
): Promise<void> {
  if (!text.trim() && !imageUrl && !audioData?.audioUrl) return;

  const now = Date.now();
  const messagesCol = collection(db, 'conversations', conversationId, 'messages');
  
  const messageData: any = {
    conversationId,
    senderId: sender.uid,
    senderName: sender.name,
    senderAvatarUrl: sender.avatarUrl || '',
    text: text.trim(),
    imageUrl: imageUrl || '',
    createdAt: now,
    read: false,
    readBy: [sender.uid],
    reactions: {}
  };

  if (audioData?.audioUrl) {
    messageData.audioUrl = audioData.audioUrl;
    messageData.audioDuration = audioData.audioDuration || 0;
    if (audioData.waveform && Array.isArray(audioData.waveform)) {
      messageData.waveform = audioData.waveform.slice(0, 50);
    }
  }

  await addDoc(messagesCol, messageData);

  // Determine snippet for lastMessage
  let lastMessageSnippet = text.trim();
  if (audioData?.audioUrl) {
    const durSec = Math.round(audioData.audioDuration || 0);
    const min = Math.floor(durSec / 60);
    const sec = durSec % 60;
    const durStr = `${min}:${String(sec).padStart(2, '0')}`;
    lastMessageSnippet = `🎤 Voice message (${durStr})`;
  } else if (imageUrl && !text.trim()) {
    lastMessageSnippet = '📷 Photo';
  }

  // Update conversation lastMessage, updatedAt and increment recipient unread count
  // Note: Direct messages arrive natively in the device notification shade & Messages tab,
  // without polluting the general in-app notifications section.
  const convRef = doc(db, 'conversations', conversationId);
  await updateDoc(convRef, {
    lastMessage: {
      text: lastMessageSnippet,
      senderId: sender.uid,
      senderName: sender.name,
      createdAt: now,
      readBy: [sender.uid]
    },
    updatedAt: now,
    [`unreadCounts.${recipientId}`]: increment(1)
  });
}

/**
 * Mark all messages in a conversation as read by the current user
 */
export async function markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  try {
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      [`unreadCounts.${userId}`]: 0
    });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
  }
}

/**
 * Toggle reaction emoji on a message
 */
export async function toggleMessageReaction(
  conversationId: string,
  messageId: string,
  userId: string,
  emoji: string
): Promise<void> {
  try {
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) return;

    const data = msgSnap.data();
    const reactions = data.reactions || {};
    const usersWithEmoji: string[] = reactions[emoji] || [];

    let updatedUsers: string[];
    if (usersWithEmoji.includes(userId)) {
      updatedUsers = usersWithEmoji.filter((id) => id !== userId);
    } else {
      updatedUsers = [...usersWithEmoji, userId];
    }

    const updatedReactions = { ...reactions };
    if (updatedUsers.length > 0) {
      updatedReactions[emoji] = updatedUsers;
    } else {
      delete updatedReactions[emoji];
    }

    await updateDoc(msgRef, { reactions: updatedReactions });
  } catch (error) {
    console.error('Error toggling reaction:', error);
  }
}

/**
 * Delete a single chat message (for me or for everyone / unsend)
 */
export async function deleteChatMessage(
  conversationId: string,
  messageId: string,
  mode: 'for_me' | 'for_everyone',
  userId: string
): Promise<void> {
  try {
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    if (mode === 'for_everyone') {
      try {
        await deleteDoc(msgRef);
      } catch {
        await updateDoc(msgRef, { deletedForEveryone: true });
      }
    } else {
      await updateDoc(msgRef, {
        deletedFor: arrayUnion(userId)
      });
    }
  } catch (error) {
    console.error('Error deleting chat message:', error);
    throw error;
  }
}

/**
 * Delete or hide a conversation for the user and clear previous history
 */
export async function deleteConversation(
  conversationId: string,
  userId: string
): Promise<void> {
  try {
    const convRef = doc(db, 'conversations', conversationId);
    const snap = await getDoc(convRef);
    if (!snap.exists()) return;
    
    const data = snap.data() as Conversation;
    const currentDeletedBy = data.deletedBy || [];
    const now = Date.now();
    const updatedClearedAt = {
      ...(data.clearedAt || {}),
      [userId]: now
    };
    
    // If the other participant also marked it as deleted, or only 1 participant left, delete the document
    const otherParticipant = (data.participants || []).find((p) => p !== userId);
    if (!otherParticipant || currentDeletedBy.includes(otherParticipant)) {
      await deleteDoc(convRef);
    } else {
      await updateDoc(convRef, {
        deletedBy: arrayUnion(userId),
        clearedAt: updatedClearedAt
      });
    }
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
}

/**
 * Block user in a conversation
 */
export async function blockUserInConversation(
  conversationId: string,
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  try {
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      blockedBy: arrayUnion(currentUserId)
    });

    const userRef = doc(db, 'users', currentUserId);
    try {
      await updateDoc(userRef, {
        blockedUsers: arrayUnion(targetUserId)
      });
    } catch {
      // User doc update optional if permissions restrict
    }
  } catch (error) {
    console.error('Error blocking user in conversation:', error);
    throw error;
  }
}

/**
 * Unblock user in a conversation
 */
export async function unblockUserInConversation(
  conversationId: string,
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  try {
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      blockedBy: arrayRemove(currentUserId)
    });

    const userRef = doc(db, 'users', currentUserId);
    try {
      await updateDoc(userRef, {
        blockedUsers: arrayRemove(targetUserId)
      });
    } catch {
      // User doc update optional
    }
  } catch (error) {
    console.error('Error unblocking user in conversation:', error);
    throw error;
  }
}
