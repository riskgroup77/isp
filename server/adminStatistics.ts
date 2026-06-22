import fs from "fs";
import path from "path";
import type { Express } from "express";
import type { AuthedRequest } from "./auth";
import { requireRoles } from "./auth";
import type { AnketaResponseRecord, AnketaSchema, UserProfile } from "../src/types";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const RESPONSES_FILE = path.join(DATA_DIR, "anketa_responses.json");
const ANKETA_FILE = path.join(DATA_DIR, "anketa_2025.json");
const REFERENCE_FILE = path.join(DATA_DIR, "epidemiology_reference_table1.json");

export type SegmentKey = "sigma" | "erkak" | "ayol";
export type RegionKey = "shahar" | "qishloq";

export interface SegmentValue {
  n: number;
  value: number | null;
}

export interface RegionSegmentGroup {
  shahar: Record<SegmentKey, SegmentValue>;
  qishloq: Record<SegmentKey, SegmentValue>;
  jami: Record<SegmentKey, SegmentValue>;
}

export interface EpidemiologyIndicatorRow {
  id: string;
  label: string;
  unit: "percent" | "average";
  platform: RegionSegmentGroup;
  reference: {
    novosibirsk: Record<SegmentKey, number | null>;
    boshqaShaharlar: Record<SegmentKey, number | null>;
    qishloq: Record<SegmentKey, number | null>;
  };
}

export interface AdminStatisticsPayload {
  generatedAt: string;
  overview: {
    totalUsers: number;
    totalPatients: number;
    totalDoctors: number;
    totalAdmins: number;
    unverifiedDoctors: number;
    totalAnketaResponses: number;
    uniqueRespondents: number;
    avgAnsweredCount: number;
    avgRiskFoizi: number | null;
    completionRate: number;
  };
  riskDistribution: {
    yashil: number;
    sariq: number;
    qizil: number;
    unknown: number;
  };
  submissionsByMonth: { month: string; count: number }[];
  questionStats: QuestionStatRow[];
  epidemiology: {
    title: string;
    source: string;
    ageGroup: string;
    filterAgeGroup: string;
    sampleSizes: EpidemiologyIndicatorRow["platform"];
    indicators: EpidemiologyIndicatorRow[];
  };
  referenceMeta: {
    title: string;
    source: string;
    sampleSizes: Record<string, Record<SegmentKey, number>>;
  };
}

export interface QuestionStatRow {
  id: number;
  text: string;
  type: string;
  section: string;
  responseCount: number;
  options: { label: string; count: number; percent: number }[];
}

interface EnrichedResponse {
  record: AnketaResponseRecord;
  gender: "erkak" | "ayol" | null;
  region: RegionKey | null;
  ageGroup: string | null;
}

interface IndicatorDef {
  id: string;
  label: string;
  unit: "percent" | "average";
  evaluate: (answers: Record<string, unknown>) => boolean | number | null;
}

const AGE_GROUP_MAP: Record<string, string[]> = {
  all: [],
  "29-gacha": ["29 yoshgacha"],
  "30-39": ["30–39 yosh"],
  "40-49": ["40–49 yosh"],
  "50-59": ["50–59 yosh"],
  "60-plus": ["60 yosh va undan katta"],
  "20-29": ["29 yoshgacha"],
};

function loadJson<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function loadUsers(): UserProfile[] {
  return loadJson<UserProfile[]>(USERS_FILE, []);
}

function loadResponses(): AnketaResponseRecord[] {
  return loadJson<AnketaResponseRecord[]>(RESPONSES_FILE, []);
}

function loadSchema(): AnketaSchema | null {
  return loadJson<AnketaSchema | null>(ANKETA_FILE, null);
}

function emptySegment(): Record<SegmentKey, SegmentValue> {
  return {
    sigma: { n: 0, value: null },
    erkak: { n: 0, value: null },
    ayol: { n: 0, value: null },
  };
}

function emptyRegionGroup(): RegionSegmentGroup {
  return {
    shahar: emptySegment(),
    qishloq: emptySegment(),
    jami: emptySegment(),
  };
}

function getAnswer(answers: Record<string, unknown>, questionId: string | number): unknown {
  const key = String(questionId);
  return answers[key] ?? answers[Number(questionId)];
}

function getSingle(answers: Record<string, unknown>, questionId: number): string | null {
  const val = getAnswer(answers, questionId);
  return typeof val === "string" ? val : null;
}

function isHa(val: string | null): boolean {
  return val === "Ha" || val === "Ha, tez-tez" || val === "Ha, kamdan-kam";
}

