import { FC } from "react";
import { CellFace, type CellFaceProps } from "./CellFace.js";

type ScheduleDataCellProps = Omit<
  CellFaceProps,
  "onMouseDown" | "onMouseEnter" | "onDoubleClick"
> & {
  /** セルを一意に指すキー（"staffId:dayKey"）。候補ドロップダウンのアンカー特定に使う */
  cellKey: string;
  /** 押した（左ボタン）。選択するのは受け取り側（修飾キーで範囲・飛び地） */
  onPress: (e: React.MouseEvent<HTMLDivElement>) => void;
  /** 押したまま入ってきた（ドラッグで範囲を広げる） */
  onDragEnter?: () => void;
  /** ダブルクリックで候補ドロップダウンを開く（マウス操作用） */
  onOpenEditor: () => void;
};

/**
 * 勤務表の 1 セル（スタッフ×日）。見た目は CellFace に任せ、ここは操作だけを足す。
 * 押して選択（Shift で範囲・Ctrl/Cmd で飛び地・ドラッグで範囲）、ダブルクリックで候補ドロップダウン
 * （キーボード操作と共通）。
 */
export const ScheduleDataCell: FC<ScheduleDataCellProps> = ({
  cellKey,
  onPress,
  onDragEnter,
  onOpenEditor,
  ...faceProps
}) => (
  <CellFace
    {...faceProps}
    role="button"
    data-cell-key={cellKey}
    onMouseDown={(e) => {
      if (e.button === 0) onPress(e);
    }}
    onMouseEnter={(e) => {
      // 押したまま入ってきた＝ドラッグで範囲を広げる
      if (e.buttons & 1) onDragEnter?.();
    }}
    onDoubleClick={onOpenEditor}
  />
);
