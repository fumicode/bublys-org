/**
 * 泡の空間 ── 世界を持ち、`bubble-layout-ui` に描かせ、url を画面にする。
 *
 * 既存 `bubbles-ui` の `BublyApp` ＋ `UniverseView` に当たる層。ただし薄い：
 * **並べ方も操作も domain と ui が持っている**ので、ここがやるのは
 * 「世界を持つ」「url を画面にする」「開く」の3つだけ。
 *
 * ★ 世界の置き場は外から渡せる（`world` / `onChange`）。渡さなければ自前で持つ。
 *   Redux に載せるかは、この検証のあとで決める ── CLAUDE.md の
 *   「スライスは集約のリポジトリに徹する」に沿うなら、載せるのは `WorldState` 丸ごと1つ。
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import type { CSSProperties, DragEvent as ReactDragEvent, ReactNode } from 'react';
import { actContext, emptyWorld, presetView, reshape, resolveWorld } from '@bublys-org/bubble-layout';
import type { BubbleId, BubbleWorld, LayoutRules, PresetId, Viewport } from '@bublys-org/bubble-layout';
import { BubbleField, BubbleShell, FIELD_CSS, MARKS_CSS, useBubbleInput } from '@bublys-org/bubble-layout-ui';
import type { BubbleDraw } from '@bublys-org/bubble-layout-ui';
import { BubbleSpaceContext, CurrentBubbleContext } from './context.js';
import type { BubbleSpaceApi } from './context.js';
import { matchBubbleRoute, renderRoute, titleOf } from './routing.js';
import type { BubbleRoute } from './routing.js';
import { openAt, settlePlaneAfterClose } from './openAt.js';
import type { OpenDepth } from './openAt.js';
import { SPACE_CSS } from './space-css.js';

/** 開いた泡の覚え書き（domain には入れない） */
interface Opened {
  readonly url: string;
  readonly type: string;
  readonly openerId: BubbleId | null;
  /** 開いた順（新しいほど大きい） */
  readonly at: number;
}

/**
 * ★ 「同じ種類の兄弟」を探す ── 続けて開いたとき、重ねずに隣へ並べるため。
 *
 * 条件は3つ：**同じ種類**（route の type）／**同じ元の泡から開いた**／
 * **同じ窓にいる**（見えない親に入っていても、窓は同じ）。
 * いちばん最近開いたものを返す。
 */
function mateFor(
  world: BubbleWorld,
  opened: ReadonlyMap<BubbleId, Opened>,
  type: string,
  openerId: BubbleId | null,
): BubbleId | null {
  const target = openerId ? world.windowOf(world.bubble(openerId)?.space ?? 'root') : 'root';
  let best: { id: BubbleId; at: number } | null = null;
  for (const [id, o] of opened) {
    if (o.type !== type || o.openerId !== openerId) continue;
    const b = world.bubble(id);
    if (!b || world.windowOf(b.space) !== target) continue;
    if (!best || o.at > best.at) best = { id, at: o.at };
  }
  return best ? best.id : null;
}

export interface BubbleSpaceProps {
  readonly routes: readonly BubbleRoute[];
  /** 空のときに最初に開く url */
  readonly initialUrls?: readonly string[];
  readonly viewport: Viewport;
  /** 外の空間の並べ方。既定は「自由に置く」（既存 bubbles-ui の宇宙と同じ） */
  readonly rootPreset?: PresetId;
  /** 奥行きの付け方。既定は `'fisheye-x'`。`'plane'` は旧 bubbles-ui の「面」を Z で書いたもの（v7 で試している） */
  readonly depth?: OpenDepth;
  readonly drawMin?: number;
  readonly rules?: Partial<LayoutRules>;
  /** 外で世界を持つなら渡す（Redux など）。渡さなければ自前で持つ */
  readonly world?: BubbleWorld;
  readonly onChange?: (next: BubbleWorld) => void;
  readonly className?: string;
  readonly style?: CSSProperties;
  /** 泡の外に置くもの（ツールバーなど） */
  readonly children?: ReactNode;
  /**
   * 離したところを、空間の外（岸など）が横取りする口。
   * `true` を返したら**その泡は海から出る** ── 以後どう見せるかは横取りした側の仕事。
   */
  readonly onTakeOut?: (info: { readonly id: BubbleId; readonly url: string; readonly rect: { x: number; y: number; w: number; h: number }; readonly pointer: { x: number; y: number } }) => boolean;
}

