/**
 * StaffProfile — スタッフプロファイル（その人に付くものを、1つの見方に束ねたもの。#236）
 *
 * 名前の横に出す記号を組み立てる。出所が違うものを読むときに並べる:
 *
 * | 記号の種類     | 値の出所                                         |
 * |----------------|--------------------------------------------------|
 * | 絵文字タグ     | Staff.tags（フリーフォーム）                      |
 * | 責任者         | 勤務表の制約セット（責任者ルールの ID の並び）   |
 * | 休みの形       | Staff の既定 → WorkingStaffMember で上書き       |
 *
 * React も store も触らない純粋な組み立て。
 */
import type { ShiftLeaderRule } from "../schedule/ShiftLeaderRule.js";
import type { DayOffStyle } from "./DayOffStyle.js";
// EmojiTag is used via Staff.tags
import type { Staff } from "./Staff.js";
import type { WorkingStaffMember } from "./WorkingStaffMember.js";

/**
 * 名前の横に描く記号。何を描くかだけを言い、どう描くか（色・アイコン）は画面が決める。
 *   - emojiTag    … 絵文字タグ（🔰 など。フリーフォーム）
 *   - leader      … 責任者（早責など。役割ごとの色で描く）。staffIds はそのルールの担当者全員
 *   - dayOffStyle … 休みの形（分散型・連休型のアイコン）
 */
export type ProfileMark =
  | { kind: "emojiTag"; emoji: string; label?: string }
  | { kind: "leader"; ruleKey: string; label: string; shiftName: string; staffIds: readonly string[] }
  | { kind: "dayOffStyle"; style: DayOffStyle };

export class StaffProfile {
  constructor(readonly marks: readonly ProfileMark[]) {}

  /** 絵文字タグだけ */
  get emojiTags(): ProfileMark[] {
    return this.marks.filter((m) => m.kind === "emojiTag");
  }

  /** 責任者だけ */
  get leaderMarks(): ProfileMark[] {
    return this.marks.filter((m) => m.kind === "leader");
  }
}

export type StaffProfileSources = {
  staff?: Staff;
  member?: WorkingStaffMember;
  leaderRules?: readonly ShiftLeaderRule[];
};

/**
 * その人のプロファイルを組み立てる。
 * 絵文字タグ → 責任者 → 休みの形 の順に並べる。
 */
export function staffProfileOf(
  staffId: string,
  { staff, member, leaderRules = [] }: StaffProfileSources
): StaffProfile {
  const marks: ProfileMark[] = [];

  // 絵文字タグ
  for (const tag of staff?.tags ?? []) {
    marks.push({ kind: "emojiTag", emoji: tag.emoji, ...(tag.label ? { label: tag.label } : {}) });
  }

  // 責任者（勤務表の制約セットが担当者を決めている）
  const leading = leaderRules.filter((r) => r.leaderStaffIds.includes(staffId));
  for (const r of leading) {
    marks.push({
      kind: "leader",
      ruleKey: r.key,
      label: r.label,
      shiftName: r.shiftName,
      staffIds: r.leaderStaffIds,
    });
  }

  // 休みの形
  if (staff || member) {
    const style = member ? member.dayOffStyleOf(staff) : staff!.dayOffStyle;
    marks.push({ kind: "dayOffStyle", style });
  }

  return new StaffProfile(marks);
}
