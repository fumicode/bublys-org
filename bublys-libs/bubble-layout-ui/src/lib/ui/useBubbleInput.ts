/**
 * 触る ── 掴む・ドラッグする・離す・ホイール・角。lab.html 1203-1650 行。
 *
 * ★ 値を書くのは domain の動詞（`dragBubble` `dragFocus` `wheelZ` `resizeBubble` `commitDrop` `focusOn`）。
 *   ここがやるのは「何を掴んだか」を決めて、**画面の量を模型の言葉に噛み砕く**ところまで。
 *
 * ★ ② 触るのは「見る」ことであって「動かす」ことではない ── 押した時点では何も書かない。
 *   焦点が寄るのは「ドラッグせずに離した」ときだけ。
 *
 * ★ ラボとの違いが1つある（正直に書く）：ラボはドラッグしているあいだ
 *   「解き直す → DOM に写す → DOM で当てる」を1フレームでやるが、React は書き換えが次のフレームなので、
 *   ドラッグしているあいだの落とし先は**模型で当てる**（`hitModelAt`）。押した瞬間だけは DOM で当てる。
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject, WheelEvent as ReactWheelEvent } from 'react';
import {
  actContext,
  applySnap,
  commitDrop,
  dragBubble,
  dragFocus,
  dragVerbsOf,
  dropTargetAt,
  focusOn,
  liftsOf,
  measureBox,
  movesOf,

  resizeBubble,
  resolveRules,
  resolveWorld,
  unprojectLocal,
  wheelZ,
} from '@bublys-org/bubble-layout';
import type {
  BubbleId, BubbleWorld, DragVerbs, DropMarks, DropSlot, GrownHeights, Layout,
  LayoutRules, ScreenRects, SeenRects, SpaceId, Viewport,
} from '@bublys-org/bubble-layout';
import { markTiny, DRAW_MIN } from './draw.js';
import { hitModelAt, inContent, onHandle, pickAt, spaceModelAt } from './hit.js';
import { withLift } from './lift.js';
import type { LiftState } from './lift.js';

/** ドラッグし始めたとみなす距離（画面 px）。lab.html 1243 行 */
const DRAG_START = 3;

type DragKind = 'bubble' | 'focus' | 'resize';

/** 手つきのうち、**描くのに要る分**だけ（これだけが state。残りは ref の帳面） */
interface DragView {
  readonly lift: LiftState | null;
  readonly marks: DropMarks | null;
  readonly skip: ReadonlySet<BubbleId> | null;
  readonly dragging: boolean;
}
const NO_DRAG: DragView = { lift: null, marks: null, skip: null, dragging: false };

interface DragState {
  kind: DragKind;
  id: BubbleId;
  space: SpaceId;
  started: boolean;
  mx0: number; my0: number;
  mx: number; my: number;
  /** bubble */
  verbs?: DragVerbs;
  moves?: boolean;
  lift?: boolean;
  fx?: number; fy?: number;
  scale0?: number;
  skip?: ReadonlySet<BubbleId>;
  slot?: DropSlot | null;
  marks?: DropMarks | null;
  /** focus */
  f0?: { x: number; y: number };
  u0?: { x: number; y: number };
  /** resize */
  size0?: { w: number; h: number };
  at?: { x: number; y: number };
}

