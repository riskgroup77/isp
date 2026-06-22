import { Type } from "@google/genai";
import type { GoogleGenAI } from "@google/genai";
import type {
  AnketaAnswers,
  AnketaSchema,
  AnketaTahlil,
  FactorImportance,
} from "../src/types";

export type SurveyKind = "student" | "pedagog";

function strAnswer(answers: AnketaAnswers, id: number): string {
  const v = answers[String(id)];
  return typeof v === "string" ? v : "";
}

function includesAny(text: string, needles: string[]): boolean {
  const lower = text.toLowerCase();
  return needles.some((n) => lower.includes(n.toLowerCase()));
}

function countMatrixYes(answers: AnketaAnswers, id: number): number {
  const v = answers[String(id)];
  if (!v || typeof v !== "object" || Array.isArray(v)) return 0;
  return Object.values(v).filter((cell) => includesAny(String(cell), ["ha"])).length;
}

function parseYoshStudent(answers: AnketaAnswers): number {
  const raw = strAnswer(answers, 1);
  const num = Number(raw.replace(/\D/g, ""));
  if (Number.isFinite(num) && num > 0 && num < 100) return num;
  return 22;
}

function parseYoshPedagog(answers: AnketaAnswers): number {
  const a = strAnswer(answers, 2);
  if (includesAny(a, ["29"])) return 28;
  if (includesAny(a, ["30", "39"])) return 35;
  if (includesAny(a, ["40", "49"])) return 45;
  if (includesAny(a, ["50", "59"])) return 55;
  if (includesAny(a, ["60"])) return 65;
  return 40;
}

function parseJins(answers: AnketaAnswers, id: number): "erkak" | "ayol" {
  const a = strAnswer(answers, id);
  return includesAny(a, ["ayol", "аёл"]) ? "ayol" : "erkak";
}

function buildTahlil(
  points: number,
  faktorlar: FactorImportance[],
  extras: {
    yosh: number;
    jins: "erkak" | "ayol";
    symptomYes: number;
    answeredCount: number;
    surveyKind: SurveyKind;
    vaznBahosi?: string;
    audienceNote: string;
  }
): AnketaTahlil {
  let riskFoizi = 5;
  if (points <= 8) riskFoizi = Math.round(points * 3);
  else if (points <= 22) riskFoizi = Math.round(25 + (points - 8) * 3);
  else riskFoizi = Math.round(Math.min(99, 68 + (points - 22) * 1.8));

  let zona: "yashil" | "sariq" | "qizil" = "yashil";
  if (riskFoizi >= 30 && riskFoizi < 70) zona = "sariq";
  else if (riskFoizi >= 70) zona = "qizil";

  const tmiKategoriya = includesAny(extras.vaznBahosi ?? "", ["yuqori", "me'yordan yuqori"])
    ? "ortiqcha vazn"
    : includesAny(extras.vaznBahosi ?? "", ["past", "me'yordan past"])
      ? "vazn yetishmasligi"
      : "me'yor";

  const kritikOmillar = faktorlar
    .filter((f) => f.tasirKuchi >= 6)
    .slice(0, 5)
    .map((f) => f.nomi);

  return {
    riskFoizi,
    zona,
    tmiKategoriya,
    faktorlar: faktorlar.sort((a, b) => b.tasirKuchi - a.tasirKuchi).slice(0, 8),
    shaxsiyTavsiyalar: {
      kritikOmillar,
      ovqatlanish: [
        "Kuniga kamida 400 g meva va sabzavot iste'mol qiling.",
        "Tuz va shirinlik miqdorini kamaytiring.",
        "Fastfud va energiya ichimliklarini cheklang.",
      ],
      jismoniyMashq: [
        "Kuniga kamida 30 daqiqa piyoda yurish yoki yengil jismoniy mashq qiling.",
        "O'qish/ish va dam olish rejimini muvozanatlang.",
      ],
      tibbiyReja: [
        "Yillik profilaktik tibbiy ko'rikdan o'ting.",
        "Arterial bosim va vaznni muntazam nazorat qiling.",
        extras.audienceNote,
      ],
      kutilayotganEffekt: [
        { ozgarish: "Jismoniy faollikni oshirish", kamayadiganXavf: 12 },
        { ozgarish: "Chekish va alkogolni kamaytirish", kamayadiganXavf: 15 },
      ],
      komplayensTahlili: {
        daraja: riskFoizi < 30 ? "yaxshi" : riskFoizi < 60 ? "o'rtacha" : "past",
        nomutanosiblikKuzatildimi: extras.symptomYes > 5,
        maslahat: "So'rovnoma javoblari asosida sog'lom turmush tarzi rejasini tuzing.",
      },
    },
    klinikXulosa: `${extras.surveyKind === "student" ? "Talaba" : "Pedagog"} so'rovnomasi bo'yicha ${extras.symptomYes} ta shikoyat va ${faktorlar.length} ta xavf omili aniqlangan. Umumiy xavf darajasi: ${riskFoizi}% (${zona} zona).`,
    answeredSignals: {
      yosh: extras.yosh,
      jins: extras.jins,
      symptomCount: extras.symptomYes,
      answeredCount: extras.answeredCount,
      schemaVersion: extras.surveyKind,
    },
  };
}

