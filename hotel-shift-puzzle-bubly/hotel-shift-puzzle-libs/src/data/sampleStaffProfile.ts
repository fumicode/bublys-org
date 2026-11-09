import {
  ProfileItem,
  ProfileValue,
  StaffProfileDictionary,
} from "@bublys-org/hotel-shift-puzzle-model";

/** 例データの辞書の項目 ID（例データの名簿が値を選ぶのに使う） */
export const SAMPLE_PROFILE_ITEM = {
  experience: "experience",
  employment: "employment",
  status: "status",
} as const;

/**
 * 例データのスタッフプロファイルの辞書（#236）。
 * 名前の横に記号が出るのは 🔰（経験＝新人）だけ。ほかは記号を付けず、スタッフ詳細で読む。
 */
export function createSampleStaffProfileDictionary(): StaffProfileDictionary {
  return StaffProfileDictionary.empty()
    .addItem(
      new ProfileItem({
        id: SAMPLE_PROFILE_ITEM.experience,
        category: "basic",
        name: "経験",
        choice: "one",
        values: [
          new ProfileValue({ id: "new", label: "新人", symbol: "🔰" }),
          new ProfileValue({ id: "mid", label: "中堅" }),
          new ProfileValue({ id: "veteran", label: "ベテラン" }),
        ],
      })
    )
    .addItem(
      new ProfileItem({
        id: SAMPLE_PROFILE_ITEM.employment,
        category: "basic",
        name: "雇用形態",
        choice: "one",
        values: [
          new ProfileValue({ id: "full-time", label: "正社員" }),
          new ProfileValue({ id: "part-time", label: "パート" }),
          new ProfileValue({ id: "casual", label: "アルバイト" }),
        ],
      })
    )
    .addItem(
      new ProfileItem({
        id: SAMPLE_PROFILE_ITEM.status,
        category: "status",
        name: "在籍状況",
        choice: "one",
        values: [
          new ProfileValue({ id: "active", label: "在職" }),
          new ProfileValue({ id: "leave", label: "休職" }),
          new ProfileValue({ id: "training", label: "研修中" }),
        ],
      })
    );
}
