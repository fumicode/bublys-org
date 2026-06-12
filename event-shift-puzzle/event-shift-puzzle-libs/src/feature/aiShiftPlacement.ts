import { Shift, Member, TimeSchedule } from '../domain/index.js';
import { type GroupedTask } from '../ui/TaskListView.js';

export type AiPlacementAction = {
  shiftId: string;
  memberId: string;
  startBlock: number;
  endBlock: number; // 半開区間
};

function scoreMember(member: Member, shift: Shift): number {
  let score = 0;
  if (member.department && shift.responsibleDepartment &&
      member.department === shift.responsibleDepartment) score += 5;
  if (member.isNewMember) score -= 3;
  return score;
}

/**
 * スコアベースAI配置。空きスロット（validBlockRange ∩ isAvailableAt）のみ埋める。
 * 同一局員が同一ブロックに複数シフトで配置されるcross-shift重複を作らない。
 */
export function computeAiPlacements(
  taskGroups: GroupedTask[],
  planShifts: readonly Shift[],
  members: readonly Member[],
  activeTimeSchedule: TimeSchedule,
): AiPlacementAction[] {
  // 今回のAI実行で配置予定のブロックを追跡（intra-run cross-shift重複防止）
  const plannedMap = new Map<string, Set<number>>(); // memberId → Set<blockIndex>

  const flat: { shiftId: string; memberId: string; blockIndex: number }[] = [];

  for (const group of taskGroups) {
    const matchedShifts = planShifts.filter((s) => s.taskId === group.taskId);

    for (const shift of matchedShifts) {
      const range = shift.validBlockRange(activeTimeSchedule);
      if (!range) continue;

      const candidates = members
        .map((m) => ({ member: m, score: scoreMember(m, shift) }))
        .sort((a, b) => b.score - a.score);

      const requiredCount = shift.requiredCount;

      for (let b = range.start; b < range.end; b++) {
        const existing = [...shift.blockList.getUsersAt(b)];
        const slotsNeeded = requiredCount - existing.length;
        if (slotsNeeded <= 0) continue;

        // ブラシ緑範囲と同じ条件: validBlockRange内かつ局員がそのブロック時刻に参加可能
        const blockMinute = activeTimeSchedule.startMinute + b * 15;

        let filled = 0;
        for (const { member } of candidates) {
          if (filled >= slotsNeeded) break;
          if (existing.includes(member.id)) continue;

          // ブロック単位の参加可否チェック
          if (!member.isAvailableAt(shift.dayType, blockMinute)) continue;

          // 既存BlockListでのcross-shift重複チェック
          const hasExistingOverlap = planShifts
            .filter((s) => s.id !== shift.id)
            .some((s) => s.blockList.getUsersAt(b).includes(member.id));
          if (hasExistingOverlap) continue;

          // 今回のAI実行内でのcross-shift重複チェック
          if (plannedMap.get(member.id)?.has(b)) continue;

          // 配置決定
          if (!plannedMap.has(member.id)) plannedMap.set(member.id, new Set());
          plannedMap.get(member.id)!.add(b);
          existing.push(member.id); // 同ブロック内でのduplicateも防ぐ
          flat.push({ shiftId: shift.id, memberId: member.id, blockIndex: b });
          filled++;
        }
      }
    }
  }

  return consolidateToRanges(flat);
}

export function consolidateToRanges(
  flat: { shiftId: string; memberId: string; blockIndex: number }[],
): AiPlacementAction[] {
  const grouped = new Map<string, number[]>(); // `${shiftId}::${memberId}` → blockIndex[]
  for (const { shiftId, memberId, blockIndex } of flat) {
    const key = `${shiftId}::${memberId}`;
    const arr = grouped.get(key) ?? [];
    arr.push(blockIndex);
    grouped.set(key, arr);
  }

  const actions: AiPlacementAction[] = [];
  for (const [key, blocks] of grouped) {
    const sep = key.indexOf('::');
    const shiftId = key.slice(0, sep);
    const memberId = key.slice(sep + 2);
    const sorted = [...new Set(blocks)].sort((a, b) => a - b);
    let runStart = sorted[0];
    let runPrev = sorted[0];
    for (let i = 1; i <= sorted.length; i++) {
      if (i === sorted.length || sorted[i] !== runPrev + 1) {
        actions.push({ shiftId, memberId, startBlock: runStart, endBlock: runPrev + 1 });
        if (i < sorted.length) { runStart = sorted[i]; runPrev = sorted[i]; }
      } else {
        runPrev = sorted[i];
      }
    }
  }
  return actions;
}
