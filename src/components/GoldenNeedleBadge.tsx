import React from 'react';
import { useTranslation } from 'react-i18next';

interface GoldenNeedleBadgeProps {
 size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
 className?: string;
 showLabel?: boolean; // kept optional for backwards compatibility, but ignored
}

export default function GoldenNeedleBadge({
 size = 'sm',
 className = ''
}: GoldenNeedleBadgeProps) {
 const { t } = useTranslation();

 const iconSizes = {
 xs: 'w-3.5 h-3.5',
 sm: 'w-4 h-4',
 md: 'w-5 h-5',
 lg: 'w-6 h-6',
 xl: 'w-8 h-8'
 };

 const titleText = t('golden_needle_tooltip', 'Qızıl İynə / Золотая Игла • Подтвержденный профиль моды');

 return (
 <span
 title={titleText}
 className={`inline-flex items-center justify-center shrink-0 select-none transition-transform hover:scale-110 align-middle ${className}`}
 aria-label="Golden Needle Verified"
 >
 <svg
 viewBox="0 0 24 24"
 fill="none"
 xmlns="http://www.w3.org/2000/svg"
 className={`${iconSizes[size]} drop-shadow-[0_1px_2px_rgba(180,83,9,0.5)]`}
 >
 <defs>
 <linearGradient id="goldNeedleGradient" x1="100%" y1="0%" x2="0%" y2="100%">
 <stop offset="0%" stopColor="#FFF9C4" />
 <stop offset="25%" stopColor="#FFE082" />
 <stop offset="60%" stopColor="#FFB300" />
 <stop offset="90%" stopColor="#FF8F00" />
 <stop offset="100%" stopColor="#E65100" />
 </linearGradient>
 <linearGradient id="goldHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
 <stop offset="100%" stopColor="#FFE082" stopOpacity="0.2" />
 </linearGradient>
 </defs>

 {/* Needle Body (Tapered shaft with needle eye at top-right) */}
 <path
 d="M21.707 2.293a1.5 1.5 0 0 0-2.121 0L17.5 4.379l1.121 1.121 1.086-1.086a.5.5 0 0 1 .707.707l-1.086 1.086 1.121 1.121 2.086-2.086a1.5 1.5 0 0 0 0-2.121l-.828-.828z"
 fill="url(#goldNeedleGradient)"
 />
 <path
 d="M17.5 4.379L2.854 19.025a1 1 0 0 0-.263.465l-1.5 5a.5.5 0 0 0 .618.618l5-1.5a1 1 0 0 0 .465-.263L21.828 8.697 17.5 4.379z"
 fill="url(#goldNeedleGradient)"
 />

 {/* Needle Eye Hole cutout */}
 <ellipse
 cx="19.2"
 cy="4.8"
 rx="1.3"
 ry="0.55"
 transform="rotate(-45 19.2 4.8)"
 fill="#1c1917"
 />

 {/* Metallic Highlight Ridge */}
 <path
 d="M18.2 5.8L4.2 19.8l1.4 1.4L19.6 7.2l-1.4-1.4z"
 fill="url(#goldHighlight)"
 opacity="0.6"
 />

 {/* Needle Tip Piercing Point */}
 <path
 d="M1.091 24.5l.8-2.6 1.8 1.8-2.6.8z"
 fill="#FFD54F"
 />

 {/* Golden Thread Shimmer flowing through eye */}
 <path
 d="M22.5 1.5 C 24 3, 20.5 5.5, 19.2 4.8"
 stroke="#FFE082"
 strokeWidth="0.8"
 strokeLinecap="round"
 fill="none"
 opacity="0.8"
 />
 </svg>
 </span>
 );
}

