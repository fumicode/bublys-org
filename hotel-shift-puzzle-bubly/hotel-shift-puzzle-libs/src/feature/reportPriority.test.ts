import { Staff, ScheduleReport } from '@bublys-org/hotel-shift-puzzle-model';
import { prioritizeStaffByReport } from './reportPriority.js';

const staffA = new Staff({ id: 'staff-A', name: 'A' });
const staffB = new Staff({ id: 'staff-B', name: 'B' });
const staffC = new Staff({ id: 'staff-C', name: 'C' });
const staffList = [staffA, staffB, staffC];

const reportWithScores = (scores: { staffId: string; score: number }[]) =>
  ScheduleReport.create({
    scheduleId: 'sched-1',
    worldLineNodeId: 'node-1',
    year: 2026,
    month: 6,
    storeId: 'store-1',
    compromises: [],
    busyDayContributions: [],
    contributionScores: scores.map((s) => ({
      staffId: s.staffId,
      compromiseCount: 0,
      busyDayCount: 0,
      score: s.score,
    })),
  });

const idsOf = (staff: Staff[]) => staff.map((s) => s.id);

describe('prioritizeStaffByReport（参照レポートによる自動シフト優先度）', () => {
  test('参照レポートが無ければ元の順序のまま・一文は出さない', () => {
    expect(prioritizeStaffByReport(staffList, undefined)).toEqual({ staffList, note: null });
  });

  test('貢献度スコア（譲歩＋繁忙日対応の加重合計）が高いスタッフを先頭に安定ソートする', () => {
    const report = reportWithScores([
      { staffId: 'staff-A', score: 1 },
      { staffId: 'staff-C', score: 5 },
      { staffId: 'staff-B', score: 0 },
    ]);
    expect(idsOf(prioritizeStaffByReport(staffList, report).staffList)).toEqual([
      'staff-C',
      'staff-A',
      'staff-B',
    ]);
  });

  test('同スコア（0点含む）のスタッフは元の順序を保つ（安定ソート）', () => {
    const report = reportWithScores([{ staffId: 'staff-C', score: 4 }]);
    expect(idsOf(prioritizeStaffByReport(staffList, report).staffList)).toEqual([
      'staff-C',
      'staff-A',
      'staff-B',
    ]);
  });

  test('元の配列は変更しない', () => {
    const original = [...staffList];
    prioritizeStaffByReport(staffList, reportWithScores([{ staffId: 'staff-C', score: 4 }]));
    expect(staffList).toEqual(original);
  });

  test('一文は「何をしたか」と優先した人数だけを言う（誰が何点かは ★ で読む）', () => {
    const report = reportWithScores([
      { staffId: 'staff-A', score: 1 },
      { staffId: 'staff-C', score: 5 },
    ]);
    expect(prioritizeStaffByReport(staffList, report).note).toBe(
      '★の高い順に休みを優先しました（2名）'
    );
  });

  test('スコアのある人がいなければ一文は出さない（重みを0にした・データが無いなど）', () => {
    expect(prioritizeStaffByReport(staffList, reportWithScores([])).note).toBeNull();
    const allZero = reportWithScores([{ staffId: 'staff-A', score: 0 }]);
    expect(prioritizeStaffByReport(staffList, allZero).note).toBeNull();
  });

  test('対象者の外にいる人のスコアは数えない', () => {
    const report = reportWithScores([
      { staffId: 'staff-A', score: 3 },
      { staffId: 'staff-Z', score: 9 },
    ]);
    expect(prioritizeStaffByReport(staffList, report).note).toBe(
      '★の高い順に休みを優先しました（1名）'
    );
  });
});
