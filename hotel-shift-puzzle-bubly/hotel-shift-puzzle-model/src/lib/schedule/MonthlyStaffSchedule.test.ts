import { MonthlyStaffSchedule } from './MonthlyStaffSchedule.js';
import { WorkingDay } from './WorkingDay.js';
import { WorkShift, createDefaultWorkShifts } from './WorkShift.js';
import { ShiftAssignment, DAY_OFF } from './ShiftAssignment.js';

describe('MonthlyStaffSchedule（月間スタッフ勤務表）の使い方', () => {
  // 店舗 store-1 の 2026年6月の勤務表を、早番・中番・遅番つきで用意する
  const createJuneSchedule = () =>
    MonthlyStaffSchedule.create({
      id: 'sched-1',
      storeId: 'store-1',
      year: 2026,
      month: 6,
      workShifts: createDefaultWorkShifts(),
    });

  const june1 = WorkingDay.of(2026, 6, 1);

  test('勤務帯（早番・中番・遅番）を持つ', () => {
    const schedule = createJuneSchedule();
    expect(schedule.workShifts.map((s) => s.name)).toEqual(['早番', '中番', '遅番']);

    const early = schedule.getWorkShift('early');
    expect(early?.name).toBe('早番');
    expect(early?.startMinute).toBe(420);
    expect(early?.startTimeLabel).toBe('7:00');

    expect(schedule.getWorkShift('late')?.startTimeLabel).toBe('13:00');
  });

  test('6/1 に Aさん=早番、Bさん=休み、Cさん=遅番 を割り当てる', () => {
    const schedule = createJuneSchedule()
      .assignShift('staff-A', june1, 'early')
      .assignDayOff('staff-B', june1)
      .assignShift('staff-C', june1, 'late');

    // Aさんは早番（7:00 から）
    const aShift = schedule.getWorkShiftFor('staff-A', june1);
    expect(aShift).toBeInstanceOf(WorkShift);
    expect(aShift?.name).toBe('早番');
    expect(aShift?.startTimeLabel).toBe('7:00');
    expect(schedule.isWorking('staff-A', june1)).toBe(true);

    // Bさんは休み（DAY_OFF）
    expect(schedule.isDayOff('staff-B', june1)).toBe(true);
    expect(schedule.isWorking('staff-B', june1)).toBe(false);
    expect(schedule.getWorkShiftFor('staff-B', june1)).toBeUndefined();
    expect(schedule.getAssignment('staff-B', june1)?.shift).toBe(DAY_OFF);

    // Cさんは遅番（13:00 から）
    expect(schedule.getWorkShiftFor('staff-C', june1)?.name).toBe('遅番');
    expect(schedule.getWorkShiftFor('staff-C', june1)?.startTimeLabel).toBe('13:00');
  });

  test('statusOf でセルの状態（出勤／休み／未定）を判別できる', () => {
    const schedule = createJuneSchedule()
      .assignShift('staff-A', june1, 'early')
      .assignDayOff('staff-B', june1)
      .markUndecided('staff-C', june1);

    const a = schedule.statusOf('staff-A', june1);
    expect(a.kind).toBe('work');
    expect(a.kind === 'work' && a.shift.name).toBe('早番');

    expect(schedule.statusOf('staff-B', june1)).toEqual({ kind: 'day-off' });
    expect(schedule.statusOf('staff-C', june1)).toEqual({ kind: 'undecided' });
  });

  test('null（未定）は休みとは区別される', () => {
    const schedule = createJuneSchedule()
      .assignDayOff('staff-B', june1)
      .markUndecided('staff-C', june1);

    // 休み: isDayOff=true / isUndecided=false
    expect(schedule.isDayOff('staff-B', june1)).toBe(true);
    expect(schedule.isUndecided('staff-B', june1)).toBe(false);

    // 未定（null）: isUndecided=true / isDayOff=false
    expect(schedule.getAssignment('staff-C', june1)?.shift).toBeNull();
    expect(schedule.isUndecided('staff-C', june1)).toBe(true);
    expect(schedule.isDayOff('staff-C', june1)).toBe(false);
  });

  test('割当レコードが無いセルも未定として扱う', () => {
    const schedule = createJuneSchedule();
    expect(schedule.getAssignment('staff-A', june1)).toBeUndefined();
    expect(schedule.isUndecided('staff-A', june1)).toBe(true);
    expect(schedule.isWorking('staff-A', june1)).toBe(false);
    expect(schedule.isDayOff('staff-A', june1)).toBe(false);
    expect(schedule.statusOf('staff-A', june1)).toEqual({ kind: 'undecided' });
  });

  test('同じスタッフ・同じ日に割り当て直すと上書きされる', () => {
    const schedule = createJuneSchedule()
      .assignShift('staff-A', june1, 'early')
      .assignShift('staff-A', june1, 'late');

    expect(schedule.getWorkShiftFor('staff-A', june1)?.name).toBe('遅番');
    // 割当は1件のまま（重複しない）
    expect(schedule.assignmentsForStaff('staff-A')).toHaveLength(1);
  });

  test('出勤→休みへ上書きもできる', () => {
    const schedule = createJuneSchedule()
      .assignShift('staff-A', june1, 'early')
      .assignDayOff('staff-A', june1);

    expect(schedule.isWorking('staff-A', june1)).toBe(false);
    expect(schedule.isDayOff('staff-A', june1)).toBe(true);
    expect(schedule.assignmentsForStaff('staff-A')).toHaveLength(1);
  });

  test('未知の勤務帯を割り当てようとするとエラー', () => {
    const schedule = createJuneSchedule();
    expect(() => schedule.assignShift('staff-A', june1, 'unknown')).toThrow();
  });

  test('割当を取り消すと未定に戻る', () => {
    const schedule = createJuneSchedule()
      .assignShift('staff-A', june1, 'early')
      .clearAssignment('staff-A', june1);

    expect(schedule.isUndecided('staff-A', june1)).toBe(true);
    expect(schedule.getAssignment('staff-A', june1)).toBeUndefined();
  });

  test('不変性：割り当てても元のインスタンスは変わらない', () => {
    const base = createJuneSchedule();
    const updated = base.assignShift('staff-A', june1, 'early');

    expect(base.isUndecided('staff-A', june1)).toBe(true); // 元は未定のまま
    expect(updated.isWorking('staff-A', june1)).toBe(true);
    expect(updated).not.toBe(base);
  });

  test('その日の全割当を取得できる', () => {
    const schedule = createJuneSchedule()
      .assignShift('staff-A', june1, 'early')
      .assignDayOff('staff-B', june1)
      .assignShift('staff-C', june1, 'late')
      // 別の日の割当はその日には含まれない
      .assignShift('staff-A', WorkingDay.of(2026, 6, 2), 'middle');

    const on1 = schedule.assignmentsOn(june1);
    expect(on1.map((a) => a.staffId).sort()).toEqual(['staff-A', 'staff-B', 'staff-C']);
  });

  test('6月の稼働日は30日ある', () => {
    const days = createJuneSchedule().workingDays();
    expect(days).toHaveLength(30);
    expect(days[0].label).toBe('6/1');
    expect(days[29].label).toBe('6/30');
  });

  test('state は plain ではなくインスタンスを保持する', () => {
    const schedule = createJuneSchedule().assignShift('staff-A', june1, 'early');

    // 勤務帯はインスタンス
    expect(schedule.state.workShifts[0]).toBeInstanceOf(WorkShift);
    // 割当はインスタンスで、入れ子の稼働日も WorkingDay インスタンス
    const assignment = schedule.state.assignments[0];
    expect(assignment).toBeInstanceOf(ShiftAssignment);
    expect(assignment.day).toBeInstanceOf(WorkingDay);
  });

  test('toPlain / fromPlain で入れ子まで plain ↔ インスタンスを往復できる', () => {
    const original = createJuneSchedule()
      .assignShift('staff-A', june1, 'early')
      .assignDayOff('staff-B', june1)
      .markUndecided('staff-C', june1);

    const plain = original.toPlain();

    // plain は入れ子まで素のオブジェクト（インスタンスでない）
    expect(plain.workShifts[0]).not.toBeInstanceOf(WorkShift);
    expect(plain.assignments[0].day).toEqual({ year: 2026, month: 6, day: 1 });
    // JSON シリアライズ可能であること
    expect(() => JSON.stringify(plain)).not.toThrow();

    // 往復後も内容が保たれる
    const restored = MonthlyStaffSchedule.fromPlain(plain);
    expect(restored.getWorkShiftFor('staff-A', june1)?.name).toBe('早番');
    expect(restored.isDayOff('staff-B', june1)).toBe(true);
    expect(restored.isUndecided('staff-C', june1)).toBe(true);
    expect(restored.state.assignments[0]).toBeInstanceOf(ShiftAssignment);
    expect(restored.toPlain()).toEqual(plain);
  });
});
