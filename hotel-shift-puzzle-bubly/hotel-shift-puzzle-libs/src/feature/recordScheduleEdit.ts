/**
 * recordScheduleEdit — 勤務表操作を ScheduleEditLog 付きで同一世界線ノードに記録する
 *
 * セル編集・自動ステップ・制約変更・必要人数変更の入口。
 * 編集前後の制約違反差分を計算し、Schedule（や Constraints）と EditLog を
 * saveLocalBundle で同じローカルノードへ載せる。
 */
import {
  MonthlyStaffSchedule,
  ScheduleConstraints,
  ScheduleEditLog,
  computeConstraintDelta,
  emptyConstraintDelta,
  type ScheduleForecast,
  type ScheduleConstraint,
  type ScheduleEditActor,
  type ScheduleEditKind,
  type ScheduleEditSource,
  type ScheduleEditTargets,
  type ShiftCell,
  type WorkingDay,
} from "@bublys-org/hotel-shift-puzzle-model";
import {
  localScopeId,
  readFromScope,
  saveLocalBundle,
  commitToScope,
  APP_SCOPE_ID,
} from "../objects/commit.js";
import {
  SCHEDULE_TYPE,
  SCHEDULE_CONSTRAINTS_TYPE,
  SCHEDULE_EDIT_LOG_TYPE,
} from "../objects/hotelObjects.js";

type StoreLike = {
  getState: () => {
    worldLineGraph?: {
      graphs?: Record<string, unknown>;
      cas?: Record<string, unknown>;
    };
  };
  dispatch: (action: unknown) => void;
};

export type RecordEditMeta = {
  actor: ScheduleEditActor;
  kind: ScheduleEditKind;
  summary: string;
  targets?: ScheduleEditTargets;
  source?: ScheduleEditSource;
  suggestionId?: string;
  rejectedSuggestionId?: string;
  forecastId?: string;
  forecastRole?: "decision" | "forecast";
};

/**
 * ローカル世界線に EditLog がまだ無ければ、空（または APP の現在値）を起点として先に載せる。
 * これがないと「初回編集の親ノード」に EditLog が無く、時間移動で APP のログが古いまま残る。
 */
export function ensureEditLogBaseline(store: StoreLike, scheduleId: string): void {
  const scopeId = localScopeId(SCHEDULE_TYPE, scheduleId);
  if (
    readFromScope(store, scopeId, SCHEDULE_EDIT_LOG_TYPE, scheduleId) !== undefined
  ) {
    return;
  }
  const prev =
    readFromScope<ScheduleEditLog>(
      store,
      APP_SCOPE_ID,
      SCHEDULE_EDIT_LOG_TYPE,
      scheduleId
    ) ?? ScheduleEditLog.empty(scheduleId);
  commitToScope(store, scopeId, SCHEDULE_EDIT_LOG_TYPE, prev);
}

function loadEditLog(store: StoreLike, scheduleId: string): ScheduleEditLog {
  ensureEditLogBaseline(store, scheduleId);
  return (
    readFromScope<ScheduleEditLog>(
      store,
      localScopeId(SCHEDULE_TYPE, scheduleId),
      SCHEDULE_EDIT_LOG_TYPE,
      scheduleId
    ) ??
    readFromScope<ScheduleEditLog>(
      store,
      APP_SCOPE_ID,
      SCHEDULE_EDIT_LOG_TYPE,
      scheduleId
    ) ??
    ScheduleEditLog.empty(scheduleId)
  );
}

function formatCell(to: ShiftCell): string {
  if (to.kind === "day-off") return "休み";
  if (to.kind === "undecided") return "未定";
  return to.shiftId;
}

function appendConcessionHint(
  summary: string,
  concessionCount: number
): string {
  if (concessionCount <= 0) return summary;
  return `${summary}（譲歩${concessionCount}）`;
}

/**
 * 勤務表を変換し、違反差分付きの操作ログを同一ノードに記録する。
 */
