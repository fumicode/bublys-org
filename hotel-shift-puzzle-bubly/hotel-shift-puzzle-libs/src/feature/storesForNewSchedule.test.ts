import {
  GOVERNMENT_FORMAT,
  HOTEL_FORMAT,
  Store,
  WorkingDay,
} from '@bublys-org/hotel-shift-puzzle-model';
import { storesForNewSchedule } from './storesForNewSchedule.js';

const today = WorkingDay.of(2026, 11, 11);

describe('storesForNewSchedule（勤務表を作れる店舗）', () => {
  test('店舗も勤務表も無ければ、既定の store-1（ホテル・暦月）', () => {
    const [only, ...rest] = storesForNewSchedule([], []);
    expect(rest).toEqual([]);
    expect(only.id).toBe('store-1');
    expect(only.format).toBe(HOTEL_FORMAT);
    expect(only.periodRule.kind).toBe('calendar-month');
  });

  test('店舗を作る前の勤務表が指す storeId は、記録が無くても選べる（ホテル・暦月）', () => {
    const stores = storesForNewSchedule([], [{ storeId: 'store-1' }, { storeId: 'store-1' }]);
    expect(stores.map((s) => s.id)).toEqual(['store-1']);
  });

  test('記録された店舗が先、記録の無い storeId が後。記録があればそちらを使う', () => {
    const gov = Store.create({ id: 'gov', name: '総務課', format: GOVERNMENT_FORMAT, today });
    const hotel = Store.create({ id: 'store-1', name: 'サンプルホテル', format: HOTEL_FORMAT, today });
    const stores = storesForNewSchedule([gov, hotel], [{ storeId: 'store-1' }, { storeId: 'old' }]);
    expect(stores.map((s) => s.name)).toEqual(['総務課', 'サンプルホテル', 'old']);
  });

  test('削除した店舗は、勤務表が指していても選択肢に出さない', () => {
    const stores = storesForNewSchedule([], [{ storeId: 'gone' }, { storeId: 'store-1' }], new Set(['gone']));
    expect(stores.map((s) => s.id)).toEqual(['store-1']);
  });

  test('ホテルを選べないデプロイ（行政版）では、何も無くても既定の store-1 を出さない', () => {
    expect(storesForNewSchedule([], [], new Set(), false)).toEqual([]);
  });
});
