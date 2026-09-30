import React from 'react';
import { useTranslation } from 'react-i18next';

interface SilverNeedleBadgeProps {
 size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
 showLabel?: boolean;
 className?: string;
}

export default function SilverNeedleBadge({
 size = 'sm',
 showLabel = true,
 className = ''
}: SilverNeedleBadgeProps) {
 const { t } = useTranslation();

 const iconSizes = {
 xs: 'w-3.5 h-3.5',
 sm: 'w-4 h-4',
 md: 'w-5 h-5',
 lg: 'w-6 h-6',
 xl: 'w-8 h-8'
 };

 const titleText = t('silver_needle_tooltip', 'Gümüş İynə / Серебряная Игла • Проверенный дизайнер / Pro');

 return (
 <span
 title={titleText}
 className={`inline-flex items-center gap-1 shrink-0 select-none transition-transform hover:scale-105 align-middle ${className}`}
 aria-label="Silver Needle Verified"
 >
 <svg
 viewBox="0 0 24 24"
 fill="none"
 xmlns="http://www.w3.org/2000/svg"
 className={`${iconSizes[size]} drop-shadow-[0_1px_2px_rgba(71,85,105,0.4)]`}
 >
 <defs>
 <linearGradient id="silverNeedleGradient" x1="100%" y1="0%" x2="0%" y2="100%">
 <stop offset="0%" stopColor="#FFFFFF" />
 <stop offset="25%" stopColor="#E2E8F0" />
 <stop offset="60%" stopColor="#94A3B8" />
 <stop offset="90%" stopColor="#64748B" />
 <stop offset="100%" stopColor="#334155" />
 </linearGradient>
 <linearGradient id="silverHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
 <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.2" />
 </linearGradient>
 </defs>

 {/* Needle Body */}
 <path
 d="M21.707 2.293a1.5 1.5 0 0 0-2.121 0L17.5 4.379l1.121 1.121 1.086-1.086a.5.5 0 0 1 .707.707l-1.086 1.086 1.121 1.121 2.086-2.086a1.5 1.5 0 0 0 0-2.121l-.828-.828z"
 fill="url(#silverNeedleGradient)"
 />
 <path
 d="M17.5 4.379L2.854 19.025a1 1 0 0 0-.263.465l-1.5 5a.5.5 0 0 0 .618.618l5-1.5a1 1 0 0 0 .465-.263L21.828 8.697 17.5 4.379z"
 fill="url(#silverNeedleGradient)"
 />

 {/* Needle Eye Hole cutout */}
 <ellipse
 cx="19.2"
 cy="4.8"
 rx="1.3"
 ry="0.55"
 transform="rotate(-45 19.2 4.8)"
 fill="#0f172a"
 />

 {/* Metallic Highlight Ridge */}
 <path
 d="M18.2 5.8L4.2 19.8l1.4 1.4L19.6 7.2l-1.4-1.4z"
 fill="url(#silverHighlight)"
 opacity="0.75"
 />

 {/* Needle Tip Piercing Point */}
 <path
 d="M1.091 24.5l.8-2.6 1.8 1.8-2.6.8z"
 fill="#E2E8F0"
 />

 {/* Silver Thread Shimmer */}
 <path
 d="M22.5 1.5 C 24 3, 20.5 5.5, 19.2 4.8"
 stroke="#E2E8F0"
 strokeWidth="0.8"
 strokeLinecap="round"
 fill="none"
 opacity="0.9"
 />
 </svg>
 {showLabel && (
 <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 bg-slate-100 px-1.5 py-0.5 border border-slate-300">
 Silver Needle
 </span>
 )}
 </span>
 );
}
