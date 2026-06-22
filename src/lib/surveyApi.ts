import { apiJson } from './api';
import type {
  AnketaAnswers,
  AnketaResponseRecord,
  AnketaSchema,
  AnketaTahlil,
} from '../types';

export type SurveyKind = 'student' | 'pedagog';

/** Submit + AI tahlil uchun (TZ: 180 soniya) */
export const SURVEY_SUBMIT_TIMEOUT_MS = 180_000;

export interface SurveySubmitPayload {
  answers: AnketaAnswers;
  fish?: string;
  lavozim?: string;
  toldirilganSana?: string;
  izoh?: string;
}

export interface SurveySubmitResponse {
  message: string;
  response: AnketaResponseRecord;
  tahlil?: AnketaTahlil | null;
}

export const SURVEY_CONFIG = {
  student: {
    questions: '/api/survey/student/questions',
    submit: '/api/survey/student/submit',
    my: '/api/survey/student/my',
    responses: '/api/survey/student/responses',
  },
  pedagog: {
    questions: '/api/survey/pedagog/questions',
    submit: '/api/survey/pedagog/submit',
    my: '/api/survey/pedagog/my',
    responses: '/api/survey/pedagog/responses',
  },
} as const;

export async function fetchSurveyQuestions(kind: SurveyKind): Promise<AnketaSchema> {
  return apiJson<AnketaSchema>(SURVEY_CONFIG[kind].questions, { skipAuth: true });
}

export async function submitSurvey(
  kind: SurveyKind,
  payload: SurveySubmitPayload
): Promise<SurveySubmitResponse> {
  return apiJson<SurveySubmitResponse>(SURVEY_CONFIG[kind].submit, {
    method: 'POST',
    body: JSON.stringify(payload),
    timeoutMs: SURVEY_SUBMIT_TIMEOUT_MS,
  });
}

export async function reanalyzeSurvey(
  kind: SurveyKind,
  id: string
): Promise<SurveySubmitResponse> {
  return apiJson<SurveySubmitResponse>(
    `/api/survey/${kind}/responses/${encodeURIComponent(id)}/analyze`,
    { method: 'POST', timeoutMs: SURVEY_SUBMIT_TIMEOUT_MS }
  );
}

export async function fetchMySurveyResponses(
  kind: SurveyKind
): Promise<AnketaResponseRecord[]> {
  const data = await apiJson<{ responses: AnketaResponseRecord[] }>(SURVEY_CONFIG[kind].my);
  return data.responses ?? [];
}

export async function fetchAllSurveyResponses(
  kind: SurveyKind
): Promise<AnketaResponseRecord[]> {
  const data = await apiJson<{ responses: AnketaResponseRecord[] }>(
    SURVEY_CONFIG[kind].responses
  );
  return data.responses ?? [];
}

export async function fetchSurveyResponseById(
  kind: SurveyKind,
  id: string
): Promise<AnketaResponseRecord> {
  const data = await apiJson<{ response: AnketaResponseRecord }>(
    `/api/survey/${kind}/responses/${encodeURIComponent(id)}`
  );
  return data.response;
}

export async function deleteSurveyResponse(kind: SurveyKind, id: string): Promise<void> {
  await apiJson(`/api/survey/${kind}/responses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export const SURVEY_LABELS: Record<SurveyKind, { title: string; subtitle: string }> = {
  student: {
    title: 'Talaba so\'rovnomasi',
    subtitle: 'Tibbiyot instituti talabalari uchun sog\'lom turmush tarzi anketa (62 savol)',
  },
  pedagog: {
    title: 'Pedagog so\'rovnomasi',
    subtitle: 'OTM pedagog xodimlari uchun sog\'lom turmush tarzi anketa (99 savol)',
  },
};
