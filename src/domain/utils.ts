import { GESTATION_DAYS } from "./constants.js";

/* ------------------------------------------------------------------ */
/*  Sana                                                               */
/* ------------------------------------------------------------------ */

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function today(): string {
  return toISODate(new Date());
}

const MONTHS_UZ = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

/** "2024-03-15" -> "15.03.2024" */
export function formatDate(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return "—";
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

/** "2024-03-15" -> "15-mart, 2024" */
export function formatDateLong(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return "—";
  return `${d.getDate()}-${MONTHS_UZ[d.getMonth()]}, ${d.getFullYear()}`;
}

export function daysBetween(
  from: string | null | undefined,
  to?: string | null,
): number | null {
  const a = parseDate(from);
  const b = to ? parseDate(to) : new Date();
  if (!a || !b) return null;
  const ms = b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0);
  return Math.round(ms / 86_400_000);
}

export function addDays(value: string, days: number): string {
  const d = parseDate(value);
  if (!d) return value;
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/**
 * Foydalanuvchi kiritgan sanani tushunadi:
 *   "bugun", "kecha", "12.03.2024", "12/03/24", "12-03-2024",
 *   "2024-03-12", "12.03" (joriy yil), "5 kun oldin"
 * Tushunmasa null qaytaradi.
 */
export function parseUserDate(input: string): string | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;

  const now = new Date();
  if (["bugun", "bugungi", "hozir"].includes(s)) return toISODate(now);
  if (["kecha", "kechagi"].includes(s)) return addDays(toISODate(now), -1);
  if (["ertaga"].includes(s)) return addDays(toISODate(now), 1);

  const agoMatch = s.match(/^(\d{1,4})\s*kun\s*(oldin|avval)?$/);
  if (agoMatch) return addDays(toISODate(now), -Number(agoMatch[1]));

  // 2024-03-12
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return buildDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // 12.03.2024 | 12/03/2024 | 12-03-2024 | 12.03.24
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (dmy) {
    let year = Number(dmy[3]);
    if (year < 100) year += year > 50 ? 1900 : 2000;
    return buildDate(year, Number(dmy[2]), Number(dmy[1]));
  }

  // 12.03 — joriy yil (kelajakda bo'lsa o'tgan yil)
  const dm = s.match(/^(\d{1,2})[./-](\d{1,2})$/);
  if (dm) {
    const candidate = buildDate(now.getFullYear(), Number(dm[2]), Number(dm[1]));
    if (!candidate) return null;
    return candidate > toISODate(now)
      ? buildDate(now.getFullYear() - 1, Number(dm[2]), Number(dm[1]))
      : candidate;
  }

  return null;
}

function buildDate(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return toISODate(dt);
}

/* ------------------------------------------------------------------ */
/*  Yosh                                                               */
/* ------------------------------------------------------------------ */

export interface Age {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalMonths: number;
  label: string;
  short: string;
}

export function calcAge(birthDate: string | null | undefined): Age | null {
  const b = parseDate(birthDate);
  if (!b) return null;
  const now = new Date();
  if (b > now) return null;

  let years = now.getFullYear() - b.getFullYear();
  let months = now.getMonth() - b.getMonth();
  let days = now.getDate() - b.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalDays = daysBetween(birthDate) ?? 0;
  const label =
    years > 0
      ? months > 0
        ? `${years} yosh ${months} oy`
        : `${years} yosh`
      : months > 0
        ? days > 0
          ? `${months} oy ${days} kun`
          : `${months} oy`
        : `${days} kun`;

  const short = years > 0 ? `${years}y ${months}o` : months > 0 ? `${months} oy` : `${days} kun`;

  return { years, months, days, totalDays, totalMonths: years * 12 + months, label, short };
}

/* ------------------------------------------------------------------ */
/*  Reproduktsiya                                                      */
/* ------------------------------------------------------------------ */

export function expectedCalving(inseminationDate: string | null | undefined): string | null {
  return inseminationDate ? addDays(inseminationDate, GESTATION_DAYS) : null;
}

export function serviceDays(
  lastCalving: string | null | undefined,
  lastInsemination?: string | null,
): number | null {
  if (!lastCalving) return null;
  return daysBetween(lastCalving, lastInsemination ?? today());
}

export function calvingInterval(dates: string[]): number | null {
  if (dates.length < 2) return null;
  const sorted = [...dates].sort();
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const g = daysBetween(sorted[i - 1], sorted[i]);
    if (g !== null) gaps.push(g);
  }
  if (!gaps.length) return null;
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
}

/* ------------------------------------------------------------------ */
/*  Boshqa                                                             */
/* ------------------------------------------------------------------ */

export function normalizeTag(tag: string): string {
  return tag.trim().replace(/\s+/g, "");
}

/** HTML parse_mode uchun xavfsiz matn */
export function esc(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
