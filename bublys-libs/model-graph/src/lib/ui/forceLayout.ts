/**
 * 力学で2次元に配置する。**近い概念を近くに置く**ための配置。
 *
 * 列に並べる配置（`layoutClassDiagram`）は集約の境界がまっすぐ読める代わりに、
 * 集約の数だけ横に伸びる。関係の濃さは位置に出ない。こちらは逆で、
 * つながりの強いものが自然に寄り、関係の疎密が距離になって見える。
 *
 * ★ **乱数を使わない。** 初期位置はクラス名から決まる（名前のハッシュで円周に置く）。
 *   図は「同じ入力なら同じ出力」でなければ、開くたびに配置が変わって
 *   前に見た図と比べられない。デバッグ道具としてそれは致命的。
 *
 * 力は4つ:
 *   反発   … すべての箱どうし。箱の大きさを見て、重ならない距離まで押し合う
 *   引力   … つながっている箱どうし（ばね）
 *   束ね   … 同じ集約・同じ世界線スコープの箱どうしを、つながりが無くても少し引く
 *   中心   … 全体が散らばりすぎないように、ゆるく中央へ
 */
import type { ModelGraph } from '../domain/ModelGraph.js';
import {
  DEFAULT_LAYOUT_OPTIONS,
  echoName,
  finishLayout,
  measureBoxes,
  measureEchoes,
  type ClassBox,
  type ClassDiagramLayout,
  type EchoSpec,
  type LayoutOptions,
} from './classLayout.js';

export type ForceOptions = {
  /** 何回まわすか。多いほど落ち着くが遅くなる */
  readonly iterations: number;
  /** 反発の強さ */
  readonly repulsion: number;
  /** ばねの自然長 */
  readonly springLength: number;
  /** ばねの強さ */
  readonly springStrength: number;
  /**
   * 同じ集約・同じスコープを束ねる強さ。
   * 弱いと世界線スコープの枠が図全体に広がって、囲う意味が無くなる
   */
  readonly groupStrength: number;
  /** 中央へ寄せる強さ */
  readonly gravity: number;
  /** 箱と箱のあいだに最低限あける距離 */
  readonly padding: number;
};

export const DEFAULT_FORCE_OPTIONS: ForceOptions = {
  iterations: 420,
  repulsion: 190000,
  springLength: 240,
  springStrength: 0.012,
  groupStrength: 0.055,
  gravity: 0.006,
  padding: 28,
};

/**
 * 名前から決まる初期位置（0〜1の角度）。
 *
 * `Math.random` を使えないので、名前を FNV でハッシュして円周に配る。
 * 同じ名前なら必ず同じ場所から始まるので、配置全体が決定的になる。
 */
