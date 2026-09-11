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
      new WorkingStaffMember({ staffId: 'x', staff: { id: 'x', name: '応援' } })
        .isTemporary
    ).toBe(true);
  });

  test('★ 同一性は staffId が正。抱えた実体の id がずれていても行は分裂しない', () => {
    const member = new WorkingStaffMember({
      staffId: 'tmp-1',
      staff: { id: 'ずれた-id', name: '応援 太郎' },
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

  test('state は入れ子まで plain（世界線記録の codec が要らない）', () => {
    const member = WorkingStaffMember.temporary(
      new Staff({ id: 'tmp-1', name: '応援 太郎', department: '客室' })
    );
    const plain = JSON.parse(JSON.stringify(member.state));

    expect(plain).toEqual(member.state);
    expect(new WorkingStaffMember(plain).staff?.name).toBe('応援 太郎');
  });
});
