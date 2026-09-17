/**
 * scheduleWorldLineKeys — 勤務表の世界線を動かすショートカット（#165）
 *
 * このアプリでは「編集を元に戻す」＝「勤務表の世界線を1つ前へ戻す」。同じ状態に戻せば
 * 同じノードへ戻る（#154）ので、データの undo を別に持つ理由は無い。
 * 勤務表バブルと勤務表の世界線ビューが、同じこの割り当てを使う（同じキーは同じ意味）。
 */
import type { KeyBinding } from "@bublys-org/bubbles-ui";
import type { CasScopeValue } from "@bublys-org/world-line-graph";

/** Ctrl/Cmd+Z で1つ戻る、Ctrl/Cmd+Shift+Z で1つ進む（進むは同じ世界線の子を優先） */
export const scheduleUndoBindings = (
  scope: Pick<CasScopeValue, "moveBack" | "moveForward">
): KeyBinding[] => [
  { keys: "mod+z", run: scope.moveBack },
  { keys: "mod+shift+z", run: scope.moveForward },
];
