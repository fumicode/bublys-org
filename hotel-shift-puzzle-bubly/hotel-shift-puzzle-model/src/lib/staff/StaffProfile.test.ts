import { ShiftLeaderRule } from '../schedule/ShiftLeaderRule.js';
import { DayOffStyle } from './DayOffStyle.js';
import { EmojiTag, EmojiTags } from './EmojiTag.js';
import { Staff } from './Staff.js';
import { staffProfileOf } from './StaffProfile.js';
import { WorkingStaffMember } from './WorkingStaffMember.js';

const early = new ShiftLeaderRule({
  key: 'early',
  label: '早責',
  shiftName: '早番',
  leaderStaffIds: ['a'],
});

const staff = new Staff({
  id: 'a',
  name: '相田',
  department: 'フロント',
  tags: [
    new EmojiTag({ emoji: '🔰', label: '新人' }),
    new EmojiTag({ emoji: '🍳' }),
  ],
});

describe('StaffProfile — 絵文字タグ＋組み込み表示を1つの見方に束ねる', () => {
  test('記号は 絵文字タグ → 責任者 → 休みの形 の順に並ぶ', () => {
    const profile = staffProfileOf('a', {
      staff,
      member: WorkingStaffMember.ofRoster('a'),
      leaderRules: [early],
    });

    expect(profile.marks).toEqual([
      { kind: 'emojiTag', emoji: '🔰', label: '新人' },
      { kind: 'emojiTag', emoji: '🍳' },
      { kind: 'leader', ruleKey: 'early', label: '早責', shiftName: '早番', staffIds: ['a'] },
      { kind: 'dayOffStyle', style: DayOffStyle.DEFAULT },
    ]);
  });

  test('責任者は勤務表の制約セットから読む。勤務表の外では出ない', () => {
    const inSchedule = staffProfileOf('a', { staff, leaderRules: [early] });
    expect(inSchedule.leaderMarks).toHaveLength(1);

    const outside = staffProfileOf('a', { staff });
    expect(outside.leaderMarks).toHaveLength(0);
  });

  test('休みの形は上書きがあればそれ', () => {
    const member = WorkingStaffMember.ofRoster('a').overrideDayOffStyle(DayOffStyle.clustered(4));
    const marks = staffProfileOf('a', { staff, member }).marks;
    const dayOff = marks.find((m) => m.kind === 'dayOffStyle');
    expect(dayOff).toMatchObject({ kind: 'dayOffStyle' });
    expect((dayOff as { kind: 'dayOffStyle'; style: DayOffStyle }).style.label).toBe('連休型（4連まで）');
  });

  test('タグのない人は絵文字タグが出ない', () => {
    const noTags = new Staff({ id: 'b', name: '伊藤' });
    const profile = staffProfileOf('b', { staff: noTags });
    expect(profile.emojiTags).toHaveLength(0);
  });
});

describe('EmojiTag', () => {
  test('絵文字とラベルを持つ', () => {
    const tag = new EmojiTag({ emoji: '🔰', label: '新人' });
    expect(tag.emoji).toBe('🔰');
    expect(tag.label).toBe('新人');
  });

  test('ラベルは省略可能', () => {
    const tag = new EmojiTag({ emoji: '🍳' });
    expect(tag.label).toBeUndefined();
  });

  test('ラベルを変えられる', () => {
    const tag = new EmojiTag({ emoji: '🔰', label: '新人' });
    expect(tag.withLabel('研修中').label).toBe('研修中');
    expect(tag.withLabel(undefined).label).toBeUndefined();
  });

  test('同じ絵文字かの判定（ラベルは見ない）', () => {
    const a = new EmojiTag({ emoji: '🔰', label: '新人' });
    const b = new EmojiTag({ emoji: '🔰', label: '見習い' });
    const c = new EmojiTag({ emoji: '🍳' });
    expect(a.sameEmoji(b)).toBe(true);
    expect(a.sameEmoji(c)).toBe(false);
  });

  test('保存形を通って戻る', () => {
    const tag = new EmojiTag({ emoji: '🔰', label: '新人' });
    expect(EmojiTag.fromPlain(tag.toPlain()).emoji).toBe('🔰');
    expect(EmojiTag.fromPlain(tag.toPlain()).label).toBe('新人');

    const noLabel = new EmojiTag({ emoji: '🍳' });
    expect(noLabel.toPlain()).toEqual({ emoji: '🍳' });
  });
});

