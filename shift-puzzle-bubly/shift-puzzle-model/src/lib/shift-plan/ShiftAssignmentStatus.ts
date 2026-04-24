/**
 * ShiftAssignmentStatus — プリミティブガント配置後の「充足・違反」ドメイン
 *
 * BlockList ベースの配置に対して、
 *   - 15分ブロック毎のカバレッジ（必要人数 vs 実配置）
 *   - 局員毎の配置区間（run）と制約違反
 * を算出する。
 *
 * 制約は「既存データから計算可能なもの」に限定する：
 *   - availability    : Member.availability（DayType毎の15分刻み）— 配置ブロック毎に判定
 *   - taskConflict    : 同一局員が他Shiftと時間重複
 *   - noLeader        : Shift配置メンバーに経験者(!isNewMember)が一人もいない（shift単位）
 *   - department 不整合はあえて違反扱いしない（参考情報）
 *
 * 未整備の制約（スキル / 勤務時間 / 休憩時間）は型として列挙のみしておき、
 * 判定ロジックは実装しない（呼び出し側がスタブ表示する）。
 */

import { Member } from '../member/Member.js';
import { Shift } from '../master/Shift.js';
import { TimeSchedule } from '../master/TimeSchedule.js';

// ========== 型定義 ==========

/** 15分ブロック毎のカバレッジ */
export interface BlockCoverage {
  /** TimeSchedule先頭からの blockIndex */
  readonly blockIndex: number;
  /** そのブロックの絶対時刻（分） */
  readonly minute: number;
  /** 配置されている局員ID群 */
  readonly userIds: readonly string[];
  /** 配置人数 */
  readonly count: number;
  /** requiredCount に対する不足数（正: 不足, 0: 充足, 負: 超過） */
  readonly shortage: number;
}

/** 1局員の連続配置区間 */
export interface MemberRun {
  readonly startBlock: number;
  readonly endBlock: number; // 半開区間
  readonly startMinute: number;
  readonly endMinute: number;
}

/** 違反カテゴリ */
export type AssignmentViolationCategory =
  | 'availability'
  | 'department'
  | 'taskConflict'
  | 'noLeader'
  | 'skill'         // 未整備
  | 'workHours'     // 未整備
  | 'breakTime';    // 未整備

export interface AssignmentViolation {
  readonly category: AssignmentViolationCategory;
  /** 人間向けの短い説明 */
  readonly message: string;
  /** 未整備制約は true（スタブ表示用） */
  readonly isStub?: boolean;
}

/** メンバー毎の配置サマリ */
export interface MemberAssignmentSummary {
  readonly memberId: string;
  readonly memberName: string;
  readonly department: string;
  readonly isNewMember: boolean;
  readonly runs: readonly MemberRun[];
  readonly violations: readonly AssignmentViolation[];
}

/** Shift配置状況の全体像 */
export interface ShiftAssignmentStatusState {
  readonly shiftId: string;
  readonly requiredCount: number;
  readonly totalBlocks: number;
  readonly blockCoverages: readonly BlockCoverage[];
  readonly memberSummaries: readonly MemberAssignmentSummary[];
  /** Shift 単位の違反（noLeader 等、メンバー個別でない違反） */
  readonly shiftViolations: readonly AssignmentViolation[];
  /** 全ブロック中で必要人数を満たしているブロックの割合（0-100） */
  readonly fulfillmentRate: number;
}

// ========== ヘルパー ==========

/** 昇順の blockIndex 配列を連続区間に束ねる */
function blocksToRuns(blocks: readonly number[], timeScheduleStartMinute: number): MemberRun[] {
  if (blocks.length === 0) return [];
  const sorted = [...blocks].sort((a, b) => a - b);
  const runs: MemberRun[] = [];
  let runStart = sorted[0];
  let runPrev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    if (i === sorted.length || sorted[i] !== runPrev + 1) {
      const endBlock = runPrev + 1;
      runs.push({
        startBlock: runStart,
        endBlock,
        startMinute: timeScheduleStartMinute + runStart * 15,
        endMinute: timeScheduleStartMinute + endBlock * 15,
      });
      if (i < sorted.length) {
        runStart = sorted[i];
        runPrev = sorted[i];
      }
    } else {
      runPrev = sorted[i];
    }
  }
  return runs;
}

