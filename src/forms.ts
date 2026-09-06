import { InlineKeyboard } from "grammy";
import type { BotContext } from "./session.js";
import { resetFlow } from "./session.js";
import {
  categoryKeyboard,
  cancelMenu,
  editFieldsKeyboard,
  mainMenu,
} from "./keyboards.js";
import {
  STATUS_LABELS,
  afterCalving,
  afterInsemination,
  afterPregnancyCheck,
  categoryMeta,
} from "./domain/constants.js";
import { esc, formatDate, normalizeTag, parseUserDate, today } from "./domain/utils.js";
import type { AnimalStatus, CategoryCode, InseminationResult } from "./domain/types.js";
import {
  addCalving,
  addInsemination,
  changeCategory,
  createAnimal,
  findByTag,
  getAnimal,
  lastUncheckedInsemination,
  setInseminationResult,
  setStatus,
  updateAnimalField,
} from "./queries.js";
import { showAnimal } from "./handlers.js";

/** "-" yoki shunga o'xshash javob — o'tkazib yuborish */
function isSkip(text: string): boolean {
  const s = text.trim().toLowerCase();
  return ["-", "—", "yo'q", "yoq", "otkazish", "o'tkazish", "skip", "."].includes(s);
}

const HINT_SKIP = "\n\n<i>Bilmasangiz yoki kerak bo'lmasa «-» yuboring.</i>";
const HINT_DATE =
  "\n\n<i>Masalan: «bugun», «kecha», «15.03.2024», «15.03» yoki «10 kun oldin».</i>";

/* ================================================================== */
/*  1) YANGI MOL                                                       */
/* ================================================================== */

export async function startNewAnimal(ctx: BotContext, prefillTag?: string) {
  resetFlow(ctx);
  ctx.session.flow = "yangi_mol";

  if (prefillTag) {
    ctx.session.data.tag_number = normalizeTag(prefillTag);
    ctx.session.step = "kategoriya";
    await ctx.reply(
      `➕ <b>Yangi mol</b>\nBirka: <code>${esc(prefillTag)}</code>\n\n<b>2/5.</b> Turini tanlang:`,
      { parse_mode: "HTML", reply_markup: categoryKeyboard("yangikat") },
    );
    return;
  }

  ctx.session.step = "tag";
  await ctx.reply(
    "➕ <b>Yangi mol qo'shish</b>\n\n<b>1/5.</b> Birka nomerini yuboring.",
    { parse_mode: "HTML", reply_markup: cancelMenu },
  );
}

async function newAnimalText(ctx: BotContext, text: string): Promise<void> {
  const d = ctx.session.data;

  switch (ctx.session.step) {
    case "tag": {
      const tag = normalizeTag(text);
      if (!tag) {
        await ctx.reply("Birka nomeri bo'sh bo'lishi mumkin emas. Qaytadan yuboring.");
        return;
      }
      const exists = await findByTag(tag);
      if (exists) {
        await ctx.reply(
          `⚠️ <code>${esc(tag)}</code> birkali mol allaqachon bor.\n` +
            `Boshqa raqam yuboring yoki /bekor bosing.`,
          { parse_mode: "HTML" },
        );
        return;
      }
      d.tag_number = tag;
      ctx.session.step = "kategoriya";
      await ctx.reply(
        `Birka: <code>${esc(tag)}</code>\n\n<b>2/5.</b> Turini tanlang:`,
        { parse_mode: "HTML", reply_markup: categoryKeyboard("yangikat") },
      );
      return;
    }

    case "sana": {
      if (!isSkip(text)) {
        const date = parseUserDate(text);
        if (!date) {
          await ctx.reply(
            "Sanani tushunmadim." + HINT_DATE,
            { parse_mode: "HTML" },
          );
          return;
        }
        if (date > today()) {
          await ctx.reply("Tug'ilgan sana kelajakda bo'lishi mumkin emas.");
          return;
        }
        d.birth_date = date;
      }
      ctx.session.step = "zot";
      await ctx.reply("<b>4/5.</b> Zoti?" + HINT_SKIP, { parse_mode: "HTML" });
      return;
    }

    case "zot": {
      if (!isSkip(text)) d.breed = text.trim();
      ctx.session.step = "molxona";
      await ctx.reply("<b>5/5.</b> Molxona (joylashuvi)?" + HINT_SKIP, {
        parse_mode: "HTML",
      });
      return;
    }

    case "molxona": {
      if (!isSkip(text)) d.barn = text.trim();
      await saveNewAnimal(ctx);
      return;
    }
  }
}

