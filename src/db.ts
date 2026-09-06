import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./config.js";

export const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Xato matnini tushunarli yo'riqnomaga aylantiradi */
function explain(raw: string): string {
  const m = raw.toLowerCase();

  if (
    m.includes("fetch failed") ||
    m.includes("enotfound") ||
    m.includes("econnrefused") ||
    m.includes("network")
  ) {
    return (
      "Supabase serveriga ulanib bo'lmadi.\n" +
      "   • Internet aloqasini tekshiring\n" +
      "   • .env faylidagi SUPABASE_URL to'g'riligiga ishonch hosil qiling\n" +
      `   • Hozirgi manzil: ${SUPABASE_URL}`
    );
  }
  if (m.includes("does not exist") || m.includes("not find the table")) {
    return (
      "Baza jadvallari topilmadi.\n" +
      "   Supabase SQL Editor'da quyidagilarni ishga tushiring:\n" +
      "     1) farm site/supabase/migrations/0001_init.sql\n" +
      "     2) farm site/supabase/migrations/0003_ochiq_kirish.sql"
    );
  }
  if (m.includes("jwt") || m.includes("api key") || m.includes("invalid authentication")) {
    return (
      "Supabase kaliti noto'g'ri.\n" +
      "   .env faylidagi SUPABASE_ANON_KEY qiymatini tekshiring\n" +
      "   (Supabase -> Project Settings -> API)."
    );
  }
  if (m.includes("permission") || m.includes("row-level security")) {
    return (
      "Bazaga kirishga ruxsat yo'q.\n" +
      "   0003_ochiq_kirish.sql faylini ishga tushiring."
    );
  }
  return raw;
}

/** Bazaga ulanishni tekshiradi. Hammasi joyida bo'lsa null qaytaradi. */
export async function checkConnection(): Promise<string | null> {
  try {
    const { error } = await db.from("cattle_categories").select("code").limit(1);
    return error ? explain(error.message) : null;
  } catch (e) {
    return explain(e instanceof Error ? e.message : String(e));
  }
}
