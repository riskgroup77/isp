import { apiBlob, apiJson, ApiError } from './api';
import { resolveExternalUrl } from './config';
import { getAuthToken } from './auth';
import type { AdminStatisticsPayload } from '../../server/adminStatistics';
import { buildQuestionStatisticsFromResponses } from './questionStatisticsBuilder';
import {
  buildSearchStatisticsFallback,
  buildUserStatisticsFallback,
} from './statisticsFallback';
import { getAdminUsers } from './apiServices';
import type { SafeUserProfile } from './auth';
import type { AnketaTahlil } from '../types';

export type SurveyKind = 'anketa' | 'student' | 'pedagog';

export interface SurveyZoneStats {
  total: number;
  zones: {
    yashil: number;
    sariq: number;
    qizil: number;
  };
}

/** FastAPI /api/admin/statistics javobi */
export interface FastApiAdminStatistics {
  anketa?: SurveyZoneStats;
  student?: SurveyZoneStats;
  pedagog?: SurveyZoneStats;
}

export interface AnswerDistribution {
  javob: string;
  soni: number;
  foiz: number;
}

export interface QuestionStatistics {
  id: number;
  text: string;
  type: string;
  section?: string | null;
  jamiJavoblar: number;
  taqsimot: AnswerDistribution[];
}

export interface SectionStatistics {
  nomi: string;
  savollar: QuestionStatistics[];
}

export interface QuestionnaireStatistics {
  kind: SurveyKind;
  title: string;
  version: string;
  jamiJavoblar: number;
  boLimlar: SectionStatistics[];
}

export interface StatisticsUserItem {
  id: string;
  ism: string;
  login?: string;
  yosh?: number;
  jins?: string;
  shaharTuman?: string;
}

export interface UserAnswerItem {
  id: number;
  text: string;
  javob: string;
}

export interface UserSurveySection {
  nomi: string;
  javoblar: UserAnswerItem[];
}

export interface UserSurveyDetail {
  responseId?: string;
  riskFoizi?: number | null;
  zona?: string | null;
  klinikXulosa?: string | null;
  yaratilganSana?: string;
  boLimlar: UserSurveySection[];
}

export interface UserStatisticsDetail {
  foydalanuvchi: StatisticsUserItem;
  excelUrls?: Partial<Record<SurveyKind | 'all', string>>;
  soRovnomalar: UserSurveyDetail[];
}

export interface AnswerFilter {
  questionId: number;
  javob: string;
}

export interface SearchResultUser {
  yosh?: number;
  jins?: string;
  ism?: string;
  shaharTuman?: string;
}

export interface SearchResultItem {
  responseId: string;
  fish: string | null;
  riskFoizi: number | null;
  zona: string | null;
  klinikXulosa: string | null;
  foydalanuvchi: SearchResultUser | null;
  batafsilUrl: string;
  excelUrl: string;
}

export interface StatisticsSearchResponse {
  jami: number;
  excelUrl: string;
  natijalar: SearchResultItem[];
}

export interface ExcelSheetInfo {
  nomi: string;
  qatorlarSoni: number;
  ustunlar: string[];
}

export interface ExcelSectionSummary {
  boLim: string;
  asosiyKoRsatkichlar: string[];
  xulosa: string;
}

export interface ExcelFormulaItem {
  nomi: string;
  formula: string;
  izoh: string;
  qoLlanilganQism: string;
}

export type ExcelSourceType =
  | 'milliy_standart'
  | 'xalqaro'
  | 'ilmiy_adabiyot'
  | 'statistika'
  | 'gemini_tahlil'
  | string;

export interface ExcelSourceItem {
  nomi: string;
  turi: ExcelSourceType;
  havola: string | null;
  izoh: string;
}

export interface ExcelAnalyzeResponse {
  faylNomi: string;
  varaqlar: ExcelSheetInfo[];
  umumiyXulosa: string;
  statistikaXulosasi: ExcelSectionSummary[];
  tahlil: AnketaTahlil | null;
  formulalar: ExcelFormulaItem[];
  manbalar: ExcelSourceItem[];
  aiXato: string | null;
}

export interface AdminStatisticsResult {
  source: 'fastapi' | 'legacy';
  surveys?: FastApiAdminStatistics;
  legacy?: AdminStatisticsPayload;
}

export const SURVEY_KIND_LABELS: Record<SurveyKind, string> = {
  anketa: 'Anketa 2025',
  student: 'Talaba',
  pedagog: 'Pedagog',
};

