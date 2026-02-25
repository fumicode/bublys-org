import { computeStateHash } from './StateHash';

describe('computeStateHash', () => {
  it('is deterministic: same input produces same hash', () => {
    const data = { name: 'test', value: 42 };
    const hash1 = computeStateHash(data);
    const hash2 = computeStateHash(data);
    expect(hash1).toBe(hash2);
  });

  it('key order does not matter', () => {
    const hash1 = computeStateHash({ a: 1, b: 2 });
    const hash2 = computeStateHash({ b: 2, a: 1 });
    expect(hash1).toBe(hash2);
  });

  it('returns a 16-character hex string', () => {
    const hash = computeStateHash({ foo: 'bar' });
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('different inputs produce different hashes', () => {
    const hash1 = computeStateHash({ a: 1 });
    const hash2 = computeStateHash({ a: 2 });
    expect(hash1).not.toBe(hash2);
  });

  it('handles primitive values', () => {
    const hashStr = computeStateHash('hello');
    const hashNum = computeStateHash(42);
    const hashNull = computeStateHash(null);
    const hashBool = computeStateHash(true);
    expect(hashStr).toMatch(/^[0-9a-f]{16}$/);
    expect(hashNum).toMatch(/^[0-9a-f]{16}$/);
    expect(hashNull).toMatch(/^[0-9a-f]{16}$/);
    expect(hashBool).toMatch(/^[0-9a-f]{16}$/);
    expect(hashStr).not.toBe(hashNum);
  });

  it('handles nested objects with key order independence', () => {
    const hash1 = computeStateHash({ outer: { b: 2, a: 1 } });
    const hash2 = computeStateHash({ outer: { a: 1, b: 2 } });
    expect(hash1).toBe(hash2);
  });

  it('handles arrays (order matters)', () => {
    const hash1 = computeStateHash([1, 2, 3]);
    const hash2 = computeStateHash([3, 2, 1]);
    expect(hash1).not.toBe(hash2);
  });
});
