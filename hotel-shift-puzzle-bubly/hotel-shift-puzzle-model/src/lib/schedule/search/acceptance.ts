/**
 * acceptance — 探索で、出てきた手を採るかどうか（受け入れ方）
 *
 * 差し替えられる：探索は Acceptance を1つ受け取るだけ。比べ方は「どちらが良いか」だけで、
 * きつさの列を1つの点数に合計しない（違う単位の量を足さない。#229）。
 */

/** 2つのきつさの列を比べる（負なら a のほうが良い） */
export type CostCompare = (a: readonly number[], b: readonly number[]) => number;

/** 1回の探索の受け入れ方 */
export type AcceptanceRun = {
  /** candidate（手を打ったあと）を採るか。current は今の状態 */
  accepts(candidate: readonly number[], current: readonly number[], iteration: number): boolean;
  /** 1手ぶん終わったあとの今の状態を知らせる（履歴を持つ方式が使う） */
  record(current: readonly number[], iteration: number): void;
};

export type Acceptance = {
  readonly kind: string;
  start(initial: readonly number[], compare: CostCompare): AcceptanceRun;
};

/** 良くなるか同じなら採る（山登り） */
export const hillClimbing: Acceptance = {
  kind: "hill-climbing",
  start: (_initial, compare) => ({
    accepts: (candidate, current) => compare(candidate, current) <= 0,
    record: () => undefined,
  }),
};

/**
 * 少し前より悪くなっていなければ採る（Late Acceptance Hill Climbing）。
 * length 手前の状態と比べるので、直前より悪い手も一時的に通り、局所最適を抜けられる。
 * 比べるのは「どちらが良いか」だけなので、辞書順のまま使える。
 */
export const lateAcceptance = (length = 50): Acceptance => ({
  kind: `late-acceptance:${length}`,
  start: (initial, compare) => {
    const history: (readonly number[])[] = Array.from({ length }, () => initial);
    return {
      accepts: (candidate, current, iteration) =>
        compare(candidate, history[iteration % length]) <= 0 || compare(candidate, current) <= 0,
      record: (current, iteration) => {
        history[iteration % length] = current;
      },
    };
  },
});
