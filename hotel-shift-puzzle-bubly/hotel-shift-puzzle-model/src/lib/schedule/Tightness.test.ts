import { TightnessAmount, TightnessUnit, countByUnit } from './Tightness.js';

describe('TightnessAmount（単位つきのきつさ）', () => {
  const A = new TightnessUnit({ key: 'a', label: 'A', violating: true });
  const B = new TightnessUnit({ key: 'b', label: 'B', violating: false });
  const amount = (n: number, unit: TightnessUnit) => new TightnessAmount({ amount: n, unit });

  test('違反かどうかは単位が決める', () => {
    expect(amount(1, A).isViolating).toBe(true);
    expect(amount(1, B).isViolating).toBe(false);
  });

  test('同じ単位どうしは比べられる（小さいほうが良い）', () => {
    expect(amount(1, A).compare(amount(2, A))).toBeLessThan(0);
    expect(amount(2, A).compare(amount(2, A))).toBe(0);
  });

  test('★ 違う単位どうしは比べられない（例外）', () => {
    expect(() => amount(1, A).compare(amount(1, B))).toThrow();
  });

  test('単位は key で見分ける（label が違っても同じ単位）', () => {
    const A2 = new TightnessUnit({ key: 'a', label: '別の名前', violating: true });
    expect(amount(1, A).compare(amount(1, A2))).toBe(0);
  });

  test('countByUnit は宣言した単位をすべて返し、宣言していない単位は例外', () => {
    expect(countByUnit([A, B], [1, 2, 3], (n) => (n === 2 ? B : A)).map((a) => a.amount)).toEqual([
      2, 1,
    ]);
    expect(() => countByUnit([A], [1], () => B)).toThrow();
  });
});
