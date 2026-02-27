import { Member } from './Member.js';

describe('Member', () => {
  const createTestMember = () =>
    Member.create({
      name: '田中花子',
      eventId: 'event-1',
      tags: ['実行委員', '広報部'],
      skills: ['audio', 'english'],
      availableSlotIds: ['slot-1', 'slot-2'],
      memo: 'リーダー経験あり',
    });

  test('メンバーを作成できる', () => {
    const member = createTestMember();
    expect(member.name).toBe('田中花子');
    expect(member.tags).toEqual(['実行委員', '広報部']);
    expect(member.skills).toEqual(['audio', 'english']);
    expect(member.memo).toBe('リーダー経験あり');
  });

  test('スキルを持っているかチェックできる', () => {
    const member = createTestMember();
    expect(member.hasSkill('audio')).toBe(true);
    expect(member.hasSkill('zoom')).toBe(false);
  });

  test('全スキルを持っているかチェックできる', () => {
    const member = createTestMember();
    expect(member.hasAllSkills(['audio', 'english'])).toBe(true);
    expect(member.hasAllSkills(['audio', 'zoom'])).toBe(false);
  });

  test('時間帯に参加可能かチェックできる', () => {
    const member = createTestMember();
    expect(member.isAvailableAt('slot-1')).toBe(true);
    expect(member.isAvailableAt('slot-3')).toBe(false);
  });

  test('スキルを追加できる（不変性）', () => {
    const member = createTestMember();
    const updated = member.addSkill('zoom');
    expect(updated.hasSkill('zoom')).toBe(true);
    expect(member.hasSkill('zoom')).toBe(false); // 元のインスタンスは変わらない
  });

  test('重複スキルの追加は無視される', () => {
    const member = createTestMember();
    const updated = member.addSkill('audio');
    expect(updated.skills.length).toBe(member.skills.length);
  });

  test('スキルを削除できる', () => {
    const member = createTestMember();
    const updated = member.removeSkill('audio');
    expect(updated.hasSkill('audio')).toBe(false);
    expect(updated.hasSkill('english')).toBe(true);
  });

  test('タグを追加できる', () => {
    const member = createTestMember();
    const updated = member.addTag('警備部');
    expect(updated.hasTag('警備部')).toBe(true);
    expect(member.hasTag('警備部')).toBe(false);
  });

  test('タグを削除できる', () => {
    const member = createTestMember();
    const updated = member.removeTag('広報部');
    expect(updated.hasTag('広報部')).toBe(false);
    expect(updated.hasTag('実行委員')).toBe(true);
  });

  test('JSON変換できる', () => {
    const member = createTestMember();
    const json = member.toJSON();
    const restored = Member.fromJSON(json);
    expect(restored.name).toBe(member.name);
    expect(restored.skills).toEqual(member.skills);
  });
});
