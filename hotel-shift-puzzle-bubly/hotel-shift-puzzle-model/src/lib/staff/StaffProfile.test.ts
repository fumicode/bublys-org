import { ShiftLeaderRule } from '../schedule/ShiftLeaderRule.js';
import { DayOffStyle } from './DayOffStyle.js';
import { ProfileSelection } from './ProfileSelection.js';
import { Staff } from './Staff.js';
import {
  ProfileItem,
  ProfileValue,
  StaffProfileDictionary,
} from './StaffProfileDictionary.js';
import { BUILT_IN_PROFILE_ITEM, staffProfileOf } from './StaffProfile.js';
import { WorkingStaffMember } from './WorkingStaffMember.js';

/** 辞書: 経験（1つ選ぶ、🔰 は新人）／資格（複数選ぶ、記号なし） */
const dictionary = StaffProfileDictionary.empty()
  .addItem(
    new ProfileItem({
      id: 'experience',
      category: 'basic',
      name: '経験',
      choice: 'one',
      values: [
        new ProfileValue({ id: 'new', label: '新人', symbol: '🔰' }),
        new ProfileValue({ id: 'mid', label: '中堅' }),
        new ProfileValue({ id: 'veteran', label: 'ベテラン' }),
      ],
    })
  )
  .addItem(
    new ProfileItem({
      id: 'license',
      category: 'ability',
      name: '資格',
      choice: 'many',
      values: [
        new ProfileValue({ id: 'cook', label: '調理師' }),
        new ProfileValue({ id: 'sommelier', label: 'ソムリエ' }),
      ],
    })
  );

const early = new ShiftLeaderRule({
  key: 'early',
  label: '早責',
  shiftName: '早番',
  leaderStaffIds: ['a'],
});

const staff = new Staff({ id: 'a', name: '相田', department: 'フロント' }).setProfileValues(
  'experience',
  ['new']
);

describe('StaffProfile — 出所の違う値を、分類ごとの1つの見方に束ねる', () => {
  test('名前の横の記号は、記号のある値だけを分類の順に（基本情報 → 役割 → 勤務スタイル）', () => {
    const profile = staffProfileOf('a', {
      staff,
      member: WorkingStaffMember.ofRoster('a'),
      dictionary,
      leaderRules: [early],
    });

    expect(profile.marks).toEqual([
      { kind: 'symbol', text: '🔰', label: '経験：新人', framed: false },
      { kind: 'leader', ruleKey: 'early', label: '早責', shiftName: '早番', staffIds: ['a'] },
      { kind: 'dayOffStyle', style: DayOffStyle.DEFAULT },
    ]);
  });

  test('所属（部署）は基本情報に並ぶが、記号が無いので名前の横には出さない', () => {
    const profile = staffProfileOf('a', { staff, dictionary });

    expect(profile.entry(BUILT_IN_PROFILE_ITEM.department)?.values[0].label).toBe('フロント');
    expect(profile.marks.some((m) => m.kind === 'symbol' && m.text === 'フロント')).toBe(false);
  });

  test('責任者は勤務表の制約セットから読む。勤務表の外（ルールを渡さない）では出ない', () => {
    const inSchedule = staffProfileOf('a', { staff, dictionary, leaderRules: [early] });
    expect(inSchedule.entry(BUILT_IN_PROFILE_ITEM.leaderRoles)).toMatchObject({
      category: 'role',
      source: 'schedule',
      values: [{ id: 'early', label: '早責' }],
    });

    const outside = staffProfileOf('a', { staff, dictionary });
    expect(outside.entry(BUILT_IN_PROFILE_ITEM.leaderRoles)).toBeUndefined();
  });

  test('辞書の項目は、勤務表での上書きがあればそれ、無ければその人の既定値（項目ごと）', () => {
    const member = WorkingStaffMember.ofRoster('a')
      .overrideProfileValues('experience', ['mid'])
      .overrideProfileValues('license', ['cook']);
    const profile = staffProfileOf('a', { staff, member, dictionary });

    expect(profile.entry('experience')).toMatchObject({
      source: 'member',
      values: [{ id: 'mid', label: '中堅' }],
    });
    expect(profile.entry('license')?.values.map((v) => v.label)).toEqual(['調理師']);
  });

  test('上書きを空にすると「この勤務表では無い」。上書きを外すと既定値に戻る', () => {
    const none = WorkingStaffMember.ofRoster('a').overrideProfileValues('experience', []);
    expect(staffProfileOf('a', { staff, member: none, dictionary }).entry('experience')).toBeUndefined();

    const back = none.overrideProfileValues('experience', undefined);
    expect(
      staffProfileOf('a', { staff, member: back, dictionary }).entry('experience')
    ).toMatchObject({ source: 'staff', values: [{ id: 'new' }] });
  });

  test('休みの形は上書きがあればそれ（どの層の値かも分かる）', () => {
    const member = WorkingStaffMember.ofRoster('a').overrideDayOffStyle(DayOffStyle.clustered(4));
    const entry = staffProfileOf('a', { staff, member, dictionary }).entry(
      BUILT_IN_PROFILE_ITEM.dayOffStyle
    );

    expect(entry).toMatchObject({ category: 'workStyle', source: 'member' });
    expect(entry?.values[0].label).toBe('連休型（4連まで）');
  });

  test('辞書から消えた項目・値は黙って落とす（人に残った記録は壊さない）', () => {
    const withGone = staff.setProfileValues('license', ['cook', 'gone']);
    const shrunk = dictionary.removeItem('experience');
    const profile = staffProfileOf('a', { staff: withGone, dictionary: shrunk });

    expect(profile.entry('experience')).toBeUndefined();
    expect(profile.entry('license')?.values.map((v) => v.id)).toEqual(['cook']);
  });
});