async function saveNewAnimal(ctx: BotContext) {
  const d = ctx.session.data;
  const tgId = ctx.from?.id ?? 0;

  const res = await createAnimal(
    {
      tag_number: d.tag_number,
      category_code: d.category_code,
      birth_date: d.birth_date ?? null,
      breed: d.breed ?? null,
      barn: d.barn ?? null,
    },
    tgId,
  );

  if (!res.ok) {
    await ctx.reply(`❌ Saqlanmadi: ${esc(res.error)}`, {
      parse_mode: "HTML",
      reply_markup: mainMenu,
    });
    resetFlow(ctx);
    return;
  }

  resetFlow(ctx);
  await ctx.reply(`✅ <code>${esc(d.tag_number)}</code> qo'shildi.`, {
    parse_mode: "HTML",
    reply_markup: mainMenu,
  });
  await showAnimal(ctx, res.data.id);
}

/* ================================================================== */
/*  2) TAHRIRLASH                                                      */
/* ================================================================== */

export async function startEdit(ctx: BotContext, animalId?: string) {
  resetFlow(ctx);
  ctx.session.flow = "tahrirlash";

  if (animalId) {
    ctx.session.animalId = animalId;
    await showEditMenu(ctx, animalId);
    return;
  }

  ctx.session.step = "tag";
  await ctx.reply(
    "✏️ <b>Molni tahrirlash</b>\n\nQaysi molni tahrirlaymiz? Birka nomerini yuboring.",
    { parse_mode: "HTML", reply_markup: cancelMenu },
  );
}

async function showEditMenu(ctx: BotContext, animalId: string) {
  const a = await getAnimal(animalId);
  if (!a) {
    await ctx.reply("Mol topilmadi.", { reply_markup: mainMenu });
    resetFlow(ctx);
    return;
  }
  ctx.session.step = "maydon";
  await ctx.reply(
    `✏️ <b>${esc(a.tag_number)}</b> — qaysi ma'lumotni o'zgartiramiz?`,
    { parse_mode: "HTML", reply_markup: editFieldsKeyboard(animalId) },
  );
}

const FIELD_LABELS: Record<string, string> = {
  tag_number: "Birka nomeri",
  nickname: "Laqabi",
  birth_date: "Tug'ilgan sana",
  breed: "Zoti",
  barn: "Molxona",
  current_weight: "Hozirgi vazni (kg)",
  mother_tag: "Onasining birkasi",
  notes: "Izoh",
};

export async function askFieldValue(ctx: BotContext, field: string) {
  if (field === "status") {
    const kb = new InlineKeyboard();
    for (const [code, label] of Object.entries(STATUS_LABELS)) {
      kb.text(label, `holat:${code}`).row();
    }
    kb.text("« Bekor qilish", "bekor");
    await ctx.reply("🚦 Molning yangi holatini tanlang:", { reply_markup: kb });
    return;
  }

  ctx.session.data.field = field;
  ctx.session.step = "qiymat";

  let hint = "";
  if (field === "birth_date") hint = HINT_DATE;
  else if (field === "current_weight") hint = "\n\n<i>Faqat raqam, masalan: 520</i>";
  else hint = "\n\n<i>Tozalash uchun «-» yuboring.</i>";

  await ctx.reply(
    `✏️ <b>${esc(FIELD_LABELS[field] ?? field)}</b> uchun yangi qiymatni yuboring.${hint}`,
    { parse_mode: "HTML", reply_markup: cancelMenu },
  );
}

