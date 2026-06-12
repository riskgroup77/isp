import type { RiskAnalysisResult } from '../types';

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
    faktorlar: Array.isArray(raw.faktorlar) ? raw.faktorlar : [],
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
