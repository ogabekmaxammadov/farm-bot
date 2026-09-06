import type { Context, SessionFlavor } from "grammy";

/** Ko'p bosqichli jarayonlar (formalar) */
export type Flow =
  | "yangi_mol"
  | "qidirish"
  | "tahrirlash"
  | "tur"
  | "urug"
  | "tugish"
  | "holat";

export interface SessionData {
  /** Joriy jarayon (null — menyu holatida) */
  flow: Flow | null;
  /** Joriy jarayondagi qadam */
  step: string | null;
  /** Jarayon davomida yig'ilayotgan ma'lumotlar */
  data: Record<string, any>;
  /** Oxirgi ko'rilgan mol — inline tugmalar shu bilan ishlaydi */
  animalId: string | null;
  /** Ro'yxat sahifasi */
  listPage: number;
  listCategory: string | null;
}

export function initialSession(): SessionData {
  return {
    flow: null,
    step: null,
    data: {},
    animalId: null,
    listPage: 0,
    listCategory: null,
  };
}

export type BotContext = Context & SessionFlavor<SessionData>;

/** Jarayonni tugatib, menyuga qaytaradi */
export function resetFlow(ctx: BotContext) {
  ctx.session.flow = null;
  ctx.session.step = null;
  ctx.session.data = {};
}
