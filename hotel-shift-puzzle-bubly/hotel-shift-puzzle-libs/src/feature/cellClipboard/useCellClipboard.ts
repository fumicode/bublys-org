/**
 * useCellClipboard — 勤務表のセルのコピー・カット・貼り付けを組み立てて記録する（#166）
 *
 * キーとクリップボードのイベントは UI 層（useCellKeyboardEditing）が受け、ここへ渡す。
 * ここは「何を貼るか」を純粋関数（cellClipboard / cutPaste）で決め、勤務表の世界線に記録する。
 *   - 1回の貼り付け＝1ノード（recordSetCells）
 *   - 別の勤務表からのカットは、元の勤務表の世界線にも「元を空ける」を1ノード記録する
 *   - 貼れなかった分は理由ごとの件数を onMessage で知らせる
 */
import {
  copyCell,
  cellsToText,
  describeSkipped,
  parseClipboardText,
  planObjectPaste,
  planValuePaste,
  type MonthlyStaffSchedule,
  type PastePlan,
  type ShiftCell,
  type WorkShift,
  type WorkingStaffGroup,
} from "@bublys-org/hotel-shift-puzzle-model";
import type { CellClipboardHandlers } from "../../ui/schedule-grid/types.js";
import { localScopeId, readFromScope } from "../../objects/commit.js";
import { SCHEDULE_TYPE } from "../../objects/hotelObjects.js";
import { recordSetCells } from "../recordScheduleEdit.js";
import { cellClipboardStore, useCellClipboardContent } from "./clipboardStore.js";
import { withCutCleared } from "./cutPaste.js";

type StoreLike = Parameters<typeof recordSetCells>[0];

/** OS が改行を \r\n に変えたり末尾に改行を足したりしても、同じ文字とみなす */
const sameText = (a: string, b: string) => {
  const normalize = (t: string) => t.replace(/\r\n?/g, "\n").replace(/\n+$/, "");
  return normalize(a) === normalize(b);
};

export function useCellClipboard(args: {
  store: StoreLike;
  /** 読み込み中（undefined）のあいだは何もしない */
  schedule: MonthlyStaffSchedule | undefined;
  workShifts: WorkShift[];
  staffGroup?: WorkingStaffGroup;
  onMessage: (message: string) => void;
}): CellClipboardHandlers {
  const { store, schedule, workShifts, staffGroup, onMessage } = args;
  const scheduleId = schedule?.id;
  const content = useCellClipboardContent();

  const cutKeys =
    content?.cut && scheduleId && content.scheduleId === scheduleId
      ? new Set(content.cells.map((c) => `${c.staffId}:${c.dayKey}`))
      : undefined;

  /** 計画した貼り付けを記録する（カットなら元を空ける） */
  const apply = (plan: PastePlan, isCut: boolean) => {
    if (!schedule || !scheduleId) return;
    const current = cellClipboardStore.get();
    const cut = isCut && current?.cut ? current : undefined;
    const { targetChanges, sourceClears } = withCutCleared({
      changes: plan.changes,
      targetScheduleId: scheduleId,
      cut,
    });
    if (targetChanges.length > 0) recordSetCells(store, { schedule, changes: targetChanges });

    const messages: string[] = [];
    if (sourceClears) {
      const source = readFromScope<MonthlyStaffSchedule>(
        store,
        localScopeId(SCHEDULE_TYPE, sourceClears.scheduleId),
        SCHEDULE_TYPE,
        sourceClears.scheduleId
      );
      if (source) recordSetCells(store, { schedule: source, changes: sourceClears.changes });
      else messages.push("カット元の勤務表を読めなかったため、元のセルは空けていません");
    }
    // カットは1回だけ貼れる（Excel と同じ）。何か貼れたら印を消す
    if (cut && plan.changes.length > 0) cellClipboardStore.set(null);

    const skipped = describeSkipped(plan.skipped);
    if (skipped) messages.unshift(skipped);
    if (messages.length > 0) onMessage(messages.join("。"));
  };

  return {
    onCopyCells: (cells, { cut, columns }) => {
      if (!schedule || !scheduleId || cells.length === 0) return undefined;
      const statuses: ShiftCell[] = cells.map((c) => schedule.statusOf(c.staffId, c.day));
      const text =
        columns === null
          ? undefined
          : cellsToText(
              Array.from({ length: Math.ceil(statuses.length / columns) }, (_, r) =>
                statuses.slice(r * columns, (r + 1) * columns)
              ),
              workShifts
            );
      cellClipboardStore.set({
        scheduleId,
        cells: cells.map((c, i) => copyCell(c.staffId, c.day, statuses[i], workShifts)),
        cut,
        text,
      });
      if (columns === null) {
        onMessage(
          "離れたセルを含む選択は、オブジェクトとして（Ctrl/Cmd+Shift+V）だけ貼れます"
        );
      }
      return text;
    },

    onPasteValues: (text, { targets, staffIds, days }) => {
      const plan = planValuePaste({
        grid: parseClipboardText(text),
        targets,
        staffIds,
        days,
        shifts: workShifts,
        staffGroup,
      });
      // クリップボードの文字が、このカットで書いたものならカットとして貼る
      const current = cellClipboardStore.get();
      apply(plan, !!current?.cut && current.text !== undefined && sameText(current.text, text));
    },

    onPasteObjects: ({ staffIds, days }) => {
      const current = cellClipboardStore.get();
      if (!current) {
        onMessage("オブジェクトとして貼れるコピーがありません（先に勤務表のセルをコピーしてください）");
        return;
      }
      const plan = planObjectPaste({
        copied: current.cells,
        staffIds,
        days,
        shifts: workShifts,
        staffGroup,
      });
      apply(plan, current.cut);
    },

    onCancelCut: () => {
      if (!cellClipboardStore.get()?.cut) return false;
      cellClipboardStore.set(null);
      return true;
    },

    isCutSource: (staffId, day) => !!cutKeys?.has(`${staffId}:${day.key}`),
  };
}
