import { ConstraintChecker } from './ConstraintChecker.js';
import { AssignmentState } from './Assignment.js';
import { MemberState } from '../member/Member.js';
import { RoleState } from '../role/Role.js';
import { TimeSlotState } from '../time/TimeSlot.js';
import { AssignmentReasonState } from './AssignmentReason.js';

const now = new Date().toISOString();

const makeReason = (): AssignmentReasonState => ({
  category: 'skill_match',
  text: '',
  createdBy: 'test',
  createdAt: now,
});

const makeMember = (id: string, skills: string[], availableSlotIds: string[]): MemberState => ({
  id,
  name: `メンバー${id}`,
  tags: [],
  skills,
  availableSlotIds,
  memo: '',
  eventId: 'event-1',
  createdAt: now,
  updatedAt: now,
});

const makeRole = (id: string, requiredSkillIds: string[], minRequired = 1): RoleState => ({
  id,
  name: `役割${id}`,
  description: '',
  requiredSkillIds,
  minRequired,
  maxRequired: null,
  color: '#000',
  eventId: 'event-1',
});

const makeSlot = (id: string): TimeSlotState => ({
  id,
  dayIndex: 0,
  startMinute: 0,
  durationMinutes: 60,
  eventId: 'event-1',
});

const makeAssignment = (
  id: string,
  memberId: string,
  roleId: string,
  timeSlotId: string
): AssignmentState => ({
  id,
  memberId,
  roleId,
  timeSlotId,
  shiftPlanId: 'plan-1',
  reason: makeReason(),
  locked: false,
  createdAt: now,
  updatedAt: now,
});

describe('ConstraintChecker', () => {
  test('違反がない場合は空配列を返す', () => {
    const member = makeMember('m1', ['skill-1'], ['slot-1']);
    const role = makeRole('r1', ['skill-1']);
    const slot = makeSlot('slot-1');
    const assignment = makeAssignment('a1', 'm1', 'r1', 'slot-1');

    const checker = ConstraintChecker.create([assignment], [member], [role], [slot]);
    expect(checker.computeViolations()).toHaveLength(0);
  });

  test('同一メンバーの時間帯重複を検出できる', () => {
    const member = makeMember('m1', [], ['slot-1']);
    const slot = makeSlot('slot-1');
    const assignment1 = makeAssignment('a1', 'm1', 'r1', 'slot-1');
    const assignment2 = makeAssignment('a2', 'm1', 'r2', 'slot-1');

    const checker = ConstraintChecker.create([assignment1, assignment2], [member], [], [slot]);
    const violations = checker.computeViolations();
    expect(violations.some((v) => v.type === 'duplicate_member_in_timeslot')).toBe(true);
  });

  test('スキル不足を検出できる', () => {
    const member = makeMember('m1', [], ['slot-1']); // スキルなし
    const role = makeRole('r1', ['skill-1']); // skill-1 が必要
    const slot = makeSlot('slot-1');
    const assignment = makeAssignment('a1', 'm1', 'r1', 'slot-1');

    const checker = ConstraintChecker.create([assignment], [member], [role], [slot]);
    const violations = checker.computeViolations();
    expect(violations.some((v) => v.type === 'skill_mismatch')).toBe(true);
  });

  test('参加可能時間外の配置を検出できる', () => {
    const member = makeMember('m1', [], ['slot-2']); // slot-2 のみ参加可能
    const slot = makeSlot('slot-1');
    const assignment = makeAssignment('a1', 'm1', 'r1', 'slot-1'); // slot-1 に配置

    const checker = ConstraintChecker.create([assignment], [member], [], [slot]);
    const violations = checker.computeViolations();
    expect(violations.some((v) => v.type === 'outside_availability')).toBe(true);
  });

  test('複数の違反を同時に検出できる', () => {
    const member = makeMember('m1', [], ['slot-1']);
    const slot = makeSlot('slot-1');
    const roleWithSkill = makeRole('r1', ['skill-1']); // スキル不足
    const a1 = makeAssignment('a1', 'm1', 'r1', 'slot-1');
    const a2 = makeAssignment('a2', 'm1', 'r2', 'slot-1'); // 重複

    const checker = ConstraintChecker.create([a1, a2], [member], [roleWithSkill], [slot]);
    const violations = checker.computeViolations();
    expect(violations.length).toBeGreaterThanOrEqual(2);
  });
});
