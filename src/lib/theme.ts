export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'soglik_theme';

export function getStoredTheme(): Theme {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  return saved === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'light' ? '#eef2f8' : '#070b14');
  }
}
