import { t, type AppLanguage } from './lang';

/** Yuridik ogohlantirish matnlari (lotin yozuvida — kirillga t() orqali o'tkaziladi) */
export const DISCLAIMER_TEXTS = {
  title: "Muhim Ogohlantirish (Medical Disclaimer)",
  primary:
    "Mazkur tizim kardiologik xavflarni prognozlovchi yordamchi ilmiy portal bo'lib, yakuniy tashxis qo'yish shifokor nazorati ostida amalga oshirilishi shart.",
  extended:
    "Ushbu tizim klinik diagnostika kuchi bo'lgan shaxsiy vrach yoki kardiolog tavsiyalarini mutlaq o'rnini bosa olmaydi. Tavsiyalar faqat profilaktika, xavf kamaytirish va ilmiy dissertatsiya o'quv model mantiqlari doirasida beriladi. Sog'lig'ingiz yomonlashganda, ko'krak qisishining o'tkir bosqichida zudlik bilan shoshilinch tez tibbiy yordamga (103) murojaat qilishingiz shart.",
  diagnosticReport:
    "Ushbu kardiologik hisobot barcha skrining so'rovnomalari, simptomlar va shaxsiy o'lchov natijalarini to'plash orqali vizualizatsiya qilindi. Bu ma'lumotlar faqatgina davolovchi shifokoringizga birlamchi tashxis qo'yishda yordam berish maqsadida tuzildi. Mustaqil davolanish jarayonini boshlamaslik qat'iy so'raladi.",
  diagnosticReportTitle: "FOYDALANUVCHIGA DIAGNOSTIK BILDIRISHNOMA:",
  authNotice:
    "Tizimga kirish orqali siz quyidagi yuridik ogohlantirishni o'qib chiqdingiz va tushundingiz deb hisoblanasiz.",
} as const;

export function getDisclaimerTitle(lang: AppLanguage): string {
  return t(DISCLAIMER_TEXTS.title, lang);
}

export function getDisclaimerPrimary(lang: AppLanguage): string {
  return t(DISCLAIMER_TEXTS.primary, lang);
}

export function getDisclaimerExtended(lang: AppLanguage): string {
  return t(DISCLAIMER_TEXTS.extended, lang);
}

export function getDisclaimerDiagnostic(lang: AppLanguage): string {
  return t(DISCLAIMER_TEXTS.diagnosticReport, lang);
}

export function getDisclaimerFullText(lang: AppLanguage): string {
  return `${getDisclaimerPrimary(lang)} ${getDisclaimerExtended(lang)}`;
}

/** API / dinamik matnlarni (xulosa, maslahat) tanlangan tilga moslashtirish */
export function translateContent(text: string | null | undefined, lang: AppLanguage): string {
  return t(text, lang);
}