async function editText(ctx: BotContext, text: string): Promise<void> {
  const d = ctx.session.data;

  if (ctx.session.step === "tag") {
    const a = await findByTag(text);
    if (!a) {
      await ctx.reply(
        `<code>${esc(text)}</code> birkali mol topilmadi. Qaytadan urinib ko'ring.`,
        { parse_mode: "HTML" },
      );
      return;
    }
    ctx.session.animalId = a.id;
    await showEditMenu(ctx, a.id);
    return;
  }

  if (ctx.session.step === "qiymat") {
    const field = d.field as string;
    const animalId = ctx.session.animalId;
    if (!animalId) {
      await ctx.reply("Mol tanlanmagan. /tahrirlash dan qaytadan boshlang.");
      resetFlow(ctx);
      return;
    }

    let value: string | number | null;

    if (isSkip(text)) {
      if (field === "tag_number") {
        await ctx.reply("Birka nomerini bo'sh qoldirib bo'lmaydi.");
        return;
      }
      value = null;
    } else if (field === "birth_date") {
      const date = parseUserDate(text);
      if (!date) {
        await ctx.reply("Sanani tushunmadim." + HINT_DATE, { parse_mode: "HTML" });
        return;
      }
      if (date > today()) {
        await ctx.reply("Sana kelajakda bo'lishi mumkin emas.");
        return;
      }
      value = date;
    } else if (field === "current_weight") {
      const n = Number(text.replace(",", ".").trim());
      if (!Number.isFinite(n) || n <= 0) {
        await ctx.reply("Vazn faqat musbat raqam bo'lishi kerak. Masalan: 520");
        return;
      }
      value = n;
    } else if (field === "tag_number") {
      const tag = normalizeTag(text);
      const exists = await findByTag(tag);
      if (exists && exists.id !== animalId) {
        await ctx.reply(
          `⚠️ <code>${esc(tag)}</code> birkasi boshqa molda ishlatilgan.`,
          { parse_mode: "HTML" },
        );
        return;
      }
      value = tag;
    } else if (field === "mother_tag") {
      value = normalizeTag(text);
    } else {
      value = text.trim();
    }

    const res = await updateAnimalField(animalId, field, value);
    if (!res.ok) {
      await ctx.reply(`❌ ${esc(res.error)}`, { parse_mode: "HTML" });
      return;
    }

    resetFlow(ctx);
    await ctx.reply("✅ Saqlandi.", { reply_markup: mainMenu });
    await showAnimal(ctx, animalId);
  }
}

/* ================================================================== */
/*  3) TURNI O'ZGARTIRISH                                              */
/* ================================================================== */

export async function startTransfer(ctx: BotContext, animalId: string) {
  const a = await getAnimal(animalId);
  if (!a) {
    await ctx.reply("Mol topilmadi.", { reply_markup: mainMenu });
    return;
  }

  resetFlow(ctx);
  ctx.session.flow = "tur";
  ctx.session.step = "kategoriya";
  ctx.session.animalId = animalId;

  const meta = categoryMeta(a.category_code);
  await ctx.reply(
    `🔄 <b>${esc(a.tag_number)}</b>\nHozirgi turi: ${meta.emoji} ${esc(meta.name)}\n\n` +
      `Yangi turni tanlang (⭐ — tavsiya etiladi):`,
    { parse_mode: "HTML", reply_markup: categoryKeyboard("turgacha", a.category_code) },
  );
}

async function transferText(ctx: BotContext, text: string): Promise<void> {
  if (ctx.session.step !== "sabab") return;

  const animalId = ctx.session.animalId!;
  const to = ctx.session.data.to as CategoryCode;
  const reason = isSkip(text) ? "Bot orqali o'zgartirildi" : text.trim();

  const res = await changeCategory(animalId, to, reason, ctx.from?.id ?? 0);
  resetFlow(ctx);

  if (!res.ok) {
    await ctx.reply(`❌ ${esc(res.error)}`, {
      parse_mode: "HTML",
      reply_markup: mainMenu,
    });
    return;
  }

  await ctx.reply(`✅ Turi <b>${esc(categoryMeta(to).name)}</b> ga o'zgartirildi.`, {
    parse_mode: "HTML",
    reply_markup: mainMenu,
  });
  await showAnimal(ctx, animalId);
}

/* ================================================================== */
/*  4) URUG' QUYILDI                                                   */
/* ================================================================== */

