export type WorkExperience = {
 id: string;
 title: string;
 company: string;
 startDate: string;
 endDate?: string;
 current: boolean;
 description: string;
};

export type EducationInfo = {
 id: string;
 school: string;
 degree: string;
 fieldOfStudy: string;
 startDate: string;
 endDate?: string;
 description: string;
};

export type UserProfileData = {
 generalInfo: {
 bio: string;
 location?: string;
 headline?: string;
 website?: string;
 };
 experience: WorkExperience[];
 education: EducationInfo[];
 skills: string[];
};

export type User = {
 id: string; // from firebase auth
 email: string;
 name: string;
 username?: string; // e.g. "coyora" or "_coyora" (without @)
 handle?: string; // e.g. "@_coyora"
 role: 'user' | 'admin' | 'superadmin' | 'news_editor' | 'content_editor' | 'ticket_editor';
 createdAt: number;
 onboardingComplete?: boolean;
 industry?: string;
 degree?: string;
 interestLevel?: string;
 ageGroup?: string;
 primaryGoal?: string;
 avatarUrl?: string;
 bio?: string;
 links?: string;
 lastProfileUpdate?: number;
 subscriptionTier?: 'free' | 'pro' | 'vip' | 'business' | 'creator' | 'guest' | 'elite';
 subscriptionValidUntil?: number;
 hasJobPostingAccess?: boolean;
 singleJobCredits?: number;
 hasGoldenNeedle?: boolean;
 goldenNeedleGrantedAt?: number;
 goldenNeedleStatus?: 'none' | 'pending' | 'approved' | 'rejected';
 hasSilverNeedle?: boolean;
 silverNeedleGrantedAt?: number;
 silverNeedleStatus?: 'none' | 'pending' | 'approved' | 'rejected';
 isModel?: boolean;
 modelAgencyName?: string;
 modelAgencyId?: string;
 modelAgencyManual?: string;
 modelVerificationStatus?: 'none' | 'pending' | 'verified' | 'rejected';
 modelVerifiedByAgency?: string;
 modelVerifiedByUserId?: string;
 modelVerifiedAt?: number;
 hasModelBadge?: boolean;
 isAgency?: boolean;
 hasAgencyBadge?: boolean;
 agencyBadgeGrantedAt?: number;
 agencyVerificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
 agencyApplicationId?: string;
 linkedAgencyId?: string;
 isAgencyRepresentative?: boolean;
 representedAgencyId?: string;
 representedAgencyName?: string;
 agencyRole?: string;
 brandName?: string;
 designerBrandName?: string;
 designerVerificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
 designerApplicationId?: string;
 hasDirectChat?: boolean;
 directChatEnabled?: boolean;
 designerId?: string;
 isDesigner?: boolean;
 profileData?: UserProfileData;
 following?: string[];
 followers?: string[];
 blockedUsers?: string[];
 warnings?: number;
 lastLoginAt?: number;
 lastActiveAt?: number;
};

export type AgencyItem = {
 id: string;
 name: string;
 location: string;
 description: string;
 focus: string[];
 image: string;
 instagram?: string;
 website?: string;
 order?: number;
 linkedUserId?: string;
 linkedUserName?: string;
 linkedUserHandle?: string;
 hasAgencyBadge?: boolean;
};

export type AgencyApplication = {
 id: string;
 userId: string;
 userEmail: string;
 userHandle?: string;
 applicantFirstName: string;
 applicantLastName: string;
 applicantPatronymic?: string; // Отчество
 phoneNumber?: string; // Номер телефона
 agencyName: string;
 agencyAddress?: string; // Адрес модельного агентства (можно оставить пустым)
 foundingYear?: string | number; // Год основания агентства
 idCardPhotoUrl?: string; // Фото şəxsiyyət vəsiqəsi
 personalPhotoUrl?: string; // Фото свое
 agencyRole?: string;
 modelCount?: number | string;
 mediaLinks?: string;
 modelWorkLinks?: string;
 idDocumentUrl?: string;
 website?: string;
 instagram?: string;
 location?: string;
 comment?: string;
 status: 'pending' | 'approved' | 'rejected';
 createdAt: number;
 reviewedAt?: number;
 reviewedBy?: string;
 rejectionReason?: string;
};

export type AgencyBroadcast = {
 id: string;
 agencyId?: string;
 agencyName: string;
 senderUserId: string;
 senderName: string;
 title: string;
 message: string;
 category?: 'casting' | 'fitting' | 'runway' | 'general';
 link?: string;
 deadline?: string;
 recipientCount: number;
 recipientUserIds?: string[];
 isBroadcastToAll?: boolean;
 createdAt: number;
};

