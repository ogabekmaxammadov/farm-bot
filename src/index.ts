import { Bot, GrammyError, HttpError, session } from "grammy";
import { BOT_TOKEN, IS_OPEN_SETUP, OWNER_IDS } from "./config.js";
import { checkConnection } from "./db.js";
import { initialSession, resetFlow, type BotContext, type SessionData } from "./session.js";
import { BTN, checkResultKeyboard, mainMenu } from "./keyboards.js";
import { HELP_TEXT } from "./format.js";
import { esc } from "./domain/utils.js";
import {
  cancelFlow,
  handleSearch,
  showAnimal,
  showCategoryMenu,
  showHistory,
  showList,
  showOverdue,
  showStats,
  showUpcoming,
} from "./handlers.js";
import {
  applyAutoCategory,
  applyCheckResult,
  applyStatus,
  askFieldValue,
  handleFlowText,
  newAnimalCategoryChosen,
  saveCalving,
  startCalving,
  startEdit,
  startInsemination,
  startNewAnimal,
  startTransfer,
  transferCategoryChosen,
} from "./forms.js";

const bot = new Bot<BotContext>(BOT_TOKEN);

/* ------------------------------------------------------------------ */
/*  Sessiya                                                            */
/* ------------------------------------------------------------------ */

bot.use(
  session<SessionData, BotContext>({
    initial: initialSession,
    getSessionKey: (ctx) => ctx.from?.id.toString(),
  }),
);

/* ------------------------------------------------------------------ */
/*  Kirish nazorati — faqat ega(lar)                                   */
/* ------------------------------------------------------------------ */

bot.use(async (ctx, next) => {
  const id = ctx.from?.id;
  if (!id) return;

  if (IS_OPEN_SETUP) {
    console.log(`\n🔑 Botga murojaat qildi: ${ctx.from?.first_name} — Telegram ID: ${id}`);
    await ctx.reply(
      `👋 Salom!\n\nBot hali sozlanmagan.\n\n` +
        `Sizning Telegram ID'ingiz: <code>${id}</code>\n\n` +
        `Uni <code>.env</code> faylidagi <code>OWNER_TELEGRAM_IDS</code> qatoriga ` +
        `qo'ying va botni qayta ishga tushiring.`,
      { parse_mode: "HTML" },
    );
    return;
  }

  if (!OWNER_IDS.includes(id)) {
    console.warn(`⛔️ Ruxsatsiz urinish: ${ctx.from?.first_name} (ID: ${id})`);
    await ctx.reply("⛔️ Bu bot shaxsiy. Sizda foydalanish huquqi yo'q.");
    return;
  }

  await next();
});

/* ------------------------------------------------------------------ */
/*  Buyruqlar                                                          */
/* ------------------------------------------------------------------ */

bot.command("start", async (ctx) => {
  resetFlow(ctx);
  await ctx.reply(
    `🐄 <b>Ferma boshqaruv boti</b>\n\n` +
      `Podangizni shu yerdan boshqaring — mol qo'shing, ma'lumotini ko'ring, ` +
      `urug'lantirish va tug'ishni qayd eting.\n\n` +
      `💡 <b>Eng tez yo'l:</b> birka raqamini yozing, masalan <code>1234</code>\n\n` +
      `Quyidagi tugmalardan foydalaning yoki /yordam ni bosing.`,
    { parse_mode: "HTML", reply_markup: mainMenu },
  );
});

bot.command(["yordam", "help"], async (ctx) => {
  await ctx.reply(HELP_TEXT, { parse_mode: "HTML", reply_markup: mainMenu });
});

bot.command(["bekor", "cancel"], cancelFlow);
bot.command(["yangi", "yangimol"], (ctx) => startNewAnimal(ctx));
bot.command("tahrirlash", (ctx) => startEdit(ctx));
bot.command(["royxat", "list"], showCategoryMenu);
bot.command(["statistika", "stat"], showStats);
bot.command("tugish", showUpcoming);

bot.command(["qidirish", "qidir"], async (ctx) => {
  const arg = ctx.match?.trim();
  if (arg) {
    await handleSearch(ctx, arg);
    return;
  }
  resetFlow(ctx);
  ctx.session.flow = "qidirish";
  await ctx.reply("🔍 Birka nomeri yoki laqabni yuboring:", { reply_markup: mainMenu });
});