export async function startInsemination(ctx: BotContext, animalId: string) {
  const a = await getAnimal(animalId);
  if (!a) {
    await ctx.reply("Mol topilmadi.", { reply_markup: mainMenu });
    return;
  }

  // Avval tekshirilmagan urug'lantirish bo'lsa — eslatamiz
  const pending = await lastUncheckedInsemination(animalId);

  resetFlow(ctx);
  ctx.session.flow = "urug";
  ctx.session.step = "sana";
  ctx.session.animalId = animalId;

  const warn = pending
    ? `\n\n⚠️ <i>${formatDate(pending.insemination_date)} dagi urug'lantirish hali ` +
      `tekshirilmagan. Avval uning natijasini belgilash tavsiya etiladi.</i>`
    : "";

  await ctx.reply(
    `💉 <b>${esc(a.tag_number)}</b> — urug' quyildi\n\n<b>1/2.</b> Qaysi kuni?${HINT_DATE}${warn}`,
    { parse_mode: "HTML", reply_markup: cancelMenu },
  );
}

async function inseminationText(ctx: BotContext, text: string): Promise<void> {
  const d = ctx.session.data;

  if (ctx.session.step === "sana") {
    const date = parseUserDate(text);
    if (!date) {
      await ctx.reply("Sanani tushunmadim." + HINT_DATE, { parse_mode: "HTML" });
      return;
    }
    if (date > today()) {
      await ctx.reply("Sana kelajakda bo'lishi mumkin emas.");
      return;
    }
    d.date = date;
    ctx.session.step = "buqa";
    await ctx.reply("<b>2/2.</b> Buqa kodi?" + HINT_SKIP, { parse_mode: "HTML" });
    return;
  }

  if (ctx.session.step === "buqa") {
    d.bull = isSkip(text) ? null : text.trim();
    await saveInsemination(ctx);
  }
}

async function saveInsemination(ctx: BotContext) {
  const d = ctx.session.data;
  const animalId = ctx.session.animalId!;
  const tgId = ctx.from?.id ?? 0;

  const res = await addInsemination(animalId, d.date, d.bull, tgId);
  if (!res.ok) {
    resetFlow(ctx);
    await ctx.reply(`❌ ${esc(res.error)}`, {
      parse_mode: "HTML",
      reply_markup: mainMenu,
    });
    return;
  }

  const a = await getAnimal(animalId);
  const suggestion = a ? afterInsemination(a.category_code) : null;

  await ctx.reply(
    `✅ Urug' quyilgani yozildi (${res.data.attempt}-urinish, ${formatDate(d.date)}).`,
    { reply_markup: mainMenu },
  );

  if (suggestion && a && suggestion !== a.category_code) {
    ctx.session.step = "avtotur";
    ctx.session.data.suggest = suggestion;
    await ctx.reply(
      `🔄 Molning turini <b>${esc(categoryMeta(suggestion).name)}</b> ga ` +
        `o'zgartiraymi?`,
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .text("✅ Ha", `avtotur:${suggestion}`)
          .text("❌ Yo'q", "avtotur:yoq"),
      },
    );
    return;
  }

  resetFlow(ctx);
  await showAnimal(ctx, animalId);
}

/* ================================================================== */
/*  5) BUG'OZLIK TEKSHIRUVI                                            */
/* ================================================================== */

export async function applyCheckResult(
  ctx: BotContext,
  inseminationId: string,
  result: InseminationResult,
) {
  const animalId = ctx.session.animalId;
  if (!animalId) {
    await ctx.reply("Mol tanlanmagan.", { reply_markup: mainMenu });
    return;
  }

  const res = await setInseminationResult(inseminationId, result, today());
  if (!res.ok) {
    await ctx.reply(`❌ ${esc(res.error)}`, { parse_mode: "HTML" });
    return;
  }

  const a = await getAnimal(animalId);
  if (!a) return;

  const suggestion = afterPregnancyCheck(
    a.category_code,
    result,
    a.insemination_count ?? 1,
  );

  const label =
    result === "bugoz" ? "Bug'oz" : result === "bugoz_emas" ? "Bug'oz emas" : "Bola tashladi";
  await ctx.reply(`✅ Natija yozildi: <b>${esc(label)}</b>`, { parse_mode: "HTML" });

  if (suggestion && suggestion !== a.category_code) {
    ctx.session.flow = "urug";
    ctx.session.step = "avtotur";
    ctx.session.data.suggest = suggestion;
    await ctx.reply(
      `🔄 Molning turini <b>${esc(categoryMeta(suggestion).name)}</b> ga o'zgartiraymi?`,
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .text("✅ Ha", `avtotur:${suggestion}`)
          .text("❌ Yo'q", "avtotur:yoq"),
      },
    );
    return;
  }

  resetFlow(ctx);
  await showAnimal(ctx, animalId);
}

