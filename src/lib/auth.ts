import type { UserProfile } from '../types';

const TOKEN_KEY = 'soglik_auth_token';
const USER_KEY = 'soglik_portal_user';

export type SafeUserProfile = Omit<UserProfile, 'parol'>;

/** Serverdan kelgan foydalanuvchini xavfsiz saqlash uchun parolni olib tashlaydi */
export function sanitizeUser(user: UserProfile | SafeUserProfile): SafeUserProfile {
  const { parol: _removed, ...safe } = user as UserProfile;
  return safe;
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthSession(token: string, user: UserProfile | SafeUserProfile) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(sanitizeUser(user)));
}

export function getStoredUser(): SafeUserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return sanitizeUser(parsed);
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
