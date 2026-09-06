// =====================================================
//  Baza tiplari — sayt bilan bir xil sxema
//  (farm site/src/lib/types.ts bilan mos bo'lishi kerak)
// =====================================================

export type CategoryCode =
  | "sut_buzoq"
  | "bugoz_bolmagan_tana"
  | "urugli_tekshirilmagan_tana"
  | "bugoz_tana"
  | "qisir_tana"
  | "urugli_tekshirilmagan_sigir"
  | "sut_bugoz_sigir"
  | "sut_qisir_sigir"
  | "sutsiz_bugoz_sigir";

export type AnimalStatus = "faol" | "sotilgan" | "olgan" | "suyilgan";
export type Gender = "urgochi" | "erkak";
export type Origin = "fermada_tugilgan" | "sotib_olingan";
export type InseminationResult =
  | "tekshirilmagan"
  | "bugoz"
  | "bugoz_emas"
  | "bola_tashladi";
export type CalvingDifficulty =
  | "oson"
  | "ortacha"
  | "ogir"
  | "kesar"
  | "olik_tugildi";

export interface Animal {
  id: string;
  tag_number: string;
  nickname: string | null;
  category_code: CategoryCode;
  gender: Gender;
  birth_date: string | null;
  breed: string | null;
  color_mark: string | null;
  mother_tag: string | null;
  father_code: string | null;
  origin: Origin;
  arrival_date: string | null;
  barn: string | null;
  pen_group: string | null;
  birth_weight: number | null;
  current_weight: number | null;
  status: AnimalStatus;
  status_date: string | null;
  status_note: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** v_animals_full ko'rinishi — mol + hisoblangan ko'rsatkichlar */
export interface AnimalFull extends Animal {
  category_name: string;
  category_short: string;
  category_sort: number;
  category_is_milking: boolean;
  category_is_pregnant: boolean;
  category_is_young: boolean;
  insemination_count: number;
  calving_count: number;
  last_insemination_date: string | null;
  last_calving_date: string | null;
  expected_calving_date: string | null;
  age_days: number | null;
  tag_sort: number | null;
}

export interface Insemination {
  id: string;
  animal_id: string;
  insemination_date: string;
  attempt_no: number | null;
  bull_code: string | null;
  technician: string | null;
  method: "sunniy" | "tabiiy";
  result: InseminationResult;
  check_date: string | null;
  expected_calving_date: string | null;
  notes: string | null;
}

export interface Calving {
  id: string;
  animal_id: string;
  calving_date: string;
  lactation_no: number | null;
  calf_count: number;
  calf_tag: string | null;
  calf_gender: "urgochi" | "erkak" | "aralash" | null;
  calf_weight: number | null;
  difficulty: CalvingDifficulty;
  notes: string | null;
}

export interface CategoryChange {
  id: string;
  animal_id: string;
  from_category: CategoryCode | null;
  to_category: CategoryCode;
  changed_at: string;
  reason: string | null;
}

export interface FarmSummary {
  total: number;
  milking: number;
  pregnant: number;
  young: number;
  inactive: number;
  added_this_month: number;
  calvings_30d: number;
  inseminations_30d: number;
  due_30d: number;
  uncheked_ins: number;
}
