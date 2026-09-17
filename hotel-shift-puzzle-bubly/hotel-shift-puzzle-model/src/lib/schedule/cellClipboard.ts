/**
 * cellClipboard — 勤務表のセルのコピー・貼り付け（純粋関数。#166）
 *
 * コピーは「見えている文字」と「セルの中身」の両方を持つ。
 *   - 値のみ（文字）      : OS のクリップボードに TSV で置く（Excel と共有できる）。
 *                           **貼る場所は貼り付け先のセルの位置**で決まる
 *   - オブジェクトとして  : メンバー・日付・勤務帯を持ったまま運ぶ（アプリ内だけ）。
 *                           **貼る場所はメンバーと日付**で決まる（別の勤務表・別の案でも同じ人・同じ日）
 *
 * どちらも、貼れないセルは飛ばして理由ごとに数える。可能勤務帯は人に紐づくのでコピーの対象外だが、
 * 貼り付け先の可能勤務帯に無い値は貼らない。制約違反になる値は貼る（人の操作なのでセル入力と同じ）。
 */
import type { WorkingStaffGroup } from "../staff/WorkingStaffGroup.js";
import type { ShiftCell } from "./MonthlyStaffSchedule.js";
import type { WorkShift } from "./WorkShift.js";
import type { WorkingDay } from "./WorkingDay.js";
import { resolveShiftInput } from "./resolveShiftInput.js";

/** コピーしたセル1つ（中身）。勤務帯は ID と名前の両方を持つ（ID で合わせ、無ければ名前） */
export type CopiedCell = {
  staffId: string;
  dayKey: string;
  cell: ShiftCell;
  /** 出勤のときの勤務帯名（別の勤務表で ID が無いときに名前で合わせる） */
  shiftName?: string;
};

/** 貼れなかった理由 */
export type PasteSkipReason =
  | "no-staff"
  | "no-day"
  | "no-shift"
  | "not-allowed"
  | "unreadable"
  | "out-of-grid";

/** 貼る1セル */
export type CellPaste = { staffId: string; day: WorkingDay; to: ShiftCell };

/** 貼り付けの計画：入れる変更と、理由ごとの貼れなかった件数 */
export type PastePlan = {
  changes: CellPaste[];
  skipped: Record<PasteSkipReason, number>;
};

const emptySkipped = (): Record<PasteSkipReason, number> => ({
  "no-staff": 0,
  "no-day": 0,
  "no-shift": 0,
  "not-allowed": 0,
  "unreadable": 0,
  "out-of-grid": 0,
});

/** 休みの表示（セルの表示・打つ入力と同じ） */
const DAY_OFF_TEXT = "休";

/** セルを中身としてコピーする（勤務帯名を添える） */
export function copyCell(
  staffId: string,
  day: WorkingDay,
  cell: ShiftCell,
  shifts: readonly WorkShift[]
): CopiedCell {
  const shiftName =
    cell.kind === "work" ? shifts.find((w) => w.id === cell.shiftId)?.name : undefined;
  return { staffId, dayKey: day.key, cell, ...(shiftName ? { shiftName } : {}) };
}

/** セル1つの見えている文字。出勤＝開始時刻の「時」（セルの表示と同じ）、休み＝「休」、未定＝空 */
export function cellText(cell: ShiftCell, shifts: readonly WorkShift[]): string {
  if (cell.kind === "day-off") return DAY_OFF_TEXT;
  if (cell.kind === "undecided") return "";
  const shift = shifts.find((w) => w.id === cell.shiftId);
  return shift ? String(shift.startHour) : cell.shiftId;
}

/** 行×列のセルを TSV にする（Excel に貼れる形） */
export function cellsToText(rows: ShiftCell[][], shifts: readonly WorkShift[]): string {
  return rows.map((row) => row.map((cell) => cellText(cell, shifts)).join("\t")).join("\n");
}

/** クリップボードの文字（TSV）を行×列に分ける。改行は \r\n / \n、末尾の空行は捨てる */
export function parseClipboardText(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.map((line) => line.split("\t"));
}

/** その人のセルに入れられるか（出勤のときだけ可能勤務帯を見る。休み・未定は誰にでも入る） */
const isAllowed = (staffGroup: WorkingStaffGroup | undefined, staffId: string, to: ShiftCell) =>
  to.kind !== "work" || !staffGroup || staffGroup.isAllowed(staffId, to.shiftId);

type PasteLayout = {
  /** 行の並び（表示順のスタッフ） */
  staffIds: readonly string[];
  /** 列の並び（稼働日） */
  days: readonly WorkingDay[];
  /** 貼り付け先の勤務表で使える勤務帯 */
  shifts: readonly WorkShift[];
  /** 貼り付け先の勤務スタッフ群（可能勤務帯の判定。無ければ絞らない） */
  staffGroup?: WorkingStaffGroup;
};