// ========== ドメインクラス ==========

export class ShiftAssignmentStatus {
  constructor(readonly state: ShiftAssignmentStatusState) {}

  get shiftId(): string { return this.state.shiftId; }
  get requiredCount(): number { return this.state.requiredCount; }
  get totalBlocks(): number { return this.state.totalBlocks; }
  get blockCoverages(): readonly BlockCoverage[] { return this.state.blockCoverages; }
  get memberSummaries(): readonly MemberAssignmentSummary[] { return this.state.memberSummaries; }
  get shiftViolations(): readonly AssignmentViolation[] { return this.state.shiftViolations; }
  get fulfillmentRate(): number { return this.state.fulfillmentRate; }

  /**
   * 計算エントリーポイント。
   * @param shift         対象シフト（blockList を持つ）
   * @param timeSchedule  shift.timeScheduleId に対応する TimeSchedule
   * @param members       全局員（name/department/isNewMember 参照用）
   * @param allShifts     競合判定用：同一 ShiftPlan 内の全シフト（対象shift自身も含む）
   */
  static compute(
    shift: Shift,
    timeSchedule: TimeSchedule,
    members: readonly Member[],
    allShifts: readonly Shift[],
  ): ShiftAssignmentStatus {
    const memberById = new Map(members.map((m) => [m.id, m]));
    const validRange = shift.validBlockRange({ startMinute: timeSchedule.startMinute });

    // ---- BlockCoverage: shift の有効範囲のみを対象に集計 ----
    const blockCoverages: BlockCoverage[] = [];
    const bl = shift.blockList;
    for (let b = validRange.start; b < validRange.end; b++) {
      const userIds = bl.getUsersAt(b);
      blockCoverages.push({
        blockIndex: b,
        minute: timeSchedule.startMinute + b * 15,
        userIds: [...userIds],
        count: userIds.length,
        shortage: shift.requiredCount - userIds.length,
      });
    }

    // ---- Member毎のrun + 違反 ----
    const assignedIds = shift.getAssignedUserIds();
    const memberSummaries: MemberAssignmentSummary[] = assignedIds.map((uid) => {
      const member = memberById.get(uid);
      const blocks = bl.getBlocksForUser(uid);
      const runs = blocksToRuns(blocks, timeSchedule.startMinute);
      const violations = computeMemberViolations(
        member,
        shift,
        runs,
        allShifts,
        memberById,
      );
      return {
        memberId: uid,
        memberName: member?.name ?? uid,
        department: member?.department ?? '',
        isNewMember: member?.isNewMember ?? false,
        runs,
        violations,
      };
    });

    // ---- Shift単位の違反 ----
    const shiftViolations: AssignmentViolation[] = [];
    const hasExperienced = memberSummaries.some((s) => !s.isNewMember);
    if (assignedIds.length > 0 && !hasExperienced) {
      shiftViolations.push({
        category: 'noLeader',
        message: '経験者（非新入生）が配置されていません',
      });
    }

    // ---- 充足率 ----
    const satisfied = blockCoverages.filter((c) => c.shortage <= 0).length;
    const fulfillmentRate = blockCoverages.length > 0
      ? (satisfied / blockCoverages.length) * 100
      : 100;

    return new ShiftAssignmentStatus({
      shiftId: shift.id,
      requiredCount: shift.requiredCount,
      totalBlocks: blockCoverages.length,
      blockCoverages,
      memberSummaries,
      shiftViolations,
      fulfillmentRate,
    });
  }
}

// ========== 制約違反の判定 ==========

