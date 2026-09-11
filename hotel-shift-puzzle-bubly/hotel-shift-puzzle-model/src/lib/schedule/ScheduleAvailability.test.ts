import { ScheduleAvailability } from './ScheduleAvailability.js';

describe('ScheduleAvailability（勤務表ごとの可能勤務帯）の使い方', () => {
  const create = () =>
    ScheduleAvailability.create('sched-1', ['staff-A', 'staff-B'], ['early', 'late']);

  test('create は全スタッフ×全勤務帯を許可する', () => {
    const a = create();
    expect(a.id).toBe('sched-1');
    expect(a.scheduleId).toBe('sched-1');
    expect(a.allowedShiftIds('staff-A').sort()).toEqual(['early', 'late']);
    expect(a.isAllowed('staff-A', 'early')).toBe(true);
  });

  test('未登録スタッフは可能勤務帯なし', () => {
    expect(create().allowedShiftIds('unknown')).toEqual([]);
    expect(create().isAllowed('unknown', 'early')).toBe(false);
  });

  test('toggle で可否を反転（不変）', () => {
    const base = create();

    const off = base.toggle('staff-A', 'early');
    expect(off.isAllowed('staff-A', 'early')).toBe(false);
    expect(base.isAllowed('staff-A', 'early')).toBe(true); // 元は不変

    const onAgain = off.toggle('staff-A', 'early');
    expect(onAgain.isAllowed('staff-A', 'early')).toBe(true);
  });

  test('allowAllIfUnset は新しく入った人に全勤務帯を許可する（不変）', () => {
    const base = create();
    const withHelper = base.allowAllIfUnset('tmp-1', ['early', 'late']);

    expect(withHelper.allowedShiftIds('tmp-1').sort()).toEqual(['early', 'late']);
    expect(base.allowedShiftIds('tmp-1')).toEqual([]); // 元は不変
  });

  test('allowAllIfUnset は既に設定のある人には触らない（外して戻した人の可否を消さない）', () => {
    const tuned = create().toggle('staff-A', 'early'); // 早番を外してある
    expect(tuned.allowAllIfUnset('staff-A', ['early', 'late'])).toBe(tuned);
    expect(tuned.isAllowed('staff-A', 'early')).toBe(false);
  });

  test('toggle は他スタッフ・他勤務帯に影響しない', () => {
    const a = create().toggle('staff-A', 'early');
    expect(a.isAllowed('staff-A', 'late')).toBe(true);
    expect(a.isAllowed('staff-B', 'early')).toBe(true);
  });
});
