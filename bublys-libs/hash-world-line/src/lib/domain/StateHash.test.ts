import { computeStateHash } from './StateHash';

describe('computeStateHash', () => {
  it('同じオブジェクトは同じ hash を返す', () => {
    const obj = { count: 5, name: 'test' };
    const hash1 = computeStateHash(obj);
    const hash2 = computeStateHash(obj);
    expect(hash1).toBe(hash2);
  });

  it('キーの順序が違っても同じ hash を返す', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { b: 2, a: 1 };
    expect(computeStateHash(obj1)).toBe(computeStateHash(obj2));
  });

  it('異なるオブジェクトは異なる hash を返す', () => {
    const obj1 = { count: 5 };
    const obj2 = { count: 6 };
    expect(computeStateHash(obj1)).not.toBe(computeStateHash(obj2));
  });

  it('16文字の16進数を返す', () => {
    const hash = computeStateHash({ test: 'data' });
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('連続した値でも十分に異なる hash を返す', () => {
    const hashes = [];
    for (let i = 0; i < 10; i++) {
      hashes.push(computeStateHash({ id: 'counter-1', value: i }));
    }
    // 全て異なる hash であること
    const unique = new Set(hashes);
    expect(unique.size).toBe(10);

    // 連続した hash の先頭6文字が全て異なることを確認
    const prefixes = hashes.map((h) => h.slice(0, 6));
    const uniquePrefixes = new Set(prefixes);
    expect(uniquePrefixes.size).toBe(10);
  });

  it('ネストしたオブジェクトも正しく処理する', () => {
    const obj1 = { outer: { inner: 1 } };
    const obj2 = { outer: { inner: 1 } };
    expect(computeStateHash(obj1)).toBe(computeStateHash(obj2));
  });

  it('配列を含むオブジェクトも正しく処理する', () => {
    const obj1 = { items: [1, 2, 3] };
    const obj2 = { items: [1, 2, 3] };
    expect(computeStateHash(obj1)).toBe(computeStateHash(obj2));
  });

  it('配列の順序が違うと異なる hash を返す', () => {
    const obj1 = { items: [1, 2, 3] };
    const obj2 = { items: [3, 2, 1] };
    expect(computeStateHash(obj1)).not.toBe(computeStateHash(obj2));
  });

  it('null を正しく処理する', () => {
    const hash1 = computeStateHash(null);
    const hash2 = computeStateHash(null);
    expect(hash1).toBe(hash2);
  });

  it('プリミティブ値を正しく処理する', () => {
    expect(computeStateHash(123)).toBe(computeStateHash(123));
    expect(computeStateHash('test')).toBe(computeStateHash('test'));
    expect(computeStateHash(true)).toBe(computeStateHash(true));
  });
});
