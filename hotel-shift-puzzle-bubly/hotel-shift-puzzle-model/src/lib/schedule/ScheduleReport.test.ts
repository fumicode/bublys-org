import { ScheduleReport } from './ScheduleReport.js';

describe('ScheduleReport（シフト表完成レポート）の使い方', () => {
  const create = () =>
    ScheduleReport.create({
      scheduleId: 'schedule-A',
      worldLineNodeId: 'node-1',
      year: 2026,
      month: 6,
      storeId: 'store-1',
      compromises: [
        {
          staffId: 'staff-A',
          label: '希望',
          dayKeys: ['2026-06-01'],
          message: '希望と異なる割当です（希望: 早番○ ／ 割当: 休み）',
        },
      ],
      busyDayContributions: [
        { dayKey: '2026-06-10', requiredCount: 5, workedStaffIds: ['staff-A', 'staff-B'] },
      ],
      contributionScores: [
        { staffId: 'staff-A', compromiseCount: 1, busyDayCount: 1, score: 3 },
        { staffId: 'staff-B', compromiseCount: 0, busyDayCount: 1, score: 1 },
      ],
    });

  test('id は勤務表×確定ノードで一意', () => {
    expect(create().id).toBe('schedule-A:node-1');
    expect(ScheduleReport.idOf('schedule-B', 'node-9')).toBe('schedule-B:node-9');
  });

  test('確定時に渡したデータをそのまま保持する', () => {
    const r = create();
    expect(r.compromises).toHaveLength(1);
    expect(r.busyDayContributions).toHaveLength(1);
    expect(r.contributionScores).toHaveLength(2);
  });

  test('配慮メモは既定で空、setNote で設定できる（不変）', () => {
    const base = create();
    expect(base.noteFor('staff-A')).toBe('');

    const noted = base.setNote('staff-A', '来月は休み希望を優先してあげたい');
    expect(noted.noteFor('staff-A')).toBe('来月は休み希望を優先してあげたい');
    // 元は不変
    expect(base.noteFor('staff-A')).toBe('');
  });

  test('setNote に空文字を渡すとメモを消す', () => {
    const noted = create().setNote('staff-A', 'メモ');
    const cleared = noted.setNote('staff-A', '   ');
    expect(cleared.noteFor('staff-A')).toBe('');
    expect(cleared.toPlain().considerationNotes).toEqual({});
  });

  test('toPlain / fromPlain でラウンドトリップできる', () => {
    const r = create().setNote('staff-B', '繁忙日に強い');
    const restored = ScheduleReport.fromPlain(r.toPlain());
    expect(restored.toPlain()).toEqual(r.toPlain());
    expect(() => JSON.stringify(r.toPlain())).not.toThrow();
  });

  test('タイトルは既定で "{year}年{month}月"、rename で変更できる（不変）', () => {
    const base = create();
    expect(base.title).toBe('2026年6月');

    const renamed = base.rename('6月案A');
    expect(renamed.title).toBe('6月案A');
    // 元は不変
    expect(base.title).toBe('2026年6月');
  });

  test('rename に空文字を渡すと既定のタイトルに戻る', () => {
    const renamed = create().rename('6月案A').rename('   ');
    expect(renamed.title).toBe('2026年6月');
  });
});
