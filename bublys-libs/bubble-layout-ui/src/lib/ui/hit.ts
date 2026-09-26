/**
 * 当たり判定 ── lab.html 1130-1200 行 `pickAt` / `hitTest` / `spaceAt` / `handleAt`。
 *
 * ★ DOM は「候補を早く絞る道具」で、当たったかどうかは**模型の矩形で決め直す**。
 *   DOM は要素の矩形を画素に丸めて当てるので、小数の箱では右端・下端の1列が落ち、
 *   左端・上端の外 1px を拾う。外れたら次の要素へ進めばよい（elementsFromPoint は重なりを全部くれる）。
 */
import { METRICS } from '@bublys-org/bubble-layout';
import type { BubbleId, Layout, Placement, SpaceId } from '@bublys-org/bubble-layout';

/** 見えない親の縁（外周）の掴める幅。lab.html 362 行 RING */
export const RING = 12;
/** 大きさの角の当たり（右下 [−12, +3]）。lab.html 1198 行 */
const HANDLE_IN = 12;
const HANDLE_OUT = 3;
/**
 * **指で掴むときだけ、角の当たりを外へ広げる量。**
 *
 * 指は太いので、3px しか外へ出ていない角は狙えない（爪の先で 1px を突く動き）。
 * 内側（12px）は広げない ── そこは中身の上なので、広げると**中身を触れなくなる**。
 * 外側は箱の外の空白なので、広げても何も奪わない。
 *
 * ★ CSS の `@media (any-pointer:coarse)` で `.bl-hnd` を 16 → 32px にしてあるのと同じ数
 *   （12 ＋ 20 ＝ 32）。DOM は候補を絞る道具で、当たったかどうかはここが決め直す。
 */
export const HANDLE_COARSE_OUT = 20;

export const inBox = (p: Placement, mx: number, my: number): boolean =>
  mx >= p.x && mx <= p.x + p.w && my >= p.y && my <= p.y + p.h;

/** ③ 見えない親に当たるのは外周だけ（箱を持たないので、並びの中のすき間は外の空間の背景） */
export const onRing = (p: Placement, mx: number, my: number): boolean =>
  mx >= p.x - RING && mx <= p.x + p.w + RING && my >= p.y - RING && my <= p.y + p.h + RING &&
  !(mx >= p.x && mx <= p.x + p.w && my >= p.y && my <= p.y + p.h);

export const onHandle = (
  p: Placement | null,
  mx: number,
  my: number,
  /** 外へ出る量（指のときだけ `HANDLE_COARSE_OUT`）。内側は広げない */
  out: number = HANDLE_OUT,
): boolean =>
  !!p && mx >= p.x + p.w - HANDLE_IN && mx <= p.x + p.w + out &&
  my >= p.y + p.h - HANDLE_IN && my <= p.y + p.h + out;

/**
 * その泡の**装いが四辺に取るぶん**（`CHROME` ＋ 並べたあとに出た装い）。
 * これが「中身の箱」の縁 ── 外側は枠、内側は中身。
 */
