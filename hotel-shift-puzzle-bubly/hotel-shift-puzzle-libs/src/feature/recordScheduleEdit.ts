/**
 * recordScheduleEdit — 勤務表操作を ScheduleEditLog 付きで同一世界線ノードに記録する
 *
 * セル編集・自動ステップ・制約変更・必要人数変更の入口。
 * 編集前後の制約違反差分を計算し、Schedule（や Constraints）と EditLog を
 * saveLocalBundle で同じローカルノードへ載せる。
 */
import {
  MonthlyStaffSchedule,
  ConstraintSet,
  ScheduleEditLog,
  computeConstraintDelta,
  emptyConstraintDelta,
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
  isAbsentInScope,
  APP_SCOPE_ID,
  type BundleItem,
} from "../objects/commit.js";
import {
  SCHEDULE_TYPE,
  CONSTRAINT_SET_TYPE,
  GLOBAL_CONSTRAINT_SET_ID,
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
};

/**
 * 直前の操作ログを読む（読むだけ。世界線には触らない）。
 *
 * **undefined は「ログが無い」ではなく「いまは読めない」を意味する。**
 * 読めない理由には「メモリ上の CAS から追い出されただけ」があり、そこで空ログを返すと
 * 積み上げた操作履歴を丸ごと空で上書きしてしまう。だから空ログを返すのは、参照を見て
 * 「本当にまだ無い」と確かめられたときだけにする。読めないときは**ログの記録だけを
 * 諦める**（勤務表の変更は記録する）のが、履歴を壊さない唯一の振る舞い。
 *
 * 以前はここで EditLog の起点をローカル世界線へ書き込んでいたが、それをやめた。
 * 起点を作る場所が複数あると、どれが先に走るかで起点ノードの中身が変わってしまう
 * （EditLog だけの起点ができ、そこへ時間移動しても勤務表が戻らない＝#110）。
 * 起点は saveLocalBundle が「集約一式まとめて1ノード」で作る、の一本にする。
 */
function loadEditLog(
  store: StoreLike,
  scheduleId: string
): ScheduleEditLog | undefined {
  const local = readFromScope<ScheduleEditLog>(
    store,
    localScopeId(SCHEDULE_TYPE, scheduleId),
    SCHEDULE_EDIT_LOG_TYPE,
    scheduleId
  );
  if (local) return local;

  const app = readFromScope<ScheduleEditLog>(
    store,
    APP_SCOPE_ID,
    SCHEDULE_EDIT_LOG_TYPE,
    scheduleId
  );
  if (app) return app;

  // どちらのスコープにも参照が無い＝まだ一度も記録されていない。空から始めてよい。
  const neverRecorded =
    isAbsentInScope(
      store,
      localScopeId(SCHEDULE_TYPE, scheduleId),
      SCHEDULE_EDIT_LOG_TYPE,
      scheduleId
    ) &&
    isAbsentInScope(store, APP_SCOPE_ID, SCHEDULE_EDIT_LOG_TYPE, scheduleId);
  if (neverRecorded) return ScheduleEditLog.empty(scheduleId);

  // 参照はあるのに値が手元に無い。ここで空を返すと履歴が消えるので、諦める。
  console.warn(
    `世界線: 勤務表 ${scheduleId} の操作履歴を読めないため、この操作は履歴に残しません` +
      `（メモリ上の CAS から追い出されている可能性）。`
  );
  return undefined;
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
 * ローカル世界線の起点に置く「編集前」の一式。
 *
 * このスコープは勤務表のものなので、**何を記録する操作であっても**勤務表は起点に載せる。
 * 制約変更のように勤務表を含まない記録が最初に来ると、起点に勤務表が無い世界線ができ、
 * そこへ時間移動しても勤務表が戻らない（#110）。
 */
function baselineOf(
  schedule: MonthlyStaffSchedule | undefined,
  prevLog: ScheduleEditLog | undefined
): BundleItem[] {
  const items: BundleItem[] = [];
  // ログが読めなかったときは起点にも載せない（空ログを起点にすると履歴が消える）
  if (prevLog) items.push({ type: SCHEDULE_EDIT_LOG_TYPE, obj: prevLog });
  // 勤務表が手元に無い経路（制約バブル単独で開いた場合など）は APP の現在の参照に任せる
  if (schedule) items.unshift({ type: SCHEDULE_TYPE, obj: schedule });
  return items;
}

/** ログが読めたときだけ、記録する一式に EditLog を足す */
function withEditLog(
  items: BundleItem[],
  log: ScheduleEditLog | undefined
): BundleItem[] {
  return log ? [...items, { type: SCHEDULE_EDIT_LOG_TYPE, obj: log }] : items;
}

/** 勤務表を変換し、違反差分付きの操作ログを同一ノードに記録する。 */
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
  const transformed = args.transform(args.schedule);
  const after = transformed.checkConstraints(args.constraints);
  const delta = computeConstraintDelta(before, after);
  const summary = appendConcessionHint(
    args.meta.summary,
    delta.concessions.length
  );
  const prevLog = loadEditLog(store, scheduleId);
  const log = prevLog?.append({
    actor: args.meta.actor,
    kind: args.meta.kind,
    summary,
    targets: args.meta.targets ?? {},
    constraintDelta: delta,
    source: args.meta.source,
    suggestionId: args.meta.suggestionId,
    rejectedSuggestionId: args.meta.rejectedSuggestionId,
  });

  saveLocalBundle(
    store,
    localScopeId(SCHEDULE_TYPE, scheduleId),
    withEditLog([{ type: SCHEDULE_TYPE, obj: transformed }], log),
    baselineOf(args.schedule, prevLog)
  );
  return transformed;
}

