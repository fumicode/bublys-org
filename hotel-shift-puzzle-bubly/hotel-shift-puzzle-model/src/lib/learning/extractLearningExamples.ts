/**
 * extractLearningExamples — 世界線スナップショット列から学習例を抽出する
 *
 * model 層は WorldLineGraph に依存しない。呼び出し側（feature / training）が
 * 各ノードの Schedule + EditLog を並べて渡す。
 *
 * 各ノードについて「親の EditLog に無い新規 entry」をそのノードの操作とみなし、
 * 親の Schedule を操作前文脈、当ノードの Schedule を操作後として例を作る。
 */
import {
  MonthlyStaffSchedule,
  type ShiftCell,
} from "../schedule/MonthlyStaffSchedule.js";
import { WorkingDay } from "../schedule/WorkingDay.js";
import {
  ScheduleEditLog,
  type ScheduleEditEntryPlain,
} from "../schedule/ScheduleEditLog.js";
import type { ConstraintViolationPlain } from "../schedule/ConstraintViolation.js";
import type { DecodedWish } from "../schedule/autoShiftStep.js";
import type { ShiftLearningExample } from "./ShiftLearningExample.js";

/** 世界線1ノード分のスナップショット（呼び出し側が CAS から復元） */
export type LearningWorldSnapshot = {
  nodeId: string;
  parentNodeId: string | null;
  schedule: MonthlyStaffSchedule;
  editLog: ScheduleEditLog;
};

export type ExtractLearningExamplesOptions = {
  /** 希望のデコード（省略時は wish 無し） */
  preferenceOf?: (staffId: string, day: WorkingDay) => DecodedWish;
  /** 可能勤務帯（省略時は常に true） */
  isAvailable?: (staffId: string, shiftId: string) => boolean;
  /** staffId → 貢献度スコア（省略時 0） */
  linkedReportScoreOf?: (staffId: string) => number;
  /** dayKey → 繁忙日か（省略時 false） */
  isBusyDay?: (dayKey: string) => boolean;
  /** 勤務帯ID → 名前（requiredStaffingGap 計算用） */
  shiftNameById?: Map<string, string>;
  /** 抽出する kind（既定: setCell のみ） */
  kinds?: ScheduleEditEntryPlain["kind"][];
};

const DEFAULT_KINDS: ScheduleEditEntryPlain["kind"][] = ["setCell"];

function cellAfterFromEntry(
  entry: ScheduleEditEntryPlain,
  scheduleAfter: MonthlyStaffSchedule
): ShiftCell | undefined {
  const { staffId, dayKey } = entry.targets;
  if (!staffId || !dayKey) return undefined;
  const day = WorkingDay.fromKey(dayKey);
  return scheduleAfter.statusOf(staffId, day);
}

function staffingGap(
  schedule: MonthlyStaffSchedule,
  day: WorkingDay,
  shiftId: string | undefined,
  shiftNameById: Map<string, string> | undefined
): number | undefined {
  if (!shiftId || !shiftNameById) return undefined;
  const name = shiftNameById.get(shiftId);
  if (!name) return undefined;
  const required = schedule.requiredStaffing.requiredFor(day, name);
  const assigned = schedule
    .assignmentsOn(day)
    .filter((a) => a.isWorking && a.shiftId === shiftId).length;
  return required - assigned;
}

/**
 * スナップショット列から学習例を抽出する。root→葉の順で渡す必要はないが、
 * 親が同一配列内に含まれている必要がある（parentNodeId で引く）。
 */
export function extractLearningExamples(
  scheduleId: string,
  snapshots: LearningWorldSnapshot[],
  options: ExtractLearningExamplesOptions = {}
): ShiftLearningExample[] {
  const kinds = new Set(options.kinds ?? DEFAULT_KINDS);
  const byId = new Map(snapshots.map((s) => [s.nodeId, s]));
  const examples: ShiftLearningExample[] = [];

  for (const snap of snapshots) {
    const parent = snap.parentNodeId ? byId.get(snap.parentNodeId) : undefined;
    const parentLog = parent?.editLog ?? ScheduleEditLog.empty(scheduleId);
    const parentEntries = new Set(parentLog.entries.map((e) => e.id));
    const scheduleBefore = parent?.schedule ?? snap.schedule;
    const newEntries = snap.editLog.entries.filter(
      (e) => !parentEntries.has(e.id) && kinds.has(e.kind)
    );

    // 制約違反（操作前）: 親スケジュールがあれば再計算できないので entry の
    // newlyResolved + 親時点では無い newlyViolated は使わず、空でもよいが
    // 可能なら呼び出し側が親時点の violations を entry に載せる前提で
    // ここでは entry 直前の推定として「親スケジュール上のセル状態」だけ使う。
    for (const entry of newEntries) {
      if (entry.kind !== "setCell") {
        // autoStep / candidate: セル単位文脈が無いのでスキップ（Phase 5 で拡張）
        continue;
      }
      const staffId = entry.targets.staffId;
      const dayKey = entry.targets.dayKey;
      if (!staffId || !dayKey) continue;

      const day = WorkingDay.fromKey(dayKey);
      const cellBefore = scheduleBefore.statusOf(staffId, day);
      const cellAfter =
        cellAfterFromEntry(entry, snap.schedule) ??
        (entry.targets.shiftId
          ? ({ kind: "work", shiftId: entry.targets.shiftId } as ShiftCell)
          : undefined);
      if (!cellAfter) continue;

      const wish = options.preferenceOf?.(staffId, day);
      const availabilityOk =
        cellAfter.kind === "work"
          ? (options.isAvailable?.(staffId, cellAfter.shiftId) ?? true)
          : true;

      const violationsBefore: ConstraintViolationPlain[] = [
        ...entry.constraintDelta.newlyResolved,
      ];

      examples.push({
        scheduleId,
        worldLineNodeId: snap.nodeId,
        entryId: entry.id,
        context: {
          year: scheduleBefore.year,
          month: scheduleBefore.month,
          storeId: scheduleBefore.storeId,
          staffId,
          dayKey,
          cellBefore,
          violationsBefore,
          wish,
          availabilityOk,
          requiredStaffingGap: staffingGap(
            scheduleBefore,
            day,
            entry.targets.shiftId ??
              (cellAfter.kind === "work" ? cellAfter.shiftId : undefined),
            options.shiftNameById
          ),
          linkedReportScore: options.linkedReportScoreOf?.(staffId) ?? 0,
          isBusyDay: options.isBusyDay?.(dayKey) ?? false,
        },
        action: {
          cellAfter,
          actor: entry.actor,
          hadConcession: entry.constraintDelta.concessions.length > 0,
          concessionTypes: entry.constraintDelta.concessions.map(
            (c) => c.constraintType
          ),
          source: entry.source,
          suggestionId: entry.suggestionId,
          rejectedSuggestionId: entry.rejectedSuggestionId,
        },
        at: entry.at,
        kind: entry.kind,
      });
    }
  }

  return examples;
}
