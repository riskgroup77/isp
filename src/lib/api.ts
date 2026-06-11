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

  const response = await fetch(resolveApiUrl(path), { ...options, headers });

  if (response.status === 401 && !options.skipAuth) {
    clearAuthSession();
    window.dispatchEvent(new CustomEvent('soglik:auth-expired'));
  }

  return response;
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