export function analyzeStudentSurvey(answers: AnketaAnswers, schema?: AnketaSchema): AnketaTahlil {
  const yosh = parseYoshStudent(answers);
  const jins = parseJins(answers, 2);
  let points = 0;
  const faktorlar: FactorImportance[] = [];

  if (yosh >= 25) points += 1;

  const stress = strAnswer(answers, 8);
  if (includesAny(stress, ["ha"])) {
    points += 3;
    faktorlar.push({
      nomi: "O'quv stressi",
      tafsilot: "O'quv yuklamasi stressga sabab bo'ladi deb baholangan.",
      tasirKuchi: 7,
      boshqariladimi: true,
    });
  }

  const yashash = strAnswer(answers, 6);
  if (includesAny(yashash, ["ha", "ba'zan"])) points += 2;

  const chekish = strAnswer(answers, 24);
  if (includesAny(chekish, ["ha", "ilgari"])) {
    points += includesAny(chekish, ["ha"]) ? 4 : 2;
    faktorlar.push({
      nomi: "Chekish",
      tafsilot: "Tamaki iste'moli qayd etilgan.",
      tasirKuchi: 8,
      boshqariladimi: true,
    });
  }

  const alkogol = strAnswer(answers, 25);
  if (includesAny(alkogol, ["ha"])) {
    points += 3;
    faktorlar.push({ nomi: "Alkogol", tafsilot: "Alkogol iste'moli mavjud.", tasirKuchi: 6.5, boshqariladimi: true });
  }

  const energiya = strAnswer(answers, 26);
  if (includesAny(energiya, ["kundalik", "haftada"])) points += 2;

  const faol = strAnswer(answers, 13);
  if (includesAny(faol, ["sayr qilmayman"])) points += 4;
  const faolBahosi = strAnswer(answers, 18);
  if (includesAny(faolBahosi, ["yetarli emas"])) points += 3;

  const fastfood = strAnswer(answers, 30);
  if (includesAny(fastfood, ["ko'p", "o'rta"])) points += 3;

  const soglik = strAnswer(answers, 32);
  if (includesAny(soglik, ["surunkali"])) points += 5;
  else if (includesAny(soglik, ["tez-tez"])) points += 3;

  const vaznBahosi = strAnswer(answers, 46);
  if (includesAny(vaznBahosi, ["yuqori", "me'yordan yuqori"])) {
    points += 4;
    faktorlar.push({ nomi: "Ortiqcha vazn", tafsilot: "Tana vazni me'yordan yuqori baholangan.", tasirKuchi: 7, boshqariladimi: true });
  }

  const bp = strAnswer(answers, 50);
  if (includesAny(bp, ["180", "179"])) points += 8;
  else if (includesAny(bp, ["160", "159"])) points += 6;
  else if (includesAny(bp, ["140", "139"])) points += 4;

  const bpYuqori = strAnswer(answers, 51);
  if (includesAny(bpYuqori, ["tez-tez"])) points += 4;

  const glyukoza = strAnswer(answers, 53);
  if (includesAny(glyukoza, ["5.5", "yuqori"])) points += 4;

  const symptomYes = countMatrixYes(answers, 37);
  points += Math.min(8, symptomYes * 0.7);
  if (symptomYes >= 3) {
    faktorlar.push({
      nomi: "Klinik shikoyatlar",
      tafsilot: `${symptomYes} ta shikoyat anketa bo'yicha qayd etilgan.`,
      tasirKuchi: Math.min(9, symptomYes),
      boshqariladimi: true,
    });
  }

  const bilim = strAnswer(answers, 56);
  if (includesAny(bilim, ["past", "o'rta"])) points += 1;

  const amaliyot = strAnswer(answers, 60);
  if (includesAny(amaliyot, ["yo'q", "ba'zan"])) points += 2;

  return buildTahlil(points, faktorlar, {
    yosh,
    jins,
    symptomYes,
    answeredCount: Object.keys(answers).length,
    surveyKind: "student",
    vaznBahosi,
    audienceNote: "Talaba sifatida o'quv, uyqu va stress muvozanatini nazorat qiling.",
  });
}

