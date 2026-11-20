/**
 * 勤務表の日付に添える六曜（#235）。
 *
 * ★ **暦バブリのモデル（koyomi-model）を import するのは、シフトントンの中でここだけ。**
 *   バブリ同士は互いを名指ししないのが決まり（docs/bubly-composition.md）だが、つなぐ「口」が
 *   まだ無いので、当面ここで直接引く。口ができたら、ここを口からの答えに置き換える。
 *   勤務表の表示（ScheduleGridView / ScheduleDayView）は暦を知らず、日付の注記（DayNote）を
 *   受け取るだけにしてある。
 */
import { rokuyoOf, type RokuyoId } from "@bublys-org/koyomi-model";
import type { WorkingDay } from "@bublys-org/hotel-shift-puzzle-model";
import type { DayNote, DayNoteTone } from "../ui/schedule-grid/cellSymbols.js";

/** 色を付ける六曜（婚礼などで忙しさが変わるもの）。ほかは地の文字色 */
const TONE: Partial<Record<RokuyoId, DayNoteTone>> = {
  taian: "lucky",
  tomobiki: "friend",
  butsumetsu: "unlucky",
};

/** その日の六曜を注記にする。旧暦の表の範囲（2020〜2032年）の外なら undefined */
export function rokuyoNoteOf(day: WorkingDay): DayNote | undefined {
  const r = rokuyoOf({ year: day.year, month: day.month, day: day.day });
  return r && { label: r.label, tone: TONE[r.id], title: `六曜：${r.label}` };
}
