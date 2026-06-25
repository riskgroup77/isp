import type { AnketaAnswerValue, AnketaQuestion, AnketaResponseRecord, AnketaSchema } from '../types';
import type { SafeUserProfile } from './auth';
import { fetchAllAnketaResponses, fetchAnketaQuestions } from './anketaApi';
import type {
  AnswerFilter,
  SearchResultItem,
  StatisticsSearchResponse,
  SurveyKind,
  UserStatisticsDetail,
  UserSurveyDetail,
} from './adminStatisticsApi';
import { fetchAllSurveyResponses, fetchSurveyQuestions } from './surveyApi';

async function fetchSchemaAndResponses(kind: SurveyKind) {
  if (kind === 'anketa') {
    return Promise.all([fetchAnketaQuestions(), fetchAllAnketaResponses()] as const);
  }
  const surveyKind = kind as 'student' | 'pedagog';
  return Promise.all([
    fetchSurveyQuestions(surveyKind),
    fetchAllSurveyResponses(surveyKind),
  ] as const);
}

function getAnswer(answers: Record<string, AnketaAnswerValue>, questionId: number): AnketaAnswerValue | undefined {
  return answers[String(questionId)];
}

export function formatAnswerValue(value: AnketaAnswerValue | undefined): string {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, string>)
      .map(([row, col]) => `${row}: ${col}`)
      .join('; ');
  }
  return String(value);
}

export function answerMatchesFilter(
  answers: Record<string, AnketaAnswerValue>,
  filter: AnswerFilter
): boolean {
  const val = getAnswer(answers, filter.questionId);
  const rawExpected = filter.javob.trim();
  const negate = rawExpected.startsWith('!');
  const expected = negate ? rawExpected.slice(1) : rawExpected;

  if (val === undefined || val === null || val === '') return negate;

  const matches = matchSingleValue(val, expected);
  return negate ? !matches : matches;
}

function matchSingleValue(val: AnketaAnswerValue, expected: string): boolean {
  if (typeof val === 'string') {
    return val === expected || val.toLowerCase() === expected.toLowerCase();
  }
  if (Array.isArray(val)) {
    return val.some((item) => String(item) === expected);
  }
  if (typeof val === 'object') {
    return Object.values(val as Record<string, string>).some(
      (item) => item === expected || item.toLowerCase() === expected.toLowerCase()
    );
  }
  return false;
}

function groupQuestionsBySection(questions: AnketaQuestion[]): Map<string, AnketaQuestion[]> {
  const map = new Map<string, AnketaQuestion[]>();
  const order: string[] = [];
  for (const q of questions) {
    const section = q.section || 'Boshqa';
    if (!map.has(section)) {
      map.set(section, []);
      order.push(section);
    }
    map.get(section)!.push(q);
  }
  return map;
}

export function buildUserStatisticsFromResponses(
  user: SafeUserProfile,
  kind: SurveyKind,
  schema: AnketaSchema,
  responses: AnketaResponseRecord[]
): UserStatisticsDetail {
  const userResponses = responses.filter((r) => r.userId === user.id);
  const sectionMap = groupQuestionsBySection(schema.questions);

  const soRovnomalar: UserSurveyDetail[] = userResponses.map((record) => {
    const boLimlar = [...sectionMap.entries()].map(([nomi, questions]) => ({
      nomi,
      javoblar: questions.map((q) => ({
        id: q.id,
        text: q.text,
        javob: formatAnswerValue(getAnswer(record.answers, q.id)),
      })),
    }));

    return {
      responseId: record.id,
      riskFoizi: record.riskFoizi ?? record.tahlil?.riskFoizi ?? null,
      zona: record.zona ?? record.tahlil?.zona ?? null,
      klinikXulosa: record.klinikXulosa ?? record.tahlil?.klinikXulosa ?? null,
      yaratilganSana: record.yaratilganSana,
      boLimlar,
    };
  });

  return {
    foydalanuvchi: {
      id: user.id,
      ism: user.ism,
      login: user.login,
      yosh: user.yosh,
      jins: user.jins,
      shaharTuman: user.shaharTuman,
    },
    soRovnomalar,
  };
}

export async function buildUserStatisticsFallback(
  user: SafeUserProfile,
  kind: SurveyKind
): Promise<UserStatisticsDetail> {
  const [schema, responses] = await fetchSchemaAndResponses(kind);
  return buildUserStatisticsFromResponses(user, kind, schema, responses);
}

export function buildSearchStatisticsFromResponses(
  kind: SurveyKind,
  filters: AnswerFilter[],
  schema: AnketaSchema,
  responses: AnketaResponseRecord[]
): StatisticsSearchResponse {
  const matched = responses.filter((record) =>
    filters.every((f) => answerMatchesFilter(record.answers, f))
  );

  const natijalar: SearchResultItem[] = matched.map((record) => ({
    responseId: record.id,
    fish: record.fish ?? null,
    riskFoizi: record.riskFoizi ?? record.tahlil?.riskFoizi ?? null,
    zona: record.zona ?? record.tahlil?.zona ?? null,
    klinikXulosa: record.klinikXulosa ?? record.tahlil?.klinikXulosa ?? null,
    foydalanuvchi: null,
    batafsilUrl: '',
    excelUrl: '',
  }));

  return {
    jami: natijalar.length,
    excelUrl: '',
    natijalar,
  };
}

export async function buildSearchStatisticsFallback(
  kind: SurveyKind,
  filters: AnswerFilter[]
): Promise<StatisticsSearchResponse> {
  const [schema, responses] = await fetchSchemaAndResponses(kind);
  return buildSearchStatisticsFromResponses(kind, filters, schema, responses);
}

export const SEARCH_PRESETS: { id: string; label: string; filters: AnswerFilter[] }[] = [
  {
    id: 'smokers-men',
    label: "Chekadigan erkaklar",
    filters: [
      { questionId: 1, javob: 'Erkak' },
      { questionId: 37, javob: 'Ha' },
    ],
  },
  {
    id: 'smokers-women',
    label: "Chekadigan ayollar",
    filters: [
      { questionId: 1, javob: 'Ayol' },
      { questionId: 37, javob: 'Ha' },
    ],
  },
  {
    id: 'alcohol-men',
    label: "Spirtli ichuvchi erkaklar",
    filters: [
      { questionId: 1, javob: 'Erkak' },
      { questionId: 46, javob: '!Hech qachon iste\'mol qilmayman' },
    ],
  },
  {
    id: 'high-glucose-women',
    label: "Yuqori glyukozali ayollar",
    filters: [
      { questionId: 1, javob: 'Ayol' },
      { questionId: 97, javob: '5,5 mmol/l dan yuqori' },
    ],
  },
  {
    id: 'high-bp-men',
    label: "Yuqori arterial bosimli erkaklar",
    filters: [
      { questionId: 1, javob: 'Erkak' },
      { questionId: 94, javob: '140/90 – 159/99' },
    ],
  },
];
