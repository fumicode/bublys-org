import { Assignment } from './Assignment.js';
import { AssignmentReason } from './AssignmentReason.js';

describe('Assignment', () => {
  const createTestAssignment = () =>
    Assignment.create({
      memberId: 'member-1',
      roleId: 'role-1',
      timeSlotId: 'slot-1',
      shiftPlanId: 'plan-1',
      reason: AssignmentReason.create('skill_match', '田中花子', 'PC操作が得意').state,
    });

  test('配置を作成できる（reasonは必須）', () => {
    const assignment = createTestAssignment();
    expect(assignment.memberId).toBe('member-1');
    expect(assignment.reason.category).toBe('skill_match');
    expect(assignment.locked).toBe(false);
  });

  test('配置をロック・解除できる（不変性）', () => {
    const assignment = createTestAssignment();
    const locked = assignment.lock();
    expect(locked.locked).toBe(true);
    expect(assignment.locked).toBe(false);

    const unlocked = locked.unlock();
    expect(unlocked.locked).toBe(false);
  });

  test('配置理由を更新できる', () => {
    const assignment = createTestAssignment();
    const newReason = AssignmentReason.create('training', '鈴木', '育成のため');
    const updated = assignment.withReason(newReason);
    expect(updated.reason.category).toBe('training');
    expect(updated.reason.text).toBe('育成のため');
  });

  test('JSON変換できる', () => {
    const assignment = createTestAssignment();
    const json = assignment.toJSON();
    const restored = Assignment.fromJSON(json);
    expect(restored.memberId).toBe(assignment.memberId);
    expect(restored.reason.category).toBe(assignment.reason.category);
  });
});

describe('AssignmentReason', () => {
  test('全カテゴリのラベルが取得できる', () => {
    expect(AssignmentReason.getCategoryLabel('skill_match')).toBe('スキル適合');
    expect(AssignmentReason.getCategoryLabel('training')).toBe('育成目的');
    expect(AssignmentReason.getCategoryLabel('compatibility')).toBe('相性考慮');
    expect(AssignmentReason.getCategoryLabel('availability')).toBe('空き時間調整');
    expect(AssignmentReason.getCategoryLabel('other')).toBe('その他');
  });

  test('全カテゴリ一覧が取得できる', () => {
    const categories = AssignmentReason.getAllCategories();
    expect(categories).toHaveLength(5);
    expect(categories).toContain('skill_match');
  });
});
