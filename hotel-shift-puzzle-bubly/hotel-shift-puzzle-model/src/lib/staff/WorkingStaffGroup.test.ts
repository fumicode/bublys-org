import { Staff } from './Staff.js';
import { WorkingStaffMember } from './WorkingStaffMember.js';
import { WorkingStaffGroup } from './WorkingStaffGroup.js';

const roster = [
  new Staff({ id: 'a', name: '相田', department: 'フロント' }),
  new Staff({ id: 'b', name: '井上', department: 'フロント' }),
  new Staff({ id: 'c', name: '上田', department: '客室' }),
];

const groupOfRoster = () => WorkingStaffGroup.ofRoster('sched-1', ['a', 'b', 'c']);

describe('WorkingStaffGroup（勤務スタッフ群）', () => {
  test('名簿メンバーの実体は世界の名簿から解く（並び順は群が決める）', () => {
    const group = WorkingStaffGroup.ofRoster('sched-1', ['c', 'a']);
    expect(group.resolve(roster).map((s) => s.name)).toEqual(['上田', '相田']);
  });

  test('名簿で解けないメンバーは行にできないので落とす', () => {
    const group = WorkingStaffGroup.ofRoster('sched-1', ['a', 'zzz', 'b']);
    expect(group.resolve(roster).map((s) => s.id)).toEqual(['a', 'b']);
  });

  test('臨時の人は群が実体を持つので、名簿に無くても行に出る', () => {
    const helper = new Staff({ id: 'tmp-1', name: '応援 太郎' });
    const group = groupOfRoster().addTemporary(helper);

    expect(group.resolve(roster).map((s) => s.name)).toEqual([
      '相田',
      '井上',
      '上田',
      '応援 太郎',
    ]);
    expect(group.isTemporary('tmp-1')).toBe(true);
    expect(group.isTemporary('a')).toBe(false);
    expect(group.temporaryStaff().map((s) => s.id)).toEqual(['tmp-1']);
  });

  test('同じ人は二重に入らない（名簿・臨時とも）', () => {
    const group = groupOfRoster();
    expect(group.addRoster('b').staffIds()).toEqual(['a', 'b', 'c']);
    expect(group.addTemporary(new Staff({ id: 'a', name: '別人' })).staffIds()).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  test('外すと行から消える。名簿メンバーを外しても名簿（roster）は動かない', () => {
    const base = groupOfRoster();
    const removed = base.remove('b');

    expect(removed.resolve(roster).map((s) => s.id)).toEqual(['a', 'c']);
    expect(removed.has('b')).toBe(false);
    expect(base.has('b')).toBe(true); // 元は不変
    expect(roster.map((s) => s.id)).toEqual(['a', 'b', 'c']); // 名簿そのものは無傷
  });

  test('臨時の人を外すと実体ごと消える', () => {
    const group = groupOfRoster()
      .addTemporary(new Staff({ id: 'tmp-1', name: '応援 太郎' }))
      .remove('tmp-1');
    expect(group.temporaryStaff()).toEqual([]);
    expect(group.resolve(roster).map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  test('move は行の並びを変える（範囲外は端に丸める）', () => {
    const base = groupOfRoster();

    expect(base.move('c', 0).staffIds()).toEqual(['c', 'a', 'b']);
    expect(base.move('a', 1).staffIds()).toEqual(['b', 'a', 'c']);
    expect(base.move('a', 99).staffIds()).toEqual(['b', 'c', 'a']);
    expect(base.move('a', -5).staffIds()).toEqual(['a', 'b', 'c']);
    expect(base.staffIds()).toEqual(['a', 'b', 'c']); // 元は不変
  });

  test('move は居ない人には効かない', () => {
    expect(groupOfRoster().move('zzz', 0).staffIds()).toEqual(['a', 'b', 'c']);
  });

  test('臨時の人だけ改名・部署変更できる（名簿の人には効かない）', () => {
    const group = groupOfRoster().addTemporary(
      new Staff({ id: 'tmp-1', name: '応援 太郎' })
    );

    const renamed = group.renameTemporary('tmp-1', '応援 次郎');
    expect(renamed.resolve(roster).map((s) => s.name)).toContain('応援 次郎');
    expect(group.resolve(roster).map((s) => s.name)).toContain('応援 太郎'); // 元は不変

    const moved = renamed.changeTemporaryDepartment('tmp-1', '客室');
    expect(moved.temporaryStaff()[0].department).toBe('客室');

    // 名簿の人は群からは触れない（実体が世界の名簿側にある）
    expect(group.renameTemporary('a', '別人')).toBe(group);
    expect(group.changeTemporaryDepartment('a', '客室')).toBe(group);
  });

  test('同じ値に直しても新しいインスタンスを作らない（無駄な世界線ノードを作らない）', () => {
    const group = groupOfRoster().addTemporary(
      new Staff({ id: 'tmp-1', name: '応援 太郎', department: '客室' })
    );

    expect(group.renameTemporary('tmp-1', '応援 太郎')).toBe(group);
    expect(group.changeTemporaryDepartment('tmp-1', '客室')).toBe(group);
  });

  test('臨時の人の部署は空にも戻せる（未設定）', () => {
    const group = groupOfRoster()
      .addTemporary(new Staff({ id: 'tmp-1', name: '応援 太郎', department: '客室' }))
      .changeTemporaryDepartment('tmp-1', '');

    expect(group.temporaryStaff()[0].department).toBe('');
  });

  test('★ 可能勤務帯も群が持つ。メンバーでない人はどこにも入れない', () => {
    const all = ['early', 'late'];
    const group = groupOfRoster().toggleShift('b', 'late', all);

    expect(group.isAllowed('a', 'late')).toBe(true); // 絞っていない
    expect(group.isAllowed('b', 'late')).toBe(false); // 外した
    expect(group.isAllowed('b', 'early')).toBe(true);
    expect(group.allowedShiftIdsOf('b')).toEqual(['early']);
    expect(group.allowedShiftIdsOf('a')).toBeUndefined();
    // この勤務表で働かない人は入れない
    expect(group.isAllowed('zzz', 'early')).toBe(false);
  });

  test('allowShiftForAll は絞っている人にだけ勤務帯を足す（勤務帯を増やしたとき）', () => {
    const limited = groupOfRoster().toggleShift('b', 'late', ['early', 'late']);

    const withNew = limited.allowShiftForAll('night');
    expect(withNew.isAllowed('b', 'night')).toBe(true);
    expect(withNew.allowedShiftIdsOf('a')).toBeUndefined(); // 絞っていない人はそのまま

    // 誰も変わらなければ自分自身（無駄な世界線ノードを作らない）
    const open = groupOfRoster();
    expect(open.allowShiftForAll('night')).toBe(open);
  });

  test('外して戻すと可能勤務帯の絞りは消える（メンバーごと消えるので）', () => {
    const limited = groupOfRoster().toggleShift('b', 'late', ['early', 'late']);
    const rejoined = limited.remove('b').addRoster('b');
    expect(rejoined.isAllowed('b', 'late')).toBe(true);
  });

  test('members は WorkingStaffMember で返る（出自は実体の有無で分かる）', () => {
    const group = groupOfRoster().addTemporary(
      new Staff({ id: 'tmp-1', name: '応援 太郎' })
    );
    const members = group.members;

    expect(members.every((m) => m instanceof WorkingStaffMember)).toBe(true);
    expect(members.map((m) => m.staffId)).toEqual(['a', 'b', 'c', 'tmp-1']);
    expect(members.map((m) => m.isTemporary)).toEqual([false, false, false, true]);
    expect(members[3].staff?.name).toBe('応援 太郎');
  });

  test('state はメンバーをインスタンスで持つ（保存形は toPlain で別に作る）', () => {
    const group = groupOfRoster();

    expect(group.state.members[0]).toBeInstanceOf(WorkingStaffMember);
    expect(group.toPlain().members[0]).toEqual({ staffId: 'a' });
  });

  test('toPlain / fromPlain で入れ子まで plain ↔ インスタンスを往復できる', () => {
    const original = groupOfRoster().addTemporary(
      new Staff({ id: 'tmp-1', name: '応援 太郎', department: '客室' })
    );

    const plain = original.toPlain();
    expect(() => JSON.stringify(plain)).not.toThrow();

    const restored = WorkingStaffGroup.fromPlain(
      JSON.parse(JSON.stringify(plain))
    );
    expect(restored.state.members[0]).toBeInstanceOf(WorkingStaffMember);
    expect(restored.resolve(roster).map((s) => s.name)).toEqual([
      '相田',
      '井上',
      '上田',
      '応援 太郎',
    ]);
    expect(restored.isTemporary('tmp-1')).toBe(true);
    expect(restored.toPlain()).toEqual(plain);
  });
});