describe('プロファイルを入れる前の記録と、保存形が変わらない（打ち消しスナップ）', () => {
  test('何も選んでいない Staff・メンバーは profile を書かない', () => {
    const oldStaffPlain = { id: 'a', name: '相田', department: 'フロント' };
    expect(Staff.fromPlain(oldStaffPlain).toPlain()).toEqual(oldStaffPlain);

    const oldMemberPlain = { staffId: 'a', allowedShiftIds: ['early'] };
    expect(WorkingStaffMember.fromPlain(oldMemberPlain).toPlain()).toEqual(oldMemberPlain);
  });

  test('値を付けて外すと、付ける前と同じ保存形に戻る', () => {
    const plain = new Staff({ id: 'a', name: '相田' }).toPlain();
    const roundTrip = Staff.fromPlain(plain)
      .setProfileValues('experience', ['new'])
      .setProfileValues('experience', []);
    expect(roundTrip.toPlain()).toEqual(plain);

    const member = WorkingStaffMember.ofRoster('a');
    const back = member
      .overrideProfileValues('experience', [])
      .overrideProfileValues('experience', undefined);
    expect(back.toPlain()).toEqual(member.toPlain());
  });

  test('付けた値は保存形を通って戻る', () => {
    const member = WorkingStaffMember.ofRoster('a').overrideProfileValues('experience', []);
    expect(WorkingStaffMember.fromPlain(member.toPlain()).profileOverride.valueIdsOf('experience')).toEqual([]);
    expect(Staff.fromPlain(staff.toPlain()).profile.equals(staff.profile)).toBe(true);
  });
});

describe('ProfileSelection', () => {
  test('項目ごとに値を決め、外せる。決めた順を保つ', () => {
    const s = ProfileSelection.EMPTY.set('b', ['1']).set('a', ['2']).set('b', ['3']);
    expect(s.toPlain()).toEqual([
      { itemId: 'b', valueIds: ['3'] },
      { itemId: 'a', valueIds: ['2'] },
    ]);
    expect(s.clear('b').toPlain()).toEqual([{ itemId: 'a', valueIds: ['2'] }]);
  });

  test('同じ値を決め直しても、同じインスタンスを返す', () => {
    const s = ProfileSelection.EMPTY.set('a', ['1']);
    expect(s.set('a', ['1'])).toBe(s);
    expect(s.clear('x')).toBe(s);
  });
});