function seedAngle(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** その箱をどのグループに束ねるか（同じ値どうしが引き合う） */
export type GroupOf = (className: string) => string | undefined;

export function layoutClassDiagramByForce(
  graph: ModelGraph,
  options: Partial<LayoutOptions> = {},
  force: Partial<ForceOptions> = {},
  /** 集約に加えて束ねたいまとまり（世界線スコープなど）。省略すると集約だけ */
  groupOf?: GroupOf,
  /** 焼き付けの写し。世界の中に置き、写し元とばねで結ぶ */
  echoes: readonly EchoSpec[] = []
): ClassDiagramLayout {
  const o = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  const f = { ...DEFAULT_FORCE_OPTIONS, ...force };
  const real = measureBoxes(graph, o);
  if (real.length === 0) return finishLayout(graph, []);
  // 写しも同じ場に置く。世界のまとまりに引かれ、写し元ともばねで結ばれる
  const measured = [...real, ...measureEchoes(echoes, real, o)];

  // --- 初期位置。名前のハッシュで円周に置く（乱数を使わない） ---------------
  const radius = Math.max(300, measured.length * 45);
  const nodes = measured.map((b) => {
    const a = seedAngle(b.name) * Math.PI * 2;
    return {
      box: b,
      x: Math.cos(a) * radius,
      y: Math.sin(a) * radius,
      vx: 0,
      vy: 0,
      /** 重なり判定に使う半径。箱の対角の半分 */
      r: Math.hypot(b.width, b.height) / 2,
    };
  });
  const index = new Map(nodes.map((n, i) => [n.box.name, i]));

  const springs = [
    ...graph.relations.map((r) => ({ a: index.get(r.from), b: index.get(r.to) })),
    // 写しは、写し元と「その世界の相手」の両方に引かれる。
    // 前者だけだと枠の外へ引きずり出され、後者だけだと写し元と遠く離れて線が長くなる
    ...echoes.flatMap((e) => [
      { a: index.get(echoName(e)), b: index.get(e.of) },
      { a: index.get(echoName(e)), b: index.get(e.near) },
    ]),
  ].filter((s): s is { a: number; b: number } => s.a !== undefined && s.b !== undefined);

  /**
   * 束ねるまとまり。集約と、注入されたグループ（世界線スコープ）の両方。
   * ★ 写しは**写し元の集約では束ねない**（外へ引き戻される）。焼き付け先の世界だけで束ねる
   */
  const groups = nodes.map((n) =>
    n.box.echoScopeId
      ? [n.box.echoScopeId]
      : [n.box.aggregate, groupOf?.(n.box.name)].filter(Boolean)
  );

  for (let step = 0; step < f.iterations; step++) {
    // 進むにつれて動きを小さくする（焼きなまし）。最後まで同じ強さだと震え続ける
    const cool = 1 - step / f.iterations;

    for (const n of nodes) {
      n.vx = 0;
      n.vy = 0;
    }

    // --- 反発 ---------------------------------------------------------------
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 1e-6) {
          // 完全に重なったら、名前の順で決まる向きへ離す（乱数を使わない）
          dx = a.box.name < b.box.name ? 1 : -1;
          dy = 0.3;
          dist = 1;
        }
        // 箱の大きさを見て、触れ合う距離までは強く押す
        const touch = a.r + b.r + f.padding;
        const strength =
          f.repulsion / (dist * dist) + (dist < touch ? (touch - dist) * 2.5 : 0);
        const ux = dx / dist;
        const uy = dy / dist;
        a.vx += ux * strength;
        a.vy += uy * strength;
        b.vx -= ux * strength;
        b.vy -= uy * strength;
      }
    }

    // --- ばね（つながっているもの） -----------------------------------------
    for (const s of springs) {
      const a = nodes[s.a];
      const b = nodes[s.b];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.hypot(dx, dy), 1e-6);
      const pull = (dist - f.springLength) * f.springStrength;
      const ux = (dx / dist) * pull;
      const uy = (dy / dist) * pull;
      a.vx += ux;
      a.vy += uy;
      b.vx -= ux;
      b.vy -= uy;
    }

    // --- 束ね（同じ集約・同じスコープ） -------------------------------------
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const shared = groups[i].filter((g) => groups[j].includes(g)).length;
        if (shared === 0) continue;
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const pull = f.groupStrength * shared;
        a.vx += dx * pull;
        a.vy += dy * pull;
        b.vx -= dx * pull;
        b.vy -= dy * pull;
      }
    }

    // --- 中心へ -------------------------------------------------------------
    for (const n of nodes) {
      n.vx -= n.x * f.gravity;
      n.vy -= n.y * f.gravity;
    }

    // 1ステップで動ける量に上限を置く。置かないと弾け飛ぶ
    const maxMove = 60 * cool + 2;
    for (const n of nodes) {
      const v = Math.hypot(n.vx, n.vy);
      const scale = v > maxMove ? maxMove / v : 1;
      n.x += n.vx * scale;
      n.y += n.vy * scale;
    }
  }

  // --- 原点を左上に寄せる（SVG は負の座標を描けるが、スクロールが効かない） ---
  const minX = Math.min(...nodes.map((n) => n.x - n.box.width / 2));
  const minY = Math.min(...nodes.map((n) => n.y - n.box.height / 2));
  const boxes: ClassBox[] = nodes.map((n) => ({
    ...n.box,
    x: Math.round(n.x - n.box.width / 2 - minX + o.gapX),
    y: Math.round(n.y - n.box.height / 2 - minY + o.gapY),
  }));

  return finishLayout(graph, boxes);
}
