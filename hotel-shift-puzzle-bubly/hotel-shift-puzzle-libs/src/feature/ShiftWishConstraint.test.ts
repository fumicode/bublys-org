import { StaffMonthlyShiftWish, WorkingDay } from '@bublys-org/hotel-shift-puzzle-model';
import { wishMismatchFor } from './ShiftWishConstraint.js';

describe('wishMismatchFor（希望と割当の食い違い判定）', () => {
  const d1 = WorkingDay.of(2026, 6, 1);
  const wish = () =>
    StaffMonthlyShiftWish.create({ staffId: 'staff-A', year: 2026, month: 6 });

  test('希望が無い日は食い違いなし（null）', () => {
    expect(wishMismatchFor(d1, wish(), 'work:早番')).toBeNull();
  });

  test('避けたい(×)に一致する割当は食い違い', () => {
    const w = wish().setPreference(d1, 'work:早番', 'avoid');
    const result = wishMismatchFor(d1, w, 'work:早番');
    expect(result).not.toBeNull();
    expect(result?.assignedText).toBe('早番');
  });

  test('したい(○)があるのに割当がそのどれでもない場合は食い違い', () => {
    const w = wish().setPreference(d1, 'work:早番', 'want');
    const result = wishMismatchFor(d1, w, 'day-off');
    expect(result).not.toBeNull();
    expect(result?.wishText).toContain('早番○');
  });

  test('したい(○)に一致する割当は食い違いなし', () => {
    const w = wish().setPreference(d1, 'work:早番', 'want');
    expect(wishMismatchFor(d1, w, 'work:早番')).toBeNull();
  });
});
