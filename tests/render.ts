import { animalCard, animalLine, statsMessage, historyMessage, HELP_TEXT } from "../src/format.js";
import { animalActions, categoryKeyboard, listCategoriesKeyboard, editFieldsKeyboard, checkResultKeyboard, mainMenu } from "../src/keyboards.js";
import { addDays, today } from "../src/domain/utils.js";
import type { AnimalFull, Calving, CategoryChange, Insemination } from "../src/domain/types.js";

let fail = 0;
function check(name: string, fn: () => string | void) {
  try {
    const out = fn();
    if (typeof out === "string" && out.includes("undefined")) {
      console.log(`  ❌ ${name}: matnda "undefined" bor`);
      fail++;
      return;
    }
    console.log(`  ✅ ${name}`);
  } catch (e) {
    console.log(`  ❌ ${name}: ${e instanceof Error ? e.message : e}`);
    fail++;
  }
}

const base: AnimalFull = {
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  tag_number: "1234", nickname: null, category_code: "sut_bugoz_sigir",
  gender: "urgochi", birth_date: addDays(today(), -1800), breed: "Golshtin",
  color_mark: null, mother_tag: null, father_code: null, origin: "fermada_tugilgan",
  arrival_date: null, barn: "2-molxona", pen_group: null, birth_weight: null,
  current_weight: 540, status: "faol", status_date: null, status_note: null,
  notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  category_name: "Sut beradigan bug'oz sigir", category_short: "Sutli bug'oz",
  category_sort: 70, category_is_milking: true, category_is_pregnant: true,
  category_is_young: false, insemination_count: 3, calving_count: 2,
  last_insemination_date: addDays(today(), -100), last_calving_date: addDays(today(), -200),
  expected_calving_date: addDays(today(), 183), age_days: 1800, tag_sort: 1234,
};

const ins: Insemination[] = [{
  id: "i1", animal_id: base.id, insemination_date: addDays(today(), -100),
  attempt_no: 3, bull_code: "HOL-2291", technician: null, method: "sunniy",
  result: "bugoz", check_date: addDays(today(), -60),
  expected_calving_date: addDays(today(), 183), notes: null,
}];
const calv: Calving[] = [{
  id: "c1", animal_id: base.id, calving_date: addDays(today(), -200),
  lactation_no: 2, calf_count: 1, calf_tag: "5678", calf_gender: "urgochi",
  calf_weight: 38, difficulty: "oson", notes: null,
}];
const changes: CategoryChange[] = [{
  id: "h1", animal_id: base.id, from_category: "urugli_tekshirilmagan_sigir",
  to_category: "sut_bugoz_sigir", changed_at: addDays(today(), -60),
  reason: "Bug'ozligi tasdiqlandi",
}];

console.log("=== KARTA RENDERI ===");
check("to'liq mol kartasi", () => animalCard(base, ins, calv));
check("bo'sh mol (faqat birka)", () => animalCard(
  { ...base, birth_date: null, breed: null, barn: null, current_weight: null,
    expected_calving_date: null, last_calving_date: null, last_insemination_date: null,
    insemination_count: 0, calving_count: 0 }, [], []));
check("sotilgan mol", () => animalCard({ ...base, status: "sotilgan", status_date: today() }, ins, calv));
check("buzoq (6 oydan katta — ogohlantirish)", () => animalCard(
  { ...base, category_code: "sut_buzoq", birth_date: addDays(today(), -220) }, [], []));
check("tekshiruvi kechikkan", () => animalCard(
  { ...base, category_code: "urugli_tekshirilmagan_sigir" },
  [{ ...ins[0], result: "tekshirilmagan", check_date: null,
     insemination_date: addDays(today(), -45), expected_calving_date: null }], []));
check("tug'ish muddati o'tgan", () => animalCard(
  base, [{ ...ins[0], expected_calving_date: addDays(today(), -5) }], calv));
check("HTML belgili laqab", () => animalCard({ ...base, nickname: "<Mar&jona>" }, ins, calv));

console.log("\n=== RO'YXAT QATORI ===");
check("oddiy qator", () => animalLine(base));
check("sanasiz qator", () => animalLine({ ...base, birth_date: null, barn: null }));

console.log("\n=== STATISTIKA ===");
check("statistika", () => statsMessage(
  { total: 3124, milking: 980, pregnant: 610, young: 1500, inactive: 44,
    added_this_month: 12, calvings_30d: 31, inseminations_30d: 58, due_30d: 27, uncheked_ins: 9 },
  [{ code: "sut_buzoq", short_name: "Sut buzoq", total: 400 },
   { code: "bugoz_tana", short_name: "Bug'oz tana", total: 210 }]));
check("bo'sh ferma", () => statsMessage(
  { total: 0, milking: 0, pregnant: 0, young: 0, inactive: 0, added_this_month: 0,
    calvings_30d: 0, inseminations_30d: 0, due_30d: 0, uncheked_ins: 0 }, []));

console.log("\n=== TARIX ===");
check("to'liq tarix", () => historyMessage("1234", changes, ins, calv));
check("bo'sh tarix", () => historyMessage("1234", [], [], []));

console.log("\n=== KLAVIATURALAR ===");
check("mol amallari", () => { animalActions(base.id); });
check("mol amallari + tekshirish", () => { animalActions(base.id, "i1"); });
check("turlar (tavsiya bilan)", () => { categoryKeyboard("turgacha", "bugoz_tana"); });
check("turlar (tavsiyasiz)", () => { categoryKeyboard("yangikat"); });
check("ro'yxat menyusi", () => { listCategoriesKeyboard(new Map([["sut_buzoq", 5]])); });
check("tahrirlash maydonlari", () => { editFieldsKeyboard(base.id); });
check("tekshiruv natijasi", () => { checkResultKeyboard("i1"); });
check("asosiy menyu", () => { mainMenu.toString(); });

console.log("\n=== TELEGRAM CHEGARALARI ===");
const cardLen = animalCard(base, ins, calv).length;
check(`karta uzunligi ${cardLen} < 4096`, () => { if (cardLen > 4096) throw new Error("juda uzun"); });
check(`yordam uzunligi ${HELP_TEXT.length} < 4096`, () => { if (HELP_TEXT.length > 4096) throw new Error("juda uzun"); });
const cbLens = [`urug:${base.id}`, `natija:i1:bola_tashladi`, `royxat:urugli_tekshirilmagan_sigir:99`];
for (const cb of cbLens) {
  check(`callback_data "${cb.slice(0, 24)}…" = ${Buffer.byteLength(cb)}b < 64`, () => {
    if (Buffer.byteLength(cb) > 64) throw new Error("juda uzun");
  });
}

console.log(`\n${fail === 0 ? "✅ Hammasi joyida" : `❌ ${fail} ta xato`}`);
process.exit(fail ? 1 : 0);
