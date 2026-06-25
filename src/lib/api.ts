import { API_BASE_URL } from './config';
import { clearAuthSession, getAuthToken } from './auth';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type ApiFetchOptions = RequestInit & {
  skipAuth?: boolean;
  /** Submit/AI so'rovlari uchun 180000 ms tavsiya etiladi */
  timeoutMs?: number;
};

function resolveApiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

function parseApiError(data: unknown, status: number): string {
  if (!data || typeof data !== 'object') {
    return `So'rov muvaffaqiyatsiz (${status})`;
  }
  const record = data as Record<string, unknown>;
  if (typeof record.detail === 'string') return record.detail;
  if (Array.isArray(record.detail)) {
    return record.detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: string }).msg);
        }
        return JSON.stringify(item);
      })
      .join('; ');
  }
  if (typeof record.error === 'string') return record.error;
  if (typeof record.message === 'string') return record.message;
  if (status === 504) {
    return "Server javob bermadi (504 Gateway Timeout). Anketa saqlash va AI tahlil juda uzoq davom etdi — bu backend yoki proxy timeout muammosi.";
  }
  if (status === 502) {
    return "Server vaqtincha ishlamayapti (502). Keyinroq qayta urinib ko'ring.";
  }
  return `So'rov muvaffaqiyatsiz (${status})`;
}

export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (!options.skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  try {
    const timeoutMs = options.timeoutMs;
    let signal = options.signal;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (timeoutMs && timeoutMs > 0 && !signal) {
      const controller = new AbortController();
      signal = controller.signal;
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }

    const response = await fetch(resolveApiUrl(path), {
      ...options,
      headers,
      signal,
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (response.status === 401 && !options.skipAuth) {
      clearAuthSession();
      window.dispatchEvent(new CustomEvent('soglik:auth-expired'));
    }

    return response;
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    const msg = aborted
      ? "So'rov vaqti tugadi. AI tahlil uzoq davom etishi mumkin — biroz kutib qayta urinib ko'ring."
      : err instanceof Error && err.message.includes('Failed to fetch')
        ? "Tarmoq xatosi: serverga ulanib bo'lmadi yoki ulanish vaqt tugadi (timeout)."
        : err instanceof Error
          ? err.message
          : "Tarmoq xatosi";
    throw new ApiError(msg, aborted ? 408 : 0);
  }
}

export async function apiJson<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const res = await apiFetch(path, options);

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(parseApiError(data, res.status), res.status);
  }

  return data as T;
}

/** Excel, fayl yuklab olish uchun blob javob */
export async function apiBlob(
  path: string,
  options: ApiFetchOptions = {}
): Promise<Blob> {
  const res = await apiFetch(path, options);

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(parseApiError(data, res.status), res.status);
  }

  return res.blob();
}
