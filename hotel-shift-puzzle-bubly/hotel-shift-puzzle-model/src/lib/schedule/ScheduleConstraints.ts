import { ShiftLeaderRule, type ShiftLeaderRuleState } from "./ShiftLeaderRule.js";
import { ShiftLeaderConstraint } from "./ShiftLeaderConstraint.js";
import { MaxConsecutiveWorkdaysConstraint } from "./MaxConsecutiveWorkdaysConstraint.js";
import { MinMonthlyDayOffConstraint } from "./MinMonthlyDayOffConstraint.js";
import { MaxDayOffPerDayConstraint } from "./MaxDayOffPerDayConstraint.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";

/**
 * ScheduleConstraints — 勤務表ごとの「制約」集約
 *
 * 以前はスタッフが `leaderRoleKeys` で「自分が何の責任者か」を持っていたが、制約はスタッフの
 * 属性ではなく勤務表側の要件なので、専用の集約として切り出した。勤務表IDをキーに1つ持ち、
 * 勤務表のローカル世界線に束ねて版管理する（担当者をドロップで足すと世界線にノードが増える）。
 *
 * いまは責任者ルール（早責/予責/夜責…定義＋候補者を丸ごと）だけを持つが、将来は月の最低休日数や
 * 1日の休み上限など他の制約もここに同居できる（型名を汎用にしてある）。
 */
export type ScheduleConstraintsState = {
  scheduleId: string;
  /** 責任者ルール。定義（key/label/shiftName/minCount）＋候補者(leaderStaffIds)を丸ごと持つ。 */
  leaderRules: ShiftLeaderRuleState[];
  /** 連勤上限（日数）。省略時 5。 */
  maxConsecutiveWorkdays?: number;
  /** シフト希望との食い違いを違反として見るか。省略時 true。 */
  checkShiftWish?: boolean;
  /** 月の最低休日数。省略時 8。 */
  minMonthlyDayOff?: number;
  /** 1日に休んでよい人数の上限。省略時 8。 */
  maxDayOffPerDay?: number;
};

/** 各制約設定の既定値。 */
export const DEFAULT_MAX_CONSECUTIVE_WORKDAYS = 5;
export const DEFAULT_MIN_MONTHLY_DAY_OFF = 8;
export const DEFAULT_MAX_DAY_OFF_PER_DAY = 8;

export class ScheduleConstraints {
  constructor(readonly state: ScheduleConstraintsState) {}

  /** リポジトリのキー（勤務表IDと同じ＝勤務表1つに制約1つ）。 */
  get id(): string {
    return this.state.scheduleId;
  }

  get scheduleId(): string {
    return this.state.scheduleId;
  }

  /** 連勤上限（日数）。既定 5。 */
  get maxConsecutiveWorkdays(): number {
    return this.state.maxConsecutiveWorkdays ?? DEFAULT_MAX_CONSECUTIVE_WORKDAYS;
  }

  /** シフト希望との食い違いを違反として見るか。既定 true。 */
  get checkShiftWish(): boolean {
    return this.state.checkShiftWish ?? true;
  }

  /** 月の最低休日数。既定 8。 */
  get minMonthlyDayOff(): number {
    return this.state.minMonthlyDayOff ?? DEFAULT_MIN_MONTHLY_DAY_OFF;
  }

  /** 1日に休んでよい人数の上限。既定 8。 */
  get maxDayOffPerDay(): number {
    return this.state.maxDayOffPerDay ?? DEFAULT_MAX_DAY_OFF_PER_DAY;
  }

  /**
   * この集約が持つ「モデル層で完結する制約」をすべて ScheduleConstraint として返す。
   * （責任者・連勤上限・月最低休日・1日の休み上限。希望違反は feature 層＋実行時データ依存
   *  なので含まない——feature 側で足す。）
   * 担当勤務帯名 → 勤務帯ID群の解決は勤務表側の事情なので shiftIdsOf で受ける。
   */
  modelConstraints(shiftIdsOf: (shiftName: string) => string[]): ScheduleConstraint[] {
    return [
      new MaxConsecutiveWorkdaysConstraint(this.maxConsecutiveWorkdays),
      ...this.leaderConstraints(shiftIdsOf),
      new MinMonthlyDayOffConstraint(this.minMonthlyDayOff),
      new MaxDayOffPerDayConstraint(this.maxDayOffPerDay),
    ];
  }

