import { InlineKeyboard, Keyboard } from "grammy";
import { CATEGORIES, SUGGESTED_TRANSITIONS, categoryMeta } from "./domain/constants.js";
import type { CategoryCode } from "./domain/types.js";

/* ------------------------------------------------------------------ */
/*  Asosiy menyu (pastdagi tugmalar)                                   */
/* ------------------------------------------------------------------ */

export const BTN = {
  yangi: "➕ Yangi mol",
  qidirish: "🔍 Mol qidirish",
  royxat: "📋 Ro'yxat",
  statistika: "📊 Statistika",
  tugish: "🐣 Tug'ish rejasi",
  yordam: "❓ Yordam",
} as const;

export const mainMenu = new Keyboard()
  .text(BTN.qidirish).text(BTN.yangi).row()
  .text(BTN.royxat).text(BTN.statistika).row()
  .text(BTN.tugish).text(BTN.yordam)
  .resized()
  .persistent();

/** Jarayon davomida ko'rsatiladigan "bekor qilish" tugmasi */
export const cancelMenu = new Keyboard().text("❌ Bekor qilish").resized();

/* ------------------------------------------------------------------ */
/*  Inline klaviaturalar                                               */
/* ------------------------------------------------------------------ */

/**
 * Mol kartasi ostidagi amallar.
 * Tekshirilmagan urug'lantirish bo'lsa — tepada "tekshirish" tugmasi chiqadi.
 */
export function animalActions(animalId: string, pendingInseminationId?: string | null) {
  const kb = new InlineKeyboard();

  if (pendingInseminationId) {
    kb.text("🔬 Bug'ozligini tekshirish", `tekshir:${pendingInseminationId}`).row();
  }

  return kb
    .text("💉 Urug' quyildi", `urug:${animalId}`)
    .text("🐣 Tug'di", `tugish:${animalId}`)
    .row()
    .text("🔄 Turini o'zgartirish", `tur:${animalId}`)
    .row()
    .text("✏️ Tahrirlash", `tahrir:${animalId}`)
    .text("📜 Tarix", `tarix:${animalId}`);
}

/** Turlar ro'yxati — tanlash uchun */
export function categoryKeyboard(prefix: string, current?: CategoryCode | null) {
  const kb = new InlineKeyboard();
  const suggested = current ? (SUGGESTED_TRANSITIONS[current] ?? []) : [];

  // Avval tavsiya etilganlar (⭐ bilan)
  for (const code of suggested) {
    const m = categoryMeta(code);
    kb.text(`⭐ ${m.emoji} ${m.name}`, `${prefix}:${code}`).row();
  }

  for (const c of CATEGORIES) {
    if (c.code === current || suggested.includes(c.code)) continue;
    kb.text(`${c.emoji} ${c.name}`, `${prefix}:${c.code}`).row();
  }

  kb.text("❌ Bekor qilish", "bekor");
  return kb;
}

/** Tahrirlash uchun maydonlar */
export function editFieldsKeyboard(animalId: string) {
  return new InlineKeyboard()
    .text("🔢 Birka nomeri", `maydon:tag_number`)
    .text("🏷 Laqabi", `maydon:nickname`)
    .row()
    .text("📅 Tug'ilgan sana", `maydon:birth_date`)
    .text("🧬 Zoti", `maydon:breed`)
    .row()
    .text("🏠 Molxona", `maydon:barn`)
    .text("⚖️ Vazni", `maydon:current_weight`)
    .row()
    .text("👩 Onasining birkasi", `maydon:mother_tag`)
    .text("📝 Izoh", `maydon:notes`)
    .row()
    .text("🚦 Holati (sotilgan/o'lgan)", `maydon:status`)
    .row()
    .text("« Molga qaytish", `mol:${animalId}`);
}

/** Ha / Yo'q */
export function yesNo(yesData: string, noData: string, yesText = "✅ Ha", noText = "❌ Yo'q") {
  return new InlineKeyboard().text(yesText, yesData).text(noText, noData);
}

/** Sana tanlash uchun tez tugmalar */
export function dateShortcuts(prefix: string) {
  return new InlineKeyboard()
    .text("Bugun", `${prefix}:bugun`)
    .text("Kecha", `${prefix}:kecha`)
    .row()
    .text("❌ Bekor qilish", "bekor");
}

/** Bug'ozlik tekshiruvi natijasi */
export function checkResultKeyboard(inseminationId: string) {
  return new InlineKeyboard()
    .text("✅ Bug'oz", `natija:${inseminationId}:bugoz`)
    .row()
    .text("❌ Bug'oz emas", `natija:${inseminationId}:bugoz_emas`)
    .row()
    .text("⚠️ Bola tashladi", `natija:${inseminationId}:bola_tashladi`)
    .row()
    .text("« Bekor qilish", "bekor");
}

/** Turlar bo'yicha ro'yxat menyusi */
export function listCategoriesKeyboard(counts: Map<string, number>) {
  const kb = new InlineKeyboard();
  kb.text("🐄 Barcha mollar", "royxat:barchasi:0").row();
  for (const c of CATEGORIES) {
    const n = counts.get(c.code) ?? 0;
    kb.text(`${c.emoji} ${c.short} — ${n} ta`, `royxat:${c.code}:0`).row();
  }
  return kb;
}
