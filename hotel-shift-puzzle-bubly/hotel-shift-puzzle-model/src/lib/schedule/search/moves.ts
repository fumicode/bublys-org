/**
 * moves — 探索で勤務表を小さく動かす手（近傍）
 *
 * ルール: **動かしてよいのは、元の勤務表で未定だったセルだけ**（人間が入力したセルは上書きしない。
 * 自動シフトの大原則と同じ）。未定に戻すのも手の1つ（空けたまま残してよい）。
 *
 * 近傍は差し替えられる：探索は Neighborhood の配列を受け取り、毎回どれか1つから手をもらう。
 * 足したいときは Neighborhood を1つ書いて配列に加えるだけ。
 */
import type { MonthlyStaffSchedule, ShiftCell } from "../MonthlyStaffSchedule.js";
import type { WorkingDay } from "../WorkingDay.js";

/**
 * 動かしてよいセル（元の勤務表で未定だったセル）。
 * values を持てば、そのセルにはそれだけを置く（人ごとに置ける値が違うとき。例：責任者は担当勤務帯か休み）。
 * 持たなければ探索全体の値（MoveContext.values）を置く。
 */
export type FreeCell = { staffId: string; day: WorkingDay; values?: readonly ShiftCell[] };

/** 0 以上 1 未満の乱数を返す関数（種つきで決定的にできる） */
export type Rng = () => number;

/** 1つの手 */
export type Move = {
  /** 手の種類（統計・説明用） */
  kind: string;
  apply(schedule: MonthlyStaffSchedule): MonthlyStaffSchedule;
};

/** 手を出すときに見られるもの */
export type MoveContext = {
  schedule: MonthlyStaffSchedule;
  freeCells: readonly FreeCell[];
  /** セルに置ける値（休み・未定・各勤務帯） */
  values: readonly ShiftCell[];
  /** 日（key）→ その日の動かしてよいセル */
  freeCellsByDay: ReadonlyMap<string, readonly FreeCell[]>;
  /** 人 → その人の動かしてよいセル */
  freeCellsByStaff: ReadonlyMap<string, readonly FreeCell[]>;
};

/** 手の出し方（近傍）。出せる手が無ければ undefined */
export type Neighborhood = {
  readonly kind: string;
  propose(ctx: MoveContext, rng: Rng): Move | undefined;
};

const pick = <T>(items: readonly T[], rng: Rng): T | undefined =>
  items.length === 0 ? undefined : items[Math.floor(rng() * items.length)];

export const sameCell = (a: ShiftCell, b: ShiftCell): boolean =>
  a.kind === b.kind && (a.kind !== "work" || (b.kind === "work" && a.shiftId === b.shiftId));

/** そのセルに置ける値 */
const valuesFor = (ctx: MoveContext, cell: FreeCell): readonly ShiftCell[] =>
  cell.values ?? ctx.values;

/** そのセルにその値を置けるか（入れ替え・移動の手が、置けない値を持ち込まないように） */
const accepts = (ctx: MoveContext, cell: FreeCell, value: ShiftCell): boolean =>
  valuesFor(ctx, cell).some((v) => sameCell(v, value));

/** 動かしてよいセルを、日ごと・人ごとに引けるようにする */
export const moveContextOf = (
  schedule: MonthlyStaffSchedule,
  freeCells: readonly FreeCell[],
  values: readonly ShiftCell[]
): MoveContext => {
  const byDay = new Map<string, FreeCell[]>();
  const byStaff = new Map<string, FreeCell[]>();
  for (const cell of freeCells) {
    byDay.set(cell.day.key, [...(byDay.get(cell.day.key) ?? []), cell]);
    byStaff.set(cell.staffId, [...(byStaff.get(cell.staffId) ?? []), cell]);
  }
  return { schedule, freeCells, values, freeCellsByDay: byDay, freeCellsByStaff: byStaff };
};

/** 1つのセルの値を、別の値（休み・未定・勤務帯）に替える */
export const changeCell: Neighborhood = {
  kind: "change-cell",
  propose(ctx, rng) {
    const cell = pick(ctx.freeCells, rng);
    if (!cell) return undefined;
    const current = ctx.schedule.statusOf(cell.staffId, cell.day);
    const to = pick(
      valuesFor(ctx, cell).filter((v) => !sameCell(v, current)),
      rng
    );
    if (!to) return undefined;
    return { kind: this.kind, apply: (s) => s.setCell(cell.staffId, cell.day, to) };
  },
};

/** 同じ日の2人の値を入れ替える（その日の人数は変えずに、誰が入るかを変える） */
export const swapOnDay: Neighborhood = {
  kind: "swap-on-day",
  propose(ctx, rng) {
    const day = pick([...ctx.freeCellsByDay.keys()], rng);
    const cells = day ? (ctx.freeCellsByDay.get(day) ?? []) : [];
    const a = pick(cells, rng);
    if (!a) return undefined;
    const av = ctx.schedule.statusOf(a.staffId, a.day);
    const b = pick(
      cells.filter((c) => {
        const cv = ctx.schedule.statusOf(c.staffId, c.day);
        return !sameCell(cv, av) && accepts(ctx, c, av) && accepts(ctx, a, cv);
      }),
      rng
    );
    if (!b) return undefined;
    const bv = ctx.schedule.statusOf(b.staffId, b.day);
    return {
      kind: this.kind,
      apply: (s) => s.setCell(a.staffId, a.day, bv).setCell(b.staffId, b.day, av),
    };
  },
};

/** 同じ人の休みを、別の日へ動かす（その人の休みの日数は変えずに、どこで休むかを変える） */
export const moveDayOff: Neighborhood = {
  kind: "move-day-off",
  propose(ctx, rng) {
    const staffId = pick([...ctx.freeCellsByStaff.keys()], rng);
    const cells = staffId ? (ctx.freeCellsByStaff.get(staffId) ?? []) : [];
    const offs = cells.filter((c) => ctx.schedule.statusOf(c.staffId, c.day).kind === "day-off");
    const from = pick(offs, rng);
    if (!from) return undefined;
    const others = cells.filter((c) => {
      const cv = ctx.schedule.statusOf(c.staffId, c.day);
      return cv.kind !== "day-off" && accepts(ctx, c, { kind: "day-off" }) && accepts(ctx, from, cv);
    });
    const to = pick(others, rng);
    if (!to) return undefined;
    const toValue = ctx.schedule.statusOf(to.staffId, to.day);
    return {
      kind: this.kind,
      apply: (s) =>
        s.setCell(from.staffId, from.day, toValue).setCell(to.staffId, to.day, { kind: "day-off" }),
    };
  },
};

/** 既定の近傍 */
export const DEFAULT_NEIGHBORHOODS: readonly Neighborhood[] = [changeCell, swapOnDay, moveDayOff];
