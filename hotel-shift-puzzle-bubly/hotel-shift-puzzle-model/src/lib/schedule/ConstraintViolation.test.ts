import { ConstraintViolation } from './ConstraintViolation.js';
import { WorkingDay } from './WorkingDay.js';

describe('ConstraintViolation（制約違反）の使い方', () => {
  const make = () =>
    new ConstraintViolation({
      constraintType: 'max-consecutive-workdays',
      staffId: 'staff-A',
      days: [
        WorkingDay.of(2026, 6, 1),
        WorkingDay.of(2026, 6, 2),
        WorkingDay.of(2026, 6, 3),
      ],
      message: '6連勤（上限5連勤）',
    });

  test('coversCell は範囲内のセルだけ true', () => {
    const v = make();
    expect(v.coversCell('staff-A', WorkingDay.of(2026, 6, 2))).toBe(true);
    expect(v.coversCell('staff-A', WorkingDay.of(2026, 6, 4))).toBe(false); // 範囲外の日
    expect(v.coversCell('staff-B', WorkingDay.of(2026, 6, 2))).toBe(false); // 別スタッフ
  });

  test('coversDay はスタッフを問わず日付だけで判定', () => {
    const v = make();
    expect(v.coversDay(WorkingDay.of(2026, 6, 1))).toBe(true);
    expect(v.coversDay(WorkingDay.of(2026, 6, 9))).toBe(false);
  });

  test('key は種別・スタッフ・範囲（先頭_末尾）で表す', () => {
    expect(make().key).toBe('max-consecutive-workdays:staff-A:2026-06-01_2026-06-03');
  });

  test('toPlain / fromPlain でラウンドトリップできる', () => {
    const v = make();
    const restored = ConstraintViolation.fromPlain(v.toPlain());
    expect(restored.toPlain()).toEqual(v.toPlain());
    expect(restored.days.map((d) => d.key)).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
    ]);
  });
});
