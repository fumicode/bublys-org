import type { MonthlyStaffSchedule, WorkShift, WorkingDay } from "../../domain/index.js";
import { SHIFT_BG, SHIFT_FG } from "./constants.js";

/**
 * 集計行（勤務帯ごと＋休み）。勤務帯はセルと同じ色で色分けし、必要スタッフ数（分母）を持つ。
 * 休み行は必要数の概念が無いので required は undefined。
 */
export type SummaryRow = {
  key: string;
  label: string;
  bg: string;
  fg: string;
  count: (dayIndex: number) => number;
  /** 必要人数（分母）。休みなど必要数の概念が無い行は undefined */
  required?: (dayIndex: number) => number;
};

/**
 * 集計行を組み立てる。
 * 勤務帯は「名前」で束ねる（同名なら同一勤務帯とみなす）。出現順を保ちつつ同名 ID をまとめ、
 * 色は代表（先頭）勤務帯 ID から引く。最後に「休み」行を足す。
 */
export function buildSummaryRows(
  schedule: MonthlyStaffSchedule,
  days: WorkingDay[],
  shiftOptions: WorkShift[],
  countsByDay: Map<string, number>[],
  dayOffByDay: number[]
): SummaryRow[] {
  const shiftGroups: { name: string; shiftIds: string[] }[] = [];
  const groupIndexByName = new Map<string, number>();
  for (const w of shiftOptions) {
    let idx = groupIndexByName.get(w.name);
    if (idx === undefined) {
      idx = shiftGroups.length;
      groupIndexByName.set(w.name, idx);
      shiftGroups.push({ name: w.name, shiftIds: [] });
    }
    shiftGroups[idx].shiftIds.push(w.id);
  }

  return [
    ...shiftGroups.map((g) => {
      const colorId = g.shiftIds[0];
      return {
        key: `shift:${g.name}`,
        label: g.name,
        bg: SHIFT_BG[colorId] ?? "#eceff1",
        fg: SHIFT_FG[colorId] ?? "#455a64",
        count: (i: number) =>
          g.shiftIds.reduce((sum, id) => sum + (countsByDay[i].get(id) ?? 0), 0),
        required: (i: number) => schedule.requiredFor(days[i], g.name),
      };
    }),
    {
      key: "day-off",
      label: "休み",
      bg: "#f5f5f5",
      fg: "#9e9e9e",
      count: (i: number) => dayOffByDay[i],
    },
  ];
}