export interface BubbleInputOptions {
  readonly world: BubbleWorld;
  readonly setWorld: (next: BubbleWorld) => void;
  /** `resolveWorld` の答え（持ち上げる前） */
  readonly layout: Layout;
  readonly viewport: Viewport;
  readonly selectedId: BubbleId | null;
  readonly setSelectedId: (id: BubbleId | null) => void;
  readonly drawMin?: number;
  readonly rules?: Partial<LayoutRules>;
  /**
   * このフレームだけ背を伸ばす泡（`layout` を解くのに使ったのと**同じもの**を渡す）。
   * ⑤ pin は解き直しながら留めるので、渡さないと伸びているぶんだけ留め先がずれる。
   */
  readonly grown?: GrownHeights;
  /** 泡を載せている層 */
  readonly layerRef: RefObject<HTMLDivElement | null>;
  /**
   * 本文を持つ泡（中身が本物の UI）。ここを突いても泡は掴めない ── ヘッダで掴む。
   * 空間を持つ泡（world.isHost）は言わなくてもそう扱う。
   */
  readonly hasContent?: (id: BubbleId) => boolean;
  /**
   * 離したところを、**空間の外に居る誰か**が横取りできる口（岸に貼る、など）。
   *
   * `true` を返したら、この落とし先は使わない ── 泡をどうするか（海から出すなど）は
   * 横取りした側の仕事。規則には無い話なので domain には入れない。
   */
  readonly claimDrop?: (info: ClaimDropInfo) => boolean;
  /**
   * ドラッグしている間ずっと、いまの居場所を知らせる（予告を出すため）。
   * 掴んでいないとき・離したあとは `null` が来る。
   */
  readonly onDragInfo?: (info: ClaimDropInfo | null) => void;
}

/** 離した瞬間の、泡と指の居場所（どちらも層の座標） */
export interface ClaimDropInfo {
  readonly id: BubbleId;
  readonly pointer: { readonly x: number; readonly y: number };
  /** いま画面に写っている矩形（レンズを通したあと） */
  readonly rect: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  /**
   * 泡が**自分で持っている大きさ**（レンズを通す前）。
   * 魚眼の掛かった向きでは、縁へ寄るほど写る幅が潰れる ── 写った大きさで渡すと、
   * 横取りした側が「端に飲み込まれた薄い帯」を貼ることになる。
   */
  readonly size: { readonly w: number; readonly h: number };
}

export interface BubbleInput {
  readonly handlers: {
    readonly onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
    readonly onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
    readonly onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
    readonly onPointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => void;
    readonly onWheel: (e: ReactWheelEvent<HTMLDivElement>) => void;
  };
  /** 持ち上げを当てたあとの配置。`BubbleField` にはこれを渡す */
  readonly layout: Layout;
  /** 掴んでいる泡とその中身（掴めなくする） */
  readonly skipGrab: ReadonlySet<BubbleId> | null;
  /** いま離したらどうなるか */
  readonly marks: DropMarks | null;
  readonly dragging: boolean;
}