describe('StaffProfileDictionary', () => {
  test('1つ選ぶ項目は先頭の1つだけ（複数選ぶから変えた後の記録でも崩れない）', () => {
    const experience = dictionary.item('experience')!;
    expect(experience.resolve(['mid', 'new']).map((v) => v.id)).toEqual(['mid']);
    expect(experience.withChoice('many').resolve(['mid', 'new']).map((v) => v.id)).toEqual([
      'mid',
      'new',
    ]);
  });

  test('値の記号は変えられ、空にすると記号なし', () => {
    const v = new ProfileValue({ id: 'new', label: '新人', symbol: '🔰' });
    expect(v.withSymbol('🌱').symbol).toBe('🌱');
    expect(v.withSymbol('').toPlain()).toEqual({ id: 'new', label: '新人' });
  });

  test('保存形を通って戻る', () => {
    const back = StaffProfileDictionary.fromPlain(dictionary.toPlain());
    expect(back.toPlain()).toEqual(dictionary.toPlain());
    expect(back.itemsIn('ability').map((i) => i.name)).toEqual(['資格']);
  });
});

describe('名前の横の見せ方（出さない／そのまま／文字を囲む）', () => {
  test('値ごとに見せ方を選べる。記号が無ければ表示名を出す', () => {
    const v = new ProfileValue({ id: 'part', label: 'パート' });
    expect(v.markStyle).toBe('none');
    expect(v.withMarkStyle('framed').markText).toBe('パート');
    expect(v.withMarkStyle('plain').markText).toBe('パート');
    expect(v.withSymbol('パ').withMarkStyle('framed').markText).toBe('パ');
  });

  test('見せ方を行き来しても記号は消えない。出さないにすると名前の横には出ない', () => {
    const v = new ProfileValue({ id: 'part', label: 'パート' }).withSymbol('パ');
    const hidden = v.withMarkStyle('none');
    expect(hidden.markText).toBeUndefined();
    expect(hidden.withMarkStyle('framed').markText).toBe('パ');
  });

  test('見せ方を選ぶ前の値は、記号があればそのまま出す', () => {
    expect(new ProfileValue({ id: 'new', label: '新人', symbol: '🔰' }).markStyle).toBe('plain');
  });

  test('囲む値は framed の記号として名前の横に出る', () => {
    const dict = dictionary.updateItem('experience', (i) =>
      i.updateValue('mid', (v) => v.withMarkStyle('framed'))
    );
    const s = staff.setProfileValues('experience', ['mid']);
    expect(staffProfileOf('a', { staff: s, dictionary: dict }).marks[0]).toEqual({
      kind: 'symbol',
      text: '中堅',
      label: '経験：中堅',
      framed: true,
    });
  });

  test('組み込みの項目の見せ方は辞書が持つ（所属を出す／休みの形・責任者を出さない）', () => {
    const dict = dictionary
      .withBuiltInMark('department', true)
      .withBuiltInMark('dayOffStyle', false)
      .withBuiltInMark('leaderRoles', false);
    const marks = staffProfileOf('a', { staff, dictionary: dict, leaderRules: [early] }).marks;
    expect(marks).toEqual([
      { kind: 'symbol', text: 'フロント', label: '所属：フロント', framed: true },
      { kind: 'symbol', text: '🔰', label: '経験：新人', framed: false },
    ]);
    // 見せ方を変えても値そのものは読める（プロファイルの表・スタッフ詳細で使う）
    expect(
      staffProfileOf('a', { staff, dictionary: dict, leaderRules: [early] }).entry(
        BUILT_IN_PROFILE_ITEM.leaderRoles
      )?.values[0].label
    ).toBe('早責');
    expect(StaffProfileDictionary.fromPlain(dict.toPlain()).showsBuiltIn('department')).toBe(true);
  });
});

describe('名前の横の記号は、分類ごとにまとめる（分類を横に、同じ分類を縦に）', () => {
  test('同じ分類の記号は1つの塊に、記号の無い分類は塊にしない', () => {
    const dict = dictionary.updateItem('license', (i) =>
      i.updateValue('cook', (v) => v.withMarkStyle('framed'))
    );
    const s = staff.setProfileValues('license', ['cook']);
    const groups = staffProfileOf('a', { staff: s, dictionary: dict, leaderRules: [early] }).markGroups;
    expect(groups.map((g) => [g.category, g.marks.length])).toEqual([
      ['basic', 1],
      ['role', 1],
      ['ability', 1],
      ['workStyle', 1],
    ]);
  });
});
