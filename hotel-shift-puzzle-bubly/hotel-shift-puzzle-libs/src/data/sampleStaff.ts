import { Staff } from "@bublys-org/hotel-shift-puzzle-model";

/** サンプルのスタッフ一覧を生成する */
export function createSampleStaffList(): Staff[] {
  return [
    new Staff({ id: "staff-1", name: "佐藤 花子" }),
    new Staff({ id: "staff-2", name: "鈴木 一郎" }),
    new Staff({ id: "staff-3", name: "高橋 美里" }),
    new Staff({ id: "staff-4", name: "田中 健太" }),
    new Staff({ id: "staff-5", name: "伊藤 さくら" }),
  ];
}
