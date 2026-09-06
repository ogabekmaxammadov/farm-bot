import {
  DIFFICULTY_LABELS,
  GENDER_LABELS,
  INSEMINATION_RESULT_LABELS,
  ORIGIN_LABELS,
  STATUS_LABELS,
  categoryMeta,
} from "./domain/constants.js";
import {
  calcAge,
  calvingInterval,
  daysBetween,
  esc,
  formatDate,
  serviceDays,
  today,
} from "./domain/utils.js";
import type {
  AnimalFull,
  Calving,
  CategoryChange,
  FarmSummary,
  Insemination,
} from "./domain/types.js";

/* ------------------------------------------------------------------ */
/*  Mol kartasi                                                        */
/* ------------------------------------------------------------------ */

export function animalCard(
  a: AnimalFull,
  inseminations: Insemination[] = [],
  calvings: Calving[] = [],
): string {
  const meta = categoryMeta(a.category_code);
  const age = calcAge(a.birth_date);

  const lines: string[] = [];

  // Sarlavha
  const title = `${meta.emoji} <b>${esc(a.tag_number)}</b>${
    a.nickname ? ` — ${esc(a.nickname)}` : ""
  }`;
  lines.push(title);
  lines.push(`<i>${esc(meta.name)}</i>`);
  if (a.status !== "faol") {
    lines.push(`🚫 <b>${esc(STATUS_LABELS[a.status])}</b>${
      a.status_date ? ` · ${formatDate(a.status_date)}` : ""
    }`);
  }
  lines.push("");

  // Asosiy ma'lumotlar
  lines.push(
    `📅 Tug'ilgan: <b>${formatDate(a.birth_date)}</b>${age ? ` (${esc(age.label)})` : ""}`,
  );
  if (a.breed) lines.push(`🧬 Zoti: ${esc(a.breed)}`);
  if (a.gender !== "urgochi") lines.push(`⚧ Jinsi: ${esc(GENDER_LABELS[a.gender])}`);
  if (a.barn) lines.push(`🏠 Molxona: ${esc(a.barn)}`);
  if (a.pen_group) lines.push(`📍 Guruh: ${esc(a.pen_group)}`);
  if (a.current_weight) lines.push(`⚖️ Vazni: ${a.current_weight} kg`);

  // Reproduktsiya
  const totalCalves = calvings.reduce((s, c) => s + (c.calf_count ?? 1), 0);
  const successful = inseminations.filter((i) => i.result === "bugoz").length;
  const rate =
    inseminations.length > 0 ? Math.round((successful / inseminations.length) * 100) : null;

  lines.push("");
  lines.push(
    `🐣 Tug'gan: <b>${calvings.length}</b> marta${
      totalCalves ? ` (${totalCalves} ta buzoq)` : ""
    }`,
  );
  lines.push(
    `💉 Urug' quyilgan: <b>${inseminations.length}</b> marta${
      rate !== null ? ` (natija ${rate}%)` : ""
    }`,
  );

  const pregnant = inseminations.find((i) => i.result === "bugoz");
  if (pregnant) {
    const day = daysBetween(pregnant.insemination_date);
    const left = pregnant.expected_calving_date
      ? daysBetween(today(), pregnant.expected_calving_date)
      : null;
    if (day !== null) lines.push(`🤰 Bug'ozlik: <b>${day}</b>-kun`);
    if (pregnant.expected_calving_date) {
      lines.push(
        `📆 Tug'adi: <b>${formatDate(pregnant.expected_calving_date)}</b>${
          left !== null ? ` (${left} kun qoldi)` : ""
        }`,
      );
    }
  }

  const lastCalving = calvings[0]?.calving_date ?? null;
  const lastIns = inseminations[0]?.insemination_date ?? null;
  if (lastIns) lines.push(`🗓 Oxirgi urug': ${formatDate(lastIns)}`);
  if (lastCalving) {
    const since = daysBetween(lastCalving);
    lines.push(
      `🗓 Oxirgi tug'ish: ${formatDate(lastCalving)}${since !== null ? ` (${since} kun oldin)` : ""}`,
    );
  }

  const service = serviceDays(lastCalving, lastIns);
  if (service !== null) lines.push(`⏱ Servis davri: ${service} kun`);

  const interval = calvingInterval(calvings.map((c) => c.calving_date));
  if (interval) lines.push(`🔁 Tug'ish oralig'i: ${interval} kun`);

  // Nasl-nasab
  if (a.mother_tag || a.father_code) {
    lines.push("");
    if (a.mother_tag) lines.push(`👩 Onasi: <code>${esc(a.mother_tag)}</code>`);
    if (a.father_code) lines.push(`👨 Otasi: <code>${esc(a.father_code)}</code>`);
  }

  if (a.origin === "sotib_olingan") {
    lines.push(`🚚 ${esc(ORIGIN_LABELS[a.origin])}`);
  }
  if (a.notes) {
    lines.push("");
    lines.push(`📝 ${esc(a.notes)}`);
  }

  // Ogohlantirishlar
  const warnings = animalWarnings(a, inseminations);
  if (warnings.length) {
    lines.push("");
    lines.push(...warnings);
  }

  return lines.join("\n");
}

