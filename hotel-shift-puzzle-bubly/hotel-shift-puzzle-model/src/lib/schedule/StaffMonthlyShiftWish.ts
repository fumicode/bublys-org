/**
 * StaffMonthlyShiftWish — スタッフ月別シフト希望
 *
 * あるスタッフの、ある月の勤務希望を表す。「休みたい」「早番がいい」「(この帯は)避けたい」
 * 「どうでもいい(空欄)」などを、特別な種類を作らず **統一した形** で記述する:
 *
 *   稼働日 → オプション(キー) → 希望(want=○したい / avoid=×避けたい)
 *
 * オプションキーは不透明な文字列で、ここでは意味を解釈しない（"休み" や各勤務帯名などは
 * 上位層が決める）。これにより:
 *   - 休みたい            : { "<休みオプション>": "want" }
 *   - 早番がいい          : { "<早番オプション>": "want" }
 *   - 出勤したい(帯問わず): 各勤務帯オプションを "want"（または休みを "avoid"）
 *   - 早番は避けたい      : { "<早番オプション>": "avoid" }
 *   - どうでもいい(空欄)  : 何も持たない
 * を1つの仕組みで表せる。neutral は「キーを持たない」で表現する。
 *
 * ここで表せる形のうち、実際にどれを入力させるかは上位層（shiftWishOptions）が決める。
 * 現在の入力仕様は「休みは want / 勤務帯は avoid のみ、1日にどちらか一方」。
 *
 * state は完全に plain（入れ子の Record まで素の値）なので、state がそのまま plain を兼ねる。
 * 不変。更新メソッドは新しいインスタンスを返す。
 */
import { WorkingDay } from "./WorkingDay.js";

/** 希望の極性: したい / 避けたい（neutral はキーを持たないことで表す） */
export type ShiftWishPreference = "want" | "avoid";

export type StaffMonthlyShiftWishState = {
  staffId: string;
  year: number;
  /** 1-12 */
  month: number;
  /** 稼働日キー("2026-06-01") → オプションキー → 希望 */
  byDay: Record<string, Record<string, ShiftWishPreference>>;
  /**
   * この希望が確定した時刻（ISO文字列）。未確定は null。
   * 上位層（hotel-shift-puzzle）ではシフト作成者が「回収済み」にした時刻として使う。
   * 確定した希望は書きかけではないので、取り消す（withdraw）まで書き換えられない。
   */
  submittedAt: string | null;
};

/** シリアライズ用（state がそのまま plain） */
export type StaffMonthlyShiftWishPlain = StaffMonthlyShiftWishState;

const cloneByDay = (
  byDay: Record<string, Record<string, ShiftWishPreference>>
): Record<string, Record<string, ShiftWishPreference>> => {
  const out: Record<string, Record<string, ShiftWishPreference>> = {};
  for (const [dayKey, byOption] of Object.entries(byDay)) out[dayKey] = { ...byOption };
  return out;
};

export class StaffMonthlyShiftWish {
  constructor(readonly state: StaffMonthlyShiftWishState) {}

  /** スタッフ×月で一意な ID（"staff-A:2026-06"） */
  static idOf(staffId: string, year: number, month: number): string {
    return `${staffId}:${year}-${String(month).padStart(2, "0")}`;
  }

  /** 空の希望（全日どうでもいい）を作る */
  static create(params: {
    staffId: string;
    year: number;
    month: number;
  }): StaffMonthlyShiftWish {
    return new StaffMonthlyShiftWish({
      staffId: params.staffId,
      year: params.year,
      month: params.month,
      byDay: {},
      submittedAt: null,
    });
  }

  get id(): string {
    return StaffMonthlyShiftWish.idOf(this.state.staffId, this.state.year, this.state.month);
  }

  get staffId(): string {
    return this.state.staffId;
  }

  get year(): number {
    return this.state.year;
  }

  /** 1-12 */
  get month(): number {
    return this.state.month;
  }

  /** その月の全稼働日（1日〜末日） */
  workingDays(): WorkingDay[] {
    const lastDay = new Date(this.state.year, this.state.month, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) =>
      WorkingDay.of(this.state.year, this.state.month, i + 1)
    );
  }

  /** その稼働日・そのオプションの希望（neutral は undefined） */
  preferenceFor(day: WorkingDay, optionKey: string): ShiftWishPreference | undefined {
    return this.state.byDay[day.key]?.[optionKey];
  }

  /** その稼働日の希望（オプション→希望）。未設定は空 */
  wishesOn(day: WorkingDay): Record<string, ShiftWishPreference> {
    return this.state.byDay[day.key] ?? {};
  }

  /** その稼働日に何も希望が無い（どうでもいい）か */
  isEmptyOn(day: WorkingDay): boolean {
    return Object.keys(this.wishesOn(day)).length === 0;
  }

  /** 何日ぶん希望を入れたか（希望のある稼働日の数） */
  get filledDayCount(): number {
    return Object.keys(this.state.byDay).length;
  }

  /** 1日も希望を入れていない（まだ手を付けていない）か */
  get isEmpty(): boolean {
    return this.filledDayCount === 0;
  }

  /** 確定済みか（確定した希望は取り消すまで書き換えられない） */
  get isSubmitted(): boolean {
    return this.state.submittedAt !== null;
  }

  /** 確定した時刻（ISO文字列）。未確定は null */
  get submittedAt(): string | null {
    return this.state.submittedAt;
  }

  /**
   * 確定した新インスタンスを返す。時刻は上位層から渡す（ドメインは now を知らない）。
   * 既に確定済みなら何も変わらない。
   */
  submit(at: string): StaffMonthlyShiftWish {
    if (this.isSubmitted) return this;
    return new StaffMonthlyShiftWish({ ...this.state, submittedAt: at });
  }

  /** 確定を取り消して、書き換えられる状態に戻した新インスタンスを返す */
  withdraw(): StaffMonthlyShiftWish {
    if (!this.isSubmitted) return this;
    return new StaffMonthlyShiftWish({ ...this.state, submittedAt: null });
  }

  /**
   * その稼働日・そのオプションの希望を設定した新インスタンスを返す。不変。
   * pref=null で neutral（どうでもいい）に戻す。
   */
  setPreference(
    day: WorkingDay,
    optionKey: string,
    pref: ShiftWishPreference | null
  ): StaffMonthlyShiftWish {
    if (this.isSubmitted) {
      throw new Error(
        "確定済みのシフト希望は編集できません（withdraw() で確定を取り消してから編集する）"
      );
    }
    const byDay = cloneByDay(this.state.byDay);
    const dayMap = { ...(byDay[day.key] ?? {}) };
    if (pref) dayMap[optionKey] = pref;
    else delete dayMap[optionKey];
    if (Object.keys(dayMap).length > 0) byDay[day.key] = dayMap;
    else delete byDay[day.key];
    return new StaffMonthlyShiftWish({ ...this.state, byDay });
  }

  toPlain(): StaffMonthlyShiftWishPlain {
    return {
      staffId: this.state.staffId,
      year: this.state.year,
      month: this.state.month,
      byDay: cloneByDay(this.state.byDay),
      submittedAt: this.state.submittedAt,
    };
  }

  static fromPlain(plain: StaffMonthlyShiftWishPlain): StaffMonthlyShiftWish {
    return new StaffMonthlyShiftWish({
      staffId: plain.staffId,
      year: plain.year,
      month: plain.month,
      byDay: cloneByDay(plain.byDay ?? {}),
      // 確定のしくみより前に保存されたデータは未確定として読む
      submittedAt: plain.submittedAt ?? null,
    });
  }
}