export function recordScheduleMutation(
  store: StoreLike,
  args: {
    schedule: MonthlyStaffSchedule;
    constraints: ScheduleConstraint[];
    transform: (s: MonthlyStaffSchedule) => MonthlyStaffSchedule;
    meta: RecordEditMeta;
  }
): MonthlyStaffSchedule {
  const scheduleId = args.schedule.state.id;
  const before = args.schedule.checkConstraints(args.constraints);
  const next = args.transform(args.schedule);
  const after = next.checkConstraints(args.constraints);
  const delta = computeConstraintDelta(before, after);
  const summary = appendConcessionHint(
    args.meta.summary,
    delta.concessions.length
  );
  const log = loadEditLog(store, scheduleId).append({
    actor: args.meta.actor,
    kind: args.meta.kind,
    summary,
    targets: args.meta.targets ?? {},
    constraintDelta: delta,
    source: args.meta.source,
    suggestionId: args.meta.suggestionId,
    rejectedSuggestionId: args.meta.rejectedSuggestionId,
    forecastId: args.meta.forecastId,
    forecastRole: args.meta.forecastRole,
  });
  saveLocalBundle(store, localScopeId(SCHEDULE_TYPE, scheduleId), [
    { type: SCHEDULE_TYPE, obj: next },
    { type: SCHEDULE_EDIT_LOG_TYPE, obj: log },
  ]);
  return next;
}

/** セル編集を記録 */
export function recordSetCell(
  store: StoreLike,
  args: {
    schedule: MonthlyStaffSchedule;
    constraints: ScheduleConstraint[];
    staffId: string;
    staffName?: string;
    day: WorkingDay;
    to: ShiftCell;
    /** 提案採用時 */
    suggestionId?: string;
    /** 提案を拒否して別の値を入れたとき */
    rejectedSuggestionId?: string;
  }
): MonthlyStaffSchedule {
  const name = args.staffName ?? args.staffId;
  const dayLabel = `${args.day.day}日`;
  const source: ScheduleEditSource = args.suggestionId
    ? "suggestion"
    : "manual";
  return recordScheduleMutation(store, {
    schedule: args.schedule,
    constraints: args.constraints,
    transform: (s) => s.setCell(args.staffId, args.day, args.to),
    meta: {
      actor: "human",
      kind: "setCell",
      summary: `${name} / ${dayLabel} → ${formatCell(args.to)}`,
      targets: {
        staffId: args.staffId,
        dayKey: args.day.key,
        shiftId: args.to.kind === "work" ? args.to.shiftId : undefined,
      },
      source,
      suggestionId: args.suggestionId,
      rejectedSuggestionId: args.rejectedSuggestionId,
    },
  });
}

/** 必要人数変更を記録 */
export function recordRequiredEdit(
  store: StoreLike,
  args: {
    schedule: MonthlyStaffSchedule;
    constraints: ScheduleConstraint[];
    transform: (s: MonthlyStaffSchedule) => MonthlyStaffSchedule;
    summary: string;
    dayKey?: string;
    shiftName?: string;
  }
): MonthlyStaffSchedule {
  return recordScheduleMutation(store, {
    schedule: args.schedule,
    constraints: args.constraints,
    transform: args.transform,
    meta: {
      actor: "human",
      kind: "requiredEdit",
      summary: args.summary,
      targets: { dayKey: args.dayKey, label: args.shiftName },
    },
  });
}

/** 自動ステップ適用を記録 */
export function recordAutoStep(
  store: StoreLike,
  args: {
    schedule: MonthlyStaffSchedule;
    next: MonthlyStaffSchedule;
    constraints: ScheduleConstraint[];
    stepId: string;
    stepLabel: string;
    message: string;
  }
): void {
  const scheduleId = args.schedule.state.id;
  const before = args.schedule.checkConstraints(args.constraints);
  const after = args.next.checkConstraints(args.constraints);
  const delta = computeConstraintDelta(before, after);
  const summary = appendConcessionHint(
    `${args.stepLabel}: ${args.message}`,
    delta.concessions.length
  );
  const log = loadEditLog(store, scheduleId).append({
    actor: "auto",
    kind: "autoStep",
    summary,
    targets: { stepId: args.stepId, label: args.stepLabel },
    constraintDelta: delta,
    source: "autoStep",
  });
  saveLocalBundle(store, localScopeId(SCHEDULE_TYPE, scheduleId), [
    { type: SCHEDULE_TYPE, obj: args.next },
    { type: SCHEDULE_EDIT_LOG_TYPE, obj: log },
  ]);
}