export type AgencyInvitation = {
 id: string;
 modelUserId: string;
 modelName?: string;
 modelEmail?: string;
 modelHandle?: string;
 modelAvatar?: string;
 agencyName: string;
 agencyId?: string;
 invitedByUserId: string;
 invitedByUserName?: string;
 status: 'pending' | 'accepted' | 'rejected' | 'declined';
 createdAt: number;
 respondedAt?: number;
 acceptedAt?: number;
 declinedAt?: number;
};

export type TicketTier = { name: string; price: number; };

export type Event = {
 id: string; // from firestore doc
 title: string;
 description: string;
 date: number;
 endDate?: number;
 location: string;
 imageUrl: string;
 price: number;
 totalTickets: number;
 availableTickets: number;
 createdAt: number;
 updatedAt: number;
 ticketTiers?: TicketTier[];
 externalTicketUrl?: string;
};

export type GiveawayEntry = {
 id: string;
 eventId: string;
 eventTitle: string;
 eventDate?: number;
 eventLocation?: string;
 eventImageUrl?: string;
 userId: string;
 userName: string;
 userEmail: string;
 userHandle?: string;
 userAvatar?: string;
 subscriptionTier: string;
 enteredAt: number;
 isWinner?: boolean;
 wonAt?: number;
 status: 'entered' | 'won' | 'closed';
};

export type Ticket = {
 id: string; // from firestore
 eventId: string;
 userId: string;
 purchaseDate: number;
 status: 'active' | 'used' | 'cancelled';
 qrCodeData: string;
};

export type CustomQuestion = {
 id: string;
 question: string;
 type: 'text' | 'yes_no' | 'number' | 'textarea';
 required?: boolean;
 options?: string[];
};

export type CustomAnswer = {
 questionId: string;
 question: string;
 answer: string;
 type?: string;
};

export type ParticipantDetail = {
 id: string;
 name: string;
 username?: string;
 handle?: string;
 email: string;
 avatarUrl?: string;
 role?: string;
 headline?: string;
 subscriptionTier?: string;
 isDesigner?: boolean;
 hasGoldenNeedle?: boolean;
};

export type ChatMessage = {
 id: string;
 conversationId: string;
 senderId: string;
 senderName: string;
 senderAvatarUrl?: string;
 text: string;
 imageUrl?: string;
 audioUrl?: string;
 audioDuration?: number;
 waveform?: number[];
 createdAt: number;
 read?: boolean;
 readBy?: string[];
 reactions?: Record<string, string[]>;
 deletedFor?: string[];
 deletedForEveryone?: boolean;
};

export type Conversation = {
 id: string;
 participants: string[];
 participantDetails: Record<string, ParticipantDetail>;
 status?: 'pending' | 'accepted' | 'declined';
 requestedBy?: string;
 recipientId?: string;
 isPriorityRequest?: boolean;
 targetIsDesigner?: boolean;
 blockedBy?: string[];
 deletedBy?: string[];
 clearedAt?: Record<string, number>;
 lastMessage?: {
 text: string;
 senderId: string;
 senderName: string;
 createdAt: number;
 readBy?: string[];
 };
 updatedAt: number;
 createdAt: number;
 unreadCounts?: Record<string, number>;
};

export type SocialPlatform = 
 | 'instagram' 
 | 'telegram' 
 | 'facebook' 
 | 'tiktok' 
 | 'youtube' 
 | 'twitter' 
 | 'linkedin' 
 | 'whatsapp' 
 | 'threads' 
 | 'pinterest' 
 | 'vk' 
 | 'website' 
 | 'custom';

export interface SocialLinkItem {
 id: string;
 platform: SocialPlatform;
 url: string;
 label?: string;
 isActive: boolean;
 order?: number;
}

export interface FooterSettings {
 socialLinks: SocialLinkItem[];
 showSocials: boolean;
 copyrightText?: string;
 updatedAt?: number;
}

export type NotificationType = 
 | 'message'
 | 'chat_request'
 | 'chat_accepted'
 | 'like'
 | 'comment'
 | 'follow'
 | 'job_application'
 | 'job_status'
 | 'golden_needle'
 | 'silver_needle'
 | 'model_verified'
 | 'model_rejected'
 | 'agency_broadcast'
 | 'agency_invite'
 | 'agency_verified'
 | 'agency_rejected'
 | 'designer_verified'
 | 'designer_rejected'
 | 'subscription'
 | 'system';

export type AppNotification = {
 id: string;
 userId: string;
 type: NotificationType;
 fromUserId?: string;
 fromUserName?: string;
 fromUserAvatar?: string;
 title?: string;
 message?: string;
 link?: string;
 targetId?: string;
 read: boolean;
 createdAt: number;
 metadata?: Record<string, any>;
};



