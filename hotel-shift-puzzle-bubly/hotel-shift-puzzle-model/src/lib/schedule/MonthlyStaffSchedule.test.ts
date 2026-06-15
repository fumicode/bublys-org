import { MonthlyStaffSchedule } from './MonthlyStaffSchedule.js';
import { WorkingDay } from './WorkingDay.js';
import { createDefaultWorkShifts } from './WorkShift.js';
import { ShiftAssignment, DAY_OFF } from './ShiftAssignment.js';

describe('MonthlyStaffSchedule（月間スタッフ勤務表）の使い方', () => {
  // この勤務表で使える勤務帯ID（WorkShift は独立集約。ここでは ID だけ参照する）
  const workShiftIds = createDefaultWorkShifts().map((s) => s.id); // ['early','middle','late']

  // 店舗 store-1 の 2026年6月の勤務表
  const createJuneSchedule = () =>
    MonthlyStaffSchedule.create({
      id: 'sched-1',
      storeId: 'store-1',
      year: 2026,
      month: 6,
      workShiftIds,
    });

  const june1 = WorkingDay.of(2026, 6, 1);

  test('使える勤務帯を ID で参照する', () => {
    const schedule = createJuneSchedule();
    expect(schedule.workShiftIds).toEqual(['early', 'middle', 'late']);
    expect(schedule.hasWorkShift('early')).toBe(true);
    expect(schedule.hasWorkShift('unknown')).toBe(false);
  });

  test('6/1 に Aさん=早番、Bさん=休み、Cさん=遅番 を割り当てる', () => {
    const schedule = createJuneSchedule()
      .assignShift('staff-A', june1, 'early')
      .assignDayOff('staff-B', june1)
      .assignShift('staff-C', june1, 'late');

    // Aさんは早番（勤務帯ID で参照）
    expect(schedule.getShiftIdFor('staff-A', june1)).toBe('early');
    expect(schedule.isWorking('staff-A', june1)).toBe(true);

    // Bさんは休み（DAY_OFF）
    expect(schedule.isDayOff('staff-B', june1)).toBe(true);
    expect(schedule.isWorking('staff-B', june1)).toBe(false);
    expect(schedule.getShiftIdFor('staff-B', june1)).toBeUndefined();
    expect(schedule.getAssignment('staff-B', june1)?.shift).toBe(DAY_OFF);

    // Cさんは遅番
    expect(schedule.getShiftIdFor('staff-C', june1)).toBe('late');
  });

  test('statusOf でセルの状態（出勤[勤務帯ID]／休み／未定）を判別できる', () => {
    const schedule = createJuneSchedule()
      .assignShift('staff-A', june1, 'early')
      .assignDayOff('staff-B', june1)
      .markUndecided('staff-C', june1);

    const a = schedule.statusOf('staff-A', june1);
    expect(a.kind).toBe('work');
    expect(a.kind === 'work' && a.shiftId).toBe('early');

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

    expect(schedule.getShiftIdFor('staff-A', june1)).toBe('late');
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

  test('setCell でセルの割当を出勤／休み／未定に切り替えられる', () => {
    const base = createJuneSchedule();

    const working = base.setCell('staff-A', june1, { kind: 'work', shiftId: 'late' });
    expect(working.getShiftIdFor('staff-A', june1)).toBe('late');

    const off = working.setCell('staff-A', june1, { kind: 'day-off' });
    expect(off.isDayOff('staff-A', june1)).toBe(true);

    const undecided = off.setCell('staff-A', june1, { kind: 'undecided' });
    expect(undecided.isUndecided('staff-A', june1)).toBe(true);

    // 不変
    expect(base.isUndecided('staff-A', june1)).toBe(true);
  });

  test('countWorkingByShift でその日の勤務帯ID別の人数を数える（休み・未定は除く）', () => {
    const schedule = createJuneSchedule()
      .assignShift('staff-A', june1, 'early')
      .assignShift('staff-B', june1, 'early')
      .assignShift('staff-C', june1, 'late')
      .assignDayOff('staff-D', june1)
      .markUndecided('staff-E', june1);

    const counts = schedule.countWorkingByShift(june1);
    expect(counts.get('early')).toBe(2);
    expect(counts.get('late')).toBe(1);
    expect(counts.get('middle')).toBeUndefined(); // 誰も入っていない
    expect(counts.has('day-off')).toBe(false); // 休み・未定は数えない
  });

  test('countDayOffOn でその日の休み人数を数える（出勤・未定は除く）', () => {
    const schedule = createJuneSchedule()
      .assignDayOff('staff-A', june1)
      .assignDayOff('staff-B', june1)
      .assignShift('staff-C', june1, 'early')
      .markUndecided('staff-D', june1);

    expect(schedule.countDayOffOn(june1)).toBe(2);
  });

  test('必要スタッフ数を稼働日×勤務帯名で持てる（requiredFor / setRequired）', () => {
    const base = createJuneSchedule();
    // 既定は未設定（0）
    expect(base.requiredFor(june1, '早番')).toBe(0);

    const updated = base.setRequired(june1, '早番', 2);
    expect(updated.requiredFor(june1, '早番')).toBe(2);
    // 不変
    expect(base.requiredFor(june1, '早番')).toBe(0);

    // toPlain/fromPlain で必要スタッフ数も往復する
    const restored = MonthlyStaffSchedule.fromPlain(updated.toPlain());
    expect(restored.requiredFor(june1, '早番')).toBe(2);
  });

  test('setRequiredForAllDays は全稼働日に必要人数を設定する', () => {
    const schedule = createJuneSchedule().setRequiredForAllDays('早番', 3);
    expect(schedule.requiredFor(WorkingDay.of(2026, 6, 1), '早番')).toBe(3);
    expect(schedule.requiredFor(WorkingDay.of(2026, 6, 30), '早番')).toBe(3);
  });

  test('6月の稼働日は30日ある', () => {
    const days = createJuneSchedule().workingDays();
    expect(days).toHaveLength(30);
    expect(days[0].label).toBe('6/1');
    expect(days[29].label).toBe('6/30');
  });

  test('state は割当をインスタンスで保持する（勤務帯は ID 参照）', () => {
    const schedule = createJuneSchedule().assignShift('staff-A', june1, 'early');

    // 勤務帯は ID 参照（文字列）
    expect(schedule.state.workShiftIds).toEqual(['early', 'middle', 'late']);
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

    // plain は入れ子まで素のオブジェクト（勤務帯は ID、割当の稼働日も plain）
    expect(plain.workShiftIds).toEqual(['early', 'middle', 'late']);
    expect(plain.assignments[0].day).toEqual({ year: 2026, month: 6, day: 1 });
    // JSON シリアライズ可能であること
    expect(() => JSON.stringify(plain)).not.toThrow();

    // 往復後も内容が保たれる
    const restored = MonthlyStaffSchedule.fromPlain(plain);
    expect(restored.getShiftIdFor('staff-A', june1)).toBe('early');
    expect(restored.isDayOff('staff-B', june1)).toBe(true);
    expect(restored.isUndecided('staff-C', june1)).toBe(true);
    expect(restored.state.assignments[0]).toBeInstanceOf(ShiftAssignment);
    expect(restored.toPlain()).toEqual(plain);
  });
});