function filenameFromUrl(url: string, fallback: string): string {
  try {
    const path = new URL(resolveExternalUrl(url), window.location.origin).pathname;
    const base = path.split('/').pop();
    if (base && base.includes('.')) return base;
  } catch {
    /* ignore */
  }
  return fallback;
}

/** Excel URL lar Bearer token bilan yuklanadi */
export async function downloadAuthenticatedFile(
  url: string,
  fallbackFilename: string
): Promise<void> {
  const token = getAuthToken();
  const fullUrl = resolveExternalUrl(url);
  const res = await fetch(fullUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(
      typeof data === 'object' && data && 'detail' in data
        ? String((data as { detail: string }).detail)
        : `Yuklab olish muvaffaqiyatsiz (${res.status})`,
      res.status
    );
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filenameFromUrl(url, fallbackFilename);
  a.click();
  URL.revokeObjectURL(objectUrl);
}

function mapUserToStatisticsItem(user: SafeUserProfile): StatisticsUserItem {
  return {
    id: user.id,
    ism: user.ism,
    login: user.login,
    yosh: user.yosh,
    jins: user.jins,
    shaharTuman: user.shaharTuman,
  };
}

function encodeFiltersParam(filters: AnswerFilter[]): string {
  return filters.map((f) => `${f.questionId}:${encodeURIComponent(f.javob)}`).join(',');
}

function isFastApiStats(data: unknown): data is FastApiAdminStatistics {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return 'anketa' in d || 'student' in d || 'pedagog' in d;
}

export async function fetchAdminStatistics(
  ageGroup = 'all'
): Promise<AdminStatisticsResult> {
  const query = ageGroup !== 'all' ? `?ageGroup=${encodeURIComponent(ageGroup)}` : '';
  const data = await apiJson<FastApiAdminStatistics | { success: boolean; statistics: AdminStatisticsPayload }>(
    `/api/admin/statistics${query}`
  );

  if (isFastApiStats(data)) {
    return { source: 'fastapi', surveys: data };
  }

  const wrapped = data as { success?: boolean; statistics?: AdminStatisticsPayload };
  if (wrapped.statistics) {
    return { source: 'legacy', legacy: wrapped.statistics };
  }

  return { source: 'fastapi', surveys: {} };
}

export async function fetchQuestionStatistics(
  kind: SurveyKind = 'anketa'
): Promise<{ data: QuestionnaireStatistics; source: 'api' | 'fallback' }> {
  try {
    const data = await apiJson<QuestionnaireStatistics>(
      `/api/admin/statistics/questions?kind=${encodeURIComponent(kind)}`
    );
    return { data, source: 'api' };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
      const data = await buildQuestionStatisticsFromResponses(kind);
      return { data, source: 'fallback' };
    }
    throw err;
  }
}

export async function downloadStatisticsExcel(
  kind: SurveyKind,
  fallbackData?: QuestionnaireStatistics
): Promise<'api' | 'fallback'> {
  try {
    const blob = await apiBlob(
      `/api/admin/statistics/export?kind=${encodeURIComponent(kind)}`
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${kind}_statistika.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    return 'api';
  } catch (err) {
    if (
      fallbackData &&
      err instanceof ApiError &&
      (err.status === 404 || err.status === 405)
    ) {
      const { downloadQuestionStatisticsExcel } = await import('./adminExport');
      downloadQuestionStatisticsExcel(fallbackData);
      return 'fallback';
    }
    throw err;
  }
}

export async function fetchStatisticsUsers(): Promise<StatisticsUserItem[]> {
  try {
    const data = await apiJson<{ users: StatisticsUserItem[] } | StatisticsUserItem[]>(
      '/api/admin/statistics/users'
    );
    if (Array.isArray(data)) return data;
    return data.users ?? [];
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
      const users = await getAdminUsers();
      return users
        .filter((u) => u.rol === 'foydalanuvchi')
        .map(mapUserToStatisticsItem);
    }
    throw err;
  }
}

export async function fetchUserStatistics(
  userId: string,
  kind: SurveyKind = 'anketa'
): Promise<{ data: UserStatisticsDetail; source: 'api' | 'fallback' }> {
  try {
    const data = await apiJson<UserStatisticsDetail>(
      `/api/admin/statistics/users/${encodeURIComponent(userId)}?kind=${encodeURIComponent(kind)}`
    );
    return { data, source: 'api' };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
      const users = await getAdminUsers();
      const user = users.find((u) => u.id === userId);
      if (!user) throw new ApiError('Foydalanuvchi topilmadi', 404);
      const data = await buildUserStatisticsFallback(user, kind);
      return { data, source: 'fallback' };
    }
    throw err;
  }
}