export function analyzePedagogSurvey(answers: AnketaAnswers, schema?: AnketaSchema): AnketaTahlil {
  const yosh = parseYoshPedagog(answers);
  const jins = parseJins(answers, 1);
  let points = 0;
  const faktorlar: FactorImportance[] = [];

  if (yosh >= 45) points += 2;
  if (yosh >= 55) points += 2;

  const chekish = strAnswer(answers, 29);
  if (includesAny(chekish, ["ha"])) {
    points += 4;
    faktorlar.push({ nomi: "Chekish", tafsilot: "Faol chekish qayd etilgan.", tasirKuchi: 8, boshqariladimi: true });
  }

  const spirt = strAnswer(answers, 32);
  if (includesAny(spirt, ["har kuni"])) points += 4;
  else if (includesAny(spirt, ["dam olish", "bayram"])) points += 2;

  const faol = strAnswer(answers, 44);
  if (includesAny(faol, ["sayr qilmayman"])) points += 4;

  const ishHolati = strAnswer(answers, 48);
  if (includesAny(ishHolati, ["o'tirib"])) points += 2;

  const soglik = strAnswer(answers, 53);
  if (includesAny(soglik, ["surunkali"])) points += 5;
  else if (includesAny(soglik, ["tez-tez"])) points += 3;

  const vaznBahosi = strAnswer(answers, 66);
  if (includesAny(vaznBahosi, ["yuqori", "me'yordan yuqori"])) {
    points += 4;
    faktorlar.push({ nomi: "Ortiqcha vazn", tafsilot: "Tana vazni me'yordan yuqori.", tasirKuchi: 7, boshqariladimi: true });
  }

  const bp = strAnswer(answers, 68);
  if (includesAny(bp, ["180", "179"])) points += 8;
  else if (includesAny(bp, ["160", "159"])) points += 6;
  else if (includesAny(bp, ["140", "139"])) points += 4;

  const bpYuqori = strAnswer(answers, 69);
  if (includesAny(bpYuqori, ["tez-tez"])) points += 4;

  const glyukoza = strAnswer(answers, 71);
  if (includesAny(glyukoza, ["5.5", "yuqori"])) points += 4;

  const symptomYes = countMatrixYes(answers, 57);
  points += Math.min(8, symptomYes * 0.7);
  if (symptomYes >= 3) {
    faktorlar.push({
      nomi: "Klinik shikoyatlar",
      tafsilot: `${symptomYes} ta shikoyat qayd etilgan.`,
      tasirKuchi: Math.min(9, symptomYes),
      boshqariladimi: true,
    });
  }

  const yuklama = strAnswer(answers, 77);
  if (includesAny(yuklama, ["36 soatdan ko'p"])) {
    points += 3;
    faktorlar.push({
      nomi: "Yuqori pedagogik yuklama",
      tafsilot: "Haftalik ish yuklamasi 36 soatdan oshgan.",
      tasirKuchi: 7.5,
      boshqariladimi: true,
    });
  }

  const burnout = strAnswer(answers, 81);
  if (includesAny(burnout, ["ha"])) {
    points += 5;
    faktorlar.push({
      nomi: "Professional kuyib ketish",
      tafsilot: "Kasbiy kuyib ketish belgilari mavjud deb baholangan.",
      tasirKuchi: 8.5,
      boshqariladimi: true,
    });
  }

  const kayfiyat = strAnswer(answers, 80);
  if (includesAny(kayfiyat, ["yomon"])) points += 3;

  const profKasallik = strAnswer(answers, 73);
  if (includesAny(profKasallik, ["ha"])) {
    points += 4;
    faktorlar.push({
      nomi: "Kasbiy kasallik",
      tafsilot: "Kasbga oid professional kasallik qayd etilgan.",
      tasirKuchi: 8,
      boshqariladimi: true,
    });
  }

  const mehnatOmil = answers[String(79)];
  if (Array.isArray(mehnatOmil) && mehnatOmil.length >= 3) {
    points += 3;
    faktorlar.push({
      nomi: "Mehnat sharoiti omillari",
      tafsilot: `${mehnatOmil.length} ta noqulay mehnat sharoiti omili tanlangan.`,
      tasirKuchi: 7,
      boshqariladimi: true,
    });
  }

  return buildTahlil(points, faktorlar, {
    yosh,
    jins,
    symptomYes,
    answeredCount: Object.keys(answers).length,
    surveyKind: "pedagog",
    vaznBahosi,
    audienceNote: "Pedagog sifatida mehnat yuklamasi, dam olish va professional stressni boshqaring.",
  });
}

