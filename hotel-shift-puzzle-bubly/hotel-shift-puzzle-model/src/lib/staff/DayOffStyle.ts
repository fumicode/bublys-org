/**
 * DayOffStyle — 休みの形（その人が休みをどう並べたいか）
 *
 * 人によって休みの間隔の好みは違う。形は2つだけ:
 *   - 分散型 … 休みを散らす（出勤の塊を短くそろえる）。既定
 *   - 連休型 … 休みを2日続けてまとめる。まとめるほど出勤の塊は長くなるので、
 *              「何連勤まで続けてよいか」（maxRun）を一緒に持てる（4連1休・5連1休の区別）
 *
 * maxRun は**目標であって制約ではない**。全体の連勤上限（制約）は誰にでも効き、それを
 * 超えることはない（{@link DayOffStyle.runLimitWithin}）。休みの日数が足りなければ
 * 目標は諦める（休みを月の最低日数以上に増やしてまで守らない）。
 *
 * 既定値は Staff が持ち、勤務表ごとの WorkingStaffMember で上書きできる。
 * state は primitive だけなので、保存形も同じ形。不変。
 */

export type DayOffStyleState =
  | { kind: "spread" }
  | {
      kind: "clustered";
      /** 続けて出勤してよい日数の目標（省略＝全体の連勤上限まで） */
      maxRun?: number;
    };

export type DayOffStylePlain = DayOffStyleState;

/** 連休型が目標にできる連勤日数の範囲（画面の選択肢） */
export const DAY_OFF_STYLE_MAX_RUN_OPTIONS = [3, 4, 5, 6] as const;

export class DayOffStyle {
  constructor(readonly state: DayOffStyleState) {}

  /** 分散型（既定） */
  static spread(): DayOffStyle {
    return new DayOffStyle({ kind: "spread" });
  }

  /** 連休型。maxRun を省略すると全体の連勤上限まで続けてよい */
  static clustered(maxRun?: number): DayOffStyle {
    return new DayOffStyle(
      maxRun === undefined ? { kind: "clustered" } : { kind: "clustered", maxRun }
    );
  }

  /** 何も決めていない人の形 */
  static readonly DEFAULT = DayOffStyle.spread();

  get isClustered(): boolean {
    return this.state.kind === "clustered";
  }

  /** 連休型の連勤の目標（分散型・目標なしは undefined） */
  get maxRun(): number | undefined {
    return this.state.kind === "clustered" ? this.state.maxRun : undefined;
  }

  /**
   * 休みを置くとき、続けて出勤させてよい日数。目標と全体の上限の小さい方。
   * 分散型・目標なしは全体の上限そのもの。
   */
  runLimitWithin(maxConsecutiveWorkdays: number): number {
    const target = this.maxRun;
    return target === undefined
      ? maxConsecutiveWorkdays
      : Math.max(1, Math.min(target, maxConsecutiveWorkdays));
  }

  /** 表示名（例: 「分散型」「連休型（4連まで）」） */
  get label(): string {
    if (!this.isClustered) return "分散型";
    return this.maxRun === undefined ? "連休型" : `連休型（${this.maxRun}連まで）`;
  }

  /** 行の名前の横に出す短い印（例: 「分散」「連休4」） */
  get shortLabel(): string {
    if (!this.isClustered) return "分散";
    return this.maxRun === undefined ? "連休" : `連休${this.maxRun}`;
  }

  equals(other: DayOffStyle): boolean {
    return this.state.kind === other.state.kind && this.maxRun === other.maxRun;
  }

  toPlain(): DayOffStylePlain {
    return { ...this.state };
  }

  static fromPlain(plain: DayOffStylePlain): DayOffStyle {
    return plain.kind === "clustered"
      ? DayOffStyle.clustered(plain.maxRun)
      : DayOffStyle.spread();
  }
}
