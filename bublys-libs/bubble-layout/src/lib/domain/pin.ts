/**
 * ⑤ 触っていない泡は、画面の上で動かない。
 *
 * 元：lab.html 1493-1516 行（pin）、1478-1485 行（keepSeen）、1356 行（anchorOf）、1470 行（PIN_ON）
 *
 * > 泡の位置は、箱の中心。だから中身が変わって箱が伸び縮みしたら、
 * > 触っていない泡の見えている場所を保つように、位置を書き直す。
 *
 * 誰を留めるか（ここを1つ間違えると、入れ子の外側ごと動く）:
 *  - 留めるのは、空間の中身が変わったときだけ（泡が入った・出た・大きさが変わった）── 選ぶのは reshape
 *  - 同じ空間の中での並べ替えは留めない
 *  - 書き先は、その泡から外へたどって最初に「その軸が自由な空間」にいる泡の座標
 *  - 'pack' への差し込みでは、留められるのは差し込む所より前だけ（anchorOf）
 *
 * ★ ラボの probe()（lab 1517-1523 行）＝ このライブラリの resolveWorld。
 *   ラボの probe は「補間を進めずに解き直す」ために anim を退避していたが、resolveWorld は補間を持たない。
 */
import type { BubbleId, PlaneAxis, SpaceId } from './types.js';
import { METRICS } from './types.js';
import type { Bubble } from './bubble.js';
import type { BubbleWorld } from './world.js';
import type { ActContext, SeenRect } from './act.js';
import type { Layout, Placement } from './resolve.js';
import { resolveWorld } from './resolve.js';
import { screenToAxis } from './project.js';
import { valueFromPos } from './arrange.js';
import { verbOf, writeKeyOf } from './dimension.js';
import { viewOfSpace } from './view.js';

/** lab.html 1115 行 center。画面の矩形の中点 */
const center = (p: Placement, axis: PlaneAxis): number =>
  axis === 'x' ? p.x + p.w / 2 : p.y + p.h / 2;

/** lab.html 1470 行 PIN_ON。検証で切って比べるためだけの口（画面のボタンにはしない） */
let PIN_ON = true;

/**
 * id の泡の**左上**を、画面上の seen の所へ。lab.html 1493-1516 行 pin。
 * 左上なのは、大きさを変えた泡も留められるように（付け替えでは大きさが変わらないので中心と同じ）。
 * 書いて → 解き直して → まだずれていたらもう一度、を数回（ラボと同じ 6 回）。
 */
export function pin(
  world: BubbleWorld,
  ctx: ActContext,
  id: BubbleId,
  seen: SeenRect | undefined,
): BubbleWorld {
  if (!PIN_ON || !seen || !world.bubble(id)) return world;
  let w = world;
  for (let n = 0; n < 6; n++) {
    const layout = resolveWorld(w, ctx.viewport, ctx.rules);   // lab: probe()
    const q = layout.byId.get(id);
    if (!q) return w;
    let wrote = false;
    for (const axis of ['x', 'y'] as const) {
      const d = axis === 'x' ? seen.x - q.x : seen.y - q.y;
      if (Math.abs(d) < 0.01) continue;
      // 外へたどって最初に「その軸が自由な空間」にいる泡（lab 1504-1506 行）
      let A: Bubble | null = null;
      for (let cur: SpaceId = id; cur !== 'root'; ) {
        const up = w.parentOf(cur);
        if (up === null) break;
        if (verbOf(viewOfSpace(w, up)[axis].dim) === 'coord') { A = w.bubble(cur); break; }
        cur = up;
      }
      if (!A) continue;
      const pa = layout.byId.get(A.id);
      const up = w.parentOf(A.id);
      const L = up === null ? undefined : layout.spaces.get(up);
      if (!pa || !L) continue;
      const key = writeKeyOf(L.view[axis].dim);
      if (key !== 'x' && key !== 'y' && key !== 'z') continue;
      const c = center(pa, axis);
      // 土台のドラッグと同じ View の逆写し（並べ方が決める軸には書かない）。lab 1508-1509 行
      const delta =
        valueFromPos(L.view[axis], L.arr[axis], screenToAxis(L, axis, c + d, pa.m)) -
        valueFromPos(L.view[axis], L.arr[axis], screenToAxis(L, axis, c, pa.m));
      w = w.withBubble(A.withFree(key, A.state.free[key] + delta));
      wrote = true;
    }
    if (!wrote) return w;
  }
  return w;
}

/**
 * 空間を移っても、見えている大きさを保つ。lab.html 1478-1485 行 keepSeen。
 * 効くのは「Z が 自由座標 × そのまま × 透視」の空間だけ。手前へは出さない（焦点の面で止まる）。
 *
 * @param layout 解き直した配置。reshape は probe を1回だけ打ってその配置を全員に使う（lab 1451-1452 行）ので、
 *               同じ配置を渡せるように口を開けてある。省いたらここで解き直す。
 */
export function keepSeen(
  world: BubbleWorld,
  ctx: ActContext,
  id: BubbleId,
  seen: SeenRect | undefined,
  layout?: Layout,
): BubbleWorld {
  const b = world.bubble(id);
  const space = world.parentOf(id);
  if (!b || !seen || space === null) return world;
  const L = (layout ?? resolveWorld(world, ctx.viewport, ctx.rules)).spaces.get(space);
  if (!L) return world;
  const A = L.view.z;
  if (verbOf(A.dim) !== 'coord' || A.arrange !== 'as-is' || A.lens !== 'perspective') return world;
  const key = writeKeyOf(A.dim);
  if (key !== 'x' && key !== 'y' && key !== 'z') return world;
  const m = seen.scale / L.host.scale;
  const f = world.focusOf(world.windowOf(L.id)).z;          // lab: focusZ(L.id)
  return world.withBubble(b.withFree(key, f + Math.max(0, (1 / m - 1) / METRICS.K_PERSP)));
}

/**
 * ⑤ 'pack' に差し込むとき、誰を留めるか。lab.html 1356 行 anchorOf。
 * 差し込む所より前（先頭側）の泡。前にいなければ後ろの泡。
 * こうすると、どの縁から寄せても同じ答えになり、並びはいつも後ろへ伸びる。
 */
export function anchorOf(list: readonly BubbleId[], idx: number): BubbleId | null {
  return list[idx - 1] ?? list[idx] ?? null;
}

/**
 * ⑤ を切って比べるための口。lab.html 1470 行 PIN_ON（画面のボタンにはしない）。
 * 検証（_check/rule5.mjs）が「pin 入り 0.0px ／ pin 切り −30.0px」を測るのに使う。
 */
export function withoutPin<T>(run: () => T): T {
  const saved = PIN_ON;
  PIN_ON = false;
  try {
    return run();
  } finally {
    PIN_ON = saved;
  }
}