/**
 * 制約集約の変更を記録（スケジュール自体は変わらないが違反集合は変わりうる）。
 * Constraints + EditLog を同一ノードに載せる。
 */
export function recordConstraintEdit(
  store: StoreLike,
  args: {
    schedule: MonthlyStaffSchedule | undefined;
    beforeConstraints: ScheduleConstraint[];
    afterConstraints: ScheduleConstraint[];
    nextConstraints: ScheduleConstraints;
    summary: string;
  }
): void {
  const scheduleId = args.nextConstraints.scheduleId;
  const before =
    args.schedule?.checkConstraints(args.beforeConstraints) ?? [];
  const after =
    args.schedule?.checkConstraints(args.afterConstraints) ?? [];
  const delta =
    args.schedule != null
      ? computeConstraintDelta(before, after)
      : emptyConstraintDelta();
  const summary = appendConcessionHint(
    args.summary,
    delta.concessions.length
  );
  const log = loadEditLog(store, scheduleId).append({
    actor: "human",
    kind: "constraintEdit",
    summary,
    targets: {},
    constraintDelta: delta,
  });
  saveLocalBundle(store, localScopeId(SCHEDULE_TYPE, scheduleId), [
    { type: SCHEDULE_CONSTRAINTS_TYPE, obj: args.nextConstraints },
    { type: SCHEDULE_EDIT_LOG_TYPE, obj: log },
  ]);
}

/**
 * 候補案1つ分の EditLog を作る（commitCandidates の extras 用）。
 * 親のログに「案N」エントリを足した新インスタンスを返す。
 */
export function buildCandidateEditLog(
  store: StoreLike,
  args: {
    baseSchedule: MonthlyStaffSchedule;
    candidate: MonthlyStaffSchedule;
    constraints: ScheduleConstraint[];
    label: string;
  }
): ScheduleEditLog {
  const scheduleId = args.baseSchedule.state.id;
  const before = args.baseSchedule.checkConstraints(args.constraints);
  const after = args.candidate.checkConstraints(args.constraints);
  const delta = computeConstraintDelta(before, after);
  return loadEditLog(store, scheduleId).append({
    actor: "auto",
    kind: "candidate",
    summary: appendConcessionHint(
      `完成案「${args.label}」を生成`,
      delta.concessions.length
    ),
    targets: { label: args.label },
    constraintDelta: delta,
  });
}

export function buildForecastEditLogs(
  store: StoreLike,
  args: {
    forecast: ScheduleForecast;
    baseSchedule: MonthlyStaffSchedule;
    decisionSchedule: MonthlyStaffSchedule;
    projectedSchedule: MonthlyStaffSchedule;
    constraints: ScheduleConstraint[];
    decisionLabel: string;
  }
): { decisionLog: ScheduleEditLog; forecastLog: ScheduleEditLog } {
  const scheduleId = args.baseSchedule.state.id;
  const baseViolations = args.baseSchedule.checkConstraints(args.constraints);
  const decisionViolations =
    args.decisionSchedule.checkConstraints(args.constraints);
  const projectedViolations =
    args.projectedSchedule.checkConstraints(args.constraints);
  const decisionDelta = computeConstraintDelta(
    baseViolations,
    decisionViolations
  );
  const decisionLog = loadEditLog(store, scheduleId).append({
    actor: "auto",
    kind: "candidate",
    summary: `可能性「${args.decisionLabel}」の入口を生成`,
    targets: {
      staffId: args.forecast.state.staffId,
      dayKey: args.forecast.state.dayKey,
      shiftId:
        args.forecast.decision.kind === "work"
          ? args.forecast.decision.shiftId
          : undefined,
      label: args.decisionLabel,
    },
    constraintDelta: decisionDelta,
    source: "forecast",
    forecastId: args.forecast.id,
    forecastRole: "decision",
  });
  const forecastDelta = computeConstraintDelta(
    decisionViolations,
    projectedViolations
  );
  const forecastLog = decisionLog.append({
    actor: "auto",
    kind: "candidate",
    summary: `可能性「${args.decisionLabel}」の先を予測`,
    targets: { label: args.decisionLabel },
    constraintDelta: forecastDelta,
    source: "forecast",
    forecastId: args.forecast.id,
    forecastRole: "forecast",
  });
  return { decisionLog, forecastLog };
}
