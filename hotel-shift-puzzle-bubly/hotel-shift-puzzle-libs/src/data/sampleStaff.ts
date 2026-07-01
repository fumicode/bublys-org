import { Staff } from "@bublys-org/hotel-shift-puzzle-model";

/**
 * サンプルのスタッフ一覧を生成する。
 *
 * 誰が早責/予責/夜責かはスタッフの属性ではなく勤務表側の制約なので、ここには持たせない
 * （ScheduleConstraints / data/sampleConstraints.ts が持つ）。並び順だけは責任者が上に来る
 * ようにしてある（土屋＝夜責 → 早責3人 → …）。
 */
export function createSampleStaffList(): Staff[] {
  return [
    new Staff({ id: "staff-tsuchiya", name: "土屋 健司", department: "管理部" }),
    new Staff({ id: "staff-7", name: "山本 由美", department: "会計" }),
    new Staff({ id: "staff-8", name: "小林 恵", department: "会計" }),
    new Staff({ id: "staff-3", name: "高橋 美里", department: "フロント" }),
    new Staff({ id: "staff-1", name: "佐藤 花子", department: "フロント" }),
    new Staff({ id: "staff-2", name: "鈴木 一郎", department: "レストラン" }),
    new Staff({ id: "staff-4", name: "田中 健太", department: "清掃" }),
    new Staff({ id: "staff-5", name: "伊藤 さくら", department: "レストラン" }),
    new Staff({ id: "staff-6", name: "中村 大輔", department: "フロント" }),
  ];
}
