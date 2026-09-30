import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocs,
  limit,
  doc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Conversation, ChatMessage, ParticipantDetail, User } from '../types';
import { 
  getOrCreateConversation, 
  sendChatMessage, 
  markConversationAsRead, 
  toggleMessageReaction,
  acceptConversationRequest,
  declineConversationRequest,
  deleteConversation,
  deleteChatMessage,
  blockUserInConversation,
  unblockUserInConversation
} from '../lib/chatService';
import { toast } from 'sonner';
import {
  playMessageSentSound,
  playMessageReceivedSound,
  playNotificationSound
} from '../lib/soundEffects';
import { 
  Send, 
  Image as ImageIcon, 
  Smile, 
  Search, 
  Edit, 
  ChevronLeft, 
  ChevronDown,
  ChevronUp,
  Calendar,
  Check, 
  CheckCheck, 
  Heart, 
  X, 
  User as UserIcon, 
  MessageSquare, 
  Sparkles,
  ExternalLink,
  Info,
  Clock,
  UserCheck,
  UserX,
  AtSign,
  AlertCircle,
  Bell,
  Lock,
  Crown,
  MoreVertical,
  MoreHorizontal,
  Trash2,
  Ban
} from 'lucide-react';
import VoiceMessagePlayer from '../components/VoiceMessagePlayer';
import VoiceMessageRecorder, { RecordedVoiceData } from '../components/VoiceMessageRecorder';
import { 
  getDeviceNotificationPermission, 
  requestDeviceNotificationPermission 
} from '../lib/deviceNotificationService';

const QUICK_EMOJIS = ['❤️', '🔥', '👏', '✨', '💼', '👗', '👍', '😍'];

function HighlightedMessageText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) {
    return <span className="font-normal whitespace-pre-wrap break-words">{text}</span>;
  }
  const cleanQ = query.trim();
  const escaped = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <span className="font-normal whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        part.toLowerCase() === cleanQ.toLowerCase() ? (
          <mark key={i} className="bg-amber-300 text-brand-dark rounded-xs px-0.5 font-semibold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

const getDateKey = (timestamp?: any): string => {
  if (!timestamp) return 'unknown';
  const millis = typeof timestamp === 'number' ? timestamp : timestamp?.toMillis ? timestamp.toMillis() : (timestamp?.seconds ? timestamp.seconds * 1000 : Date.now());
  const d = new Date(millis);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateGroupLabel = (dateKey: string, lang: string = 'ru'): string => {
  if (dateKey === 'unknown') return '';
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const targetTime = date.getTime();
  const todayTime = today.getTime();
  const yesterdayTime = yesterday.getTime();

  if (targetTime === todayTime) {
    if (lang === 'az') return 'Bu gün';
    if (lang === 'ru') return 'Сегодня';
    return 'Today';
  }

  if (targetTime === yesterdayTime) {
    if (lang === 'az') return 'Dünən';
    if (lang === 'ru') return 'Вчера';
    return 'Yesterday';
  }

  try {
    const isSameYear = date.getFullYear() === now.getFullYear();
    const locale = lang === 'az' ? 'az-AZ' : lang === 'ru' ? 'ru-RU' : 'en-US';
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      ...(isSameYear ? {} : { year: 'numeric' })
    });
  } catch {
    return dateKey;
  }
};

