import { apiFetch, apiJson } from './api';
import type { SafeUserProfile } from './auth';
import {
  mapApiAdvice,
  mapApiPatientBundle,
  mapApiUserToProfile,
  mapHistoryItemToApiScreening,
  mapJournalEntryToApi,
  mapProfileToApi,
  mapQuestionnaireToApiScreening,
  mapSyncResponseToUser,
  type ApiAdviceResponse,
  type ApiPatientBundle,
  type ApiSyncResponse,
  type ApiUserResponse,
} from './apiMappers';
import type {
  HealthJournalEntry,
  PatientAdvice,
  QuestionnaireData,
  RiskAnalysisResult,
  TextAnalysisResponse,
  UserProfile,
  UserRole,
} from '../types';
import type { ClientScreeningHistoryItem } from './screeningHistory';
import { normalizeRiskResult } from './riskResult';

export interface AuthResponse {
  user: ApiUserResponse;
  accessToken: string;
  tokenType?: string;
  message?: string;
}

export async function loginUser(login: string, parol: string): Promise<AuthResponse> {
  return apiJson<AuthResponse>('/api/auth/login', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ login, parol }),
  });
}

export async function registerPatient(payload: {
  login: string;
  parol: string;
  ism: string;
  shaharTuman?: string;
  yosh?: number;
  jins?: 'erkak' | 'ayol';
  boy?: number;
  vazn?: number;
}): Promise<AuthResponse> {
  return apiJson<AuthResponse>('/api/auth/register', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify(payload),
  });
}

export async function logoutUser(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST', skipAuth: true });
}

export interface SyncPayload {
  profile?: Record<string, unknown>;
  screenings?: Record<string, unknown>[];
  journalEntries?: Record<string, unknown>[];
}