function computeMemberViolations(
  member: Member | undefined,
  shift: Shift,
  runs: readonly MemberRun[],
  allShifts: readonly Shift[],
  memberById: Map<string, Member>,
): AssignmentViolation[] {
  const violations: AssignmentViolation[] = [];

  if (!member) {
    // 局員マスタに存在しない → availability判定不能。明示
    violations.push({
      category: 'availability',
      message: '局員マスタに存在しません',
    });
    return violations;
  }

  // availability: 配置されているブロック毎に member.isAvailableAt で判定
  const unavailableRanges: Array<{ start: number; end: number }> = [];
  for (const run of runs) {
    let curStart: number | null = null;
    for (let m = run.startMinute; m < run.endMinute; m += 15) {
      const ok = member.isAvailableAt(shift.dayType, m);
      if (!ok) {
        if (curStart === null) curStart = m;
      } else if (curStart !== null) {
        unavailableRanges.push({ start: curStart, end: m });
        curStart = null;
      }
    }
    if (curStart !== null) {
      unavailableRanges.push({ start: curStart, end: run.endMinute });
    }
  }
  if (unavailableRanges.length > 0) {
    const label = unavailableRanges
      .map((r) => `${minToHHMM(r.start)}-${minToHHMM(r.end)}`)
      .join(', ');
    violations.push({
      category: 'availability',
      message: `参加可能時間外に配置されています（${label}）`,
    });
  }

  // department 不整合は参考情報扱い（違反として出さない）

  // taskConflict: 他shiftで同時間帯に配置されている
  const conflict = findTaskConflict(member.id, shift, runs, allShifts);
  if (conflict) {
    violations.push({
      category: 'taskConflict',
      message: conflict,
    });
  }

  // スタブ（データ未整備）
  violations.push({
    category: 'skill',
    message: 'スキル要件データ未整備',
    isStub: true,
  });
  // workHours / breakTime は「全体としての」判定が必要なので Shift単独では出さない

  return violations;
}

/**
 * 同一局員が、本Shift以外のShiftで時間帯重複している場合の説明文を返す。
 * 重複がなければ null。
 */
function findTaskConflict(
  memberId: string,
  targetShift: Shift,
  targetRuns: readonly MemberRun[],
  allShifts: readonly Shift[],
): string | null {
  if (targetRuns.length === 0) return null;

  for (const other of allShifts) {
    if (other.id === targetShift.id) continue;
    if (other.taskId === targetShift.taskId) continue; // 同タスク別シフトは競合とみなさない
    if (other.dayType !== targetShift.dayType) continue;

    // otherのblockListを絶対時刻の区間に変換
    const otherBl = other.blockList;
    const otherBlocks = otherBl.getBlocksForUser(memberId);
    if (otherBlocks.length === 0) continue;

    // otherが持つ TimeSchedule.startMinute は不明なので、shift.startMinute起点で近似
    // （BlockList の正確な絶対時刻計算は timeSchedule を要するが、
    //  ここでは shift 同士の dayType一致 + 自身の startMinute から推定）
    // 安全側: shift.startMinute を起点にする
    const otherRanges = blocksToMinuteRanges(otherBlocks, other.startMinute);

    for (const tr of targetRuns) {
      for (const or of otherRanges) {
        if (tr.startMinute < or.end && or.start < tr.endMinute) {
          return `同時間帯で「${other.taskName}」(${minToHHMM(or.start)}-${minToHHMM(or.end)})に配置されています`;
        }
      }
    }
  }
  return null;
}

function blocksToMinuteRanges(
  blocks: readonly number[],
  baseMinute: number,
): Array<{ start: number; end: number }> {
  if (blocks.length === 0) return [];
  const sorted = [...blocks].sort((a, b) => a - b);
  const ranges: Array<{ start: number; end: number }> = [];
  let s = sorted[0];
  let p = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    if (i === sorted.length || sorted[i] !== p + 1) {
      ranges.push({ start: baseMinute + s * 15, end: baseMinute + (p + 1) * 15 });
      if (i < sorted.length) {
        s = sorted[i];
        p = sorted[i];
      }
    } else {
      p = sorted[i];
    }
  }
  return ranges;
}

function minToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
