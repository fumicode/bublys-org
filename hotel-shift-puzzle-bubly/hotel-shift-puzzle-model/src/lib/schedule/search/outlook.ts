/**
 * outlook — 探索の見込み（どのセルに、どの値がどれくらい置かれやすいか。#229）
 *
 * ルール: **評価がいちばん良い水準の盤面を歩いているあいだ、セルごとに値を数える。**
 * 評価が同じ盤面のあいだを歩き回る＝「どちらでも同じくらい良い」。だから
 * どの盤面でも同じ値ならくっきり、割れていればぼやっと、が数えるだけで出る。
 * いちばん良い水準が更新されたら、数え直す（それより悪い盤面の値は混ぜない）。
 */
import type { MonthlyStaffSchedule, ShiftCell } from "../MonthlyStaffSchedule.js";
import type { FreeCell } from "./moves.js";

/** 1セルの見込み：値ごとの割合（大きい順。合計 1） */
export type CellOutlook = {
  staffId: string;
  dayKey: string;
  shares: { value: ShiftCell; share: number }[];
};

const keyOf = (v: ShiftCell): string => (v.kind === "work" ? `work:${v.shiftId}` : v.kind);

/** セルごとに値を数える（探索の中で使う） */
export class OutlookTally {
  private counts: Map<string, { value: ShiftCell; n: number }>[];
  private samples = 0;

  constructor(private readonly cells: readonly FreeCell[]) {
    this.counts = cells.map(() => new Map());
  }

  /** 数え直す（いちばん良い水準が更新されたとき） */
  reset(): void {
    this.counts = this.cells.map(() => new Map());
    this.samples = 0;
  }

  /** いまの盤面を1回ぶん数える */
  observe(schedule: MonthlyStaffSchedule): void {
    this.samples++;
    this.cells.forEach((cell, i) => {
      const value = schedule.statusOf(cell.staffId, cell.day);
      const key = keyOf(value);
      const m = this.counts[i];
      const hit = m.get(key);
      if (hit) hit.n++;
      else m.set(key, { value, n: 1 });
    });
  }

  /** 数えた結果。1回も数えていなければ空 */
  result(): CellOutlook[] {
    if (this.samples === 0) return [];
    return this.cells.map((cell, i) => ({
      staffId: cell.staffId,
      dayKey: cell.day.key,
      shares: [...this.counts[i].values()]
        .map(({ value, n }) => ({ value, share: n / this.samples }))
        .sort((a, b) => b.share - a.share),
    }));
  }
}

/** いくつかの探索（案）の見込みを平均する。案ごとに同じ重みで数える */
export const mergeOutlooks = (outlooks: readonly CellOutlook[][]): CellOutlook[] => {
  const nonEmpty = outlooks.filter((o) => o.length > 0);
  if (nonEmpty.length === 0) return [];
  const byCell = new Map<string, { staffId: string; dayKey: string; values: Map<string, { value: ShiftCell; share: number }> }>();
  for (const outlook of nonEmpty) {
    for (const c of outlook) {
      const id = `${c.staffId}:${c.dayKey}`;
      const entry = byCell.get(id) ?? { staffId: c.staffId, dayKey: c.dayKey, values: new Map() };
      for (const { value, share } of c.shares) {
        const k = keyOf(value);
        const hit = entry.values.get(k);
        if (hit) hit.share += share / nonEmpty.length;
        else entry.values.set(k, { value, share: share / nonEmpty.length });
      }
      byCell.set(id, entry);
    }
  }
  return [...byCell.values()].map(({ staffId, dayKey, values }) => ({
    staffId,
    dayKey,
    shares: [...values.values()].sort((a, b) => b.share - a.share),
  }));
};