export function useBubbleInput(o: BubbleInputOptions): BubbleInput {
  const { world, setWorld, layout, viewport, selectedId, setSelectedId, layerRef } = o;
  const drawMin = o.drawMin ?? DRAW_MIN;
  const rules = useMemo(() => resolveRules(o.rules), [o.rules]);

  // 手つきそのものは ref（書き換えても描き直さなくてよい帳面）。
  // 描くのに要る分だけを state に写す ── これが無いと、持ち上げた泡が画面で動かない
  const drag = useRef<DragState | null>(null);
  const [view, setView] = useState<DragView>(NO_DRAG);
  const show = () => {
    const d = drag.current;
    if (!d || !d.started) { setView(NO_DRAG); return; }
    setView({
      lift: d.kind === "bubble" && d.skip
        ? {
            id: d.id, skip: d.skip, lift: !!d.lift, out: !!d.slot?.out,
            verbs: d.verbs ?? { x: "none", y: "none" },
            scale0: d.scale0 ?? 1, fx: d.fx ?? 0.5, fy: d.fy ?? 0.5, mx: d.mx, my: d.my,
          }
        : null,
      marks: d.marks ?? null,
      skip: d.kind === "bubble" ? d.skip ?? null : null,
      dragging: true,
    });
  };

  const tiny = useMemo(() => markTiny(world, layout, drawMin), [world, layout, drawMin]);
  const lifted = useMemo(() => withLift(layout, view.lift), [layout, view.lift]);

  /**
   * ⑤ の起点：前のフレームで**画面に見えていた**矩形。
   *
   * ★ **持ち上げを当てたあと**（`lifted`）で取る ── 掴んでいる泡は持ち上げでカーソルに
   *   付いてきており、画面に見えているのはそちらだから。ラボも描いた配置そのもの
   *   （`frameItems = sink.concat(lifted)`、lab.html 828 行）を ⑤ の起点にしている。
   *   持ち上げる前の配置で取ると、掴んだ泡の「見えていた所」が**並びの中の元の席**になり、
   *   並びから引き出して離した泡が**元の席へ引き戻される**（実測：引き出して下に置いたのに、
   *   元の位置へ戻り、残ったほうは画面の外へ飛んだ）。
   */
  const seen = useRef<SeenRects>(new Map());
  seen.current = useMemo(
    () => new Map(lifted.order.map((p) => [p.id, { x: p.x, y: p.y, w: p.box.w, h: p.box.h, scale: p.scale }])),
    [lifted],
  );

  const grown = o.grown;
  const ctx = useCallback(
    () => actContext(viewport, seen.current, rules, grown),
    [viewport, rules, grown],
  );

  /**
   * 泡が自分で持っている大きさ（レンズを通す前）。
   * 写った大きさ（`p.w`/`p.h`）は魚眼で潰れるので、岸へ渡すのはこちら。
   */
  const ownSize = useCallback(
    (id: BubbleId, p: { w: number; h: number }) => {
      const b = world.bubble(id);
      return b ? { w: b.state.size.w, h: b.state.size.h } : { w: p.w, h: p.h };
    },
    [world],
  );

  /**
   * 層に掛かっている拡大率 ── **画面の px と層の px の比**。
   *
   * 層が拡大縮小された中に居ると（＝空間を持つ泡の中の海）、画面で測った距離は
   * そのまま層の距離にならない。層の「画面での幅 ÷ レイアウトの幅」がその比で、
   * 大元の画面では 1 になる。
   */
  const scaleOf = useCallback((layer: HTMLElement | null, r?: DOMRect): number => {
    if (!layer || layer.offsetWidth <= 0) return 1;
    const width = (r ?? layer.getBoundingClientRect()).width;
    return width > 0 ? width / layer.offsetWidth : 1;
  }, []);

  /** 層の左上から測ったカーソル（**層の px**。画面の px ではない） */
  const pt = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const layer = layerRef.current;
      const r = layer?.getBoundingClientRect();
      const k = scaleOf(layer ?? null, r);
      return { mx: (e.clientX - (r?.left ?? 0)) / k, my: (e.clientY - (r?.top ?? 0)) / k };
    },
    [layerRef, scaleOf],
  );
  const pickInput = useCallback(() => {
    const layer = layerRef.current;
    const r = layer?.getBoundingClientRect();
    return {
      layout: lifted, tiny, selectedId,
      layer: layer as Element,
      origin: { x: r?.left ?? 0, y: r?.top ?? 0 },
      scale: scaleOf(layer ?? null, r),
      // ★ **自分の層の角だけ**を拾う（`:scope >`）。空間を持つ泡の中には入れ子の層が居て、
      //   そちらの角のほうが DOM の並びでは先に来る（角は層の最後の子）。
      //   ただの `.bl-hnd` で引くと中の角を掴んでしまい、自分の泡の大きさが変えられなくなる
      handleEl: layer?.querySelector(':scope > .bl-hnd') ?? null,
    };
  }, [layerRef, lifted, tiny, selectedId, scaleOf]);
  const hasContent = o.hasContent;
  const hasBody = useCallback(
    (id: BubbleId) => world.isHost(id) || (hasContent ? hasContent(id) : false),
    [world, hasContent],
  );

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!layerRef.current) return;
    const { mx, my } = pt(e);
    /**
     * ★ 掴むと決まってから捕まえる。
     *   押した時点で `setPointerCapture` すると、そのあとの **click / dblclick まで層に来る**
     *   （捕まえると互換のマウスイベントも捕まえた要素へ配られる）。
     *   泡の中身が本物の UI のとき、これだとボタンもダブルクリックも死ぬ。
     */
    const capture = () => layerRef.current?.setPointerCapture(e.pointerId);
    const pick = pickAt(pickInput(), mx, my);

    if (pick.handle) {
      // ドラッグするのは見えている箱の角：中身で伸びた箱なら、伸びた大きさから始める
      const sel = pick.handle;
      capture();
      drag.current = {
        kind: 'resize', id: sel.id, space: sel.space, started: true,
        mx0: mx, my0: my, mx, my,
        size0: { ...measureBox(world, sel.id, layout.boxes, rules) },
        scale0: sel.scale, at: { x: sel.x, y: sel.y },
      };
      show();
      return;
    }

    const p0 = pick.bub;
    /**
     * ★ 本文（空間ではない中身）を押したら、**何も始めない**。それは中身のもの。
     *   空間を持つ泡の中身の箱は今までどおり「その空間の焦点をドラッグする」（ラボと同じ）。
     */
    if (p0 && !world.isHost(p0.id) && inContent(p0, my, hasBody)) {
      /**
       * ★ **選ぶのもしない。** 中身に触ろうとしただけで泡が選ばれると、
       *   一覧では触った札が装いを出して背まで伸び、**押したかった所が動く**。
       *   選ぶのは泡の枠（ヘッダや縁）を触ったとき ── 中身は中身のもの。
       */
      drag.current = null;
      show();
      return;
    }
    if (p0 && !inContent(p0, my, hasBody)) {
      capture();
      setSelectedId(p0.id);
      // ★ 押した時点では何も書かない。焦点が寄るのは「ドラッグせずに離した」ときだけ
      const verbs = dragVerbsOf(world, p0.space);
      drag.current = {
        kind: 'bubble', id: p0.id, space: p0.space, verbs,
        moves: movesOf(verbs), lift: liftsOf(verbs),
        started: false, mx0: mx, my0: my, mx, my,
        fx: (mx - p0.x) / p0.w, fy: (my - p0.y) / p0.h, scale0: p0.scale,
        skip: world.subtreeOf(p0.id), slot: null, marks: null,
      };
    } else {
      /**
       * 背景：カーソルの下の空間の焦点を動かす（掴んだ点がカーソルについてくるように）。
       *
       * ★ **背景を押したら選ぶのをやめる。** 選ぶ手はあったのに、やめる手が無かった
       *   （ラボも同じ ── 選んでいる印が輪だけだったので誰も困らなかった）。
       *   いまは選んだ札が装いを出して背も伸びるので、やめられないと戻せない。
       *   「触っていないなら選んでいない」が素直なので、背景を触ったら外す。
       */
      setSelectedId(null);
      const space = p0 ? p0.id : 'root';
      const L = layout.spaces.get(space);
      if (!L) { drag.current = null; return; }
      capture();
      drag.current = {
        kind: 'focus', id: space, space, started: false,
        mx0: mx, my0: my, mx, my,
        f0: { x: L.focus.x, y: L.focus.y },
        u0: { x: unprojectLocal(L, 'x', mx), y: unprojectLocal(L, 'y', my) },
      };
    }
    show();
  }, [world, layout, rules, pt, pickInput, hasBody, setSelectedId, layerRef]);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const { mx, my } = pt(e);
    if (!d.started && Math.hypot(mx - d.mx0, my - d.my0) < DRAG_START) return;
    d.started = true;
    d.mx = mx; d.my = my;

    if (d.kind === 'resize') {
      setWorld(resizeBubble(world, ctx(), {
        id: d.id, size0: d.size0 ?? { w: 40, h: 34 },
        by: { x: mx - d.mx0, y: my - d.my0 },
        scale: d.scale0 ?? 1, at: d.at ?? { x: 0, y: 0 },
      }));
      show();
      return;
    }
    if (d.kind === 'focus') {
      setWorld(dragFocus(world, {
        layout, space: d.space,
        from: d.f0 ?? { x: 0, y: 0 }, u0: d.u0 ?? { x: 0, y: 0 },
        pointer: { x: mx, y: my },
      }, rules));
      show();
      return;
    }

    // 泡をドラッグする：軸ごとに、書けるなら書く／書けないなら焦点／なしなら何もしない
    const p = lifted.byId.get(d.id);
    if (!p) return;
    const want = {
      x: mx - ((d.fx ?? 0.5) - 0.5) * p.w,
      y: my - ((d.fy ?? 0.5) - 0.5) * p.h,
    };
    const next = dragBubble(world, { layout, id: d.id, space: d.space, want, m: p.m }, rules);
    setWorld(next);

    // 予告のために、いまの居場所を外へ知らせる（岸がここで「着くならここ」を描く）
    o.onDragInfo?.({ id: d.id, pointer: { x: mx, y: my }, rect: { x: p.x, y: p.y, w: p.w, h: p.h }, size: ownSize(d.id, p) });

    if (d.moves) {
      // 印は「いま離したらどうなるか」。書いたばかりの値で解き直してから見る
      const after = resolveWorld(next, viewport, rules, grown);
      const afterTiny = markTiny(next, after, drawMin);
      const held: LiftState = {
        id: d.id, skip: d.skip ?? new Set(), lift: !!d.lift, out: !!d.slot?.out,
        verbs: d.verbs ?? { x: 'none', y: 'none' },
        scale0: d.scale0 ?? 1, fx: d.fx ?? 0.5, fy: d.fy ?? 0.5, mx, my,
      };
      const shown = withLift(after, held);
      const rect = shown.byId.get(d.id);
      const screen: ScreenRects = new Map(shown.order.map((q) => [q.id, { x: q.x, y: q.y, w: q.w, h: q.h }]));
      const hitSpace = spaceModelAt(shown, afterTiny, d.skip ?? null, mx, my, (id) => next.isHost(id) || (hasContent ? hasContent(id) : false));
      const t = rect
        ? dropTargetAt(next, {
            layout: after, screen, pointer: { x: mx, y: my }, hitSpace,
            grabbed: { id: d.id, space: d.space, rect: { x: rect.x, y: rect.y, w: rect.w, h: rect.h }, skip: d.skip ?? new Set() },
          }, rules)
        : null;
      d.slot = t?.slot ?? null;
      d.marks = t?.marks ?? null;
    }
    show();
  }, [world, layout, lifted, viewport, rules, drawMin, setWorld, ctx, pt, hasContent]);

  const endDrag = useCallback((e?: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    o.onDragInfo?.(null);
    if (!d) return;
    if (!d.started) {
      // ② ドラッグせずに離した ＝ 触った。その泡へ視点が寄る（値は1つも書かない）
      if (d.kind === 'bubble') setWorld(focusOn(world, layout, d.id, rules));
      show();
      return;
    }
    // ★ 空間の外（岸など）が先に横取りできる。取られたら落とし先は使わない
    if (d.kind === 'bubble' && o.claimDrop) {
      const p = lifted.byId.get(d.id);
      const at = e ? pt(e) : null;
      if (p && at && o.claimDrop({ id: d.id, pointer: { x: at.mx, y: at.my }, rect: { x: p.x, y: p.y, w: p.w, h: p.h }, size: ownSize(d.id, p) })) {
        show();
        return;
      }
    }
    if (d.kind === 'bubble' && d.slot) {
      const grabbed = {
        id: d.id, space: d.space, lift: !!d.lift,
        rect: { x: 0, y: 0, w: 0, h: 0 },
        skip: d.skip ?? new Set<BubbleId>(),
      };
      const r = d.slot.snap
        ? applySnap(world, ctx(), d.id, d.slot.snap)
        : commitDrop(world, ctx(), grabbed, d.slot);
      setWorld(r.world);
    }
    // ★ 大きさの角は `resizeBubble` の中で ⑤ pin まで済んでいるので、離すときにやることは無い
    show();
  }, [world, layout, rules, setWorld, ctx, lifted, o, pt]);

  const onWheel = useCallback((e: ReactWheelEvent<HTMLDivElement>) => {
    const { mx, my } = pt(e);
    const space = world.windowOf(spaceModelAt(lifted, tiny, null, mx, my, hasBody));
    setWorld(wheelZ(world, layout, space, e.deltaY, rules));
  }, [world, layout, lifted, tiny, rules, setWorld, pt, hasBody]);

  return {
    handlers: {
      onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, onWheel,
    },
    layout: lifted,
    skipGrab: view.skip,
    marks: view.marks,
    dragging: view.dragging,
  };
}

/** 角に当たっているか（カーソルの形を変えるときに使う） */
export { onHandle, hitModelAt };