/* ------------------------------------------------------------------ */
/*  Inline tugmalar                                                    */
/* ------------------------------------------------------------------ */

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const [action, ...rest] = data.split(":");
  const arg = rest.join(":");

  // Telegram "soat"ini darhol to'xtatamiz
  await ctx.answerCallbackQuery().catch(() => {});

  switch (action) {
    case "mol":
      await showAnimal(ctx, arg, true);
      break;

    case "urug":
      await startInsemination(ctx, arg);
      break;

    case "tugish":
      await startCalving(ctx, arg);
      break;

    case "tur":
      await startTransfer(ctx, arg);
      break;

    case "tahrir":
      await startEdit(ctx, arg);
      break;

    case "tarix":
      await showHistory(ctx, arg);
      break;

    case "tekshir": {
      await ctx.reply("🔬 Bug'ozlik tekshiruvi natijasi qanday?", {
        reply_markup: checkResultKeyboard(arg),
      });
      break;
    }

    case "natija": {
      const [insId, result] = arg.split(":");
      await applyCheckResult(ctx, insId, result as never);
      break;
    }

    case "yangikat":
      await newAnimalCategoryChosen(ctx, arg);
      break;

    case "turgacha":
      await transferCategoryChosen(ctx, arg);
      break;

    case "maydon":
      await askFieldValue(ctx, arg);
      break;

    case "holat":
      await applyStatus(ctx, arg);
      break;

    case "avtotur":
      await applyAutoCategory(ctx, arg);
      break;

    case "buzoq": {
      if (arg === "yoq") await saveCalving(ctx, null, false);
      else await saveCalving(ctx, arg as "urgochi" | "erkak", true);
      break;
    }

    case "royxat": {
      const [cat, page] = arg.split(":");
      await showList(ctx, cat, Number(page) || 0, true);
      break;
    }

    case "royxat_menyu":
      await showCategoryMenu(ctx);
      break;

    case "tugish_rejasi":
      await showUpcoming(ctx);
      break;

    case "kechikkanlar":
      await showOverdue(ctx);
      break;

    case "yangi_birka":
      await startNewAnimal(ctx, arg);
      break;

    case "bekor":
      await cancelFlow(ctx);
      break;

    case "hech_narsa":
      break;

    default:
      await ctx.reply("Bu tugma endi ishlamaydi. /start ni bosing.");
  }
});

/* ------------------------------------------------------------------ */
/*  Matnli xabarlar                                                    */
/* ------------------------------------------------------------------ */

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();

  // 1) Bekor qilish tugmasi — har qanday holatda ishlaydi
  if (text === "❌ Bekor qilish") {
    await cancelFlow(ctx);
    return;
  }

  // 2) Menyu tugmalari — jarayonni to'xtatib, yangisini boshlaydi
  switch (text) {
    case BTN.yangi:
      await startNewAnimal(ctx);
      return;
    case BTN.qidirish:
      resetFlow(ctx);
      ctx.session.flow = "qidirish";
      await ctx.reply("🔍 Birka nomeri yoki laqabni yuboring:", {
        reply_markup: mainMenu,
      });
      return;
    case BTN.royxat:
      resetFlow(ctx);
      await showCategoryMenu(ctx);
      return;
    case BTN.statistika:
      resetFlow(ctx);
      await showStats(ctx);
      return;
    case BTN.tugish:
      resetFlow(ctx);
      await showUpcoming(ctx);
      return;
    case BTN.yordam:
      resetFlow(ctx);
      await ctx.reply(HELP_TEXT, { parse_mode: "HTML", reply_markup: mainMenu });
      return;
  }

  // 3) Joriy jarayon matnni kutayotgan bo'lsa — unga beramiz
  if (ctx.session.flow === "qidirish") {
    resetFlow(ctx);
    await handleSearch(ctx, text);
    return;
  }

  if (await handleFlowText(ctx, text)) return;

  // 4) Aks holda — qidiruv deb qabul qilamiz
  await handleSearch(ctx, text);
});

/* ------------------------------------------------------------------ */
/*  Xatolarni ushlash                                                  */
/* ------------------------------------------------------------------ */

bot.catch(async (err) => {
  const ctx = err.ctx;
  const e = err.error;

  if (e instanceof GrammyError) {
    console.error("Telegram xatosi:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Tarmoq xatosi:", e);
  } else {
    console.error("Kutilmagan xato:", e);
  }

  try {
    await ctx.reply(
      "⚠️ Xatolik yuz berdi. Qaytadan urinib ko'ring yoki /start ni bosing.",
      { reply_markup: mainMenu },
    );
  } catch {
    /* javob berib bo'lmadi */
  }
});

/* ------------------------------------------------------------------ */
/*  Ishga tushirish                                                    */
/* ------------------------------------------------------------------ */

async function main() {
  console.log("🔌 Bazaga ulanmoqda…");
  const dbError = await checkConnection();
  if (dbError) {
    console.error(`\n❌ Baza xatosi: ${dbError}\n`);
    process.exit(1);
  }
  console.log("✅ Baza ulandi.");

  await bot.api.setMyCommands([
    { command: "start", description: "Boshlash" },
    { command: "qidirish", description: "Mol qidirish (birka bo'yicha)" },
    { command: "yangi", description: "Yangi mol qo'shish" },
    { command: "tahrirlash", description: "Molni tahrirlash" },
    { command: "royxat", description: "Mollar ro'yxati" },
    { command: "statistika", description: "Ferma holati" },
    { command: "tugish", description: "Tug'ish rejasi" },
    { command: "bekor", description: "Joriy amalni bekor qilish" },
    { command: "yordam", description: "Yordam" },
  ]);

  if (IS_OPEN_SETUP) {
    console.warn(
      "\n⚠️  OWNER_TELEGRAM_IDS bo'sh. Bot hech kimni ichkariga qo'ymaydi,\n" +
        "   lekin yozgan odamning ID'sini ko'rsatadi. Uni .env ga qo'ying.\n",
    );
  } else {
    console.log(`👤 Ruxsat berilgan ID(lar): ${OWNER_IDS.join(", ")}`);
  }

  await bot.start({
    onStart: (info) => console.log(`🤖 @${info.username} ishga tushdi. To'xtatish: Ctrl+C`),
  });
}

// Silliq to'xtash
process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());

main().catch((e) => {
  console.error("Botni ishga tushirib bo'lmadi:", e);
  process.exit(1);
});
