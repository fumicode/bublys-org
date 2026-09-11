import { Staff } from './Staff.js';
import { WorkingStaffMember } from './WorkingStaffMember.js';

const roster = new Map([
  ['a', new Staff({ id: 'a', name: '相田', department: 'フロント' })],
]);
const fromRoster = (staffId: string) => roster.get(staffId);

describe('WorkingStaffMember（勤務スタッフ群のメンバー1人）', () => {
  test('名簿の人は実体を抱えない。解くときは名簿から引く', () => {
    const member = WorkingStaffMember.ofRoster('a');

    expect(member.staffId).toBe('a');
    expect(member.isTemporary).toBe(false);
    expect(member.staff).toBeUndefined();
    expect(member.resolve(fromRoster)?.name).toBe('相田');
  });

  test('名簿から引けなければ解けない（行にできないので呼び出し側が落とす）', () => {
    expect(WorkingStaffMember.ofRoster('zzz').resolve(fromRoster)).toBeUndefined();
  });

  test('臨時の人は実体を抱える。名簿に居なくても解ける', () => {
    const member = WorkingStaffMember.temporary(
      new Staff({ id: 'tmp-1', name: '応援 太郎', department: '客室' })
    );

    expect(member.staffId).toBe('tmp-1');
    expect(member.isTemporary).toBe(true);
    expect(member.resolve(fromRoster)?.name).toBe('応援 太郎');
    expect(member.staff?.department).toBe('客室');
  });

  test('★ 臨時かどうかは「実体を抱えているか」だけで決まる（別の印を持たない）', () => {
    expect(new WorkingStaffMember({ staffId: 'a' }).isTemporary).toBe(false);
    expect(
      new WorkingStaffMember({
        staffId: 'x',
        staff: new Staff({ id: 'x', name: '応援' }),
      }).isTemporary
    ).toBe(true);
  });

  test('★ 同一性は staffId が正。抱えた実体の id がずれていても行は分裂しない', () => {
    const member = new WorkingStaffMember({
      staffId: 'tmp-1',
      staff: new Staff({ id: 'ずれた-id', name: '応援 太郎' }),
    });

    expect(member.staffId).toBe('tmp-1');
    expect(member.staff?.id).toBe('tmp-1');
    expect(member.resolve(fromRoster)?.id).toBe('tmp-1');
  });

  test('mapStaff は臨時の人の実体だけ変える（不変）', () => {
    const base = WorkingStaffMember.temporary(
      new Staff({ id: 'tmp-1', name: '応援 太郎' })
    );

    const renamed = base.mapStaff((s) => s.rename('応援 次郎'));
    expect(renamed.staff?.name).toBe('応援 次郎');
    expect(renamed.staffId).toBe('tmp-1');
    expect(base.staff?.name).toBe('応援 太郎'); // 元は不変
  });

  test('mapStaff は名簿の人には効かない（実体が名簿側にあるので触れない）', () => {
    const member = WorkingStaffMember.ofRoster('a');
    expect(member.mapStaff((s) => s.rename('別人'))).toBe(member);
    expect(roster.get('a')?.name).toBe('相田'); // 名簿そのものは無傷
  });

  test('state は実体をインスタンスで持つ（保存形は toPlain で別に作る）', () => {
    const member = WorkingStaffMember.temporary(
      new Staff({ id: 'tmp-1', name: '応援 太郎', department: '客室' })
    );

    expect(member.state.staff).toBeInstanceOf(Staff);
    expect(member.toPlain()).toEqual({
      staffId: 'tmp-1',
      staff: { id: 'tmp-1', name: '応援 太郎', department: '客室' },
    });
    expect(() => JSON.stringify(member.toPlain())).not.toThrow();
  });

  test('toPlain / fromPlain で往復できる', () => {
    const temporary = WorkingStaffMember.temporary(
      new Staff({ id: 'tmp-1', name: '応援 太郎', department: '客室' })
    );
    const rosterMember = WorkingStaffMember.ofRoster('a');

    for (const original of [temporary, rosterMember]) {
      const restored = WorkingStaffMember.fromPlain(original.toPlain());
      expect(restored.staffId).toBe(original.staffId);
      expect(restored.isTemporary).toBe(original.isTemporary);
      expect(restored.staff?.state).toEqual(original.staff?.state);
      expect(restored.toPlain()).toEqual(original.toPlain());
    }
    // 名簿の人は staff キーを持たない（「実体を抱えていない」が保存形にも出る）
    expect('staff' in rosterMember.toPlain()).toBe(false);
  });
});