/** Molga oid diqqat talab qiladigan holatlar */
function animalWarnings(a: AnimalFull, inseminations: Insemination[]): string[] {
  const out: string[] = [];
  const last = inseminations[0];

  if (last?.result === "tekshirilmagan") {
    const d = daysBetween(last.insemination_date);
    if (d !== null && d >= 30) {
      out.push(`⚠️ Bug'ozlik tekshiruvi kechikkan (${d} kun bo'ldi)`);
    }
  }

  const pregnant = inseminations.find((i) => i.result === "bugoz");
  if (pregnant?.expected_calving_date) {
    const left = daysBetween(today(), pregnant.expected_calving_date);
    if (left !== null && left <= 21 && left >= 0) {
      out.push(`⚠️ Tug'ishiga ${left} kun qoldi — tinim davriga tayyorlang`);
    }
    if (left !== null && left < 0) {
      out.push(`⚠️ Tug'ish muddati ${Math.abs(left)} kun oldin o'tgan`);
    }
  }

  const age = calcAge(a.birth_date);
  if (a.category_code === "sut_buzoq" && age && age.totalMonths >= 6) {
    out.push(`⚠️ Yoshi ${age.label} — tanalar guruhiga o'tkazish vaqti keldi`);
  }

  return out;
}

/* ------------------------------------------------------------------ */
/*  Ro'yxat qatori                                                     */
/* ------------------------------------------------------------------ */

export function animalLine(a: AnimalFull): string {
  const meta = categoryMeta(a.category_code);
  const age = calcAge(a.birth_date);
  const parts = [meta.short];
  if (age) parts.push(age.short);
  if (a.barn) parts.push(a.barn);
  return `${meta.emoji} <code>${esc(a.tag_number)}</code> — ${esc(parts.join(" · "))}`;
}

/* ------------------------------------------------------------------ */
/*  Statistika                                                         */
/* ------------------------------------------------------------------ */

