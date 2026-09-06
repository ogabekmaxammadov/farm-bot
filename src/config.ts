import "dotenv/config";

function req(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`\n❌ .env faylida "${name}" ko'rsatilmagan.`);
    console.error(`   .env.example faylidan nusxa oling: cp .env.example .env\n`);
    process.exit(1);
  }
  return v;
}

export const BOT_TOKEN = req("BOT_TOKEN");
export const SUPABASE_URL = req("SUPABASE_URL");

/** service_role bo'lsa o'sha, bo'lmasa anon kalit ishlatiladi */
export const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_ANON_KEY?.trim() ||
  req("SUPABASE_ANON_KEY");

/** Botdan foydalana oladigan Telegram ID'lar */
export const OWNER_IDS: number[] = (process.env.OWNER_TELEGRAM_IDS ?? "")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0);

export const IS_OPEN_SETUP = OWNER_IDS.length === 0;
