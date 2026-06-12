import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import {
  DISCLAIMER_TEXTS,
  getDisclaimerDiagnostic,
  getDisclaimerExtended,
  getDisclaimerPrimary,
  getDisclaimerTitle,
} from '../lib/disclaimer';
import { t, type AppLanguage } from '../lib/lang';

interface MedicalDisclaimerProps {
  language?: AppLanguage;
  variant?: 'auth' | 'card' | 'print' | 'compact' | 'diagnostic';
  className?: string;
  showIcon?: boolean;
}

export default function MedicalDisclaimer({
  language = 'lotin',
  variant = 'card',
  className = '',
  showIcon = true,
}: MedicalDisclaimerProps) {
  if (variant === 'compact') {
    return (
      <p className={`text-[10px] leading-relaxed text-slate-600 ${className}`}>
        <span className="font-extrabold uppercase text-slate-700">{getDisclaimerTitle(language)}: </span>
        {getDisclaimerPrimary(language)}
      </p>
    );
  }

  if (variant === 'auth') {
    return (
      <div
        className={`ios-alert ios-alert-warn rounded-[var(--ios-radius)] p-4 space-y-2 ${className}`}
        id="medical-disclaimer-auth"
        role="note"
        aria-label={getDisclaimerTitle(language)}
      >
        {showIcon && (
          <div className="flex items-center gap-2 text-amber-800">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">
              {getDisclaimerTitle(language)}
            </span>
          </div>
        )}
        <p className="text-xs font-bold text-amber-950 leading-relaxed border-b border-amber-200 pb-2">
          {getDisclaimerPrimary(language)}
        </p>
        <p className="text-[11px] text-amber-900 leading-relaxed">
          {getDisclaimerExtended(language)}
        </p>
        <p className="text-[10px] text-amber-700 italic pt-1">
          {t(DISCLAIMER_TEXTS.authNotice, language)}
        </p>
      </div>
    );
  }

  if (variant === 'print') {
    return (
      <div
        className={`border-2 border-slate-900 bg-slate-50 p-4 text-black space-y-2 ${className}`}
        id="medical-disclaimer-print"
        role="note"
      >
        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />}
          {getDisclaimerTitle(language)}
        </h4>
        <p className="text-[10px] font-bold leading-relaxed text-slate-900">
          {getDisclaimerPrimary(language)}
        </p>
        <p className="text-[9px] leading-relaxed text-slate-700">
          {getDisclaimerExtended(language)}
        </p>
      </div>
    );
  }

  if (variant === 'diagnostic') {
    return (
      <div className={`space-y-1 text-[10px] text-slate-600 leading-relaxed ${className}`}>
        <h4 className="font-extrabold text-slate-800 uppercase">
          {t(DISCLAIMER_TEXTS.diagnosticReportTitle, language)}
        </h4>
        <p>{getDisclaimerDiagnostic(language)}</p>
        <p className="font-semibold text-slate-800 pt-1 border-t border-slate-200 mt-2">
          {getDisclaimerPrimary(language)}
        </p>
      </div>
    );
  }

  // card (default — footer va umumiy ko'rinish)
  return (
    <div
      className={`ios-card p-4 text-[11px] leading-relaxed text-slate-600 ${className}`}
      id="medical-disclaimer-card"
      role="note"
    >
      <span className="font-extrabold uppercase text-slate-700 flex items-center gap-1.5 mb-1">
        {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
        {getDisclaimerTitle(language)}
      </span>
      <p className="font-semibold text-slate-800 mb-1">{getDisclaimerPrimary(language)}</p>
      <p>{getDisclaimerExtended(language)}</p>
    </div>
  );
}
