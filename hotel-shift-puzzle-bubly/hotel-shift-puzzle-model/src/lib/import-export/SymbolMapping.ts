/**
 * SymbolMapping — 記号↔ドメイン概念の変換テーブル
 *
 * Excelの勤務表で使われる記号（「週」「年」「B」「①」など）と、
 * ドメインの概念（DAY_OFF・シフト希望のオプションキー）を対応づける。
 *
 * 形態（StoreFormat）がデフォルトのテーブルを出し、課（Store）ごとに独自版を持てる。
 * 将来的にはUIで記号の追加・編集・削除ができるようにする。
 *
 * state は SymbolEntryPlain[] で、子を持たない平坦な構造なので state がそのまま plain を兼ねる。
 * 不変。更新メソッドは新しいインスタンスを返す。
 */

import type { ShiftWishPreference } from "../schedule/StaffMonthlyShiftWish.js";

// ========== 記号の解釈結果 ==========

/**
 * 記号を解釈した結果。3種類:
 *   - confirmed-day-off: 確定した休み（週休・祝日）→ ShiftAssignment に DAY_OFF
 *   - wish: 希望 → StaffMonthlyShiftWish に入れる
 *   - empty: 空欄（希望なし）→ 何もしない
 */
export type SymbolInterpretation =
  | { kind: "confirmed-day-off"; reason: ConfirmedDayOffReason }
  | { kind: "wish"; options: WishOption[] }
  | { kind: "empty" };

/** 確定休みの理由（集計で区別するため。schedule/dayOffReason の DayOffReason とは別） */
export type ConfirmedDayOffReason = "weekly" | "holiday";

/** 1つの希望オプション */
export type WishOption = {
  optionKey: string;
  preference: ShiftWishPreference;
};

// ========== 記号定義（plain = state。子を持たないのでそのまま） ==========

export type SymbolEntryPlain = {
  /** Excel上の記号（"週"、"年"、"B"、"①or②" など） */
  symbol: string;
  /** 解釈 */
  interpretation: SymbolInterpretation;
  /** 人が読む説明 */
  label: string;
};

/** @deprecated SymbolEntryPlain を使う */
export type SymbolEntry = SymbolEntryPlain;

// ========== state ==========

export type SymbolMappingState = {
  entries: SymbolEntryPlain[];
};

/** シリアライズ用（state がそのまま plain） */
export type SymbolMappingPlain = SymbolMappingState;

// ========== SymbolMapping ==========

export class SymbolMapping {
  private readonly bySymbol: ReadonlyMap<string, SymbolEntryPlain>;

  constructor(readonly state: SymbolMappingState) {
    const map = new Map<string, SymbolEntryPlain>();
    for (const entry of state.entries) {
      map.set(entry.symbol, entry);
    }
    this.bySymbol = map;
  }

  get entries(): readonly SymbolEntryPlain[] {
    return this.state.entries;
  }

  // ========== 読み取り ==========

  /** 記号を解釈する。見つからなければ undefined */
  interpret(symbol: string): SymbolInterpretation | undefined {
    return this.bySymbol.get(symbol.trim())?.interpretation;
  }

  /** 確定休みの記号か */
  isConfirmedDayOff(symbol: string): boolean {
    const interp = this.interpret(symbol);
    return interp?.kind === "confirmed-day-off";
  }

  /** 空欄か */
  isEmpty(symbol: string): boolean {
    return symbol.trim() === "" || this.interpret(symbol)?.kind === "empty";
  }

  /**
   * ドメインの値から記号へ逆引き（エクスポート用）。
   * 確定休みは reason で、希望は optionKey で探す。
   * 見つからなければ undefined。
   */
  symbolForDayOff(reason: ConfirmedDayOffReason): string | undefined {
    for (const entry of this.state.entries) {
      if (
        entry.interpretation.kind === "confirmed-day-off" &&
        entry.interpretation.reason === reason
      ) {
        return entry.symbol;
      }
    }
    return undefined;
  }

  symbolForWish(optionKey: string): string | undefined {
    for (const entry of this.state.entries) {
      if (
        entry.interpretation.kind === "wish" &&
        entry.interpretation.options.length === 1 &&
        entry.interpretation.options[0].optionKey === optionKey
      ) {
        return entry.symbol;
      }
    }
    return undefined;
  }

  // ========== 更新（不変。新インスタンスを返す） ==========

  /** 記号を追加する。同じ symbol がすでにあれば上書き */
  addEntry(entry: SymbolEntryPlain): SymbolMapping {
    const filtered = this.state.entries.filter((e) => e.symbol !== entry.symbol);
    return new SymbolMapping({ entries: [...filtered, entry] });
  }

  /** 記号を削除する */
  removeEntry(symbol: string): SymbolMapping {
    return new SymbolMapping({
      entries: this.state.entries.filter((e) => e.symbol !== symbol),
    });
  }

  /** 記号の解釈やラベルを更新する */
  updateEntry(
    symbol: string,
    update: Partial<Omit<SymbolEntryPlain, "symbol">>,
  ): SymbolMapping {
    return new SymbolMapping({
      entries: this.state.entries.map((e) =>
        e.symbol === symbol ? { ...e, ...update } : e,
      ),
    });
  }

  // ========== シリアライズ ==========

  toPlain(): SymbolMappingPlain {
    return {
      entries: this.state.entries.map((e) => ({
        symbol: e.symbol,
        interpretation: e.interpretation,
        label: e.label,
      })),
    };
  }

  static fromPlain(plain: SymbolMappingPlain): SymbolMapping {
    return new SymbolMapping({ entries: plain.entries ?? [] });
  }
}

