import { Type } from "@google/genai";
import type { GoogleGenAI } from "@google/genai";
import type {
  AnketaAnswers,
  AnketaSchema,
  AnketaTahlil,
  FactorImportance,
} from "../src/types";

function strAnswer(answers: AnketaAnswers, id: number): string {
  const v = answers[String(id)];
  return typeof v === "string" ? v : "";
}

function includesAny(text: string, needles: string[]): boolean {
  const lower = text.toLowerCase();
  return needles.some((n) => lower.includes(n.toLowerCase()));
}

function parseYoshFromAnketa(answers: AnketaAnswers): number {
  const a = strAnswer(answers, 2);
  if (includesAny(a, ["29 yoshgacha"])) return 28;
  if (includesAny(a, ["30", "39"])) return 35;
  if (includesAny(a, ["40", "49"])) return 45;
  if (includesAny(a, ["50", "59"])) return 55;
  if (includesAny(a, ["60"])) return 65;
  return 40;
}

function parseJins(answers: AnketaAnswers): "erkak" | "ayol" {
  const a = strAnswer(answers, 1);
  return includesAny(a, ["ayol"]) ? "ayol" : "erkak";
}

function countMatrixYes(answers: AnketaAnswers, id: number): number {
  const v = answers[String(id)];
  if (!v || typeof v !== "object" || Array.isArray(v)) return 0;
  return Object.values(v).filter((cell) => includesAny(String(cell), ["ha"])).length;
}

