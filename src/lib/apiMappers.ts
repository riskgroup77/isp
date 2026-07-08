import type { SafeUserProfile } from './auth';
import { normalizeRiskResult } from './riskResult';
import type {
  ClientScreeningHistoryItem,
  ScreeningHistoryItem,
} from './screeningHistory';
import type {
  HealthJournalEntry,
  PatientAdvice,
  QuestionnaireData,
  RiskAnalysisResult,
  UserProfile,
} from '../types';

const QUESTIONNAIRE_KEYS: (keyof QuestionnaireData)[] = [
  'yosh',
  'jins',
  'boy',
  'vazn',
  'sistolik',
  'diastolik',
  'glyukoza',
  'xolesterin',
  'tuzIstemi',
  'shakarVaXamir',
  'sabzavotMeva',
  'jismoniyFaollik',
  'chekish',
  'nosvoy',
  'oiladaKasallik',
  'tibbiyotXodimi',
  'nazariyBilimDarajasi',
  'realKomplayens',
  'shaharTuman',
  'erkinShikoyat',
];

const RISK_KEYS: (keyof RiskAnalysisResult)[] = [
  'tmi',
  'tmiKategoriya',
  'riskFoizi',
  'zona',
  'hududiyStatistika',
  'faktorlar',
  'shaxsiyTavsiyalar',
  'klinikXulosa',
];

export interface ApiUserResponse {
  id: string;
  login?: string;
  ism: string;
  rol: UserProfile['rol'];
  shaharTuman?: string;
  yosh?: number;
  jins?: 'erkak' | 'ayol';
  boy?: number;
  vazn?: number;
  mutaxassislik?: string | null;
  shifoxona?: string | null;
  tasdiqlangan?: boolean;
  yaratilganSana?: string;
}

export interface ApiPatientBundle {
  user: ApiUserResponse;
  screenings?: Record<string, unknown>[];
  journalEntries?: Record<string, unknown>[];
}

export interface ApiSyncResponse {
  user: ApiUserResponse;
  screenings?: Record<string, unknown>[];
  journalEntries?: Record<string, unknown>[];
}

export interface ApiAdviceResponse {
  id: string;
  bemorId: string;
  shifokorId: string;
  matn: string;
  sana: string;
  vaqt: string;
  shifokorIsm: string;
  shifokorMutaxassislik?: string;
}

export function mapApiUserToProfile(user: ApiUserResponse): SafeUserProfile {
  return {
    id: user.id,
    login: user.login || '',
    ism: user.ism,
    rol: user.rol,
    yaratilganSana: user.yaratilganSana || new Date().toISOString(),
    shaharTuman: user.shaharTuman,
    yosh: user.yosh,
    jins: user.jins,
    boy: user.boy,
    vazn: user.vazn,
    mutaxassislik: user.mutaxassislik || undefined,
    shifoxona: user.shifoxona || undefined,
    tasdiqlangan: user.tasdiqlangan,
  };
}

function pickQuestionnaire(raw: Record<string, unknown>): QuestionnaireData {
  const data = {} as QuestionnaireData;
  for (const key of QUESTIONNAIRE_KEYS) {
    if (raw[key] !== undefined && raw[key] !== null) {
      (data as Record<string, unknown>)[key] = raw[key];
    }
  }
  if (raw.data && typeof raw.data === 'object') {
    Object.assign(data, raw.data as QuestionnaireData);
  }
  return data;
}

function pickRiskResult(raw: Record<string, unknown>): RiskAnalysisResult | null {
  if (raw.riskResult && typeof raw.riskResult === 'object') {
    return normalizeRiskResult(raw.riskResult as Partial<RiskAnalysisResult>);
  }
  if (raw.result && typeof raw.result === 'object') {
    return normalizeRiskResult(raw.result as Partial<RiskAnalysisResult>);
  }

  const risk: Partial<RiskAnalysisResult> = {};
  let hasRisk = false;
  for (const key of RISK_KEYS) {
    if (raw[key] !== undefined && raw[key] !== null) {
      (risk as Record<string, unknown>)[key] = raw[key];
      hasRisk = true;
    }
  }
  return hasRisk ? normalizeRiskResult(risk) : null;
}

export function mapApiScreeningToHistoryItem(
  raw: Record<string, unknown>,
  index = 0
): ScreeningHistoryItem | null {
  const data = pickQuestionnaire(raw);
  const riskResult = pickRiskResult(raw);
  if (!riskResult || riskResult.riskFoizi === undefined) return null;

  const sana =
    (raw.sana as string) ||
    (raw.date as string) ||
    (raw.yaratilganSana as string) ||
    new Date().toLocaleString('uz-UZ', { hour12: false });

  const id =
    (raw.id as string) ||
    (raw.screening_id as string) ||
    (raw.screeningId as string) ||
    `hist-${index}-${Math.random().toString(36).slice(2, 9)}`;

  return { id, sana, data, riskResult };
}

export function mapApiScreeningsToHistory(
  items: Record<string, unknown>[] | undefined | null
): ScreeningHistoryItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, idx) => mapApiScreeningToHistoryItem(item, idx))
    .filter((item): item is ScreeningHistoryItem => item !== null);
}