function analyzeByKind(kind: SurveyKind, answers: AnketaAnswers, schema?: AnketaSchema): AnketaTahlil {
  return kind === "student" ? analyzeStudentSurvey(answers, schema) : analyzePedagogSurvey(answers, schema);
}

async function enrichWithAi(
  aiClient: GoogleGenAI,
  schema: AnketaSchema,
  answers: AnketaAnswers,
  base: AnketaTahlil,
  kind: SurveyKind
): Promise<AnketaTahlil> {
  const aiSchema = {
    type: Type.OBJECT,
    properties: {
      klinikXulosa: { type: Type.STRING },
      kritikOmillar: { type: Type.ARRAY, items: { type: Type.STRING } },
      ovqatlanish: { type: Type.ARRAY, items: { type: Type.STRING } },
      jismoniyMashq: { type: Type.ARRAY, items: { type: Type.STRING } },
      tibbiyReja: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["klinikXulosa", "kritikOmillar", "ovqatlanish", "jismoniyMashq", "tibbiyReja"],
  };

  const audience = kind === "student" ? "tibbiyot instituti talabasi" : "OTM pedagog xodimi";
  const response = await aiClient.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `${audience} so'rovnomasi javoblari tahlili. Xavf: ${base.riskFoizi}%, zona: ${base.zona}. Javoblar soni: ${Object.keys(answers).length}.`,
    config: {
      systemInstruction:
        "Siz Farg'ona vodiysi jamoat salomatligi bo'yicha AI mutaxassisisiz. JSON qaytaring.",
      responseMimeType: "application/json",
      responseSchema: aiSchema,
      temperature: 0.35,
    },
  });

  const parsed = JSON.parse(response.text?.trim() || "{}");
  const tahlil = { ...base };
  if (parsed.klinikXulosa) tahlil.klinikXulosa = parsed.klinikXulosa;
  if (Array.isArray(parsed.kritikOmillar) && parsed.kritikOmillar.length) {
    tahlil.shaxsiyTavsiyalar.kritikOmillar = parsed.kritikOmillar;
  }
  if (Array.isArray(parsed.ovqatlanish) && parsed.ovqatlanish.length) {
    tahlil.shaxsiyTavsiyalar.ovqatlanish = parsed.ovqatlanish;
  }
  if (Array.isArray(parsed.jismoniyMashq) && parsed.jismoniyMashq.length) {
    tahlil.shaxsiyTavsiyalar.jismoniyMashq = parsed.jismoniyMashq;
  }
  if (Array.isArray(parsed.tibbiyReja) && parsed.tibbiyReja.length) {
    tahlil.shaxsiyTavsiyalar.tibbiyReja = parsed.tibbiyReja;
  }
  return tahlil;
}

export async function runSurveyAnalysis(
  kind: SurveyKind,
  answers: AnketaAnswers,
  schema: AnketaSchema,
  aiClient?: GoogleGenAI | null
): Promise<{ tahlil: AnketaTahlil; aiXato: string | null }> {
  let tahlil = analyzeByKind(kind, answers, schema);
  let aiXato: string | null = null;

  if (aiClient) {
    try {
      tahlil = await enrichWithAi(aiClient, schema, answers, tahlil, kind);
    } catch (err) {
      aiXato = err instanceof Error ? err.message : "AI tahlil xatosi";
      console.warn(`Survey AI analysis failed (${kind}):`, err);
    }
  }

  return { tahlil, aiXato };
}
