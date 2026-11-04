/**
 * 勤務表は、前月の確定版から引き継いで始まる（#231）。
 *
 * - 前月の確定版は、同じ店舗の1か月前に1つだけ（選ぶことは無い）
 * - 引き継ぐのは確定版の月末の勤務と★と、どの版から写したか（今月の世界に焼き付く）
 * - 写し取るのは確定したノード時点の版（その後の前月の編集は写らない）
 * - 作った後に確定版が置き換わっても、あとから確定しても、勝手には取り込まず知らせるだけ
 */
import { worldLineGraphSlice } from '@bublys-org/world-line-graph';
import {
  ConstraintSet,
  MaxConsecutiveWorkdaysConstraint,
  MonthlyStaffSchedule,
  PrecedingMonthTail,
  ScheduleReport,
  Staff,
  WorkingDay,
} from '@bublys-org/hotel-shift-puzzle-model';
import { registerObjects } from '../objects/framework.js';
import {
  CONSTRAINT_SET_TYPE,
  HOTEL_OBJECTS,
  SCHEDULE_TYPE,
  STAFF_TYPE,
} from '../objects/hotelObjects.js';
import { localScopeId, readFromScope, saveObject } from '../objects/commit.js';
import { createSchedule } from './createSchedule.js';
import { recordScheduleMutation } from './recordScheduleEdit.js';
import {
  captureInheritance,
  inheritedScoresOf,
  pendingInheritanceOf,
  precedingConfirmedOf,
} from './precedingMonth.js';

registerObjects(HOTEL_OBJECTS);

type State = { worldLineGraph: ReturnType<typeof worldLineGraphSlice.getInitialState> };

function fakeStore() {
  let state: State = { worldLineGraph: worldLineGraphSlice.getInitialState() };
  return {
    getState: () => state,
    dispatch: (action: unknown) => {
      state = {
        worldLineGraph: worldLineGraphSlice.reducer(
          state.worldLineGraph,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          action as any
        ),
      };
    },
  };
}

const may = (d: number) => WorkingDay.of(2026, 5, d);

const reportOf = (
  scheduleId: string,
  nodeId: string,
  params: { year?: number; month?: number; storeId?: string; confirmedAt?: number } = {}
) =>
  ScheduleReport.create({
    scheduleId,
    worldLineNodeId: nodeId,
    year: params.year ?? 2026,
    month: params.month ?? 5,
    storeId: params.storeId ?? 'st',
    compromises: [],
    busyDayContributions: [],
    contributionScores: [{ staffId: 's1', compromiseCount: 1, busyDayCount: 1, score: 3 }],
    confirmedAt: params.confirmedAt,
  });

describe('前月の確定版と、引き継ぎの知らせ', () => {
  const june = { storeId: 'st', year: 2026, month: 6 };
  const tailFrom = (scheduleId: string, nodeId: string, scores?: boolean) =>
    new PrecedingMonthTail({
      source: { scheduleId, worldLineNodeId: nodeId },
      days: [WorkingDay.of(2026, 5, 31)],
      cells: [],
      ...(scores ? { contributionScores: [{ staffId: 's1', compromiseCount: 0, busyDayCount: 0, score: 7 }] } : {}),
    });

  test('引き継ぐのは、同じ店舗の1か月前の確定版だけ', () => {
    const may = reportOf('a', 'n1');
    const otherStore = reportOf('c', 'n4', { storeId: 'other' });
    const april = reportOf('d', 'n5', { month: 4 });

    expect(precedingConfirmedOf([otherStore, april, may], june)).toBe(may);
    expect(precedingConfirmedOf([otherStore, april], june)).toBeUndefined();
  });

  test('いま引き継いでいる版と違う確定版があるときだけ知らせる', () => {
    const confirmed = reportOf('a', 'n1');

    // 前月がまだ確定していなければ何も言わない
    expect(pendingInheritanceOf(undefined, undefined)).toBeUndefined();
    // 引き継いでいない（前月があとから確定した）なら知らせる
    expect(pendingInheritanceOf(confirmed, undefined)).toBe(confirmed);
    // 同じ版を引き継いでいれば何も言わない
    expect(pendingInheritanceOf(confirmed, tailFrom('a', 'n1'))).toBeUndefined();
    // 確定版が置き換わった（別の版・別の勤務表）なら知らせる
    expect(pendingInheritanceOf(confirmed, tailFrom('a', 'n0'))).toBe(confirmed);
    expect(pendingInheritanceOf(confirmed, tailFrom('b', 'n1'))).toBe(confirmed);
  });

  test('★は引き継ぎに焼き付いたものを読む。焼き付く前の古い形は、同じ版の確定版からだけ読む', () => {
    const confirmed = reportOf('a', 'n1');

    expect(inheritedScoresOf(undefined, confirmed)).toBeUndefined();
    // 焼き付いていれば、確定版の今の★ではなくそちらを読む
    expect(inheritedScoresOf(tailFrom('a', 'n1', true), confirmed)?.[0].score).toBe(7);
    // ★を写す前の古い形：同じ版なら確定版から、版が違えば読まない
    expect(inheritedScoresOf(tailFrom('a', 'n1'), confirmed)?.[0].score).toBe(3);
    expect(inheritedScoresOf(tailFrom('a', 'n0'), confirmed)).toBeUndefined();
  });
});

