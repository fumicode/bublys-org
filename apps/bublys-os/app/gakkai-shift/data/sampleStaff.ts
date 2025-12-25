/**
 * サンプルスタッフデータ
 */

import { Staff_スタッフ, TimeSlot_時間帯 } from "../domain";

const timeSlots = TimeSlot_時間帯.createDefaultTimeSlots();
const allSlotIds = timeSlots.map((s) => s.id);

export function createSampleStaffList(): Staff_スタッフ[] {
  return [
    Staff_スタッフ.create({
      name: "田中 太郎",
      furigana: "たなか たろう",
      email: "tanaka@example.com",
      phone: "090-1234-5678",
      school: "東京大学",
      grade: "修士1年",
      gender: "male",
      skills: {
        pc: "advanced",
        zoom: "advanced",
        english: "daily_conversation",
        eventExperience: true,
        eventExperienceDetail: "学園祭実行委員2年",
      },
      presentation: {
        hasPresentation: true,
        presentations: [{ date: "2025-03-27", period: "afternoon" }],
      },
      availableTimeSlots: allSlotIds.filter((id) => id !== "2025-03-27_afternoon"),
      preferredRoles: ["headquarters", "venue_check"],
      notes: "リーダー経験あり",
    }),
    Staff_スタッフ.create({
      name: "佐藤 花子",
      furigana: "さとう はなこ",
      email: "sato@example.com",
      phone: "090-2345-6789",
      school: "早稲田大学",
      grade: "学部3年",
      gender: "female",
      skills: {
        pc: "intermediate",
        zoom: "intermediate",
        english: "none",
        eventExperience: false,
      },
      presentation: {
        hasPresentation: false,
        presentations: [],
      },
      availableTimeSlots: allSlotIds.slice(2), // 準備日以外
      preferredRoles: ["reception", "cloakroom"],
      notes: "",
    }),
    Staff_スタッフ.create({
      name: "鈴木 健太",
      furigana: "すずき けんた",
      email: "suzuki@example.com",
      phone: "090-3456-7890",
      school: "慶應義塾大学",
      grade: "学部4年",
      gender: "male",
      skills: {
        pc: "beginner",
        zoom: "beginner",
        english: "none",
        eventExperience: true,
        eventExperienceDetail: "部活の運営",
      },
      presentation: {
        hasPresentation: false,
        presentations: [],
      },
      availableTimeSlots: allSlotIds,
      preferredRoles: ["setup", "cloakroom"],
      notes: "体力に自信あり",
    }),
    Staff_スタッフ.create({
      name: "高橋 美咲",
      furigana: "たかはし みさき",
      email: "takahashi@example.com",
      phone: "090-4567-8901",
      school: "東京工業大学",
      grade: "修士2年",
      gender: "female",
      skills: {
        pc: "advanced",
        zoom: "intermediate",
        english: "daily_conversation",
        eventExperience: true,
        eventExperienceDetail: "国際学会ボランティア",
      },
      presentation: {
        hasPresentation: true,
        presentations: [
          { date: "2025-03-26", period: "morning" },
          { date: "2025-03-28", period: "afternoon" },
        ],
      },
      availableTimeSlots: allSlotIds.filter(
        (id) => id !== "2025-03-26_morning" && id !== "2025-03-28_afternoon"
      ),
      preferredRoles: ["venue_check", "mobile_support"],
      notes: "英語対応可能",
    }),
    Staff_スタッフ.create({
      name: "伊藤 大輔",
      furigana: "いとう だいすけ",
      email: "ito@example.com",
      phone: "090-5678-9012",
      school: "一橋大学",
      grade: "学部2年",
      gender: "male",
      skills: {
        pc: "intermediate",
        zoom: "none",
        english: "none",
        eventExperience: false,
      },
      presentation: {
        hasPresentation: false,
        presentations: [],
      },
      availableTimeSlots: allSlotIds.slice(5, 12), // 一部の日程のみ
      preferredRoles: ["poster", "exhibition"],
      notes: "",
    }),
    Staff_スタッフ.create({
      name: "渡辺 さくら",
      furigana: "わたなべ さくら",
      email: "watanabe@example.com",
      phone: "090-6789-0123",
      school: "お茶の水女子大学",
      grade: "学部4年",
      gender: "female",
      skills: {
        pc: "intermediate",
        zoom: "intermediate",
        english: "daily_conversation",
        eventExperience: true,
        eventExperienceDetail: "オープンキャンパススタッフ",
      },
      presentation: {
        hasPresentation: false,
        presentations: [],
      },
      availableTimeSlots: allSlotIds,
      preferredRoles: ["reception", "venue"],
      notes: "コミュニケーション能力高い",
    }),
    Staff_スタッフ.create({
      name: "山本 翔太",
      furigana: "やまもと しょうた",
      email: "yamamoto@example.com",
      phone: "090-7890-1234",
      school: "東京大学",
      grade: "博士1年",
      gender: "male",
      skills: {
        pc: "advanced",
        zoom: "advanced",
        english: "daily_conversation",
        eventExperience: true,
        eventExperienceDetail: "学会運営経験3回",
      },
      presentation: {
        hasPresentation: true,
        presentations: [{ date: "2025-03-27", period: "morning" }],
      },
      availableTimeSlots: allSlotIds.filter((id) => id !== "2025-03-27_morning"),
      preferredRoles: ["headquarters"],
      notes: "過去に年会本部経験あり",
    }),
    Staff_スタッフ.create({
      name: "中村 愛",
      furigana: "なかむら あい",
      email: "nakamura@example.com",
      phone: "090-8901-2345",
      school: "明治大学",
      grade: "学部3年",
      gender: "female",
      skills: {
        pc: "beginner",
        zoom: "beginner",
        english: "none",
        eventExperience: false,
      },
      presentation: {
        hasPresentation: false,
        presentations: [],
      },
      availableTimeSlots: allSlotIds.slice(2, 10),
      preferredRoles: ["cloakroom", "party_cloakroom"],
      notes: "懇親会参加可能",
    }),
  ];
}
