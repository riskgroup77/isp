import type { AnketaAnswers, DiseaseRiskPrognosis, QuestionnaireData } from '../types';

export type DiseaseRiskZone = 'yashil' | 'sariq' | 'qizil';

export type { DiseaseRiskPrognosis };

/** Kasallik turlari — keyinchalik admin yoki API orqali kengaytiriladi */
export const DISEASE_TYPES: { id: string; nomi: string }[] = [
  { id: 'gipertoniya', nomi: 'Gipertoniya' },
  { id: 'diabet', nomi: 'Qandli diabet (2-tur)' },
  { id: 'yurak_qon', nomi: 'Yurak-qon tomir kasalliklari' },
  { id: 'insult', nomi: 'Insult (miya qon aylanishi buzilishi)' },
  { id: 'obezitet', nomi: 'Semizlik va metabolik sindrom' },
  { id: 'nafas', nomi: "Nafas yo'llari kasalliklari (COPD)" },
  { id: 'onkologiya', nomi: 'Onkologik xavf' },
  { id: 'buyrak', nomi: 'Buyrak kasalliklari' },
];

function clampRisk(v: number): number {
  return Math.max(3, Math.min(98, Math.round(v)));
}

function toZone(xavfFoizi: number): DiseaseRiskZone {
  if (xavfFoizi < 30) return 'yashil';
  if (xavfFoizi < 65) return 'sariq';
  return 'qizil';
}

function strAnswer(answers: AnketaAnswers, id: number): string {
  const v = answers[String(id)];
  return typeof v === 'string' ? v : '';
}

function includesAny(text: string, needles: string[]): boolean {
  const lower = text.toLowerCase();
  return needles.some((n) => lower.includes(n.toLowerCase()));
}

function buildPrognosis(
  id: string,
  nomi: string,
  points: number,
  izoh: string
): DiseaseRiskPrognosis {
  const xavfFoizi = clampRisk(points);
  return { id, nomi, xavfFoizi, zona: toZone(xavfFoizi), izoh };
}

/** Anketa 2025 javoblaridan kasallik bo'yicha prognoz */
export function computeDiseaseRisksFromAnketa(answers: AnketaAnswers): DiseaseRiskPrognosis[] {
  const yosh = strAnswer(answers, 2);
  const chekish = strAnswer(answers, 37);
  const spirt = strAnswer(answers, 46);
  const tuz = strAnswer(answers, 57);
  const faolUy = strAnswer(answers, 65);
  const sport = strAnswer(answers, 66);
  const vazn = strAnswer(answers, 90);
  const bp = strAnswer(answers, 94);
  const bpYuqori = strAnswer(answers, 95);
  const glyukoza = strAnswer(answers, 97);
  const xolesterin = strAnswer(answers, 98);
  const irsiy = strAnswer(answers, 116);
  const surunkali = strAnswer(answers, 76);

  let gipertoniya = 12;
  if (includesAny(yosh, ['50', '60'])) gipertoniya += 12;
  if (includesAny(bp, ['140', '160', '180'])) gipertoniya += 28;
  else if (includesAny(bp, ['130', '129'])) gipertoniya += 14;
  if (includesAny(bpYuqori, ['tez-tez'])) gipertoniya += 18;
  if (includesAny(tuz, ['ha'])) gipertoniya += 10;
  if (includesAny(chekish, ['ha'])) gipertoniya += 8;
  if (includesAny(irsiy, ['gipertoniya', 'yurak'])) gipertoniya += 12;

  let diabet = 10;
  if (includesAny(glyukoza, ['5.5', 'yuqori'])) diabet += 32;
  if (includesAny(vazn, ['yuqori', "me'yordan yuqori"])) diabet += 18;
  if (includesAny(yosh, ['50', '60'])) diabet += 10;
  if (includesAny(surunkali, ['surunkali', 'tez-tez'])) diabet += 8;
  if (includesAny(irsiy, ['diabet', 'qand'])) diabet += 14;

  let yurak = 10;
  if (includesAny(chekish, ['ha'])) yurak += 16;
  if (includesAny(xolesterin, ['yuqori', '5 mmol'])) yurak += 18;
  if (includesAny(bp, ['140', '160', '180'])) yurak += 20;
  if (includesAny(faolUy, ['sayr qilmayman'])) yurak += 10;
  if (includesAny(irsiy, ['yurak', 'infarkt'])) yurak += 15;

  let insult = 8;
  if (includesAny(bp, ['160', '180'])) insult += 25;
  else if (includesAny(bp, ['140', '139'])) insult += 15;
  if (includesAny(chekish, ['ha'])) insult += 12;
  if (includesAny(yosh, ['60'])) insult += 14;
  if (includesAny(irsiy, ['insult', 'yurak'])) insult += 12;

  let obezitet = 8;
  if (includesAny(vazn, ['yuqori', "me'yordan yuqori"])) obezitet += 35;
  else if (includesAny(vazn, ['past'])) obezitet += 5;
  if (includesAny(faolUy, ['sayr qilmayman']) || includesAny(sport, ['yo'])) obezitet += 15;
  if (includesAny(spirt, ['har kuni'])) obezitet += 8;

  let nafas = 6;
  if (includesAny(chekish, ['ha'])) nafas += 38;
  if (includesAny(yosh, ['50', '60'])) nafas += 8;
  if (includesAny(surunkali, ['surunkali', 'tez-tez'])) nafas += 10;

  let onkologiya = 8;
  if (includesAny(chekish, ['ha'])) onkologiya += 22;
  if (includesAny(spirt, ['har kuni', 'bayram'])) onkologiya += 12;
  if (includesAny(yosh, ['60'])) onkologiya += 10;
  if (includesAny(vazn, ['yuqori'])) onkologiya += 8;

  let buyrak = 8;
  if (includesAny(bp, ['140', '160', '180'])) buyrak += 20;
  if (includesAny(glyukoza, ['5.5', 'yuqori'])) buyrak += 18;
  if (includesAny(tuz, ['ha'])) buyrak += 10;
  if (includesAny(vazn, ['yuqori'])) buyrak += 8;

  return [
    buildPrognosis(
      'gipertoniya',
      'Gipertoniya',
      gipertoniya,
      "Arterial bosim, tuz iste'moli va yosh omillariga asoslangan prognoz."
    ),
    buildPrognosis(
      'diabet',
      'Qandli diabet (2-tur)',
      diabet,
      "Glyukoza, vazn va oilaviy omillarga asoslangan metabolik xavf."
    ),
    buildPrognosis(
      'yurak_qon',
      'Yurak-qon tomir kasalliklari',
      yurak,
      "Chekish, xolesterin va arterial bosim kombinatsiyasiga asoslangan xavf."
    ),
    buildPrognosis(
      'insult',
      'Insult (miya qon aylanishi buzilishi)',
      insult,
      "Yuqori bosim, chekish va yosh omillariga asoslangan prognoz."
    ),
    buildPrognosis(
      'obezitet',
      'Semizlik va metabolik sindrom',
      obezitet,
      "Vazn bahosi va jismoniy faollik darajasiga asoslangan xavf."
    ),
    buildPrognosis(
      'nafas',
      "Nafas yo'llari kasalliklari (COPD)",
      nafas,
      "Chekish va surunkali kasalliklar tarixiga asoslangan prognoz."
    ),
    buildPrognosis(
      'onkologiya',
      'Onkologik xavf',
      onkologiya,
      "Chekish, spirtli ichimlik va yosh omillariga asoslangan umumiy xavf."
    ),
    buildPrognosis(
      'buyrak',
      'Buyrak kasalliklari',
      buyrak,
      "Bosim, glyukoza va tuz yuklamasiga asoslangan buyrak xavfi."
    ),
  ].sort((a, b) => b.xavfFoizi - a.xavfFoizi);
}