  /** 責任者ルールを ShiftLeaderRule インスタンスとして得る。 */
  get leaderRules(): ShiftLeaderRule[] {
    return this.state.leaderRules.map((s) => new ShiftLeaderRule(s));
  }

  /** ロールキーでルールを取得。 */
  leaderRule(key: string): ShiftLeaderRule | undefined {
    const s = this.state.leaderRules.find((r) => r.key === key);
    return s ? new ShiftLeaderRule(s) : undefined;
  }

  /**
   * 責任者ルールを「違反を出す制約（ShiftLeaderConstraint）」に変換して返す。
   * 担当勤務帯名 → 勤務帯ID集合の解決は勤務表側の事情なので shiftIdsOf で受ける。
   * grid はこれを他の制約と一緒に checkConstraints に渡し、未充足日を違反として表に出す。
   */
  leaderConstraints(shiftIdsOf: (shiftName: string) => string[]): ShiftLeaderConstraint[] {
    return this.leaderRules.map(
      (rule) => new ShiftLeaderConstraint(rule, shiftIdsOf(rule.shiftName))
    );
  }

  /** そのルールの候補者に staffId を加える（重複は無視）。新インスタンスを返す。 */
  addLeader(ruleKey: string, staffId: string): ScheduleConstraints {
    return this.mapRule(ruleKey, (r) =>
      r.leaderStaffIds.includes(staffId)
        ? r
        : { ...r, leaderStaffIds: [...r.leaderStaffIds, staffId] }
    );
  }

  /** そのルールの候補者から staffId を外す。新インスタンスを返す。 */
  removeLeader(ruleKey: string, staffId: string): ScheduleConstraints {
    return this.mapRule(ruleKey, (r) => ({
      ...r,
      leaderStaffIds: r.leaderStaffIds.filter((id) => id !== staffId),
    }));
  }

  /** 責任者ルールを新規追加する（同じ key が既にあれば無視）。新インスタンスを返す。 */
  addRule(rule: ShiftLeaderRuleState): ScheduleConstraints {
    if (this.state.leaderRules.some((r) => r.key === rule.key)) return this;
    return new ScheduleConstraints({
      ...this.state,
      leaderRules: [...this.state.leaderRules, rule],
    });
  }

  /** 責任者ルールを丸ごと削除する。新インスタンスを返す。 */
  removeRule(ruleKey: string): ScheduleConstraints {
    return new ScheduleConstraints({
      ...this.state,
      leaderRules: this.state.leaderRules.filter((r) => r.key !== ruleKey),
    });
  }

  /** ルールの担当勤務帯（名前＝入るべき時間帯）を変える。新インスタンスを返す。 */
  setRuleShift(ruleKey: string, shiftName: string): ScheduleConstraints {
    return this.mapRule(ruleKey, (r) => ({ ...r, shiftName }));
  }

  /** ルールの表示ラベルを変える。新インスタンスを返す。 */
  setRuleLabel(ruleKey: string, label: string): ScheduleConstraints {
    return this.mapRule(ruleKey, (r) => ({ ...r, label }));
  }

  /** ルールの最低必要人数を変える（1 以上に丸める）。新インスタンスを返す。 */
  setRuleMinCount(ruleKey: string, minCount: number): ScheduleConstraints {
    const n = Math.max(1, Math.floor(minCount));
    return this.mapRule(ruleKey, (r) => ({ ...r, minCount: n }));
  }

  private mapRule(
    ruleKey: string,
    fn: (r: ShiftLeaderRuleState) => ShiftLeaderRuleState
  ): ScheduleConstraints {
    return new ScheduleConstraints({
      ...this.state,
      leaderRules: this.state.leaderRules.map((r) => (r.key === ruleKey ? fn(r) : r)),
    });
  }

  toPlain(): ScheduleConstraintsState {
    return this.state;
  }

  static fromPlain(s: ScheduleConstraintsState): ScheduleConstraints {
    return new ScheduleConstraints(s);
  }
}