export function analyzeAnketaAnswers(
  answers: AnketaAnswers,
  schema?: AnketaSchema
): AnketaTahlil {
  const yosh = parseYoshFromAnketa(answers);
  const jins = parseJins(answers);

  let points = 0;

  if (yosh >= 45 && yosh < 55) points += 2;
  else if (yosh >= 55 && yosh < 65) points += 4;
  else if (yosh >= 65) points += 6;

  const chekish = strAnswer(answers, 37);
  if (includesAny(chekish, ["ha"])) points += 4;

  const spirt = strAnswer(answers, 46);
  if (includesAny(spirt, ["har kuni"])) points += 4;
  else if (includesAny(spirt, ["dam olish", "bayram"])) points += 2;

  const tuz = strAnswer(answers, 57);
  if (includesAny(tuz, ["ha"])) points += 3;

  const faolUy = strAnswer(answers, 65);
  if (includesAny(faolUy, ["sayr qilmayman"])) points += 4;
  else if (!includesAny(faolUy, ["har kuni", "muntazam"])) points += 2;

  const sport = strAnswer(answers, 66);
  if (includesAny(sport, ["yo"])) points += 2;

  const uyMashq = strAnswer(answers, 68);
  if (includesAny(uyMashq, ["yo"])) points += 2;

  const faollikBahosi = strAnswer(answers, 70);
  if (includesAny(faollikBahosi, ["yetarli emas"])) points += 3;

  const soglikBahosi = strAnswer(answers, 76);
  if (includesAny(soglikBahosi, ["surunkali"])) points += 5;
  else if (includesAny(soglikBahosi, ["tez-tez"])) points += 3;
  else if (includesAny(soglikBahosi, ["ba'zan"])) points += 1;

  const vaznBahosi = strAnswer(answers, 90);
  if (includesAny(vaznBahosi, ["yuqori", "me'yordan yuqori"])) points += 4;
  else if (includesAny(vaznBahosi, ["past"])) points += 1;

  const bp = strAnswer(answers, 94);
  if (includesAny(bp, ["180", "179"])) points += 9;
  else if (includesAny(bp, ["160", "159"])) points += 7;
  else if (includesAny(bp, ["140", "139"])) points += 5;
  else if (includesAny(bp, ["130", "129"])) points += 2;

  const bpYuqori = strAnswer(answers, 95);
  if (includesAny(bpYuqori, ["tez-tez"])) points += 4;
  else if (includesAny(bpYuqori, ["kamdan"])) points += 2;

  const glyukoza = strAnswer(answers, 97);
  if (includesAny(glyukoza, ["5.5", "yuqori"])) points += 5;
  else if (includesAny(glyukoza, ["past"])) points += 1;

  const xolesterin = strAnswer(answers, 98);
  if (includesAny(xolesterin, ["yuqori", "5 mmol"])) points += 4;

  const symptomYes = countMatrixYes(answers, 81);
  points += Math.min(8, symptomYes * 0.8);

  const ishHolati = strAnswer(answers, 71);
  if (includesAny(ishHolati, ["o'tirib"])) points += 2;

  const uyqu = strAnswer(answers, 73);
  if (includesAny(uyqu, ["kam"])) points += 2;

  const uyquQiyin = strAnswer(answers, 74);
  if (includesAny(uyquQiyin, ["ha"])) points += 2;

  let riskFoizi = 5;
  if (points <= 8) riskFoizi = Math.round(points * 3);
  else if (points <= 22) riskFoizi = Math.round(25 + (points - 8) * 3);
  else riskFoizi = Math.round(Math.min(99, 68 + (points - 22) * 1.8));

  let zona: "yashil" | "sariq" | "qizil" = "yashil";
  if (riskFoizi >= 30 && riskFoizi < 70) zona = "sariq";
  else if (riskFoizi >= 70) zona = "qizil";

  const tmiKategoriya = includesAny(vaznBahosi, ["yuqori", "me'yordan yuqori"])
    ? "ortiqcha vazn"
    : includesAny(vaznBahosi, ["past", "me'yordan past"])
      ? "vazn yetishmasligi"
      : "me'yor";

  const faktorlar: FactorImportance[] = [];
  if (includesAny(chekish, ["ha"])) {
    faktorlar.push({
      nomi: "Chekish",
      tafsilot: "Anketa javoblariga ko'ra faol chekish qayd etilgan.",
      tasirKuchi: 8,
      boshqariladimi: true,
    });
  }
  if (includesAny(tuz, ["ha"])) {
    faktorlar.push({
      nomi: "Tuz iste'moli",
      tafsilot: "Ovqatga qo'shimcha tuz qo'shish odatlari kardiovaskular xavfni oshiradi.",
      tasirKuchi: 7.5,
      boshqariladimi: true,
    });
  }
  if (includesAny(faolUy, ["sayr qilmayman"]) || includesAny(uyMashq, ["yo"])) {
    faktorlar.push({
      nomi: "Kam harakatlilik",
      tafsilot: "Jismoniy faollik past darajada baholangan.",
      tasirKuchi: 7,
      boshqariladimi: true,
    });
  }
  if (symptomYes >= 3) {
    faktorlar.push({
      nomi: "Klinik shikoyatlar",
      tafsilot: `${symptomYes} ta shikoyat yoki belgi anketa bo'yicha qayd etilgan.`,
      tasirKuchi: Math.min(9, symptomYes),
      boshqariladimi: true,
    });
  }
  if (includesAny(bpYuqori, ["tez-tez"]) || includesAny(bp, ["140", "160", "180"])) {
    faktorlar.push({
      nomi: "Arterial bosim",
      tafsilot: "Qon bosimi yuqori yoki o'zgaruvchan deb baholangan.",
      tasirKuchi: 8.5,
      boshqariladimi: true,
    });
  }

  const kritikOmillar: string[] = [];
  if (includesAny(chekish, ["ha"])) kritikOmillar.push("Faol chekish");
  if (includesAny(tuz, ["ha"])) kritikOmillar.push("Yuqori tuz iste'moli");
  if (includesAny(faolUy, ["sayr qilmayman"])) kritikOmillar.push("Kam jismoniy faollik");
  if (symptomYes >= 2) kritikOmillar.push("Ko'p klinik shikoyatlar");
  if (includesAny(bp, ["140", "160", "180"])) kritikOmillar.push("Yuqori arterial bosim xavfi");

  let klinikXulosa = "";
  if (zona === "yashil") {
    klinikXulosa =
      "Anketa javoblaringizga ko'ra xronik kasalliklar rivojlanish xavfi past darajada baholandi. Sog'lom turmush tarzi tamoyillarini saqlash tavsiya etiladi.";
  } else if (zona === "sariq") {
    klinikXulosa =
      "Anketa natijalariga ko'ra o'rtacha darajadagi xavf omillari aniqlangan. Ovqatlanish, harakat va stressni boshqarish, shuningdek profilaktik ko'riklardan o'tish tavsiya etiladi.";
  } else {
    klinikXulosa =
      "Anketa javoblaringiz yuqori xavf darajasini ko'rsatmoqda. Oilaviy shifokor yoki kardiolog nazoratida chuqur tekshiruv va individual profilaktik reja talab qilinadi.";
  }

  return {
    riskFoizi,
    zona,
    tmi: includesAny(vaznBahosi, ["yuqori"]) ? 27.5 : includesAny(vaznBahosi, ["past"]) ? 19 : 23,
    tmiKategoriya,
    faktorlar: faktorlar.sort((a, b) => b.tasirKuchi - a.tasirKuchi),
    shaxsiyTavsiyalar: {
      kritikOmillar: kritikOmillar.length ? kritikOmillar : ["Anketa bo'yicha kritik omillar past"],
      ovqatlanish: [
        "Kunlik tuz iste'molini kamaytiring (taomga qo'shimcha tuz qo'shmaslik).",
        "Sabzavot va mevalarni har kuni iste'mol qiling.",
        "Shakarli ichimliklar va qatiq sho'r taomlarni haftada cheklang.",
      ],
      jismoniyMashq: [
        "Kuniga kamida 30 daqiqa piyoda yurishni odat qiling.",
        "Ish vaqtida har 1 soatdan keyin 5 daqiqa harakat qiling.",
        "Haftada 3–5 marta yengil kardiomashqlar bilan shug'ullaning.",
      ],
      tibbiyReja: [
        "Arterial bosimni muntazam o'lchab yozib boring.",
        "Yiliga kamida bir marta qon tahlili (glyukoza, xolesterin) o'tkazing.",
        "Shikoyatlar kuchaysa oilaviy shifokorga murojaat qiling.",
      ],
      kutilayotganEffekt: [
        {
          ozgarish: "Sog'lom turmush tarziga o'tish",
          kamayadiganXavf: Math.round(riskFoizi * 0.15),
        },
      ],
      komplayensTahlili: {
        daraja: includesAny(strAnswer(answers, 17), ["ha"]) ? "Yaxshi" : "O'rtacha",
        nomutanosiblikKuzatildimi: false,
        maslahat:
          "Anketa javoblaringiz asosida sog'lom turmush tarzi elementlariga rioya qilish muhim.",
      },
    },
    klinikXulosa,
    answeredSignals: {
      yosh,
      jins,
      symptomCount: symptomYes,
      answeredCount: Object.keys(answers).length,
      schemaVersion: schema?.version ?? "2025",
    },
  };
}

