/**
 * ScheduleAvailability — 勤務表ごとの「スタッフ可能勤務帯」
 *
 * ある勤務表（シフト表）について、各スタッフが入れる勤務帯（shiftId）の集合を持つ。
 * 勤務表に紐づく別集約。勤務表と同じローカル世界線で一緒にバージョン管理する想定。
 * 不変。
 */

export type ScheduleAvailabilityState = {
  /** 紐づく勤務表ID（この集約のIDも兼ねる：1勤務表=1可能勤務帯） */
  scheduleId: string;
  /** staffId → 入れる勤務帯ID（許可リスト） */
  byStaff: Record<string, string[]>;
};

export class ScheduleAvailability {
  constructor(readonly state: ScheduleAvailabilityState) {}

  /** 全スタッフが全勤務帯に入れる初期状態を作る */
  static create(
    scheduleId: string,
    staffIds: string[],
    shiftIds: string[]
  ): ScheduleAvailability {
    const byStaff: Record<string, string[]> = {};
    for (const staffId of staffIds) byStaff[staffId] = [...shiftIds];
    return new ScheduleAvailability({ scheduleId, byStaff });
  }

  get id(): string {
    return this.state.scheduleId;
  }

  get scheduleId(): string {
    return this.state.scheduleId;
  }

  /** そのスタッフが入れる勤務帯ID一覧 */
  allowedShiftIds(staffId: string): string[] {
    return this.state.byStaff[staffId] ?? [];
  }

  /** そのスタッフがその勤務帯に入れるか */
  isAllowed(staffId: string, shiftId: string): boolean {
    return this.allowedShiftIds(staffId).includes(shiftId);
  }

  /** 指定スタッフ全員にその勤務帯を許可した新しいインスタンスを返す。不変。
   *  可能勤務帯バブルで勤務帯を追加したとき、既定で全員許可にするために使う。 */
  allowForAll(staffIds: string[], shiftId: string): ScheduleAvailability {
    const byStaff = { ...this.state.byStaff };
    for (const staffId of staffIds) {
      const current = byStaff[staffId] ?? [];
      if (!current.includes(shiftId)) byStaff[staffId] = [...current, shiftId];
    }
    return new ScheduleAvailability({ ...this.state, byStaff });
  }

  /**
   * まだ設定の無いスタッフに、指定の勤務帯すべてを許可した新しいインスタンスを返す。不変。
   * 既に設定があれば自分自身を返す。
   *
   * 「この勤務表で新しく働くことになった人は、既定でどの勤務帯にも入れる」ための入口。
   * 設定が無いと allowedShiftIds が空を返し、その人のセルには何も入れられない
   * （臨時スタッフを足したのに一日も割り当てられない、という形で現れる）。
   * 既存の設定を上書きしないので、一度外して戻した人の可否はそのまま戻る。
   */
  allowAllIfUnset(staffId: string, shiftIds: string[]): ScheduleAvailability {
    if (this.state.byStaff[staffId] !== undefined) return this;
    return new ScheduleAvailability({
      ...this.state,
      byStaff: { ...this.state.byStaff, [staffId]: [...shiftIds] },
    });
  }

  /** 1つの可否をトグルした新しいインスタンスを返す。不変。 */
  toggle(staffId: string, shiftId: string): ScheduleAvailability {
    const current = this.allowedShiftIds(staffId);
    const next = current.includes(shiftId)
      ? current.filter((s) => s !== shiftId)
      : [...current, shiftId];
    return new ScheduleAvailability({
      ...this.state,
      byStaff: { ...this.state.byStaff, [staffId]: next },
    });
  }
}