/* ================================================================== */
/*  6) TUG'DI                                                          */
/* ================================================================== */

export async function startCalving(ctx: BotContext, animalId: string) {
  const a = await getAnimal(animalId);
  if (!a) {
    await ctx.reply("Mol topilmadi.", { reply_markup: mainMenu });
    return;
  }

  resetFlow(ctx);
  ctx.session.flow = "tugish";
  ctx.session.step = "sana";
  ctx.session.animalId = animalId;

  await ctx.reply(
    `🐣 <b>${esc(a.tag_number)}</b> — tug'ish\n\n<b>1/3.</b> Qaysi kuni tug'di?${HINT_DATE}`,
    { parse_mode: "HTML", reply_markup: cancelMenu },
  );
}

async function calvingText(ctx: BotContext, text: string): Promise<void> {
  const d = ctx.session.data;

  if (ctx.session.step === "sana") {
    const date = parseUserDate(text);
    if (!date) {
      await ctx.reply("Sanani tushunmadim." + HINT_DATE, { parse_mode: "HTML" });
      return;
    }
    if (date > today()) {
      await ctx.reply("Sana kelajakda bo'lishi mumkin emas.");
      return;
    }
    d.date = date;
    ctx.session.step = "buzoq";
    await ctx.reply(
      "<b>2/3.</b> Tug'ilgan buzoqning birka nomeri?" + HINT_SKIP,
      { parse_mode: "HTML" },
    );
    return;
  }

  if (ctx.session.step === "buzoq") {
    if (isSkip(text)) {
      d.calfTag = null;
      await saveCalving(ctx, null, false);
      return;
    }

    const tag = normalizeTag(text);
    const exists = await findByTag(tag);
    if (exists) {
      await ctx.reply(
        `⚠️ <code>${esc(tag)}</code> birkasi band. Boshqa raqam yuboring yoki «-» bosing.`,
        { parse_mode: "HTML" },
      );
      return;
    }

    d.calfTag = tag;
    ctx.session.step = "buzoq_jins";
    await ctx.reply(
      `<b>3/3.</b> Buzoq <code>${esc(tag)}</code> — jinsi?\n\n` +
        `<i>Tanlasangiz, buzoq «Sut buzoq» sifatida ro'yxatga ham qo'shiladi.</i>`,
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .text("🐄 Urg'ochi", "buzoq:urgochi")
          .text("🐂 Erkak", "buzoq:erkak")
          .row()
          .text("Ro'yxatga qo'shmasdan saqlash", "buzoq:yoq"),
      },
    );
  }
}

export async function saveCalving(
  ctx: BotContext,
  calfGender: "urgochi" | "erkak" | null,
  registerCalf: boolean,
) {
  const d = ctx.session.data;
  const animalId = ctx.session.animalId!;
  const tgId = ctx.from?.id ?? 0;

  const res = await addCalving(
    animalId,
    d.date,
    d.calfTag ?? null,
    calfGender,
    registerCalf,
    tgId,
  );

  if (!res.ok) {
    resetFlow(ctx);
    await ctx.reply(`❌ ${esc(res.error)}`, {
      parse_mode: "HTML",
      reply_markup: mainMenu,
    });
    return;
  }

  let msg = `✅ Tug'ish yozildi (${res.data.lactation}-laktatsiya, ${formatDate(d.date)}).`;
  if (res.data.calfCreated) {
    msg += `\n🍼 Buzoq <code>${esc(d.calfTag)}</code> ham ro'yxatga qo'shildi.`;
  }
  await ctx.reply(msg, { parse_mode: "HTML", reply_markup: mainMenu });

  const a = await getAnimal(animalId);
  const suggestion = a ? afterCalving(a.category_code) : null;

  if (suggestion && a && suggestion !== a.category_code) {
    ctx.session.flow = "tugish";
    ctx.session.step = "avtotur";
    ctx.session.data.suggest = suggestion;
    await ctx.reply(
      `🔄 Onaning turini <b>${esc(categoryMeta(suggestion).name)}</b> ga o'zgartiraymi?`,
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .text("✅ Ha", `avtotur:${suggestion}`)
          .text("❌ Yo'q", "avtotur:yoq"),
      },
    );
    return;
  }

  resetFlow(ctx);
  await showAnimal(ctx, animalId);
}