export async function searchStatistics(
  kind: SurveyKind,
  filters: AnswerFilter[]
): Promise<{ data: StatisticsSearchResponse; source: 'api' | 'fallback' }> {
  try {
    const data = await apiJson<StatisticsSearchResponse>('/api/admin/statistics/search', {
      method: 'POST',
      body: JSON.stringify({ kind, filters }),
    });
    return { data, source: 'api' };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
      const data = await buildSearchStatisticsFallback(kind, filters);
      return { data, source: 'fallback' };
    }
    throw err;
  }
}

export async function searchStatisticsGet(
  kind: SurveyKind,
  filters: AnswerFilter[]
): Promise<{ data: StatisticsSearchResponse; source: 'api' | 'fallback' }> {
  const filtersParam = encodeFiltersParam(filters);
  try {
    const data = await apiJson<StatisticsSearchResponse>(
      `/api/admin/statistics/search?kind=${encodeURIComponent(kind)}&filters=${filtersParam}`
    );
    return { data, source: 'api' };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
      return searchStatistics(kind, filters);
    }
    throw err;
  }
}

export async function downloadUserStatisticsExcel(
  userId: string,
  kind: SurveyKind,
  excelUrl?: string,
  fallbackDetail?: UserStatisticsDetail
): Promise<'api' | 'fallback'> {
  if (excelUrl) {
    try {
      await downloadAuthenticatedFile(excelUrl, `${kind}_${userId}_statistika.xlsx`);
      return 'api';
    } catch (err) {
      if (!(err instanceof ApiError) || (err.status !== 404 && err.status !== 405)) {
        throw err;
      }
    }
  }

  try {
    await apiBlob(
      `/api/admin/statistics/users/${encodeURIComponent(userId)}/export?kind=${encodeURIComponent(kind)}`
    ).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${kind}_${userId}_statistika.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    });
    return 'api';
  } catch (err) {
    if (fallbackDetail && err instanceof ApiError && (err.status === 404 || err.status === 405)) {
      const { downloadUserStatisticsExcel: localExport } = await import('./adminExport');
      localExport(fallbackDetail, kind);
      return 'fallback';
    }
    throw err;
  }
}

export async function downloadSearchStatisticsExcel(
  excelUrl: string | undefined,
  kind: SurveyKind,
  filters: AnswerFilter[],
  fallbackData?: StatisticsSearchResponse,
  options?: { preferLocal?: boolean }
): Promise<'api' | 'fallback'> {
  const preferLocal = options?.preferLocal ?? false;

  const exportLocal = async (): Promise<'fallback'> => {
    if (!fallbackData) {
      throw new ApiError('Excel uchun natijalar mavjud emas', 400);
    }
    const { downloadSearchStatisticsExcel: localExport } = await import('./adminExport');
    localExport(fallbackData, kind);
    return 'fallback';
  };

  if (preferLocal && fallbackData) {
    return exportLocal();
  }

  if (excelUrl && excelUrl.trim()) {
    try {
      await downloadAuthenticatedFile(excelUrl, `${kind}_qidiruv_statistika.xlsx`);
      return 'api';
    } catch {
      if (fallbackData) return exportLocal();
    }
  }

  const filtersParam = encodeFiltersParam(filters);
  try {
    const blob = await apiBlob(
      `/api/admin/statistics/search/export?kind=${encodeURIComponent(kind)}&filters=${filtersParam}`
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${kind}_qidiruv_statistika.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    return 'api';
  } catch (err) {
    if (fallbackData) {
      return exportLocal();
    }
    throw err;
  }
}

const MAX_EXCEL_BYTES = 30 * 1024 * 1024;

/** Admin Excel yuklash + AI tahlil (multipart, 180s timeout) */
export async function analyzeExcelStatistics(
  file: File,
  izoh?: string
): Promise<ExcelAnalyzeResponse> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    throw new ApiError("Faqat .xlsx fayl qabul qilinadi.", 400);
  }
  if (file.size > MAX_EXCEL_BYTES) {
    throw new ApiError("Fayl 30 MB dan katta bo'lishi mumkin emas.", 400);
  }

  const form = new FormData();
  form.append('file', file);

  const query = izoh?.trim()
    ? `?izoh=${encodeURIComponent(izoh.trim())}`
    : '';

  return apiJson<ExcelAnalyzeResponse>(
    `/api/admin/statistics/excel/analyze${query}`,
    {
      method: 'POST',
      body: form,
      timeoutMs: 180_000,
    }
  );
}

export type { AdminStatisticsPayload, QuestionStatRow, EpidemiologyIndicatorRow } from '../../server/adminStatistics';
