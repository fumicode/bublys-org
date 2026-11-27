import { ConstraintSet } from './ConstraintSet.js';
import { ShiftLeaderRule } from './ShiftLeaderRule.js';
import { ShiftIntervalRule } from './ShiftIntervalRule.js';
import { REQUIRED_STAFFING_CONSTRAINT } from './RequiredStaffingConstraint.js';

describe('ConstraintSet.modelConstraints', () => {
  test('必要人数は制約に含まない（制約バーに出ない＝明記していないものは違反にしない）', () => {
    const constraints = new ConstraintSet({ id: 'schedule-A', leaderRules: [] });
    const model = constraints.modelConstraints(() => []);
    expect(model.some((c) => c.type === REQUIRED_STAFFING_CONSTRAINT)).toBe(false);
  });
});

describe('ConstraintSet は前月の確定版への紐づけを持たない（#231）', () => {
  test('旧形式の紐づけ（linkedReportId / linkedReportIds）は読むときに捨てる', () => {
    const restored = ConstraintSet.fromPlain({
      id: 'schedule-A',
      leaderRules: [],
      linkedReportId: 'report-1',
      linkedReportIds: ['report-1', 'report-2'],
    });
    expect(restored.toPlain()).not.toHaveProperty('linkedReportId');
    expect(restored.toPlain()).not.toHaveProperty('linkedReportIds');
  });
});

describe('ConstraintSet.removeStaff（勤務表から外れた人を責任者候補から消す）', () => {
  const create = () =>
    new ConstraintSet({
      id: 'schedule-A',
      leaderRules: [
        new ShiftLeaderRule({ key: 'early', label: '早責', shiftName: '早番', leaderStaffIds: ['a', 'b'], minCount: 1 }),
        new ShiftLeaderRule({ key: 'night', label: '夜責', shiftName: '遅番', leaderStaffIds: ['b', 'c'], minCount: 1 }),
      ],
    });

  test('すべてのルールの候補者から外す（不変）', () => {
    const base = create();
    const without = base.removeStaff('b');

    expect(without.leaderRule('early')?.leaderStaffIds).toEqual(['a']);
    expect(without.leaderRule('night')?.leaderStaffIds).toEqual(['c']);
    // 元は不変
    expect(base.leaderRule('early')?.leaderStaffIds).toEqual(['a', 'b']);
  });

  test('どのルールにも居なければ自分自身を返す（無駄な世界線ノードを作らない）', () => {
    const base = create();
    expect(base.removeStaff('zzz')).toBe(base);
  });
});

describe('ConstraintSet の勤務間インターバル（main から合流した制約）', () => {
  test('既定は「遅番明けは早番・中番に入れない」。インスタンスで返る', () => {
    const set = ConstraintSet.empty('schedule-A');
    const rules = set.shiftIntervalRules;

    expect(rules).toHaveLength(1);
    expect(rules[0]).toBeInstanceOf(ShiftIntervalRule);
    expect(rules[0].key).toBe('late');
    expect(set.shiftIntervalRule('late')?.fromShiftName).toBe('遅番');
  });

  test('グローバルのテンプレート（id="global"）でも同じ既定が効く', () => {
    expect(ConstraintSet.empty('global').shiftIntervalRules).toHaveLength(1);
  });

  test('★ toPlain / fromPlain の往復でインスタンスに戻る（CAS に plain が混ざらない）', () => {
    const original = new ConstraintSet({
      id: 'schedule-A',
      leaderRules: [],
      shiftIntervalRules: [
        new ShiftIntervalRule({
          key: 'late',
          fromShiftName: '遅番',
          forbiddenNextShiftNames: ['早番'],
          minRestHours: 8,
        }),
      ],
    });

    const plain = original.toPlain();
    expect(() => JSON.stringify(plain)).not.toThrow();
    // 保存形は plain（インスタンスがそのまま CAS へ行っていない）
    expect(plain.shiftIntervalRules?.[0]).toEqual({
      key: 'late',
      fromShiftName: '遅番',
      forbiddenNextShiftNames: ['早番'],
      minRestHours: 8,
    });

    const restored = ConstraintSet.fromPlain(JSON.parse(JSON.stringify(plain)));
    expect(restored.state.shiftIntervalRules?.[0]).toBeInstanceOf(ShiftIntervalRule);
    expect(restored.shiftIntervalRule('late')?.forbiddenNextShiftNames).toEqual(['早番']);
    expect(restored.toPlain()).toEqual(plain);
  });

  test('withId でコピーしても勤務間インターバルはついていく（グローバル→勤務表）', () => {
    const copy = ConstraintSet.empty('global').withId('schedule-A');
    expect(copy.id).toBe('schedule-A');
    expect(copy.shiftIntervalRules).toHaveLength(1);
  });

  test('前月の確定版から引き継いだ★を優先度に使うかは既定でオフ。切り替えられ、保存形で残る', () => {
    const set = ConstraintSet.empty('s');
    expect(set.useStarPriority).toBe(false);

    const on = set.withUseStarPriority(true);
    expect(on.useStarPriority).toBe(true);
    expect(set.useStarPriority).toBe(false); // 不変
    expect(on.withUseStarPriority(true)).toBe(on);
    expect(ConstraintSet.fromPlain(on.toPlain()).useStarPriority).toBe(true);
  });
});
