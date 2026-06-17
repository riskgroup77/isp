import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { Express, Response } from "express";
import type { GoogleGenAI } from "@google/genai";
import type { AuthedRequest } from "./auth";
import { requireRoles } from "./auth";
import type { AnketaResponseRecord, AnketaSchema } from "../src/types";
import { runAnketaAnalysis } from "./anketaAnalysis";

const DATA_DIR = path.join(process.cwd(), "data");
const ANKETA_FILE = path.join(DATA_DIR, "anketa_2025.json");
const RESPONSES_FILE = path.join(DATA_DIR, "anketa_responses.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadAnketaSchema(): AnketaSchema {
  ensureDataDir();
  if (!fs.existsSync(ANKETA_FILE)) {
    throw new Error("Anketa savollar fayli topilmadi (data/anketa_2025.json).");
  }
  const raw = JSON.parse(fs.readFileSync(ANKETA_FILE, "utf8")) as AnketaSchema;
  if (!Array.isArray(raw.questions)) {
    throw new Error("Anketa savollar formati noto'g'ri.");
  }
  return {
    ...raw,
    totalQuestions: raw.totalQuestions ?? raw.questions.length,
  };
}

function loadResponses(): AnketaResponseRecord[] {
  ensureDataDir();
  if (!fs.existsSync(RESPONSES_FILE)) {
    return [];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(RESPONSES_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveResponses(responses: AnketaResponseRecord[]) {
  ensureDataDir();
  fs.writeFileSync(RESPONSES_FILE, JSON.stringify(responses, null, 2), "utf8");
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

function applyTahlilToRecord(
  record: AnketaResponseRecord,
  tahlil: Awaited<ReturnType<typeof runAnketaAnalysis>>["tahlil"],
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

export function registerAnketaRoutes(
  app: Express,
  requireAuth: (req: AuthedRequest, res: Response, next: () => void) => void,
  options?: { aiClient?: GoogleGenAI | null }
) {
  const aiClient = options?.aiClient ?? null;

  app.get("/api/anketa/questions", (_req, res) => {
    try {
      const schema = loadAnketaSchema();
      return res.json(schema);
    } catch (err) {
      console.error("Anketa questions error:", err);
      return res.status(500).json({ error: "Anketa savollarini yuklashda xatolik." });
    }
  });

  app.post("/api/anketa/submit", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const actor = req.user!;
      const { answers, fish, lavozim, toldirilganSana, izoh } = req.body ?? {};

      if (!answers || typeof answers !== "object") {
        return res.status(400).json({ error: "answers maydoni talab qilinadi." });
      }

      const schema = loadAnketaSchema();
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

      const { tahlil, aiXato } = await runAnketaAnalysis(
        record.answers,
        schema,
        aiClient
      );
      record = applyTahlilToRecord(record, tahlil, aiXato);

      const responses = loadResponses();
      responses.push(record);
      saveResponses(responses);

      return res.status(201).json({
        message: "Anketa muvaffaqiyatli saqlandi",
        response: record,
        tahlil,
      });
    } catch (err) {
      console.error("Anketa submit error:", err);
      return res.status(500).json({ error: "Anketani saqlashda xatolik." });
    }
  });

  app.post("/api/anketa/responses/:id/analyze", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const actor = req.user!;
      const { id } = req.params;
      const responses = loadResponses();
      const idx = responses.findIndex((r) => r.id === id);

      if (idx === -1) {
        return res.status(404).json({ error: "Anketa javobi topilmadi." });
      }

      const record = responses[idx];
      if (actor.rol === "foydalanuvchi" && record.userId !== actor.id) {
        return res.status(403).json({ error: "Ruxsat yo'q." });
      }

      const schema = loadAnketaSchema();
      const { tahlil, aiXato } = await runAnketaAnalysis(record.answers, schema, aiClient);
      responses[idx] = applyTahlilToRecord(record, tahlil, aiXato);
      saveResponses(responses);

      return res.json({
        message: "Anketa qayta tahlil qilindi",
        response: responses[idx],
        tahlil,
      });
    } catch (err) {
      console.error("Anketa re-analyze error:", err);
      return res.status(500).json({ error: "Qayta tahlilda xatolik." });
    }
  });

  app.get("/api/anketa/my", requireAuth, (req: AuthedRequest, res) => {
    try {
      const actor = req.user!;
      const responses = loadResponses()
        .filter((r) => r.userId === actor.id)
        .sort((a, b) => b.yaratilganSana.localeCompare(a.yaratilganSana));
      return res.json({ responses });
    } catch (err) {
      console.error("Anketa my error:", err);
      return res.status(500).json({ error: "Anketa javoblarini yuklashda xatolik." });
    }
  });

  app.get(
    "/api/anketa/responses",
    requireAuth,
    requireRoles("shifokor", "admin"),
    (_req, res) => {
      try {
        const responses = loadResponses().sort((a, b) =>
          b.yaratilganSana.localeCompare(a.yaratilganSana)
        );
        return res.json({ responses });
      } catch (err) {
        console.error("Anketa responses error:", err);
        return res.status(500).json({ error: "Anketa javoblarini yuklashda xatolik." });
      }
    }
  );

  app.get("/api/anketa/responses/:id", requireAuth, (req: AuthedRequest, res) => {
    try {
      const actor = req.user!;
      const { id } = req.params;
      const record = loadResponses().find((r) => r.id === id);

      if (!record) {
        return res.status(404).json({ error: "Anketa javobi topilmadi." });
      }

      if (actor.rol === "foydalanuvchi" && record.userId !== actor.id) {
        return res.status(403).json({ error: "Ushbu anketa javobini ko'rishga ruxsat yo'q." });
      }

      return res.json({ response: record });
    } catch (err) {
      console.error("Anketa response detail error:", err);
      return res.status(500).json({ error: "Anketa tafsilotini yuklashda xatolik." });
    }
  });

  app.delete("/api/anketa/responses/:id", requireAuth, (req: AuthedRequest, res) => {
    try {
      const actor = req.user!;
      const { id } = req.params;
      const responses = loadResponses();
      const idx = responses.findIndex((r) => r.id === id);

      if (idx === -1) {
        return res.status(404).json({ error: "Anketa javobi topilmadi." });
      }

      const record = responses[idx];
      const canDelete =
        actor.rol === "admin" ||
        (actor.rol === "foydalanuvchi" && record.userId === actor.id);

      if (!canDelete) {
        return res.status(403).json({ error: "O'chirishga ruxsat yo'q." });
      }

      responses.splice(idx, 1);
      saveResponses(responses);
      return res.json({ success: true, message: "Anketa javobi o'chirildi." });
    } catch (err) {
      console.error("Anketa delete error:", err);
      return res.status(500).json({ error: "Anketani o'chirishda xatolik." });
    }
  });
}
