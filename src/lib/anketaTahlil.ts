import type { AnketaTahlil, AnketaResponseRecord, FactorImportance } from '../types';

const EMPTY_SHAXSIY: AnketaTahlil['shaxsiyTavsiyalar'] = {
  kritikOmillar: [],
  ovqatlanish: [],
  jismoniyMashq: [],
  tibbiyReja: [],
  kutilayotganEffekt: [],
  komplayensTahlili: {
    daraja: '',
    nomutanosiblikKuzatildimi: false,
    maslahat: '',
  },
};

function asArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? val : [];
}

function normalizeZona(zona: unknown): AnketaTahlil['zona'] {
  if (zona === 'yashil' || zona === 'sariq' || zona === 'qizil') return zona;
  return 'sariq';
}

function normalizeFaktorlar(raw: unknown): FactorImportance[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f) => f && typeof f === 'object')
    .map((f, index) => {
      const item = f as Partial<FactorImportance>;
      const tasirKuchi = Number(item.tasirKuchi);
      const nomiRaw = typeof item.nomi === 'string' ? item.nomi.trim() : '';
      const tafsilotRaw = typeof item.tafsilot === 'string' ? item.tafsilot.trim() : '';
      const nomi =
        nomiRaw ||
        (tafsilotRaw ? tafsilotRaw.slice(0, 80) : '') ||
        `Noma'lum omil (${index + 1})`;
      return {
        nomi,
        tafsilot: tafsilotRaw || nomiRaw,
        tasirKuchi: Number.isFinite(tasirKuchi) ? tasirKuchi : 0,
        boshqariladimi: item.boshqariladimi ?? false,
      };
    });
}

function toStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map((item) => String(item)).filter(Boolean);
  if (typeof val === 'string' && val.trim()) return [val.trim()];
  return [];
}

function normalizeShaxsiy(raw: unknown): AnketaTahlil['shaxsiyTavsiyalar'] {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_SHAXSIY };

  const s = raw as Record<string, unknown>;
  const komplayens =
    s.komplayensTahlili && typeof s.komplayensTahlili === 'object'
      ? (s.komplayensTahlili as Record<string, unknown>)
      : null;

  return {
    kritikOmillar: toStringArray(s.kritikOmillar),
    ovqatlanish: toStringArray(s.ovqatlanish),
    jismoniyMashq: toStringArray(s.jismoniyMashq),
    tibbiyReja: toStringArray(s.tibbiyReja),
    kutilayotganEffekt: asArray<{ ozgarish: string; kamayadiganXavf: number }>(
      s.kutilayotganEffekt
    ),
    komplayensTahlili: {
      daraja: typeof komplayens?.daraja === 'string' ? komplayens.daraja : '',
      nomutanosiblikKuzatildimi: Boolean(komplayens?.nomutanosiblikKuzatildimi),
      maslahat: typeof komplayens?.maslahat === 'string' ? komplayens.maslahat : '',
    },
  };
}

/** API dan kelgan qisman yoki turli formatdagi tahlilni UI uchun xavfsiz qiladi */
export function normalizeAnketaTahlil(
  raw: Partial<AnketaTahlil> | null | undefined
): AnketaTahlil | null {
  if (!raw || typeof raw !== 'object') return null;

  const riskFoizi = Number(raw.riskFoizi);
  if (!Number.isFinite(riskFoizi)) return null;

  return {
    riskFoizi,
    zona: normalizeZona(raw.zona),
    tmi: typeof raw.tmi === 'number' ? raw.tmi : undefined,
    tmiKategoriya: typeof raw.tmiKategoriya === 'string' ? raw.tmiKategoriya : undefined,
    faktorlar: normalizeFaktorlar(raw.faktorlar),
    shaxsiyTavsiyalar: normalizeShaxsiy(raw.shaxsiyTavsiyalar),
    klinikXulosa: typeof raw.klinikXulosa === 'string' ? raw.klinikXulosa : '',
    answeredSignals:
      raw.answeredSignals && typeof raw.answeredSignals === 'object'
        ? raw.answeredSignals
        : undefined,
  };
}

/** Submit javobidan tahlil obyektini ajratib, normalizatsiya qiladi */
export function extractTahlilFromSubmit(
  tahlil: Partial<AnketaTahlil> | null | undefined,
  response?: Partial<AnketaResponseRecord>
): AnketaTahlil | null {
  const fromTahlil = normalizeAnketaTahlil(tahlil);
  if (fromTahlil) return fromTahlil;

  if (!response) return null;

  return normalizeAnketaTahlil({
    riskFoizi: response.riskFoizi ?? response.tahlil?.riskFoizi,
    zona: response.zona ?? response.tahlil?.zona,
    tmi: response.tahlil?.tmi,
    tmiKategoriya: response.tahlil?.tmiKategoriya,
    faktorlar: response.tahlil?.faktorlar,
    klinikXulosa: response.klinikXulosa ?? response.tahlil?.klinikXulosa,
    shaxsiyTavsiyalar: response.shaxsiyTavsiyalar ?? response.tahlil?.shaxsiyTavsiyalar,
    answeredSignals: response.tahlil?.answeredSignals,
  });
}