/** セル編集を記録。 */
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

/** 必要人数変更を記録。 */
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
  const prevLog = loadEditLog(store, scheduleId);
  const log = prevLog?.append({
    actor: "auto",
    kind: "autoStep",
    summary,
    targets: { stepId: args.stepId, label: args.stepLabel },
    constraintDelta: delta,
    source: "autoStep",
  });
  saveLocalBundle(
    store,
    localScopeId(SCHEDULE_TYPE, scheduleId),
    withEditLog([{ type: SCHEDULE_TYPE, obj: args.next }], log),
    baselineOf(args.schedule, prevLog)
  );
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
    nextConstraints: ConstraintSet;
    summary: string;
  }
): void {
  // 勤務表ごとの制約セットは id が scheduleId。
  // グローバルのテンプレート（id="global"）を通すと `Schedule:global` という存在しない
  // 勤務表の世界が（スタッフの焼き付き込みで）生まれる。コメントではなくコードで塞ぐ。
  if (args.nextConstraints.id === GLOBAL_CONSTRAINT_SET_ID) {
    console.warn(
      "recordConstraintEdit: グローバルの制約セットは勤務表の世界線に記録しません" +
        "（テンプレートはどの勤務表のものでもないため）。"
    );
    return;
  }
  const scheduleId = args.nextConstraints.id;
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
  const prevLog = loadEditLog(store, scheduleId);
  const log = prevLog?.append({
    actor: "human",
    kind: "constraintEdit",
    summary,
    targets: {},
    constraintDelta: delta,
  });

  saveLocalBundle(
    store,
    localScopeId(SCHEDULE_TYPE, scheduleId),
    withEditLog(
      [{ type: CONSTRAINT_SET_TYPE, obj: args.nextConstraints }],
      log
    ),
    baselineOf(args.schedule, prevLog)
  );
}

/**
 * 勤務スタッフ群の変更を記録する（誰がこの勤務表で働くか）。
 *
 * 1回の変更で複数の集約が動く。臨時スタッフを足せば可能勤務帯にも席を用意するし、
 * 人を外せばその人の割当と責任者ルールの担当からも消す。これらは**同じ1ノード**に
 * 載せないと、時間移動したときに「行は消えたのに割当だけ残っている」中途半端な世界へ
 * 戻れてしまう。呼び出し側が変わったものだけ `changed` に入れる。
 *
 * 違反差分は取らない（emptyConstraintDelta）。セルの決め方についての判断ではないので、
 * 「この操作で何を譲歩したか」という読み方が当てはまらない。
 */
export function recordMembershipEdit(
  store: StoreLike,
  args: {
    scheduleId: string;
    /** 変更前の勤務表。起点に置くために渡す（この世界の持ち主なので必ず起点に要る） */
    schedule: MonthlyStaffSchedule | undefined;
    /** 同じノードに載せる変更後の一式。勤務スタッフ群は必ず入る */
    changed: BundleItem[];
    summary: string;
    staffId?: string;
  }
): void {
  const prevLog = loadEditLog(store, args.scheduleId);
  const log = prevLog?.append({
    actor: "human",
    kind: "membershipEdit",
    summary: args.summary,
    targets: { staffId: args.staffId },
    constraintDelta: emptyConstraintDelta(),
  });

  saveLocalBundle(
    store,
    localScopeId(SCHEDULE_TYPE, args.scheduleId),
    withEditLog(args.changed, log),
    baselineOf(args.schedule, prevLog)
  );
}

/**
 * 候補案1つ分の EditLog を作る（commitCandidates の extras 用）。
 * 親のログに「案N」エントリを足した新インスタンスを返す。
 * ログが読めないときは undefined（＝この案は履歴に残さない。案そのものは記録される）。
 */
export function buildCandidateEditLog(
  store: StoreLike,
  args: {
    baseSchedule: MonthlyStaffSchedule;
    candidate: MonthlyStaffSchedule;
    constraints: ScheduleConstraint[];
    label: string;
  }
): ScheduleEditLog | undefined {
  const scheduleId = args.baseSchedule.state.id;
  const before = args.baseSchedule.checkConstraints(args.constraints);
  const after = args.candidate.checkConstraints(args.constraints);
  const delta = computeConstraintDelta(before, after);
  return loadEditLog(store, scheduleId)?.append({
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
