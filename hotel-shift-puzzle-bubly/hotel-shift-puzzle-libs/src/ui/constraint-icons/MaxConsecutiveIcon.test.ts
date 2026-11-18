import { MAX_CELLS, maxConsecutiveAtX } from "./MaxConsecutiveIcon.js";

describe("maxConsecutiveAtX — 停止バーをどこへ持ってきたら N いくつか", () => {
  it("左端より左なら 1、右端より右なら描ける最大", () => {
    expect(maxConsecutiveAtX(-100)).toBe(1);
    expect(maxConsecutiveAtX(200)).toBe(MAX_CELLS);
  });

  it("右へ動かすほど N は減らない（行ったり来たりしない）", () => {
    let prev = maxConsecutiveAtX(0);
    for (let x = 0; x <= 80; x += 0.5) {
      const n = maxConsecutiveAtX(x);
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
  });

  it("1〜描ける最大のどれにも止まれる", () => {
    const reached = new Set<number>();
    for (let x = 0; x <= 80; x += 0.25) reached.add(maxConsecutiveAtX(x));
    expect([...reached].sort((a, b) => a - b)).toEqual(
      Array.from({ length: MAX_CELLS }, (_, i) => i + 1)
    );
  });
});
