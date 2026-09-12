/**
 * 関連の導出は**判断**なので、当たり方と外し方の両方を固定する。
 * とくに「推測で近い名前に寄せない」は、図が嘘をつかないための線引き。
 */
import {
  classNamesInType,
  isMany,
  referencedClassByNaming,
  relationsOfClass,
} from './relations.js';

const known = new Set(['Staff', 'WorkShift', 'WorkShiftSet', 'WorkingDay', 'ShiftAssignment']);

describe('型の文字列からクラス名を拾う', () => {
  it('State / Plain の接尾辞は落として同じクラスとみなす', () => {
    expect(classNamesInType('WorkShiftState[]', known)).toEqual(['WorkShift']);
    expect(classNamesInType('ShiftAssignmentPlain', known)).toEqual(['ShiftAssignment']);
  });

  it('入れ子や合併に出てくるものも全部拾う', () => {
    expect(classNamesInType('Record<string, WorkShift>', known)).toEqual(['WorkShift']);
    expect(classNamesInType('WorkingDay | undefined', known)).toEqual(['WorkingDay']);
    expect(new Set(classNamesInType('{ day: WorkingDay; staff: Staff }', known))).toEqual(
      new Set(['WorkingDay', 'Staff'])
    );
  });

  it('知らない語には反応しない（似ているだけの名前に寄せない）', () => {
    expect(classNamesInType('string | number', known)).toEqual([]);
    expect(classNamesInType('StaffMember', known)).toEqual([]);
  });

  it('WorkShiftSet と WorkShift を取り違えない（片方が他方の接頭辞）', () => {
    expect(classNamesInType('WorkShiftSet', known)).toEqual(['WorkShiftSet']);
  });
});

describe('複数持つか', () => {
  it.each([
    ['WorkShiftState[]', true],
    ['Array<Staff>', true],
    ['Record<string, number>', true],
    ['Map<string, Staff>', true],
    ['string', false],
    ['WorkingDay | undefined', false],
  ])('%s → %s', (type, expected) => {
    expect(isMany(type)).toBe(expected);
  });
});

describe('命名から参照先を推す', () => {
  it('〜Id / 〜Ids が既知のクラスに当たるときだけ言う', () => {
    expect(referencedClassByNaming('staffId', known)).toBe('Staff');
    expect(referencedClassByNaming('workShiftIds', known)).toBe('WorkShift');
  });

  it('★ 当たらなければ黙る（近い名前に寄せない）', () => {
    expect(referencedClassByNaming('scheduleId', known)).toBeUndefined();
    expect(referencedClassByNaming('externalId', known)).toBeUndefined();
  });

  it('★ 登録名とクラス名がずれているものは、別名で解く（推測しない）', () => {
    // `scheduleId` が指すのは登録名 Schedule。クラスは MonthlyStaffSchedule。
    // この対応は記述子しか知らないので、渡されて初めて言える
    const withSchedule = new Set([...known, 'MonthlyStaffSchedule']);
    expect(referencedClassByNaming('scheduleId', withSchedule)).toBeUndefined();
    expect(
      referencedClassByNaming('scheduleId', withSchedule, {
        Schedule: 'MonthlyStaffSchedule',
      })
    ).toBe('MonthlyStaffSchedule');
  });

  it('複合語は末尾の語まで試す（leaderStaffIds は Staff を指す）', () => {
    expect(referencedClassByNaming('leaderStaffIds', known)).toBe('Staff');
    expect(referencedClassByNaming('assignedWorkShiftId', known)).toBe('WorkShift');
  });

  it('末尾まで試しても当たらなければ、やはり黙る', () => {
    expect(referencedClassByNaming('someUnknownThingId', known)).toBeUndefined();
  });

  it('★ id そのものは参照ではない（自分の同一性）', () => {
    expect(referencedClassByNaming('id', known)).toBeUndefined();
  });
});

describe('クラスのつながり', () => {
  const f = (name: string, type: string) => ({ name, type, optional: false });

  it('型に出ていれば内包（集約の内側）', () => {
    const rels = relationsOfClass('WorkShiftSet', [f('shifts', 'WorkShiftState[]')], known);
    expect(rels).toEqual([
      {
        from: 'WorkShiftSet',
        to: 'WorkShift',
        kind: 'contains',
        via: 'shifts',
        many: true,
        foundBy: 'type',
      },
    ]);
  });

  it('id で持つなら参照（集約をまたぐ）', () => {
    const rels = relationsOfClass('ShiftAssignment', [f('staffId', 'string')], known);
    expect(rels[0]).toMatchObject({ to: 'Staff', kind: 'references', foundBy: 'id-naming' });
  });

  it('★ 同じフィールドから内包と参照を両方出さない（型で分かるならそちらが確実）', () => {
    const rels = relationsOfClass('X', [f('staffId', 'Staff')], known);
    expect(rels).toHaveLength(1);
    expect(rels[0].kind).toBe('contains');
  });

  it('自分自身は数えない（rename が自分を返すのは関連ではない）', () => {
    expect(relationsOfClass('Staff', [f('id', 'string'), f('name', 'string')], known)).toEqual(
      []
    );
  });
});
