import type { AnketaAnswerValue, AnketaQuestion, AnketaResponseRecord, AnketaSchema } from '../types';
import { fetchAllAnketaResponses, fetchAnketaQuestions } from './anketaApi';
import type {
  AnswerDistribution,
  QuestionnaireStatistics,
  QuestionStatistics,
  SurveyKind,
} from './adminStatisticsApi';
import { fetchAllSurveyResponses, fetchSurveyQuestions, type SurveyKind as StudentPedagogKind } from './surveyApi';

function getAnswerValue(answers: Record<string, AnketaAnswerValue>, questionId: number): AnketaAnswerValue | undefined {
  return answers[String(questionId)] ?? answers[questionId as unknown as string];
}

function buildTaqsimot(
  counts: Map<string, number>,
  responseCount: number,
  knownLabels: string[]
): AnswerDistribution[] {
  const labels =
    knownLabels.length > 0
      ? knownLabels
      : [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([label]) => label);

  return labels.map((javob) => {
    const soni = counts.get(javob) ?? 0;
    const foiz = responseCount > 0 ? Math.round((soni / responseCount) * 1000) / 10 : 0;
    return { javob, soni, foiz };
  });
}

function collectLabels(
  value: AnketaAnswerValue | undefined,
  type: string
): string[] {
  if (value === undefined || value === null || value === '') return [];
  if (type === 'matrix' && typeof value === 'object' && !Array.isArray(value)) {
    return Object.values(value as Record<string, string>).filter(Boolean);
  }
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function computeRegularQuestion(
  question: AnketaQuestion,
  responses: AnketaResponseRecord[]
): QuestionStatistics {
  const counts = new Map<string, number>();
  let jamiJavoblar = 0;

  for (const record of responses) {
    const labels = collectLabels(
      getAnswerValue(record.answers, question.id),
      question.type
    );
    if (labels.length === 0) continue;
    jamiJavoblar += 1;
    for (const label of labels) {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }

  const knownLabels =
    question.type === 'multiple_choice'
      ? question.options ?? []
      : question.type === 'single_choice' || question.type === 'single_choice_with_text'
        ? question.options ?? []
        : [];

  return {
    id: question.id,
    text: question.text,
    type: question.type,
    section: question.section,
    jamiJavoblar,
    taqsimot: buildTaqsimot(counts, jamiJavoblar, knownLabels),
  };
}

function computeMatrixRowQuestion(
  question: AnketaQuestion,
  row: string,
  responses: AnketaResponseRecord[]
): QuestionStatistics {
  const counts = new Map<string, number>();
  let jamiJavoblar = 0;

  for (const record of responses) {
    const value = getAnswerValue(record.answers, question.id);
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const col = (value as Record<string, string>)[row];
    if (!col) continue;
    jamiJavoblar += 1;
    counts.set(col, (counts.get(col) ?? 0) + 1);
  }

  return {
    id: question.id,
    text: row,
    type: 'matrix_row',
    section: question.section,
    jamiJavoblar,
    taqsimot: buildTaqsimot(counts, jamiJavoblar, question.columns ?? []),
  };
}

export function buildQuestionnaireStatistics(
  kind: SurveyKind,
  schema: AnketaSchema,
  responses: AnketaResponseRecord[]
): QuestionnaireStatistics {
  const sectionOrder: string[] = [];
  const sectionMap = new Map<string, QuestionStatistics[]>();

  const addToSection = (sectionName: string, stat: QuestionStatistics) => {
    const key = sectionName || 'Boshqa';
    if (!sectionMap.has(key)) {
      sectionMap.set(key, []);
      sectionOrder.push(key);
    }
    sectionMap.get(key)!.push(stat);
  };

  for (const question of schema.questions) {
    if (question.type === 'matrix' && question.rows?.length) {
      for (const row of question.rows) {
        addToSection(question.section ?? 'Boshqa', computeMatrixRowQuestion(question, row, responses));
      }
    } else {
      addToSection(question.section ?? 'Boshqa', computeRegularQuestion(question, responses));
    }
  }

  return {
    kind,
    title: schema.title,
    version: schema.version,
    jamiJavoblar: responses.length,
    boLimlar: sectionOrder.map((nomi) => ({
      nomi,
      savollar: sectionMap.get(nomi) ?? [],
    })),
  };
}

async function fetchSchemaAndResponses(kind: SurveyKind): Promise<{
  schema: AnketaSchema;
  responses: AnketaResponseRecord[];
}> {
  if (kind === 'anketa') {
    const [schema, responses] = await Promise.all([
      fetchAnketaQuestions(),
      fetchAllAnketaResponses(),
    ]);
    return { schema, responses };
  }

  const surveyKind = kind as StudentPedagogKind;
  const [schema, responses] = await Promise.all([
    fetchSurveyQuestions(surveyKind),
    fetchAllSurveyResponses(surveyKind),
  ]);
  return { schema, responses };
}

/** Backend /questions endpoint bo'lmasa — mavjud javoblardan hisoblaydi */
export async function buildQuestionStatisticsFromResponses(
  kind: SurveyKind
): Promise<QuestionnaireStatistics> {
  const { schema, responses } = await fetchSchemaAndResponses(kind);
  return buildQuestionnaireStatistics(kind, schema, responses);
}
