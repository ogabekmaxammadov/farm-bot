import { parseUserDate, calcAge, addDays, today, formatDate, esc } from "../src/domain/utils.js";
import { afterInsemination, afterPregnancyCheck, afterCalving, categoryMeta } from "../src/domain/constants.js";

let pass = 0, fail = 0;
function t(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; }
  else { fail++; console.log(`  ❌ ${name}\n     kutilgan: ${JSON.stringify(expected)}\n     olingan:  ${JSON.stringify(actual)}`); }
}

const now = new Date();
const Y = now.getFullYear();

console.log("=== SANA TAHLILI ===");
t("bugun", parseUserDate("bugun"), today());
t("BUGUN (katta harf)", parseUserDate("BUGUN"), today());
t("kecha", parseUserDate("kecha"), addDays(today(), -1));
t("15.03.2024", parseUserDate("15.03.2024"), "2024-03-15");
t("15/03/2024", parseUserDate("15/03/2024"), "2024-03-15");
t("15-03-2024", parseUserDate("15-03-2024"), "2024-03-15");
t("15.03.24", parseUserDate("15.03.24"), "2024-03-15");
t("2024-03-15", parseUserDate("2024-03-15"), "2024-03-15");
t("5.3.2024 (bir xonali)", parseUserDate("5.3.2024"), "2024-03-05");
t("10 kun oldin", parseUserDate("10 kun oldin"), addDays(today(), -10));
t("10 kun", parseUserDate("10 kun"), addDays(today(), -10));
t("  bugun  (bo'sh joy)", parseUserDate("  bugun  "), today());
t("noto'g'ri matn", parseUserDate("salom"), null);
t("32.01.2024 (yo'q kun)", parseUserDate("32.01.2024"), null);
t("15.13.2024 (yo'q oy)", parseUserDate("15.13.2024"), null);
t("29.02.2023 (kabisa emas)", parseUserDate("29.02.2023"), null);
t("29.02.2024 (kabisa)", parseUserDate("29.02.2024"), "2024-02-29");
t("bo'sh", parseUserDate(""), null);

// "15.03" — joriy yil, agar kelajakda bo'lsa o'tgan yil
const dm = parseUserDate("15.03")!;
t("15.03 kelajakda emas", dm <= today(), true);
t("15.03 mart oyi", dm.slice(5, 7), "03");

console.log("\n=== YOSH HISOBI ===");
t("120 kunlik", calcAge(addDays(today(), -120))?.totalDays, 120);
t("1 kunlik label", calcAge(addDays(today(), -1))?.label, "1 kun");
const y2 = calcAge(addDays(today(), -730));
t("730 kun = 730 kun", y2!.totalDays, 730);
t("730 kun ~ 1-2 yosh", y2!.years === 1 || y2!.years === 2, true);
// Oy chegarasi: 31-yanvardan keyingi oy
t("31.01.2024 dan 1 oy", calcAge("2024-01-31") !== null, true);
t("kelajak sana -> null", calcAge(addDays(today(), 5)), null);
t("sana yo'q -> null", calcAge(null), null);

console.log("\n=== TUR O'TISHLARI ===");
t("tana urug'landi", afterInsemination("bugoz_bolmagan_tana"), "urugli_tekshirilmagan_tana");
t("sutli sigir urug'landi", afterInsemination("sut_qisir_sigir"), "urugli_tekshirilmagan_sigir");
t("buzoq urug'lanmaydi", afterInsemination("sut_buzoq"), null);
t("tana bug'oz chiqdi", afterPregnancyCheck("urugli_tekshirilmagan_tana", "bugoz", 1), "bugoz_tana");
t("sigir bug'oz chiqdi", afterPregnancyCheck("urugli_tekshirilmagan_sigir", "bugoz", 1), "sut_bugoz_sigir");
t("tana 1-urinish bo'sh", afterPregnancyCheck("urugli_tekshirilmagan_tana", "bugoz_emas", 1), "bugoz_bolmagan_tana");
t("tana 2-urinish bo'sh -> qisir", afterPregnancyCheck("urugli_tekshirilmagan_tana", "bugoz_emas", 2), "qisir_tana");
t("sigir bo'sh -> sutli qisir", afterPregnancyCheck("urugli_tekshirilmagan_sigir", "bugoz_emas", 3), "sut_qisir_sigir");
t("bug'oz tana tug'di", afterCalving("bugoz_tana"), "sut_qisir_sigir");
t("buzoq tug'maydi", afterCalving("sut_buzoq"), null);

console.log("\n=== BOSHQA ===");
t("noma'lum tur xavfsiz", categoryMeta("yoq_narsa").emoji, "⚫");
t("HTML qochirish", esc("<b>&x</b>"), "&lt;b&gt;&amp;x&lt;/b&gt;");
t("sana formati", formatDate("2024-03-05"), "05.03.2024");
t("bo'sh sana", formatDate(null), "—");

console.log(`\n${fail === 0 ? "✅" : "❌"} ${pass} ta o'tdi, ${fail} ta xato`);
process.exit(fail ? 1 : 0);
