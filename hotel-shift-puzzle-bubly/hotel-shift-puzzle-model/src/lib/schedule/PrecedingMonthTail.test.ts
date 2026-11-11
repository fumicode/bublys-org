import { MonthlyStaffSchedule } from './MonthlyStaffSchedule.js';
import { WorkingDay } from './WorkingDay.js';
import {
  PrecedingMonthTail,
  precedingTailLengthFor,
  PRECEDING_TAIL_MIN_DAYS,
} from './PrecedingMonthTail.js';

describe('PrecedingMonthTail（前月の末尾）の使い方', () => {
  /** 前月＝2026年5月（31日まで）。今月＝6月 */
  const may = (d: number) => WorkingDay.of(2026, 5, d);
  const SHIFT_NAMES: Record<string, string> = { e1: '早番', l1: '遅番' };

  const maySchedule = () =>
    MonthlyStaffSchedule.create({ id: 'may', storeId: 'store-1', year: 2026, month: 5 })
      .assignShift('A', may(29), 'e1')
      .assignShift('A', may(30), 'e1')
      .assignShift('A', may(31), 'l1')
      .assignDayOff('B', may(31))
      .markUndecided('C', may(31))
      // 末尾より前の日は写さない
      .assignShift('A', may(1), 'e1');

  const capture = (length = 7) =>
    PrecedingMonthTail.capture({
      source: { scheduleId: 'may', worldLineNodeId: 'node-1' },
      stars: [],
      confirmedAt: 1000,
      schedule: maySchedule(),
      shiftNameOf: (id) => SHIFT_NAMES[id],
      length,
    });

  test('前月の末尾 length 日を、勤務帯の名前で写し取る', () => {
    const tail = capture(3);

    expect(tail.days.map((d) => d.key)).toEqual(['2026-05-29', '2026-05-30', '2026-05-31']);
    expect(tail.shiftNameOn('A', may(31))).toBe('遅番');
    expect(tail.isWorking('A', may(29))).toBe(true);
    expect(tail.cellOf('B', may(31))?.value).toEqual({ kind: 'day-off' });
    // 未定は持たない（＝出勤していない扱い）
    expect(tail.cellOf('C', may(31))).toBeUndefined();
    expect(tail.cellOf('A', may(1))).toBeUndefined();
  });

  test('人は staffId で引く。前月に居なかった人は何も持ち越さない', () => {
    const tail = capture();

    expect(tail.trailingWorkdays('A')).toBe(3);
    expect(tail.trailingWorkdays('B')).toBe(0);
    expect(tail.trailingWorkdays('新人')).toBe(0);
  });

  test('定義から消えた勤務帯でも、出勤だった事実は落とさない（IDを名前として残す）', () => {
    const tail = PrecedingMonthTail.capture({
      source: { scheduleId: 'r', worldLineNodeId: '' },
      stars: [],
      schedule: maySchedule(),
      shiftNameOf: () => undefined,
      length: 1,
    });

    expect(tail.isWorking('A', may(31))).toBe(true);
    expect(tail.shiftNameOn('A', may(31))).toBe('l1');
  });

  test('直前の月末で終わっていれば、その月につながる（1月の前月は前年12月）', () => {
    expect(capture().directlyPrecedes(2026, 6)).toBe(true);
    expect(capture().directlyPrecedes(2026, 7)).toBe(false);

    const dec = MonthlyStaffSchedule.create({ id: 'dec', storeId: 's', year: 2025, month: 12 });
    const decTail = PrecedingMonthTail.capture({
      source: { scheduleId: 'r', worldLineNodeId: '' },
      stars: [],
      schedule: dec,
      shiftNameOf: () => undefined,
      length: 7,
    });
    expect(decTail.directlyPrecedes(2026, 1)).toBe(true);
  });

  test('★も一緒に写し取る。写した後に元を変えても、写しは変わらない', () => {
    const scores = [{ staffId: 'A', compromiseCount: 2, busyDayCount: 1, score: 5 }];
    const tail = PrecedingMonthTail.capture({
      source: { scheduleId: 'may', worldLineNodeId: 'node-1' },
      schedule: maySchedule(),
      shiftNameOf: (id) => SHIFT_NAMES[id],
      length: 7,
      stars: scores,
    });
    scores[0].score = 99;

    expect(tail.starsOf('A')).toBe(5);
    expect(tail.starsOf('新人')).toBe(0);
    const back = PrecedingMonthTail.fromPlain(JSON.parse(JSON.stringify(tail.toPlain())));
    expect(back.stars).toEqual([
      { staffId: 'A', compromiseCount: 2, busyDayCount: 1, score: 5 },
    ]);
  });

  test('#231 より前の形（sourceReportId・★なし）も読める', () => {
    const legacy = {
      sourceReportId: 'may:node-1',
      days: [{ year: 2026, month: 5, day: 31 }],
      cells: [{ staffId: 'A', day: { year: 2026, month: 5, day: 31 }, value: { kind: 'day-off' } }],
    };
    const tail = PrecedingMonthTail.fromPlain(legacy as never);

    expect(tail.source).toEqual({ scheduleId: 'may', worldLineNodeId: 'node-1' });
    // ★を写す前の形は「0点ばかり」と区別する
    expect(tail.stars).toBeUndefined();
    expect(tail.starsOf('A')).toBe(0);
    expect(tail.toPlain()).not.toHaveProperty('sourceReportId');
  });

  test('★を「貢献度スコア」と呼んでいた頃の保存形（contributionScores）も読める', () => {
    const { stars, ...rest } = PrecedingMonthTail.capture({
      source: { scheduleId: 'may', worldLineNodeId: 'node-1' },
      schedule: maySchedule(),
      shiftNameOf: (id) => SHIFT_NAMES[id],
      length: 7,
      stars: [{ staffId: 'A', compromiseCount: 1, busyDayCount: 0, score: 2 }],
    }).toPlain();
    const restored = PrecedingMonthTail.fromPlain({ ...rest, contributionScores: stars });
    expect(restored.starsOf('A')).toBe(2);
    expect(restored.toPlain()).not.toHaveProperty('contributionScores');
  });

  test('写し取る日数は1週間か連勤上限の長い方', () => {
    expect(precedingTailLengthFor(5)).toBe(PRECEDING_TAIL_MIN_DAYS);
    expect(precedingTailLengthFor(10)).toBe(10);
  });

  test('toPlain / fromPlain で往復できる', () => {
    const tail = capture();
    const back = PrecedingMonthTail.fromPlain(JSON.parse(JSON.stringify(tail.toPlain())));

    expect(back.toPlain()).toEqual(tail.toPlain());
    expect(back.signature).toBe(tail.signature);
    expect(back.confirmedAt).toBe(1000);
  });

  describe('勤務表へのつなぎ', () => {
    const june = () =>
      MonthlyStaffSchedule.create({ id: 'june', storeId: 'store-1', year: 2026, month: 6 });

    test('つないだ末尾は勤務表と一緒に保存され、外せる', () => {
      const linked = june().withPrecedingTail(capture());
      const back = MonthlyStaffSchedule.fromPlain(JSON.parse(JSON.stringify(linked.toPlain())));

      expect(back.precedingTail?.source).toEqual({ scheduleId: 'may', worldLineNodeId: 'node-1' });
      expect(back.withPrecedingTail(undefined).precedingTail).toBeUndefined();
    });

    test('つないでいない勤務表の保存形にはキーが無い（既存の世界の内容ハッシュを変えない）', () => {
      expect('precedingTail' in june().toPlain()).toBe(false);
      expect('precedingTail' in june().withPrecedingTail(capture()).withPrecedingTail(undefined).toPlain()).toBe(false);
    });

    test('直前の月末で終わっていない末尾はつなげない', () => {
      const july = MonthlyStaffSchedule.create({ id: 'jul', storeId: 's', year: 2026, month: 7 });
      expect(() => july.withPrecedingTail(capture())).toThrow();
    });

    test('前の月（1月なら前年12月）', () => {
      expect(june().previousYearMonth()).toEqual({ year: 2026, month: 5 });
      const jan = MonthlyStaffSchedule.create({ id: 'j', storeId: 's', year: 2026, month: 1 });
      expect(jan.previousYearMonth()).toEqual({ year: 2025, month: 12 });
    });
  });
});
