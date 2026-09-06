import type {
  AnimalStatus,
  CalvingDifficulty,
  CategoryCode,
  Gender,
  InseminationResult,
  Origin,
} from "./types.js";

/** Bug'ozlik muddati (kun) */
export const GESTATION_DAYS = 283;

export interface CategoryMeta {
  code: CategoryCode;
  name: string;
  short: string;
  emoji: string;
  order: number;
  isMilking: boolean;
  isPregnant: boolean;
  isYoung: boolean;
}

export const CATEGORIES: CategoryMeta[] = [
  { code: "sut_buzoq",                   name: "Sut buzoq",                                   short: "Sut buzoq",        emoji: "🍼", order: 10, isMilking: false, isPregnant: false, isYoung: true },
  { code: "bugoz_bolmagan_tana",         name: "Bug'oz bo'lmagan tana",                       short: "B/o tana",         emoji: "⚪", order: 20, isMilking: false, isPregnant: false, isYoung: true },
  { code: "urugli_tekshirilmagan_tana",  name: "Urug' quyilgan, tekshirilmagan tana",         short: "Tekshiruvda tana", emoji: "🟡", order: 30, isMilking: false, isPregnant: false, isYoung: true },
  { code: "bugoz_tana",                  name: "Bug'oz tana",                                 short: "Bug'oz tana",      emoji: "🟢", order: 40, isMilking: false, isPregnant: true,  isYoung: true },
  { code: "qisir_tana",                  name: "Qisir tana",                                  short: "Qisir tana",       emoji: "🔴", order: 50, isMilking: false, isPregnant: false, isYoung: true },
  { code: "urugli_tekshirilmagan_sigir", name: "Urug' quyilgan, tekshirilmagan sutli sigir",  short: "Tekshiruvda sigir",emoji: "🟠", order: 60, isMilking: true,  isPregnant: false, isYoung: false },
  { code: "sut_bugoz_sigir",             name: "Sut beradigan bug'oz sigir",                  short: "Sutli bug'oz",     emoji: "💚", order: 70, isMilking: true,  isPregnant: true,  isYoung: false },
  { code: "sut_qisir_sigir",             name: "Sut beradigan qisir sigir",                   short: "Sutli qisir",      emoji: "❤️", order: 80, isMilking: true,  isPregnant: false, isYoung: false },
  { code: "sutsiz_bugoz_sigir",          name: "Sut bermaydigan bug'oz sigir",                short: "Qovog'i (tinim)",  emoji: "🟣", order: 90, isMilking: false, isPregnant: true,  isYoung: false },
];

const MAP = new Map(CATEGORIES.map((c) => [c.code, c]));

export function categoryMeta(code: string | null | undefined): CategoryMeta {
  return (
    MAP.get(code as CategoryCode) ?? {
      code: "bugoz_bolmagan_tana",
      name: code ?? "Noma'lum",
      short: code ?? "—",
      emoji: "⚫",
      order: 999,
      isMilking: false,
      isPregnant: false,
      isYoung: false,
    }
  );
}

/** Mantiqiy o'tishlar — tavsiya sifatida ko'rsatiladi */
export const SUGGESTED_TRANSITIONS: Record<CategoryCode, CategoryCode[]> = {
  sut_buzoq: ["bugoz_bolmagan_tana"],
  bugoz_bolmagan_tana: ["urugli_tekshirilmagan_tana"],
  urugli_tekshirilmagan_tana: ["bugoz_tana", "qisir_tana", "bugoz_bolmagan_tana"],
  bugoz_tana: ["urugli_tekshirilmagan_sigir", "sut_qisir_sigir", "bugoz_bolmagan_tana"],
  qisir_tana: ["urugli_tekshirilmagan_tana", "bugoz_bolmagan_tana"],
  urugli_tekshirilmagan_sigir: ["sut_bugoz_sigir", "sut_qisir_sigir"],
  sut_bugoz_sigir: ["sutsiz_bugoz_sigir", "sut_qisir_sigir"],
  sut_qisir_sigir: ["urugli_tekshirilmagan_sigir"],
  sutsiz_bugoz_sigir: ["sut_bugoz_sigir", "urugli_tekshirilmagan_sigir"],
};

export const STATUS_LABELS: Record<AnimalStatus, string> = {
  faol: "Fermada",
  sotilgan: "Sotilgan",
  olgan: "O'lgan",
  suyilgan: "So'yilgan",
};

export const GENDER_LABELS: Record<Gender, string> = {
  urgochi: "Urg'ochi",
  erkak: "Erkak",
};

export const ORIGIN_LABELS: Record<Origin, string> = {
  fermada_tugilgan: "Fermada tug'ilgan",
  sotib_olingan: "Sotib olingan",
};

export const INSEMINATION_RESULT_LABELS: Record<InseminationResult, string> = {
  tekshirilmagan: "Tekshirilmagan",
  bugoz: "Bug'oz",
  bugoz_emas: "Bug'oz emas",
  bola_tashladi: "Bola tashladi",
};

export const DIFFICULTY_LABELS: Record<CalvingDifficulty, string> = {
  oson: "Oson",
  ortacha: "O'rtacha",
  ogir: "Og'ir",
  kesar: "Kesar (operatsiya)",
  olik_tugildi: "O'lik tug'ildi",
};

/* ---------------- Turlar orasidagi avtomatik o'tish qoidalari ------------- */

/** Urug' quyilgandan keyin */
export function afterInsemination(current: CategoryCode): CategoryCode | null {
  const meta = MAP.get(current);
  if (!meta || current === "sut_buzoq") return null;
  if (meta.isMilking) return "urugli_tekshirilmagan_sigir";
  if (meta.isYoung) return "urugli_tekshirilmagan_tana";
  return null;
}

/** Bug'ozlik tekshiruvidan keyin */
export function afterPregnancyCheck(
  current: CategoryCode,
  result: InseminationResult,
  attemptCount: number,
): CategoryCode | null {
  const meta = MAP.get(current);
  if (!meta) return null;
  const isCow = meta.isMilking || current === "sutsiz_bugoz_sigir";

  if (result === "bugoz") return isCow ? "sut_bugoz_sigir" : "bugoz_tana";
  if (result === "bugoz_emas" || result === "bola_tashladi") {
    if (isCow) return "sut_qisir_sigir";
    return attemptCount >= 2 ? "qisir_tana" : "bugoz_bolmagan_tana";
  }
  return null;
}

/** Tug'gandan keyin */
export function afterCalving(current: CategoryCode): CategoryCode | null {
  return current === "sut_buzoq" ? null : "sut_qisir_sigir";
}
