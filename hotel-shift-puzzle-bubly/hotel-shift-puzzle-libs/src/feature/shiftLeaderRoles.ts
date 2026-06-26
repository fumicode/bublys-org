/**
 * shiftLeaderRoles — 責任者ロールの定義と解決（会社ごとに注入する想定の入口）
 *
 * 「中番には中番責任者（昼責）が、夜番（運用上は遅番）には夜番責任者（夜責）が、
 *  各稼働日に最低1人いる」という責任者要件を、勤務表の footer（昼責/夜責欄）で可視化する。
 *
 * ロール定義（ShiftLeaderRoleConfig）は「どのスタッフフラグを見て責任者を選ぶか」を持つ。
 * いまはホテルの既定値をハードコードしているが、いずれは会社ごとの設定から
 * ShiftLeaderRoleConfig[] を組み立てて差し替えられるよう、ここに解決の入口を集約する。
 *
 * ドメイン（ShiftLeaderRole）は解決済みの leaderStaffIds だけを知っていればよいので、
 * resolveShiftLeaderRoles でスタッフ一覧から責任者IDを解決して渡す。
 */
import { Staff, type ShiftLeaderRole } from "@bublys-org/hotel-shift-puzzle-model";

/** 責任者ロールの定義。どのスタッフを責任者とみなすかを述語で持つ。 */
export type ShiftLeaderRoleConfig = {
  /** 一意キー（例: "middle" / "night"） */
  key: string;
  /** 表示ラベル（例: "昼責" / "夜責"） */
  label: string;
  /** 担当する勤務帯の名前（例: "中番" / "遅番"） */
  shiftName: string;
  /** このスタッフがこの役割の責任者か */
  isLeader: (staff: Staff) => boolean;
};

/**
 * ホテルの既定の責任者ロール。
 *   - 昼責: 中番責任者（中番に最低1人）
 *   - 夜責: 夜番責任者（運用上は遅番に最低1人）
 * いまはハードコード。将来は会社設定から組み立てて差し替える。
 */
export const HOTEL_SHIFT_LEADER_ROLES: ShiftLeaderRoleConfig[] = [
  {
    key: "middle",
    label: "昼責",
    shiftName: "中番",
    isLeader: (s) => s.isMiddleShiftLeader,
  },
  {
    key: "night",
    label: "夜責",
    shiftName: "遅番",
    isLeader: (s) => s.isNightShiftLeader,
  },
];

/** ロール定義とスタッフ一覧から、解決済みの ShiftLeaderRole[] を作る。 */
export function resolveShiftLeaderRoles(
  configs: ShiftLeaderRoleConfig[],
  staffList: Staff[]
): ShiftLeaderRole[] {
  return configs.map((c) => ({
    key: c.key,
    label: c.label,
    shiftName: c.shiftName,
    leaderStaffIds: staffList.filter(c.isLeader).map((s) => s.id),
  }));
}
