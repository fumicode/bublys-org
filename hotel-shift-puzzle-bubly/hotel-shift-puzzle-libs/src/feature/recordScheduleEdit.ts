/**
 * recordScheduleEdit — 勤務表まわりの編集を、その勤務表の世界線に1ノードで記録する
 *
 * セル編集・自動ステップ・必要人数変更・制約変更・勤務スタッフ変更の入口。
 * 変わった集約を saveLocalBundle で同じローカルノードへ載せる。
 *
 * **世界線に載せるのはドメインの状態だけ。** 編集のたびに必ず変わるもの（時刻入りの
 * 操作ログなど）を同じノードに載せると、中身を元に戻しても世界全体のハッシュが二度と
 * 一致せず、元の世界へ戻れなくなる（#137 / #155。操作履歴を撤去した理由）。
 */
import type {
  MonthlyStaffSchedule,
  ConstraintSet,
  ShiftCell,
  WorkingDay,
} from "@bublys-org/hotel-shift-puzzle-model";
import {
  localScopeId,
  saveLocalBundle,
  type BundleItem,
} from "../objects/commit.js";
import {
  SCHEDULE_TYPE,
  CONSTRAINT_SET_TYPE,
  GLOBAL_CONSTRAINT_SET_ID,
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

/**
 * ローカル世界線の起点に置く「編集前」の一式。
 *
 * このスコープは勤務表のものなので、**何を記録する操作であっても**勤務表は起点に載せる。
 * 制約変更のように勤務表を含まない記録が最初に来ると、起点に勤務表が無い世界線ができ、
 * そこへ時間移動しても勤務表が戻らない（#110）。
 * 勤務表が手元に無い経路（制約バブル単独で開いた場合など）は APP の現在の参照に任せる。
 */
function baselineOf(schedule: MonthlyStaffSchedule | undefined): BundleItem[] {
  return schedule ? [{ type: SCHEDULE_TYPE, obj: schedule }] : [];
}

/** 勤務表を変換し、同一ノードに記録する。変換後の勤務表を返す。 */
export function recordScheduleMutation(
  store: StoreLike,
  args: {
    schedule: MonthlyStaffSchedule;
    transform: (s: MonthlyStaffSchedule) => MonthlyStaffSchedule;
  }
): MonthlyStaffSchedule {
  const transformed = args.transform(args.schedule);
  saveLocalBundle(
    store,
    localScopeId(SCHEDULE_TYPE, args.schedule.state.id),
    [{ type: SCHEDULE_TYPE, obj: transformed }],
    baselineOf(args.schedule)
  );
  return transformed;
}

/** セル編集を記録。 */
export function recordSetCell(
  store: StoreLike,
  args: {
    schedule: MonthlyStaffSchedule;
    staffId: string;
    day: WorkingDay;
    to: ShiftCell;
  }
): MonthlyStaffSchedule {
  return recordSetCells(store, {
    schedule: args.schedule,
    changes: [{ staffId: args.staffId, day: args.day, to: args.to }],
  });
}

/**
 * 複数セルの編集（範囲選択でまとめて入れる。#157）を記録。
 * 1回の操作は**1ノード**にする（1セルずつ記録すると、世界線を1つ戻しても範囲の一部しか戻らない）。
 */
export function recordSetCells(
  store: StoreLike,
  args: {
    schedule: MonthlyStaffSchedule;
    changes: { staffId: string; day: WorkingDay; to: ShiftCell }[];
  }
): MonthlyStaffSchedule {
  return recordScheduleMutation(store, {
    schedule: args.schedule,
    transform: (s) =>
      args.changes.reduce((acc, c) => acc.setCell(c.staffId, c.day, c.to), s),
  });
}

/**
 * 制約集約の変更を記録（勤務表そのものは変わらない）。
 * 勤務表の世界線に載せるので、時間移動で勤務表と一緒に戻る。
 */
export function recordConstraintEdit(
  store: StoreLike,
  args: {
    schedule: MonthlyStaffSchedule | undefined;
    nextConstraints: ConstraintSet;
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
  saveLocalBundle(
    store,
    localScopeId(SCHEDULE_TYPE, args.nextConstraints.id),
    [{ type: CONSTRAINT_SET_TYPE, obj: args.nextConstraints }],
    baselineOf(args.schedule)
  );
}

/**
 * 勤務スタッフ群の変更を記録する（誰がこの勤務表で働くか）。
 *
 * 1回の変更で複数の集約が動く。人を外せばその人の割当と責任者ルールの担当からも消す。
 * これらは**同じ1ノード**に載せないと、時間移動したときに「行は消えたのに割当だけ
 * 残っている」中途半端な世界へ戻れてしまう。呼び出し側が変わったものだけ `changed` に入れる。
 */
export function recordMembershipEdit(
  store: StoreLike,
  args: {
    scheduleId: string;
    /** 変更前の勤務表。起点に置くために渡す（この世界の持ち主なので必ず起点に要る） */
    schedule: MonthlyStaffSchedule | undefined;
    /** 同じノードに載せる変更後の一式。勤務スタッフ群は必ず入る */
    changed: BundleItem[];
  }
): void {
  saveLocalBundle(
    store,
    localScopeId(SCHEDULE_TYPE, args.scheduleId),
    args.changed,
    baselineOf(args.schedule)
  );
}
