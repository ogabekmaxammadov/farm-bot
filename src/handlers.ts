import { InlineKeyboard } from "grammy";
import type { BotContext } from "./session.js";
import { resetFlow } from "./session.js";
import {
  animalActions,
  listCategoriesKeyboard,
  mainMenu,
} from "./keyboards.js";
import { animalCard, animalLine, historyMessage, statsMessage } from "./format.js";
import { categoryMeta } from "./domain/constants.js";
import { daysBetween, esc, formatDate, today } from "./domain/utils.js";
import {
  categoryCounts,
  getAnimalContext,
  getStats,
  listAnimals,
  overdueChecks,
  searchAnimals,
  upcomingCalvings,
} from "./queries.js";

const PAGE_SIZE = 15;

/* ------------------------------------------------------------------ */
/*  Molni ko'rsatish                                                   */
/* ------------------------------------------------------------------ */

export async function showAnimal(ctx: BotContext, animalId: string, edit = false) {
  const { animal, inseminations, calvings } = await getAnimalContext(animalId);

  if (!animal) {
    await ctx.reply("Mol topilmadi. Ehtimol o'chirilgan.", { reply_markup: mainMenu });
    return;
  }

  ctx.session.animalId = animal.id;
  const pending = inseminations.find((i) => i.result === "tekshirilmagan");
  const text = animalCard(animal, inseminations, calvings);
  const kb = animalActions(animal.id, pending?.id ?? null);

  if (edit && ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: kb });
      return;
    } catch {
      // Matn o'zgarmagan bo'lsa Telegram xato beradi — e'tiborsiz qoldiramiz
    }
  }
  await ctx.reply(text, { parse_mode: "HTML", reply_markup: kb });
}

/* ------------------------------------------------------------------ */
/*  Qidirish                                                           */
/* ------------------------------------------------------------------ */

export async function handleSearch(ctx: BotContext, query: string) {
  const rows = await searchAnimals(query, 12);

  if (rows.length === 0) {
    const kb = new InlineKeyboard().text(
      `➕ "${query}" birkali mol qo'shish`,
      `yangi_birka:${query.slice(0, 40)}`,
    );
    await ctx.reply(
      `🔍 <b>${esc(query)}</b> bo'yicha hech narsa topilmadi.\n\n` +
        `Birka raqamini tekshiring yoki yangi mol qo'shing.`,
      { parse_mode: "HTML", reply_markup: kb },
    );
    return;
  }

  // Aniq bitta moslik — darhol kartani ko'rsatamiz
  const exact = rows.filter(
    (r) => r.tag_number.toLowerCase() === query.trim().toLowerCase(),
  );
  if (exact.length === 1) {
    await showAnimal(ctx, exact[0].id);
    return;
  }
  if (rows.length === 1) {
    await showAnimal(ctx, rows[0].id);
    return;
  }

  const kb = new InlineKeyboard();
  for (const r of rows) {
    const meta = categoryMeta(r.category_code);
    kb.text(`${meta.emoji} ${r.tag_number}${r.nickname ? ` — ${r.nickname}` : ""}`,
            `mol:${r.id}`).row();
  }

  await ctx.reply(
    `🔍 <b>${esc(query)}</b> bo'yicha ${rows.length} ta mol topildi.\nBirini tanlang:`,
    { parse_mode: "HTML", reply_markup: kb },
  );
}

/* ------------------------------------------------------------------ */
/*  Ro'yxat                                                            */
/* ------------------------------------------------------------------ */

export async function showCategoryMenu(ctx: BotContext) {
  const counts = await categoryCounts();
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  await ctx.reply(
    `📋 <b>Mollar ro'yxati</b>\nJami: <b>${total}</b> ta faol mol\n\nQaysi turni ko'rmoqchisiz?`,
    { parse_mode: "HTML", reply_markup: listCategoriesKeyboard(counts) },
  );
}

export async function showList(
  ctx: BotContext,
  category: string,
  page: number,
  edit = false,
) {
  const { rows, total } = await listAnimals(
    category === "barchasi" ? null : category,
    page,
    PAGE_SIZE,
  );

  ctx.session.listCategory = category;
  ctx.session.listPage = page;

  const title =
    category === "barchasi"
      ? "🐄 Barcha mollar"
      : `${categoryMeta(category).emoji} ${categoryMeta(category).name}`;

  if (total === 0) {
    const text = `${title}\n\n<i>Bu turda mol yo'q.</i>`;
    const kb = new InlineKeyboard().text("« Turlarga qaytish", "royxat_menyu");
    if (edit) await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: kb });
    else await ctx.reply(text, { parse_mode: "HTML", reply_markup: kb });
    return;
  }

  const pages = Math.ceil(total / PAGE_SIZE);
  const from = page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, total);

  const text =
    `${title}\n` +
    `<i>${from}–${to} / ${total} ta</i>\n\n` +
    rows.map(animalLine).join("\n") +
    `\n\n<i>Ma'lumotini ko'rish uchun birka raqamini yozing.</i>`;

  const kb = new InlineKeyboard();
  if (pages > 1) {
    if (page > 0) kb.text("« Oldingi", `royxat:${category}:${page - 1}`);
    kb.text(`${page + 1}/${pages}`, "hech_narsa");
    if (page < pages - 1) kb.text("Keyingi »", `royxat:${category}:${page + 1}`);
    kb.row();
  }
  kb.text("« Turlarga qaytish", "royxat_menyu");

  if (edit) {
    try {
      await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: kb });
      return;
    } catch {
      /* matn o'zgarmadi */
    }
  }
  await ctx.reply(text, { parse_mode: "HTML", reply_markup: kb });
}

