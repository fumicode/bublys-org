import { Staff } from "@bublys-org/hotel-shift-puzzle-model";

/**
 * サンプルのスタッフ一覧を生成する。
 *
 * 責任者ロール（早責=早番 / 予責=予約・早番 / 夜責=夜番＝遅番）を持つスタッフを含む:
 *   - 土屋（管理部）… 夜責。一覧の一番上。
 *   - 山本・小林・高橋 … 早責（山本は予責も兼務）。土屋の後に3人並べる。
 *   - 田中 … 予責。
 *   - 中村 … 夜責（もう1人）。
 * 各ロールは「担当勤務帯に最低1人いる」ことを footer の責任者欄で可視化する。
 */
export function createSampleStaffList(): Staff[] {
  return [
    // 夜責。一番上に置く。
    new Staff({
      id: "staff-tsuchiya",
      name: "土屋 健司",
      department: "管理部",
      leaderRoleKeys: ["night"],
    }),
    // 早責の3人を土屋の後に並べる（山本は予責も兼務）。
    new Staff({
      id: "staff-7",
      name: "山本 由美",
      department: "会計",
      leaderRoleKeys: ["early", "reservation"],
    }),
    new Staff({
      id: "staff-8",
      name: "小林 恵",
      department: "会計",
      leaderRoleKeys: ["early"],
    }),
    new Staff({
      id: "staff-3",
      name: "高橋 美里",
      department: "フロント",
      leaderRoleKeys: ["early"],
    }),
    new Staff({ id: "staff-1", name: "佐藤 花子", department: "フロント" }),
    new Staff({ id: "staff-2", name: "鈴木 一郎", department: "レストラン" }),
    // 田中は予責（予約責任者）。早番に入る。
    new Staff({
      id: "staff-4",
      name: "田中 健太",
      department: "清掃",
      leaderRoleKeys: ["reservation"],
    }),
    new Staff({ id: "staff-5", name: "伊藤 さくら", department: "レストラン" }),
    // 夜責（もう1人）。フロントの男性。
    new Staff({
      id: "staff-6",
      name: "中村 大輔",
      department: "フロント",
      leaderRoleKeys: ["night"],
    }),
  ];
}
