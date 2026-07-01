import { ShiftLeaderRule, type ShiftLeaderRuleState } from "./ShiftLeaderRule.js";
import { ShiftLeaderConstraint } from "./ShiftLeaderConstraint.js";

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
};

/** 連勤上限の既定値。 */
export const DEFAULT_MAX_CONSECUTIVE_WORKDAYS = 5;

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
