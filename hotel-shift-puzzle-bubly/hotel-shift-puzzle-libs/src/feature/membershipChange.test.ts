/**
 * 顔ぶれの変更で「連れて動くもの」が漏れないことを固定する。
 *
 * 行だけ消して割当を残す・席を用意せずに人を足す、はどちらも画面上は静かに壊れる
 * （表に居ない人が必要人数を満たす／足した人に一日も割り当てられない）。
 */
import {
  WorkingStaffGroup,
  MonthlyStaffSchedule,
  WorkShiftSet,
  WorkShift,
  ScheduleAvailability,
  ScheduleConstraints,
  ShiftLeaderRule,
  WorkingDay,
  Staff,
} from '@bublys-org/hotel-shift-puzzle-model';
import { buildMembershipChange } from './membershipChange.js';
import {
  SCHEDULE_TYPE,
  SCHEDULE_AVAILABILITY_TYPE,
  SCHEDULE_CONSTRAINTS_TYPE,
  WORKING_STAFF_GROUP_TYPE,
} from '../objects/hotelObjects.js';

const june1 = WorkingDay.of(2026, 6, 1);

const workShiftSet = () =>
  WorkShiftSet.of('sched-1', [
    WorkShift.of('early', '早番', { hour: 7 }),
    WorkShift.of('late', '遅番', { hour: 13 }),
  ]);

const setUp = () => ({
  group: WorkingStaffGroup.ofRoster('sched-1', ['a', 'b']),
  schedule: MonthlyStaffSchedule.create({
    id: 'sched-1',
    storeId: 'store-1',
    year: 2026,
    month: 6,
  })
    .assignShift('a', june1, 'early')
    .assignShift('b', june1, 'late'),
  workShiftSet: workShiftSet(),
  availability: ScheduleAvailability.create('sched-1', ['a', 'b'], ['early', 'late']),
  constraints: new ScheduleConstraints({
    scheduleId: 'sched-1',
    leaderRules: [
      new ShiftLeaderRule({
        key: 'early',
        label: '早責',
        shiftName: '早番',
        leaderStaffIds: ['a', 'b'],
        minCount: 1,
      }),
    ],
  }),
});

const typesOf = (items: { type: string }[]) => items.map((i) => i.type);
const pick = <T,>(items: { type: string; obj: unknown }[], type: string): T =>
  items.find((i) => i.type === type)?.obj as T;

describe('buildMembershipChange（顔ぶれが変わったとき同じノードに載せる一式）', () => {
  it('並び替えだけなら、動くのは勤務スタッフ群だけ', () => {
    const base = setUp();
    const items = buildMembershipChange({
      ...base,
      group: base.group.move('b', 0),
    });
    expect(typesOf(items)).toEqual([WORKING_STAFF_GROUP_TYPE]);
  });

  it('★ 人を足すと、可能勤務帯にその人の席ができる（無いと一日も割り当てられない）', () => {
    const base = setUp();
    const helper = new Staff({ id: 'tmp-1', name: '応援 太郎' });
    const items = buildMembershipChange({
      ...base,
      group: base.group.addTemporary(helper),
      joining: 'tmp-1',
    });

    expect(typesOf(items)).toEqual([
      WORKING_STAFF_GROUP_TYPE,
      SCHEDULE_AVAILABILITY_TYPE,
    ]);
    const availability = pick<ScheduleAvailability>(items, SCHEDULE_AVAILABILITY_TYPE);
    expect(availability.allowedShiftIds('tmp-1').sort()).toEqual(['early', 'late']);
  });

  it('戻ってきた人の可能勤務帯は上書きしない（外す前の可否がそのまま戻る）', () => {
    const base = setUp();
    const items = buildMembershipChange({
      ...base,
      availability: base.availability.toggle('b', 'early'), // 早番を外してある
      group: base.group.remove('b').addRoster('b'),
      joining: 'b',
    });
    expect(typesOf(items)).toEqual([WORKING_STAFF_GROUP_TYPE]);
  });

  it('★ 人を外すと、その人の割当と責任者候補も同じ一式で消える', () => {
    const base = setUp();
    const items = buildMembershipChange({
      ...base,
      group: base.group.remove('b'),
      leaving: 'b',
    });

    expect(typesOf(items).sort()).toEqual(
      [WORKING_STAFF_GROUP_TYPE, SCHEDULE_TYPE, SCHEDULE_CONSTRAINTS_TYPE].sort()
    );

    const schedule = pick<MonthlyStaffSchedule>(items, SCHEDULE_TYPE);
    expect(schedule.assignmentsForStaff('b')).toEqual([]);
    // フッターの集計からも消えていること（残ると表に居ない人が必要人数を満たす）
    expect(schedule.countWorkingByShift(june1).get('late')).toBeUndefined();
    // 残った人は無傷
    expect(schedule.getShiftIdFor('a', june1)).toBe('early');

    const constraints = pick<ScheduleConstraints>(items, SCHEDULE_CONSTRAINTS_TYPE);
    expect(constraints.leaderRule('early')?.leaderStaffIds).toEqual(['a']);
  });

  it('読めていない集約は、そのぶんを記録しない（空で上書きしない）', () => {
    const base = setUp();
    const items = buildMembershipChange({
      group: base.group.remove('b'),
      leaving: 'b',
      // schedule / constraints / availability は手元に無い
    });
    expect(typesOf(items)).toEqual([WORKING_STAFF_GROUP_TYPE]);
  });
});
