/**
 * ShiftLeaderRule — 責任者の「宣言的ルール」（解決済み）
 *
 * 「<leaderStaffIds> のうち最低 <minCount> 人が、勤務帯 <shiftName> に入っていなければ
 *  ならない」という要件を1つのオブジェクトで宣言的に表す。
 *   - 早責 = (早責フラグの集合, 早番, minCount=1)
 *   - 夜責 = (夜番責任者の集合, 遅番, minCount=1)
 *
 * 本質は **ORルール**（集合のうち最低 minCount 人が勤務帯Xに入る。minCount=1 は「いずれか1人」）。
 * このクラスはその具体形。表示（footer の ◯/✕）も、相方裏コマンドも、この **同じルール** から
 * 導出する（ロジックを二重に書かない）。
 *
 * どのスタッフフラグを見て責任者を選ぶか等の解決は上位層（会社ごとの設定）で行い、ここには
 * 解決済みの leaderStaffIds を渡す。実行時に config＋staff から解決するだけで永続化はしない。
 *
 * 注: 充足判定に必要な「勤務帯名 → 勤務帯ID」の解決は呼び出し側が行い、解決済みの shiftIds を
 * 渡す。footer は同名勤務帯の全ID集合を、コマンドは ctx の代表ID1つを渡す、と粒度が違うため。
 */
import type { WorkingDay } from "./WorkingDay.js";
import type { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";

export type ShiftLeaderRuleState = {
  /** 一意キー（例: "early" / "night"） */
  key: string;
  /** 表示ラベル（例: "早責" / "夜責"） */
  label: string;
  /** 担当する勤務帯の名前（例: "早番" / "遅番"） */
  shiftName: string;
  /** この役割の責任者であるスタッフID（解決済み） */
  leaderStaffIds: string[];
  /** 充足に必要な最低人数。既定 1（「いずれか1人」） */
  minCount?: number;
};

export class ShiftLeaderRule {
  constructor(readonly state: ShiftLeaderRuleState) {}

  get key(): string {
    return this.state.key;
  }

  get label(): string {
    return this.state.label;
  }

  get shiftName(): string {
    return this.state.shiftName;
  }

  get leaderStaffIds(): string[] {
    return this.state.leaderStaffIds;
  }

  /** 充足に必要な最低人数（既定 1） */
  get minCount(): number {
    return this.state.minCount ?? 1;
  }

  /**
   * その稼働日に、責任者のうち何人が担当勤務帯（shiftIds のいずれか）に入っているか。
   * shiftIds は解決済みの勤務帯ID集合（呼び出し側が name→id を解決して渡す）。
   */
  countOnShift(
    schedule: MonthlyStaffSchedule,
    day: WorkingDay,
    shiftIds: Iterable<string>
  ): number {
    const set = shiftIds instanceof Set ? shiftIds : new Set(shiftIds);
    let count = 0;
    for (const staffId of this.state.leaderStaffIds) {
      const shiftId = schedule.getShiftIdFor(staffId, day);
      if (shiftId !== undefined && set.has(shiftId)) count++;
    }
    return count;
  }

  /** その稼働日にルールが充足しているか（担当勤務帯に最低 minCount 人いるか） */
  isSatisfiedOn(
    schedule: MonthlyStaffSchedule,
    day: WorkingDay,
    shiftIds: Iterable<string>
  ): boolean {
    return this.countOnShift(schedule, day, shiftIds) >= this.minCount;
  }
}
