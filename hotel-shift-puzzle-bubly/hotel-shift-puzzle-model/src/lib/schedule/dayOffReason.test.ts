import { MonthlyStaffSchedule } from './MonthlyStaffSchedule.js';
import { WorkingDay } from './WorkingDay.js';
import { PrecedingMonthTail } from './PrecedingMonthTail.js';
import { DayOffStyle } from '../staff/DayOffStyle.js';
import { dayOffReasonOf, dayOffReasonText } from './dayOffReason.js';
import type { DecodedWish } from './autoShiftStep.js';

describe('dayOffReasonOf（その休みの役目を、いまの表から読み解く）', () => {
  const day = (d: number) => WorkingDay.of(2026, 6, d);
  const neutral: DecodedWish = { kind: 'neutral' };

  /** 指定の日を休みにし、他の日は早番で埋めた6月 */
  const scheduleWithOffs = (offs: number[]) => {
    let s = MonthlyStaffSchedule.create({ id: 's', storeId: 'store-1', year: 2026, month: 6 });
    for (let d = 1; d <= 30; d++) {
      s = offs.includes(d) ? s.assignDayOff('A', day(d)) : s.assignShift('A', day(d), 'early');
    }
    return s;
  };

  const reasonOf = (
    schedule: MonthlyStaffSchedule,
    d: number,
    opts: {
      wish?: DecodedWish;
      wishes?: Record<number, DecodedWish>;
      style?: DayOffStyle;
      minDayOff?: number;
      maxDayOffPerDay?: number;
    } = {}
  ) =>
    dayOffReasonOf({
      schedule,
      staffId: 'A',
      day: day(d),
      wishOf: (x) =>
        (x.day === d ? opts.wish : undefined) ?? opts.wishes?.[x.day] ?? neutral,
      style: opts.style ?? DayOffStyle.spread(),
      maxConsecutiveWorkdays: 5,
      minDayOff: opts.minDayOff,
      maxDayOffPerDay: opts.maxDayOffPerDay,
    });

  test('休みでない日には役目が無い', () => {
    expect(reasonOf(scheduleWithOffs([5]), 4)).toBeUndefined();
  });

  test('休みの希望があれば「希望の休み」', () => {
    expect(reasonOf(scheduleWithOffs([5]), 5, { wish: { kind: 'day-off' } })).toEqual({
      kind: 'wish',
    });
  });

  test('外すと連勤上限を超えるなら、上限を守っている休み', () => {
    // 4日働いて休み、また3日働く → 外すと 4+1+3 = 8連勤
    expect(reasonOf(scheduleWithOffs([5, 9, 15, 20, 25, 30]), 5)).toEqual({
      kind: 'keeps-run-limit',
      runIfRemoved: 8,
      limit: 5,
      personal: false,
    });
  });

  test('連休型で、外すとその人の目標を超えるなら、目標を守っている休み', () => {
    // 2日働いて休み、また1日働く → 外すと4連勤。上限(5)は超えないが、3連までの人には超える
    const s = scheduleWithOffs([3, 5, 9, 13, 17, 21, 25, 29]);
    expect(reasonOf(s, 3, { style: DayOffStyle.clustered(3) })).toMatchObject({
      kind: 'keeps-run-limit',
      runIfRemoved: 4,
      limit: 3,
      personal: true,
    });
  });

  test('連休型で隣も休みなら「連休」。分散型なら連休とは言わない', () => {
    const s = scheduleWithOffs([1, 2, 6, 7, 11, 12, 16, 17, 21, 22, 26, 27]);
    expect(reasonOf(s, 7, { style: DayOffStyle.clustered(5) })).toEqual({
      kind: 'pair',
      acrossMonth: false,
    });
    expect(reasonOf(s, 7)).toEqual({ kind: 'between', before: 0, after: 3 });
  });

  test('前月末日の休みと続いていれば「前月末から続く連休」', () => {
    let may = MonthlyStaffSchedule.create({ id: 'may', storeId: 'store-1', year: 2026, month: 5 });
    may = may.assignDayOff('A', WorkingDay.of(2026, 5, 31));
    const tail = PrecedingMonthTail.capture({
      sourceReportId: 'may:n',
      schedule: may,
      shiftNameOf: () => '早番',
      length: 7,
    });
    const s = scheduleWithOffs([1, 5, 9, 13, 17, 21, 25, 29]).withPrecedingTail(tail);
    expect(reasonOf(s, 1, { style: DayOffStyle.clustered() })).toEqual({
      kind: 'pair',
      acrossMonth: true,
    });
  });

  test('月初の休みの手前には、前月末からの出勤を数える', () => {
    let may = MonthlyStaffSchedule.create({ id: 'may', storeId: 'store-1', year: 2026, month: 5 });
    for (let d = 28; d <= 31; d++) may = may.assignShift('A', WorkingDay.of(2026, 5, d), 'early');
    const tail = PrecedingMonthTail.capture({
      sourceReportId: 'may:n',
      schedule: may,
      shiftNameOf: () => '早番',
      length: 7,
    });
    // 前月末に4連勤 → 今月1日を休みにしないと、2日まで働けば6連勤
    const s = scheduleWithOffs([2, 6, 10, 14, 18, 22, 26, 30]).withPrecedingTail(tail);
    expect(reasonOf(s, 2)).toEqual({
      kind: 'keeps-run-limit',
      runIfRemoved: 4 + 1 + 1 + 3,
      limit: 5,
      personal: false,
    });
  });

  test('それ以外は、前後の出勤の塊の間の休み', () => {
    // 2日働いて休み、また2日働く → 外しても5連勤で上限内
    expect(reasonOf(scheduleWithOffs([3, 6, 9, 12, 15, 18, 21, 24, 27, 30]), 6)).toEqual({
      kind: 'between',
      before: 2,
      after: 2,
    });
  });

  test('説明文には休みの形の名前を添える', () => {
    expect(
      dayOffReasonText(
        { kind: 'keeps-run-limit', runIfRemoved: 6, limit: 4, personal: true },
        DayOffStyle.clustered(4)
      )
    ).toBe('休み：外すと6連勤になります（この人は4連まで）（連休型（4連まで））');
    expect(dayOffReasonText({ kind: 'between', before: 3, after: 2 }, DayOffStyle.spread())).toBe(
      '休み：3日と2日の出勤の間の休み（分散型）'
    );
  });

  describe('連休型の単発の休みには、連休にできなかった理由を添える', () => {
    const clustered = DayOffStyle.clustered(5);
    /** 比べやすいように、隣の日を日付キーに畳む */
    const blocksOf = (r: ReturnType<typeof reasonOf>) =>
      r?.unpaired?.kind === 'neighbors'
        ? r.unpaired.neighbors.map((n) => [n.day.day, n.why])
        : r?.unpaired;

    test('隣の日がどちらも出勤なら、その事情を日ごとに', () => {
      // 他の日はすべて早番で埋まっている＝両隣は出勤
      const s = scheduleWithOffs([5, 11, 17, 23, 29]);
      expect(blocksOf(reasonOf(s, 11, { style: clustered }))).toEqual([
        [10, 'work'],
        [12, 'work'],
      ]);
    });

    test('出勤の希望・1日の休み上限を見分ける', () => {
      // 10日が休み。9日は未定だが別の人(B)が休んでいて上限1人、11日は未定で出勤の希望
      let s = scheduleWithOffs([10, 16, 22, 28])
        .setCell('A', day(9), { kind: 'undecided' })
        .setCell('A', day(11), { kind: 'undecided' })
        .assignDayOff('B', day(9));
      expect(
        blocksOf(
          reasonOf(s, 10, {
            style: clustered,
            maxDayOffPerDay: 1,
            wishes: { 11: { kind: 'work', shiftId: 'early' } },
          })
        )
      ).toEqual([
        [9, 'day-cap'],
        [11, 'work-wish'],
      ]);
      // 11日の先（12日）も休みなら、11日に休むと3連休になる
      s = s.assignDayOff('A', day(12));
      expect(blocksOf(reasonOf(s, 10, { style: clustered, maxDayOffPerDay: 1 }))).toEqual([
        [9, 'day-cap'],
        [11, 'triple'],
      ]);
    });

    test('隣が空いているのに単発なら、月の休みを区切りに使い切った', () => {
      let s = MonthlyStaffSchedule.create({ id: 's', storeId: 'store-1', year: 2026, month: 6 });
      for (const d of [6, 12, 18, 24, 30, 1, 2, 3]) s = s.assignDayOff('A', day(d));
      expect(reasonOf(s, 12, { style: clustered, minDayOff: 8 })?.unpaired).toEqual({
        kind: 'out-of-days',
        minDayOff: 8,
      });
    });

    test('連休になっていれば理由は付けない。分散型にも付けない', () => {
      const s = scheduleWithOffs([5, 6, 11, 17, 23, 29]);
      expect(reasonOf(s, 6, { style: clustered })?.unpaired).toBeUndefined();
      expect(reasonOf(s, 11)?.unpaired).toBeUndefined();
    });

    test('説明の2行目に出す', () => {
      expect(
        dayOffReasonText(
          {
            kind: 'between',
            before: 3,
            after: 3,
            unpaired: {
              kind: 'neighbors',
              neighbors: [
                { day: day(10), why: 'work-wish' },
                { day: day(12), why: 'day-cap' },
              ],
            },
          },
          clustered,
          { maxDayOffPerDay: 3 }
        )
      ).toBe(
        '休み：3日と3日の出勤の間の休み（連休型（5連まで））\n連休にできなかった：6/10は出勤の希望・6/12は休みが1日の上限（3人）'
      );
    });
  });
});