/**
 * 値のみで貼る（位置で決まる）。
 *   - 値が1つなら、選択の全セル（targets）へ
 *   - 表なら、選択の左上（targets の先頭）から。表の外にはみ出した分は out-of-grid
 * 文字は打って入力したのと同じ解釈（resolveShiftInput）で読む。空は未定、読めなければ unreadable。
 */
export function planValuePaste(
  args: PasteLayout & {
    grid: string[][];
    /** 選択中のセル（表の上から・左から順） */
    targets: readonly { staffId: string; day: WorkingDay }[];
  }
): PastePlan {
  const { grid, targets, staffIds, days, shifts, staffGroup } = args;
  const skipped = emptySkipped();
  const changes: CellPaste[] = [];

  const put = (staffId: string, day: WorkingDay, text: string) => {
    const to: ShiftCell | undefined =
      text.trim() === "" ? { kind: "undecided" } : resolveShiftInput(text, [...shifts]);
    if (!to) {
      skipped.unreadable++;
      return;
    }
    if (!isAllowed(staffGroup, staffId, to)) {
      skipped["not-allowed"]++;
      return;
    }
    changes.push({ staffId, day, to });
  };

  if (grid.length === 0 || targets.length === 0) return { changes, skipped };

  // 値が1つ → 選択の全セルへ
  if (grid.length === 1 && grid[0].length === 1) {
    for (const t of targets) put(t.staffId, t.day, grid[0][0]);
    return { changes, skipped };
  }

  // 表 → 選択の左上から
  const top = staffIds.indexOf(targets[0].staffId);
  const left = days.findIndex((d) => d.key === targets[0].day.key);
  if (top < 0 || left < 0) return { changes, skipped };
  grid.forEach((row, r) => {
    row.forEach((text, c) => {
      const staffId = staffIds[top + r];
      const day = days[left + c];
      if (staffId === undefined || day === undefined) {
        skipped["out-of-grid"]++;
        return;
      }
      put(staffId, day, text);
    });
  });
  return { changes, skipped };
}

/**
 * オブジェクトとして貼る（メンバーと日付で決まる。選択は見ない）。
 * 勤務帯は ID で合わせ、無ければ名前で合わせる。
 */
export function planObjectPaste(
  args: PasteLayout & { copied: readonly CopiedCell[] }
): PastePlan {
  const { copied, staffIds, days, shifts, staffGroup } = args;
  const skipped = emptySkipped();
  const changes: CellPaste[] = [];
  const dayByKey = new Map(days.map((d) => [d.key, d]));

  for (const c of copied) {
    if (!staffIds.includes(c.staffId)) {
      skipped["no-staff"]++;
      continue;
    }
    const day = dayByKey.get(c.dayKey);
    if (!day) {
      skipped["no-day"]++;
      continue;
    }
    let to: ShiftCell = c.cell;
    if (c.cell.kind === "work") {
      const workCell = c.cell;
      const shift =
        shifts.find((w) => w.id === workCell.shiftId) ??
        (c.shiftName ? shifts.find((w) => w.name === c.shiftName) : undefined);
      if (!shift) {
        skipped["no-shift"]++;
        continue;
      }
      to = { kind: "work", shiftId: shift.id };
    }
    if (!isAllowed(staffGroup, c.staffId, to)) {
      skipped["not-allowed"]++;
      continue;
    }
    changes.push({ staffId: c.staffId, day, to });
  }
  return { changes, skipped };
}

const SKIP_LABELS: Record<PasteSkipReason, string> = {
  "no-staff": "表に居ない人",
  "no-day": "表に無い日",
  "no-shift": "この勤務表に無い勤務帯",
  "not-allowed": "可能勤務帯に無い",
  "unreadable": "読めない文字",
  "out-of-grid": "表の外",
};

/** 貼れなかった件数の知らせ（「3件貼れませんでした（居ない人 2・可能勤務帯に無い 1）」）。0件なら undefined */
export function describeSkipped(skipped: Record<PasteSkipReason, number>): string | undefined {
  const parts = (Object.keys(SKIP_LABELS) as PasteSkipReason[])
    .filter((reason) => skipped[reason] > 0)
    .map((reason) => `${SKIP_LABELS[reason]} ${skipped[reason]}`);
  if (parts.length === 0) return undefined;
  const total = Object.values(skipped).reduce((a, b) => a + b, 0);
  return `${total}件貼れませんでした（${parts.join("・")}）`;
}

