import type { QuestionnaireData, RiskAnalysisResult } from '../types';
import { normalizeRiskResult } from './riskResult';

/** Server va klientda bitta format */
export interface ScreeningHistoryItem {
  id: string;
  sana: string;
  data: QuestionnaireData;
  riskResult: RiskAnalysisResult;
}

export function normalizeScreeningItem(
  raw: Record<string, unknown>,
  index = 0
): ScreeningHistoryItem | null {
  const data = raw.data as QuestionnaireData | undefined;
  const rawRisk = raw.riskResult || raw.result;
  if (!data || !rawRisk || typeof rawRisk !== 'object') return null;
  const riskResult = normalizeRiskResult(rawRisk as Partial<RiskAnalysisResult>);

  const sana =
    (raw.sana as string) ||
    (raw.date as string) ||
    new Date().toLocaleString('uz-UZ', { hour12: false });

  const id =
    (raw.id as string) ||
    `hist-${index}-${Math.random().toString(36).slice(2, 9)}`;

  return { id, sana, data, riskResult };
}

export function normalizeScreeningHistory(
  items: unknown[] | undefined | null
): ScreeningHistoryItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, idx) =>
      normalizeScreeningItem(item as Record<string, unknown>, idx)
    )
    .filter((item): item is ScreeningHistoryItem => item !== null);
}

/** UI ichki format (date/result alias) */
export interface ClientScreeningHistoryItem {
  id: string;
  date: string;
  data: QuestionnaireData;
  result: RiskAnalysisResult;
}

export function toClientHistory(items: ScreeningHistoryItem[]): ClientScreeningHistoryItem[] {
  return items.map((item) => ({
    id: item.id,
    date: item.sana,
    data: item.data,
    result: item.riskResult,
  }));
}

/** Serverda saqlangan skrining ID (mahalliy vaqtinchalik ID emas) */
export function isServerScreeningId(id: string): boolean {
  if (!id || id.startsWith('hist')) return false;
  // saveToHistory: Math.random().toString(36).substr(2, 9)
  if (/^[a-z0-9]{9}$/i.test(id)) return false;
  return true;
}

export function toServerHistory(
  items: ClientScreeningHistoryItem[] | ScreeningHistoryItem[]
): ScreeningHistoryItem[] {
  return items.map((item, idx) => {
    if ('riskResult' in item && item.riskResult) {
      return item as ScreeningHistoryItem;
    }
    const client = item as ClientScreeningHistoryItem;
    return {
      id: client.id,
      sana: client.date,
      data: client.data,
      riskResult: client.result,
    };
  });
}