const formatMessageTime = (ts?: any): string => {
  if (!ts) return '';
  const millis = typeof ts === 'number' ? ts : ts?.toMillis ? ts.toMillis() : (ts?.seconds ? ts.seconds * 1000 : Date.now());
  const date = new Date(millis);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getLocalDeletedIds = (uid: string): string[] => {
  try {
    const raw = localStorage.getItem(`ffaz_deleted_convs_${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const addLocalDeletedId = (uid: string, convId: string) => {
  try {
    const current = getLocalDeletedIds(uid);
    if (!current.includes(convId)) {
      current.push(convId);
      localStorage.setItem(`ffaz_deleted_convs_${uid}`, JSON.stringify(current));
    }
  } catch {
    // ignore
  }
};

const removeLocalDeletedId = (uid: string, convId: string) => {
  try {
    const current = getLocalDeletedIds(uid);
    const updated = current.filter((id) => id !== convId);
    localStorage.setItem(`ffaz_deleted_convs_${uid}`, JSON.stringify(updated));
  } catch {
    // ignore
  }
};

const getLocalDeletedMessageIds = (uid: string, convId: string): string[] => {
  try {
    const raw = localStorage.getItem(`ffaz_del_msgs_${uid}_${convId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const addLocalDeletedMessageId = (uid: string, convId: string, msgId: string) => {
  try {
    const current = getLocalDeletedMessageIds(uid, convId);
    if (!current.includes(msgId)) {
      current.push(msgId);
      localStorage.setItem(`ffaz_del_msgs_${uid}_${convId}`, JSON.stringify(current));
    }
  } catch {
    // ignore
  }
};

export default function Messages() {
  const { t } = useTranslation();
  const { currentUser, dbUser, isAdmin } = useAuth();
  const ui = useUI();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isPremiumUser = Boolean(
    currentUser && (
      isAdmin ||
      dbUser?.role === 'admin' ||
      dbUser?.role === 'superadmin' ||
      (dbUser?.subscriptionTier && dbUser?.subscriptionTier !== 'free') ||
      dbUser?.hasGoldenNeedle ||
      dbUser?.hasDirectChat
    )
  );

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'requests'>('all');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewZoomImage, setPreviewZoomImage] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'block' | 'unblock' | 'delete';
    title: string;
    description: string;
    confirmLabel: string;
    confirmStyle: 'danger' | 'warning' | 'primary';
  } | null>(null);
  const [selectedMessageForAction, setSelectedMessageForAction] = useState<ChatMessage | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoadRef = useRef<boolean>(true);
  const previousMsgsCountRef = useRef<number>(0);

  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [hasNewMessagesWhileScrolledUp, setHasNewMessagesWhileScrolledUp] = useState(false);
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [showPushPrompt, setShowPushPrompt] = useState<boolean>(() => {
    return getDeviceNotificationPermission() === 'default';
  });

  const handleEnablePush = async () => {
    const granted = await requestDeviceNotificationPermission();
    if (granted) {
      setShowPushPrompt(false);
    }
  };

  // Group messages by Date (WhatsApp & Instagram Direct format)
  const messageGroups = useMemo(() => {
    interface MessageDateGroup {
      dateKey: string;
      dateLabel: string;
      messages: ChatMessage[];
    }
    const groups: MessageDateGroup[] = [];
    let currentKey = '';
    let currentGroup: MessageDateGroup | null = null;

    messages.forEach((msg) => {
      const key = getDateKey(msg.createdAt);
      if (key !== currentKey || !currentGroup) {
        currentKey = key;
        currentGroup = {
          dateKey: key,
          dateLabel: formatDateGroupLabel(key, (t as any).language || 'ru'),
          messages: []
        };
        groups.push(currentGroup);
      }
      currentGroup.messages.push(msg);
    });

    return groups;
  }, [messages, t]);

  // Matching message IDs for in-chat search
  const matchingMessageIds = useMemo(() => {
    if (!chatSearchQuery.trim()) return [];
    const q = chatSearchQuery.trim().toLowerCase();
    return messages
      .filter((m) => m.text?.toLowerCase().includes(q))
      .map((m) => m.id);
  }, [messages, chatSearchQuery]);

  // When match index changes, scroll to the matched message
  useEffect(() => {
    if (matchingMessageIds.length > 0 && matchingMessageIds[activeMatchIndex]) {
      const el = document.getElementById(`msg-${matchingMessageIds[activeMatchIndex]}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeMatchIndex, matchingMessageIds]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const scrolledUp = distanceToBottom > 120;
    setIsScrolledUp(scrolledUp);
    if (!scrolledUp) {
      setHasNewMessagesWhileScrolledUp(false);
    }
  };

  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
      setHasNewMessagesWhileScrolledUp(false);
    }
  };

  // Reset search and scroll state on conversation switch
  useEffect(() => {
    setIsChatSearchOpen(false);
    setShowChatOptions(false);
    setChatSearchQuery('');
    setActiveMatchIndex(0);
    setIsScrolledUp(false);
    setHasNewMessagesWhileScrolledUp(false);
  }, [activeConversationId]);

  // Reset initial load state when changing conversation
  useEffect(() => {
    isInitialLoadRef.current = true;
    previousMsgsCountRef.current = 0;
  }, [activeConversationId]);

  // Handle URL query parameters for direct messaging
  useEffect(() => {
    const targetUserId = searchParams.get('userId');
    const targetUserName = searchParams.get('name');
    const targetHandle = searchParams.get('handle') || searchParams.get('username');
    const directConvId = searchParams.get('conversationId');

    if (directConvId) {
      if (currentUser) {
        removeLocalDeletedId(currentUser.uid, directConvId);
      }
      setActiveConversationId(directConvId);
      return;
    }

    if (targetUserId && currentUser && targetUserId !== currentUser.uid) {
      const initDirectChat = async () => {
        try {
          const isTargetDesignerParam = Boolean(searchParams.get('designer') === 'true');
          const convId = await getOrCreateConversation(
            {
              uid: currentUser.uid,
              displayName: dbUser?.name || currentUser.displayName || 'Fashionista',
              email: currentUser.email,
              photoURL: dbUser?.avatarUrl || currentUser.photoURL,
              role: dbUser?.role || 'user',
              username: dbUser?.username,
              handle: dbUser?.handle,
              subscriptionTier: dbUser?.subscriptionTier || 'free',
              isDesigner: Boolean(dbUser?.isDesigner),
              hasGoldenNeedle: Boolean(dbUser?.hasGoldenNeedle)
            },
            {
              id: targetUserId,
              name: targetUserName || 'Fashion Community Member',
              email: '',
              avatarUrl: searchParams.get('avatar') || '',
              role: 'user',
              username: targetHandle?.replace(/^@+/, ''),
              handle: targetHandle ? (targetHandle.startsWith('@') ? targetHandle : `@${targetHandle}`) : undefined,
              subscriptionTier: 'free',
              isDesigner: isTargetDesignerParam,
              hasGoldenNeedle: isTargetDesignerParam
            },
            'pending', // Starts as request
            isTargetDesignerParam
          );
          removeLocalDeletedId(currentUser.uid, convId);
          setActiveConversationId(convId);
          setSearchParams({ conversationId: convId });
        } catch (err) {
          console.error('Failed to init direct chat from URL:', err);
        }
      };
      initDirectChat();
    }
  }, [searchParams, currentUser, dbUser]);

  // Subscribe to real-time conversations
  useEffect(() => {
    if (!currentUser) return;

    setLoadingConversations(true);
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const localDeleted = currentUser ? getLocalDeletedIds(currentUser.uid) : [];
      const convs = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((c: any) => !c.deletedBy?.includes(currentUser.uid) && !localDeleted.includes(c.id)) as Conversation[];

      setConversations(convs);
      setLoadingConversations(false);
    }, (error) => {
      console.error('Conversations subscription error:', error);
      setLoadingConversations(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Subscribe to real-time messages in active conversation
  useEffect(() => {
    if (!activeConversationId || !currentUser) {
      setMessages([]);
      return;
    }

    // Mark as read
    markConversationAsRead(activeConversationId, currentUser.uid);

    const q = query(
      collection(db, 'conversations', activeConversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const localDelMsgIds = getLocalDeletedMessageIds(currentUser.uid, activeConversationId);
      const userClearedAt = activeConversation?.clearedAt?.[currentUser.uid] || Number(localStorage.getItem(`ffaz_cleared_at_${currentUser.uid}_${activeConversationId}`)) || 0;

      const allMsgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];

      const msgs = allMsgs.filter((msg) => {
        if (msg.deletedForEveryone) return false;
        if (msg.deletedFor?.includes(currentUser.uid)) return false;
        if (localDelMsgIds.includes(msg.id)) return false;
        if (userClearedAt && msg.createdAt <= userClearedAt) return false;
        return true;
      });
      
      // Sound trigger for new incoming message
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      } else if (msgs.length > previousMsgsCountRef.current) {
        const newestMsg = msgs[msgs.length - 1];
        if (newestMsg && newestMsg.senderId !== currentUser.uid) {
          playMessageReceivedSound();
        }
      }
      previousMsgsCountRef.current = msgs.length;

      setMessages(msgs);
      
      // Mark as read again when new messages arrive
      markConversationAsRead(activeConversationId, currentUser.uid);
    }, (error) => {
      console.error('Messages subscription error:', error);
    });

    return () => unsubscribe();
  }, [activeConversationId, currentUser]);

  // Smart auto-scroll to bottom of messages
  useEffect(() => {
    if (!isScrolledUp) {
      const timer = setTimeout(() => {
        scrollToBottom(false);
      }, 60);
      return () => clearTimeout(timer);
    } else {
      setHasNewMessagesWhileScrolledUp(true);
    }
  }, [messages]);

  // Search users for new chat modal with handle support
  useEffect(() => {
    if (!userSearchQuery.trim() || !currentUser) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)));
        const allUsers = usersSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as User))
          .filter((u) => u.id !== currentUser.uid);

        const cleanQ = userSearchQuery.trim().toLowerCase().replace(/^@+/, '');
        const filtered = allUsers.filter(
          (u) =>
            u.username?.toLowerCase().includes(cleanQ) ||
            u.handle?.toLowerCase().includes(cleanQ) ||
            u.name?.toLowerCase().includes(cleanQ) ||
            u.email?.toLowerCase().includes(cleanQ) ||
            u.industry?.toLowerCase().includes(cleanQ) ||
            u.role?.toLowerCase().includes(cleanQ)
        );
        setSearchResults(filtered);
      } catch (err) {
        console.error('Error searching users:', err);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [userSearchQuery, currentUser]);

  const [directActiveConv, setDirectActiveConv] = useState<Conversation | null>(null);

  useEffect(() => {
    if (!activeConversationId) {
      setDirectActiveConv(null);
      return;
    }
    const found = conversations.find((c) => c.id === activeConversationId);
    if (found) {
      setDirectActiveConv(found);
    } else {
      const convRef = doc(db, 'conversations', activeConversationId);
      const unsub = onSnapshot(convRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Conversation;
          setDirectActiveConv(data);
        }
      });
      return () => unsub();
    }
  }, [activeConversationId, conversations]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || directActiveConv;

  const getOtherParticipant = (conv?: Conversation): ParticipantDetail => {
    if (!conv || !currentUser) {
      return { id: '', name: 'Fashionista', email: '' };
    }
    const otherId = conv.participants.find((id) => id !== currentUser.uid);
    if (!otherId || !conv.participantDetails?.[otherId]) {
      return { id: otherId || '', name: 'Member', email: '' };
    }
    return conv.participantDetails[otherId];
  };

  const otherUser = getOtherParticipant(activeConversation);

  const isTargetDesigner = Boolean(
    otherUser.isDesigner ||
    otherUser.hasGoldenNeedle ||
    activeConversation?.targetIsDesigner
  );

  // Incoming pending requests
  const incomingRequests = conversations.filter(c => {
    const isPending = c.status === 'pending';
    const isRecipient = c.recipientId === currentUser?.uid || (c.requestedBy && c.requestedBy !== currentUser?.uid);
    return isPending && isRecipient;
  });

  // Outgoing pending requests
  const outgoingRequests = conversations.filter(c => {
    const isPending = c.status === 'pending';
    const isSender = c.requestedBy === currentUser?.uid;
    return isPending && isSender;
  });

  // Active / Accepted conversations
  const acceptedConversations = conversations.filter(c => {
    const status = c.status || 'accepted';
    return status === 'accepted';
  });

  const isCurrentConvIncomingRequest = Boolean(
    activeConversation && 
    activeConversation.status === 'pending' && 
    (activeConversation.recipientId === currentUser?.uid || (activeConversation.requestedBy && activeConversation.requestedBy !== currentUser?.uid))
  );

  const isCurrentConvOutgoingPending = Boolean(
    activeConversation && 
    activeConversation.status === 'pending' && 
    activeConversation.requestedBy === currentUser?.uid
  );

  const isCurrentConvDeclined = activeConversation?.status === 'declined';

  const isBlockedByMe = Boolean(
    activeConversation?.blockedBy?.includes(currentUser?.uid || '') ||
    (dbUser?.blockedUsers && otherUser?.id && dbUser.blockedUsers.includes(otherUser.id))
  );

  const isBlockedByOther = Boolean(
    otherUser?.id && activeConversation?.blockedBy?.includes(otherUser.id)
  );

  const handleOpenBlockModal = () => {
    setShowChatOptions(false);
    if (!activeConversationId || !otherUser.id) return;
    if (isBlockedByMe) {
      setConfirmModal({
        isOpen: true,
        type: 'unblock',
        title: `Разблокировать пользователя?`,
        description: `Вы снова сможете отправлять и принимать сообщения от пользователя ${otherUser.name}.`,
        confirmLabel: 'Разблокировать',
        confirmStyle: 'primary'
      });
    } else {
      setConfirmModal({
        isOpen: true,
        type: 'block',
        title: `Заблокировать пользователя?`,
        description: `Вы действительно хотите заблокировать ${otherUser.name}? Вы и собеседник не сможете отправлять сообщения друг другу в этом чате. Вы сможете разблокировать его в любой момент.`,
        confirmLabel: 'Заблокировать',
        confirmStyle: 'warning'
      });
    }
  };

  const handleOpenDeleteModal = () => {
    setShowChatOptions(false);
    if (!activeConversationId) return;
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      title: 'Удалить этот чат?',
      description: `Диалог с ${otherUser.name} будет удален и скрыт из вашего списка сообщений. История переписки больше не будет отображаться.`,
      confirmLabel: 'Да, удалить чат',
      confirmStyle: 'danger'
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal || !activeConversationId || !currentUser) return;
    const modalType = confirmModal.type;
    const convId = activeConversationId;
    const targetId = otherUser.id;
    const targetName = otherUser.name;

    setConfirmModal(null);

    if (modalType === 'delete') {
      setIsDeletingChat(true);
      // Immediately remove from local storage & active state and mark history as cleared from now
      addLocalDeletedId(currentUser.uid, convId);
      localStorage.setItem(`ffaz_cleared_at_${currentUser.uid}_${convId}`, String(Date.now()));
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      setActiveConversationId(null);
      setSearchParams({});

      try {
        await deleteConversation(convId, currentUser.uid);
        toast.success('Чат успешно удален');
      } catch (err) {
        console.error('Error deleting conversation in Firestore:', err);
        toast.success('Чат скрыт из вашего списка');
      } finally {
        setIsDeletingChat(false);
      }
    } else if (modalType === 'block') {
      try {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? { ...c, blockedBy: [...(c.blockedBy || []), currentUser.uid] }
              : c
          )
        );
        await blockUserInConversation(convId, currentUser.uid, targetId);
        toast.info(`Пользователь ${targetName} заблокирован`);
      } catch (err) {
        console.error('Error blocking user:', err);
        toast.error('Не удалось заблокировать пользователя');
      }
    } else if (modalType === 'unblock') {
      try {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? { ...c, blockedBy: (c.blockedBy || []).filter((id) => id !== currentUser.uid) }
              : c
          )
        );
        await unblockUserInConversation(convId, currentUser.uid, targetId);
        toast.success(`Пользователь ${targetName} разблокирован`);
      } catch (err) {
        console.error('Error unblocking user:', err);
        toast.error('Не удалось разблокировать пользователя');
      }
    }
  };

  const handleDeleteMessage = async (msg: ChatMessage, mode: 'for_me' | 'for_everyone') => {
    if (!activeConversationId || !currentUser) return;
    setSelectedMessageForAction(null);

    // Optimistic UI update
    addLocalDeletedMessageId(currentUser.uid, activeConversationId, msg.id);
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));

    try {
      await deleteChatMessage(activeConversationId, msg.id, mode, currentUser.uid);
      if (mode === 'for_everyone') {
        toast.success('Отправка отменена (удалено у всех)');
      } else {
        toast.info('Сообщение удалено у вас');
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      toast.error('Не удалось удалить сообщение');
    }
  };

  const handleAcceptRequest = async () => {
    if (!activeConversationId) return;
    setIsProcessingRequest(true);
    try {
      await acceptConversationRequest(activeConversationId);
      playNotificationSound();
    } catch (err) {
      console.error('Failed to accept request:', err);
    } finally {
      setIsProcessingRequest(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!activeConversationId) return;
    setIsProcessingRequest(true);
    try {
      await declineConversationRequest(activeConversationId);
    } catch (err) {
      console.error('Failed to decline request:', err);
    } finally {
      setIsProcessingRequest(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser || !activeConversationId || isSending) return;

    if (isBlockedByMe) {
      toast.error('Вы заблокировали этого пользователя. Разблокируйте его для отправки сообщений.');
      return;
    }
    if (isBlockedByOther) {
      toast.error('Собеседник ограничил возможность отправки сообщений в этом чате.');
      return;
    }

    if ((!messageText.trim() && !selectedImage)) {
      return;
    }

    const textToSend = messageText;
    const imgToSend = selectedImage;

    setMessageText('');
    setSelectedImage(null);
    setShowEmojiPicker(false);
    setIsSending(true);

    try {
      const recipientId = activeConversation?.participants.find((id) => id !== currentUser.uid) || '';
      await sendChatMessage(
        activeConversationId,
        {
          uid: currentUser.uid,
          name: dbUser?.name || currentUser.displayName || 'Fashionista',
          avatarUrl: dbUser?.avatarUrl || currentUser.photoURL || ''
        },
        textToSend,
        recipientId,
        imgToSend || undefined
      );
      playMessageSentSound();
    } catch (err) {
      console.error('Failed to send message:', err);
      // Restore on failure
      setMessageText(textToSend);
      setSelectedImage(imgToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendVoice = async (voiceData: RecordedVoiceData) => {
    if (!activeConversationId || !currentUser || isSending) return;
    if (isBlockedByMe) {
      toast.error('Вы заблокировали этого пользователя. Разблокируйте его для отправки сообщений.');
      return;
    }
    if (isBlockedByOther) {
      toast.error('Собеседник ограничил возможность отправки сообщений в этом чате.');
      return;
    }
    setIsSending(true);
    try {
      const recipientId = activeConversation?.participants.find((id) => id !== currentUser.uid) || '';
      await sendChatMessage(
        activeConversationId,
        {
          uid: currentUser.uid,
          name: dbUser?.name || currentUser.displayName || 'Fashionista',
          avatarUrl: dbUser?.avatarUrl || currentUser.photoURL || ''
        },
        '',
        recipientId,
        undefined,
        {
          audioUrl: voiceData.audioUrl,
          audioDuration: voiceData.audioDuration,
          waveform: voiceData.waveform
        }
      );
      playMessageSentSound();
    } catch (err) {
      console.error('Failed to send voice message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleStartNewChat = async (targetUser: User) => {
    if (!currentUser) return;
    const isTargetUserDesigner = Boolean(
      targetUser.isDesigner ||
      targetUser.designerId ||
      targetUser.hasGoldenNeedle ||
      targetUser.designerVerificationStatus === 'approved' ||
      targetUser.industry === 'fashion_design' ||
      targetUser.industry === 'designer' ||
      targetUser.designerBrandName
    );

    // Free users can send up to 5 new conversation requests per 24 hours (including to designers)
    if (!isPremiumUser) {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const dailyCreatedCount = conversations.filter((c) => {
        const t = c.createdAt || 0;
        return c.requestedBy === currentUser.uid && t >= oneDayAgo;
      }).length;

      if (dailyCreatedCount >= 5) {
        ui.alert('На бесплатном тарифе Free доступно до 5 новых запросов на диалог в день. Чтобы отправлять неограниченное число новых запросов и писать дизайнерам с приоритетным статусом, перейдите на FFAZ Pro.');
        navigate('/plans');
        return;
      }
    }

    try {
      const targetHandle = targetUser.handle || (targetUser.username ? `@${targetUser.username}` : '');
      const convId = await getOrCreateConversation(
        {
          uid: currentUser.uid,
          displayName: dbUser?.name || currentUser.displayName || 'Fashionista',
          email: currentUser.email,
          photoURL: dbUser?.avatarUrl || currentUser.photoURL,
          role: dbUser?.role || 'user',
          username: dbUser?.username,
          handle: dbUser?.handle,
          subscriptionTier: dbUser?.subscriptionTier || 'free',
          isDesigner: Boolean(dbUser?.isDesigner),
          hasGoldenNeedle: Boolean(dbUser?.hasGoldenNeedle)
        },
        {
          id: targetUser.id,
          name: targetUser.designerBrandName || targetUser.brandName || targetUser.name || 'Fashion Community Member',
          email: targetUser.email || '',
          avatarUrl: targetUser.avatarUrl || '',
          role: targetUser.role || 'user',
          headline: targetUser.industry || targetUser.primaryGoal || '',
          username: targetUser.username,
          handle: targetHandle,
          subscriptionTier: targetUser.subscriptionTier || 'free',
          isDesigner: Boolean(targetUser.isDesigner),
          hasGoldenNeedle: Boolean(targetUser.hasGoldenNeedle)
        },
        'pending', // Creates as request
        isTargetUserDesigner
      );
      removeLocalDeletedId(currentUser.uid, convId);
      setIsNewChatOpen(false);
      setUserSearchQuery('');
      setActiveConversationId(convId);
      setSearchParams({ conversationId: convId });
    } catch (err) {
      console.error('Failed to start chat:', err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2.5 * 1024 * 1024) {
      alert('Please upload an image smaller than 2.5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const formatTimestamp = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Filter conversations based on current tab and search bar
  const displayedConversations = (activeTab === 'requests' 
    ? [...incomingRequests, ...outgoingRequests] 
    : acceptedConversations
  ).filter((c) => {
    const other = getOtherParticipant(c);
    const cleanSearch = searchQuery.toLowerCase().replace(/^@+/, '');
    return (
      other.name.toLowerCase().includes(cleanSearch) ||
      (other.username && other.username.toLowerCase().includes(cleanSearch)) ||
      (other.handle && other.handle.toLowerCase().includes(cleanSearch)) ||
      c.lastMessage?.text?.toLowerCase().includes(cleanSearch)
    );
  }).sort((a, b) => {
    // 1. In requests tab: prioritize PRO and ELITE priority requests at the top!
    if (activeTab === 'requests') {
      const aPriority = a.isPriorityRequest || false;
      const bPriority = b.isPriorityRequest || false;
      if (aPriority && !bPriority) return -1;
      if (!aPriority && bPriority) return 1;
    }
    // 2. Otherwise sort by latest interaction
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  if (!currentUser) {
    return (
      <div className="w-full min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl bg-brand-card border border-brand-dark/[0.08] p-8 text-center space-y-6 shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-brand-accent/5 border border-brand-accent/15 flex items-center justify-center text-brand-accent">
            <MessageSquare size={32} />
          </div>
          <div>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-brand-accent px-3 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
              PRIVATE MESSAGING
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-brand-dark mt-2.5">
              Direct Messages & Requests
            </h1>
            <p className="text-xs sm:text-sm text-brand-dark/65 font-normal mt-2 leading-relaxed">
              Connect directly with designers, models, recruiters, and applicants via their unique @handle across the Azerbaijan Fashion Network.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => navigate('/login')}
              className="bg-brand-dark text-white px-6 py-3 rounded-full font-semibold uppercase tracking-wider text-xs hover:bg-brand-accent transition-all shadow-xs"
            >
              Sign In to Access Chat
            </button>
            <Link
              to="/"
              className="bg-brand-light text-brand-dark px-6 py-3 rounded-full font-semibold uppercase tracking-wider text-xs border border-brand-dark/10 hover:border-brand-accent/30 hover:text-brand-accent transition-colors inline-flex items-center justify-center"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-700 h-full max-h-full min-h-0 flex flex-col bg-brand-light text-brand-dark overflow-hidden">
      {/* DIRECT CHAT WORKSPACE */}
      <div className="flex-1 w-full flex flex-col mx-auto h-full max-h-full min-h-0 px-0 sm:px-3 md:px-6 py-0 sm:py-2 md:py-3 max-w-[1600px] overflow-hidden">
        <div className="rounded-none sm:rounded-3xl border-0 sm:border border-brand-dark/[0.08] bg-brand-card flex flex-col md:flex-row overflow-hidden shadow-none sm:shadow-xs flex-1 h-full max-h-full min-h-0 w-full">
        
        {/* LEFT COLUMN: Conversation List (hidden on mobile if active chat open) */}
        <div className={`w-full md:w-80 lg:w-[350px] border-r border-brand-dark/[0.08] flex flex-col bg-brand-light/30 h-full max-h-full min-h-0 overflow-hidden shrink-0 ${
          activeConversationId ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-brand-dark/[0.08] flex items-center justify-between bg-brand-card gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Link
                to="/"
                className="w-8 h-8 rounded-full border border-brand-dark/10 bg-brand-light hover:border-brand-accent hover:text-brand-accent transition-colors flex items-center justify-center text-brand-dark shrink-0"
                title={t('back_to_home', 'На главную')}
              >
                <ChevronLeft size={16} />
              </Link>
              <div className="min-w-0">
                <span className="font-display font-semibold text-sm sm:text-base uppercase tracking-tight text-brand-dark truncate block">
                  {dbUser?.name || 'Direct'}
                </span>
                {dbUser?.username && (
                  <span className="text-[10px] text-brand-accent font-medium truncate block">
                    @{dbUser.username}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setIsNewChatOpen(true)}
              className="px-3.5 py-1.5 rounded-full bg-brand-dark text-white hover:bg-brand-accent transition-colors flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider shrink-0 shadow-2xs"
              title="Search user by @handle to start chat request"
            >
              <Edit size={14} />
              <span className="hidden lg:inline">Find @User</span>
            </button>
          </div>

          {/* Chat Category Tabs: All Chats vs Requests */}
          <div className="p-1.5 m-3 mb-1 bg-brand-muted/40 rounded-full border border-brand-dark/[0.08] grid grid-cols-2 gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-3 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-brand-dark text-white shadow-2xs'
                  : 'text-brand-dark/70 hover:text-brand-dark'
              }`}
            >
              <MessageSquare size={13} />
              <span>Chats ({acceptedConversations.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className={`py-2 px-3 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 relative ${
                activeTab === 'requests'
                  ? 'bg-brand-dark text-white shadow-2xs'
                  : 'text-brand-dark/70 hover:text-brand-dark'
              }`}
            >
              <Clock size={13} />
              <span>Requests</span>
              {incomingRequests.length > 0 && (
                <span className="bg-brand-accent text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full shadow-xs animate-pulse">
                  {incomingRequests.length}
                </span>
              )}
            </button>
          </div>

          {/* Device Push Notification Banner (WhatsApp / Telegram style) */}
          {showPushPrompt && (
            <div className="mx-3 my-1.5 p-2.5 rounded-2xl bg-brand-muted/40 border border-brand-accent/25 flex items-center justify-between gap-2 shadow-2xs animate-in fade-in duration-300">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-brand-accent text-white flex items-center justify-center shrink-0">
                  <Bell size={12} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-brand-dark leading-tight truncate">
                    {t('enable_device_push_title', 'Включить пуш-уведомления')}
                  </div>
                  <div className="text-[9.5px] text-brand-dark/60 leading-tight truncate">
                    {t('enable_device_push_desc', 'Сообщения в шторку телефона и ПК')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleEnablePush}
                  className="px-2.5 py-1 rounded-full bg-brand-dark text-white hover:bg-brand-accent text-[10px] font-semibold uppercase tracking-wider transition-colors shadow-2xs"
                >
                  {t('enable', 'Включить')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPushPrompt(false)}
                  className="p-1 text-brand-dark/40 hover:text-brand-dark transition-colors"
                  title="Dismiss"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="p-3 pt-2">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-brand-dark/40" />
              <input
                type="text"
                placeholder={activeTab === 'requests' ? "Filter requests..." : "Search by name or @handle..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-brand-card border border-brand-dark/[0.08] rounded-full pl-9 pr-3.5 py-2 text-xs font-normal text-brand-dark focus:outline-none focus:border-brand-accent/40 focus:ring-1 focus:ring-brand-accent/20 placeholder:text-brand-dark/40 shadow-2xs transition-all"
              />
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 space-y-1">
            {loadingConversations ? (
              <div className="p-8 text-center text-xs font-medium uppercase tracking-wider text-brand-dark/40">
                Loading messages...
              </div>
            ) : displayedConversations.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-muted/50 mx-auto flex items-center justify-center text-brand-dark/30">
                  <MessageSquare size={24} />
                </div>
                <p className="text-xs font-medium text-brand-dark/60">
                  {activeTab === 'requests' 
                    ? 'No pending chat requests' 
                    : searchQuery ? 'No conversations found' : 'No active chats yet'}
                </p>
                <button
                  onClick={() => setIsNewChatOpen(true)}
                  className="text-xs font-semibold uppercase tracking-wider text-brand-accent hover:underline"
                >
                  + Find by @handle
                </button>
              </div>
            ) : (
              displayedConversations.map((conv) => {
                const other = getOtherParticipant(conv);
                const isSelected = conv.id === activeConversationId;
                const unreadCount = conv.unreadCounts?.[currentUser.uid] || 0;
                const isUnread = unreadCount > 0;
                const isPending = conv.status === 'pending';
                const isIncomingReq = isPending && (conv.recipientId === currentUser.uid || conv.requestedBy !== currentUser.uid);

                const handleLabel = other.handle || (other.username ? `@${other.username}` : '');

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      setSearchParams({ conversationId: conv.id });
                    }}
                    className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-brand-card border border-brand-dark/[0.08] shadow-xs' 
                        : isIncomingReq 
                          ? 'bg-amber-50/70 border border-amber-200/60 hover:bg-amber-100/60' 
                          : 'hover:bg-brand-muted/50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-full border border-brand-dark/10 bg-brand-muted text-brand-dark flex items-center justify-center font-semibold text-xs uppercase overflow-hidden shadow-2xs">
                        {other.avatarUrl ? (
                          <img 
                            src={other.avatarUrl} 
                            alt={other.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          other.name.charAt(0) || 'U'
                        )}
                      </div>
                      {isUnread && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-accent border-2 border-white rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-xs">
                          {unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Chat preview details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <h4 className={`text-xs uppercase tracking-wide truncate ${
                            isUnread ? 'text-brand-dark font-bold' : 'text-brand-dark font-semibold'
                          }`}>
                            {other.name}
                          </h4>
                          {handleLabel && (
                            <span className="text-[10px] text-brand-accent font-medium truncate">
                              {handleLabel}
                            </span>
                          )}
                          {conv.isPriorityRequest && (
                            <span className="text-[8.5px] bg-gradient-to-r from-amber-500 to-amber-600 text-white font-mono font-bold uppercase px-1.5 py-0.2 rounded-full shrink-0 shadow-2xs">
                              PRIORITY
                            </span>
                          )}
                          {other.subscriptionTier === 'elite' || other.subscriptionTier === 'vip' ? (
                            <span className="text-[8.5px] bg-stone-900 text-amber-300 font-mono font-bold px-1.5 py-0.2 rounded-full border border-amber-400/40 shrink-0">
                              ELITE
                            </span>
                          ) : (other.subscriptionTier === 'pro' || other.subscriptionTier === 'creator') ? (
                            <span className="text-[8.5px] bg-[#7A0000] text-white font-mono font-bold px-1.5 py-0.2 rounded-full shrink-0">
                              PRO
                            </span>
                          ) : null}
                          {(other.isDesigner || other.hasGoldenNeedle) && (
                            <span title="Designer" className="inline-flex shrink-0">
                              <Crown size={11} className="text-amber-600" />
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-normal text-brand-dark/45 whitespace-nowrap ml-1">
                          {formatTimestamp(conv.updatedAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className={`text-xs truncate ${
                          isUnread ? 'font-semibold text-brand-dark' : 'text-brand-dark/60 font-normal'
                        }`}>
                          {isIncomingReq ? (
                            <span className="text-amber-800 font-medium flex items-center gap-1">
                              <Clock size={11} /> New Chat Request
                            </span>
                          ) : isPending ? (
                            <span className="text-blue-700 font-normal flex items-center gap-1">
                              <Clock size={11} /> Request Pending...
                            </span>
                          ) : (
                            <>
                              {conv.lastMessage?.senderId === currentUser.uid && (
                                <span className="text-brand-dark/40 mr-1 font-medium">You:</span>
                              )}
                              {conv.lastMessage?.text || 'Started a conversation'}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Panel or Empty State */}
        <div className={`flex-1 flex flex-col bg-brand-light/10 h-full max-h-full min-h-0 overflow-hidden relative ${
          !activeConversationId ? 'hidden md:flex' : 'flex'
        }`}>
          {activeConversationId && otherUser.id ? (
            <>
              {/* Active Chat Top Header Container (div:nth-of-type(1)) */}
              <div className="border-b border-brand-dark/[0.08] bg-brand-card shrink-0 shadow-2xs z-20">
                <div className="p-3.5 sm:p-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile Back Button */}
                    <button
                      onClick={() => {
                        setActiveConversationId(null);
                        setSearchParams({});
                      }}
                      className="md:hidden w-9 h-9 rounded-full border border-brand-dark/15 bg-brand-light flex items-center justify-center text-brand-dark hover:text-brand-accent transition-colors shrink-0 shadow-2xs active:scale-95"
                      title="Back to conversation list"
                      aria-label="Back to conversations"
                    >
                      <ChevronLeft size={20} />
                    </button>

                    <div className="w-10 h-10 rounded-full border border-brand-dark/10 bg-brand-muted text-brand-dark flex items-center justify-center font-semibold text-sm uppercase overflow-hidden shrink-0 shadow-2xs">
                      {otherUser.avatarUrl ? (
                        <img 
                          src={otherUser.avatarUrl} 
                          alt={otherUser.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        otherUser.name.charAt(0) || 'U'
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-display font-semibold text-sm sm:text-base uppercase tracking-tight text-brand-dark flex flex-wrap items-center gap-2">
                        <span className="truncate">{otherUser.name}</span>
                        {otherUser.handle && (
                          <span className="text-[10px] bg-brand-accent/5 text-brand-accent font-medium px-2 py-0.5 rounded-full border border-brand-accent/15">
                            {otherUser.handle}
                          </span>
                        )}
                        {otherUser.subscriptionTier === 'elite' || otherUser.subscriptionTier === 'vip' ? (
                          <span className="text-[9.5px] bg-stone-900 text-amber-300 font-mono font-bold px-2 py-0.5 rounded-full border border-amber-400/40">
                            ELITE VIP
                          </span>
                        ) : (otherUser.subscriptionTier === 'pro' || otherUser.subscriptionTier === 'creator') ? (
                          <span className="text-[9.5px] bg-[#7A0000] text-white font-mono font-bold px-2 py-0.5 rounded-full">
                            PRO
                          </span>
                        ) : null}
                        {(otherUser.isDesigner || otherUser.hasGoldenNeedle || activeConversation?.targetIsDesigner) && (
                          <span className="text-[9.5px] bg-amber-500/10 text-amber-900 border border-amber-300/40 font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Crown size={11} className="text-amber-600" /> DESIGNER
                          </span>
                        )}
                        {otherUser.role && otherUser.role !== 'user' && (
                          <span className="text-[9px] bg-brand-dark/5 text-brand-dark/80 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border border-brand-dark/10">
                            {otherUser.role}
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-brand-dark/55 truncate font-normal">
                        {otherUser.headline || otherUser.email || 'Fashion Community Member'}
                      </p>
                    </div>
                  </div>

                  {/* Header Action Menu: Search In-Chat, Profile, Close */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsChatSearchOpen(!isChatSearchOpen);
                        if (isChatSearchOpen) {
                          setChatSearchQuery('');
                        }
                      }}
                      className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all shadow-2xs ${
                        isChatSearchOpen 
                          ? 'bg-brand-dark text-white border-brand-dark' 
                          : 'bg-brand-card text-brand-dark border-brand-dark/10 hover:border-brand-accent hover:text-brand-accent'
                      }`}
                      title={t('search_messages', 'Search in conversation')}
                    >
                      <Search size={14} />
                      <span className="hidden sm:inline">{t('search', 'Search')}</span>
                    </button>

                    {otherUser && (
                      <Link
                        to={`/@${otherUser.handle?.replace(/^@+/, '') || otherUser.username || otherUser.id}`}
                        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-dark px-3.5 py-1.5 rounded-full border border-brand-dark/10 hover:border-brand-accent hover:text-brand-accent transition-all shadow-2xs bg-brand-card"
                      >
                        <UserIcon size={14} /> <span className="hidden sm:inline">Profile</span>
                      </Link>
                    )}

                    {/* Three-dots Menu: Block user & Delete chat */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowChatOptions(!showChatOptions)}
                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                          showChatOptions
                            ? 'bg-brand-dark text-white border-brand-dark'
                            : 'border-brand-dark/10 bg-brand-card text-brand-dark/70 hover:border-brand-accent hover:text-brand-accent shadow-2xs'
                        }`}
                        title="Опции диалога"
                        aria-label="Опции диалога"
                      >
                        <MoreVertical size={15} />
                      </button>

                      {showChatOptions && (
                        <>
                          <div 
                            className="fixed inset-0 z-30" 
                            onClick={() => setShowChatOptions(false)} 
                          />
                          <div className="absolute right-0 top-full mt-2 w-48 bg-brand-card rounded-2xl border border-brand-dark/[0.08] shadow-xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                            <button
                              type="button"
                              onClick={handleOpenBlockModal}
                              className="w-full px-4 py-2.5 text-left text-xs font-semibold text-brand-dark hover:bg-brand-muted/60 flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Ban size={14} className={isBlockedByMe ? 'text-emerald-600' : 'text-amber-700'} />
                              <span>{isBlockedByMe ? 'Разблокировать' : 'Заблокировать'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleOpenDeleteModal}
                              disabled={isDeletingChat}
                              className="w-full px-4 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors border-t border-brand-dark/[0.06] cursor-pointer"
                            >
                              <Trash2 size={14} className="text-red-600" />
                              <span>{isDeletingChat ? 'Удаление...' : 'Удалить чат'}</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <Link
                      to="/"
                      className="w-8 h-8 rounded-full border border-brand-dark/10 flex items-center justify-center text-brand-dark/50 hover:text-brand-dark transition-colors"
                      title={t('back_to_home', 'На главную')}
                    >
                      <X size={16} />
                    </Link>
                  </div>
                </div>

                {/* Expandable In-Chat Search Bar */}
                {isChatSearchOpen && (
                  <div className="px-4 py-2.5 bg-brand-muted/30 border-t border-brand-dark/[0.06] flex items-center justify-between gap-2.5 animate-in fade-in duration-200">
                    <div className="relative flex-1 flex items-center">
                      <Search size={14} className="absolute left-3.5 text-brand-dark/40" />
                      <input
                        type="text"
                        value={chatSearchQuery}
                        onChange={(e) => {
                          setChatSearchQuery(e.target.value);
                          setActiveMatchIndex(0);
                        }}
                        placeholder={t('search_in_chat', 'Search in conversation...')}
                        autoFocus
                        className="w-full bg-brand-card border border-brand-dark/15 rounded-full pl-9 pr-8 py-1.5 text-xs text-brand-dark placeholder:text-brand-dark/40 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/20 shadow-2xs"
                      />
                      {chatSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setChatSearchQuery('')}
                          className="absolute right-2.5 text-brand-dark/40 hover:text-brand-dark p-0.5"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 text-xs">
                      {chatSearchQuery.trim() && (
                        <span className="text-[11px] font-medium text-brand-dark/60 px-2 py-0.5 rounded-full bg-brand-card border border-brand-dark/10">
                          {matchingMessageIds.length > 0
                            ? `${activeMatchIndex + 1} / ${matchingMessageIds.length}`
                            : t('no_matches', 'No matches')}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (matchingMessageIds.length === 0) return;
                          setActiveMatchIndex((prev) => (prev > 0 ? prev - 1 : matchingMessageIds.length - 1));
                        }}
                        disabled={matchingMessageIds.length === 0}
                        className="w-7 h-7 rounded-full border border-brand-dark/10 bg-brand-card flex items-center justify-center text-brand-dark/70 hover:text-brand-dark disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        title="Previous match"
                      >
                        <ChevronUp size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (matchingMessageIds.length === 0) return;
                          setActiveMatchIndex((prev) => (prev < matchingMessageIds.length - 1 ? prev + 1 : 0));
                        }}
                        disabled={matchingMessageIds.length === 0}
                        className="w-7 h-7 rounded-full border border-brand-dark/10 bg-brand-card flex items-center justify-center text-brand-dark/70 hover:text-brand-dark disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        title="Next match"
                      >
                        <ChevronDown size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsChatSearchOpen(false);
                          setChatSearchQuery('');
                        }}
                        className="w-7 h-7 rounded-full border border-brand-dark/10 bg-brand-card flex items-center justify-center text-brand-dark/50 hover:text-brand-dark hover:border-brand-accent transition-colors ml-1"
                        title="Close search"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* REQUEST BANNER: For incoming pending chat requests */}
                {isCurrentConvIncomingRequest && (
                  <div className="m-3 sm:m-4 p-4 rounded-2xl bg-amber-50/90 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-100 text-amber-900 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                          {otherUser.handle || `@${otherUser.username || 'user'}`}
                        </span>
                        <h4 className="font-display font-semibold text-xs sm:text-sm uppercase text-brand-dark">
                          Incoming Message Request
                        </h4>
                      </div>
                      <p className="text-xs text-brand-dark/70 font-normal">
                        {otherUser.name} wants to connect with you. If you accept, they can message you freely.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <button
                        onClick={handleAcceptRequest}
                        disabled={isProcessingRequest}
                        className="flex-1 sm:flex-initial bg-brand-accent text-white px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-brand-dark transition-all flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <UserCheck size={14} /> Accept Request
                      </button>
                      <button
                        onClick={handleDeclineRequest}
                        disabled={isProcessingRequest}
                        className="flex-1 sm:flex-initial bg-brand-card text-brand-dark border border-brand-dark/15 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <UserX size={14} /> Decline
                      </button>
                    </div>
                  </div>
                )}

                {/* REQUEST BANNER: For outgoing pending chat requests */}
                {isCurrentConvOutgoingPending && (
                  <div className="m-3 sm:m-4 p-3 rounded-2xl bg-sky-50 border border-sky-200/60 flex items-center gap-2.5">
                    <Clock size={16} className="text-blue-700 shrink-0" />
                    <p className="text-xs font-normal text-brand-dark">
                      Your request was sent to <span className="font-semibold">{otherUser.name}</span> ({otherUser.handle || `@${otherUser.username || 'user'}`}). You can chat once they accept.
                    </p>
                  </div>
                )}

                {/* DECLINED BANNER */}
                {isCurrentConvDeclined && (
                  <div className="m-3 sm:m-4 p-3 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-2.5">
                    <AlertCircle size={16} className="text-red-600 shrink-0" />
                    <p className="text-xs font-medium text-red-800">
                      This chat request was declined or closed.
                    </p>
                  </div>
                )}
              </div>

              {/* Messages Stream Viewport (CSS selector 2) */}
              <div 
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 min-h-0 h-full max-h-full overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 bg-brand-light/20 relative select-text scroll-smooth"
                style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-8">
                    <div className="w-14 h-14 rounded-3xl bg-brand-accent/5 border border-brand-accent/15 flex items-center justify-center text-brand-accent">
                      <Sparkles size={24} />
                    </div>
                    <h4 className="font-display font-semibold uppercase tracking-tight text-brand-dark text-sm sm:text-base">
                      {isCurrentConvIncomingRequest 
                        ? `Chat request from ${otherUser.name}`
                        : `Direct connection with ${otherUser.name}`}
                    </h4>
                    <p className="text-xs font-normal text-brand-dark/60 max-w-xs leading-relaxed">
                      {isCurrentConvIncomingRequest 
                        ? 'Accept the request above to begin conversing.'
                        : 'Say hello, share a project, discuss an opportunity, or arrange a meeting.'}
                    </p>
                  </div>
                ) : (
                  messageGroups.map((group) => (
                    /* Date Group Container (CSS selector 1) */
                    <div key={group.dateKey} className="space-y-3.5 w-full shrink-0">
                      {/* WhatsApp / Instagram Direct Style Centered Date Divider */}
                      <div className="sticky top-1 z-10 select-none flex justify-center my-3 pointer-events-none">
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-brand-card/95 backdrop-blur-md text-brand-dark/75 border border-brand-dark/10 shadow-2xs pointer-events-auto">
                          <Calendar size={11} className="text-brand-accent/70" />
                          <span>{group.dateLabel}</span>
                        </span>
                      </div>

                      {/* Messages within this Date Group */}
                      {group.messages.map((msg) => {
                        const isMe = msg.senderId === currentUser.uid;
                        const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;
                        const isMatchFocus = matchingMessageIds[activeMatchIndex] === msg.id;

                        return (
                          <div
                            key={msg.id}
                            id={`msg-${msg.id}`}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group transition-all duration-300 ${
                              isMatchFocus ? 'scale-[1.01]' : ''
                            }`}
                          >
                            <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                              {!isMe && (
                                <div className="w-7 h-7 rounded-full border border-brand-dark/10 bg-brand-muted text-brand-dark flex items-center justify-center font-semibold text-xs uppercase flex-shrink-0 mb-1 overflow-hidden shadow-2xs">
                                  {msg.senderAvatarUrl ? (
                                    <img src={msg.senderAvatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    msg.senderName.charAt(0)
                                  )}
                                </div>
                              )}

                              <div className="relative group/bubble">
                                {/* Message Bubble */}
                                <div
                                  className={`p-3.5 text-xs sm:text-sm leading-relaxed shadow-2xs transition-all ${
                                    isMatchFocus ? 'ring-2 ring-brand-accent ring-offset-2 ring-offset-brand-light' : ''
                                  } ${
                                    isMe
                                      ? 'bg-brand-dark text-white rounded-2xl rounded-tr-xs'
                                      : 'bg-brand-card border border-brand-dark/[0.08] text-brand-dark rounded-2xl rounded-tl-xs'
                                  }`}
                                >
                                  {/* Attached Image */}
                                  {msg.imageUrl && (
                                    <div className="mb-2 overflow-hidden rounded-xl border border-black/10">
                                      <img
                                        src={msg.imageUrl}
                                        alt="Attachment"
                                        onClick={() => setPreviewZoomImage(msg.imageUrl || null)}
                                        className="max-h-60 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                  )}

                                  {/* Voice Message Player (Telegram / WhatsApp Style) */}
                                  {msg.audioUrl && (
                                    <div className="my-1">
                                      <VoiceMessagePlayer
                                        audioUrl={msg.audioUrl}
                                        duration={msg.audioDuration}
                                        waveform={msg.waveform}
                                        isMe={isMe}
                                        theme="bubble"
                                      />
                                    </div>
                                  )}

                                  {/* Text Message with Search Query Highlighting */}
                                  {msg.text && (
                                    <HighlightedMessageText text={msg.text} query={chatSearchQuery} />
                                  )}
                                </div>

                                {/* Hover Quick Actions (Instagram / WhatsApp Style) */}
                                <div className={`absolute top-1/2 transform -translate-y-1/2 opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 z-10 ${
                                  isMe ? '-left-16' : '-right-16'
                                }`}>
                                  <button
                                    type="button"
                                    onClick={() => toggleMessageReaction(activeConversationId, msg.id, currentUser.uid, '❤️')}
                                    className="p-1.5 rounded-full bg-brand-card border border-brand-dark/10 text-red-500 hover:scale-110 transition-transform shadow-2xs cursor-pointer"
                                    title="Поставить реакцию"
                                  >
                                    <Heart size={13} fill={msg.reactions?.['❤️']?.includes(currentUser.uid) ? 'currentColor' : 'none'} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedMessageForAction(msg)}
                                    className="p-1.5 rounded-full bg-brand-card border border-brand-dark/10 text-brand-dark/60 hover:text-red-600 hover:border-red-200 transition-colors shadow-2xs cursor-pointer"
                                    title={isMe ? 'Удалить у всех или у себя' : 'Удалить у себя'}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Reactions Bar */}
                            {hasReactions && (
                              <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end pr-2' : 'justify-start pl-9'}`}>
                                {Object.entries(msg.reactions || {}).map(([emoji, rawUsers]) => {
                                  const users = Array.isArray(rawUsers) ? (rawUsers as string[]) : [];
                                  return (
                                    <button
                                      key={emoji}
                                      onClick={() => toggleMessageReaction(activeConversationId, msg.id, currentUser.uid, emoji)}
                                      className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 transition-all ${
                                        users.includes(currentUser.uid)
                                          ? 'bg-brand-accent text-white border-brand-accent font-semibold shadow-2xs'
                                          : 'bg-brand-card border-brand-dark/10 text-brand-dark shadow-2xs'
                                      }`}
                                    >
                                      <span>{emoji}</span>
                                      <span className="text-[10px] font-medium">{users.length}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Timestamp and Delivery Info */}
                            <div className={`flex items-center gap-1.5 text-[10px] text-brand-dark/40 font-normal mt-1 px-1 ${
                              isMe ? 'justify-end' : 'justify-start pl-9'
                            }`}>
                              <span>{formatMessageTime(msg.createdAt)}</span>
                              {isMe && (
                                <span>
                                  {msg.read ? <CheckCheck size={12} className="text-brand-accent" /> : <Check size={12} />}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedMessageForAction(msg)}
                                className="sm:hidden text-brand-dark/40 hover:text-red-600 transition-colors p-0.5"
                                title="Удалить сообщение"
                              >
                                <MoreHorizontal size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}

                {/* Floating Scroll-to-Bottom Button */}
                {isScrolledUp && (
                  <button
                    onClick={() => scrollToBottom(true)}
                    className="sticky bottom-3 float-right mr-2 z-20 w-9 h-9 rounded-full bg-brand-card border border-brand-dark/15 text-brand-dark hover:text-brand-accent hover:border-brand-accent shadow-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
                    title={t('scroll_to_bottom', 'Scroll to bottom')}
                  >
                    <ChevronDown size={18} className="group-hover:translate-y-0.5 transition-transform" />
                    {hasNewMessagesWhileScrolledUp && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-brand-accent border-2 border-white animate-pulse" />
                    )}
                  </button>
                )}

                <div ref={messagesEndRef} className="h-px" />
              </div>

              {/* Bottom Message Input Bar */}
              <div className="p-3 sm:p-4 border-t border-brand-dark/[0.08] bg-brand-card shrink-0 z-20">
                {/* Image Preview before sending */}
                {selectedImage && (
                  <div className="mb-3 relative inline-block rounded-2xl border border-brand-dark/10 p-1.5 bg-brand-light shadow-2xs">
                    <img src={selectedImage} alt="Upload preview" className="h-20 rounded-xl object-cover" />
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="absolute -top-2 -right-2 bg-brand-dark text-white p-1 rounded-full hover:bg-red-600 transition-colors shadow-xs"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {/* Quick Emoji Bar */}
                {showEmojiPicker && (
                  <div className="mb-3 p-2 bg-brand-card rounded-2xl border border-brand-dark/[0.08] shadow-sm flex gap-2 overflow-x-auto">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setMessageText((prev) => prev + emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="text-lg hover:scale-125 transition-transform p-1"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {isCurrentConvIncomingRequest ? (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-brand-dark/90 font-medium">
                      <Clock size={16} className="text-amber-700 shrink-0" />
                      <span>{otherUser.name} отправил(а) вам запрос на переписку. Примите запрос, чтобы начать общение.</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleDeclineRequest}
                        disabled={isProcessingRequest}
                        className="px-3.5 py-1.5 rounded-full border border-brand-dark/20 text-brand-dark hover:bg-brand-muted text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Отклонить
                      </button>
                      <button
                        onClick={handleAcceptRequest}
                        disabled={isProcessingRequest}
                        className="bg-brand-accent text-white px-4 py-1.5 rounded-full uppercase tracking-wider font-semibold hover:bg-brand-dark transition-colors text-xs shadow-xs cursor-pointer"
                      >
                        Принять запрос
                      </button>
                    </div>
                  </div>
                ) : isCurrentConvDeclined ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-center text-xs font-medium text-red-900">
                    Этот диалог был отклонен.
                  </div>
                ) : isBlockedByMe ? (
                  <div className="p-3.5 bg-stone-100 border border-stone-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
                    <span className="text-stone-700 font-medium">Вы заблокировали этого пользователя.</span>
                    <button
                      type="button"
                      onClick={handleOpenBlockModal}
                      className="text-brand-accent font-bold uppercase tracking-wider hover:underline text-xs cursor-pointer"
                    >
                      Разблокировать
                    </button>
                  </div>
                ) : isBlockedByOther ? (
                  <div className="p-3.5 bg-stone-100 border border-stone-200 rounded-2xl text-center text-xs text-stone-600 font-medium">
                    Собеседник ограничил возможность отправки сообщений в этом чате.
                  </div>
                ) : (
                  <>
                    {isCurrentConvOutgoingPending && (
                      <div className="mb-2.5 px-3 py-1.5 bg-blue-50/70 border border-blue-200/60 rounded-xl text-[11px] text-blue-900 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-blue-600 shrink-0" />
                          <span>Запрос отправлен. Собеседник сможет ответить после подтверждения диалога.</span>
                        </div>
                        {isTargetDesigner && !isPremiumUser && (
                          <Link to="/plans" className="text-brand-accent hover:underline font-semibold shrink-0">
                            Ускорить через Pro →
                          </Link>
                        )}
                      </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />

                    {/* Attachment Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-9 h-9 rounded-full border border-brand-dark/10 bg-brand-light flex items-center justify-center text-brand-dark/70 hover:text-brand-accent hover:border-brand-accent/30 transition-colors shrink-0"
                      title="Attach Photo"
                    >
                      <ImageIcon size={17} />
                    </button>

                    {/* Emoji Picker Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="w-9 h-9 rounded-full border border-brand-dark/10 bg-brand-light flex items-center justify-center text-brand-dark/70 hover:text-brand-accent hover:border-brand-accent/30 transition-colors shrink-0"
                      title="Emoji"
                    >
                      <Smile size={17} />
                    </button>

                    {/* Input field */}
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder={`Message ${otherUser.name}...`}
                      className="flex-1 bg-brand-muted/30 border border-brand-dark/[0.08] rounded-full px-4 py-2.5 text-xs sm:text-sm text-brand-dark focus:bg-brand-card focus:outline-none focus:border-brand-accent/40 focus:ring-1 focus:ring-brand-accent/20 placeholder:text-brand-dark/40 transition-all shadow-2xs"
                    />

                    {/* Voice Message Recorder (Telegram / WhatsApp style) */}
                    <VoiceMessageRecorder
                      onSendVoice={handleSendVoice}
                      disabled={isSending}
                    />

                    {/* Send Button */}
                    {(messageText.trim() || selectedImage) && (
                      <button
                        type="submit"
                        disabled={isSending}
                        className="bg-brand-accent text-white px-5 sm:px-6 py-2.5 rounded-full font-semibold uppercase tracking-wider text-xs hover:bg-brand-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs shrink-0 animate-in fade-in zoom-in-95 duration-150"
                      >
                        <Send size={15} />
                        <span className="hidden sm:inline">Send</span>
                      </button>
                    )}
                  </form>
                </>
                )}
              </div>
            </>
          ) : (
            /* Direct Chat Empty Screen */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-brand-accent/5 border border-brand-accent/15 flex items-center justify-center text-brand-accent shadow-2xs">
                <MessageSquare size={32} />
              </div>
              <div className="space-y-2 max-w-sm">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                  Baku Fashion Direct
                </span>
                <h3 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-tight text-brand-dark">
                  {t('messages_empty_title', 'Ваши сообщения и диалоги')}
                </h3>
                <p className="text-xs text-brand-dark/65 font-normal leading-relaxed">
                  {t('messages_empty_desc', 'Выберите диалог из списка слева, чтобы открыть переписку, или начните новый чат с дизайнером, моделью или стилистом.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewChatOpen(true)}
                className="bg-brand-dark text-white px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-brand-accent transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <AtSign size={15} />
                <span>{t('start_new_chat', 'Начать новый диалог')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* MODAL: New Message / Search Users by @handle */}
      {isNewChatOpen && (
        <div className="fixed inset-0 z-50 bg-brand-dark/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-brand-card rounded-3xl border border-brand-dark/[0.08] p-6 w-full max-w-md space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-brand-dark/[0.08] pb-3.5">
              <h3 className="font-display font-semibold uppercase tracking-tight text-base sm:text-lg text-brand-dark flex items-center gap-2">
                <AtSign size={18} className="text-brand-accent" /> Find Member by @handle
              </h3>
              <button
                onClick={() => setIsNewChatOpen(false)}
                className="w-8 h-8 rounded-full border border-brand-dark/10 flex items-center justify-center text-brand-dark/60 hover:text-brand-dark hover:bg-brand-muted/40 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Input with @ support */}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 font-medium text-brand-dark/40 text-xs">@</span>
              <input
                type="text"
                placeholder="type handle (e.g. _coyora), name, or email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-brand-muted/30 border border-brand-dark/[0.08] rounded-full pl-8 pr-4 py-2 text-xs font-normal text-brand-dark focus:outline-none focus:bg-brand-card focus:border-brand-accent/40 focus:ring-1 focus:ring-brand-accent/20 placeholder:text-brand-dark/40 transition-all shadow-2xs"
              />
            </div>

            {/* User Results List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-brand-dark/[0.06] border border-brand-dark/[0.08] rounded-2xl bg-brand-light/30">
              {isSearchingUsers ? (
                <div className="p-6 text-center text-xs font-normal uppercase tracking-wider text-brand-dark/50">
                  Searching members by @handle...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-6 text-center text-xs font-normal text-brand-dark/50">
                  {userSearchQuery ? 'No members found matching this query' : 'Type @handle, name, or industry to search'}
                </div>
              ) : (
                searchResults.map((u) => {
                  const uHandle = u.handle || (u.username ? `@${u.username}` : `@${u.email?.split('@')[0]}`);
                  return (
                    <div
                      key={u.id}
                      onClick={() => handleStartNewChat(u)}
                      className="p-3 flex items-center justify-between hover:bg-brand-muted/40 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full border border-brand-dark/10 bg-brand-muted text-brand-dark flex items-center justify-center font-semibold text-xs uppercase overflow-hidden shrink-0 shadow-2xs">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            u.name?.charAt(0) || 'U'
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <h4 className="text-xs font-semibold uppercase text-brand-dark tracking-wide truncate">
                              {u.name}
                            </h4>
                            {Boolean(u.isDesigner || u.designerId || u.hasGoldenNeedle || u.industry === 'fashion_design' || u.industry === 'designer') && (
                              <Crown size={12} className="text-amber-600 shrink-0" />
                            )}
                            <span className="text-[10px] text-brand-accent font-medium bg-brand-accent/5 px-2 py-0.2 rounded-full border border-brand-accent/15 truncate">
                              {uHandle}
                            </span>
                          </div>
                          <p className="text-[11px] text-brand-dark/50 truncate font-normal">
                            {u.industry || u.email}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartNewChat(u);
                        }}
                        className="text-[11px] font-semibold uppercase tracking-wider text-white bg-brand-dark hover:bg-brand-accent px-3.5 py-1.5 rounded-full shrink-0 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare size={12} />
                        <span>Написать</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-normal text-brand-dark/60">
                Messages start as requests requiring approval.
              </span>
              <button
                onClick={() => setIsNewChatOpen(false)}
                className="text-xs font-semibold uppercase tracking-wider text-brand-dark/60 hover:text-brand-dark transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP MODAL: Confirm Delete or Block */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-brand-dark/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-brand-card rounded-3xl border border-brand-dark/[0.12] p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 relative">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                confirmModal.type === 'delete'
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : confirmModal.type === 'block'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {confirmModal.type === 'delete' ? (
                  <Trash2 size={20} />
                ) : confirmModal.type === 'block' ? (
                  <Ban size={20} />
                ) : (
                  <UserCheck size={20} />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent block">
                  [Безопасность и управление]
                </span>
                <h3 className="font-display font-bold uppercase tracking-tight text-base sm:text-lg text-brand-dark">
                  {confirmModal.title}
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-brand-dark/75 leading-relaxed">
              {confirmModal.description}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-brand-dark/[0.08]">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-full border border-brand-dark/20 text-brand-dark hover:bg-brand-muted/70 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isDeletingChat}
                className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all shadow-xs cursor-pointer ${
                  confirmModal.confirmStyle === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : confirmModal.confirmStyle === 'warning'
                      ? 'bg-brand-dark hover:bg-brand-accent text-white'
                      : 'bg-brand-accent hover:bg-brand-dark text-white'
                }`}
              >
                {isDeletingChat ? 'Удаление...' : confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete / Unsend Message Action (WhatsApp & Instagram Direct Style) */}
      {selectedMessageForAction && (
        <div className="fixed inset-0 z-50 bg-brand-dark/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-brand-card rounded-3xl border border-brand-dark/[0.12] p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0 shadow-2xs">
                <Trash2 size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent block">
                  [Управление сообщением]
                </span>
                <h3 className="font-display font-bold uppercase tracking-tight text-sm sm:text-base text-brand-dark">
                  Удалить сообщение?
                </h3>
              </div>
            </div>

            <p className="text-xs text-brand-dark/75 leading-relaxed">
              {selectedMessageForAction.senderId === currentUser?.uid
                ? 'Вы можете отменить отправку (удалить у обоих участников) или удалить сообщение только из своей переписки.'
                : 'Это сообщение будет удалено только из вашей истории переписки.'}
            </p>

            <div className="space-y-2 pt-2 border-t border-brand-dark/[0.08]">
              {selectedMessageForAction.senderId === currentUser?.uid && (
                <button
                  type="button"
                  onClick={() => handleDeleteMessage(selectedMessageForAction, 'for_everyone')}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Удалить у всех (отменить)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDeleteMessage(selectedMessageForAction, 'for_me')}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-dark hover:bg-brand-accent text-white font-semibold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <UserX size={14} />
                <span>Удалить только у меня</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMessageForAction(null)}
                className="w-full py-2.5 px-4 rounded-xl border border-brand-dark/15 hover:bg-brand-muted/70 text-brand-dark font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Image Zoom Preview */}
      {previewZoomImage && (
        <div 
          className="fixed inset-0 z-50 bg-brand-dark/85 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewZoomImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-3xl overflow-hidden border border-white/20 bg-brand-dark/60 p-2 shadow-2xl">
            <img 
              src={previewZoomImage} 
              alt="Enlarged view" 
              className="max-h-[80vh] w-auto object-contain rounded-2xl"
              referrerPolicy="no-referrer"
            />
            <button
              onClick={() => setPreviewZoomImage(null)}
              className="absolute top-4 right-4 bg-brand-dark/80 text-white p-2 rounded-full border border-white/20 hover:bg-white hover:text-brand-dark transition-colors shadow-xs"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
