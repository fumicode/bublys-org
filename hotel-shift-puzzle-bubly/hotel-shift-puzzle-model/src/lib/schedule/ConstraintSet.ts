import { ShiftLeaderRule, type ShiftLeaderRuleState } from "./ShiftLeaderRule.js";
import { ShiftLeaderConstraint } from "./ShiftLeaderConstraint.js";
import { ShiftIntervalRule, type ShiftIntervalRuleState } from "./ShiftIntervalRule.js";
import { ShiftIntervalConstraint } from "./ShiftIntervalConstraint.js";
import { MaxConsecutiveWorkdaysConstraint } from "./MaxConsecutiveWorkdaysConstraint.js";
import { MinMonthlyDayOffConstraint } from "./MinMonthlyDayOffConstraint.js";
import { MaxDayOffPerDayConstraint } from "./MaxDayOffPerDayConstraint.js";
import { RequiredStaffingConstraint } from "./RequiredStaffingConstraint.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";

/**
 * ConstraintSet — 勤務表が満たすべき制約をひとまとめにした集約（制約セット）
 *
 * 責任者ルール（早責/予責/夜責…定義＋候補者）と、連勤上限・月の最低休日数・1日の休み上限・
 * 希望チェックの有無を1つで持つ。制約はスタッフの属性ではなく勤務表側の要件なので、
 * 専用の集約として切り出してある。
 *
 * 勤務帯セット（WorkShiftSet）と同じく**2通りの使われ方**をする:
 *   - グローバルのテンプレート（id = "global"）… ローカル世界線を持たない
 *   - 勤務表ごとの独自セット（id = scheduleId）… 勤務表作成時にグローバルをコピーして作り、
 *     親 Schedule の世界線に束ねて版管理する（担当者を足すと世界線にノードが増える）
 *
 * state は責任者ルールをインスタンスで保持する。シリアライズ用に入れ子まで plain な
 * {@link ConstraintSetPlain} を別途定義し、toPlain() / fromPlain() で橋渡しする。
 * 不変。更新メソッドは新しいインスタンスを返す。
 */
/** state：ルール（責任者・勤務間インターバル）はインスタンスで保持する */
export type ConstraintSetState = {
  /** "global"（テンプレート）か scheduleId（勤務表ごとの独自セット） */
  id: string;
  /** 責任者ルール。定義（key/label/shiftName/minCount）＋候補者(leaderStaffIds)を丸ごと持つ。 */
  leaderRules: ShiftLeaderRule[];
  /** 連勤上限（日数）。省略時 5。 */
  maxConsecutiveWorkdays?: number;
  /** シフト希望との食い違いを違反として見るか。省略時 true。 */
  checkShiftWish?: boolean;
  /** 月の最低休日数。省略時 8。 */
  minMonthlyDayOff?: number;
  /** 1日に休んでよい人数の上限。省略時 8。 */
  maxDayOffPerDay?: number;
  /**
   * 勤務間インターバルのルール（「遅番の翌日は早番・中番に入れない」など）。
   * 省略時は DEFAULT_SHIFT_INTERVAL_RULES（遅番明けの早番・中番を禁止）。
   */
  shiftIntervalRules?: ShiftIntervalRule[];
  /** 参考として紐づけた過去のシフト完成レポート（ScheduleReport）のID。省略時 []。 */
  linkedReportIds?: string[];
};

/** シリアライズ用：入れ子まで全部 plain */
export type ConstraintSetPlain = Omit<
  ConstraintSetState,
  "leaderRules" | "shiftIntervalRules"
> & {
  leaderRules: ShiftLeaderRuleState[];
  shiftIntervalRules?: ShiftIntervalRuleState[];
};

/** 各制約設定の既定値。 */
export const DEFAULT_MAX_CONSECUTIVE_WORKDAYS = 5;
export const DEFAULT_MIN_MONTHLY_DAY_OFF = 8;
export const DEFAULT_MAX_DAY_OFF_PER_DAY = 8;

/**
 * 勤務間インターバルの既定ルール。
 * 遅番のあと家に帰って8時間あけると翌日の早番・中番には間に合わない、という法律の要請を
 * 「禁止する勤務帯の組」として表したもの（詳しくは ShiftIntervalRule のコメント）。
 */
export const DEFAULT_SHIFT_INTERVAL_RULES: ShiftIntervalRuleState[] = [
  {
    key: "late",
    fromShiftName: "遅番",
    forbiddenNextShiftNames: ["早番", "中番"],
    minRestHours: 8,
  },
];

export class ConstraintSet {
  constructor(readonly state: ConstraintSetState) {}

