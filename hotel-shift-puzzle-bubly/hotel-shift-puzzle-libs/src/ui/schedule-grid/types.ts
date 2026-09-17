import type { ShiftCell, WorkingDay } from "../../domain/index.js";

/**
 * キーボード操作のカーソル（勤務表の中の居場所）。**カーソルは1つ**で、居場所の種類が違うだけ。
 *   - staff    : スタッフ行のセル（どのスタッフ・どの日か）
 *   - required : 必要人数の行のセル（どの勤務帯・どの日か）。day が null なら行の見出し＝全日まとめて
 * 範囲選択（#157）はこのカーソルの上に SelectionArea の集まりとして重ねる。
 */
export type CellSelection =
  | { kind: "staff"; staffId: string; day: WorkingDay }
  | { kind: "required"; shiftName: string; day: WorkingDay | null };

/**
 * 範囲選択の1つの長方形（#157）。anchor は起点（Excel のアクティブセル）、extent は Shift で動く反対の角。
 * 必ず同じ種類の場所の中に収まる（gridSelection）。
 */
export type SelectionArea = { anchor: CellSelection; extent: CellSelection };

/** スタッフ行のセル1つへの入力 */
export type CellChange = { staffId: string; day: WorkingDay; to: ShiftCell };

/** 必要人数のセル1つへの入力。day が null なら全日まとめて（行の見出し） */
export type RequiredChange = { shiftName: string; day: WorkingDay | null; count: number };

/** スタッフ行のセルの位置 */
export type CellRef = { staffId: string; day: WorkingDay };

/** 表の並び（行＝スタッフ、列＝稼働日）。キーボードのカーソルと同じ並び */
export type GridOrder = { staffIds: string[]; days: WorkingDay[] };

/**
 * セルのコピー・カット・貼り付け（#166）。組み立てと記録は feature 層が持つ。
 *   - 値のみ（Ctrl/Cmd+V）          : 見えている文字を、貼り付け先の位置で貼る
 *   - オブジェクトとして（+Shift）   : セルの中身を、メンバーと日付で貼る
 */
export type CellClipboardHandlers = {
  /**
   * 選択のセル（表の上から・左から順）をコピー／カットする。OS のクリップボードに書く文字を返す。
   * columns は1つの長方形のときの列数。飛び地を含む選択は null（文字は書けない）
   */
  onCopyCells: (
    cells: CellRef[],
    opts: { cut: boolean; columns: number | null }
  ) => string | undefined;
  /** 値のみで貼る（クリップボードの文字を、選択の位置に） */
  onPasteValues: (text: string, ctx: GridOrder & { targets: CellRef[] }) => void;
  /** オブジェクトとして貼る（最後にコピーした中身を、メンバーと日付で） */
  onPasteObjects: (ctx: GridOrder) => void;
  /** カットの点線を消す。消したら true */
  onCancelCut: () => boolean;
  /** カット中の元のセルか（点線を出す） */
  isCutSource: (staffId: string, day: WorkingDay) => boolean;
};

/** 必要人数編集メニューの対象。day=null は「全稼働日に一括」 */
export type EditingRequired = {
  anchor: HTMLElement;
  shiftName: string;
  day: WorkingDay | null;
  current: number;
};
