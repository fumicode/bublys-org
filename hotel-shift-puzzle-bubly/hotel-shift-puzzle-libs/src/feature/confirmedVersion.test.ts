import { ConfirmedSchedule } from '@bublys-org/hotel-shift-puzzle-model';
import { confirmedVersionOf } from './confirmedVersion.js';

const confirmedOf = (scheduleId: string, month: number) =>
  ConfirmedSchedule.confirm({
    scheduleId,
    worldLineNodeId: 'n1',
    year: 2026,
    month,
    storeId: 'st',
    compromises: [],
    busyDayContributions: [],
    stars: [],
  });

describe('confirmedVersionOf（この勤務表が持っている確定版）', () => {
  test('確定版を持つ勤務表だけが、それを返す', () => {
    const may = confirmedOf('may-a', 5);
    const june = confirmedOf('june-b', 6);

    expect(confirmedVersionOf([may, june], 'june-b')).toBe(june);
    // 同じ月の別の勤務表は確定版を持たない（確定版は店舗×月で1つ）
    expect(confirmedVersionOf([may, june], 'june-a')).toBeUndefined();
    expect(confirmedVersionOf([may, june], undefined)).toBeUndefined();
  });
});
