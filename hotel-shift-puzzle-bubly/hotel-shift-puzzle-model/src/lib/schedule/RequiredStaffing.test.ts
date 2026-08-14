import { RequiredStaffing } from './RequiredStaffing.js';
import { WorkingDay } from './WorkingDay.js';

describe('RequiredStaffing（必要スタッフ数）の使い方', () => {
  const d1 = WorkingDay.of(2026, 6, 1);
  const d2 = WorkingDay.of(2026, 6, 2);

  test('uniform は指定の全稼働日に同じ必要人数を設定する', () => {
    const req = RequiredStaffing.uniform([d1, d2], { 早番: 2, 遅番: 1 });
    expect(req.requiredFor(d1, '早番')).toBe(2);
    expect(req.requiredFor(d2, '遅番')).toBe(1);
    expect(req.requiredFor(d1, '中番')).toBe(0); // 未設定は0
  });

  test('requiredOn はその日の必要人数マップを返す', () => {
    const req = RequiredStaffing.uniform([d1], { 早番: 2, 中番: 1 });
    expect(req.requiredOn(d1)).toEqual({ 早番: 2, 中番: 1 });
    expect(req.requiredOn(d2)).toEqual({}); // 未設定は空
  });

  test('setRequired は不変。count<=0 は設定を取り除く', () => {
    const base = RequiredStaffing.uniform([d1], { 早番: 2 });

    const more = base.setRequired(d1, '中番', 3);
    expect(more.requiredFor(d1, '中番')).toBe(3);
    expect(base.requiredFor(d1, '中番')).toBe(0); // 元は不変

    const cleared = more.setRequired(d1, '早番', 0);
    expect(cleared.requiredFor(d1, '早番')).toBe(0);
    expect(cleared.requiredFor(d1, '中番')).toBe(3); // 他は残る
  });

  test('setRequiredForDays は複数日にまとめて設定する（不変）', () => {
    const base = RequiredStaffing.empty();
    const set = base.setRequiredForDays([d1, d2], '早番', 2);
    expect(set.requiredFor(d1, '早番')).toBe(2);
    expect(set.requiredFor(d2, '早番')).toBe(2);
    expect(base.requiredFor(d1, '早番')).toBe(0); // 元は不変

    // 0 でまとめて取り除く
    const cleared = set.setRequiredForDays([d1, d2], '早番', 0);
    expect(cleared.requiredFor(d1, '早番')).toBe(0);
    expect(cleared.requiredFor(d2, '早番')).toBe(0);
  });

  test('toPlain / fromPlain でラウンドトリップできる', () => {
    const req = RequiredStaffing.uniform([d1, d2], { 早番: 2, 中番: 1 });
    const restored = RequiredStaffing.fromPlain(req.toPlain());
    expect(restored.toPlain()).toEqual(req.toPlain());
    expect(() => JSON.stringify(req.toPlain())).not.toThrow();
  });

  test('fromPlain(undefined) は空（旧スキーマ・未設定に強い）', () => {
    const req = RequiredStaffing.fromPlain(undefined);
    expect(req.requiredFor(d1, '早番')).toBe(0);
  });
});
