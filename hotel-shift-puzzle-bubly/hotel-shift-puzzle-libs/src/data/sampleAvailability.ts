import { ScheduleAvailability } from "@bublys-org/hotel-shift-puzzle-model";

/**
 * サンプルの可能勤務帯（スタッフが入れる勤務帯）。人によってばらけさせる。
 * 勤務帯ID: 早番 early / 中番 middle / 遅番 late。
 *
 * 能力（入れる帯）は人の属性なので、どの月の勤務表でも同じ割り当てを使う。
 *   - 佐藤・鈴木 : 全帯OK（鈴木は遅番に積極的＝希望にも遅番を入れている）
 *   - 高橋・伊藤 : 早番・中番のみ（遅番＝夜は入れない）
 *   - 田中       : 中番・遅番のみ（朝が苦手で早番に入れない）
 */
const ALLOWED_SHIFT_IDS_BY_STAFF: Record<string, string[]> = {
  "staff-1": ["early", "middle", "late"],
  "staff-2": ["early", "middle", "late"],
  "staff-3": ["early", "middle"],
  "staff-4": ["middle", "late"],
  "staff-5": ["early", "middle"],
};

/** 指定した勤務表IDに紐づく、人ごとにばらけた可能勤務帯を作る */
export function createSampleAvailabilityFor(scheduleId: string): ScheduleAvailability {
  const byStaff: Record<string, string[]> = {};
  for (const [staffId, shiftIds] of Object.entries(ALLOWED_SHIFT_IDS_BY_STAFF)) {
    byStaff[staffId] = [...shiftIds];
  }
  return new ScheduleAvailability({ scheduleId, byStaff });
}
