/**
 * DayOffStyle — 休みの形（その人が休みをどう並べたいか）
 *
 * 人によって休みの間隔の好みは違う。形は2つだけ:
 *   - 分散型 … 希望休みを固定点として、全休みの間隔が均等になるよう散らす。既定
 *   - 連休型 … 希望休みの隣に相方を置いて連休を作る。残りは連勤上限で区切り、
 *              可能なら再び連休にする
 *
 * 連休型の「続けてよい日数」は全体の連勤上限をそのまま使う。
 *
 * 既定値は Staff が持ち、勤務表ごとの WorkingStaffMember で上書きできる。
 * state は primitive だけなので、保存形も同じ形。不変。
 */

export type DayOffStyleState = { kind: "spread" } | { kind: "clustered" };

export type DayOffStylePlain = DayOffStyleState;

export class DayOffStyle {
  constructor(readonly state: DayOffStyleState) {}

  /** 分散型（既定） */
  static spread(): DayOffStyle {
    return new DayOffStyle({ kind: "spread" });
  }

  /** 連休型 */
  static clustered(): DayOffStyle {
    return new DayOffStyle({ kind: "clustered" });
  }

  /** 何も決めていない人の形 */
  static readonly DEFAULT = DayOffStyle.spread();

  get isClustered(): boolean {
    return this.state.kind === "clustered";
  }

  /**
   * 休みを置くとき、続けて出勤させてよい日数。全体の連勤上限をそのまま使う。
   */
  runLimitWithin(maxConsecutiveWorkdays: number): number {
    return maxConsecutiveWorkdays;
  }

  /** 表示名 */
  get label(): string {
    return this.isClustered ? "連休型" : "分散型";
  }

  equals(other: DayOffStyle): boolean {
    return this.state.kind === other.state.kind;
  }

  toPlain(): DayOffStylePlain {
    return { ...this.state };
  }

  static fromPlain(plain: DayOffStylePlain): DayOffStyle {
    // 古いデータの maxRun は無視して読む（後方互換）
    return plain.kind === "clustered" ? DayOffStyle.clustered() : DayOffStyle.spread();
  }
}
