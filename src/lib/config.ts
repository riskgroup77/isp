/**
 * ISP backend manzilini aniqlaydi.
 *
 * Standart holat — bo'sh satr. Bu holda barcha so'rovlar nisbiy yo'l bilan
 * (`/api/...`) sahifaning o'z origini ga yuboriladi. Express serverning o'zi
 * ham API ni, ham frontendni bergani uchun ilova HTTP va HTTPS da bir xil
 * ishlaydi: mixed-content bloklanmaydi va CORS talab qilinmaydi.
 *
 * Backend alohida domenda bo'lsa, `VITE_API_URL` ga to'liq manzil beriladi.
 */

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function pageIsSecure(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'https:';
}

function sameHostAsPage(url: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URL(url).host === window.location.host;
  } catch {
    return false;
  }
}

function resolveBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL ?? '').trim();

  // Bo'sh, "/" yoki "same-origin" — nisbiy yo'l ishlatiladi
  if (!raw || raw === '/' || raw.toLowerCase() === 'same-origin') return '';

  const base = stripTrailingSlash(raw);

  // Nisbiy manzil ("/api" kabi) bo'lsa o'zgartirilmaydi
  if (!/^https?:\/\//i.test(base)) return base;

  // HTTPS sahifadan HTTP backendga so'rov brauzer tomonidan bloklanadi
  if (pageIsSecure() && base.toLowerCase().startsWith('http://')) {
    if (sameHostAsPage(base)) return '';
    const upgraded = `https://${base.slice('http://'.length)}`;
    console.warn(
      `[config] VITE_API_URL HTTP manzilda (${base}), sahifa esa HTTPS da. ` +
        `Mixed-content bloklanmasligi uchun ${upgraded} ishlatilmoqda.`
    );
    return upgraded;
  }

  // Backend sahifaning o'zi bilan bir xil hostda — nisbiy yo'l ishonchliroq
  if (sameHostAsPage(base)) return '';

  return base;
}

export const API_BASE_URL = resolveBaseUrl();

/** Nisbiy yo'lni to'liq so'rov manziliga aylantiradi */
export function buildApiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

/**
 * Backend qaytargan manzilni (masalan Excel yuklash havolasi) so'rovga tayyor
 * holga keltiradi: nisbiy bo'lsa base qo'shadi, HTTPS sahifada HTTP manzilni
 * bloklanmasligi uchun HTTPS ga o'tkazadi.
 */
export function resolveExternalUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) return buildApiUrl(url);
  if (pageIsSecure() && url.toLowerCase().startsWith('http://')) {
    return `https://${url.slice('http://'.length)}`;
  }
  return url;
}
