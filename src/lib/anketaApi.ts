import { apiJson } from './api';
import type {
  AnketaAnswers,
  AnketaResponseRecord,
  AnketaSchema,
  AnketaTahlil,
} from '../types';

export async function fetchAnketaQuestions(): Promise<AnketaSchema> {
  return apiJson<AnketaSchema>('/api/anketa/questions', { skipAuth: true });
}

export interface AnketaSubmitPayload {
  answers: AnketaAnswers;
  fish?: string;
  lavozim?: string;
  toldirilganSana?: string;
  izoh?: string;
}

export interface AnketaSubmitResponse {
  message: string;
  response: AnketaResponseRecord;
  tahlil?: AnketaTahlil | null;
}

export async function submitAnketa(payload: AnketaSubmitPayload): Promise<AnketaSubmitResponse> {
  return apiJson<AnketaSubmitResponse>('/api/anketa/submit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function reanalyzeAnketa(id: string): Promise<AnketaSubmitResponse> {
  return apiJson<AnketaSubmitResponse>(`/api/anketa/responses/${encodeURIComponent(id)}/analyze`, {
    method: 'POST',
  });
}

export async function fetchMyAnketaResponses(): Promise<AnketaResponseRecord[]> {
  const data = await apiJson<{ responses: AnketaResponseRecord[] }>('/api/anketa/my');
  return data.responses ?? [];
}

export async function fetchAllAnketaResponses(): Promise<AnketaResponseRecord[]> {
  const data = await apiJson<{ responses: AnketaResponseRecord[] }>('/api/anketa/responses');
  return data.responses ?? [];
}

export async function fetchAnketaResponseById(id: string): Promise<AnketaResponseRecord> {
  const data = await apiJson<{ response: AnketaResponseRecord }>(
    `/api/anketa/responses/${encodeURIComponent(id)}`
  );
  return data.response;
}

export async function deleteAnketaResponse(id: string): Promise<void> {
  await apiJson(`/api/anketa/responses/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
