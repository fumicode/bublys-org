/**
 * シフトパズル マスターデータ
 * タスクと時間帯の定義
 */

import { Task, TimeSlot } from "../domain/index.js";

// ========== タスク（係）定義 ==========

export function createDefaultTasks(): Task[] {
  return [
    new Task({
      id: "task-reception",
      name: "受付",
      task: "来場者・参加者の受付対応",
      responsibleDepartment: "総務局",
      description: "参加登録、名札配布、案内業務",
    }),
    new Task({
      id: "task-setup",
      name: "設営",
      task: "会場・機材のセットアップ",
      responsibleDepartment: "技術局",
      description: "机・椅子の配置、AV機器の設置・テスト",
    }),
    new Task({
      id: "task-teardown",
      name: "撤収",
      task: "会場・機材の片付け",
      responsibleDepartment: "技術局",
      description: "机・椅子の撤去、機材の撤収・梱包",
    }),
    new Task({
      id: "task-mc",
      name: "司会進行",
      task: "イベント全体の司会・進行",
      responsibleDepartment: "企画局",
      description: "開会・閉会宣言、プログラム進行管理",
    }),
    new Task({
      id: "task-record",
      name: "記録・広報",
      task: "写真撮影・SNS等の広報対応",
      responsibleDepartment: "広報局",
      description: "写真・動画撮影、SNS投稿、記録保管",
    }),
    new Task({
      id: "task-general",
      name: "総合補助",
      task: "全体の補助・雑務対応",
      responsibleDepartment: "総務局",
      description: "各担当のサポート、臨機応変な対応",
    }),
  ];
}

// ========== 時間帯定義 ==========

export function createDefaultTimeSlots(): TimeSlot[] {
  createDefaultTasks(); // タスク定義の存在確認用

  // 必要人数の設定
  const makeRequirements = (counts: Record<string, number>) => {
    return Object.entries(counts).map(([taskId, count]) => ({
      taskId,
      requiredCount: count,
      minCount: Math.max(1, count - 1),
      maxCount: count + 1,
    }));
  };

  const slots: TimeSlot[] = [
    // ===== 準準備日 =====
    new TimeSlot({
      id: "pre-prep_morning",
      dayType: "準準備日",
      startTime: "09:00",
      endTime: "12:00",
      label: "準準備日 午前",
      taskRequirements: makeRequirements({
        "task-setup": 3,
        "task-general": 2,
      }),
    }),
    new TimeSlot({
      id: "pre-prep_afternoon",
      dayType: "準準備日",
      startTime: "13:00",
      endTime: "17:00",
      label: "準準備日 午後",
      taskRequirements: makeRequirements({
        "task-setup": 4,
        "task-record": 1,
        "task-general": 2,
      }),
    }),

    // ===== 準備日 =====
    new TimeSlot({
      id: "prep_morning",
      dayType: "準備日",
      startTime: "09:00",
      endTime: "12:00",
      label: "準備日 午前",
      taskRequirements: makeRequirements({
        "task-setup": 5,
        "task-general": 3,
      }),
    }),
    new TimeSlot({
      id: "prep_afternoon",
      dayType: "準備日",
      startTime: "13:00",
      endTime: "17:00",
      label: "準備日 午後",
      taskRequirements: makeRequirements({
        "task-setup": 4,
        "task-reception": 2,
        "task-record": 1,
        "task-general": 2,
      }),
    }),

    // ===== 1日目 =====
    new TimeSlot({
      id: "day1_morning",
      dayType: "1日目",
      startTime: "09:00",
      endTime: "12:00",
      label: "1日目 午前",
      taskRequirements: makeRequirements({
        "task-reception": 4,
        "task-mc": 2,
        "task-record": 2,
        "task-general": 3,
      }),
    }),
    new TimeSlot({
      id: "day1_afternoon",
      dayType: "1日目",
      startTime: "13:00",
      endTime: "17:00",
      label: "1日目 午後",
      taskRequirements: makeRequirements({
        "task-reception": 3,
        "task-mc": 2,
        "task-record": 2,
        "task-general": 3,
      }),
    }),
    new TimeSlot({
      id: "day1_evening",
      dayType: "1日目",
      startTime: "17:00",
      endTime: "19:00",
      label: "1日目 夕方",
      taskRequirements: makeRequirements({
        "task-reception": 2,
        "task-general": 2,
      }),
    }),

    // ===== 2日目 =====
    new TimeSlot({
      id: "day2_morning",
      dayType: "2日目",
      startTime: "09:00",
      endTime: "12:00",
      label: "2日目 午前",
      taskRequirements: makeRequirements({
        "task-reception": 4,
        "task-mc": 2,
        "task-record": 2,
        "task-general": 3,
      }),
    }),
    new TimeSlot({
      id: "day2_afternoon",
      dayType: "2日目",
      startTime: "13:00",
      endTime: "17:00",
      label: "2日目 午後",
      taskRequirements: makeRequirements({
        "task-reception": 3,
        "task-mc": 2,
        "task-record": 2,
        "task-general": 3,
      }),
    }),

    // ===== 片付け日 =====
    new TimeSlot({
      id: "cleanup_morning",
      dayType: "片付け日",
      startTime: "09:00",
      endTime: "12:00",
      label: "片付け日 午前",
      taskRequirements: makeRequirements({
        "task-teardown": 5,
        "task-general": 3,
      }),
    }),
    new TimeSlot({
      id: "cleanup_afternoon",
      dayType: "片付け日",
      startTime: "13:00",
      endTime: "17:00",
      label: "片付け日 午後",
      taskRequirements: makeRequirements({
        "task-teardown": 4,
        "task-record": 1,
        "task-general": 2,
      }),
    }),
  ];

  return slots;
}

/** dayTypeの表示順 */
export const DAY_TYPE_ORDER = ["準準備日", "準備日", "1日目", "2日目", "片付け日"] as const;
