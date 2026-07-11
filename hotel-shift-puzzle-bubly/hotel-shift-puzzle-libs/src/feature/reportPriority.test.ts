import { Staff, ScheduleReport } from '@bublys-org/hotel-shift-puzzle-model';
import { prioritizeStaffByLinkedReports } from './reportPriority.js';

describe('prioritizeStaffByLinkedReports（紐づけレポートによる自動シフト優先度）', () => {
  const staffA = new Staff({ id: 'staff-A', name: 'A' });
  const staffB = new Staff({ id: 'staff-B', name: 'B' });
  const staffC = new Staff({ id: 'staff-C', name: 'C' });
  const staffList = [staffA, staffB, staffC];

  const reportWith = (compromiseStaffIds: string[]) =>
    ScheduleReport.create({
      scheduleId: 'sched-1',
      worldLineNodeId: 'node-1',
      year: 2026,
      month: 6,
      storeId: 'store-1',
      compromises: compromiseStaffIds.map((staffId) => ({
        staffId,
        label: '希望',
        dayKeys: ['2026-06-01'],
        message: 'テスト用',
      })),
      busyDayContributions: [],
      contributionScores: [],
    });

  test('紐づけレポートが無ければ元の順序のまま', () => {
    expect(prioritizeStaffByLinkedReports(staffList, [])).toEqual(staffList);
  });

  test('妥協回数が多いスタッフを先頭に安定ソートする', () => {
    // staff-C: 2件, staff-A: 1件, staff-B: 0件
    const report = reportWith(['staff-A', 'staff-C', 'staff-C']);
    const ordered = prioritizeStaffByLinkedReports(staffList, [report]);
    expect(ordered.map((s) => s.id)).toEqual(['staff-C', 'staff-A', 'staff-B']);
  });

  test('複数レポートの妥協回数を合算する', () => {
    const report1 = reportWith(['staff-B']);
    const report2 = reportWith(['staff-B', 'staff-A']);
    const ordered = prioritizeStaffByLinkedReports(staffList, [report1, report2]);
    // staff-B: 2件, staff-A: 1件, staff-C: 0件
    expect(ordered.map((s) => s.id)).toEqual(['staff-B', 'staff-A', 'staff-C']);
  });

  test('同数（0件含む）のスタッフは元の順序を保つ（安定ソート）', () => {
    const report = reportWith(['staff-C']);
    const ordered = prioritizeStaffByLinkedReports(staffList, [report]);
    // staff-C が先頭、残り(A, B)は元の順序のまま
    expect(ordered.map((s) => s.id)).toEqual(['staff-C', 'staff-A', 'staff-B']);
  });

  test('妥協データが1件も無ければ元の順序のまま', () => {
    const report = reportWith([]);
    expect(prioritizeStaffByLinkedReports(staffList, [report])).toEqual(staffList);
  });

  test('元の配列は変更しない', () => {
    const original = [...staffList];
    prioritizeStaffByLinkedReports(staffList, [reportWith(['staff-C'])]);
    expect(staffList).toEqual(original);
  });
});
