/**
 * 参照レポート（前月の確定）を選び、その確定版の末尾を今月の勤務表へつなぐ（月跨ぎ）。
 *
 * - 参照レポートの候補は、同じ店舗・1か月前の確定を確定の新しい順に並べる
 * - 参照と前月の末尾は一緒に変わる（末尾があれば必ず今の参照の確定版）
 * - 写し取るのは確定したノード時点の版（その後の前月の編集は写らない）
 * - 作った後に新しい確定が出ても勝手には差し替えず、「より新しい確定がある」とだけ言う
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
  capturePrecedingTail,
  newerReferenceCandidate,
  referenceCandidates,
  withReference,
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
    contributionScores: [],
    confirmedAt: params.confirmedAt,
  });

describe('参照レポート（前月の確定）の選び方', () => {
  const june = { storeId: 'st', year: 2026, month: 6 };

  test('同じ店舗・1か月前の確定だけを、確定の新しい順に並べる', () => {
    const old = reportOf('a', 'n1', { confirmedAt: 100 });
    const latest = reportOf('b', 'n2', { confirmedAt: 300 });
    const middle = reportOf('a', 'n3', { confirmedAt: 200 });
    const otherStore = reportOf('c', 'n4', { storeId: 'other', confirmedAt: 999 });
    const twoMonthsAgo = reportOf('d', 'n5', { month: 4, confirmedAt: 999 });

    const candidates = referenceCandidates(
      [old, latest, middle, otherStore, twoMonthsAgo],
      june,
      (r) => r.confirmedAt
    );

    expect(candidates.map((c) => c.report.id)).toEqual([latest.id, middle.id, old.id]);
  });

  test('確定時刻の分からない古いレポートは最後へ', () => {
    const unknown = reportOf('a', 'n1');
    const known = reportOf('b', 'n2', { confirmedAt: 1 });

    const candidates = referenceCandidates([unknown, known], june, (r) => r.confirmedAt);

    expect(candidates.map((c) => c.report.id)).toEqual([known.id, unknown.id]);
  });

  test('今の参照より新しい確定があるときだけ知らせる', () => {
    const old = { report: reportOf('a', 'n1'), confirmedAt: 100 };
    const latest = { report: reportOf('b', 'n2'), confirmedAt: 300 };
    const linkedAt = (id: string, confirmedAt: number) => ({
      report: reportOf(id, 'x'),
      confirmedAt,
    });

    // 参照が無ければ、最新の確定を知らせる
    expect(newerReferenceCandidate([latest, old], undefined)).toBe(latest);
    // 最新を参照していれば何も言わない
    expect(newerReferenceCandidate([latest, old], latest)).toBeUndefined();
    // 古い方を参照していれば、新しい方を知らせる
    expect(newerReferenceCandidate([latest, old], old)).toBe(latest);
    // 参照より古い確定しか無ければ何も言わない
    expect(newerReferenceCandidate([old], linkedAt('x', 200))).toBeUndefined();
  });

  test('参照と前月の末尾は一緒に付き、一緒に外れる', () => {
    const june = MonthlyStaffSchedule.create({ id: 'j', storeId: 'st', year: 2026, month: 6 });
    const constraints = ConstraintSet.empty('j');
    const tail = new PrecedingMonthTail({
      sourceReportId: 'may:n',
      days: [WorkingDay.of(2026, 5, 31)],
      cells: [],
    });

    const linked = withReference(june, constraints, { reportId: 'may:n', tail });
    expect(linked.constraints.linkedReportId).toBe('may:n');
    expect(linked.schedule.precedingTail?.sourceReportId).toBe('may:n');

    // 確定版が読めなければ参照だけ付け、古い末尾は残さない
    const noTail = withReference(linked.schedule, linked.constraints, { reportId: 'may:m' });
    expect(noTail.constraints.linkedReportId).toBe('may:m');
    expect(noTail.schedule.precedingTail).toBeUndefined();

    const unlinked = withReference(linked.schedule, linked.constraints, undefined);
    expect(unlinked.constraints.linkedReportId).toBeUndefined();
    expect(unlinked.schedule.precedingTail).toBeUndefined();
  });
});

describe('前月の確定版の末尾を写し取って、今月の勤務表につなぐ', () => {
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

  test('確定ノード時点の勤務表から、勤務帯の名前で写し取る', async () => {
    const { store, report } = setUp();

    const tail = await capturePrecedingTail(store, { report, confirmedAt: 1000 }, 5);

    expect(tail?.sourceReportId).toBe(report.id);
    expect(tail?.confirmedAt).toBe(1000);
    expect(tail?.days).toHaveLength(7);
    expect(tail?.shiftNameOn('s1', may(31))).toBe('遅番');
    expect(tail?.trailingWorkdays('s1')).toBe(5);
    expect(tail?.cellOf('s2', may(31))?.value).toEqual({ kind: 'day-off' });
  });

  test('参照レポート付きで作った今月は、参照も末尾も起点に載り、前月末からの連勤を持ち越す', async () => {
    const { store, report } = setUp();
    const tail = await capturePrecedingTail(store, { report, confirmedAt: 1000 }, 5);

    const created = createSchedule(store, {
      storeId: 'st',
      year: 2026,
      month: 6,
      reference: { reportId: report.id, tail },
    });
    const scope = localScopeId(SCHEDULE_TYPE, created.id);
    const born = readFromScope<ConstraintSet>(store, scope, CONSTRAINT_SET_TYPE, created.id);
    expect(born?.linkedReportId).toBe(report.id);
    // 参照レポートは自動で紐づくが、貢献度スコアを優先度に使うのは既定でオフ
    expect(born?.useReportPriority).toBe(false);
    expect(created.precedingTail?.sourceReportId).toBe(report.id);

    const june: MonthlyStaffSchedule = created.assignShift('s1', WorkingDay.of(2026, 6, 1), 'middle');
    const violations = new MaxConsecutiveWorkdaysConstraint(5).check(june);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toBe('前月から続いて6連勤（上限5連勤）');
  });

  test('確定ノードがもう無ければ写し取れない', async () => {
    const { store, report } = setUp();
    const gone = reportOf(report.scheduleId, 'no-such-node');

    expect(await capturePrecedingTail(store, { report: gone }, 5)).toBeUndefined();
  });
});