/* ================================================================== */
/*  Avtomatik tur o'zgarishini qo'llash                                */
/* ================================================================== */

export async function applyAutoCategory(ctx: BotContext, code: string) {
  const animalId = ctx.session.animalId;
  resetFlow(ctx);

  if (!animalId) {
    await ctx.reply("Mol tanlanmagan.", { reply_markup: mainMenu });
    return;
  }

  if (code === "yoq") {
    await ctx.reply("Turi o'zgarmadi.", { reply_markup: mainMenu });
    await showAnimal(ctx, animalId);
    return;
  }

  const res = await changeCategory(
    animalId,
    code as CategoryCode,
    "Bot: voqeadan keyin avtomatik",
    ctx.from?.id ?? 0,
  );

  if (!res.ok) {
    await ctx.reply(`❌ ${esc(res.error)}`, { parse_mode: "HTML" });
  } else {
    await ctx.reply(`✅ Turi <b>${esc(categoryMeta(code).name)}</b> ga o'zgartirildi.`, {
      parse_mode: "HTML",
      reply_markup: mainMenu,
    });
  }
  await showAnimal(ctx, animalId);
}

/* ================================================================== */
/*  Holatni o'zgartirish (sotilgan / o'lgan / so'yilgan)               */
/* ================================================================== */

export async function applyStatus(ctx: BotContext, status: string) {
  const animalId = ctx.session.animalId;
  if (!animalId) {
    await ctx.reply("Mol tanlanmagan.", { reply_markup: mainMenu });
    return;
  }

  const res = await setStatus(animalId, status, today());
  resetFlow(ctx);

  if (!res.ok) {
    await ctx.reply(`❌ ${esc(res.error)}`, { parse_mode: "HTML" });
    return;
  }

  await ctx.reply(
    `✅ Holat o'zgartirildi: <b>${esc(STATUS_LABELS[status as AnimalStatus] ?? status)}</b>`,
    { parse_mode: "HTML", reply_markup: mainMenu },
  );
  await showAnimal(ctx, animalId);
}

/* ================================================================== */
/*  Matnli xabarlarni jarayonlarga yo'naltirish                        */
/* ================================================================== */

/** Joriy jarayon matnni qabul qildimi? */
export async function handleFlowText(ctx: BotContext, text: string): Promise<boolean> {
  switch (ctx.session.flow) {
    case "yangi_mol":
      await newAnimalText(ctx, text);
      return true;
    case "tahrirlash":
      await editText(ctx, text);
      return true;
    case "tur":
      await transferText(ctx, text);
      return true;
    case "urug":
      await inseminationText(ctx, text);
      return true;
    case "tugish":
      await calvingText(ctx, text);
      return true;
    default:
      return false;
  }
}

/** Yangi mol jarayonida tur tanlanganda */
export async function newAnimalCategoryChosen(ctx: BotContext, code: string) {
  ctx.session.data.category_code = code as CategoryCode;
  ctx.session.step = "sana";
  await ctx.reply(
    `Turi: ${categoryMeta(code).emoji} <b>${esc(categoryMeta(code).name)}</b>\n\n` +
      `<b>3/5.</b> Tug'ilgan sanasi?${HINT_DATE}` +
      `\n<i>Bilmasangiz «-» yuboring.</i>`,
    { parse_mode: "HTML", reply_markup: cancelMenu },
  );
}

/** Turni o'zgartirish jarayonida tur tanlanganda */
export async function transferCategoryChosen(ctx: BotContext, code: string) {
  ctx.session.data.to = code as CategoryCode;
  ctx.session.step = "sabab";
  await ctx.reply(
    `Yangi tur: <b>${esc(categoryMeta(code).name)}</b>\n\n` +
      `Sababi nima? (tarixda saqlanadi)${HINT_SKIP}`,
    { parse_mode: "HTML", reply_markup: cancelMenu },
  );
}