function formatAnswerValue(val: unknown): string {
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.join("; ");
  if (val && typeof val === "object") {
    return Object.entries(val as Record<string, string>)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
  }
  return "";
}

function buildAnketaAiPrompt(schema: AnketaSchema, answers: AnketaAnswers, base: AnketaTahlil): string {
  const lines = schema.questions
    .filter((q) => answers[String(q.id)] !== undefined)
    .slice(0, 80)
    .map((q) => `${q.id}. ${q.text}: ${formatAnswerValue(answers[String(q.id)])}`);

  return `Anketa javoblari (${Object.keys(answers).length} savol):
${lines.join("\n")}

Bazaviy risk hisobi: ${base.riskFoizi}% (${base.zona} zona), TMI bahosi: ${base.tmiKategoriya}.
Javobni JSON formatida bering.`;
}

export async function enrichAnketaWithAi(
  aiClient: GoogleGenAI,
  schema: AnketaSchema,
  answers: AnketaAnswers,
  base: AnketaTahlil
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

  const response = await aiClient.models.generateContent({
    model: "gemini-3.5-flash",
    contents: buildAnketaAiPrompt(schema, answers, base),
    config: {
      systemInstruction:
        "Siz Farg'ona vodiysi jamoat salomatligi va kardiologik profilaktika bo'yicha AI mutaxassisisiz. Anketa javoblarini tahlil qiling. JSON qaytaring.",
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

export async function runAnketaAnalysis(
  answers: AnketaAnswers,
  schema: AnketaSchema,
  aiClient?: GoogleGenAI | null
): Promise<{ tahlil: AnketaTahlil; aiXato: string | null }> {
  const base = analyzeAnketaAnswers(answers, schema);

  if (!aiClient) {
    return { tahlil: base, aiXato: null };
  }

  try {
    const enriched = await enrichAnketaWithAi(aiClient, schema, answers, base);
    return { tahlil: enriched, aiXato: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI tahlil vaqtincha ishlamadi";
    console.error("Anketa AI analysis failed:", err);
    return { tahlil: base, aiXato: msg };
  }
}
