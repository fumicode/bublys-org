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

export const inBox = (p: Placement, mx: number, my: number): boolean =>
  mx >= p.x && mx <= p.x + p.w && my >= p.y && my <= p.y + p.h;

/** ③ 見えない親に当たるのは外周だけ（箱を持たないので、並びの中のすき間は外の空間の背景） */
export const onRing = (p: Placement, mx: number, my: number): boolean =>
  mx >= p.x - RING && mx <= p.x + p.w + RING && my >= p.y - RING && my <= p.y + p.h + RING &&
  !(mx >= p.x && mx <= p.x + p.w && my >= p.y && my <= p.y + p.h);

export const onHandle = (p: Placement | null, mx: number, my: number): boolean =>
  !!p && mx >= p.x + p.w - HANDLE_IN && mx <= p.x + p.w + HANDLE_OUT &&
  my >= p.y + p.h - HANDLE_IN && my <= p.y + p.h + HANDLE_OUT;

/**
 * 「中身の箱」に入っているか（ヘッダは外側の空間のもの）。中身の箱を突いたら、その泡は掴めない。
 * 見えない親は縁でしか当たらないので、いつも「掴む」。
 *
 * ★ hasBody は「空間を持つ泡」だけでなく「**本文を持つ泡**」にも同じ扱いをするための口。
 *   本文が本物の UI（ボタン・選択欄）のとき、そこを突いて泡が動いたら中身が触れない。
 *   既存 bubbles-ui も「ヘッダで掴む」なので、規則を増やさずにそろう。
 */
export const inContent = (p: Placement, my: number, hasBody: (id: BubbleId) => boolean): boolean =>
  !p.b.state.implicit && hasBody(p.id) && my >= p.y + METRICS.HEADER * p.scale;

export interface PickInput {
  readonly layout: Layout;
  /** 描かなかった泡（掴めない） */
  readonly tiny: ReadonlySet<BubbleId>;
  readonly selectedId: BubbleId | null;
  /** 泡を載せている層の要素（ここまで来たら背景） */
  readonly layer: Element;
  /** 層の左上（画面座標）。掴んだ点はここからの相対で測る */
  readonly origin: { readonly x: number; readonly y: number };
  /** 大きさの角の要素 */
  readonly handleEl: Element | null;
}

export interface Picked {
  readonly handle: Placement | null;
  readonly bub: Placement | null;
}

/** カーソルの下の泡と角。mx, my は層の左上から測った座標 */
export function pickAt(input: PickInput, mx: number, my: number): Picked {
  const { layout, tiny, selectedId, layer, origin, handleEl } = input;
  const list = document.elementsFromPoint(mx + origin.x, my + origin.y);
  let handle: Placement | null = null;
  let bub: Placement | null = null;
  for (const el of list) {
    if (!el.classList) continue;
    if (handleEl && el === handleEl) {
      // 大きさの角（泡の外に置いてある）
      const p = selectedId ? layout.byId.get(selectedId) ?? null : null;
      if (!handle && p && p.vis > 0 && !tiny.has(p.id) && !p.b.state.implicit && onHandle(p, mx, my)) handle = p;
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
): SpaceId {
  const p = pickAt(input, mx, my).bub;
  return !p ? 'root' : inContent(p, my, hasBody) ? p.id : p.space;
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
): SpaceId {
  const p = hitModelAt(layout, tiny, skip, mx, my);
  return !p ? 'root' : inContent(p, my, hasBody) ? p.id : p.space;
}
