import { StaffMonthlyShiftWish } from './StaffMonthlyShiftWish.js';
import { WorkingDay } from './WorkingDay.js';
import { CalendarMonthPeriod, FourWeekPeriod, SchedulePeriod } from './SchedulePeriod.js';

describe('StaffMonthlyShiftWish（スタッフ月別シフト希望）の使い方', () => {
  const d1 = WorkingDay.of(2026, 6, 1);
  const d2 = WorkingDay.of(2026, 6, 2);
  const create = () =>
    StaffMonthlyShiftWish.create({ staffId: 'staff-A', period: CalendarMonthPeriod.of(2026, 6) });

  // オプションキーは不透明な文字列（上位層が意味づけ）
  const DAY_OFF = 'day-off';
  const EARLY = 'work:早番';

  test('id はスタッフ×期で一意。暦月の期は期を入れる前と同じ ID', () => {
    expect(create().id).toBe('staff-A:2026-06');
    expect(StaffMonthlyShiftWish.idOf('staff-B', CalendarMonthPeriod.of(2026, 12))).toBe('staff-B:2026-12');
    const fourWeek = new FourWeekPeriod({ start: WorkingDay.of(2026, 6, 7) });
    expect(StaffMonthlyShiftWish.idOf('staff-B', fourWeek)).toBe('staff-B:four-week:2026-06-07');
  });

  test('4週の期の希望：稼働日は期の28日で、保存して読み戻すと同じ期', () => {
    const fourWeek = new FourWeekPeriod({ start: WorkingDay.of(2026, 6, 7) });
    const w = StaffMonthlyShiftWish.create({ staffId: 'staff-A', period: fourWeek }).setPreference(
      WorkingDay.of(2026, 7, 1),
      DAY_OFF,
      'want'
    );
    expect(w.workingDays()).toHaveLength(28);
    const plain = w.toPlain();
    expect(plain).not.toHaveProperty('year');
    const back = StaffMonthlyShiftWish.fromPlain(plain);
    expect(back.period.equals(fourWeek)).toBe(true);
    expect(back.preferenceFor(WorkingDay.of(2026, 7, 1), DAY_OFF)).toBe('want');
  });

  test('暦月の希望の保存形は、期を入れる前と同じ（period のキーを作らない）', () => {
    expect(create().toPlain()).toStrictEqual({
      staffId: 'staff-A',
      year: 2026,
      month: 6,
      byDay: {},
      submittedAt: null,
    });
  });

  test('期のキーから期に戻せる（URL に載せる）', () => {
    expect(SchedulePeriod.fromKey('2026-06')?.equals(CalendarMonthPeriod.of(2026, 6))).toBe(true);
    expect(SchedulePeriod.fromKey('four-week:2026-06-07')?.start.key).toBe('2026-06-07');
    expect(SchedulePeriod.fromKey('2026-13')).toBeUndefined();
    expect(SchedulePeriod.fromKey('nonsense')).toBeUndefined();
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
