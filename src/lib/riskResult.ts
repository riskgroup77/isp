import type { FactorImportance, RiskAnalysisResult } from '../types';

function normalizeFactor(
  raw: Partial<FactorImportance>,
  index = 0
): FactorImportance {
  const tasirKuchi = Number(raw.tasirKuchi);
  const nomiRaw = typeof raw.nomi === 'string' ? raw.nomi.trim() : '';
  const tafsilotRaw = typeof raw.tafsilot === 'string' ? raw.tafsilot.trim() : '';
  const nomi =
    nomiRaw ||
    (tafsilotRaw ? tafsilotRaw.slice(0, 80) : '') ||
    `Noma'lum omil (${index + 1})`;
  return {
    nomi,
    tafsilot: tafsilotRaw || nomiRaw,
    tasirKuchi: Number.isFinite(tasirKuchi) ? tasirKuchi : 0,
    boshqariladimi: raw.boshqariladimi ?? false,
  };
}

const EMPTY_RISK: RiskAnalysisResult = {
  tmi: 0,
  tmiKategoriya: "Noma'lum",
  riskFoizi: 0,
  zona: 'sariq',
  hududiyStatistika: {
    hududXavfi: 0,
    populyatsiyaEtalonBosim: '—',
    tavsiyaEtilganSkriningKuni: '—',
  },
  faktorlar: [],
  shaxsiyTavsiyalar: {
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
  },
  klinikXulosa: '',
};

/** API yoki arxivdan kelgan qisman risk natijasini UI uchun to'ldiradi */
export function normalizeRiskResult(
  raw: Partial<RiskAnalysisResult> | null | undefined
): RiskAnalysisResult {
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY_RISK };
  }

  const shaxsiy = raw.shaxsiyTavsiyalar;
  const komplayens = shaxsiy?.komplayensTahlili;

  return {
    ...EMPTY_RISK,
    ...raw,
    tmi: raw.tmi ?? EMPTY_RISK.tmi,
    tmiKategoriya: raw.tmiKategoriya ?? EMPTY_RISK.tmiKategoriya,
    riskFoizi: raw.riskFoizi ?? EMPTY_RISK.riskFoizi,
    zona: raw.zona ?? EMPTY_RISK.zona,
    klinikXulosa: raw.klinikXulosa ?? EMPTY_RISK.klinikXulosa,
    hududiyStatistika: {
      ...EMPTY_RISK.hududiyStatistika,
      ...raw.hududiyStatistika,
    },
    faktorlar: Array.isArray(raw.faktorlar)
      ? raw.faktorlar.map((f, index) =>
          normalizeFactor(f as Partial<FactorImportance>, index)
        )
      : [],
    shaxsiyTavsiyalar: {
      kritikOmillar: shaxsiy?.kritikOmillar ?? [],
      ovqatlanish: shaxsiy?.ovqatlanish ?? [],
      jismoniyMashq: shaxsiy?.jismoniyMashq ?? [],
      tibbiyReja: shaxsiy?.tibbiyReja ?? [],
      kutilayotganEffekt: shaxsiy?.kutilayotganEffekt ?? [],
      komplayensTahlili: {
        daraja: komplayens?.daraja ?? '',
        nomutanosiblikKuzatildimi: komplayens?.nomutanosiblikKuzatildimi ?? false,
        maslahat: komplayens?.maslahat ?? '',
      },
    },
  };
}
