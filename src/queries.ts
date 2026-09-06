import { db } from "./db.js";
import { normalizeTag, today } from "./domain/utils.js";
import type {
  AnimalFull,
  Calving,
  CategoryChange,
  CategoryCode,
  FarmSummary,
  Insemination,
  InseminationResult,
} from "./domain/types.js";

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(msg: string): Result<never> {
  return { ok: false, error: msg };
}

/** Supabase xatosini tushunarli matnga aylantiradi */
function human(message: string): string {
  if (message.includes("duplicate key") || message.includes("tag_number_key"))
    return "Bu birka nomeri allaqachon ro'yxatda bor.";
  if (message.includes("row-level security"))
    return "Bazaga yozishga ruxsat yo'q. 0003_ochiq_kirish.sql ishga tushirilganini tekshiring.";
  if (message.includes("does not exist"))
    return "Baza jadvallari topilmadi. SQL fayllarni ishga tushiring.";
  return message;
}

/* ------------------------------------------------------------------ */
/*  Qidirish                                                           */
/* ------------------------------------------------------------------ */

/** Birka bo'yicha aniq moslik */
export async function findByTag(tag: string): Promise<AnimalFull | null> {
  const { data } = await db
    .from("v_animals_full")
    .select("*")
    .ilike("tag_number", normalizeTag(tag))
    .limit(1)
    .maybeSingle();
  return (data as AnimalFull) ?? null;
}