export async function syncPatientData(
  userId: string,
  payload: SyncPayload
): Promise<UserProfile> {
  const response = await apiJson<ApiSyncResponse>(`/api/patients/${userId}/sync`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapSyncResponseToUser(response);
}

/** Serverdan bemor ma'lumotlarini olish (sync POST bo'sh yoki faqat profile bilan) */
export async function hydratePatientData(
  userId: string,
  profile?: SafeUserProfile
): Promise<UserProfile> {
  const payload: SyncPayload = {};
  if (profile) {
    payload.profile = mapProfileToApi(profile);
  }
  return syncPatientData(userId, payload);
}

export async function syncNewJournalEntries(
  userId: string,
  entries: HealthJournalEntry[],
  profile?: SafeUserProfile
): Promise<UserProfile> {
  const payload: SyncPayload = {
    journalEntries: entries.map(mapJournalEntryToApi),
  };
  if (profile) {
    payload.profile = mapProfileToApi(profile);
  }
  return syncPatientData(userId, payload);
}

export async function syncNewScreenings(
  userId: string,
  questionnaires: QuestionnaireData[],
  profile?: SafeUserProfile
): Promise<UserProfile> {
  const payload: SyncPayload = {
    screenings: questionnaires.map(mapQuestionnaireToApiScreening),
  };
  if (profile) {
    payload.profile = mapProfileToApi(profile);
  }
  return syncPatientData(userId, payload);
}

/** Bitta skrining yozuvini serverdan o'chirish */
export async function deletePatientScreening(
  userId: string,
  screeningId: string
): Promise<void> {
  await apiJson(
    `/api/patients/${encodeURIComponent(userId)}/sync/screenings/${encodeURIComponent(screeningId)}`,
    { method: 'DELETE' }
  );
}

/** Bemorning barcha skrining arxivini serverdan o'chirish */
export async function deleteAllPatientScreenings(userId: string): Promise<void> {
  await apiJson(
    `/api/patients/${encodeURIComponent(userId)}/sync/screenings`,
    { method: 'DELETE' }
  );
}

/** Arxivdan o'chirgandan keyin qolgan skrininglarni serverga yozish */
export async function syncFullScreeningHistory(
  userId: string,
  items: ClientScreeningHistoryItem[],
  profile?: SafeUserProfile
): Promise<UserProfile> {
  const payload: SyncPayload = {
    screenings: items.map(mapHistoryItemToApiScreening),
  };
  if (profile) {
    payload.profile = mapProfileToApi(profile);
  }
  return syncPatientData(userId, payload);
}

export async function getPatientAdvices(userId: string): Promise<PatientAdvice[]> {
  const data = await apiJson<ApiAdviceResponse[]>(`/api/patients/${userId}/advices`);
  return data.map(mapApiAdvice);
}

export async function getPatientsForDoctor(): Promise<UserProfile[]> {
  const data = await apiJson<ApiPatientBundle[]>('/api/patients');
  return data.map(mapApiPatientBundle);
}

export async function postPatientAdvice(
  userId: string,
  matn: string,
  sana: string,
  vaqt: string
): Promise<PatientAdvice> {
  const data = await apiJson<ApiAdviceResponse>(`/api/patients/${userId}/advice`, {
    method: 'POST',
    body: JSON.stringify({ matn, sana, vaqt }),
  });
  return mapApiAdvice(data);
}

export async function getAdminUsers(): Promise<SafeUserProfile[]> {
  const data = await apiJson<ApiUserResponse[]>('/api/admin/users');
  return data.map(mapApiUserToProfile);
}

export interface AdminUserUpdatePayload {
  ism?: string;
  rol?: UserRole;
  tasdiqlangan?: boolean;
  mutaxassislik?: string;
  shifoxona?: string;
  parol?: string;
  shaharTuman?: string;
  yosh?: number;
  jins?: 'erkak' | 'ayol';
  boy?: number;
  vazn?: number;
}

export async function updateAdminUser(
  userId: string,
  patch: AdminUserUpdatePayload
): Promise<SafeUserProfile> {
  const data = await apiJson<ApiUserResponse>(`/api/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
  return mapApiUserToProfile(data);
}

export async function createAdminDoctor(payload: {
  login: string;
  parol: string;
  ism: string;
  mutaxassislik: string;
  shifoxona: string;
  shaharTuman?: string;
  tasdiqlangan?: boolean;
}): Promise<SafeUserProfile> {
  const data = await apiJson<ApiUserResponse>('/api/admin/users/doctor', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapApiUserToProfile(data);
}

/** Bemor hisobini yaratish (ochiq register endpoint — faqat foydalanuvchi) */
export async function createPatientUser(payload: {
  login: string;
  parol: string;
  ism: string;
  shaharTuman?: string;
  yosh?: number;
  jins?: 'erkak' | 'ayol';
  boy?: number;
  vazn?: number;
}): Promise<SafeUserProfile> {
  const data = await registerPatient(payload);
  return mapApiUserToProfile(data.user);
}

export async function deleteAdminUser(userId: string): Promise<void> {
  const res = await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    const message =
      (data as { detail?: string }).detail || `So'rov muvaffaqiyatsiz (${res.status})`;
    throw new Error(message);
  }
}

export async function predictRisk(data: QuestionnaireData): Promise<RiskAnalysisResult> {
  const result = await apiJson<Partial<RiskAnalysisResult>>('/api/predict-risk', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return normalizeRiskResult(result);
}

export async function analyzeComplaint(matn: string): Promise<TextAnalysisResponse> {
  const data = await apiJson<Omit<TextAnalysisResponse, 'muvaffaqiyatli'>>(
    '/api/analyze-complaint',
    {
      method: 'POST',
      body: JSON.stringify({ matn }),
    }
  );
  return { muvaffaqiyatli: true, ...data };
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function advisorChat(
  xabar: string,
  tarix: ChatHistoryMessage[]
): Promise<{ javob: string; tarix: ChatHistoryMessage[] }> {
  return apiJson<{ javob: string; tarix: ChatHistoryMessage[] }>('/api/advisor-chat', {
    method: 'POST',
    body: JSON.stringify({ xabar, tarix }),
  });
}

/** Chat UI formatidan API tarix formatiga */
export function mapUiChatToApiHistory(
  messages: { role: 'user' | 'model'; text: string }[]
): ChatHistoryMessage[] {
  return messages
    .filter((m) => m.text.trim())
    .map((m) => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.text,
    }));
}

/** API tarixini chat UI formatiga */
export function mapApiChatToUi(
  tarix: ChatHistoryMessage[]
): { id: string; role: 'user' | 'model'; text: string }[] {
  return tarix.map((m, idx) => ({
    id: `chat-${idx}-${m.role}`,
    role: m.role === 'assistant' ? 'model' : 'user',
    text: m.content,
  }));
}

/** Faqat yangi (hali sync qilinmagan) kundalik yozuvlarini aniqlash */
const SYNCED_JOURNAL_KEY = 'soglik_synced_journal_ids';

export function getSyncedJournalIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${SYNCED_JOURNAL_KEY}_${userId}`);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function markJournalIdsSynced(userId: string, ids: string[]): void {
  const existing = getSyncedJournalIds(userId);
  ids.forEach((id) => existing.add(id));
  localStorage.setItem(
    `${SYNCED_JOURNAL_KEY}_${userId}`,
    JSON.stringify([...existing])
  );
}

export function getUnsyncedJournalEntries(
  userId: string,
  entries: HealthJournalEntry[]
): HealthJournalEntry[] {
  const synced = getSyncedJournalIds(userId);
  return entries.filter((e) => !synced.has(e.id));
}

export function applyServerPatientDataToLocal(
  user: UserProfile,
  clientHistory?: ClientScreeningHistoryItem[]
): {
  history: ClientScreeningHistoryItem[];
  journal: HealthJournalEntry[];
} {
  const history =
    user.soglik_skrining_tarixi?.map((item, idx) => ({
      id: item.id || `hist-server-${idx}-${item.sana}`,
      date: item.sana,
      data: item.data,
      result: item.riskResult,
    })) || [];

  const journal = user.soglik_kundaligi || [];

  localStorage.setItem('soglik_skrining_tarixi', JSON.stringify(history));
  localStorage.setItem('soglik_kundaligi', JSON.stringify(journal));

  if (journal.length > 0) {
    markJournalIdsSynced(
      user.id,
      journal.map((j) => j.id)
    );
  }

  return { history, journal };
}
