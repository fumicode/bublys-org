import { Staff, ScheduleReport } from '@bublys-org/hotel-shift-puzzle-model';
import { prioritizeStaffByLinkedReports } from './reportPriority.js';

describe('prioritizeStaffByLinkedReports（紐づけレポートによる自動シフト優先度）', () => {
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

  test('紐づけレポートが無ければ元の順序のまま', () => {
    expect(prioritizeStaffByLinkedReports(staffList, [])).toEqual(staffList);
  });

  test('貢献度スコア（妥協＋繁忙日対応の加重合計）が高いスタッフを先頭に安定ソートする', () => {
    const report = reportWithScores([
      { staffId: 'staff-A', score: 1 },
      { staffId: 'staff-C', score: 5 },
      { staffId: 'staff-B', score: 0 },
    ]);
    const ordered = prioritizeStaffByLinkedReports(staffList, [report]);
    expect(ordered.map((s) => s.id)).toEqual(['staff-C', 'staff-A', 'staff-B']);
  });

  test('妥協が無くても繁忙日対応だけでスコアがあれば優先される（旧: 妥協件数のみでは反映されなかった）', () => {
    // staff-B は妥協0件・繁忙日対応のみで score=3、staff-A は妥協由来の score=2
    const report = reportWithScores([
      { staffId: 'staff-A', score: 2 },
      { staffId: 'staff-B', score: 3 },
    ]);
    const ordered = prioritizeStaffByLinkedReports(staffList, [report]);
    expect(ordered.map((s) => s.id)).toEqual(['staff-B', 'staff-A', 'staff-C']);
  });

  test('複数レポートのスコアを合算する', () => {
    const report1 = reportWithScores([{ staffId: 'staff-B', score: 2 }]);
    const report2 = reportWithScores([
      { staffId: 'staff-B', score: 1 },
      { staffId: 'staff-A', score: 2 },
    ]);
    const ordered = prioritizeStaffByLinkedReports(staffList, [report1, report2]);
    // staff-B: 3点, staff-A: 2点, staff-C: 0点
    expect(ordered.map((s) => s.id)).toEqual(['staff-B', 'staff-A', 'staff-C']);
  });

  test('同スコア（0点含む）のスタッフは元の順序を保つ（安定ソート）', () => {
    const report = reportWithScores([{ staffId: 'staff-C', score: 4 }]);
    const ordered = prioritizeStaffByLinkedReports(staffList, [report]);
    expect(ordered.map((s) => s.id)).toEqual(['staff-C', 'staff-A', 'staff-B']);
  });

  test('スコアデータが1件も無ければ元の順序のまま', () => {
    const report = reportWithScores([]);
    expect(prioritizeStaffByLinkedReports(staffList, [report])).toEqual(staffList);
  });

  test('元の配列は変更しない', () => {
    const original = [...staffList];
    prioritizeStaffByLinkedReports(
      staffList,
      [reportWithScores([{ staffId: 'staff-C', score: 4 }])]
    );
    expect(staffList).toEqual(original);
  });
});