function isLowFruitVeg(answers: Record<string, unknown>): boolean {
  const matrix = getAnswer(answers, 62);
  if (!matrix || typeof matrix !== "object" || Array.isArray(matrix)) return false;
  const rows = matrix as Record<string, string>;
  const veg = rows["Sabzavotlar"] ?? "";
  const fruit = rows["Mevalar"] ?? "";
  const low = ["Kamdan-kam", "Hech qachon", "Haftasiga 1 marta"];
  return low.includes(veg) || low.includes(fruit);
}

const INDICATOR_DEFS: IndicatorDef[] = [
  {
    id: "obesity",
    label: "TMI ≥ 30 kg/m² (ortiqcha vazn)",
    unit: "percent",
    evaluate: (a) => getSingle(a, 90) === "Me'yordan yuqori",
  },
  {
    id: "hypertension",
    label: "Yuqori arterial bosim",
    unit: "percent",
    evaluate: (a) => {
      const q95 = getSingle(a, 95);
      const q94 = getSingle(a, 94);
      return isHa(q95) || (q94 !== null && ["140/90 – 159/99", "160/100 – 179/109", "180/110 dan yuqori"].includes(q94));
    },
  },
  {
    id: "ihd",
    label: "Yurak-qon tomir kasalligi belgilari",
    unit: "percent",
    evaluate: (a) => getSingle(a, 85) === "Kasallik mavjud",
  },
  {
    id: "diabetes",
    label: "Qandli diabet yoki yuqori qand",
    unit: "percent",
    evaluate: (a) => getSingle(a, 97) === "5,5 mmol/l dan yuqori",
  },
  {
    id: "family_cvd",
    label: "Oilada yurak xuruji/bor (irsiy kasallik)",
    unit: "percent",
    evaluate: (a) => getSingle(a, 80) === "Ha",
  },
  {
    id: "family_cancer",
    label: "Oilada saraton kasalligi (irsiy)",
    unit: "percent",
    evaluate: (a) => getSingle(a, 80) === "Ha",
  },
  {
    id: "smoking_current",
    label: "Hozir chekuvchilar (kuniga 1+ sigaret)",
    unit: "percent",
    evaluate: (a) => getSingle(a, 37) === "Ha",
  },
  {
    id: "smoking_quit",
    label: "Chekishni tashlaganlar",
    unit: "percent",
    evaluate: (a) => getSingle(a, 41) === "Chekishni tashlagansiz",
  },
  {
    id: "low_activity",
    label: "Kuniga 30 daqiqadan kam piyoda yurish",
    unit: "percent",
    evaluate: (a) => {
      const q65 = getSingle(a, 65);
      const q70 = getSingle(a, 70);
      return q65 === "Sayr qilmayman" || q70 === "Yetarli emas";
    },
  },
  {
    id: "low_fruit_veg",
    label: "Kuniga 400 g dan kam meva/sabzavot",
    unit: "percent",
    evaluate: (a) => isLowFruitVeg(a),
  },
  {
    id: "salt_habit",
    label: "Tatib ko'rmasdan tuz qo'shish odatı",
    unit: "percent",
    evaluate: (a) => getSingle(a, 57) === "Ha",
  },
  {
    id: "high_sugar",
    label: "Kuniga ko'p shirinlik iste'moli",
    unit: "percent",
    evaluate: (a) => {
      const matrix = getAnswer(a, 62);
      if (!matrix || typeof matrix !== "object" || Array.isArray(matrix)) return false;
      const sweet = (matrix as Record<string, string>)["Shirinliklar (konfet, pirojniy)"] ?? "";
      return ["Kuniga bir martadan ko'p", "Kuniga 1 marta", "Haftasiga 2–3 marta"].includes(sweet);
    },
  },
  {
    id: "alcohol_relax",
    label: "Dam olish uchun alkogol iste'moli",
    unit: "percent",
    evaluate: (a) => {
      const q46 = getSingle(a, 46);
      return q46 === "Har kuni" || q46 === "Dam olish va bayram kunlarida";
    },
  },
  {
    id: "substance_use",
    label: "Giyohvand moddalar (hozir yoki ilgari)",
    unit: "percent",
    evaluate: (a) => getSingle(a, 52) === "Ha",
  },
  {
    id: "alcohol_family",
    label: "Oilada alkogol suiiste'moli",
    unit: "percent",
    evaluate: (a) => getSingle(a, 48) === "Ha",
  },
];

function parseGender(answers: Record<string, unknown>, user?: UserProfile): "erkak" | "ayol" | null {
  const q1 = getSingle(answers, 1);
  if (q1 === "Erkak") return "erkak";
  if (q1 === "Ayol") return "ayol";
  if (user?.jins === "erkak" || user?.jins === "ayol") return user.jins;
  return null;
}

function parseRegion(answers: Record<string, unknown>): RegionKey | null {
  const q5 = getSingle(answers, 5);
  if (q5 === "Shaharda") return "shahar";
  if (q5 === "Qishloqda") return "qishloq";
  return null;
}