  /** 既定値だけの制約セット（責任者ルールは無し） */
  static empty(id: string): ConstraintSet {
    return new ConstraintSet({ id, leaderRules: [] });
  }

  /** リポジトリのキー。"global" か scheduleId。 */
  get id(): string {
    return this.state.id;
  }

  /**
   * id を差し替えた新しいセットを返す（ルールはそのまま）。
   * グローバルのテンプレート → 勤務表ごとの独自セット を作るのに使う。不変。
   */
  withId(newId: string): ConstraintSet {
    return new ConstraintSet({ ...this.state, id: newId });
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

  /** 勤務間インターバルのルール。既定は DEFAULT_SHIFT_INTERVAL_RULES。 */
  get shiftIntervalRules(): ShiftIntervalRule[] {
    return (
      this.state.shiftIntervalRules ??
      DEFAULT_SHIFT_INTERVAL_RULES.map((r) => new ShiftIntervalRule(r))
    );
  }

  /** ルールキーで勤務間インターバルのルールを取得（ルールバブルが URL のキーから引く）。 */
  shiftIntervalRule(key: string): ShiftIntervalRule | undefined {
    return this.shiftIntervalRules.find((r) => r.key === key);
  }

  /**
   * 勤務間インターバルのルールを「違反を出す制約」に変換して返す。
   * 勤務帯名 → 勤務帯ID集合の解決は勤務表側の事情なので shiftIdsOf で受ける。
   */
  intervalConstraints(
    shiftIdsOf: (shiftName: string) => string[]
  ): ShiftIntervalConstraint[] {
    return this.shiftIntervalRules.map(
      (rule) => new ShiftIntervalConstraint(rule, shiftIdsOf)
    );
  }

  /** 参考として紐づけた過去のシフト完成レポート（ScheduleReport）のID。既定 []。 */
  get linkedReportIds(): string[] {
    return this.state.linkedReportIds ?? [];
  }

  // ========== 上限・スイッチの変更 ==========

  /** 連勤上限を変えた新しいセットを返す（1 以上に丸める）。変わらなければ自分自身。不変。 */
  withMaxConsecutiveWorkdays(days: number): ConstraintSet {
    return this.withNumber("maxConsecutiveWorkdays", days, this.maxConsecutiveWorkdays);
  }

  /** 月の最低休日数を変えた新しいセットを返す（1 以上に丸める）。不変。 */
  withMinMonthlyDayOff(days: number): ConstraintSet {
    return this.withNumber("minMonthlyDayOff", days, this.minMonthlyDayOff);
  }

  /** 1日に休んでよい人数の上限を変えた新しいセットを返す（1 以上に丸める）。不変。 */
  withMaxDayOffPerDay(count: number): ConstraintSet {
    return this.withNumber("maxDayOffPerDay", count, this.maxDayOffPerDay);
  }

  /** シフト希望との食い違いを違反として見るかを変えた新しいセットを返す。不変。 */
  withCheckShiftWish(check: boolean): ConstraintSet {
    if (check === this.checkShiftWish) return this;
    return new ConstraintSet({ ...this.state, checkShiftWish: check });
  }

  private withNumber(
    field: "maxConsecutiveWorkdays" | "minMonthlyDayOff" | "maxDayOffPerDay",
    value: number,
    current: number
  ): ConstraintSet {
    const next = Math.max(1, Math.floor(value));
    if (next === current) return this;
    return new ConstraintSet({ ...this.state, [field]: next });
  }

  /** レポートを紐づける（既に紐づいていれば何もしない）。新インスタンスを返す。 */
  linkReport(reportId: string): ConstraintSet {
    if (this.linkedReportIds.includes(reportId)) return this;
    return new ConstraintSet({
      ...this.state,
      linkedReportIds: [...this.linkedReportIds, reportId],
    });
  }

  /** レポートの紐づけを解除する。新インスタンスを返す。 */
  unlinkReport(reportId: string): ConstraintSet {
    return new ConstraintSet({
      ...this.state,
      linkedReportIds: this.linkedReportIds.filter((id) => id !== reportId),
    });
  }

  /**
   * この集約が持つ「モデル層で完結する制約」をすべて ScheduleConstraint として返す。
   * （責任者・連勤上限・勤務間インターバル・月最低休日・1日の休み上限・必要人数。希望違反は
   *  feature 層＋実行時データ依存なので含まない——feature 側で足す。）
   * 担当勤務帯名 → 勤務帯ID群の解決は勤務表側の事情なので shiftIdsOf で受ける。
   */
  modelConstraints(shiftIdsOf: (shiftName: string) => string[]): ScheduleConstraint[] {
    return [
      new MaxConsecutiveWorkdaysConstraint(this.maxConsecutiveWorkdays),
      ...this.leaderConstraints(shiftIdsOf),
      ...this.intervalConstraints(shiftIdsOf),
      new MinMonthlyDayOffConstraint(this.minMonthlyDayOff),
      new MaxDayOffPerDayConstraint(this.maxDayOffPerDay),
      new RequiredStaffingConstraint(shiftIdsOf),
    ];
  }

  /** 責任者ルール（並び順のまま）。 */
  get leaderRules(): ShiftLeaderRule[] {
    return this.state.leaderRules;
  }

  /** ロールキーでルールを取得。 */
  leaderRule(key: string): ShiftLeaderRule | undefined {
    return this.state.leaderRules.find((r) => r.key === key);
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
  addLeader(ruleKey: string, staffId: string): ConstraintSet {
    return this.mapRule(ruleKey, (r) => r.withLeader(staffId));
  }

  /** そのルールの候補者から staffId を外す。新インスタンスを返す。 */
  removeLeader(ruleKey: string, staffId: string): ConstraintSet {
    return this.mapRule(ruleKey, (r) => r.withoutLeader(staffId));
  }

  /**
   * その人を**すべての**責任者ルールの候補者から外す。変わらなければ自分自身を返す。不変。
   *
   * その人がこの勤務表で働かなくなったときに使う。候補者に残したままだと、
   * 表に居ない人を数えるルールができあがり、どう埋めても満たせない日が出る
   * （画面には ✕ だけが出て、理由がどこにも書かれていない状態になる）。
   */
  removeStaff(staffId: string): ConstraintSet {
    if (!this.state.leaderRules.some((r) => r.leaderStaffIds.includes(staffId))) {
      return this;
    }
    return new ConstraintSet({
      ...this.state,
      leaderRules: this.state.leaderRules.map((r) => r.withoutLeader(staffId)),
    });
  }

  /** 責任者ルールを新規追加する（同じ key が既にあれば無視）。新インスタンスを返す。 */
  addRule(rule: ShiftLeaderRule | ShiftLeaderRuleState): ConstraintSet {
    const added = rule instanceof ShiftLeaderRule ? rule : new ShiftLeaderRule(rule);
    if (this.state.leaderRules.some((r) => r.key === added.key)) return this;
    return new ConstraintSet({
      ...this.state,
      leaderRules: [...this.state.leaderRules, added],
    });
  }

  /** 責任者ルールを丸ごと削除する。新インスタンスを返す。 */
  removeRule(ruleKey: string): ConstraintSet {
    return new ConstraintSet({
      ...this.state,
      leaderRules: this.state.leaderRules.filter((r) => r.key !== ruleKey),
    });
  }

  /** ルールの担当勤務帯（名前＝入るべき時間帯）を変える。新インスタンスを返す。 */
  setRuleShift(ruleKey: string, shiftName: string): ConstraintSet {
    return this.mapRule(ruleKey, (r) => r.withShiftName(shiftName));
  }

  /** ルールの表示ラベルを変える。新インスタンスを返す。 */
  setRuleLabel(ruleKey: string, label: string): ConstraintSet {
    return this.mapRule(ruleKey, (r) => r.withLabel(label));
  }

  /** ルールの最低必要人数を変える（1 以上に丸める）。新インスタンスを返す。 */
  setRuleMinCount(ruleKey: string, minCount: number): ConstraintSet {
    return this.mapRule(ruleKey, (r) => r.withMinCount(minCount));
  }

  private mapRule(
    ruleKey: string,
    fn: (r: ShiftLeaderRule) => ShiftLeaderRule
  ): ConstraintSet {
    return new ConstraintSet({
      ...this.state,
      leaderRules: this.state.leaderRules.map((r) => (r.key === ruleKey ? fn(r) : r)),
    });
  }

  // ========== シリアライズ ==========

  toPlain(): ConstraintSetPlain {
    return {
      ...this.state,
      leaderRules: this.state.leaderRules.map((r) => r.state),
      shiftIntervalRules: this.state.shiftIntervalRules?.map((r) => r.state),
    };
  }

  static fromPlain(plain: ConstraintSetPlain): ConstraintSet {
    return new ConstraintSet({
      ...plain,
      leaderRules: plain.leaderRules.map((r) => new ShiftLeaderRule(r)),
      shiftIntervalRules: plain.shiftIntervalRules?.map(
        (r) => new ShiftIntervalRule(r)
      ),
    });
  }
}