export function mapApiJournalEntry(raw: Record<string, unknown>, index = 0): HealthJournalEntry {
  const id =
    (raw.id as string) ||
    `journal-${index}-${Math.random().toString(36).slice(2, 9)}`;

  return {
    id,
    sana: (raw.sana as string) || new Date().toISOString().split('T')[0],
    vaqt: (raw.vaqt as string) || '00:00',
    sistolik: Number(raw.sistolik) || 120,
    diastolik: Number(raw.diastolik) || 80,
    puls: Number(raw.puls) || 72,
    glyukoza: raw.glyukoza === '' || raw.glyukoza == null ? '' : Number(raw.glyukoza),
    vazn: raw.vazn === '' || raw.vazn == null ? '' : Number(raw.vazn),
    uyqu: (raw.uyqu as HealthJournalEntry['uyqu']) || 'yaxshi',
    stress: (raw.stress as HealthJournalEntry['stress']) || 'past',
    alomatlar: Array.isArray(raw.alomatlar) ? (raw.alomatlar as string[]) : [],
    dorilar: Array.isArray(raw.dorilar)
      ? (raw.dorilar as HealthJournalEntry['dorilar'])
      : [],
    qaydlar: (raw.qaydlar as string) || '',
    yurilganMetr:
      raw.yurilganMetr === '' || raw.yurilganMetr == null ? '' : Number(raw.yurilganMetr),
    suvLitrlar:
      raw.suvLitrlar === '' || raw.suvLitrlar == null ? '' : Number(raw.suvLitrlar),
    uyquSoati:
      raw.uyquSoati === '' || raw.uyquSoati == null ? '' : Number(raw.uyquSoati),
  };
}

export function mapApiJournalEntries(
  items: Record<string, unknown>[] | undefined | null
): HealthJournalEntry[] {
  if (!Array.isArray(items)) return [];
  return items.map((item, idx) => mapApiJournalEntry(item, idx));
}

export function mapApiPatientBundle(bundle: ApiPatientBundle): UserProfile {
  const screenings = mapApiScreeningsToHistory(bundle.screenings);
  const journal = mapApiJournalEntries(bundle.journalEntries);

  return {
    ...mapApiUserToProfile(bundle.user),
    parol: '',
    soglik_skrining_tarixi: screenings.map((s) => ({
      id: s.id,
      riskResult: s.riskResult,
      data: s.data,
      sana: s.sana,
    })),
    soglik_kundaligi: journal,
  };
}

export function mapApiAdvice(advice: ApiAdviceResponse): PatientAdvice {
  return {
    id: advice.id,
    bemorId: advice.bemorId,
    shifokorId: advice.shifokorId,
    shifokorIsm: advice.shifokorIsm,
    shifokorMutaxassislik: advice.shifokorMutaxassislik || '',
    matn: advice.matn,
    sana: advice.sana,
    vaqt: advice.vaqt,
  };
}

/** To'liq arxiv yozuvini sync uchun API formatiga */
export function mapHistoryItemToApiScreening(
  item: ClientScreeningHistoryItem
): Record<string, unknown> {
  return {
    ...mapQuestionnaireToApiScreening(item.data),
    sana: item.date,
    date: item.date,
    riskResult: item.result,
    result: item.result,
  };
}

/** Sync uchun faqat questionnaire maydonlari (risk natijasi serverda hisoblanadi) */
export function mapQuestionnaireToApiScreening(data: QuestionnaireData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of QUESTIONNAIRE_KEYS) {
    const val = data[key];
    if (val !== undefined && val !== '') {
      out[key] = val;
    }
  }
  return out;
}

/** Kundalik yozuvini API formatiga (id siz) */
export function mapJournalEntryToApi(entry: HealthJournalEntry): Record<string, unknown> {
  return {
    sana: entry.sana,
    vaqt: entry.vaqt.length > 5 ? entry.vaqt.slice(0, 5) : entry.vaqt,
    sistolik: entry.sistolik,
    diastolik: entry.diastolik,
    puls: entry.puls,
    glyukoza: entry.glyukoza === '' ? null : entry.glyukoza,
    vazn: entry.vazn === '' ? null : entry.vazn,
    uyqu: entry.uyqu,
    stress: entry.stress,
    alomatlar: entry.alomatlar,
    dorilar: entry.dorilar,
    qaydlar: entry.qaydlar,
    yurilganMetr: entry.yurilganMetr === '' ? null : entry.yurilganMetr,
    suvLitrlar: entry.suvLitrlar === '' ? null : entry.suvLitrlar,
    uyquSoati: entry.uyquSoati === '' ? null : entry.uyquSoati,
  };
}

export function mapProfileToApi(profile: SafeUserProfile): Record<string, unknown> {
  const out: Record<string, unknown> = { ism: profile.ism };
  if (profile.shaharTuman) out.shaharTuman = profile.shaharTuman;
  if (profile.yosh != null) out.yosh = profile.yosh;
  if (profile.jins) out.jins = profile.jins;
  if (profile.boy != null) out.boy = profile.boy;
  if (profile.vazn != null) out.vazn = profile.vazn;
  return out;
}

export function mapSyncResponseToUser(response: ApiSyncResponse): UserProfile {
  return {
    ...mapApiUserToProfile(response.user),
    parol: '',
    soglik_skrining_tarixi: mapApiScreeningsToHistory(response.screenings).map((s) => ({
      id: s.id,
      riskResult: s.riskResult,
      data: s.data,
      sana: s.sana,
    })),
    soglik_kundaligi: mapApiJournalEntries(response.journalEntries),
  };
}
