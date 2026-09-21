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
  /**
   * 枠（世界線スコープ）が違うものどうしの反発の倍率。
   * 1 にすると枠がメンバーでない箱を飲み込む
   */
  readonly frameSeparation: number;
};

export const DEFAULT_FORCE_OPTIONS: ForceOptions = {
  iterations: 420,
  repulsion: 190000,
  springLength: 240,
  springStrength: 0.012,
  groupStrength: 0.055,
  gravity: 0.006,
  padding: 28,
  frameSeparation: 2.6,
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

  /**
   * その箱が**どの枠の中に描かれるか**（世界線スコープ）。枠を持たないものは null。
   * 集約は枠にならないので、ここには入れない。
   */
  const frameOf = nodes.map((n) => n.box.echoScopeId ?? groupOf?.(n.box.name) ?? null);
  const frameIds = [...new Set(frameOf.filter((f): f is string => f !== null))];

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
        // 箱の大きさを見て、触れ合う距離までは強く押す。
        // ★ 枠が違うものどうしは強めに離す。近いままだと、枠（メンバーの外接矩形）が
        //   メンバーでない箱を飲み込んで「世界の中に居る」という嘘になる
        const apart = frameOf[i] !== frameOf[j] && (frameOf[i] !== null || frameOf[j] !== null);
        const touch = a.r + b.r + f.padding;
        const strength =
          (f.repulsion / (dist * dist)) * (apart ? f.frameSeparation : 1) +
          (dist < touch ? (touch - dist) * 2.5 : 0);
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

  // --- 枠からはみ出させる -------------------------------------------------
  // 反発だけでは入り込みを完全には防げない。**枠は嘘をついてはいけない**ので、
  // 最後に必ず押し出す。押し出したあと箱が重なりうるので、重なりだけ解いて仕上げる
  for (let pass = 0; pass < 6; pass++) {
    let moved = false;
    for (const id of frameIds) {
      const members = nodes.filter((_, i) => frameOf[i] === id);
      if (members.length === 0) continue;
      const pad = f.padding;
      const x0 = Math.min(...members.map((m) => m.x - m.box.width / 2)) - pad;
      const x1 = Math.max(...members.map((m) => m.x + m.box.width / 2)) + pad;
      const y0 = Math.min(...members.map((m) => m.y - m.box.height / 2)) - pad;
      const y1 = Math.max(...members.map((m) => m.y + m.box.height / 2)) + pad;
      nodes.forEach((n, i) => {
        if (frameOf[i] === id) return;
        const l = n.x - n.box.width / 2;
        const r = n.x + n.box.width / 2;
        const t = n.y - n.box.height / 2;
        const b = n.y + n.box.height / 2;
        if (r <= x0 || l >= x1 || b <= y0 || t >= y1) return;
        // 一番近い辺へ出す
        const out = [
          { d: r - x0, dx: -(r - x0), dy: 0 },
          { d: x1 - l, dx: x1 - l, dy: 0 },
          { d: b - y0, dx: 0, dy: -(b - y0) },
          { d: y1 - t, dx: 0, dy: y1 - t },
        ].reduce((min, c) => (c.d < min.d ? c : min));
        n.x += out.dx;
        n.y += out.dy;
        moved = true;
      });
    }
    if (!moved) break;
    // 押し出したせいで箱が重なることがある。重なりだけ解く
    for (let k = 0; k < 30; k++) {
      let hit = false;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const ox = (a.box.width + b.box.width) / 2 + f.padding - Math.abs(a.x - b.x);
          const oy = (a.box.height + b.box.height) / 2 + f.padding - Math.abs(a.y - b.y);
          if (ox <= 0 || oy <= 0) continue;
          hit = true;
          // 同じ枠の中で解くほうが枠を壊さない。浅いほうの軸へずらす
          const sx = a.x <= b.x ? -1 : 1;
          const sy = a.y <= b.y ? -1 : 1;
          if (ox < oy) {
            a.x += (sx * ox) / 2;
            b.x -= (sx * ox) / 2;
          } else {
            a.y += (sy * oy) / 2;
            b.y -= (sy * oy) / 2;
          }
        }
      }
      if (!hit) break;
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

  return finishLayout(graph, boxes, undefined, echoes);
}
