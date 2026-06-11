import type { QuestionnaireData, RiskAnalysisResult } from '../types';

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
  const riskResult = (raw.riskResult || raw.result) as RiskAnalysisResult | undefined;
  if (!data || !riskResult) return null;

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