/** Eski skrining (QuestionnaireData) uchun kasallik prognozlari */
export function computeDiseaseRisksFromQuestionnaire(data: QuestionnaireData): DiseaseRiskPrognosis[] {
  let gipertoniya = 12;
  if (data.yosh >= 55) gipertoniya += 12;
  if (data.sistolik >= 140 || data.diastolik >= 90) gipertoniya += 28;
  else if (data.sistolik >= 130) gipertoniya += 12;
  if (data.tuzIstemi === 'yuqori') gipertoniya += 12;
  if (data.chekish === 'ha') gipertoniya += 10;
  if (data.oiladaKasallik.includes('gipertoniya')) gipertoniya += 12;

  let diabet = 10;
  if (typeof data.glyukoza === 'number' && data.glyukoza >= 5.5) diabet += 30;
  if (data.vazn > 0 && data.boy > 0) {
    const tmi = data.vazn / ((data.boy / 100) ** 2);
    if (tmi >= 30) diabet += 20;
    else if (tmi >= 25) diabet += 12;
  }
  if (data.oiladaKasallik.includes('diabet')) diabet += 14;

  let yurak = 10;
  if (data.chekish === 'ha') yurak += 16;
  if (typeof data.xolesterin === 'number' && data.xolesterin >= 5) yurak += 18;
  if (data.sistolik >= 140) yurak += 18;
  if (data.jismoniyFaollik === 'kam') yurak += 10;

  let insult = 8;
  if (data.sistolik >= 160) insult += 25;
  if (data.chekish === 'ha') insult += 12;
  if (data.yosh >= 60) insult += 12;

  let obezitet = 8;
  if (data.vazn > 0 && data.boy > 0) {
    const tmi = data.vazn / ((data.boy / 100) ** 2);
    if (tmi >= 30) obezitet += 35;
    else if (tmi >= 25) obezitet += 18;
  }
  if (data.jismoniyFaollik === 'kam') obezitet += 15;

  let nafas = 6;
  if (data.chekish === 'ha') nafas += 38;
  if (data.nosvoy === 'ha') nafas += 8;

  let onkologiya = 8;
  if (data.chekish === 'ha') onkologiya += 22;
  if (data.yosh >= 55) onkologiya += 8;

  let buyrak = 8;
  if (data.sistolik >= 140) buyrak += 18;
  if (typeof data.glyukoza === 'number' && data.glyukoza >= 5.5) buyrak += 16;
  if (data.tuzIstemi === 'yuqori') buyrak += 10;

  return [
    buildPrognosis('gipertoniya', 'Gipertoniya', gipertoniya, 'Skrining parametrlariga asoslangan.'),
    buildPrognosis('diabet', 'Qandli diabet (2-tur)', diabet, 'Glyukoza va TMI asosida.'),
    buildPrognosis('yurak_qon', 'Yurak-qon tomir kasalliklari', yurak, 'Kardiovaskular omillar asosida.'),
    buildPrognosis('insult', 'Insult', insult, 'Bosim va yosh asosida.'),
    buildPrognosis('obezitet', 'Semizlik va metabolik sindrom', obezitet, 'TMI va faollik asosida.'),
    buildPrognosis('nafas', "Nafas yo'llari kasalliklari (COPD)", nafas, 'Chekish asosida.'),
    buildPrognosis('onkologiya', 'Onkologik xavf', onkologiya, 'Moddiy omillar asosida.'),
    buildPrognosis('buyrak', 'Buyrak kasalliklari', buyrak, 'Bosim va metabolizm asosida.'),
  ].sort((a, b) => b.xavfFoizi - a.xavfFoizi);
}
