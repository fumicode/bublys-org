import { StaffMonthlyShiftWish, WorkingDay } from '@bublys-org/hotel-shift-puzzle-model';
import { decodeWishForStaff } from './autoShift.js';
import { DAY_OFF_WISH, toggleWishInput, workWishKey } from '../ui/shiftWishOptions.js';

describe('decodeWishForStaff（×で候補を絞る）', () => {
  const d1 = WorkingDay.of(2026, 6, 1);
  const shiftIdByName = new Map([
    ['早番', 'early'],
    ['中番', 'middle'],
    ['遅番', 'late'],
  ]);
  const empty = () =>
    StaffMonthlyShiftWish.create({ staffId: 'staff-A', year: 2026, month: 6 });
  const OPTION_KEYS = [
    DAY_OFF_WISH,
    workWishKey('早番'),
    workWishKey('中番'),
    workWishKey('遅番'),
  ];
  const click = (w: StaffMonthlyShiftWish, key: string) =>
    toggleWishInput(w, d1, key, OPTION_KEYS);
  const decode = (wish: StaffMonthlyShiftWish | undefined) =>
    decodeWishForStaff(wish, d1, shiftIdByName);

  test('希望が無ければ neutral（希望の無い人として需要充足に使える）', () => {
    expect(decode(undefined)).toEqual({ kind: 'neutral' });
    expect(decode(empty())).toEqual({ kind: 'neutral' });
  });

  test('休 は day-off', () => {
    expect(decode(click(empty(), DAY_OFF_WISH))).toEqual({ kind: 'day-off' });
  });

  test('× で残りが1帯だけなら、その帯に決まる', () => {
    const w = click(click(empty(), workWishKey('中番')), workWishKey('遅番'));
    expect(decode(w)).toEqual({ kind: 'work', shiftId: 'early' });
  });

  test('× が1つだけ（残り2帯）なら neutral。どの帯かは需要充足に委ねる', () => {
    const w = click(empty(), workWishKey('早番'));
    expect(decode(w)).toEqual({ kind: 'neutral' });
  });

  test('× で全帯が消えたら day-off（入れる帯が無い＝休みたい）', () => {
    // 入力表は全帯×を休みへ畳むので、実際にはこの形（×のまま）は残らない。
    // 取り込んだ古いデータなどで残っていても、同じ結論になることを確かめる。
    const w = ['早番', '中番', '遅番'].reduce(
      (acc, name) => acc.setPreference(d1, workWishKey(name), 'avoid'),
      empty()
    );
    expect(decode(w)).toEqual({ kind: 'day-off' });
  });

  test('入力表で全帯に×を付けた日は、休みとして読まれる', () => {
    const w = ['早番', '中番', '遅番'].reduce(
      (acc, name) => click(acc, workWishKey(name)),
      empty()
    );
    expect(decode(w)).toEqual({ kind: 'day-off' });
  });

  test('出勤したい（休みに×）は neutral。帯を選ばないので需要充足に任せる', () => {
    const w = empty().setPreference(d1, DAY_OFF_WISH, 'avoid');
    expect(decode(w)).toEqual({ kind: 'neutral' });
  });

  test('旧データの「勤務帯○」は、その帯を希望していると読む', () => {
    const w = empty().setPreference(d1, workWishKey('遅番'), 'want');
    expect(decode(w)).toEqual({ kind: 'work', shiftId: 'late' });
  });

  test('この勤務表に無い帯の希望は決め手にならない（ambiguous）', () => {
    const w = empty().setPreference(d1, workWishKey('夜勤'), 'want');
    expect(decode(w)).toEqual({ kind: 'ambiguous' });
  });
});
