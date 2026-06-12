export interface QuestionnaireData {
  yosh: number;
  jins: 'erkak' | 'ayol';
  boy: number; // cm
  vazn: number; // kg
  sistolik: number; // mmHg
  diastolik: number; // mmHg
  glyukoza: number | ''; // mmol/l
  xolesterin: number | ''; // mmol/l
  tuzIstemi: 'past' | 'ortacha' | 'yuqori';
  shakarVaXamir: 'kam' | 'ortacha' | 'kop';
  sabzavotMeva: 'har_kuni' | 'kam_yoki_yoq';
  jismoniyFaollik: 'kam' | 'ortacha' | 'yuqori';
  chekish: 'yoq' | 'chekar_edi' | 'ha';
  nosvoy: 'yoq' | 'ha';
  oiladaKasallik: string[]; // ['gipertoniya', 'diabet', 'yurak_xastaligi', 'insult']
  tibbiyotXodimi: boolean;
  nazariyBilimDarajasi: 'past' | 'yaxshi' | 'mukammal';
  realKomplayens: 'yaxshi' | 'ortacha' | 'past';
  shaharTuman: string; // Fergana Valley regions: Farg'ona shahri, Marg'ilon, Qo'qon, Quva, Rishton, Oltiariq, etc.
  erkinShikoyat?: string; // AI erkin shikoyat qismi
}

export interface FactorImportance {
  nomi: string;
  tafsilot: string;
  tasirKuchi: number; // 0 to 10
  boshqariladimi: boolean;
}

export interface RiskBenefit {
  ozgarish: string;
  kamayadiganXavf: number; // e.g. 12%
}

export interface RiskAnalysisResult {
  tmi: number;
  tmiKategoriya: string;
  riskFoizi: number; // 0 to 100
  zona: 'yashil' | 'sariq' | 'qizil';
  hududiyStatistika: {
    hududXavfi: number;
    populyatsiyaEtalonBosim: string;
    tavsiyaEtilganSkriningKuni: string;
  };
  faktorlar: FactorImportance[];
  shaxsiyTavsiyalar: {
    kritikOmillar: string[];
    ovqatlanish: string[];
    jismoniyMashq: string[];
    tibbiyReja: string[];
    kutilayotganEffekt: RiskBenefit[];
    komplayensTahlili: {
      daraja: string;
      nomutanosiblikKuzatildimi: boolean;
      maslahat: string;
    };
  };
  klinikXulosa: string;
}

export interface TextAnalysisResponse {
  muvaffaqiyatli: boolean;
  aniqlanganParametrlar: Partial<QuestionnaireData>;
  tahlilMatni: string;
  tavsiyalar: string[];
  yanaMalumotKerakmi: boolean;
  aniqlashtiruvchiSavollar: string[];
}

export interface HealthJournalEntry {
  id: string;
  sana: string; // FORMAT: "YYYY-MM-DD" or formatted
  vaqt: string; // FORMAT: "HH:MM"
  sistolik: number;
  diastolik: number;
  puls: number;
  glyukoza: number | '';
  vazn: number | '';
  uyqu: 'yaxshi' | 'ortacha' | 'yomon';
  stress: 'past' | 'ortacha' | 'yuqori';
  alomatlar: string[]; // ['ogriq', 'nafas_qisilishi', 'bosh_aylanishi', 'yurak_oynashi', 'shishlar', 'holsizlik']
  dorilar: { nomi: string; doza: string; ichildi: boolean }[];
  qaydlar: string;
}

export type UserRole = 'admin' | 'shifokor' | 'foydalanuvchi';

export interface ScreeningHistoryEntry {
  id?: string;
  riskResult: RiskAnalysisResult;
  data: QuestionnaireData;
  sana: string;
}

export interface UserProfile {
  id: string;
  login: string;
  parol: string; // Plaintext for simulation/demo simplicity
  ism: string;
  rol: UserRole;
  yaratilganSana: string;
  // Patient fields (foydalanuvchi)
  shaharTuman?: string;
  yosh?: number;
  jins?: 'erkak' | 'ayol';
  boy?: number;
  vazn?: number;
  soglik_skrining_tarixi?: ScreeningHistoryEntry[];
  soglik_kundaligi?: HealthJournalEntry[];
  // Doctor fields (shifokor)
  mutaxassislik?: string;
  shifoxona?: string;
  tasdiqlangan?: boolean; // verified state
}

export interface PatientAdvice {
  id: string;
  bemorId: string;
  shifokorId: string;
  shifokorIsm: string;
  shifokorMutaxassislik: string;
  matn: string;
  sana: string;
  vaqt: string;
}

export interface MedicationAlarm {
  id: string;
  nomi: string;
  doza: string;
  vaqt: string; // "HH:MM" format
  faol: boolean;
  ichildiBugun: boolean;
  oxirgiIchilganSana?: string; // "YYYY-MM-DD" comparison
}


