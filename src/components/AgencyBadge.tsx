import React from 'react';
import { useTranslation } from 'react-i18next';

interface AgencyBadgeProps {
 size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
 className?: string;
 showLabel?: boolean;
 agencyName?: string;
}

export default function AgencyBadge({
 size = 'sm',
 className = '',
 showLabel = false,
 agencyName
}: AgencyBadgeProps) {
 const { t } = useTranslation();

 const iconSizes = {
 xs: 'w-3.5 h-3.5',
 sm: 'w-4 h-4',
 md: 'w-5 h-5',
 lg: 'w-6 h-6',
 xl: 'w-8 h-8'
 };

 const labelSizes = {
 xs: 'text-[9px] px-1.5 py-0.5',
 sm: 'text-[10px] px-2 py-0.5',
 md: 'text-xs px-2.5 py-1',
 lg: 'text-xs px-3 py-1',
 xl: 'text-sm px-3.5 py-1.5'
 };

 const tooltip = agencyName
 ? `${agencyName} • ${t('agency_badge_tooltip', 'Официальное модельное агентство / Verified Agency')}`
 : t('agency_badge_tooltip', 'Официальное модельное агентство / Verified Model Agency • Rəsmi Model Agentliyi');

 return (
 <span
 id="official-agency-badge"
 title={tooltip}
 className={`inline-flex items-center gap-1.5 shrink-0 select-none align-middle ${className}`}
 aria-label="Official Model Agency Verified Badge"
 >
 <span className="transition-transform hover:scale-110 flex items-center justify-center">
 <svg
 viewBox="0 0 24 24"
 fill="none"
 xmlns="http://www.w3.org/2000/svg"
 className={`${iconSizes[size]} drop-shadow-[0_1px_3px_rgba(122,0,0,0.45)]`}
 >
 <defs>
 <linearGradient id="agencyRubyGold" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor="#FFF2B2" />
 <stop offset="20%" stopColor="#E6A100" />
 <stop offset="50%" stopColor="#7A0000" />
 <stop offset="85%" stopColor="#4A0000" />
 <stop offset="100%" stopColor="#2A0000" />
 </linearGradient>
 <linearGradient id="agencyGoldRing" x1="100%" y1="0%" x2="0%" y2="100%">
 <stop offset="0%" stopColor="#FFE57F" />
 <stop offset="50%" stopColor="#FFC107" />
 <stop offset="100%" stopColor="#B28900" />
 </linearGradient>
 <linearGradient id="agencyGloss" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
 <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.05" />
 </linearGradient>
 </defs>

 {/* Outer Faceted Geometric Diamond / Octagon Seal */}
 <polygon
 points="12,1 18,3 23,8 23,16 18,21 12,23 6,21 1,16 1,8 6,3"
 fill="url(#agencyRubyGold)"
 stroke="url(#agencyGoldRing)"
 strokeWidth="1.5"
 strokeLinejoin="round"
 />

 {/* Inner Light Reflection / Cut */}
 <polygon
 points="12,3.5 17,5 21,9 21,15 17,19 12,20.5 7,19 3,15 3,9 7,5"
 fill="none"
 stroke="url(#agencyGloss)"
 strokeWidth="0.75"
 opacity="0.8"
 />

 {/* Central Stylized Luxury Agency Monogram 'A' & Runway Star Pillar */}
 {/* Left leg of A */}
 <path
 d="M8.5 17L12 6.5L15.5 17"
 stroke="url(#agencyGoldRing)"
 strokeWidth="2.2"
 strokeLinecap="round"
 strokeLinejoin="round"
 />
 {/* Horizontal crossbar of A */}
 <path
 d="M9.8 13.5H14.2"
 stroke="#FFF2B2"
 strokeWidth="1.8"
 strokeLinecap="round"
 />
 {/* Top Star Sparkle */}
 <circle cx="12" cy="6.2" r="1.3" fill="#FFFFFF" />
 <circle cx="12" cy="6.2" r="0.8" fill="#FFF2B2" />
 </svg>
 </span>

 {showLabel && (
 <span
 className={`font-mono font-black uppercase tracking-widest bg-brand-dark text-[#ffe57f] border border-brand-dark inline-flex items-center gap-1 leading-none ${labelSizes[size]}`}
 >
 <span>AGENCY</span>
 {agencyName && <span className="text-white/80 font-normal">| {agencyName}</span>}
 </span>
 )}
 </span>
 );
}
