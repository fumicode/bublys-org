/**
 * React 版の見本 ── ラボ（v5-dom/lab.html）と px で突き合わせるための画面。
 *
 * ★ ラボと同じ場面（`labScene()`）から始めて、同じ操作を同じ順で当てる。
 *   これを headless Chromium で両方開いて、泡ひとつひとつの矩形を比べるのが
 *   `_check/react-vs-lab.mjs`（受け入れ条件：px で差 0）。
 *
 * ★ ここはライブラリではない。ライブラリは `../src`。
 */
import { useCallback, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  focusOn,
  labScene,
  resolveWorld,
  withAxis,
  withPreset,
  VIEWPORT,
} from '@bublys-org/bubble-layout';
import type { Axis, BubbleId, BubbleWorld, PresetId, SpaceId } from '@bublys-org/bubble-layout';
import { BubbleField, FIELD_CSS, DRAW_MIN } from '../src/index';

interface Api {
  select(id: BubbleId): void;
  selectedId(): BubbleId | null;
  preset(name: PresetId, spaceId?: SpaceId): void;
  setAxis(spaceId: SpaceId, axis: Axis, patch: Record<string, unknown>): void;
  focusOn(id: BubbleId): void;
  setDrawMin(v: number): void;
  drawMinOf(): number;
  placements(): unknown[];
  /** 泡ひとつひとつの、層の左上から測った矩形（ラボと比べる面） */
  rects(): Record<string, { x: number; y: number; w: number; h: number }>;
  domCount(): number;
  tiny(): BubbleId[];
}
declare global {
  interface Window { __react: Api }
}

function Demo() {
  const [world, setWorld] = useState<BubbleWorld>(() => labScene());
  const [selectedId, setSelectedId] = useState<BubbleId | null>('memo1');
  const [drawMin, setDrawMin] = useState(DRAW_MIN);

  const layout = useMemo(() => resolveWorld(world, VIEWPORT), [world]);

  // ★ 口はここで閉じる（React の外から触るため）。本番の配線ではない
  const install = useCallback(() => {
    window.__react = {
      select: (id) => setSelectedId(id),
      selectedId: () => selectedId,
      preset: (name, spaceId) => setWorld((w) => withPreset(w, name, spaceId ?? 'root')),
      setAxis: (spaceId, axis, patch) => setWorld((w) => withAxis(w, spaceId, axis, patch as never)),
      focusOn: (id) => setWorld((w) => focusOn(w, layout, id)),
      setDrawMin: (v) => setDrawMin(Math.max(0, Number(v) || 0)),
      drawMinOf: () => drawMin,
      placements: () =>
        layout.order.map((p) => ({
          id: p.id, x: p.x, y: p.y, w: p.w, h: p.h,
          scale: p.scale, local: p.local, alpha: p.alpha, vis: p.vis,
          depth: p.depth, space: p.space, implicit: p.b.state.implicit,
        })),
      rects: () => {
        const layer = document.querySelector('.bl-layer') as HTMLElement | null;
        const o = layer ? layer.getBoundingClientRect() : { left: 0, top: 0 };
        const out: Record<string, { x: number; y: number; w: number; h: number }> = {};
        for (const el of Array.from(document.querySelectorAll<HTMLElement>('.bl-layer [data-id]'))) {
          const r = el.getBoundingClientRect();
          out[el.dataset['id'] as string] = {
            x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height,
          };
        }
        return out;
      },
      domCount: () => document.querySelectorAll('.bl-layer .bub').length,
      tiny: () => [],
    };
  }, [layout, selectedId, drawMin]);
  install();

  return (
    <>
      <style>{FIELD_CSS}</style>
      <div id="stage" style={{ position: 'absolute', left: 0, top: 90.5, width: VIEWPORT.w, height: VIEWPORT.h, overflow: 'hidden', background: 'radial-gradient(circle 1080px at 50% 50%,#141a2b 0%,#080a11 100%)' }}>
        <BubbleField
          world={world}
          layout={layout}
          viewport={VIEWPORT}
          drawMin={drawMin}
          selectedId={selectedId}
        />
      </div>
    </>
  );
}

const host = document.getElementById('root');
if (host) createRoot(host).render(<Demo />);