function parseAgeGroup(answers: Record<string, unknown>, user?: UserProfile): string | null {
  const q2 = getSingle(answers, 2);
  if (q2) return q2;
  if (typeof user?.yosh === "number") {
    if (user.yosh <= 29) return "29 yoshgacha";
    if (user.yosh <= 39) return "30–39 yosh";
    if (user.yosh <= 49) return "40–49 yosh";
    if (user.yosh <= 59) return "50–59 yosh";
    return "60 yosh va undan katta";
  }
  return null;
}

function matchesAgeFilter(ageGroup: string | null, filter: string): boolean {
  if (filter === "all") return true;
  const allowed = AGE_GROUP_MAP[filter] ?? [];
  if (allowed.length === 0) return true;
  return ageGroup !== null && allowed.includes(ageGroup);
}

function enrichResponses(
  responses: AnketaResponseRecord[],
  users: UserProfile[],
  ageFilter: string
): EnrichedResponse[] {
  const userMap = new Map(users.map((u) => [u.id, u]));
  return responses
    .map((record) => {
      const user = userMap.get(record.userId);
      const answers = record.answers as Record<string, unknown>;
      const gender = parseGender(answers, user);
      const region = parseRegion(answers);
      const ageGroup = parseAgeGroup(answers, user);
      return { record, gender, region, ageGroup };
    })
    .filter((item) => matchesAgeFilter(item.ageGroup, ageFilter));
}

function computePercent(
  items: EnrichedResponse[],
  region: RegionKey | "jami",
  gender: SegmentKey,
  evaluate: (answers: Record<string, unknown>) => boolean | number | null
): SegmentValue {
  let pool = items;
  if (region !== "jami") {
    pool = pool.filter((i) => i.region === region);
  }
  if (gender === "erkak") pool = pool.filter((i) => i.gender === "erkak");
  if (gender === "ayol") pool = pool.filter((i) => i.gender === "ayol");

  const n = pool.length;
  if (n === 0) return { n: 0, value: null };

  const numericValues = pool
    .map((i) => evaluate(i.record.answers as Record<string, unknown>))
    .filter((v): v is number => typeof v === "number");

  if (numericValues.length > 0) {
    const avg = numericValues.reduce((s, v) => s + v, 0) / numericValues.length;
    return { n, value: Math.round(avg * 10) / 10 };
  }

  const positives = pool.filter((i) =>
    Boolean(evaluate(i.record.answers as Record<string, unknown>))
  ).length;
  return { n, value: Math.round((positives / n) * 1000) / 10 };
}

function buildRegionGroup(
  items: EnrichedResponse[],
  evaluate: (answers: Record<string, unknown>) => boolean | number | null
): RegionSegmentGroup {
  const group = emptyRegionGroup();
  for (const region of ["shahar", "qishloq", "jami"] as const) {
    for (const gender of ["sigma", "erkak", "ayol"] as const) {
      group[region][gender] = computePercent(items, region, gender, evaluate);
    }
  }
  return group;
}

function collectAnswerLabels(
  answers: Record<string, unknown>,
  questionId: number,
  type: string,
  rows: string[]
): string[] {
  const val = getAnswer(answers, questionId);
  if (type === "matrix" && val && typeof val === "object" && !Array.isArray(val)) {
    return Object.values(val as Record<string, string>).filter(Boolean);
  }
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string" && val.trim()) return [val];
  return [];
}

