/**
 * 人を外したとき「連れて動くもの」が漏れないことを固定する。
 *
 * 行だけ消して割当を残すと画面上は静かに壊れる（表に居ない人が必要人数を満たす）。
 * 責任者候補に残すと、どう埋めても満たせない日ができる。
 */
import {
  WorkingStaffGroup,
  MonthlyStaffSchedule,
  ScheduleConstraints,
  ShiftLeaderRule,
  WorkingDay,
  Staff,
} from '@bublys-org/hotel-shift-puzzle-model';
import { buildMembershipChange } from './membershipChange.js';
import {
  SCHEDULE_TYPE,
  SCHEDULE_CONSTRAINTS_TYPE,
  WORKING_STAFF_GROUP_TYPE,
} from '../objects/hotelObjects.js';

const june1 = WorkingDay.of(2026, 6, 1);

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

  it('★ 人を足しても連れて動くものは無い（可能勤務帯は群の中で、既定でどこにでも入れる）', () => {
    const base = setUp();
    const helper = new Staff({ id: 'tmp-1', name: '応援 太郎' });
    const items = buildMembershipChange({
      ...base,
      group: base.group.addTemporary(helper),
    });

    expect(typesOf(items)).toEqual([WORKING_STAFF_GROUP_TYPE]);
    const group = pick<WorkingStaffGroup>(items, WORKING_STAFF_GROUP_TYPE);
    expect(group.isAllowed('tmp-1', 'early')).toBe(true);
    expect(group.isAllowed('tmp-1', 'late')).toBe(true);
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
      // schedule / constraints は手元に無い
    });
    expect(typesOf(items)).toEqual([WORKING_STAFF_GROUP_TYPE]);
  });
});
