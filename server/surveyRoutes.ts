import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { Express, Response } from "express";
import type { GoogleGenAI } from "@google/genai";
import type { AuthedRequest } from "./auth";
import { requireRoles } from "./auth";
import type { AnketaResponseRecord, AnketaSchema } from "../src/types";
import { runSurveyAnalysis, type SurveyKind } from "./surveyAnalysis";

const DATA_DIR = path.join(process.cwd(), "data");

const SURVEY_CONFIG: Record<
  SurveyKind,
  { schemaFile: string; responsesFile: string; label: string }
> = {
  student: {
    schemaFile: "student_survey.json",
    responsesFile: "student_responses.json",
    label: "Talaba so'rovnomasi",
  },
  pedagog: {
    schemaFile: "pedagog_survey.json",
    responsesFile: "pedagog_responses.json",
    label: "Pedagog so'rovnomasi",
  },
};

function isSurveyKind(val: string): val is SurveyKind {
  return val === "student" || val === "pedagog";
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadSchema(kind: SurveyKind): AnketaSchema {
  const cfg = SURVEY_CONFIG[kind];
  const file = path.join(DATA_DIR, cfg.schemaFile);
  if (!fs.existsSync(file)) {
    throw new Error(`${cfg.label} savollar fayli topilmadi.`);
  }
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as AnketaSchema;
  return {
    ...raw,
    totalQuestions: raw.totalQuestions ?? raw.questions.length,
  };
}

function loadResponses(kind: SurveyKind): AnketaResponseRecord[] {
  ensureDataDir();
  const file = path.join(DATA_DIR, SURVEY_CONFIG[kind].responsesFile);
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveResponses(kind: SurveyKind, responses: AnketaResponseRecord[]) {
  ensureDataDir();
  const file = path.join(DATA_DIR, SURVEY_CONFIG[kind].responsesFile);
  fs.writeFileSync(file, JSON.stringify(responses, null, 2), "utf8");
}

function countAnswers(answers: Record<string, unknown>): number {
  return Object.keys(answers).filter((key) => {
    const val = answers[key];
    if (val === undefined || val === null || val === "") return false;
    if (Array.isArray(val) && val.length === 0) return false;
    if (typeof val === "object" && !Array.isArray(val) && Object.keys(val as object).length === 0) {
      return false;
    }
    return true;
  }).length;
}

function validateAnswers(
  schema: AnketaSchema,
  answers: Record<string, unknown>
): { valid: boolean; error?: string } {
  const questionIds = new Set(schema.questions.map((q) => String(q.id)));
  const keys = Object.keys(answers);
  if (keys.length === 0) {
    return { valid: false, error: "Kamida bitta savolga javob berishingiz kerak." };
  }
  for (const key of keys) {
    if (!questionIds.has(key)) {
      return { valid: false, error: `Noto'g'ri savol ID: ${key}` };
    }
  }
  return { valid: true };
}

function applyTahlil(
  record: AnketaResponseRecord,
  tahlil: Awaited<ReturnType<typeof runSurveyAnalysis>>["tahlil"],
  aiXato: string | null
): AnketaResponseRecord {
  return {
    ...record,
    riskFoizi: tahlil.riskFoizi,
    zona: tahlil.zona,
    klinikXulosa: tahlil.klinikXulosa,
    shaxsiyTavsiyalar: tahlil.shaxsiyTavsiyalar,
    tahlil,
    aiXato,
  };
}

export function registerSurveyRoutes(
  app: Express,
  requireAuth: (req: AuthedRequest, res: Response, next: () => void) => void,
  options?: { aiClient?: GoogleGenAI | null }
) {
  const aiClient = options?.aiClient ?? null;

  for (const kind of ["student", "pedagog"] as const) {
    const base = `/api/survey/${kind}`;

    app.get(`${base}/questions`, (_req, res) => {
      try {
        return res.json(loadSchema(kind));
      } catch (err) {
        console.error(`${kind} questions error:`, err);
        return res.status(500).json({ error: "So'rovnoma savollarini yuklashda xatolik." });
      }
    });

    app.post(`${base}/submit`, requireAuth, async (req: AuthedRequest, res) => {
      try {
        const actor = req.user!;
        const { answers, fish, lavozim, toldirilganSana, izoh } = req.body ?? {};

        if (!answers || typeof answers !== "object") {
          return res.status(400).json({ error: "answers maydoni talab qilinadi." });
        }

        const schema = loadSchema(kind);
        const validation = validateAnswers(schema, answers as Record<string, unknown>);
        if (!validation.valid) {
          return res.status(400).json({ error: validation.error });
        }

        const answeredCount = countAnswers(answers as Record<string, unknown>);
        let record: AnketaResponseRecord = {
          id: crypto.randomUUID(),
          userId: actor.id,
          version: schema.version,
          answers: answers as AnketaResponseRecord["answers"],
          fish: typeof fish === "string" ? fish.trim() : undefined,
          lavozim: typeof lavozim === "string" ? lavozim.trim() : undefined,
          toldirilganSana:
            typeof toldirilganSana === "string" ? toldirilganSana.trim() : undefined,
          izoh: typeof izoh === "string" ? izoh.trim() : undefined,
          answeredCount,
          yaratilganSana: new Date().toISOString(),
        };

        const { tahlil, aiXato } = await runSurveyAnalysis(
          kind,
          record.answers,
          schema,
          aiClient
        );
        record = applyTahlil(record, tahlil, aiXato);

        const responses = loadResponses(kind);
        responses.push(record);
        saveResponses(kind, responses);

        return res.status(201).json({
          message: `${SURVEY_CONFIG[kind].label} muvaffaqiyatli saqlandi`,
          response: record,
          tahlil,
        });
      } catch (err) {
        console.error(`${kind} submit error:`, err);
        return res.status(500).json({ error: "So'rovnomani saqlashda xatolik." });
      }
    });

    app.post(`${base}/responses/:id/analyze`, requireAuth, async (req: AuthedRequest, res) => {
      try {
        const actor = req.user!;
        const { id } = req.params;
        const responses = loadResponses(kind);
        const idx = responses.findIndex((r) => r.id === id);

        if (idx === -1) {
          return res.status(404).json({ error: "So'rovnoma javobi topilmadi." });
        }

        const record = responses[idx];
        if (actor.rol === "foydalanuvchi" && record.userId !== actor.id) {
          return res.status(403).json({ error: "Ruxsat yo'q." });
        }

        const schema = loadSchema(kind);
        const { tahlil, aiXato } = await runSurveyAnalysis(
          kind,
          record.answers,
          schema,
          aiClient
        );
        responses[idx] = applyTahlil(record, tahlil, aiXato);
        saveResponses(kind, responses);

        return res.json({
          message: "So'rovnoma qayta tahlil qilindi",
          response: responses[idx],
          tahlil,
        });
      } catch (err) {
        console.error(`${kind} re-analyze error:`, err);
        return res.status(500).json({ error: "Qayta tahlilda xatolik." });
      }
    });

    app.get(`${base}/my`, requireAuth, (req: AuthedRequest, res) => {
      try {
        const actor = req.user!;
        const responses = loadResponses(kind)
          .filter((r) => r.userId === actor.id)
          .sort((a, b) => b.yaratilganSana.localeCompare(a.yaratilganSana));
        return res.json({ responses });
      } catch (err) {
        console.error(`${kind} my error:`, err);
        return res.status(500).json({ error: "Javoblarni yuklashda xatolik." });
      }
    });

    app.get(
      `${base}/responses`,
      requireAuth,
      requireRoles("shifokor", "admin"),
      (_req, res) => {
        try {
          const responses = loadResponses(kind).sort((a, b) =>
            b.yaratilganSana.localeCompare(a.yaratilganSana)
          );
          return res.json({ responses });
        } catch (err) {
          console.error(`${kind} responses error:`, err);
          return res.status(500).json({ error: "Javoblarni yuklashda xatolik." });
        }
      }
    );
  }
}

export { isSurveyKind, SURVEY_CONFIG };
