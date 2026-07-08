import { apiJson, ApiError } from './api';
import type { AnketaQuestion, AnketaSchema } from '../types';
import { fetchAnketaQuestions } from './anketaApi';

export interface AnketaQuestionUpdate {
  id: number;
  text?: string;
  section?: string;
  options?: string[];
  description?: string | null;
}

export async function fetchAnketaSchemaAdmin(): Promise<AnketaSchema> {
  try {
    return await apiJson<AnketaSchema>('/api/admin/anketa/questions');
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
      return fetchAnketaQuestions();
    }
    throw err;
  }
}

export async function updateAnketaQuestion(
  questionId: number,
  patch: Omit<AnketaQuestionUpdate, 'id'>
): Promise<AnketaQuestion> {
  return apiJson<AnketaQuestion>(`/api/admin/anketa/questions/${questionId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function saveAnketaSchema(schema: AnketaSchema): Promise<AnketaSchema> {
  return apiJson<AnketaSchema>('/api/admin/anketa/questions', {
    method: 'PUT',
    body: JSON.stringify(schema),
  });
}
