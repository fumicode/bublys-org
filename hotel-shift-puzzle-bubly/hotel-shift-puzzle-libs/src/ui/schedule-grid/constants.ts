// 勤務帯ごとの色（背景・文字）。セル表示と集計行で共有する。
export const SHIFT_BG: Record<string, string> = {
  early: "#e3f2fd",
  middle: "#fff8e1",
  late: "#f3e5f5",
};
export const SHIFT_FG: Record<string, string> = {
  early: "#1565c0",
  middle: "#ef6c00",
  late: "#6a1b9a",
};

// グリッドの列幅
export const STAFF_COL_WIDTH = 168;
export const DAY_COL_WIDTH = 40;
export const OFF_COL_WIDTH = 40; // 右端「休（合計）」列

/**
 * 人数不足セル（集計行の shiftId×day）の data-cell-key 接頭辞。
 * スタッフ×日セルの "staffId:dayKey" と衝突しないよう分けておく（ScheduleGridView の
 * ホバー判定と SummaryRow のセル描画の両方がこれを参照する）。
 */
export const DEMAND_CELL_KEY_PREFIX = "demand:";

/** 人数不足セルの data-cell-key を組み立てる。 */
export const demandCellKey = (shiftId: string, dayKey: string): string =>
  `${DEMAND_CELL_KEY_PREFIX}${shiftId}:${dayKey}`;
