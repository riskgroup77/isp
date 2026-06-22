import { apiJson } from './api';
import type { AdminStatisticsPayload } from '../../server/adminStatistics';

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

export interface AdminStatisticsResult {
  source: 'fastapi' | 'legacy';
  surveys?: FastApiAdminStatistics;
  legacy?: AdminStatisticsPayload;
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

export type { AdminStatisticsPayload, QuestionStatRow, EpidemiologyIndicatorRow } from '../../server/adminStatistics';
