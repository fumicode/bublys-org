/**
 * shiftLeaderRoles — 責任者ロールの定義と解決（会社ごとに注入する想定の入口）
 *
 * 「早番には早番責任者（早責）が、夜番（運用上は遅番）には夜番責任者（夜責）が、
 *  各稼働日に最低1人いる」という責任者要件を、勤務表の footer（早責/夜責欄）で可視化する。
 *
 * ロール定義（ShiftLeaderRoleConfig）は「キー・表示ラベル・担当勤務帯・最低人数」を持つ素朴な
 * データ。どのスタッフが責任者かは Staff.leaderRoleKeys（汎用の役割キー）で表すので、役割ごとの
 * 述語は不要——どのロールも `staff.isLeaderOf(key)` という同じコードで解決する。
 * いまはホテルの既定値をハードコードしているが、いずれは会社設定から差し替える入口にする。
 *
 * resolveShiftLeaderRoles はスタッフ一覧から責任者IDを解決し、宣言的ルール
 * `ShiftLeaderRule`（表示も相方裏コマンドもこの同じルールから導出）を組み立てて返す。
 */
import { Staff, ShiftLeaderRule } from "@bublys-org/hotel-shift-puzzle-model";

/** 責任者ロールの定義（役割ごとの差は config データだけ。コードは共通）。 */
export type ShiftLeaderRoleConfig = {
  /** 一意キー（Staff.leaderRoleKeys と対応。例: "early" / "night"） */
  key: string;
  /** 表示ラベル（例: "早責" / "夜責"） */
  label: string;
  /** 担当する勤務帯の名前（例: "早番" / "遅番"） */
  shiftName: string;
  /** 充足に必要な最低人数（既定 1＝「いずれか1人」） */
  minCount?: number;
};

/**
 * ホテルの既定の責任者ロール。すべて同じ形の config エントリ違いにすぎない（コードは共通）。
 *   - 早責: 早番責任者（早番に最低1人）
 *   - 予責: 予約責任者（早番に最低1人）
 *   - 夜責: 夜番責任者（運用上は遅番に最低1人）
 */
export const HOTEL_SHIFT_LEADER_ROLES: ShiftLeaderRoleConfig[] = [
  { key: "early", label: "早責", shiftName: "早番" },
  { key: "reservation", label: "予責", shiftName: "早番" },
  { key: "night", label: "夜責", shiftName: "遅番" },
];

/** ロール定義とスタッフ一覧から、解決済みの ShiftLeaderRule[] を作る。 */
export function resolveShiftLeaderRoles(
  configs: ShiftLeaderRoleConfig[],
  staffList: Staff[]
): ShiftLeaderRule[] {
  return configs.map(
    (c) =>
      new ShiftLeaderRule({
        key: c.key,
        label: c.label,
        shiftName: c.shiftName,
        leaderStaffIds: staffList.filter((s) => s.isLeaderOf(c.key)).map((s) => s.id),
        minCount: c.minCount,
      })
  );
}
