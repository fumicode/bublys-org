/**
 * React 版の見本 ── ラボ（v5-dom/lab.html）と px で突き合わせるための画面。
 *
 * ★ ラボと同じ場面（`labScene()`）から始めて、同じ操作を同じ順で当てる。
 *   これを headless Chromium で両方開いて、泡ひとつひとつの矩形を比べるのが
 *   `_check/react.mjs`（受け入れ条件：px で差 0）。本物のマウスで触るのは `_check/react-drag.mjs`。
 *
 * ★ ここはライブラリではない。ライブラリは `../src`。
 */
import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  focusOn, labScene, resolveWorld, withAxis, withPreset, VIEWPORT,
} from '@bublys-org/bubble-layout';
import type { Axis, BubbleId, BubbleWorld, PresetId, SpaceId } from '@bublys-org/bubble-layout';
import { BubbleField, DRAW_MIN, FIELD_CSS, MARKS_CSS, markTiny, useBubbleInput } from '../src/index';

interface Api {
  select(id: BubbleId): void;
  selectedId(): BubbleId | null;
  preset(name: PresetId, spaceId?: SpaceId): void;
  setAxis(spaceId: SpaceId, axis: Axis, patch: Record<string, unknown>): void;
  focusOn(id: BubbleId): void;
  setDrawMin(v: number): void;
  drawMinOf(): number;
  placements(): unknown[];
  rects(): Record<string, { x: number; y: number; w: number; h: number }>;
  domCount(): number;
  tiny(): BubbleId[];
  bubbleOf(id: BubbleId): unknown;
  bubbles(): unknown[];
  focusOf(space: SpaceId): unknown;
  /** 泡のヘッダの、実際にその泡に当たる点（窓の座標） */
  headerPointOf(id: BubbleId): { x: number; y: number } | null;
  kidsOf(space: SpaceId): BubbleId[];
  rowOf(id: BubbleId): SpaceId | null;
}
declare global { interface Window { __react: Api } }

function Demo() {
  const [world, setWorld] = useState<BubbleWorld>(() => labScene());
  const [selectedId, setSelectedId] = useState<BubbleId | null>('memo1');
  const [drawMin, setDrawMinState] = useState(DRAW_MIN);
  const layerRef = useRef<HTMLDivElement | null>(null);

  // ★ 持ち上げる前の配置。触る側（useBubbleInput）が持ち上げを当てて返す
  const base = resolveWorld(world, VIEWPORT);
  const input = useBubbleInput({
    world, setWorld, layout: base, viewport: VIEWPORT,
    selectedId, setSelectedId, drawMin, layerRef,
  });
  const layout = input.layout;

  window.__react = {
    select: (id) => setSelectedId(id),
    selectedId: () => selectedId,
    preset: (name, spaceId) => setWorld(withPreset(world, name, spaceId ?? 'root')),
    setAxis: (spaceId, axis, patch) => setWorld(withAxis(world, spaceId, axis, patch as never)),
    focusOn: (id) => setWorld(focusOn(world, layout, id)),
    setDrawMin: (v) => setDrawMinState(Math.max(0, Number(v) || 0)),
    drawMinOf: () => drawMin,
    placements: () =>
      layout.order.map((p) => ({
        id: p.id, x: p.x, y: p.y, w: p.w, h: p.h,
        scale: p.scale, local: p.local, alpha: p.alpha, vis: p.vis,
        depth: p.depth, space: p.space, implicit: p.b.state.implicit,
      })),
    rects: () => {
      const o = layerRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
      const out: Record<string, { x: number; y: number; w: number; h: number }> = {};
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('.bl-layer [data-id]'))) {
        const r = el.getBoundingClientRect();
        out[el.dataset['id'] as string] = { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
      }
      return out;
    },
    domCount: () => document.querySelectorAll('.bl-layer .bub').length,
    tiny: () => [...markTiny(world, layout, drawMin)],
    bubbleOf: (id) => world.bubble(id)?.state ?? null,
    bubbles: () => world.bubbles.map((b) => JSON.parse(JSON.stringify(b.state))),
    focusOf: (space) => ({ ...world.focusOf(space) }),
    headerPointOf: (id) => {
      const p = layout.byId.get(id);
      if (!p) return null;
      const o = layerRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
      const y = p.box.h <= 34 ? p.y + p.h / 2 : p.y + Math.min(12 * p.scale, p.h / 2);
      return { x: p.x + p.w * 0.35 + o.left, y: y + o.top };
    },
    kidsOf: (space) => world.kidsOf(space).map((b) => b.id),
    rowOf: (id) => world.rowOf(id)?.id ?? null,
  };

  return (
    <>
      <style>{FIELD_CSS + MARKS_CSS}</style>
      <div
        id="stage"
        style={{
          position: 'absolute', left: 0, top: 90.5, width: VIEWPORT.w, height: VIEWPORT.h,
          overflow: 'hidden', touchAction: 'none',
          background: 'radial-gradient(circle 1080px at 50% 50%,#141a2b 0%,#080a11 100%)',
        }}
      >
        <BubbleField
          world={world}
          layout={layout}
          viewport={VIEWPORT}
          drawMin={drawMin}
          selectedId={selectedId}
          skipGrab={input.skipGrab}
          marks={input.marks}
          layerRef={layerRef}
          {...input.handlers}
        />
      </div>
    </>
  );
}

const host = document.getElementById('root');
if (host) createRoot(host).render(<Demo />);
