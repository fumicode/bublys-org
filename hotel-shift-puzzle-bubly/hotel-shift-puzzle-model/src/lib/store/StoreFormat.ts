/**
 * StoreFormat — 形態（ホテル・行政・…）
 *
 * 業界ごとの違いのうち、**勤務表の外のこと**だけを束ねた定義。コードで定義し、利用者は編集しない。
 * 業界を足すときは、ここに定義を1つ足す（病院など）。
 *
 * 形態が決めるのは既定値と言葉だけ:
 *   - 区切り方の既定（店舗を作ったときの期の決め方。店舗の設定で変えられる）
 *   - 起算日の初期値（4週の起算日の入力欄に最初に入れる日。どの日でも選び直せる）
 *   - 言葉（利用者に見せる名前。「店舗」を「課」と呼ぶなど）
 *
 * 勤務表の中のこと（制約・勤務帯・名簿の既定値）は持たない。それは勤務表が生まれるときに
 * 写し取るテンプレートの話（#225）。
 *
 * 不変。
 */
import type { WorkingDay } from "../schedule/WorkingDay.js";
import { FourWeekRule, PeriodRule } from "./PeriodRule.js";

export type StoreFormatId = "hotel" | "government";

export type StoreFormatState = {
  id: StoreFormatId;
  /** 形態の名前（"ホテル" / "行政"） */
  label: string;
  /** 店舗を何と呼ぶか（"店舗" / "課"） */
  storeNoun: string;
  /** 店舗を作ったときの期の決め方。today は起算日の初期値を決めるのに使う */
  defaultRule: (today: WorkingDay) => PeriodRule;
};

export class StoreFormat {
  constructor(readonly state: StoreFormatState) {}

  get id(): StoreFormatId {
    return this.state.id;
  }

  get label(): string {
    return this.state.label;
  }

  get storeNoun(): string {
    return this.state.storeNoun;
  }

  defaultRule(today: WorkingDay): PeriodRule {
    return this.state.defaultRule(today);
  }

  /**
   * 4週の起算日の初期値。形態の既定が4週ならその起算日、そうでなければ今日を含む週の日曜。
   * あくまで入力欄の初期値で、どの日でも選び直せる。
   */
  defaultAnchor(today: WorkingDay): WorkingDay {
    const rule = this.defaultRule(today);
    return rule instanceof FourWeekRule ? rule.anchor : sundayOnOrBefore(today);
  }

  /** 登録されている形態（見つからない ID はホテルとして読む） */
  static of(id: string): StoreFormat {
    return STORE_FORMATS.find((f) => f.id === id) ?? HOTEL_FORMAT;
  }

  /**
   * 組織を何と呼ぶか（「店舗」「課」）。**組織にかかわる言葉は形態が決める。**
   * 形態が1つならその言葉、ホテルと行政が混ざるなら「店舗」。
   */
  static nounFor(formats: readonly StoreFormat[]): string {
    const nouns = new Set(formats.map((f) => f.storeNoun));
    return nouns.size === 1 ? [...nouns][0] : HOTEL_FORMAT.storeNoun;
  }

  /**
   * "hotel,government" のような ID の並びから形態の並びを作る（デプロイの設定を読む）。
   * 知らない ID・重なりは捨て、1つも残らなければホテルだけ。並びの先頭が既定の形態。
   */
  static listOf(ids: string | undefined): StoreFormat[] {
    const found = (ids ?? "")
      .split(",")
      .map((id) => id.trim())
      .map((id) => STORE_FORMATS.find((f) => f.id === id))
      .filter((f): f is StoreFormat => f !== undefined);
    const unique = [...new Set(found)];
    return unique.length > 0 ? unique : [HOTEL_FORMAT];
  }
}

/** その日以前でいちばん近い日曜（その日が日曜ならその日） */
export const sundayOnOrBefore = (day: WorkingDay): WorkingDay => day.addDays(-day.weekday);

/** ホテル：暦月で区切る */
export const HOTEL_FORMAT = new StoreFormat({
  id: "hotel",
  label: "ホテル",
  storeNoun: "店舗",
  defaultRule: () => PeriodRule.calendarMonth(),
});

/** 行政：4週で区切る。起算日の初期値は今日を含む週の日曜 */
export const GOVERNMENT_FORMAT = new StoreFormat({
  id: "government",
  label: "行政",
  storeNoun: "課",
  defaultRule: (today) => PeriodRule.fourWeek(sundayOnOrBefore(today)),
});

/** 登録されている形態（並び順は選択肢の順） */
export const STORE_FORMATS: readonly StoreFormat[] = [HOTEL_FORMAT, GOVERNMENT_FORMAT];
