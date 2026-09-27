/**
 * **局員** ── 名前と所属と、いつ出られるか（可用性）を持つ。
 *
 * ★ このテストは**書き直した**。前のものは作り直される前のモデル（`tags` / `skills` /
 *   `availableSlotIds` を持つ「メンバー」）を見ていて、10 件とも落ちていた
 *   ── 見ている相手が居ないので、何も守っていなかった。
 *
 * ここで押さえるのは 3 つ:
 *   1. **空は「いつでも出られる」** ── 可用性を書いていない日は、出られないのではなく
 *      「まだ答えていない」。埋めた日だけが縛りになる
 *   2. **シフトは端から端まで見る**（15 分刻み）── 途中が 1 コマでも空いていなければ入れない
 *   3. **変えると新しい局員が返る** ── 元は 1 文字も変わらない
 */
import { Member } from './Member.js';

const 局員 = () => Member.create('田中花子', '広報局', false);

/** 9:00–12:00 を分で。15 分刻みの絶対分 */
const 朝 = { startMinute: 9 * 60, endMinute: 12 * 60 };

describe('Member', () => {
  test('作ると、名前・所属・新入生かどうかを持つ', () => {
    const m = 局員();
    expect(m.name).toBe('田中花子');
    expect(m.department).toBe('広報局');
    expect(m.isNewMember).toBe(false);
    expect(m.id).not.toBe('');
    expect(m.availability).toEqual({});
  });

  describe('可用性を書いていない日', () => {
    test('いつでも出られるとみなす', () => {
      const m = 局員();
      expect(m.getAvailableRanges('土')).toEqual([]);
      expect(m.isAvailableAt('土', 3 * 60)).toBe(true);
      expect(m.isAvailableForShift({ dayType: '土', ...朝 })).toBe(true);
    });
  });

  describe('可用性を書いた日', () => {
    const m = () => 局員().withAvailability({ 土: [朝] });

    test('その中なら出られる（始まりは含み、終わりは含まない）', () => {
      expect(m().isAvailableAt('土', 9 * 60)).toBe(true);
      expect(m().isAvailableAt('土', 11 * 60 + 59)).toBe(true);
      expect(m().isAvailableAt('土', 12 * 60)).toBe(false);
      expect(m().isAvailableAt('土', 8 * 60 + 59)).toBe(false);
    });

    test('書いた日だけが縛りになる（別の日はそのまま「いつでも」）', () => {
      expect(m().isAvailableAt('日', 3 * 60)).toBe(true);
    });

    test('シフトは端から端まで入っていなければ駄目', () => {
      const s = (a: number, b: number) => ({ dayType: '土', startMinute: a, endMinute: b });
      expect(m().isAvailableForShift(s(9 * 60, 12 * 60))).toBe(true);       // ちょうど
      expect(m().isAvailableForShift(s(10 * 60, 11 * 60))).toBe(true);      // 中に収まる
      expect(m().isAvailableForShift(s(11 * 60, 13 * 60))).toBe(false);     // 後ろがはみ出す
      expect(m().isAvailableForShift(s(8 * 60, 10 * 60))).toBe(false);      // 前がはみ出す
    });

    /**
     * ★ **隙間は 15 分刻みで見つかる。** 見るのは始まりから 15 分ずつなので、
     *   刻みに乗らない隙間（例：9:50–10:00）は**見落とす**。
     *   これは「15 分刻みを想定」という取り決めの裏返しで、
     *   刻みに乗った隙間はちゃんと見つかることをここで押さえておく。
     */
    test('途中に隙間があれば駄目（刻みに乗った隙間）', () => {
      const 昼休みあり = 局員().withAvailability({
        土: [
          { startMinute: 9 * 60, endMinute: 10 * 60 },
          { startMinute: 10 * 60 + 15, endMinute: 12 * 60 },
        ],
      });
      expect(昼休みあり.isAvailableForShift({ dayType: '土', ...朝 })).toBe(false);
      expect(
        昼休みあり.isAvailableForShift({ dayType: '土', startMinute: 10 * 60 + 15, endMinute: 12 * 60 }),
      ).toBe(true);
    });
  });

  describe('変えると新しい局員が返る', () => {
    test('元は 1 文字も変わらない', () => {
      const 元 = 局員();
      const 後 = 元.withDepartment('制作局').withIsNewMember(true).withNotes('リーダー経験あり');

      expect(後).not.toBe(元);
      expect(後.department).toBe('制作局');
      expect(後.isNewMember).toBe(true);
      expect(後.notes).toBe('リーダー経験あり');

      expect(元.department).toBe('広報局');
      expect(元.isNewMember).toBe(false);
      expect(元.notes).toBeUndefined();
    });

    test('id は変わらない（同じ人のまま）', () => {
      const 元 = 局員();
      expect(元.withDepartment('制作局').id).toBe(元.id);
    });
  });
});
