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
import type { BubbleId, SpaceId } from './types.js';
import { METRICS } from './types.js';
import type { Bubble } from './bubble.js';
import type { BubbleWorld } from './world.js';
import type { ActContext, SeenRect } from './act.js';
import type { Layout } from './resolve.js';
import { resolveWorld } from './resolve.js';
import { screenToAxis } from './project.js';
import { valueFromPos } from './arrange.js';
import { verbOf, writeKeyOf } from './dimension.js';
import { viewOfSpace } from './view.js';

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
  /**
   * ★ **当ててみて悪くなったら、当てない。**
   *
   *   逆写しは1次の当て（当てて → 解き直して → もう一度）なので、当てる所の倍率が
   *   場所で大きく変わるレンズでは外れることがある。とくに魚眼の端（tanh の寝た所）では
   *   画面の 1px が世界の何十 px にも化けるうえ、像の幅まで一緒に潰れるので、
   *   「見えていた左上」に合わせる式の解が定まらない ── 幅 0 のままどこまでも遠くへ行ける。
   *   実測：並びから1つ引き出したら、残ったほうの倍率が 8e-12 になって画面から消えた。
   *
   *   ⑤ が守りたいのは「触っていない泡が画面の上で動かない」こと。当てた結果ズレが
   *   **増える**なら、それは留めそこねているので、**留めなかったほうがまだ近い**。
   *   いちばんズレの小さかった答えを返す ── 素直に効く場面（平行なレンズ・焦点の近く）では
   *   毎回ズレが減るので、今までと同じ答えになる。
   */
  let best = world;
  let bestErr = Infinity;
  for (let n = 0; n < 6; n++) {
    const layout = resolveWorld(w, ctx.viewport, ctx.rules, ctx.grown);   // lab: probe()
    const q = layout.byId.get(id);
    if (!q) return best;
    const err = Math.abs(seen.x - q.x) + Math.abs(seen.y - q.y);
    if (!(err < bestErr)) return best;        // 縮まらなかった ＝ ここで止める
    bestErr = err;
    best = w;
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
      /**
       * ★ 逆写しを当てる点は、**ズレを測った所そのもの**（留める泡の左上）。
       *
       *   ラボは土台（A）の**中心**で当てていた（lab 1508 行 center(pa)）。平行なレンズなら
       *   どこで当てても答えは同じ（画面 1px ＝ 世界 1px）なので、差は出ない。
       *   魚眼では場所ごとに倍率が違うので、**中心の倍率で左上のズレを直そうとすると当たらない**
       *   ── しかも端（tanh の寝た所）では倍率が 1/60 ほどになるので、6 回まわしても収束せず、
       *   並びが世界の中で数百 px 飛ぶ（実測：一覧の隣にいた並びが重なる所まで来た）。
       *   測った所で当てれば、留める泡が土台そのものなら **1 回で厳密に**決まる。
       */
      const c = axis === 'x' ? q.x : q.y;
      // 土台のドラッグと同じ View の逆写し（並べ方が決める軸には書かない）。lab 1508-1509 行
      const at = (screen: number) =>
        valueFromPos(L.view[axis], L.arr[axis], screenToAxis(L, axis, screen, pa.m));
      const delta = at(c + d) - at(c);
      if (!Number.isFinite(delta)) continue;
      w = w.withBubble(A.withFree(key, A.state.free[key] + delta));
      wrote = true;
    }
    if (!wrote) return best;
  }
  return best;
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
  const L = (layout ?? resolveWorld(world, ctx.viewport, ctx.rules, ctx.grown)).spaces.get(space);
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
