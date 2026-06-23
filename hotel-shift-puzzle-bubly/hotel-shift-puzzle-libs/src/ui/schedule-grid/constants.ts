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
export const STAFF_COL_WIDTH = 132;
export const DAY_COL_WIDTH = 60;
export const OFF_COL_WIDTH = 48; // 右端「休（合計）」列
