import React from 'react';

interface ModelVerifiedBadgeProps {
 agencyName?: string;
 showLabel?: boolean;
 size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
 className?: string;
 interactive?: boolean;
}

export default function ModelVerifiedBadge({
 agencyName,
 showLabel = false,
 size = 'sm',
 className = '',
 interactive = false
}: ModelVerifiedBadgeProps) {
 const sizeClasses = {
 xs: {
 container: 'px-1 py-0.2 text-[9px] gap-0.5 border',
 emoji: 'text-[10px]',
 text: 'text-[8px]'
 },
 sm: {
 container: 'px-1.5 py-0.5 text-[10px] gap-1 border-1.5 sm:border-2',
 emoji: 'text-xs',
 text: 'text-[9px]'
 },
 md: {
 container: 'px-2 py-1 text-xs gap-1.5 border-2',
 emoji: 'text-sm',
 text: 'text-[10px]'
 },
 lg: {
 container: 'px-3 py-1.5 text-sm gap-2 border-2',
 emoji: 'text-base',
 text: 'text-xs'
 },
 xl: {
 container: 'px-4 py-2 text-base gap-2.5 border-3',
 emoji: 'text-xl',
 text: 'text-sm'
 }
 }[size];

 const tooltipTitle = agencyName 
 ? `Подтвержденная модель агентства «${agencyName}» 😎` 
 : 'Верифицированная модель агентства 😎';

 return (
 <span
 title={tooltipTitle}
 className={`inline-flex items-center font-bold uppercase tracking-wider bg-[#fff7d6] text-brand-dark border-brand-dark select-none ${sizeClasses.container} ${interactive ? 'cursor-pointer hover:bg-brand-accent hover:text-white transition-colors' : ''} ${className}`}
 >
 <span className={`leading-none ${sizeClasses.emoji}`} role="img" aria-label="Verified Model">
 😎
 </span>
 {showLabel && (
 <span className={`font-extrabold font-mono tracking-widest ${sizeClasses.text}`}>
 {agencyName ? agencyName : 'MODEL'}
 </span>
 )}
 </span>
 );
}
