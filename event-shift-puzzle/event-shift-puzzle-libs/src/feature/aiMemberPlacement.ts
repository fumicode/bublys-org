import { Shift, Member, TimeSchedule } from '../domain/index.js';
import { type AiPlacementAction, consolidateToRanges } from './aiShiftPlacement.js';

function scoreShiftForMember(member: Member, shift: Shift): number {
  let score = 0;
  if (member.department && shift.responsibleDepartment &&
      member.department === shift.responsibleDepartment) score += 5;
  if (member.isNewMember) score -= 3;
  return score;
}

/**
 * スコアベースAIメンバー配置。ドラッグされた局員を visibleShifts の空きスロットへ配置する。
 * 局員→シフト順で処理（AIシフト配置のシフト→局員の逆）。
 * 同一局員が同一ブロックに複数シフトで配置されるcross-shift重複を作らない。
 */
export function computeAiMemberPlacements(
  memberIds: string[],
  allShifts: readonly Shift[],      // 全シフト（cross-shift重複チェック用）
  targetShifts: readonly Shift[],   // 配置対象シフト（TaskGanttEditor の visibleShifts）
  members: readonly Member[],
  activeTimeSchedule: TimeSchedule,
): AiPlacementAction[] {
  // AI実行内クロスシフト重複防止（memberId → 配置予定ブロック集合）
  const plannedMap = new Map<string, Set<number>>();
  // AI実行内スロット埋まり追跡（"shiftId::blockIndex" → 追加予定人数）
  const shiftBlockPending = new Map<string, number>();

  const flat: { shiftId: string; memberId: string; blockIndex: number }[] = [];

  for (const memberId of memberIds) {
    const member = members.find((m) => m.id === memberId);
    if (!member) continue;

    // スコア降順でシフトをソート（部署一致シフトを優先配置）
    const sortedShifts = [...targetShifts].sort(
      (a, b) => scoreShiftForMember(member, b) - scoreShiftForMember(member, a),
    );

    for (const shift of sortedShifts) {
      const range = shift.validBlockRange(activeTimeSchedule);
      if (!range) continue;

      for (let b = range.start; b < range.end; b++) {
        const existing = [...shift.blockList.getUsersAt(b)];
        const pendingKey = `${shift.id}::${b}`;
        const totalFilled = existing.length + (shiftBlockPending.get(pendingKey) ?? 0);
        const slotsNeeded = shift.requiredCount - totalFilled;
        if (slotsNeeded <= 0) continue;
        if (existing.includes(member.id)) continue;

        const blockMinute = activeTimeSchedule.startMinute + b * 15;
        if (!member.isAvailableAt(shift.dayType, blockMinute)) continue;

        // 既存BlockListでのcross-shift重複チェック
        const hasExistingOverlap = allShifts
          .filter((s) => s.id !== shift.id)
          .some((s) => s.blockList.getUsersAt(b).includes(member.id));
        if (hasExistingOverlap) continue;

        // 今回のAI実行内でのcross-shift重複チェック
        if (plannedMap.get(member.id)?.has(b)) continue;

        // 配置決定
        if (!plannedMap.has(member.id)) plannedMap.set(member.id, new Set());
        plannedMap.get(member.id)!.add(b);
        shiftBlockPending.set(pendingKey, (shiftBlockPending.get(pendingKey) ?? 0) + 1);
        flat.push({ shiftId: shift.id, memberId: member.id, blockIndex: b });
      }
    }
  }

  return consolidateToRanges(flat);
}