function computeQuestionStats(
  responses: AnketaResponseRecord[],
  schema: AnketaSchema | null
): QuestionStatRow[] {
  if (!schema?.questions?.length) return [];

  return schema.questions.map((q) => {
    const counts = new Map<string, number>();
    let responseCount = 0;

    for (const record of responses) {
      const labels = collectAnswerLabels(
        record.answers as Record<string, unknown>,
        q.id,
        q.type,
        q.rows ?? []
      );
      if (labels.length === 0) continue;
      responseCount += 1;
      for (const label of labels) {
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
    }

    const knownOptions =
      q.type === "matrix"
        ? (q.columns ?? [])
        : q.type === "multiple_choice"
          ? (q.options ?? [])
          : (q.options ?? []);

    const options =
      knownOptions.length > 0
        ? knownOptions.map((label) => {
            const count = counts.get(label) ?? 0;
            return {
              label,
              count,
              percent: responseCount > 0 ? Math.round((count / responseCount) * 1000) / 10 : 0,
            };
          })
        : [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([label, count]) => ({
              label,
              count,
              percent: responseCount > 0 ? Math.round((count / responseCount) * 1000) / 10 : 0,
            }));

    return {
      id: q.id,
      text: q.text,
      type: q.type,
      section: q.section ?? "",
      responseCount,
      options,
    };
  });
}

function buildStatistics(ageFilter = "all"): AdminStatisticsPayload {
  const users = loadUsers();
  const responses = loadResponses();
  const schema = loadSchema();
  const reference = loadJson<{
    title: string;
    source: string;
    ageGroup: string;
    sampleSizes: Record<string, Record<SegmentKey, number>>;
    indicators: {
      id: string;
      label: string;
      unit: string;
      values: Record<string, Record<SegmentKey, number | null>>;
    }[];
  }>(REFERENCE_FILE, {
    title: "",
    source: "",
    ageGroup: "20-29",
    sampleSizes: {},
    indicators: [],
  });

  const patients = users.filter((u) => u.rol === "foydalanuvchi");
  const doctors = users.filter((u) => u.rol === "shifokor");
  const admins = users.filter((u) => u.rol === "admin");
  const unverifiedDoctors = doctors.filter((d) => !d.tasdiqlangan);

  const uniqueRespondents = new Set(responses.map((r) => r.userId)).size;
  const answeredCounts = responses.map((r) => r.answeredCount ?? 0);
  const avgAnsweredCount =
    answeredCounts.length > 0
      ? Math.round((answeredCounts.reduce((s, v) => s + v, 0) / answeredCounts.length) * 10) / 10
      : 0;

  const riskValues = responses
    .map((r) => r.riskFoizi ?? r.tahlil?.riskFoizi)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const avgRiskFoizi =
    riskValues.length > 0
      ? Math.round((riskValues.reduce((s, v) => s + v, 0) / riskValues.length) * 10) / 10
      : null;

  const totalQuestions = schema?.totalQuestions ?? schema?.questions?.length ?? 147;
  const completionRate =
    avgAnsweredCount > 0
      ? Math.min(100, Math.round((avgAnsweredCount / totalQuestions) * 1000) / 10)
      : 0;

  const riskDistribution = { yashil: 0, sariq: 0, qizil: 0, unknown: 0 };
  for (const r of responses) {
    const zona = r.zona ?? r.tahlil?.zona;
    if (zona === "yashil") riskDistribution.yashil += 1;
    else if (zona === "sariq") riskDistribution.sariq += 1;
    else if (zona === "qizil") riskDistribution.qizil += 1;
    else riskDistribution.unknown += 1;
  }

  const monthMap = new Map<string, number>();
  for (const r of responses) {
    const month = r.yaratilganSana?.slice(0, 7) ?? "noma'lum";
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
  }
  const submissionsByMonth = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  const enriched = enrichResponses(responses, users, ageFilter);

  const refMap = new Map(reference.indicators.map((i) => [i.id, i]));
  const indicators: EpidemiologyIndicatorRow[] = INDICATOR_DEFS.map((def) => {
    const ref = refMap.get(def.id);
    return {
      id: def.id,
      label: def.label,
      unit: def.unit,
      platform: buildRegionGroup(enriched, def.evaluate),
      reference: {
        novosibirsk: ref?.values?.novosibirsk ?? { sigma: null, erkak: null, ayol: null },
        boshqaShaharlar: ref?.values?.boshqaShaharlar ?? { sigma: null, erkak: null, ayol: null },
        qishloq: ref?.values?.qishloq ?? { sigma: null, erkak: null, ayol: null },
      },
    };
  });

  const sampleSizes = buildRegionGroup(enriched, () => true);

  return {
    generatedAt: new Date().toISOString(),
    overview: {
      totalUsers: users.length,
      totalPatients: patients.length,
      totalDoctors: doctors.length,
      totalAdmins: admins.length,
      unverifiedDoctors: unverifiedDoctors.length,
      totalAnketaResponses: responses.length,
      uniqueRespondents,
      avgAnsweredCount,
      avgRiskFoizi,
      completionRate,
    },
    riskDistribution,
    submissionsByMonth,
    questionStats: computeQuestionStats(responses, schema),
    epidemiology: {
      title: reference.title || "Epidemiologik ko'rsatkichlar jadvali",
      source: "Platforma anketa javoblari",
      ageGroup: reference.ageGroup,
      filterAgeGroup: ageFilter,
      sampleSizes,
      indicators,
    },
    referenceMeta: {
      title: reference.title,
      source: reference.source,
      sampleSizes: reference.sampleSizes,
    },
  };
}

export function registerAdminStatisticsRoutes(
  app: Express,
  requireAuth: (req: AuthedRequest, res: import("express").Response, next: () => void) => void
) {
  app.get(
    "/api/admin/statistics",
    requireAuth,
    requireRoles("admin"),
    (req, res) => {
      try {
        const ageGroup =
          typeof req.query.ageGroup === "string" ? req.query.ageGroup : "all";
        const stats = buildStatistics(ageGroup);
        return res.json({ success: true, statistics: stats });
      } catch (err) {
        console.error("Admin statistics error:", err);
        return res.status(500).json({ error: "Statistikani yuklashda xatolik." });
      }
    }
  );
}

export { buildStatistics };
