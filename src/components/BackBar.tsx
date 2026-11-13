import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

interface BackBarProps {
  title: string;
  backLabel?: string;
  fallbackPath?: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
}

export function BackBar({ title, backLabel = 'Back', fallbackPath = '/', onBack, rightSlot }: BackBarProps) {
  const { goBack } = useApp();

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 no-print">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : goBack(fallbackPath))}
          className="min-h-[44px] px-2.5 -ml-2 rounded-xl inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition-all shrink-0"
          aria-label={backLabel}
        >
          <ArrowLeft className="w-4 h-4 text-blue-700 dark:text-sky-400" />
          <span className="hidden sm:inline">{backLabel}</span>
        </button>
        <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">{title}</h1>
      </div>
      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
    </div>
  );
}