// ========== 行政版の記号テーブル（形態のデフォルト） ==========

const want = (optionKey: string): WishOption => ({
  optionKey,
  preference: "want",
});

export const GOVERNMENT_SYMBOL_ENTRIES: readonly SymbolEntryPlain[] = [
  // 休みの希望 — optionKey は "day-off:<reason>" 形式（shiftWishOptions の dayOffWishKey と同じ）。
  // <reason> は DayOffType の shortName に合わせる。
  // インポート時はすべて希望として読み込む（確定ではない）。シフト作成者が週休・祝日の日にも
  // 別の勤務帯を入れるケースがあるため。
  {
    symbol: "週",
    interpretation: { kind: "wish", options: [want("day-off:週")] },
    label: "週休",
  },
  {
    symbol: "祝",
    interpretation: { kind: "wish", options: [want("day-off:祝")] },
    label: "祝日",
  },
  {
    symbol: "休",
    interpretation: { kind: "wish", options: [want("day-off:休")] },
    label: "休暇",
  },
  {
    symbol: "年",
    interpretation: { kind: "wish", options: [want("day-off:年")] },
    label: "年次有給休暇",
  },
  {
    symbol: "PM年",
    interpretation: { kind: "wish", options: [want("day-off:PM年")] },
    label: "午後年休",
  },
  {
    symbol: "AM年",
    interpretation: { kind: "wish", options: [want("day-off:AM年")] },
    label: "午前年休",
  },
  {
    symbol: "介護",
    interpretation: { kind: "wish", options: [want("day-off:介護")] },
    label: "介護休暇",
  },
  {
    symbol: "特休",
    interpretation: { kind: "wish", options: [want("day-off:特休")] },
    label: "特別休暇",
  },
  // 勤務帯の希望（単一）— optionKey は "work:<勤務帯名>" 形式（shiftWishOptions の workWishKey と同じ）
  {
    symbol: "A",
    interpretation: { kind: "wish", options: [want("work:A勤務")] },
    label: "A勤務（8:00〜16:45）",
  },
  {
    symbol: "B",
    interpretation: { kind: "wish", options: [want("work:B勤務")] },
    label: "B勤務（8:30〜17:15）",
  },
  {
    symbol: "E",
    interpretation: { kind: "wish", options: [want("work:E勤務")] },
    label: "E勤務（土・祝日）",
  },
  {
    symbol: "H",
    interpretation: { kind: "wish", options: [want("work:H勤務")] },
    label: "H勤務（8:30〜17:15・週・時間外手当）",
  },
  {
    symbol: "h",
    interpretation: { kind: "wish", options: [want("work:h勤務")] },
    label: "h勤務（8:30〜17:15・祝休・時間外手当）",
  },
  // 時短勤務帯の希望（会計年度任用向け）
  {
    symbol: "①",
    interpretation: { kind: "wish", options: [want("work:①勤務")] },
    label: "①勤務（8:30〜15:30・平日）",
  },
  {
    symbol: "②",
    interpretation: { kind: "wish", options: [want("work:②勤務")] },
    label: "②勤務（9:00〜16:00・平日）",
  },
  {
    symbol: "③",
    interpretation: { kind: "wish", options: [want("work:③勤務")] },
    label: "③勤務（10:15〜17:15・平日）",
  },
  {
    symbol: "⑥",
    interpretation: { kind: "wish", options: [want("work:⑥勤務")] },
    label: "⑥勤務（9:00〜16:00・土祝）",
  },
  {
    symbol: "⑦",
    interpretation: { kind: "wish", options: [want("work:⑦勤務")] },
    label: "⑦勤務（10:00〜17:00・土祝）",
  },
  // その他の休みの希望
  {
    symbol: "代",
    interpretation: { kind: "wish", options: [want("day-off:代")] },
    label: "代休",
  },
  {
    symbol: "公",
    interpretation: { kind: "wish", options: [want("day-off:公")] },
    label: "公休",
  },
  {
    symbol: "振",
    interpretation: { kind: "wish", options: [want("day-off:振")] },
    label: "振替休日",
  },
  // その他の休暇の希望
  {
    symbol: "研",
    interpretation: { kind: "wish", options: [want("day-off:研修")] },
    label: "研修",
  },
  {
    symbol: "出",
    interpretation: { kind: "wish", options: [want("day-off:出張")] },
    label: "出張",
  },
  // その他の時短勤務帯
  {
    symbol: "④",
    interpretation: { kind: "wish", options: [want("work:④勤務")] },
    label: "④勤務",
  },
  {
    symbol: "⑤",
    interpretation: { kind: "wish", options: [want("work:⑤勤務")] },
    label: "⑤勤務",
  },
  // 曖昧な希望（複数の want）
  {
    symbol: "①ｏｒ②",
    interpretation: { kind: "wish", options: [want("work:①勤務"), want("work:②勤務")] },
    label: "①または②勤務",
  },
  {
    symbol: "①or②",
    interpretation: { kind: "wish", options: [want("work:①勤務"), want("work:②勤務")] },
    label: "①または②勤務",
  },
  {
    symbol: "年or週",
    interpretation: {
      kind: "wish",
      options: [want("day-off:年")],
    },
    label: "年休または週休",
  },
  {
    symbol: "週か代",
    interpretation: { kind: "confirmed-day-off", reason: "weekly" },
    label: "週休または代休",
  },
];

/** 行政版のデフォルト SymbolMapping（形態が課に渡す初期値） */
export const GOVERNMENT_SYMBOL_MAPPING = new SymbolMapping({
  entries: [...GOVERNMENT_SYMBOL_ENTRIES],
});