describe('前月の確定版から写し取って、今月の勤務表に焼き付ける', () => {
  function setUp() {
    const store = fakeStore();
    for (const id of ['s1', 's2']) {
      saveObject(store, STAFF_TYPE, new Staff({ id, name: id }));
    }
    // 前月（5月）: s1 は 27〜31日の5連勤、末日は遅番
    let mayS = createSchedule(store, { storeId: 'st', year: 2026, month: 5 });
    mayS = recordScheduleMutation(store, {
      schedule: mayS,
      transform: (s) =>
        [27, 28, 29, 30]
          .reduce((acc, d) => acc.assignShift('s1', may(d), 'early'), s)
          .assignShift('s1', may(31), 'late')
          .assignDayOff('s2', may(31)),
    });
    const mayScope = localScopeId(SCHEDULE_TYPE, mayS.id);
    const confirmedNode = store.getState().worldLineGraph.graphs[mayScope].apexNodeId as string;
    const report = reportOf(mayS.id, confirmedNode, { confirmedAt: 1000 });

    // 確定した後で前月を編集しても、写るのは確定した版
    recordScheduleMutation(store, {
      schedule: mayS,
      transform: (s) => s.assignDayOff('s1', may(31)),
    });

    return { store, report };
  }

  test('確定ノード時点の勤務表から、月末の勤務を勤務帯の名前で、★と一緒に写し取る', async () => {
    const { store, report } = setUp();

    const tail = await captureInheritance(store, report, 5);

    expect(tail?.source).toEqual(report.version);
    expect(tail?.confirmedAt).toBe(1000);
    expect(tail?.days).toHaveLength(7);
    expect(tail?.shiftNameOn('s1', may(31))).toBe('遅番');
    expect(tail?.trailingWorkdays('s1')).toBe(5);
    expect(tail?.cellOf('s2', may(31))?.value).toEqual({ kind: 'day-off' });
    expect(tail?.scoreOf('s1')).toBe(3);
  });

  test('引き継ぎ付きで作った今月は、引き継ぎを起点に持ち、前月末からの連勤を持ち越す', async () => {
    const { store, report } = setUp();
    const inheritance = await captureInheritance(store, report, 5);

    const created = createSchedule(store, { storeId: 'st', year: 2026, month: 6, inheritance });
    const scope = localScopeId(SCHEDULE_TYPE, created.id);
    const born = readFromScope<MonthlyStaffSchedule>(store, scope, SCHEDULE_TYPE, created.id);
    expect(born?.precedingTail?.source).toEqual(report.version);
    // ★は自動で引き継ぐが、休みの優先度に使うのは既定でオフ
    const constraints = readFromScope<ConstraintSet>(store, scope, CONSTRAINT_SET_TYPE, created.id);
    expect(constraints?.useReportPriority).toBe(false);

    const june: MonthlyStaffSchedule = created.assignShift('s1', WorkingDay.of(2026, 6, 1), 'middle');
    const violations = new MaxConsecutiveWorkdaysConstraint(5).check(june);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toBe('前月から続いて6連勤（上限5連勤）');
  });

  test('確定ノードがもう無ければ写し取れない（引き継がない）', async () => {
    const { store, report } = setUp();
    const gone = reportOf(report.scheduleId, 'no-such-node');

    expect(await captureInheritance(store, gone, 5)).toBeUndefined();
  });
});
