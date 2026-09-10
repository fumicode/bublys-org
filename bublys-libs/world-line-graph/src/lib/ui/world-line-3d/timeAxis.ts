/**
 * 時刻から X 座標を決める。
 *
 * 1つの操作は複数のスコープへ同時に書くので、各スコープのホップ数を X にすると
 * 同じ操作の結果が図の別の位置に散る。だから X は**時刻**で決める。
 *
 * 難しいのは2つ。「どこまでを同時とみなすか」と「同時の中でどう並べるか」で、
 * どちらも間違えると図が嘘をつく（実際に両方間違えた）。timeAndPacking.test.ts が
 * 数値で固定している。
 */
import type { TimeMode } from './types.js';

/**
 * 時刻でノードをまとめ、「同時に起きたこと」に同じ番号を振る。
 *
 * 1つの操作は複数のスコープへ同時に書く（セルを1つ塗ると、その勤務表の世界線と
 * アプリ全体スコープの両方にノードが増える）。書き込む**回数**はスコープごとに違うので、
 * 各スコープのホップ数を X にすると、同時に起きたことが別の位置に並んでしまう。
 * 時刻でまとめれば「同時なら同じ X」になる。
 *
 * ★ `Slot`（席）とは別物。席は板の上の位置（YZ 平面）で、こちらは時間軸上の何列目か。
 *   同じ40行の中に両方が出るので、名前で割っておかないと X の話か YZ の話か読めない。
 *
 * @returns nodeId → 時刻の列番号（0 から連番）
 */
export function buildTimeColumns(
  nodes: readonly { readonly id: string; readonly timestamp: number }[],
  toleranceMs: number
): Map<string, number> {
  const sorted = [...nodes].sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
  const columns = new Map<string, number>();
  let column = -1;
  // ★ 比べる相手は「直前のノード」ではなく**クラスタの先頭**。
  //   直前と比べると、許容時間より短い間隔が続く限りいくらでも数珠つなぎになる
  //   （200ms 間隔で10回編集すると、1.8 秒離れた両端まで「同時」に潰れる）。
  //   先頭から測れば、1つのクラスタの実時間の幅は必ず許容時間以下に収まる。
  let clusterStart = Number.NEGATIVE_INFINITY;
  for (const n of sorted) {
    if (n.timestamp - clusterStart > toleranceMs) {
      column++;
      clusterStart = n.timestamp;
    }
    columns.set(n.id, Math.max(column, 0));
  }
  return columns;
}

/** 時間軸を組むのに要る、スコープ1つぶんの最小の情報 */
export type TimeAxisScope = {
  readonly scopeId: string;
  /** nodeId → 起点からのホップ数 */
  readonly depths: ReadonlyMap<string, number>;
  readonly nodes: readonly { readonly id: string; readonly timestamp: number }[];
};

export type TimeAxisOptions = {
  readonly xStep: number;
  readonly subStep: number;
  readonly syncToleranceMs: number;
};

/**
 * X 座標を返す関数を組み立てる。
 *
 * `'sync'`（既定）は時刻でまとめ、同時なら同じ X に置く。同じ時刻に同じスコープが
 * 複数ノード書いたときだけ、その中で少しずらす（アプリ全体スコープは1操作で
 * オブジェクトごとに1ノード書くため）。
 * `'hops'` はスコープごとのホップ数をそのまま使う（スコープの起点からの相対）。
 *
 * ★ ずらしの**合計**が次のクラスタまでの距離を超えてはいけない。超えると
 *   時間が逆流し（親より子が手前に来る）、板も重なる。だからクラスタ内の最大の
 *   深さから刻み幅を決め直す。既定（xStep 14 / subStep 0.32）では深さ4で越えていた。
 */
export function buildTimeAxis(
  scopes: readonly TimeAxisScope[],
  o: TimeAxisOptions,
  timeMode: TimeMode = 'sync'
): (scopeId: string, nodeId: string, depth: number, scopeOriginX: number) => number {
  const timeColumnOf = buildTimeColumns(
    scopes.flatMap((s) => s.nodes),
    o.syncToleranceMs
  );

  if (timeMode === 'hops') {
    return (_scopeId, _nodeId, depth, scopeOriginX) => scopeOriginX + o.xStep * depth;
  }

  /** (スコープ, 時刻クラスタ) ごとの最小・最大の depth */
  const base = new Map<string, number>();
  const top = new Map<string, number>();
  for (const s of scopes) {
    for (const n of s.nodes) {
      const key = `${s.scopeId} ${timeColumnOf.get(n.id) ?? 0}`;
      const d = s.depths.get(n.id) ?? 0;
      const lo = base.get(key);
      if (lo === undefined || d < lo) base.set(key, d);
      const hi = top.get(key);
      if (hi === undefined || d > hi) top.set(key, d);
    }
  }
  let widest = 1;
  for (const [key, hi] of top) widest = Math.max(widest, hi - (base.get(key) ?? 0));
  // 0.9 は「次のクラスタの手前で必ず止まる」ための余白
  const subStep = Math.min(o.subStep, 0.9 / widest);

  return (scopeId, nodeId, depth) => {
    const slot = timeColumnOf.get(nodeId) ?? 0;
    const from = base.get(`${scopeId} ${slot}`) ?? 0;
    return o.xStep * (slot + (depth - from) * subStep);
  };
}