/** Birka yoki laqab bo'yicha qidiruv (qismiy moslik) */
export async function searchAnimals(query: string, limit = 10): Promise<AnimalFull[]> {
  const q = query.replace(/[,()*%"\\]/g, "").trim().slice(0, 40);
  if (!q) return [];

  const { data } = await db
    .from("v_animals_full")
    .select("*")
    .or(`tag_number.ilike.*${q}*,nickname.ilike.*${q}*`)
    .order("tag_sort", { ascending: true, nullsFirst: false })
    .order("tag_number", { ascending: true })
    .limit(limit);

  const rows = (data ?? []) as AnimalFull[];
  // Aniq moslikni birinchi o'ringa qo'yamiz
  return rows.sort((a, b) => {
    const ae = a.tag_number.toLowerCase() === q.toLowerCase() ? 0 : 1;
    const be = b.tag_number.toLowerCase() === q.toLowerCase() ? 0 : 1;
    return ae - be;
  });
}

export async function getAnimal(id: string): Promise<AnimalFull | null> {
  const { data } = await db.from("v_animals_full").select("*").eq("id", id).maybeSingle();
  return (data as AnimalFull) ?? null;
}

/** Mol + uning barcha yozuvlari */
export async function getAnimalContext(id: string): Promise<{
  animal: AnimalFull | null;
  inseminations: Insemination[];
  calvings: Calving[];
  changes: CategoryChange[];
}> {
  const [a, ins, calv, ch] = await Promise.all([
    getAnimal(id),
    db.from("inseminations").select("*").eq("animal_id", id)
      .order("insemination_date", { ascending: false }),
    db.from("calvings").select("*").eq("animal_id", id)
      .order("calving_date", { ascending: false }),
    db.from("category_changes").select("*").eq("animal_id", id)
      .order("changed_at", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  return {
    animal: a,
    inseminations: (ins.data ?? []) as Insemination[],
    calvings: (calv.data ?? []) as Calving[],
    changes: (ch.data ?? []) as CategoryChange[],
  };
}

/* ------------------------------------------------------------------ */
/*  Mol qo'shish / tahrirlash                                          */
/* ------------------------------------------------------------------ */

export interface NewAnimalInput {
  tag_number: string;
  category_code: CategoryCode;
  birth_date?: string | null;
  breed?: string | null;
  barn?: string | null;
  nickname?: string | null;
  mother_tag?: string | null;
}

export async function createAnimal(
  input: NewAnimalInput,
  tgId: number,
): Promise<Result<{ id: string }>> {
  const { data, error } = await db
    .from("animals")
    .insert({
      tag_number: normalizeTag(input.tag_number),
      category_code: input.category_code,
      birth_date: input.birth_date || null,
      breed: input.breed || null,
      barn: input.barn || null,
      nickname: input.nickname || null,
      mother_tag: input.mother_tag ? normalizeTag(input.mother_tag) : null,
      created_by_tg: tgId,
    })
    .select("id")
    .single();

  if (error) return fail(human(error.message));

  await db.from("category_changes").insert({
    animal_id: data.id,
    from_category: null,
    to_category: input.category_code,
    reason: "Ro'yxatga olindi (bot)",
    changed_by_tg: tgId,
  });

  return { ok: true, data: { id: data.id } };
}

export async function updateAnimalField(
  id: string,
  field: string,
  value: string | number | null,
): Promise<Result<null>> {
  const { error } = await db.from("animals").update({ [field]: value }).eq("id", id);
  if (error) return fail(human(error.message));
  return { ok: true, data: null };
}

export async function setStatus(
  id: string,
  status: string,
  date: string,
): Promise<Result<null>> {
  const { error } = await db
    .from("animals")
    .update({ status, status_date: date })
    .eq("id", id);
  if (error) return fail(human(error.message));
  return { ok: true, data: null };
}

/* ------------------------------------------------------------------ */
/*  Turni o'zgartirish                                                 */
/* ------------------------------------------------------------------ */

export async function changeCategory(
  animalId: string,
  to: CategoryCode,
  reason: string | null,
  tgId: number,
  changedAt?: string,
): Promise<Result<null>> {
  const { data: current } = await db
    .from("animals")
    .select("category_code")
    .eq("id", animalId)
    .maybeSingle();

  if (!current) return fail("Mol topilmadi.");
  if (current.category_code === to) return { ok: true, data: null };

  const { error } = await db
    .from("animals")
    .update({ category_code: to })
    .eq("id", animalId);
  if (error) return fail(human(error.message));

  const { error: histError } = await db.from("category_changes").insert({
    animal_id: animalId,
    from_category: current.category_code,
    to_category: to,
    changed_at: changedAt || today(),
    reason,
    changed_by_tg: tgId,
  });
  if (histError) {
    return fail(`Tur o'zgardi, ammo tarixga yozilmadi: ${human(histError.message)}`);
  }

  return { ok: true, data: null };
}

/* ------------------------------------------------------------------ */
/*  Urug'lantirish                                                     */
/* ------------------------------------------------------------------ */

export async function addInsemination(
  animalId: string,
  date: string,
  bullCode: string | null,
  tgId: number,
): Promise<Result<{ attempt: number }>> {
  const { count } = await db
    .from("inseminations")
    .select("id", { count: "exact", head: true })
    .eq("animal_id", animalId);

  const attempt = (count ?? 0) + 1;

  const { error } = await db.from("inseminations").insert({
    animal_id: animalId,
    insemination_date: date,
    attempt_no: attempt,
    bull_code: bullCode || null,
    result: "tekshirilmagan",
    created_by_tg: tgId,
  });

  if (error) return fail(human(error.message));
  return { ok: true, data: { attempt } };
}

export async function setInseminationResult(
  inseminationId: string,
  result: InseminationResult,
  checkDate: string,
): Promise<Result<null>> {
  const { error } = await db
    .from("inseminations")
    .update({ result, check_date: checkDate })
    .eq("id", inseminationId);
  if (error) return fail(human(error.message));
  return { ok: true, data: null };
}

/** Tekshirilmagan oxirgi urug'lantirish */
export async function lastUncheckedInsemination(
  animalId: string,
): Promise<Insemination | null> {
  const { data } = await db
    .from("inseminations")
    .select("*")
    .eq("animal_id", animalId)
    .eq("result", "tekshirilmagan")
    .order("insemination_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Insemination) ?? null;
}

/* ------------------------------------------------------------------ */
/*  Tug'ish                                                            */
/* ------------------------------------------------------------------ */

export async function addCalving(
  animalId: string,
  date: string,
  calfTag: string | null,
  calfGender: "urgochi" | "erkak" | null,
  registerCalf: boolean,
  tgId: number,
): Promise<Result<{ lactation: number; calfCreated: boolean }>> {
  const { count } = await db
    .from("calvings")
    .select("id", { count: "exact", head: true })
    .eq("animal_id", animalId);

  const lactation = (count ?? 0) + 1;

  const { error } = await db.from("calvings").insert({
    animal_id: animalId,
    calving_date: date,
    lactation_no: lactation,
    calf_count: 1,
    calf_tag: calfTag || null,
    calf_gender: calfGender,
    difficulty: "oson",
    created_by_tg: tgId,
  });
  if (error) return fail(human(error.message));

  let calfCreated = false;
  if (registerCalf && calfTag) {
    const { data: mother } = await db
      .from("animals")
      .select("tag_number, breed, barn")
      .eq("id", animalId)
      .maybeSingle();

    const { error: calfError } = await db.from("animals").insert({
      tag_number: normalizeTag(calfTag),
      category_code: "sut_buzoq",
      gender: calfGender === "erkak" ? "erkak" : "urgochi",
      birth_date: date,
      breed: mother?.breed ?? null,
      barn: mother?.barn ?? null,
      mother_tag: mother?.tag_number ?? null,
      origin: "fermada_tugilgan",
      created_by_tg: tgId,
    });
    calfCreated = !calfError;
  }

  return { ok: true, data: { lactation, calfCreated } };
}

/* ------------------------------------------------------------------ */
/*  Ro'yxat va statistika                                              */
/* ------------------------------------------------------------------ */

export async function listAnimals(
  category: string | null,
  page: number,
  size = 15,
): Promise<{ rows: AnimalFull[]; total: number }> {
  let q = db
    .from("v_animals_full")
    .select("*", { count: "exact" })
    .eq("status", "faol");

  if (category && category !== "barchasi") q = q.eq("category_code", category);

  const { data, count } = await q
    .order("tag_sort", { ascending: true, nullsFirst: false })
    .order("tag_number", { ascending: true })
    .range(page * size, page * size + size - 1);

  return { rows: (data ?? []) as AnimalFull[], total: count ?? 0 };
}

export async function getStats(): Promise<{
  summary: FarmSummary;
  counts: { code: string; short_name: string; total: number }[];
} | null> {
  const [s, c] = await Promise.all([
    db.rpc("farm_summary"),
    db.from("v_category_counts").select("code, short_name, total").order("sort_order"),
  ]);
  if (s.error) return null;
  return {
    summary: s.data as FarmSummary,
    counts: (c.data ?? []) as { code: string; short_name: string; total: number }[],
  };
}

export async function categoryCounts(): Promise<Map<string, number>> {
  const { data } = await db.from("v_category_counts").select("code, total");
  const map = new Map<string, number>();
  for (const r of (data ?? []) as { code: string; total: number }[]) {
    map.set(r.code, r.total);
  }
  return map;
}

/** Yaqin kunlarda tug'adiganlar */
export async function upcomingCalvings(days = 60): Promise<AnimalFull[]> {
  const until = new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
  const { data } = await db
    .from("v_animals_full")
    .select("*")
    .eq("status", "faol")
    .not("expected_calving_date", "is", null)
    .gte("expected_calving_date", today())
    .lte("expected_calving_date", until)
    .order("expected_calving_date", { ascending: true })
    .limit(40);
  return (data ?? []) as AnimalFull[];
}

/** Bug'ozligi tekshirilmagan, muddati o'tganlar */
export async function overdueChecks(minDays = 30): Promise<AnimalFull[]> {
  const cutoff = new Date(Date.now() - minDays * 864e5).toISOString().slice(0, 10);
  const { data } = await db
    .from("v_animals_full")
    .select("*")
    .eq("status", "faol")
    .in("category_code", ["urugli_tekshirilmagan_sigir", "urugli_tekshirilmagan_tana"])
    .lte("last_insemination_date", cutoff)
    .order("last_insemination_date", { ascending: true })
    .limit(40);
  return (data ?? []) as AnimalFull[];
}
