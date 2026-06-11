/**
 * O'zbek lotin → kirill transliteratsiya (1995 yilgi lotin alifbosi qoidalariga asoslangan)
 * Matn bo'lagicha ishlaydi: so'zlar, raqamlar, belgilar va inglizcha atamalar ajratiladi.
 */

export type AppLanguage = 'lotin' | 'kirill';

/** Turli apostrof belgilarini standart tutuq (') ga birlashtirish */
const APOSTROPHE_PATTERN = /[ʻʼ''`‘’]/g;

/** To'liq moslik uchun qo'lda tekshirilgan lug'at (UI va tibbiy atamalar) */
const LATIN_TO_CYRILLIC_DIRECT_MAP: Record<string, string> = {
  Shifokor: "Шифокор",
  shifokor: "шифокор",
  Bemor: "Бемор",
  bemor: "бемор",
  Admin: "Админ",
  admin: "админ",
  Chiqish: "Чиқиш",
  chiqish: "чиқиш",
  Kirish: "Кириш",
  kirish: "кириш",
  Tasdiqlash: "Тасдиқлаш",
  tasdiqlash: "тасдиқлаш",
  Sana: "Сана",
  sana: "сана",
  Vaqt: "Вақт",
  vaqt: "вақт",
  Yosh: "Ёш",
  yosh: "ёш",
  Jinsi: "Жинси",
  jinsi: "жинси",
  "Bo'yi": "Бўйи",
  "bo'yi": "бўйи",
  Vazni: "Вазни",
  vazni: "вазни",
  Puls: "Пульс",
  puls: "пульс",
  Erkak: "Эркак",
  erkak: "эркак",
  Ayol: "Аёл",
  ayol: "аёл",
  Ha: "Ҳа",
  ha: "ҳа",
  "Yo'q": "Йўқ",
  "yo'q": "йўқ",
  yoq: "йўқ",
  Yoq: "Йўқ",
  Lotin: "Лотин",
  "Farg'ona shahri": "Фарғона шаҳри",
  "Farg'ona vodiysi": "Фарғона водийси",
  "Marg'ilon shahri": "Марғилон шаҳри",
  "Qo'qon shahri": "Қўқон шаҳри",
  "Quvasoy shahri": "Қувасой шаҳри",
  "Farg'ona tumani": "Фарғона тумани",
  "Quva tumani": "Қува тумани",
  "Rishton tumani": "Риштон тумани",
  "Oltiariq tumani": "Олтиариқ тумани",
  "Beshariq tumani": "Бешариқ тумани",
  "Bag'dod tumani": "Бағдод тумани",
  "Buvayda tumani": "Бувайда тумани",
  "Dang'ara tumani": "Данғара тумани",
  "Uchko'prik tumani": "Учкўпirik тумани",
  "Toshloq tumani": "Тошлоқ тумани",
  "Yozyovon tumani": "Ёзёвон тумани",
  vrach: "врач",
  Vrach: "Врач",
  klinik: "клиник",
  diagnostika: "диагностика",
  Dissertatsiya: "Диссертация",
  dissertatsiya: "диссертация",
  Gipertoniya: "Гипертония",
  gipertoniya: "гипертония",
  komplayens: "комплайенс",
  Komplayens: "Комплайенс",
  Salomatlik: "Саломатлик",
  salomatlik: "саломатлик",
  Skriningi: "Скрининги",
  skriningi: "скрининги",
  Kardiologik: "Кардиологик",
  kardiologik: "кардиологик",
  Intellektual: "Интеллектуал",
  intellektual: "интеллектуал",
  Platformasi: "Платформаси",
  platformasi: "платформаси",
  Ogohlantirish: "Огоҳлантириш",
  ogohlantirish: "огоҳлантириш",
  Maslahati: "Маслаҳати",
  maslahati: "маслаҳати",
  Shifokorlar: "Шифокорлар",
  shifokorlar: "шифокорлар",
  nosvoy: "носвой",
  Nosvoy: "Носвой",
  prognozlovchi: "прогнозловчи",
  prognozlash: "прогнозлаш",
  Noinfeksion: "Ноинфексион",
  noinfeksion: "ноинфексион",
  Intellekt: "Интеллект",
  intellekt: "интеллект",
  "Sun'iy": "Сунъий",
  "sun'iy": "сунъий",
  mmHg: "mmHg",
  PDF: "PDF",
  CSV: "CSV",
  Online: "Online",
  ONLINE: "ONLINE",
  AKTIV: "AKTIV",
};

/** Inglizcha / texnik atamalar — kirillga o'tkazilmaydi */
const PRESERVE_LATIN_WORDS = new Set([
  "medical",
  "disclaimer",
  "pdf",
  "csv",
  "online",
  "aktiv",
  "demo",
  "id",
  "mmhg",
  "sys",
  "dia",
  "pul",
  "api",
  "admin",
  "system",
  "login",
  "parol",
  "mmol",
  "bpm",
  "kg",
  "mg",
  "ml",
  "dr",
  "ok",
  "n/a",
  "na",
]);

const SINGLE_CHAR_MAP: Record<string, string> = {
  a: "а",
  b: "б",
  c: "с", // rus/o'zbekcha o'gma so'zlarda (masalan: vrach → врач)
  d: "д",
  e: "е",
  f: "ф",
  g: "г",
  h: "ҳ",
  i: "и",
  j: "ж",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  q: "қ",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  v: "в",
  w: "в",
  x: "х",
  y: "й",
  z: "з",
};

function normalizeApostrophes(text: string): string {
  return text.replace(APOSTROPHE_PATTERN, "'");
}

function shouldPreserveWord(word: string): boolean {
  if (!word) return true;
  if (/^\d+([.,]\d+)?%?$/.test(word)) return true;
  if (/^[\d./\-:+]+$/.test(word)) return true;
  const lower = word.toLowerCase();
  if (PRESERVE_LATIN_WORDS.has(lower)) return true;
  // Qisqa texnik kodlar (masalan: SYS, DIA)
  if (word.length <= 4 && word === word.toUpperCase() && /^[A-Z]+$/.test(word)) {
    return true;
  }
  return false;
}

function applyCasePattern(original: string, transliterated: string): string {
  if (!transliterated) return transliterated;
  if (
    original === original.toUpperCase() &&
    original !== original.toLowerCase()
  ) {
    return transliterated.toUpperCase();
  }
  if (
    original.length > 1 &&
    original[0] === original[0].toUpperCase() &&
    original.slice(1) === original.slice(1).toLowerCase()
  ) {
    return (
      transliterated[0].toUpperCase() + transliterated.slice(1)
    );
  }
  return transliterated;
}

/**
 * Bitta lotin so'zni kirillga o'giradi (1995 lotin alifbosi qoidalari).
 */
function transliterateWord(word: string): string {
  if (!word || shouldPreserveWord(word)) return word;

  const direct = LATIN_TO_CYRILLIC_DIRECT_MAP[word];
  if (direct) return direct;

  const lowerDirect = LATIN_TO_CYRILLIC_DIRECT_MAP[word.toLowerCase()];
  if (lowerDirect) {
    return applyCasePattern(word, lowerDirect);
  }

  let w = normalizeApostrophes(word).toLowerCase();

  // So'z boshidagi maxsus birikmalar (eng uzunlari birinchi)
  const wordStartRules: [RegExp, string][] = [
    [/^yo'q/, "йўқ"],
    [/^yo'l/, "йўл"],
    [/^yo'n/, "йўн"],
    [/^yo'g/, "йўғ"],
    [/^e'/, "эъ"], // e'tibor → эътибор, e'lon → эълон
    [/^yu/, "ю"],
    [/^ya/, "я"],
    [/^yo/, "йо"],
    [/^ye/, "е"],
  ];
  for (const [pattern, replacement] of wordStartRules) {
    w = w.replace(pattern, replacement);
  }

  // Umumiy digraflar (uzunlari birinchi — tartib muhim)
  const digraphRules: [string, string][] = [
    ["sch", "щ"],
    ["sh", "ш"],
    ["ch", "ч"],
    ["ng", "нг"],
    ["atsiya", "ация"],
    ["otsiya", "оция"],
    ["utsiya", "уция"],
    ["tsiya", "ция"],
    ["siya", "сия"],
    ["logiya", "логия"],
    ["ologiya", "ология"],
    ["g'", "ғ"],
    ["o'", "ў"],
    ["ts", "ц"],
  ];
  for (const [latin, cyrillic] of digraphRules) {
    w = w.split(latin).join(cyrillic);
  }

  // Tutuq belgisi (ъ) — o'/g' allaqachon almashtirilgan
  w = w.replace(/'/g, "ъ");

  let result = "";
  for (const char of w) {
    result += SINGLE_CHAR_MAP[char] ?? char;
  }

  return applyCasePattern(word, result);
}

/**
 * Butun matnni lotindan kirillga o'giradi. Bo'shliq, tinish belgilari va
 * raqamlar saqlanadi; har bir lotin so'z alohida qayta ishlanadi.
 */
export function latinToCyrillic(text: string): string {
  if (!text) return text;

  // Butun matn uchun to'g'ridan-to'g'ri lug'atdagi iboralar
  if (LATIN_TO_CYRILLIC_DIRECT_MAP[text]) {
    return LATIN_TO_CYRILLIC_DIRECT_MAP[text];
  }

  // Lotin harflari, apostrof va defisdan tashkil topgan so'zlar
  const tokenPattern = /[A-Za-z][A-Za-z''ʻ`‘’\-]*|[^A-Za-z]+/g;
  const parts = text.match(tokenPattern);
  if (!parts) return text;

  return parts
    .map((part) => {
      if (/^[A-Za-z]/.test(part)) {
        return transliterateWord(part);
      }
      return part;
    })
    .join("");
}

/**
 * Tanlangan tilga mos matn qaytaradi.
 */
export function t(text: string | null | undefined, currentLang: AppLanguage): string {
  if (!text) return "";
  if (currentLang === "lotin") return text;
  return latinToCyrillic(text);
}
