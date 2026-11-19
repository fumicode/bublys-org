import { WorkingDay } from '@bublys-org/hotel-shift-puzzle-model';
import { rokuyoNoteOf } from './rokuyoNote.js';

describe('rokuyoNoteOf（勤務表の日付に添える六曜）', () => {
  test('六曜を注記にする。大安・友引・仏滅だけ色の意味を持つ', () => {
    expect(rokuyoNoteOf(WorkingDay.of(2026, 1, 1))).toEqual({
      label: '大安',
      tone: 'lucky',
      title: '六曜：大安',
    });
    // 2026/1/2 は赤口（色を付けない）
    expect(rokuyoNoteOf(WorkingDay.of(2026, 1, 2))).toEqual({
      label: '赤口',
      tone: undefined,
      title: '六曜：赤口',
    });
  });

  test('旧暦の表の範囲（2020〜2032年）の外は添えない', () => {
    expect(rokuyoNoteOf(WorkingDay.of(2033, 1, 1))).toBeUndefined();
  });
});
