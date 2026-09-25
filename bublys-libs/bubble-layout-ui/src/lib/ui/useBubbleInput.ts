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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import {
  actContext,
  applySnap,
  chromeOf,
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
  wheelScroll,
  wheelSpace,
  wheelZ,
  zoomedBy,
} from '@bublys-org/bubble-layout';
import type {
  BubbleId, BubbleWorld, ChromeMap, DragVerbs, DropMarks, DropSlot, Layout,
  LayoutRules, ScreenRects, SeenRects, SpaceId, Viewport,
} from '@bublys-org/bubble-layout';
import { markTiny, DRAW_MIN } from './draw.js';
import { hitModelAt, inContent, onHandle, pickAt, spaceModelAt } from './hit.js';
import { withLift } from './lift.js';
import type { LiftState } from './lift.js';

/** ドラッグし始めたとみなす距離（画面 px）。lab.html 1243 行 */
const DRAG_START = 3;
/**
 * ホイールが「一続きの手」とみなされる間（ms）。
 * 慣性つきのトラックパッドでも途切れない程度に取る ── 跳ね返りを**一続きにつき 1 回**にするのに使う。
 */
const WHEEL_GESTURE_GAP = 250;

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
  /**
   * **画面2の寄り**と、その書き込み口。入れ子の海では**外の画面のもの**が渡ってくる
   * ── 画面2は1枚しか無いので、海ごとに持つと掛け算になる。
   * 省いたら自分の世界のもの（いちばん外の海）。
   */
  readonly zoom?: number;
  readonly setZoom?: (zoom: number) => void;
  /**
   * **これ以上いけない**（奥行きの端で回し続けた）。行き過ぎて戻る山を描くのは呼ぶ側
   * ── 焦点をそのフレームだけ動かす（`resolveWorld` の `nudge`）ので、世界には何も書かない。
   * @param dir −1 ＝ 手前の端、+1 ＝ 奥の端
   * @param step その軸の 1 刻み（行き過ぎる量をこれで測る）
   */
  readonly onOverscroll?: (space: SpaceId, dir: -1 | 1, step: number) => void;
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
  readonly chrome?: ChromeMap;
  /**
   * 並べたあとに外へ足した装い（`resolveWorld` の `dressed`）。
   *
   * ★ **触る側もこれを見る。** 見ていないと、装いを出した札の帯を押しても
   *   「中身を押した」ことになり、**掴めない**（選んだ札を持ち出せなくなっていた）。
   *   描いてある帯と、掴める帯は同じでなければならない。
   */
  readonly dressed?: ReadonlyMap<BubbleId, { readonly top: number }>;
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
  /**
   * **手を離したときに 1 つ。** 動かした・大きさを変えた、が済んだ合図。
   * 触っただけ（動かさずに離した）では出ない ── 焦点が寄るだけで、世界の値は 1 つも変わらないから。
   */
  readonly onSettled?: () => void;
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
    readonly onLostPointerCapture: (e: ReactPointerEvent<HTMLDivElement>) => void;
  };
  /** 持ち上げを当てたあとの配置。`BubbleField` にはこれを渡す */
  readonly layout: Layout;
  /** 掴んでいる泡とその中身（掴めなくする） */
  readonly skipGrab: ReadonlySet<BubbleId> | null;
  /**
   * 掴んでいる泡**そのもの**（中身は含まない）。
   * 箱の縁で切らないのはこれ 1 つだけ ── 中身まで切らずにいると、窓を掴んだ瞬間に
   * 中の札の留めが外れて、送って隠してあったものが箱の外へ出てくる。
   */
  readonly grabbedId: BubbleId | null;
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
  /**
   * **中身を触って選んだ泡**（掴みは始めていない）。
   *
   * ★ ②「触った泡へ視点が寄る」は、枠を触ったときだけのものではない。
   *   中身を触って選んだときも、離したところで同じ道を通す ── でないと、
   *   **全部が写っていないビュー**（奥行きに重ねる・魚眼）で選んだ泡が端に居たまま見えない。
   *   平行な軸では `focusOn` が何もしないので、全部写っているビューでは今までどおり動かない。
   */
  const touched = useRef<{ id: BubbleId; mx: number; my: number } | null>(null);
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

  const chrome = o.chrome;
  const ctx = useCallback(
    () => actContext(viewport, seen.current, rules, chrome),
    [viewport, rules, chrome],
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
  /**
   * その泡の**枠が上に取るぶん**（装いの top）。当たり判定はここで中身と枠を分ける。
   * 固定の 24 ではなく**着ている装い**から取る ── 装いを出していない札では 1px しか取らない。
   */
  const headOf = useCallback(
    (id: BubbleId) => chromeOf(world, id, chrome).top + (o.dressed?.get(id)?.top ?? 0),
    [world, chrome, o.dressed],
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
    touched.current = null;
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
    if (p0 && !world.isHost(p0.id) && inContent(p0, my, hasBody, headOf)) {
      /**
       * ★ **触ったら選ぶ。掴みはしない。**
       *   選ぶのは「いま相手にしている泡」を決めることなので、中身を触っても起きてよい。
       *   掴んで動かすのは枠だけ ── 中身のボタンを押したいだけなのに泡が動いては困る。
       *
       * ★ 前は選ぶのもしなかった。中身を触ると**一覧の札が装いを出して背が伸び、
       *   押したかった所が動いた**から ── いまは札が装いを出さない（`space-css` の `.bl-quiet`）ので、
       *   選んでも画面の上では 1px も動かない。
       */
      setSelectedId(p0.id);
      touched.current = { id: p0.id, mx, my };
      drag.current = null;
      show();
      return;
    }
    if (p0 && !inContent(p0, my, hasBody, headOf)) {
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
  }, [world, layout, rules, pt, pickInput, hasBody, headOf, setSelectedId, layerRef]);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) {
      // 中身を触ったまま動かした ── 触ったのではなく、中身を扱っている。寄せない
      const t = touched.current;
      if (t) {
        const { mx, my } = pt(e);
        if (Math.hypot(mx - t.mx, my - t.my) >= DRAG_START) touched.current = null;
      }
      return;
    }
    /**
     * ★ **ボタンが離れていたら、掴みを黙って捨てる。**
     *
     *   離した瞬間（`pointerup`）を取りこぼすことがある ── 捕まえたポインタが何かの拍子に
     *   外れると、離しは層に来ない。そのまま掴みが残ると、**押していないただの移動で
     *   海が動き続ける**（実測：海を1回クリックしたあと、指を離しても視点がついてくる）。
     *   ここで捨てれば、取りこぼしても**次のひと動きで必ず止まる**。
     *
     *   ★ 「触った」（② 焦点が寄る）は起こさない ── 離しを取りこぼしている以上、
     *     タップだったのか分からない。正しく離せたときは `onPointerUp` が拾う。
     */
    if (e.buttons === 0) {
      drag.current = null;
      o.onDragInfo?.(null);
      show();
      return;
    }
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
      const after = resolveWorld(next, viewport, rules, chrome, undefined, o.dressed as never);
      const afterTiny = markTiny(next, after, drawMin);
      const held: LiftState = {
        id: d.id, skip: d.skip ?? new Set(), lift: !!d.lift, out: !!d.slot?.out,
        verbs: d.verbs ?? { x: 'none', y: 'none' },
        scale0: d.scale0 ?? 1, fx: d.fx ?? 0.5, fy: d.fy ?? 0.5, mx, my,
      };
      const shown = withLift(after, held);
      const rect = shown.byId.get(d.id);
      const screen: ScreenRects = new Map(shown.order.map((q) => [q.id, { x: q.x, y: q.y, w: q.w, h: q.h }]));
      const hitSpace = spaceModelAt(shown, afterTiny, d.skip ?? null, mx, my, (id) => next.isHost(id) || (hasContent ? hasContent(id) : false), (id) => chromeOf(next, id, chrome).top + (o.dressed?.get(id)?.top ?? 0));
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
    const t = touched.current;
    drag.current = null;
    touched.current = null;
    o.onDragInfo?.(null);
    if (!d) {
      // ② 中身を触って、動かさずに離した ＝ 触った。その泡へ視点が寄る（値は1つも書かない）
      if (t) setWorld(focusOn(world, layout, t.id, rules));
      return;
    }
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
        // 横取りされた＝この海から出て行った。顔ぶれが変わったことは横取りした側が知らせる
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
    // 動かし終え・広げ終えた（`onSettled` の註）
    o.onSettled?.();
  }, [world, layout, rules, setWorld, ctx, lifted, o, pt]);

  /**
   * **スクロールとズームは別の操作。**
   *
   * | 手 | 動くもの |
   * |---|---|
   * | 背景をドラッグ | 海の平行移動（X・Y の焦点） |
   * | ホイール | **海の奥行き**（Z の焦点 ＝ 画面1）。泡のいる範囲で止まる |
   * | ピンチ（⌘/Ctrl ＋ ホイール）／**左ボタンを押しながらホイール** | **画面2の寄り**。上限は無い |
   *
   * ★ 左ボタンを押しながら、でも寄れる ── ピンチの無いマウスのため。
   *   そのとき**掴みかけは捨てる**（`drag.current = null`）。押していたのは寄るための合図で、
   *   動かすつもりではないから ── 残すと、寄ったあとの1回目の move で掴んだ点の u が
   *   食い違って**画面が飛ぶ**（掴んだときの u は寄る前の倍率で測ってある）。
   *
   * ★ ラボもホイールは奥行きだけだった（lab.html 1638-1646 行。ズームは無い）。
   *   一度ホイールに「奥行きで動けなかったぶんは寄りへ」を足したが、
   *   **奥行きを繰ろうとしただけで画面ごと寄ってしまう**。混ぜない。
   * ★ 食うのはいちばん内側の海ひとつだけ（`stopPropagation`）── 入れ子の海は DOM も
   *   入れ子なので、止めないと内側と外側が別々に動いて**掛け算になる**（実測で踏んだ）。
   * ★ ネイティブの listener で受ける（`{ passive: false }`）。React の onWheel は passive なので
   *   `preventDefault` が効かず、ピンチがブラウザの拡大に取られる。ラボも同じにしている。
   */
  /** 前のホイールが来た時刻と、跳ね返りの弾。端に着いたら 1 回だけ撃って、動いたら込め直す */
  const lastWheelAt = useRef(0);
  /**
   * 送りの手が続いているあいだ立つ旗（滑らかさを切る）。
   * 手が止まって `WHEEL_GESTURE_GAP` 経ったら下ろす ── そのとき泡はもう行き先に居るので、
   * 滑らかさが戻っても何も動かない。
   */
  const [panning, setPanning] = useState(false);
  const panTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (panTimer.current !== null) clearTimeout(panTimer.current); }, []);
  const bounceArmed = useRef(true);
  const onWheelRef = useRef<(e: WheelEvent) => void>(() => undefined);
  onWheelRef.current = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { mx, my } = pt(e);
    // 左ボタンを押しながら（`buttons` の 1 ビット目）も、ピンチと同じ
    if (e.ctrlKey || e.metaKey || (e.buttons & 1) !== 0) {
      if (drag.current) {
        drag.current = null;                 // 掴みかけは捨てる（押していたのは寄るための合図）
        show();
      }
      // 画面2 ── 海は1ミリも動かない（値も焦点も書かない）
      const now = o.zoom ?? world.zoom;
      (o.setZoom ?? ((z: number) => setWorld(world.withZoom(z))))(zoomedBy(now, e.deltaY));
      return;
    }
    // ★ 受け手は wheelZ と**同じ出し方**で出す（札の上で回したら、その札がいる空間まで外へ通す）
    const space = wheelSpace(world, layout, spaceModelAt(lifted, tiny, null, mx, my, hasBody, headOf));
    /**
     * ★ **収まらない並びは、まずスクロールに使う。**
     *   縦に並べる・横に並べるで中身が箱に入りきらないとき、送る道がここしかない
     *   （平行の軸なので、触っても寄らない）。収まっていれば `null` が返り、
     *   今までどおり奥行きを繰る（`wheelZ`）。
     */
    const scrolled = wheelScroll(world, layout, space, { x: e.deltaX, y: e.deltaY }, rules);
    if (scrolled) {
      setWorld(scrolled);
      bounceArmed.current = true;
      /**
       * ★ **送っている間は滑らせない**（掴んでいる間と同じ）。
       *
       *   滑らかさ（320ms）は「**置き場所が変わった**ことを見せる」ためのもので、
       *   送り（スクロール）は置き場所が変わったのではなく**見ている所が動いた**だけ。
       *   滑らせると手より 280ms 遅れて付いてくる（実測：1 刻み送って塗りが着くまで
       *   18ms で −5px、144ms で −35px、277ms で −40px）。縦に長く送るぶんには
       *   「滑らか」に見えるが、**自分の軸でない向き**は動ける幅が数十 px しかないので、
       *   動き全部が滑りになって「遅れて効く」と映る。
       * ★ **繰る（魚眼）は滑らせたまま。** あちらは 1 刻み ＝ 札 1 枚の**飛び**なので、
       *   間を滑らせるほうが何が起きたか読める。見分けるのは軸のレンズ ──
       *   平行な軸が動いたなら送り、魚眼の軸が動いたなら繰り。
       */
      const L0 = layout.spaces.get(space);
      const panned =
        !!L0 &&
        (["x", "y"] as const).some(
          (a) => L0.view[a].lens === "parallel" && scrolled.focusOf(space)[a] !== world.focusOf(space)[a],
        );
      if (panned) {
        setPanning(true);
        if (panTimer.current !== null) clearTimeout(panTimer.current);
        panTimer.current = setTimeout(() => {
          panTimer.current = null;
          setPanning(false);
        }, WHEEL_GESTURE_GAP);
      }
      return;
    }
    const next = wheelZ(world, layout, space, e.deltaY, rules);
    const moved = next.focusOf(space).z !== world.focusOf(space).z;
    /**
     * ★ **跳ね返りは一続きの手につき 1 回。**
     *   ホイールは慣性で何十回も来るので、来るたびに鳴らすと何度も跳ねる。
     *   動いているあいだは弾を込め直し、端に着いたら 1 回だけ撃つ。
     *   手が止まって（`WHEEL_GESTURE_GAP`）から回し直せば、また 1 回。
     */
    const now = e.timeStamp || Date.now();
    if (now - lastWheelAt.current > WHEEL_GESTURE_GAP) bounceArmed.current = true;
    lastWheelAt.current = now;
    if (moved) { setWorld(next); bounceArmed.current = true; return; }
    /**
     * ★ **跳ね返りは、奥行きが本当にある並びの端だけ。**
     *
     *   Z に次元が無い空間（縦に並べる・横に並べる など）では、ホイールはもともと何もしない
     *   ── そこで跳ねると「効かない」を「端だ」と言い違えることになる。
     *   面が 1 つしかない空間（海の泡はふつう全部 z 0）も同じ。
     *   跳ねるのは**面が 2 つ以上ある透視の並び**（奥行きに重ねる・履歴を奥行きに）だけ。
     */
    const L = layout.spaces.get(space);
    if (!L || L.view.z.dim === 'none') return;
    if (new Set(L.arr.z.pos.values()).size < 2) return;
    if (!bounceArmed.current) return;
    bounceArmed.current = false;
    o.onOverscroll?.(space, e.deltaY < 0 ? -1 : 1, L.view.z.step || 1);
  };
  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;
    const on = (e: WheelEvent) => onWheelRef.current(e);
    el.addEventListener('wheel', on, { passive: false });
    return () => el.removeEventListener('wheel', on);
  }, [layerRef]);

  return {
    handlers: {
      onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag,
      // ★ 捕まえたポインタが外れたら終わり（lab.html 1636 行 lostpointercapture）
      onLostPointerCapture: endDrag,
    },
    layout: lifted,
    skipGrab: view.skip,
    grabbedId: view.lift?.id ?? null,
    marks: view.marks,
    // ★ 送っている間も「生きている」── 滑らかさを切るのは掴んでいる間と同じ
    dragging: view.dragging || panning,
  };
}

/** 角に当たっているか（カーソルの形を変えるときに使う） */
export { onHandle, hitModelAt };
