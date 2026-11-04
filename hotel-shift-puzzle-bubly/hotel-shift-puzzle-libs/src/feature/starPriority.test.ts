import { Staff, ConfirmedSchedule } from '@bublys-org/hotel-shift-puzzle-model';
import { prioritizeStaffByStars } from './starPriority.js';

const staffA = new Staff({ id: 'staff-A', name: 'A' });
const staffB = new Staff({ id: 'staff-B', name: 'B' });
const staffC = new Staff({ id: 'staff-C', name: 'C' });
const staffList = [staffA, staffB, staffC];

/** 前月の確定版から引き継いだ★の行 */
const reportWithScores = (scores: { staffId: string; score: number }[]) =>
  ConfirmedSchedule.create({
    scheduleId: 'sched-1',
    worldLineNodeId: 'node-1',
    year: 2026,
    month: 6,
    storeId: 'store-1',
    compromises: [],
    busyDayContributions: [],
    stars: scores.map((s) => ({
      staffId: s.staffId,
      compromiseCount: 0,
      busyDayCount: 0,
      score: s.score,
    })),
  }).stars;

const idsOf = (staff: Staff[]) => staff.map((s) => s.id);

describe('prioritizeStaffByStars（引き継いだ★による自動シフト優先度）', () => {
  test('★を引き継いでいなければ元の順序のまま・一文は出さない', () => {
    expect(prioritizeStaffByStars(staffList, undefined)).toEqual({ staffList, note: null });
  });

  test('★（譲歩＋繁忙日対応の加重合計）が高いスタッフを先頭に安定ソートする', () => {
    const report = reportWithScores([
      { staffId: 'staff-A', score: 1 },
      { staffId: 'staff-C', score: 5 },
      { staffId: 'staff-B', score: 0 },
    ]);
    expect(idsOf(prioritizeStaffByStars(staffList, report).staffList)).toEqual([
      'staff-C',
      'staff-A',
      'staff-B',
    ]);
  });

  test('同スコア（0点含む）のスタッフは元の順序を保つ（安定ソート）', () => {
    const report = reportWithScores([{ staffId: 'staff-C', score: 4 }]);
    expect(idsOf(prioritizeStaffByStars(staffList, report).staffList)).toEqual([
      'staff-C',
      'staff-A',
      'staff-B',
    ]);
  });

  test('元の配列は変更しない', () => {
    const original = [...staffList];
    prioritizeStaffByStars(staffList, reportWithScores([{ staffId: 'staff-C', score: 4 }]));
    expect(staffList).toEqual(original);
  });

  test('一文は「何をしたか」と優先した人数だけを言う（誰が何点かは ★ で読む）', () => {
    const report = reportWithScores([
      { staffId: 'staff-A', score: 1 },
      { staffId: 'staff-C', score: 5 },
    ]);
    expect(prioritizeStaffByStars(staffList, report).note).toBe(
      '★の高い順に休みを優先しました（2名）'
    );
  });

  test('スコアのある人がいなければ一文は出さない（重みを0にした・データが無いなど）', () => {
    expect(prioritizeStaffByStars(staffList, reportWithScores([])).note).toBeNull();
    const allZero = reportWithScores([{ staffId: 'staff-A', score: 0 }]);
    expect(prioritizeStaffByStars(staffList, allZero).note).toBeNull();
  });

  test('対象者の外にいる人のスコアは数えない', () => {
    const report = reportWithScores([
      { staffId: 'staff-A', score: 3 },
      { staffId: 'staff-Z', score: 9 },
    ]);
    expect(prioritizeStaffByStars(staffList, report).note).toBe(
      '★の高い順に休みを優先しました（1名）'
    );
  });
});
