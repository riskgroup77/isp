import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { Request, Response, NextFunction } from "express";
import type { UserProfile, UserRole } from "../src/types";

const DATA_DIR = path.join(process.cwd(), "data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

export type SafeUser = Omit<UserProfile, "parol">;

interface SessionRecord {
  userId: string;
  createdAt: number;
}

let sessions: Record<string, SessionRecord> = {};

function loadSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf8"));
    }
  } catch {
    sessions = {};
  }
}

function saveSessions() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save sessions:", err);
  }
}

loadSessions();

export function sanitizeUser(user: UserProfile): SafeUser {
  const { parol: _p, ...safe } = user;
  return safe;
}

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  sessions[token] = { userId, createdAt: Date.now() };
  saveSessions();
  return token;
}

export function destroySession(token: string) {
  delete sessions[token];
  saveSessions();
}

export function getUserIdFromToken(token: string): string | null {
  const session = sessions[token];
  return session?.userId ?? null;
}

export interface AuthedRequest extends Request {
  user?: UserProfile;
}

export function authMiddleware(
  getUsers: () => UserProfile[]
) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Tizimga kirish talab qilinadi." });
    }
    const token = header.slice(7).trim();
    const userId = getUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Session muddati tugagan. Qayta kiring." });
    }
    const user = getUsers().find((u) => u.id === userId);
    if (!user) {
      destroySession(token);
      return res.status(401).json({ error: "Foydalanuvchi topilmadi." });
    }
    req.user = user;
    next();
  };
}

export function requireRoles(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ error: "Ushbu amal uchun ruxsat yo'q." });
    }
    next();
  };
}

/** Parolni hash qilish (bcryptsiz — Node crypto scrypt, qo'shimcha dependency yo'q) */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (stored.startsWith("scrypt:")) {
    const [, salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const derived = crypto.scryptSync(password, salt, 64).toString("hex");
    return derived === hash;
  }
  // Eski plain-text (migratsiya davri)
  return stored === password;
}

export function migratePlainPasswords(users: UserProfile[]): boolean {
  let changed = false;
  for (const user of users) {
    if (user.parol && !user.parol.startsWith("scrypt:")) {
      user.parol = hashPassword(user.parol);
      changed = true;
    }
  }
  return changed;
}
