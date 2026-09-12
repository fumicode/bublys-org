import { ConstraintSet } from './ConstraintSet.js';
import { ShiftLeaderRule } from './ShiftLeaderRule.js';
import { ShiftIntervalRule } from './ShiftIntervalRule.js';
import { REQUIRED_STAFFING_CONSTRAINT } from './RequiredStaffingConstraint.js';

describe('ConstraintSet.modelConstraints', () => {
  test('RequiredStaffingConstraint を含む', () => {
    const constraints = new ConstraintSet({ id: 'schedule-A', leaderRules: [] });
    const model = constraints.modelConstraints(() => []);
    expect(model.some((c) => c.type === REQUIRED_STAFFING_CONSTRAINT)).toBe(true);
  });
});

describe('ConstraintSet の参考レポート紐づけ（linkReport/unlinkReport）', () => {
  const create = () =>
    new ConstraintSet({ id: 'schedule-A', leaderRules: [] });

  test('既定は紐づけ無し', () => {
    expect(create().linkedReportIds).toEqual([]);
  });

  test('linkReport で紐づけを追加できる（不変）', () => {
    const base = create();
    const linked = base.linkReport('report-1');
    expect(linked.linkedReportIds).toEqual(['report-1']);
    // 元は不変
    expect(base.linkedReportIds).toEqual([]);
  });

  test('同じレポートを重複して紐づけない', () => {
    const linked = create().linkReport('report-1').linkReport('report-1');
    expect(linked.linkedReportIds).toEqual(['report-1']);
  });

  test('複数のレポートを紐づけられる', () => {
    const linked = create().linkReport('report-1').linkReport('report-2');
    expect(linked.linkedReportIds).toEqual(['report-1', 'report-2']);
  });

  test('unlinkReport で紐づけを解除できる（不変）', () => {
    const linked = create().linkReport('report-1').linkReport('report-2');
    const unlinked = linked.unlinkReport('report-1');
    expect(unlinked.linkedReportIds).toEqual(['report-2']);
    // 元は不変
    expect(linked.linkedReportIds).toEqual(['report-1', 'report-2']);
  });

  test('紐づいていないレポートを解除しても何も起きない', () => {
    const linked = create().linkReport('report-1');
    expect(linked.unlinkReport('report-9').linkedReportIds).toEqual(['report-1']);
  });

  test('toPlain / fromPlain でラウンドトリップできる', () => {
    const linked = create().linkReport('report-1').linkReport('report-2');
    const restored = ConstraintSet.fromPlain(linked.toPlain());
    expect(restored.linkedReportIds).toEqual(['report-1', 'report-2']);
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
});