export function BubbleSpace(props: BubbleSpaceProps) {
  const { routes, viewport, drawMin, rules, className, style, children } = props;
  const depth: OpenDepth = props.depth ?? 'fisheye-x';
  const layerRef = useRef<HTMLDivElement | null>(null);
  const seq = useRef(0);

  // url と種類は domain に入れない（「泡に url を持たせるか」は未決）。ここで id との対で持つ
  const [urls, setUrls] = useState<ReadonlyMap<BubbleId, Opened>>(new Map());
  const [ownWorld, setOwnWorld] = useState<BubbleWorld>(() => emptyWorld(presetView(props.rootPreset ?? 'free')));
  const [selectedId, setSelectedId] = useState<BubbleId | null>(null);

  const world = props.world ?? ownWorld;
  const setWorld = useCallback(
    (next: BubbleWorld) => { if (props.onChange) props.onChange(next); else setOwnWorld(next); },
    [props],
  );

  // 持ち上げる前の配置。触る側（useBubbleInput）が持ち上げを当てて返す
  const base = useMemo(() => resolveWorld(world, viewport, rules), [world, viewport, rules]);

  /** 海から出す（岸へ渡す）。泡も url の覚えも落とす */
  const takeOut = useCallback(
    (id: BubbleId) => {
      setWorld(world.without(id));
      setUrls((m) => {
        const next = new Map(m);
        next.delete(id);
        return next;
      });
    },
    [world, setWorld],
  );

  const claimDrop = useCallback(
    (info: { id: BubbleId; pointer: { x: number; y: number }; rect: { x: number; y: number; w: number; h: number } }) => {
      const url = urls.get(info.id)?.url;
      if (!url || !props.onTakeOut) return false;
      const taken = props.onTakeOut({ id: info.id, url, rect: info.rect, pointer: info.pointer });
      if (taken) takeOut(info.id);
      return taken;
    },
    [urls, props, takeOut],
  );

  const canOpen = useCallback((url: string) => !!matchBubbleRoute(routes, url), [routes]);

  const openBubble = useCallback(
    (url: string, openerId?: BubbleId | null, label?: string): BubbleId => {
      const route = matchBubbleRoute(routes, url);
      if (!route) { console.warn('route が無い url:', url); return ''; }
      seq.current += 1;
      const id = `b${seq.current}:${url}`;
      const opener = openerId ?? null;
      const r = openAt({
        world, viewport, openerId: opener, newId: id,
        title: titleOf(routes, url, label), size: route.size, hue: route.hue, rules, depth,
        joinWith: mateFor(world, urls, route.type, opener),
      });
      setWorld(r.world);
      setUrls((m) => new Map(m).set(id, { url, type: route.type, openerId: opener, at: seq.current }));
      setSelectedId(id);
      return id;
    },
    [routes, world, urls, viewport, rules, depth, setWorld],
  );

  const closeBubble = useCallback(
    (id: BubbleId) => {
      /**
       * ★ 閉じるも **reshape を通す**。直に world.without(id) すると、
       *   ③「並びは2つ以上」が効かず、中身が1つになった見えない親が残る
       *   ── そうなるとその泡は並びの中に閉じこめられて、ヘッダをドラッグしても動かなくなる。
       *   （v6 で踏んだ。値を消すときも、規則の通り道を外れてはいけない）
       */
      const seen = new Map(
        base.order.map((p) => [p.id, { x: p.x, y: p.y, w: p.box.w, h: p.box.h, scale: p.scale }]),
      );
      const space = world.bubble(id)?.space ?? 'root';
      /**
       * ★ ⑤ 並びの中の泡を閉じたら、**残った先頭の泡を留める**。
       *   reshape は「泡が出ていって縮んだ並び」の先頭を自分で留めるが、見つけ方が
       *   「親が変わった泡」からなので、**消えた泡は数に入らない**（ラボには泡を消す口が無かった）。
       *   留めないと、並びは箱の中心が位置なので、縮んだ幅の半分だけ兄弟がずれる
       *   （v7 で踏んだ：300px の詳細を1つ閉じると、触っていない兄弟が 150px 動いた。旧は動かない）。
       */
      const row = world.rowOf(id);
      const heir = row
        ? world.kidsOf(row.id).filter((b) => b.id !== id).sort((p, q) => p.state.order - q.state.order)[0]?.id
        : undefined;
      let next = reshape(world, actContext(viewport, seen, rules), (w) => ({ world: w.without(id), keep: heir ? [heir] : [] })).world;
      // 面で開いているなら：焦点の面が空になったら、後ろの面が上がってくる（旧の「空のレイヤーは詰まる」）
      if (depth === 'plane') next = settlePlaneAfterClose(next, viewport, next.bubble(space) ? space : 'root', rules);
      setWorld(next);
      setUrls((m) => { const n = new Map(m); n.delete(id); return n; });
      setSelectedId((s) => (s === id ? null : s));
    },
    [world, setWorld, base, viewport, rules, depth],
  );

  const api: BubbleSpaceApi = useMemo(
    () => ({ openBubble, closeBubble, urlOf: (id) => urls.get(id)?.url ?? null, canOpen }),
    [openBubble, closeBubble, urls, canOpen],
  );

  // 空なら最初の url を開く（1回だけ）
  const seeded = useRef(false);
  if (!seeded.current && world.bubbles.length === 0 && props.initialUrls?.length) {
    seeded.current = true;
    let w = world;
    let n = seq.current;
    const m = new Map(urls);
    for (const url of props.initialUrls) {
      const route = matchBubbleRoute(routes, url);
      if (!route) continue;
      n += 1;
      const id = `b${n}:${url}`;
      w = openAt({ world: w, viewport, openerId: null, newId: id,
                   title: titleOf(routes, url), size: route.size, hue: route.hue, rules, depth }).world;
      m.set(id, { url, type: route.type, openerId: null, at: n });
    }
    seq.current = n;
    // レンダリング中に setState するのは初回の種まきだけ（React は同じコミットで拾う）
    setUrls(m);
    setWorld(w);
  }

  // 中身を持つ泡は、ヘッダでだけ掴める（本文は中身のもの。既存 bubbles-ui と同じ）
  const hasContent = useCallback((id: BubbleId) => urls.has(id), [urls]);
  const input = useBubbleInput({
    world, setWorld, layout: base, viewport, selectedId, setSelectedId, drawMin, rules,
    layerRef, hasContent, claimDrop,
  });

  const renderBubble = useCallback(
    (id: BubbleId, draw: BubbleDraw) => {
      const url = urls.get(id)?.url;
      /**
       * ★ url を持たない泡＝**見えない親（並び）**。ここで `null` を返すと、
       *   点線の枠も札も、掴むための縁（外周12px）も描かれず、
       *   **兄弟たちをまとめて動かせなくなる**（v6 で踏んだ）。
       *   ラボと同じ見本（`BubbleShell`）に任せる ── ③ 見えない親は外周でしか掴めない。
       */
      if (!url) return <BubbleShell draw={draw} />;
      const r = renderRoute(routes, id, url);
      return (
        <>
          <div className="hd" />
          {/*
            ★ 枠に出すのは **url**（題名ではない）。既存 bubbles-ui の泡と同じ。
              中身は自分の題名を自分で出すので、枠にも題名を出すと二重になる
              ── v6 の検証で最初に見つかったのがこれ。
          */}
          <div className="ttl bl-url">
            {url.split("/").map((seg, i) => (
              <span key={i} className="bl-seg">
                {i > 0 && <span className="bl-sep">/</span>}
                {seg}
              </span>
            ))}
          </div>
          <button
            className="bl-close"
            title="閉じる"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => closeBubble(id)}
          >×</button>
          <div className={'bl-body' + (r?.route.ground === 'clear' ? ' bl-clear' : '')}>
            {r
              ? <CurrentBubbleContext.Provider value={id}><r.route.Component bubble={r.bubble} /></CurrentBubbleContext.Provider>
              : <div className="bl-noroute">route が無い<br />{url}</div>}
          </div>
        </>
      );
    },
    [routes, urls, closeBubble],
  );

  /** 宇宙に落とす ── ダブルクリックと同じ道（`openBubble` の元が違うだけ） */
  const onDrop = useCallback(
    (e: ReactDragEvent<HTMLDivElement>) => {
      const url = e.dataTransfer.getData('application/x-bubble-url') || e.dataTransfer.getData('text/uri-list');
      if (!url || !canOpen(url)) return;
      e.preventDefault();
      const opener = e.dataTransfer.getData('application/x-bubble-opener') || null;
      openBubble(url, opener);
    },
    [canOpen, openBubble],
  );

  return (
    <BubbleSpaceContext.Provider value={api}>
      <style>{FIELD_CSS + MARKS_CSS + SPACE_CSS}</style>
      <div
        className={'bl-space' + (className ? ' ' + className : '')}
        style={{ position: 'relative', width: viewport.w, height: viewport.h, overflow: 'hidden', ...style }}
        onDragOver={(e) => { if (e.dataTransfer.types.includes('application/x-bubble-url')) e.preventDefault(); }}
        onDrop={onDrop}
      >
        <BubbleField
          world={world}
          layout={input.layout}
          viewport={viewport}
          drawMin={drawMin}
          selectedId={selectedId}
          skipGrab={input.skipGrab}
          marks={input.marks}
          layerRef={layerRef}
          renderBubble={renderBubble}
          {...input.handlers}
        />
        {children}
      </div>
    </BubbleSpaceContext.Provider>
  );
}
