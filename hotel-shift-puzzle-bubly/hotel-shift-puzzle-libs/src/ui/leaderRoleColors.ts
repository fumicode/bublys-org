import type { CSSProperties } from "react";

/**
 * 責任者ロールの色（ロールキー → 配色）。名前の横の責任者の記号（ProfileMarks）も、
 * ルール表示のチップ・制約バーのアイコンもここを共有する。
 * 役割を増やすときの色はここに1エントリ足すだけ（無ければ既定のグレー）。
 */
const ROLE_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  early: { bg: "#e3f2fd", fg: "#1565c0", border: "#90caf9" }, // 早番＝青
  reservation: { bg: "#e0f2f1", fg: "#00796b", border: "#80cbc4" }, // 予責＝ティール
  night: { bg: "#ede7f6", fg: "#5e35b1", border: "#b39ddb" }, // 遅番＝紫
};
const DEFAULT_ROLE_COLOR = { bg: "#eceff1", fg: "#455a64", border: "#cfd8dc" };

/** ロールキーに対応する配色（未登録は既定グレー）。 */
export const leaderRoleColor = (key: string) => ROLE_COLORS[key] ?? DEFAULT_ROLE_COLOR;

/** ロールキーに対応するバッジ/チップの inline スタイル。 */
export const leaderRoleStyle = (key: string): CSSProperties => {
  const c = leaderRoleColor(key);
  return { background: c.bg, color: c.fg, border: `1px solid ${c.border}` };
};
