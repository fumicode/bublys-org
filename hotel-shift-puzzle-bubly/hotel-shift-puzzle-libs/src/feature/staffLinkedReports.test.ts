import { ScheduleReport } from '@bublys-org/hotel-shift-puzzle-model';
import { staffLinkedReportSummaries } from './staffLinkedReports.js';

describe('staffLinkedReportSummaries（紐づけレポートからスタッフ分だけ取り出す）', () => {
  const reportOf = (params: {
    scheduleId: string;
    year: number;
    month: number;
    scores?: { staffId: string; score: number }[];
  }) =>
    ScheduleReport.create({
      scheduleId: params.scheduleId,
      worldLineNodeId: 'node-1',
      year: params.year,
      month: params.month,
      storeId: 'store-1',
      compromises: [],
      busyDayContributions: [],
      contributionScores: (params.scores ?? []).map((s) => ({
        staffId: s.staffId,
        compromiseCount: 0,
        busyDayCount: 0,
        score: s.score,
      })),
    });

  test('スコアも配慮メモも無いスタッフのレポートは除外する', () => {
    const report = reportOf({
      scheduleId: 'sched-1',
      year: 2026,
      month: 6,
      scores: [{ staffId: 'staff-A', score: 0 }],
    });
    expect(staffLinkedReportSummaries('staff-A', [report])).toEqual([]);
  });

  test('スコアが正のレポートは含める', () => {
    const report = reportOf({
      scheduleId: 'sched-1',
      year: 2026,
      month: 6,
      scores: [{ staffId: 'staff-A', score: 3 }],
    });
    const result = staffLinkedReportSummaries('staff-A', [report]);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(3);
  });

  test('スコアが0でも配慮メモがあれば含める', () => {
    const report = reportOf({
      scheduleId: 'sched-1',
      year: 2026,
      month: 6,
      scores: [{ staffId: 'staff-A', score: 0 }],
    }).setNote('staff-A', '来月は休み希望を優先してあげたい');
    const result = staffLinkedReportSummaries('staff-A', [report]);
    expect(result).toHaveLength(1);
    expect(result[0].note).toBe('来月は休み希望を優先してあげたい');
  });

  test('他のスタッフのスコア・メモは含めない', () => {
    const report = reportOf({
      scheduleId: 'sched-1',
      year: 2026,
      month: 6,
      scores: [{ staffId: 'staff-B', score: 5 }],
    });
    expect(staffLinkedReportSummaries('staff-A', [report])).toEqual([]);
  });

  test('新しい年月順（降順）に並べる', () => {
    const older = reportOf({
      scheduleId: 'sched-1',
      year: 2026,
      month: 3,
      scores: [{ staffId: 'staff-A', score: 1 }],
    });
    const newer = reportOf({
      scheduleId: 'sched-2',
      year: 2026,
      month: 6,
      scores: [{ staffId: 'staff-A', score: 1 }],
    });
    const result = staffLinkedReportSummaries('staff-A', [older, newer]);
    expect(result.map((s) => s.report.month)).toEqual([6, 3]);
  });
});