describe('EmojiTags（配列操作）', () => {
  const tags = [
    new EmojiTag({ emoji: '🔰', label: '新人' }),
    new EmojiTag({ emoji: '🍳' }),
  ];

  test('追加：同じ絵文字は重複しない', () => {
    const added = EmojiTags.add(tags, new EmojiTag({ emoji: '👑' }));
    expect(added).toHaveLength(3);
    expect(EmojiTags.add(tags, new EmojiTag({ emoji: '🔰' }))).toHaveLength(2);
  });

  test('削除', () => {
    expect(EmojiTags.remove(tags, '🔰')).toHaveLength(1);
    expect(EmojiTags.remove(tags, '🔰')[0].emoji).toBe('🍳');
  });

  test('ラベル更新', () => {
    const updated = EmojiTags.updateLabel(tags, '🔰', '見習い');
    expect(updated[0].label).toBe('見習い');
    expect(updated[1].emoji).toBe('🍳');
  });

  test('保存形の往復', () => {
    const plain = EmojiTags.toPlain(tags);
    const back = EmojiTags.fromPlain(plain);
    expect(back).toHaveLength(2);
    expect(back[0].emoji).toBe('🔰');
  });

  test('undefined/空からの復元は空配列', () => {
    expect(EmojiTags.fromPlain(undefined)).toEqual([]);
    expect(EmojiTags.fromPlain([])).toEqual([]);
  });
});

describe('Staff のタグ操作', () => {
  test('タグを追加・削除できる', () => {
    const s = new Staff({ id: 'a', name: '相田' });
    const withTag = s.addTag(new EmojiTag({ emoji: '🔰' }));
    expect(withTag.tags).toHaveLength(1);

    const removed = withTag.removeTag('🔰');
    expect(removed.tags).toHaveLength(0);
  });

  test('同じ絵文字を二度追加しても増えない', () => {
    const s = staff.addTag(new EmojiTag({ emoji: '🔰' }));
    expect(s).toBe(staff);
  });

  test('タグのない Staff は tags を保存形に書かない', () => {
    const plain = new Staff({ id: 'a', name: '相田' }).toPlain();
    expect(plain).toEqual({ id: 'a', name: '相田' });
  });

  test('タグを付けて外すと、付ける前と同じ保存形に戻る', () => {
    const plain = new Staff({ id: 'a', name: '相田' }).toPlain();
    const roundTrip = Staff.fromPlain(plain)
      .addTag(new EmojiTag({ emoji: '🔰' }))
      .removeTag('🔰');
    expect(roundTrip.toPlain()).toEqual(plain);
  });

  test('保存形を通って戻る', () => {
    const back = Staff.fromPlain(staff.toPlain());
    expect(back.tags).toHaveLength(2);
    expect(back.tags[0].emoji).toBe('🔰');
    expect(back.tags[0].label).toBe('新人');
  });
});

describe('保存形の後方互換（タグ以前の記録）', () => {
  test('タグのない Staff・メンバーの保存形は以前と同じ', () => {
    const oldStaffPlain = { id: 'a', name: '相田', department: 'フロント' };
    expect(Staff.fromPlain(oldStaffPlain).toPlain()).toEqual(oldStaffPlain);

    const oldMemberPlain = { staffId: 'a', allowedShiftIds: ['early'] };
    expect(WorkingStaffMember.fromPlain(oldMemberPlain).toPlain()).toEqual(oldMemberPlain);
  });
});
