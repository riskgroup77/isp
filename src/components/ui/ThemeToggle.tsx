import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import type { AppLanguage } from '../../lib/lang';
import { t } from '../../lib/lang';

interface ThemeToggleProps {
  language?: AppLanguage;
  className?: string;
  variant?: 'dark' | 'light';
}

export default function ThemeToggle({
  language = 'lotin',
  className = '',
  variant = 'dark',
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const label = isDark
    ? t('Oq rejim', language)
    : t('Qora rejim', language);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`ios-theme-toggle ${variant === 'light' ? 'ios-theme-toggle-light' : ''} ${className}`.trim()}
      aria-label={label}
      title={label}
    >
      {isDark ? (
        <Sun className="w-3.5 h-3.5" aria-hidden="true" />
      ) : (
        <Moon className="w-3.5 h-3.5" aria-hidden="true" />
      )}
    </button>
  );
}
