import React, { createContext, useContext, useState, ReactNode } from 'react';
import { playNotificationSound } from '../lib/soundEffects';

interface UIContextType {
 confirm: (message: string) => Promise<boolean>;
 alert: (message: string) => Promise<void>;
}

const UIContext = createContext<UIContextType | null>(null);

export const useUI = () => {
 const context = useContext(UIContext);
 if (!context) throw new Error('useUI must be used within UIProvider');
 return context;
};

export const UIProvider = ({ children }: { children: ReactNode }) => {
 const [dialog, setDialog] = useState<{
 type: 'alert' | 'confirm';
 message: string;
 resolve: (value: boolean | void) => void;
 } | null>(null);

 const confirm = (message: string): Promise<boolean> => {
 playNotificationSound();
 return new Promise((resolve) => {
 setDialog({ type: 'confirm', message, resolve: resolve as any });
 });
 };

 const showConfirm = confirm; // Avoid shadowing window.confirm if not careful, but here we're okay.

 const showAlert = (message: string): Promise<void> => {
 playNotificationSound();
 return new Promise((resolve) => {
 setDialog({ type: 'alert', message, resolve: resolve as any });
 });
 };

 const handleClose = (result: boolean) => {
 if (dialog) {
 if (dialog.type === 'confirm') {
 (dialog.resolve as (value: boolean) => void)(result);
 } else {
 (dialog.resolve as (value: void) => void)();
 }
 setDialog(null);
 }
 };

 return (
 <UIContext.Provider value={{ confirm: showConfirm, alert: showAlert }}>
 {children}
 {dialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-brand-dark/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-brand-dark/[0.08] p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
                Baku Fashion Week
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-serif font-normal tracking-tight text-brand-dark mb-6 whitespace-pre-wrap leading-relaxed">
              {dialog.message}
            </h3>
            <div className="flex justify-end gap-3 pt-2 border-t border-brand-dark/[0.08]">
              {dialog.type === 'confirm' && (
                <button 
                  onClick={() => handleClose(false)}
                  className="px-5 py-2.5 rounded-full border border-brand-dark/[0.15] bg-white font-semibold uppercase tracking-wider text-xs text-brand-dark hover:bg-brand-muted transition-colors cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
              )}
              <button 
                onClick={() => handleClose(true)}
                className="bg-brand-dark hover:bg-brand-accent text-white px-6 py-2.5 rounded-full font-semibold uppercase tracking-wider text-xs transition-colors cursor-pointer shadow-2xs"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
 );
};
