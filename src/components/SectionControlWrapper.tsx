import React from 'react';
import { useSiteFeatures } from '../context/SiteFeaturesContext';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ShieldAlert, CheckCircle2, Sliders } from 'lucide-react';

interface SectionControlWrapperProps {
  featureId: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export default function SectionControlWrapper({
  featureId,
  title,
  subtitle,
  children,
  className = ''
}: SectionControlWrapperProps) {
  const { isFeatureEnabled, toggleFeature, visualEditMode } = useSiteFeatures();
  const { isAdmin } = useAuth();

  const isEnabled = isFeatureEnabled(featureId);

  // 1. If disabled and NOT admin -> completely hide the section from visitors
  if (!isEnabled && !isAdmin) {
    return null;
  }

  // 2. If disabled and viewer IS admin -> show preview with prominent re-enable button
  if (!isEnabled && isAdmin) {
    return (
      <div className={`relative my-6 mx-2 sm:mx-4 border-2 border-dashed border-red-500/70 bg-red-50/60 dark:bg-red-950/20 rounded-3xl p-4 sm:p-6 overflow-hidden ${className}`}>
        {/* Admin floating alert banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-600 text-white px-4 py-2.5 rounded-2xl shadow-md mb-4">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={18} className="shrink-0 text-white" />
            <div>
              <div className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider">
                [РАЗДЕЛ ОТКЛЮЧЕН]: {title}
              </div>
              <div className="text-[11px] text-white/80 font-normal">
                {subtitle || 'Этот блок сейчас скрыт от обычных посетителей сайта.'}
              </div>
            </div>
          </div>

          <button
            onClick={() => toggleFeature(featureId, true)}
            className="bg-white text-red-700 hover:bg-neutral-100 font-mono font-bold text-xs uppercase px-4 py-2 rounded-full flex items-center justify-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer active:scale-95"
            title="Нажмите, чтобы включить этот раздел обратно"
          >
            <CheckCircle2 size={14} />
            <span>Включить раздел</span>
          </button>
        </div>

        {/* Dimmed preview of the content */}
        <div className="opacity-30 pointer-events-none filter grayscale select-none">
          {children}
        </div>
      </div>
    );
  }

  // 3. If enabled and in Visual Edit Mode (Admin is editing site visually)
  if (visualEditMode && isAdmin) {
    return (
      <div className={`relative group my-3 mx-1 sm:mx-2 border-2 border-dashed border-emerald-500/60 hover:border-brand-accent rounded-3xl p-1.5 sm:p-3 transition-all ${className}`}>
        {/* Floating control pill for this section */}
        <div className="sticky top-20 z-40 flex items-center justify-between gap-3 bg-brand-dark/95 text-white backdrop-blur-xl px-4 py-2 rounded-full border border-white/20 shadow-xl mb-3 max-w-xl mx-auto animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <Sliders size={13} className="text-brand-accent shrink-0" />
            <span className="text-xs font-mono font-bold truncate">
              {title}
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
              АКТИВЕН
            </span>
          </div>

          <button
            onClick={() => toggleFeature(featureId, false)}
            className="bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1 transition-all shrink-0 cursor-pointer active:scale-95 shadow-xs"
            title="Отключить этот раздел"
          >
            <EyeOff size={12} />
            <span>Выключить</span>
          </button>
        </div>

        <div>{children}</div>
      </div>
    );
  }

  // 4. Default: normal render for enabled section
  return <>{children}</>;
}
