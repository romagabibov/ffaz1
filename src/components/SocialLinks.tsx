import React from 'react';
import { 
 Instagram, 
 Send, 
 Facebook, 
 Youtube, 
 Twitter, 
 Linkedin, 
 MessageCircle, 
 Music, 
 AtSign, 
 Globe, 
 Share2 
} from 'lucide-react';
import { SocialPlatform, SocialLinkItem } from '../types';

export const SOCIAL_PLATFORMS_META: {
 id: SocialPlatform;
 name: string;
 placeholder: string;
 defaultUrl: string;
}[] = [
 { id: 'instagram', name: 'Instagram', placeholder: 'https://instagram.com/azerbaijanfashionweek', defaultUrl: 'https://instagram.com/azerbaijanfashionweek' },
 { id: 'telegram', name: 'Telegram', placeholder: 'https://t.me/azfashionevents', defaultUrl: 'https://t.me/azfashionevents' },
 { id: 'facebook', name: 'Facebook', placeholder: 'https://facebook.com/azerbaijanfashionweek', defaultUrl: 'https://facebook.com/azerbaijanfashionweek' },
 { id: 'tiktok', name: 'TikTok', placeholder: 'https://tiktok.com/@azfashionweek', defaultUrl: 'https://tiktok.com/@azfashionweek' },
 { id: 'youtube', name: 'YouTube', placeholder: 'https://youtube.com/@azfashionweek', defaultUrl: 'https://youtube.com/@azfashionweek' },
 { id: 'twitter', name: 'X (Twitter)', placeholder: 'https://x.com/azfashionweek', defaultUrl: 'https://x.com/azfashionweek' },
 { id: 'linkedin', name: 'LinkedIn', placeholder: 'https://linkedin.com/company/azfashion', defaultUrl: 'https://linkedin.com/company/azfashion' },
 { id: 'whatsapp', name: 'WhatsApp', placeholder: 'https://wa.me/994XXXXXXXXX', defaultUrl: 'https://wa.me/994501234567' },
 { id: 'threads', name: 'Threads', placeholder: 'https://threads.net/@azfashionweek', defaultUrl: 'https://threads.net/@azfashionweek' },
 { id: 'pinterest', name: 'Pinterest', placeholder: 'https://pinterest.com/azfashion', defaultUrl: 'https://pinterest.com/azfashion' },
 { id: 'vk', name: 'VK', placeholder: 'https://vk.com/azfashion', defaultUrl: 'https://vk.com/azfashion' },
 { id: 'website', name: 'Website', placeholder: 'https://azfashionevents.com', defaultUrl: 'https://azfashionevents.com' },
 { id: 'custom', name: 'Custom Link', placeholder: 'https://...', defaultUrl: 'https://' },
];

export const DEFAULT_SOCIAL_LINKS: SocialLinkItem[] = [
 { id: 'soc_1', platform: 'instagram', url: 'https://instagram.com/azerbaijanfashionweek', label: 'Instagram', isActive: true, order: 0 },
 { id: 'soc_2', platform: 'telegram', url: 'https://t.me/azfashionevents', label: 'Telegram', isActive: true, order: 1 },
 { id: 'soc_3', platform: 'facebook', url: 'https://facebook.com/azerbaijanfashionweek', label: 'Facebook', isActive: true, order: 2 },
 { id: 'soc_4', platform: 'tiktok', url: 'https://tiktok.com/@azfashionweek', label: 'TikTok', isActive: true, order: 3 },
 { id: 'soc_5', platform: 'youtube', url: 'https://youtube.com/@azfashionweek', label: 'YouTube', isActive: true, order: 4 },
];

export function renderSocialIcon(platform: SocialPlatform | string, size = 18, className = '') {
 switch (platform?.toLowerCase()) {
 case 'instagram':
 return <Instagram size={size} className={className} />;
 case 'telegram':
 return <Send size={size} className={className} />;
 case 'facebook':
 return <Facebook size={size} className={className} />;
 case 'tiktok':
 return <Music size={size} className={className} />;
 case 'youtube':
 return <Youtube size={size} className={className} />;
 case 'twitter':
 case 'x':
 return <Twitter size={size} className={className} />;
 case 'linkedin':
 return <Linkedin size={size} className={className} />;
 case 'whatsapp':
 return <MessageCircle size={size} className={className} />;
 case 'threads':
 return <AtSign size={size} className={className} />;
 case 'pinterest':
 case 'vk':
 return <Share2 size={size} className={className} />;
 case 'website':
 case 'custom':
 default:
 return <Globe size={size} className={className} />;
 }
}

interface SocialLinksBarProps {
 links?: SocialLinkItem[];
 variant?: 'desktop-footer' | 'mobile-drawer' | 'compact' | 'preview';
 showLabels?: boolean;
 className?: string;
}

export const SocialLinksBar: React.FC<SocialLinksBarProps> = ({
 links = DEFAULT_SOCIAL_LINKS,
 variant = 'desktop-footer',
 showLabels = false,
 className = '',
}) => {
 const activeLinks = links
 .filter(link => link.isActive && link.url && link.url.trim() !== '')
 .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

 if (activeLinks.length === 0) {
 return null;
 }

 if (variant === 'mobile-drawer') {
 return (
 <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
 {activeLinks.map((item) => {
 const meta = SOCIAL_PLATFORMS_META.find(p => p.id === item.platform);
 const title = item.label || meta?.name || item.platform;
 return (
 <a
 key={item.id || item.platform}
 href={item.url}
 target="_blank"
 rel="noopener noreferrer"
 className="p-2.5 bg-brand-light hover:bg-brand-accent text-brand-dark hover:text-white border-2 border-brand-dark transition-all duration-200 flex items-center justify-center active:translate-x-0.5 active:translate-y-0.5"
 aria-label={title}
 title={title}
 >
 {renderSocialIcon(item.platform, 16)}
 </a>
 );
 })}
 </div>
 );
 }

 return (
 <div className={`flex flex-wrap items-center justify-center gap-3 ${className}`}>
 {activeLinks.map((item) => {
 const meta = SOCIAL_PLATFORMS_META.find(p => p.id === item.platform);
 const title = item.label || meta?.name || item.platform;
 return (
 <a
 key={item.id || item.platform}
 href={item.url}
 target="_blank"
 rel="noopener noreferrer"
 className="group relative px-4 py-2.5 bg-brand-light hover:bg-brand-accent text-brand-dark hover:text-white border-2 border-brand-dark hover:border-brand-dark font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2.5 hover:translate-x-[2px] hover:translate-y-[2px]"
 aria-label={title}
 title={title}
 >
 <span className="shrink-0 transition-transform group-hover:scale-110">
 {renderSocialIcon(item.platform, 16)}
 </span>
 <span className="font-mono text-[11px] tracking-widest">{title}</span>
 </a>
 );
 })}
 </div>
 );
};
