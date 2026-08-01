import type { AnswerFilter, SurveyKind } from './adminStatisticsApi';
import { SEARCH_PRESETS } from './statisticsFallback';

export interface NaturalLanguageParseResult {
  ok: boolean;
  kind: SurveyKind;
  filters: AnswerFilter[];
  summary: string;
  /** `ok: false` bo'lganda foydalanuvchiga ko'rsatiladigan izoh */
  message: string;
}

function parseFailure(message: string): NaturalLanguageParseResult {
  return { ok: false, kind: 'anketa', filters: [], summary: '', message };
}

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[ʻʼ]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeFilters(filters: AnswerFilter[]): AnswerFilter[] {
  const map = new Map<number, AnswerFilter>();
  for (const f of filters) map.set(f.questionId, f);
  return [...map.values()];
}

function presetMatches(query: string, label: string): boolean {
  const nq = normalize(query);
  const nl = normalize(label);
  if (nq === nl || nq.includes(nl) || nl.includes(nq)) return true;
  const tokens = nl.split(' ').filter((t) => t.length > 3);
  return tokens.length > 0 && tokens.every((t) => nq.includes(t));
}

const EXAMPLE_HINTS = [
  'chekadigan erkaklar',
  'chekadigan ayollar',
  'spirtli ichuvchi erkaklar',
  'yuqori glyukozali ayollar',
  'yuqori arterial bosimli erkaklar',
];

/**
 * O'zbek (lotin/kirill) matn buyruqdan filter qoidalarini chiqaradi.
 * Anketa 2025 tez-tez savol ID lari: 1 jins, 37 chekish, 46 spirt, 94 bosim, 97 glyukoza.
 */
export function parseNaturalLanguageQuery(input: string): NaturalLanguageParseResult {
  const q = normalize(input);
  if (!q) {
    return parseFailure(
      `Buyruq yozing. Masalan: ${EXAMPLE_HINTS.slice(0, 3).map((h) => `"${h}"`).join(', ')}`
    );
  }

  for (const preset of SEARCH_PRESETS) {
    if (presetMatches(q, preset.label)) {
      return {
        ok: true,
        kind: 'anketa',
        filters: preset.filters,
        summary: preset.label,
        message: '',
      };
    }
  }

  const filters: AnswerFilter[] = [];

  if (/\berkak|\berkaklar|\bmuzhchin|\bmужчин/.test(q)) {
    filters.push({ questionId: 1, javob: 'Erkak' });
  } else if (/\bayol|\bayollar|\bzhenshchin|\bженщин/.test(q)) {
    filters.push({ questionId: 1, javob: 'Ayol' });
  }

  if (/chekmay|chekmagan|tutunmay|sigaret\s*yo|не\s*курит|не\s*курил/.test(q)) {
    filters.push({ questionId: 37, javob: "Yo'q" });
  } else if (/cheka|chekadigan|tutun|sigaret|курит|курящ/.test(q)) {
    filters.push({ questionId: 37, javob: 'Ha' });
  }

  if (/spirt|alkogol|ichimlik|спирт|алкогол/.test(q)) {
    if (/hech\s*qachon|iste'mol\s*qilmay|ichmay|не\s*пью|не\s*пьет/.test(q)) {
      filters.push({ questionId: 46, javob: "Hech qachon iste'mol qilmayman" });
    } else if (/har\s*kuni|kunlik|ежедневн/.test(q)) {
      filters.push({ questionId: 46, javob: 'Har kuni' });
    } else if (/bayram|dam\s*olish|праздник|выходн/.test(q)) {
      filters.push({ questionId: 46, javob: 'Dam olish va bayram kunlarida' });
    } else {
      filters.push({ questionId: 46, javob: '!Hech qachon iste\'mol qilmayman' });
    }
  }

  if (
    /yuqori\s*(arterial|bosim)|gipertoniya|гипертон|высок(ое|ий)\s*давлен|140\/90|160\/100/.test(q)
  ) {
    if (/180|110\s*dan\s*yuqori|очень\s*высок/.test(q)) {
      filters.push({ questionId: 94, javob: '180/110 dan yuqori' });
    } else if (/160|170/.test(q)) {
      filters.push({ questionId: 94, javob: '160/100 – 179/109' });
    } else {
      filters.push({ questionId: 94, javob: '140/90 – 159/99' });
    }
  }

  if (/yuqori\s*glyukoza|diabet|qand\s*yuqori|glyukoza\s*yuqori|сахар|диабет|глюкоз/.test(q)) {
    filters.push({ questionId: 97, javob: '5,5 mmol/l dan yuqori' });
  } else if (/normal\s*glyukoza|glyukoza\s*normal|нормальн.*глюкоз/.test(q)) {
    filters.push({ questionId: 97, javob: '3,3–5,5 mmol/l' });
  }

  const unique = dedupeFilters(filters);
  if (unique.length === 0) {
    return parseFailure(
      `Buyruq tushunilmadi. Masalan: ${EXAMPLE_HINTS.map((h) => `"${h}"`).join(', ')}`
    );
  }

  return {
    ok: true,
    kind: 'anketa',
    filters: unique,
    summary: describeFilters(unique),
    message: '',
  };
}

function describeFilters(filters: AnswerFilter[]): string {
  const parts = filters.map((f) => {
    const label =
      f.questionId === 1
        ? 'Jins'
        : f.questionId === 37
          ? 'Chekish'
          : f.questionId === 46
            ? 'Spirt'
            : f.questionId === 94
              ? 'Bosim'
              : f.questionId === 97
                ? 'Glyukoza'
                : `#${f.questionId}`;
    const javob = f.javob.startsWith('!') ? `≠ ${f.javob.slice(1)}` : f.javob;
    return `${label}: ${javob}`;
  });
  return parts.join(' · ');
}

export const NL_SEARCH_EXAMPLES = EXAMPLE_HINTS;
