/**
 * RequiredStaffing — 必要スタッフ数
 *
 * 月間スタッフ勤務表の中で、稼働日に紐づく形で「その日・その勤務帯に何人必要か」を表す。
 * 勤務帯は「名前」で参照する（早番・中番…。集計表示と同じ粒度。名前が同じなら同一勤務帯）。
 *
 * state は稼働日キー("2026-06-01") → 勤務帯名 → 必要人数 の入れ子マップ。
 * 値はすべて plain なので state がそのまま plain 形式を兼ねる。
 * 不変。更新メソッドは新しいインスタンスを返す。
 */
import { WorkingDay } from "./WorkingDay.js";

export type RequiredStaffingState = {
  /** 稼働日キー("2026-06-01") → 勤務帯名 → 必要人数 */
  byDay: Record<string, Record<string, number>>;
};

/** シリアライズ用（state がそのまま plain） */
export type RequiredStaffingPlain = RequiredStaffingState;

const cloneByDay = (
  byDay: Record<string, Record<string, number>>
): Record<string, Record<string, number>> => {
  const out: Record<string, Record<string, number>> = {};
  for (const [dayKey, byName] of Object.entries(byDay)) out[dayKey] = { ...byName };
  return out;
};

export class RequiredStaffing {
  constructor(readonly state: RequiredStaffingState) {}

  /** 何も設定されていない必要スタッフ数 */
  static empty(): RequiredStaffing {
    return new RequiredStaffing({ byDay: {} });
  }

  /** 指定の稼働日すべてに、同じ必要人数（勤務帯名→人数）を設定する */
  static uniform(
    days: WorkingDay[],
    byName: Record<string, number>
  ): RequiredStaffing {
    const byDay: Record<string, Record<string, number>> = {};
    for (const day of days) byDay[day.key] = { ...byName };
    return new RequiredStaffing({ byDay });
  }

  /** その稼働日・その勤務帯名の必要人数（未設定は0） */
  requiredFor(day: WorkingDay, shiftName: string): number {
    return this.state.byDay[day.key]?.[shiftName] ?? 0;
  }

  /** その稼働日の必要人数（勤務帯名→人数）。未設定は空 */
  requiredOn(day: WorkingDay): Record<string, number> {
    return this.state.byDay[day.key] ?? {};
  }

  /**
   * その稼働日・その勤務帯名の必要人数を設定した新インスタンスを返す。不変。
   * count <= 0 ならその設定を取り除く。
   */
  setRequired(day: WorkingDay, shiftName: string, count: number): RequiredStaffing {
    return this.setRequiredForDays([day], shiftName, count);
  }

  /**
   * 複数の稼働日に、その勤務帯名の必要人数をまとめて設定した新インスタンスを返す。不変。
   * count <= 0 ならその設定を取り除く。「全日に一括設定」などに使う。
   */
  setRequiredForDays(
    days: WorkingDay[],
    shiftName: string,
    count: number
  ): RequiredStaffing {
    const byDay = cloneByDay(this.state.byDay);
    for (const day of days) {
      const dayMap = { ...(byDay[day.key] ?? {}) };
      if (count > 0) dayMap[shiftName] = count;
      else delete dayMap[shiftName];
      if (Object.keys(dayMap).length > 0) byDay[day.key] = dayMap;
      else delete byDay[day.key];
    }
    return new RequiredStaffing({ byDay });
  }

  toPlain(): RequiredStaffingPlain {
    return { byDay: cloneByDay(this.state.byDay) };
  }

  static fromPlain(plain: RequiredStaffingPlain | undefined): RequiredStaffing {
    if (!plain) return RequiredStaffing.empty();
    return new RequiredStaffing({ byDay: cloneByDay(plain.byDay ?? {}) });
  }
}