/* ------------------------------------------------------------------ */
/*  Statistika                                                         */
/* ------------------------------------------------------------------ */

export async function showStats(ctx: BotContext) {
  const stats = await getStats();
  if (!stats) {
    await ctx.reply(
      "Statistikani olishda xatolik. Baza sozlanganini tekshiring.",
      { reply_markup: mainMenu },
    );
    return;
  }
  await ctx.reply(statsMessage(stats.summary, stats.counts), {
    parse_mode: "HTML",
    reply_markup: new InlineKeyboard()
      .text("📆 Tug'ish rejasi", "tugish_rejasi")
      .row()
      .text("⚠️ Tekshiruvi kechikkanlar", "kechikkanlar"),
  });
}

/* ------------------------------------------------------------------ */
/*  Tug'ish rejasi va kechikkan tekshiruvlar                           */
/* ------------------------------------------------------------------ */

export async function showUpcoming(ctx: BotContext) {
  const rows = await upcomingCalvings(60);

  if (rows.length === 0) {
    await ctx.reply(
      "🐣 <b>Tug'ish rejasi</b>\n\n<i>Yaqin 60 kunda tug'adigan mol yo'q.</i>\n\n" +
        "Bug'ozligi tasdiqlangan mollar bu yerda ko'rinadi.",
      { parse_mode: "HTML", reply_markup: mainMenu },
    );
    return;
  }

  const lines = rows.map((r) => {
    const left = daysBetween(today(), r.expected_calving_date);
    const warn = left !== null && left <= 14 ? "⚠️ " : "";
    return `${warn}<code>${esc(r.tag_number)}</code> — ${formatDate(
      r.expected_calving_date,
    )} (${left} kun)${r.barn ? ` · ${esc(r.barn)}` : ""}`;
  });

  await ctx.reply(
    `🐣 <b>Tug'ish rejasi</b> — yaqin 60 kun\nJami: <b>${rows.length}</b> ta\n\n` +
      lines.join("\n") +
      `\n\n<i>Batafsil ko'rish uchun birka raqamini yozing.</i>`,
    { parse_mode: "HTML", reply_markup: mainMenu },
  );
}

export async function showOverdue(ctx: BotContext) {
  const rows = await overdueChecks(30);

  if (rows.length === 0) {
    await ctx.reply(
      "✅ Bug'ozlik tekshiruvi kechikkan mol yo'q.",
      { reply_markup: mainMenu },
    );
    return;
  }

  const lines = rows.map((r) => {
    const d = daysBetween(r.last_insemination_date);
    return `<code>${esc(r.tag_number)}</code> — urug': ${formatDate(
      r.last_insemination_date,
    )} (${d} kun oldin)`;
  });

  await ctx.reply(
    `⚠️ <b>Bug'ozligi tekshirilmagan</b>\nUrug' quyilganiga 30 kundan oshgan: <b>${rows.length}</b> ta\n\n` +
      lines.join("\n") +
      `\n\n<i>Tekshirish uchun birka raqamini yozing.</i>`,
    { parse_mode: "HTML", reply_markup: mainMenu },
  );
}

/* ------------------------------------------------------------------ */
/*  Tarix                                                              */
/* ------------------------------------------------------------------ */

export async function showHistory(ctx: BotContext, animalId: string) {
  const { animal, inseminations, calvings, changes } = await getAnimalContext(animalId);
  if (!animal) {
    await ctx.reply("Mol topilmadi.");
    return;
  }
  await ctx.reply(
    historyMessage(animal.tag_number, changes, inseminations, calvings),
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text("« Molga qaytish", `mol:${animal.id}`),
    },
  );
}

/* ------------------------------------------------------------------ */
/*  Bekor qilish                                                       */
/* ------------------------------------------------------------------ */

export async function cancelFlow(ctx: BotContext) {
  const had = ctx.session.flow !== null;
  resetFlow(ctx);
  await ctx.reply(had ? "❌ Bekor qilindi." : "Asosiy menyu.", {
    reply_markup: mainMenu,
  });
}
