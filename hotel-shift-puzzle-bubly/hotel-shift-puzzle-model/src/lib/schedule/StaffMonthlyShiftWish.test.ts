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

  describe('提出（submit / withdraw）', () => {
    const AT = '2026-05-20T09:00:00.000Z';

    test('作りたては未提出', () => {
      expect(create().isSubmitted).toBe(false);
      expect(create().submittedAt).toBeNull();
    });

    test('submit で提出済みになる（不変）', () => {
      const draft = create().setPreference(d1, DAY_OFF, 'want');
      const submitted = draft.submit(AT);
      expect(submitted.isSubmitted).toBe(true);
      expect(submitted.submittedAt).toBe(AT);
      expect(draft.isSubmitted).toBe(false); // 元は変わらない
    });

    test('提出済みは編集できない（取り下げれば編集できる）', () => {
      const submitted = create().submit(AT);
      expect(() => submitted.setPreference(d1, DAY_OFF, 'want')).toThrow();
      expect(() =>
        submitted.withdraw().setPreference(d1, DAY_OFF, 'want')
      ).not.toThrow();
    });

    test('提出状態も toPlain / fromPlain で保たれる', () => {
      const submitted = create().setPreference(d1, DAY_OFF, 'want').submit(AT);
      const restored = StaffMonthlyShiftWish.fromPlain(submitted.toPlain());
      expect(restored.submittedAt).toBe(AT);
    });

    test('提出のしくみより前の plain（submittedAt 無し）は未提出として読む', () => {
      const legacy = StaffMonthlyShiftWish.fromPlain({
        staffId: 'staff-A',
        year: 2026,
        month: 6,
        byDay: {},
      } as never);
      expect(legacy.isSubmitted).toBe(false);
    });
  });
});