export function statsMessage(
  s: FarmSummary,
  counts: { code: string; short_name: string; total: number }[],
): string {
  const lines: string[] = ["📊 <b>Ferma holati</b>", ""];

  lines.push(`🐄 Jami mol: <b>${s.total}</b>`);
  lines.push(`🥛 Sog'iladigan: <b>${s.milking}</b>`);
  lines.push(`🤰 Bug'oz: <b>${s.pregnant}</b>`);
  lines.push(`🐮 Yosh mol: <b>${s.young}</b>`);
  if (s.inactive) lines.push(`🚫 Podadan chiqqan: ${s.inactive}`);

  lines.push("");
  lines.push("<b>Turlar bo'yicha</b>");
  for (const c of counts) {
    if (!c.total) continue;
    const meta = categoryMeta(c.code);
    lines.push(`${meta.emoji} ${esc(c.short_name)}: <b>${c.total}</b>`);
  }

  lines.push("");
  lines.push("<b>Oxirgi 30 kun</b>");
  lines.push(`🐣 Tug'ishlar: ${s.calvings_30d}`);
  lines.push(`💉 Urug'lantirishlar: ${s.inseminations_30d}`);
  lines.push(`📆 30 kunda tug'adi: ${s.due_30d}`);
  if (s.uncheked_ins) {
    lines.push(`⚠️ Tekshiruvi kechikkan: <b>${s.uncheked_ins}</b>`);
  }
  if (s.added_this_month) {
    lines.push(`➕ Bu oyda qo'shilgan: ${s.added_this_month}`);
  }

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Tarix                                                              */
/* ------------------------------------------------------------------ */

export function historyMessage(
  tag: string,
  changes: CategoryChange[],
  inseminations: Insemination[],
  calvings: Calving[],
): string {
  const lines: string[] = [`📜 <b>${esc(tag)}</b> — tarix`, ""];

  if (changes.length) {
    lines.push("<b>Tur o'zgarishlari</b>");
    for (const c of changes.slice(0, 12)) {
      const from = c.from_category ? categoryMeta(c.from_category).short : null;
      const to = categoryMeta(c.to_category);
      lines.push(
        `${formatDate(c.changed_at)} — ${from ? esc(from) + " → " : ""}${to.emoji} ${esc(to.short)}` +
          (c.reason ? `\n   <i>${esc(c.reason)}</i>` : ""),
      );
    }
    lines.push("");
  }

  if (inseminations.length) {
    lines.push("<b>Urug'lantirishlar</b>");
    for (const i of inseminations.slice(0, 12)) {
      lines.push(
        `${formatDate(i.insemination_date)} — ${esc(INSEMINATION_RESULT_LABELS[i.result])}` +
          (i.bull_code ? ` · buqa ${esc(i.bull_code)}` : ""),
      );
    }
    lines.push("");
  }

  if (calvings.length) {
    lines.push("<b>Tug'ishlar</b>");
    for (const c of calvings.slice(0, 12)) {
      lines.push(
        `${formatDate(c.calving_date)} — ${c.lactation_no ?? "?"}-laktatsiya` +
          (c.calf_tag ? ` · buzoq ${esc(c.calf_tag)}` : "") +
          ` · ${esc(DIFFICULTY_LABELS[c.difficulty])}`,
      );
    }
  }

  if (!changes.length && !inseminations.length && !calvings.length) {
    lines.push("<i>Hali hech qanday yozuv yo'q.</i>");
  }

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Yordam                                                             */
/* ------------------------------------------------------------------ */

export const HELP_TEXT = `❓ <b>Botdan qanday foydalanish</b>

<b>Eng tez yo'l — birka raqamini yozing</b>
Masalan: <code>1234</code>
Bot o'sha molning to'liq ma'lumotini va amal tugmalarini chiqaradi.

<b>Menyu tugmalari</b>
🔍 Mol qidirish — birka yoki laqab bo'yicha
➕ Yangi mol — yangi mol qo'shish
📋 Ro'yxat — turlar bo'yicha ko'rish
📊 Statistika — ferma umumiy holati
🐣 Tug'ish rejasi — yaqin 60 kunda tug'adiganlar

<b>Buyruqlar</b>
/start — boshlash
/yangi — yangi mol qo'shish
/tahrirlash — molni tahrirlash
/qidirish — mol qidirish
/royxat — mollar ro'yxati
/statistika — ferma holati
/tugish — tug'ish rejasi
/bekor — joriy amalni bekor qilish
/yordam — shu yordam

<b>Mol ustidagi amallar</b>
Molni topganingizdan keyin tugmalar chiqadi:
💉 Urug' quyildi · 🐣 Tug'di · 🔄 Turini o'zgartirish · ✏️ Tahrirlash · 📜 Tarix

<b>Sana kiritish</b>
Quyidagilarning barchasi ishlaydi:
<code>bugun</code> · <code>kecha</code> · <code>15.03.2024</code> · <code>15.03</code> · <code>2024-03-15</code> · <code>10 kun oldin</code>

<b>Maslahat</b>
Tur o'zgarishini bot o'zi taklif qiladi (urug' quyilsa, tug'sa va h.k.) —
siz faqat tasdiqlaysiz.`;
