import { StaffMonthlyShiftWish } from './StaffMonthlyShiftWish.js';
import { WorkingDay } from './WorkingDay.js';

describe('StaffMonthlyShiftWish（スタッフ月別シフト希望）の使い方', () => {
  const d1 = WorkingDay.of(2026, 6, 1);
  const d2 = WorkingDay.of(2026, 6, 2);
  const create = () =>
    StaffMonthlyShiftWish.create({ staffId: 'staff-A', year: 2026, month: 6 });

  // オプションキーは不透明な文字列（上位層が意味づけ）
  const DAY_OFF = 'day-off';
  const EARLY = 'work:早番';

  test('id はスタッフ×月で一意', () => {
    expect(create().id).toBe('staff-A:2026-06');
    expect(StaffMonthlyShiftWish.idOf('staff-B', 2026, 12)).toBe('staff-B:2026-12');
  });

  test('既定は全日どうでもいい（空）', () => {
    const w = create();
    expect(w.isEmptyOn(d1)).toBe(true);
    expect(w.preferenceFor(d1, DAY_OFF)).toBeUndefined();
  });

  test('統一形で「休みたい」「特定帯がいい」「避けたい」を表せる', () => {
    const w = create()
      .setPreference(d1, DAY_OFF, 'want') // 6/1 は休みたい
      .setPreference(d2, EARLY, 'want') // 6/2 は早番がいい
      .setPreference(d2, DAY_OFF, 'avoid'); // 6/2 は休みは避けたい

    expect(w.preferenceFor(d1, DAY_OFF)).toBe('want');
    expect(w.wishesOn(d2)).toEqual({ 'work:早番': 'want', 'day-off': 'avoid' });
  });

  test('cyclePreference は neutral→want→avoid→neutral を巡回（不変）', () => {
    const base = create();
    const a = base.cyclePreference(d1, EARLY);
    expect(a.preferenceFor(d1, EARLY)).toBe('want');
    const b = a.cyclePreference(d1, EARLY);
    expect(b.preferenceFor(d1, EARLY)).toBe('avoid');
    const c = b.cyclePreference(d1, EARLY);
    expect(c.preferenceFor(d1, EARLY)).toBeUndefined();
    // 元は不変
    expect(base.isEmptyOn(d1)).toBe(true);
  });

  test('setPreference(null) で neutral に戻す。空日はキーごと消える', () => {
    const w = create().setPreference(d1, EARLY, 'want').setPreference(d1, EARLY, null);
    expect(w.isEmptyOn(d1)).toBe(true);
    expect(w.toPlain().byDay).toEqual({}); // 空日は残さない
  });

  test('toPlain / fromPlain でラウンドトリップできる', () => {
    const w = create().setPreference(d1, DAY_OFF, 'want').setPreference(d2, EARLY, 'avoid');
    const restored = StaffMonthlyShiftWish.fromPlain(w.toPlain());
    expect(restored.toPlain()).toEqual(w.toPlain());
    expect(() => JSON.stringify(w.toPlain())).not.toThrow();
  });

  test('6月は30稼働日', () => {
    expect(create().workingDays()).toHaveLength(30);
  });
});
