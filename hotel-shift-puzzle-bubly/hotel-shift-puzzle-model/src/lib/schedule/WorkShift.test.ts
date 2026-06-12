import { WorkShift, createDefaultWorkShifts } from './WorkShift.js';

describe('WorkShift（勤務帯）', () => {
  test('時・分で開始時刻を指定できる（分は省略可）', () => {
    const early = WorkShift.of('early', '早番', { hour: 7 });
    expect(early.startHour).toBe(7);
    expect(early.startMinuteOfHour).toBe(0);
    expect(early.startTimeLabel).toBe('7:00');
  });

  test('分を指定すると 9:30 のような時刻になる', () => {
    const shift = WorkShift.of('mid', '中番', { hour: 9, minute: 30 });
    expect(shift.start).toEqual({ hour: 9, minute: 30 });
    expect(shift.startTimeLabel).toBe('9:30');
  });

  test('startMinute は 0:00 からの通算分（ソート・計算用）', () => {
    expect(WorkShift.of('a', 'A', { hour: 7 }).startMinute).toBe(420);
    expect(WorkShift.of('b', 'B', { hour: 9, minute: 30 }).startMinute).toBe(570);
  });

  test('rename / changeStart は新しいインスタンスを返す（不変）', () => {
    const base = WorkShift.of('early', '早番', { hour: 7 });

    const renamed = base.rename('朝番');
    expect(renamed.name).toBe('朝番');
    expect(base.name).toBe('早番'); // 元は不変

    const moved = base.changeStart({ hour: 8, minute: 30 });
    expect(moved.startTimeLabel).toBe('8:30');
    expect(base.startTimeLabel).toBe('7:00'); // 元は不変
  });

  test('標準の勤務帯は早番(7:00)/中番(9:00)/遅番(13:00)', () => {
    const shifts = createDefaultWorkShifts();
    expect(shifts.map((s) => [s.name, s.startTimeLabel])).toEqual([
      ['早番', '7:00'],
      ['中番', '9:00'],
      ['遅番', '13:00'],
    ]);
  });
});
