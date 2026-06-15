import React from 'react';
import type { AppLanguage } from '../../lib/lang';

interface LanguageSwitcherProps {
  language: AppLanguage;
  onChange: (lang: AppLanguage) => void;
  variant?: 'dark' | 'light';
  className?: string;
}

export default function LanguageSwitcher({
  language,
  onChange,
  variant = 'light',
  className = '',
}: LanguageSwitcherProps) {
  return (
    <div
      className={`ios-lang-switch ${variant === 'light' ? 'ios-lang-switch-light' : ''} ${className}`.trim()}
    >
      <button
        type="button"
        onClick={() => onChange('lotin')}
        className={`ios-lang-btn ${language === 'lotin' ? 'ios-lang-active' : ''}`}
      >
        Lotin
      </button>
      <button
        type="button"
        onClick={() => onChange('kirill')}
        className={`ios-lang-btn ${language === 'kirill' ? 'ios-lang-active' : ''}`}
      >
        Кирилл
      </button>
    </div>
  );
}