export interface Inset {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** 渡されなかったときの既定（模型の帯 24 だけ。ラボと同じ） */
const BAR: Inset = { left: 0, top: METRICS.HEADER, right: 0, bottom: 0 };

/**
 * 「中身の箱」に入っているか（**その外側は枠** ＝ 掴める所）。中身の箱を突いたら
 * その泡は**掴めない**（触ったことにはなる ── 選ぶのは中身でもできる）。
 * 見えない親は縁でしか当たらないので、いつも「掴む」。
 *
 * ★ hasBody は「空間を持つ泡」だけでなく「**本文を持つ泡**」にも同じ扱いをするための口。
 *   本文が本物の UI（ボタン・選択欄）のとき、そこを突いて泡が動いたら中身が触れない。
 *
 * ★ **枠の広さは、その泡が着ている装いから取る**（`insetOf`）── 固定の数ではない。
 *   固定にしていたころは、**装いを出していない一覧の札で枠が中身を食っていた**
 *   （実測：箱 86 の札で上 24px が枠 ＝ 28%）。
 *
 * ★ **2026-09-26：四辺とも装いに従うようにした。**
 *   それまでは上だけ装いで、左右と下は**自分で決めた 12px**を内側へ取っていた。
 *   模型は装いの数（`CHROME`）を持っているのに、別の数を作っていたのが誤り:
 *
 *     普通の泡（`plain` 7/27/7/7）  7〜12px の帯が**中身の上に食い込み**、
 *                                   しかもカーソルは中身のまま（掴めると見えない）
 *     窓（`bar` 上 24 だけ）        帯より下はまるごと**中の海**なのに、四周 12px を
 *                                   取り上げていた（実測：窓の縁から 6px を掴むと
 *                                   中の海ではなく窓が動いた）
 *
 *   装いに従えば「**枠が見えている所 ＝ 掴める所**」になり、カーソルも合う
 *   （そこに居るのは `.bub` 自身なので `cursor:grab` がそのまま出る）。
 *   「中身が無くなるほど取らない」ための手当て（短辺の 1/4）も要らなくなった
 *   ── 箱 ＝ 中身 ＋ 装い なので、中身は必ず残る。
 */
export const inContent = (
  p: Placement,
  mx: number,
  my: number,
  hasBody: (id: BubbleId) => boolean,
  /** その泡の装いが四辺に取るぶん。省けば模型の既定（帯 24 だけ） */
  insetOf?: (id: BubbleId) => Inset,
): boolean => {
  if (p.b.state.implicit || !hasBody(p.id)) return false;
  const c = insetOf ? insetOf(p.id) : BAR;
  const s = p.scale;
  return (
    my >= p.y + c.top * s &&
    my <= p.y + p.h - c.bottom * s &&
    mx >= p.x + c.left * s &&
    mx <= p.x + p.w - c.right * s
  );
};

export interface PickInput {
  readonly layout: Layout;
  /** 描かなかった泡（掴めない） */
  readonly tiny: ReadonlySet<BubbleId>;
  readonly selectedId: BubbleId | null;
  /** 泡を載せている層の要素（ここまで来たら背景） */
  readonly layer: Element;
  /** 層の左上（画面座標）。掴んだ点はここからの相対で測る */
  readonly origin: { readonly x: number; readonly y: number };
  /**
   * 層に掛かっている拡大率（画面の px ÷ 層の px）。大元の画面では 1。
   * 層の座標（mx, my）を画面に戻して当たりを取るのに使う
   */
  readonly scale?: number;
  /** 大きさの角の要素 */
  readonly handleEl: Element | null;
  /** 角が外へ出る量（指で掴むときは `HANDLE_COARSE_OUT`）。省けばマウスの 3px */
  readonly handleOut?: number;
}

export interface Picked {
  readonly handle: Placement | null;
  readonly bub: Placement | null;
}

/** カーソルの下の泡と角。mx, my は層の左上から測った座標 */
export function pickAt(input: PickInput, mx: number, my: number): Picked {
  const { layout, tiny, selectedId, layer, origin, handleEl } = input;
  const k = input.scale ?? 1;
  const list = document.elementsFromPoint(mx * k + origin.x, my * k + origin.y);
  let handle: Placement | null = null;
  let bub: Placement | null = null;
  for (const el of list) {
    if (!el.classList) continue;
    if (handleEl && el === handleEl) {
      // 大きさの角（泡の外に置いてある）
      const p = selectedId ? layout.byId.get(selectedId) ?? null : null;
      if (!handle && p && p.vis > 0 && !tiny.has(p.id) && !p.b.state.implicit && onHandle(p, mx, my, input.handleOut)) handle = p;
      continue;
    }
    const q = el.closest('.bub') as HTMLElement | null;
    if (!q) {
      if (el === layer || el === layer.parentElement) break;
      continue;
    }
    const id = q.dataset['id'];
    const p = id ? layout.byId.get(id) : undefined;
    if (!p) continue;
    if (p.b.state.implicit) {
      if (!bub && onRing(p, mx, my)) bub = p; // ③ 縁は角を隠さない
      continue;
    }
    if (!inBox(p, mx, my)) continue; // DOM が余分に返した分を削る
    if (!bub) bub = p;
    break; // 体のある泡は、その奥の角も隠す
  }
  return { handle, bub };
}

/**
 * カーソルの下の空間：中身の箱の上ならその空間、泡の上ならその泡がいる空間。
 * 平らな DOM では子は親の「中」に無いので、親の箱の隙間を突くと親（＝その空間）が返る
 */
export function spaceAt(
  input: PickInput,
  mx: number,
  my: number,
  hasBody: (id: BubbleId) => boolean,
  insetOf?: (id: BubbleId) => Inset,
): SpaceId {
  const p = pickAt(input, mx, my).bub;
  return !p ? 'root' : inContent(p, mx, my, hasBody, insetOf) ? p.id : p.space;
}

/**
 * 模型だけで当てる（DOM を使わない）。lab.html 1177-1190 行 `hitModel`。
 * ★ ラボは掴んでいるあいだ「解き直す → DOM に写す → DOM で当てる」を1フレームの中でやるが、
 *   React は書き換えが次のフレームなので、ドラッグしているあいだの落とし先はこちらで当てる
 *   ── そうしないと1フレーム前の DOM を突いて、印と答えが食い違う。
 */
export function hitModelAt(
  layout: Layout,
  tiny: ReadonlySet<BubbleId>,
  skip: ReadonlySet<BubbleId> | null,
  mx: number,
  my: number,
): Placement | null {
  for (let i = layout.order.length - 1; i >= 0; i--) {
    const p = layout.order[i];
    if (!(p.vis > 0) || tiny.has(p.id) || (skip && skip.has(p.id))) continue; // ★ 描かない泡は掴めない
    if (p.b.state.implicit) {
      if (onRing(p, mx, my)) return p;
      continue;
    }
    if (inBox(p, mx, my)) return p;
  }
  return null;
}

/** 上の模型版で「カーソルの下の空間」を出す */
export function spaceModelAt(
  layout: Layout,
  tiny: ReadonlySet<BubbleId>,
  skip: ReadonlySet<BubbleId> | null,
  mx: number,
  my: number,
  hasBody: (id: BubbleId) => boolean,
  insetOf?: (id: BubbleId) => Inset,
): SpaceId {
  const p = hitModelAt(layout, tiny, skip, mx, my);
  return !p ? 'root' : inContent(p, mx, my, hasBody, insetOf) ? p.id : p.space;
}
