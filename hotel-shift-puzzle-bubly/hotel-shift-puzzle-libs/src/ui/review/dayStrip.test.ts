import { dayStripOf } from './dayStrip.js';

describe('dayStripOf（振り返りの日別の帯）', () => {
  const strip = () =>
    dayStripOf({
      year: 2026,
      month: 6,
      staffId: 'A',
      compromises: [
        { staffId: 'A', label: '希望', dayKeys: ['2026-06-03'], message: '' },
        { staffId: 'A', label: '連勤', dayKeys: ['2026-06-10', '2026-06-11', '2026-06-12'], message: '' },
        // 前月末日の遅番の翌朝（勤務間インターバル）は前月の日を含む
        { staffId: 'A', label: 'インターバル', dayKeys: ['2026-05-31', '2026-06-01'], message: '' },
        { staffId: 'A', label: '休日', dayKeys: [], message: '' },
        { staffId: 'B', label: '希望', dayKeys: ['2026-06-04'], message: '' },
      ],
      busyDayContributions: [
        { dayKey: '2026-06-07', requiredCount: 9, workedStaffIds: ['A', 'B'] },
        { dayKey: '2026-06-08', requiredCount: 9, workedStaffIds: ['B'] },
      ],
    });

  test('帯の長さはその月の日数', () => {
    expect(strip().dayCount).toBe(30);
  });

  test('★ 譲歩はその譲歩が指す日のうち、この月の日にだけ置く（最初と最後を結ばない）', () => {
    const s = strip();
    expect([...s.compromiseDays].sort((a, b) => a - b)).toEqual([1, 3, 10, 11, 12]);
    expect(s.compromiseDays.has(20)).toBe(false);
  });

  test('日に紐づかない譲歩は「月」に数える', () => {
    expect(strip().monthlyCount).toBe(1);
  });

  test('繁忙日はその人が出勤した日だけ。ほかの人の譲歩は入れない', () => {
    const s = strip();
    expect([...s.busyDays]).toEqual([7]);
    expect(s.compromiseDays.has(4)).toBe(false);
  });
});
