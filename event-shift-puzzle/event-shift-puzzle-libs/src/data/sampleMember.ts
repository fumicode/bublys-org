/**
 * サンプル局員データ
 *
 * 所属（8局）: 制作局 / 総務局 / 財務局 / 渉外局 / 産学局 / 企画局 / 情報局 / 執行部
 * 参加可能時間は DayType 毎に 15分刻みで指定する。
 */

import { Member, type AvailabilityByDayType, type DayType, type TimeRange } from "../domain/index.js";
import { DAY_TYPE_ORDER } from "./sampleData.js";

/** HH:MM → 絶対分 */
const m = (hhmm: string): number => {
  const [h, mm] = hhmm.split(':').map(Number);
  return h * 60 + mm;
};

/** 時間範囲（"09:00-12:00" のような表記）を TimeRange に変換 */
const r = (startHHMM: string, endHHMM: string): TimeRange => ({
  startMinute: m(startHHMM),
  endMinute: m(endHHMM),
});

// ========== 参加可能パターン（DayType 毎） ==========
// 実運用ではここが局員個別入力になる。サンプルでは数パターン定義してローテーション。

const PATTERN_FULL: AvailabilityByDayType = {
  '準準備日': [r('09:00', '12:00'), r('13:00', '17:00')],
  '準備日':   [r('09:00', '12:00'), r('13:00', '17:00')],
  '1日目':    [r('09:00', '12:00'), r('13:00', '20:00')],
  '2日目':    [r('09:00', '12:00'), r('13:00', '17:00')],
  '片付け日': [r('09:00', '12:00'), r('13:00', '17:00')],
};

const PATTERN_MORNING_ONLY: AvailabilityByDayType = {
  '準準備日': [r('09:00', '12:00')],
  '準備日':   [r('09:00', '12:00')],
  '1日目':    [r('09:00', '12:00')],
  '2日目':    [r('09:00', '12:00')],
  '片付け日': [r('09:00', '12:00')],
};

const PATTERN_AFTERNOON_ONLY: AvailabilityByDayType = {
  '準準備日': [r('13:00', '17:00')],
  '準備日':   [r('13:00', '17:00')],
  '1日目':    [r('13:00', '17:00')],
  '2日目':    [r('13:00', '17:00')],
  '片付け日': [r('13:00', '17:00')],
};

const PATTERN_DAYS_ONLY: AvailabilityByDayType = {
  '1日目':    [r('09:00', '12:00'), r('13:00', '19:00')],
  '2日目':    [r('09:00', '12:00'), r('13:00', '17:00')],
};

const PATTERN_PREP_ONLY: AvailabilityByDayType = {
  '準準備日': [r('09:00', '12:00'), r('13:00', '17:00')],
  '準備日':   [r('09:00', '12:00'), r('13:00', '17:00')],
  '片付け日': [r('09:00', '12:00'), r('13:00', '17:00')],
};

const PATTERN_PARTIAL_A: AvailabilityByDayType = {
  '準備日':   [r('09:30', '12:00'), r('13:00', '15:30')],
  '1日目':    [r('10:00', '12:00'), r('13:00', '17:00')],
  '2日目':    [r('09:00', '11:30'), r('13:00', '17:00')],
};

const PATTERN_PARTIAL_B: AvailabilityByDayType = {
  '準準備日': [r('10:00', '12:00')],
  '準備日':   [r('13:00', '17:00')],
  '1日目':    [r('09:00', '12:00'), r('14:00', '18:00')],
  '2日目':    [r('09:00', '12:00'), r('13:30', '17:00')],
  '片付け日': [r('09:00', '11:00')],
};

const PATTERN_EVENING_HEAVY: AvailabilityByDayType = {
  '準備日':   [r('13:00', '17:00')],
  '1日目':    [r('13:00', '20:00')],
  '2日目':    [r('09:00', '12:00'), r('13:00', '17:00')],
  '片付け日': [r('13:00', '17:00')],
};

const PATTERN_SHORT: AvailabilityByDayType = {
  '1日目':    [r('10:00', '12:00')],
  '2日目':    [r('13:00', '16:00')],
};

const AVAILABILITY_PATTERNS: AvailabilityByDayType[] = [
  PATTERN_FULL,
  PATTERN_MORNING_ONLY,
  PATTERN_AFTERNOON_ONLY,
  PATTERN_DAYS_ONLY,
  PATTERN_PREP_ONLY,
  PATTERN_PARTIAL_A,
  PATTERN_PARTIAL_B,
  PATTERN_EVENING_HEAVY,
  PATTERN_SHORT,
  PATTERN_FULL,
];

// ========== 局員マスター ==========

type Profile = {
  name: string;
  department: string;
  isNewMember: boolean;
};

const PROFILES: Profile[] = [
  { name: "田中 太郎",     department: "制作局", isNewMember: false },
  { name: "佐藤 花子",     department: "総務局", isNewMember: false },
  { name: "鈴木 健太",     department: "情報局", isNewMember: false },
  { name: "高橋 美咲",     department: "産学局", isNewMember: false },
  { name: "伊藤 大輔",     department: "渉外局", isNewMember: true  },
  { name: "渡辺 さくら",   department: "企画局", isNewMember: false },
  { name: "山本 翔太",     department: "執行部", isNewMember: false },
  { name: "中村 愛",       department: "制作局", isNewMember: true  },
  { name: "小林 誠",       department: "総務局", isNewMember: false },
  { name: "加藤 優子",     department: "情報局", isNewMember: true  },
  { name: "吉田 拓也",     department: "産学局", isNewMember: false },
  { name: "山田 真由",     department: "渉外局", isNewMember: false },
  { name: "松本 健一",     department: "企画局", isNewMember: false },
  { name: "井上 さやか",   department: "執行部", isNewMember: true  },
  { name: "木村 雄大",     department: "制作局", isNewMember: true  },
  { name: "林 美穂",       department: "総務局", isNewMember: false },
  { name: "清水 大地",     department: "情報局", isNewMember: false },
  { name: "森 彩香",       department: "産学局", isNewMember: true  },
  { name: "池田 航",       department: "渉外局", isNewMember: false },
  { name: "橋本 萌",       department: "企画局", isNewMember: false },
];

// availability の DayType キーが DAY_TYPE_ORDER と揃っているかの軽い検証（ビルド時）
const _assertKeysValid = (p: AvailabilityByDayType): void => {
  const allowed = new Set<DayType>(DAY_TYPE_ORDER);
  for (const k of Object.keys(p)) {
    if (!allowed.has(k as DayType)) {
      throw new Error(`Unknown DayType in availability pattern: ${k}`);
    }
  }
};
AVAILABILITY_PATTERNS.forEach(_assertKeysValid);

export function createSampleMemberList(): Member[] {
  return PROFILES.map((p, i) => {
    const pattern = AVAILABILITY_PATTERNS[i % AVAILABILITY_PATTERNS.length];
    const base = Member.create(p.name, p.department, p.isNewMember);
    return new Member({
      ...base.state,
      availability: pattern,
    });
  });
}
