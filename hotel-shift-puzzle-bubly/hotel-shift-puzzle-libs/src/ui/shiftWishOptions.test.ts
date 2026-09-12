import { StaffMonthlyShiftWish, WorkingDay } from '@bublys-org/hotel-shift-puzzle-model';
import {
  DAY_OFF_WISH,
  isBlockedByDayOff,
  isDayOffChosen,
  toggleWishInput,
  wishMarkOf,
  workWishKey,
} from './shiftWishOptions.js';

describe('シフト希望の入力ルール（休みと勤務帯の希望は排他・後勝ち）', () => {
  const d1 = WorkingDay.of(2026, 6, 1);
  const d2 = WorkingDay.of(2026, 6, 2);
  const early = workWishKey('早番');
  const middle = workWishKey('中番');
  const late = workWishKey('遅番');
  /** 入力表に並ぶ全オプション（休み + 早番・中番・遅番） */
  const OPTION_KEYS = [DAY_OFF_WISH, early, middle, late];
  /** クリック1回ぶん */
  const click = (
    w: StaffMonthlyShiftWish,
    day: WorkingDay,
    key: string
  ): StaffMonthlyShiftWish => toggleWishInput(w, day, key, OPTION_KEYS);
  const empty = () =>
    StaffMonthlyShiftWish.create({ staffId: 'staff-A', year: 2026, month: 6 });

  describe('wishMarkOf（表示する1文字）', () => {
    test('休みは「休」・勤務帯は ×（入れない）と ○（入りたい）', () => {
      expect(wishMarkOf(DAY_OFF_WISH, 'want')).toBe('休');
      expect(wishMarkOf(early, 'avoid')).toBe('×');
      expect(wishMarkOf(early, 'want')).toBe('○');
    });
  });

  describe('toggleWishInput（1クリック）', () => {
    test('休み列は 空 → 休（want）→ 空 を往復する', () => {
      const chosen = click(empty(), d1, DAY_OFF_WISH);
      expect(chosen.preferenceFor(d1, DAY_OFF_WISH)).toBe('want');

      const cleared = click(chosen, d1, DAY_OFF_WISH);
      expect(cleared.preferenceFor(d1, DAY_OFF_WISH)).toBeUndefined();
      expect(cleared.isEmptyOn(d1)).toBe(true);
    });

    test('勤務帯列は 空 → ×（avoid）→ ○（want）→ 空 と一巡する', () => {
      const avoided = click(empty(), d1, early);
      expect(avoided.preferenceFor(d1, early)).toBe('avoid');

      const wanted = click(avoided, d1, early);
      expect(wanted.preferenceFor(d1, early)).toBe('want');

      const cleared = click(wanted, d1, early);
      expect(cleared.preferenceFor(d1, early)).toBeUndefined();
      expect(cleared.isEmptyOn(d1)).toBe(true);
    });

    test('勤務帯○は同じ日に複数入れられる（どの帯でもいい＝候補が複数）', () => {
      const w = [early, early, middle, middle].reduce(
        (acc, key) => click(acc, d1, key),
        empty()
      );
      expect(w.preferenceFor(d1, early)).toBe('want');
      expect(w.preferenceFor(d1, middle)).toBe('want');
    });

    test('勤務帯×は同じ日に複数入れられる（入れない帯が複数あるだけ）', () => {
      const w = click(click(empty(), d1, early), d1, late);
      expect(w.preferenceFor(d1, early)).toBe('avoid');
      expect(w.preferenceFor(d1, late)).toBe('avoid');
    });

    test('休みを入れると、その日の勤務帯の希望（×も○も）はすべて消える（後勝ち）', () => {
      const marked = click(click(click(empty(), d1, early), d1, early), d1, late);
      expect(marked.preferenceFor(d1, early)).toBe('want');
      expect(marked.preferenceFor(d1, late)).toBe('avoid');

      const w = click(marked, d1, DAY_OFF_WISH);
      expect(w.wishesOn(d1)).toEqual({ [DAY_OFF_WISH]: 'want' });
    });

    test('休みの日に勤務帯×を入れると、休みが外れる（後勝ち）', () => {
      const dayOff = click(empty(), d1, DAY_OFF_WISH);
      const w = click(dayOff, d1, early);

      expect(w.preferenceFor(d1, DAY_OFF_WISH)).toBeUndefined();
      expect(w.preferenceFor(d1, early)).toBe('avoid');
    });

    test('排他は同じ日の中だけで効き、他の日には触らない', () => {
      const w = click(click(empty(), d2, early), d1, DAY_OFF_WISH);
      expect(w.preferenceFor(d2, early)).toBe('avoid');
      expect(w.preferenceFor(d1, DAY_OFF_WISH)).toBe('want');
    });

    test('旧データの「休み×（出勤したい）」は、1クリックで休みになる（新仕様へ寄せる）', () => {
      const legacy = empty().setPreference(d1, DAY_OFF_WISH, 'avoid');
      const w = click(legacy, d1, DAY_OFF_WISH);
      expect(w.preferenceFor(d1, DAY_OFF_WISH)).toBe('want');
    });

    test('すべての勤務帯に×を付けると、自動で休みになる（×は消える）', () => {
      const twoAvoided = click(click(empty(), d1, early), d1, middle);
      expect(twoAvoided.preferenceFor(d1, DAY_OFF_WISH)).toBeUndefined();

      // 最後の1帯に×を付けた瞬間、入れる帯が無くなる＝休みたい日になる
      const w = click(twoAvoided, d1, late);
      expect(w.wishesOn(d1)).toEqual({ [DAY_OFF_WISH]: 'want' });
      expect(isDayOffChosen(w, d1)).toBe(true);
    });

    test('自動で入った休みは、もう一度押せば外せる（普通の休みと同じ）', () => {
      const folded = [early, middle, late].reduce(
        (acc, key) => click(acc, d1, key),
        empty()
      );
      expect(click(folded, d1, DAY_OFF_WISH).isEmptyOn(d1)).toBe(true);
    });

    test('○の帯があれば、残りが全部×でも休みには畳まない（入れる帯が残っている）', () => {
      const w = [early, early, middle, late].reduce(
        (acc, key) => click(acc, d1, key),
        empty()
      );
      expect(w.wishesOn(d1)).toEqual({
        [early]: 'want',
        [middle]: 'avoid',
        [late]: 'avoid',
      });
      expect(isDayOffChosen(w, d1)).toBe(false);
    });

    test('元のインスタンスは変わらない（不変）', () => {
      const base = empty();
      click(base, d1, DAY_OFF_WISH);
      expect(base.isEmptyOn(d1)).toBe(true);
    });
  });

  describe('isDayOffChosen / isBlockedByDayOff（斜線の判定）', () => {
    test('休みの日は勤務帯セルが無効（斜線）になる', () => {
      const w = click(empty(), d1, DAY_OFF_WISH);
      expect(isDayOffChosen(w, d1)).toBe(true);
      expect(isBlockedByDayOff(w, d1, early)).toBe(true);
      // 休み列そのものは斜線にしない（押せば外せる）
      expect(isBlockedByDayOff(w, d1, DAY_OFF_WISH)).toBe(false);
    });

    test('休みでない日は無効にならない', () => {
      const w = click(empty(), d1, early);
      expect(isDayOffChosen(w, d1)).toBe(false);
      expect(isBlockedByDayOff(w, d1, late)).toBe(false);
    });
  });
});
