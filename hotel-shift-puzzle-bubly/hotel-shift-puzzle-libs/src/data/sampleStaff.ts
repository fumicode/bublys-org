import { Staff } from "@bublys-org/hotel-shift-puzzle-model";

/**
 * サンプルのスタッフ一覧を生成する。
 *
 * 責任者ロール（早責=早番責任者 / 夜責=夜番責任者）を持つスタッフを含む:
 *   - 土屋（管理部・男性）… 夜番責任者（夜責）。一覧の一番上。
 *   - 中村（フロント・男性）… 夜番責任者（夜責）。もう1人の夜責。
 *   - 会計の女性2人 … 早番責任者（早責）。
 * 各ロールは「2人のうち1人は必ず該当勤務帯にいる」ことを footer の早責/夜責欄で可視化する。
 */
export function createSampleStaffList(): Staff[] {
  return [
    // 夜番責任者（夜責）。一番上に置く。
    new Staff({
      id: "staff-tsuchiya",
      name: "土屋 健司",
      department: "管理部",
      leaderRoleKeys: ["night"],
    }),
    new Staff({ id: "staff-1", name: "佐藤 花子", department: "フロント" }),
    new Staff({ id: "staff-2", name: "鈴木 一郎", department: "レストラン" }),
    new Staff({ id: "staff-3", name: "高橋 美里", department: "フロント" }),
    new Staff({ id: "staff-4", name: "田中 健太", department: "清掃" }),
    new Staff({ id: "staff-5", name: "伊藤 さくら", department: "レストラン" }),
    // もう1人の夜番責任者（夜責）。フロントの男性。
    new Staff({
      id: "staff-6",
      name: "中村 大輔",
      department: "フロント",
      leaderRoleKeys: ["night"],
    }),
    // 早番責任者（早責）。会計の女性2人。
    new Staff({
      id: "staff-7",
      name: "山本 由美",
      department: "会計",
      leaderRoleKeys: ["early"],
    }),
    new Staff({
      id: "staff-8",
      name: "小林 恵",
      department: "会計",
      leaderRoleKeys: ["early"],
    }),
  ];
}
