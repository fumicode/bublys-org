import { WorkShift } from './WorkShift.js';
import { WorkShiftSet, createDefaultWorkShiftSet } from './WorkShiftSet.js';

describe('WorkShiftSet（勤務帯セット）', () => {
  test('shifts は開始時刻の昇順で返す', () => {
    const set = WorkShiftSet.of('s', [
      WorkShift.of('late', '遅番', { hour: 13 }),
      WorkShift.of('early', '早番', { hour: 7 }),
      WorkShift.of('mid', '中番', { hour: 9 }),
    ]);
    expect(set.shifts.map((s) => s.name)).toEqual(['早番', '中番', '遅番']);
    expect(set.shiftIds()).toEqual(['early', 'mid', 'late']);
  });

  test('groupedByName は連続する同名を colspan 用にまとめる', () => {
    const set = WorkShiftSet.of('s', [
      WorkShift.of('early2', '早番', { hour: 8 }),
      WorkShift.of('early1', '早番', { hour: 7 }),
      WorkShift.of('mid', '中番', { hour: 9 }),
    ]);
    const groups = set.groupedByName();
    expect(groups.map((g) => [g.name, g.shifts.length])).toEqual([
      ['早番', 2],
      ['中番', 1],
    ]);
    // 早番グループ内も時刻昇順
    expect(groups[0].shifts.map((s) => s.startTimeLabel)).toEqual(['7:00', '8:00']);
  });

  test('addShift / rename / changeStart / remove は新しいインスタンスを返す（不変）', () => {
    const base = createDefaultWorkShiftSet('s');

    const added = base.addShift(WorkShift.of('early-b', '早番', { hour: 8 }));
    expect(added.shifts.length).toBe(4);
    expect(base.shifts.length).toBe(3); // 元は不変

    const renamed = base.rename('early', '朝番');
    expect(renamed.findById('early')?.name).toBe('朝番');
    expect(base.findById('early')?.name).toBe('早番');

    const moved = base.changeStart('late', { hour: 15 });
    expect(moved.findById('late')?.startTimeLabel).toBe('15:00');
    expect(base.findById('late')?.startTimeLabel).toBe('13:00');

    const removed = base.remove('middle');
    expect(removed.findById('middle')).toBeUndefined();
    expect(base.findById('middle')).toBeDefined();
  });

  test('時刻変更で並び順が変わる（id は不変）', () => {
    const set = createDefaultWorkShiftSet('s').changeStart('late', { hour: 6 });
    expect(set.shiftIds()).toEqual(['late', 'early', 'middle']);
    expect(set.findById('late')?.startTimeLabel).toBe('6:00');
  });

  test('withId は id を差し替え、勤務帯 id は維持する（コピー用）', () => {
    const global = createDefaultWorkShiftSet('global');
    const copy = global.withId('sched-1');
    expect(copy.id).toBe('sched-1');
    expect(copy.shiftIds()).toEqual(global.shiftIds());
  });

  test('既定セットは早番(7:00)/中番(9:00)/遅番(13:00)', () => {
    const set = createDefaultWorkShiftSet('global');
    expect(set.shifts.map((s) => [s.name, s.startTimeLabel])).toEqual([
      ['早番', '7:00'],
      ['中番', '9:00'],
      ['遅番', '13:00'],
    ]);
  });
});
