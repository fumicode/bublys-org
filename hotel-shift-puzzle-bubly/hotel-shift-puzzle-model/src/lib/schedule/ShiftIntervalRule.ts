/**
 * ShiftIntervalRule — 勤務間インターバルの「宣言的ルール」
 *
 * 「<fromShiftName> の翌日は <forbiddenNextShiftNames> のどれにも入れない」を1つのオブジェクトで
 * 宣言的に表す。例: 遅番の翌日は早番・中番に入れない。
 *
 * 由来は勤務間インターバル（退勤して家に帰ってから次の勤務まで minRestHours 時間以上あける）
 * という法律の要請。本来はその時間から「どの勤務帯の翌日にどの勤務帯が入れないか」を導きたいが、
 * いまの WorkShift は始業時刻しか持たず終業時刻が無いので導けない。そのため、このルールは
 * 導出の結果である「禁止する勤務帯の組」を直接持つ。minRestHours は判定には使わず、
 * 「なぜ禁止なのか」を describe() / 違反メッセージに出すための根拠として保持する。
 *
 * WorkShift に終業時刻が入ったら、allowsNextDay() の中身だけを「minRestHours から導く」形に
 * 差し替えられる。制約アダプタ（ShiftIntervalConstraint）もサンプル生成器も表示も、
 * allowsNextDay() / describe() 越しにしか触らないので、そのまま使い回せる。
 *
 * 責務の分け方は ShiftLeaderRule / ShiftLeaderConstraint と同じ:
 *   - 入れていいかの判定（allowsNextDay）はこのルールが持つ。違反パイプライン（制約）も
 *     サンプル生成器も同じここを呼ぶので、判定が二重に書かれない。
 *   - 勤務帯名 → 勤務帯ID の解決と、違反オブジェクトへの詰め替えは制約アダプタの仕事。
 *
 * 不変。
 */

export type ShiftIntervalRuleState = {
  /** 一意キー（例: "late"）。制約種別 "shift-interval:late" になる */
  key: string;
  /** 前日の勤務帯名（例: "遅番"） */
  fromShiftName: string;
  /** その翌日に入れない勤務帯名（例: ["早番", "中番"]） */
  forbiddenNextShiftNames: string[];
  /**
   * 根拠となる勤務間インターバル（時間）。既定 8。
   * 判定には使わない（判定は forbiddenNextShiftNames）。説明文に出すためだけの値。
   */
  minRestHours?: number;
};

/** 勤務間インターバルの既定値（時間）。労働基準まわりの「8時間あける」に由来。 */
export const DEFAULT_MIN_REST_HOURS = 8;

export class ShiftIntervalRule {
  constructor(readonly state: ShiftIntervalRuleState) {}

  get key(): string {
    return this.state.key;
  }

  get fromShiftName(): string {
    return this.state.fromShiftName;
  }

  get forbiddenNextShiftNames(): string[] {
    return this.state.forbiddenNextShiftNames;
  }

  /** 根拠となる勤務間インターバル（時間）。既定 8。 */
  get minRestHours(): number {
    return this.state.minRestHours ?? DEFAULT_MIN_REST_HOURS;
  }

  /** 表示ラベル（例: "遅番明け"）。制約バーのキャプションに使う。 */
  get label(): string {
    return `${this.fromShiftName}明け`;
  }

  /**
   * 前日が prevShiftName の人を、翌日 nextShiftName に入れてよいか（このルールに照らして）。
   *
   * 判定の単一の置き場。制約（違反を出す）もサンプル生成器（違反を作らない）もここを呼ぶ。
   * 休み・未定・このルールと関係ない勤務帯は名前が引けないので undefined を渡す＝常に許可。
   */
  allowsNextDay(
    prevShiftName: string | undefined,
    nextShiftName: string | undefined
  ): boolean {
    if (prevShiftName !== this.fromShiftName) return true;
    if (nextShiftName === undefined) return true;
    return !this.state.forbiddenNextShiftNames.includes(nextShiftName);
  }

  /** 根拠の1文（例: "帰宅から次の勤務まで8時間あける"）。 */
  get restReason(): string {
    return `帰宅から次の勤務まで${this.minRestHours}時間あける`;
  }

  /** 人が読める1文（制約バーのツールチップ・違反バブルで使う）。 */
  describe(): string {
    return `${this.fromShiftName}の翌日は${this.forbiddenNextShiftNames.join(
      "・"
    )}に入れない（${this.restReason}）`;
  }
}
