/**
 * 泡を描く ── 1枚の層の兄弟として、平らに並べる。
 *
 * ★ なぜ入れ子の div にしないか：transform を持つ div は stacking context を作るので、
 *   中の泡が「親の兄弟」より手前に出られない。v5-dom で 688 画素ぶん食い違った。
 *   だから木は domain だけが持ち、DOM は平ら（`_check/flat.mjs`）。
 *
 * ★ 中身は外から渡す（`renderBubble`）。`<Bubble><Bubble/></Bubble>` と書けるようにはしない
 *   ── 木が React と domain の2箇所にできて剥がせなくなる（DECISIONS.md）。
 */
import { useMemo } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { BubbleId, BubbleWorld, Layout, Viewport } from '@bublys-org/bubble-layout';
import { drawField } from './draw.js';
import type { BubbleDraw, MeasureText } from './draw.js';
import { measureTextInDom } from './measure-text.js';

export interface BubbleFieldProps {
  readonly world: BubbleWorld;
  readonly layout: Layout;
  readonly viewport: Viewport;
  /** 短辺がこれ（画面 px）を切った泡は描かない。0 で「なし」。既定 5.0 ── 未決 */
  readonly drawMin?: number;
  readonly selectedId?: BubbleId | null;
  readonly hoverRing?: BubbleId | null;
  readonly skipGrab?: ReadonlySet<BubbleId> | null;
  /** 泡の中身。渡さなければラボと同じ見本（ヘッダ・題名・行・印） */
  readonly renderBubble?: (id: BubbleId, draw: BubbleDraw) => ReactNode;
  /** 字幅の測り方を差し替える（テスト用） */
  readonly measureText?: MeasureText;
  readonly onPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  readonly onPointerMove?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  readonly onPointerUp?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  readonly onWheel?: (e: React.WheelEvent<HTMLDivElement>) => void;
  readonly onDoubleClick?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  readonly className?: string;
  readonly style?: CSSProperties;
}

export function BubbleField(props: BubbleFieldProps) {
  const {
    world, layout, viewport, drawMin, selectedId, hoverRing, skipGrab,
    renderBubble, measureText, className, style, ...handlers
  } = props;

  const field = useMemo(
    () =>
      drawField({
        world, layout, viewport, drawMin,
        selectedId, hoverRing, skipGrab,
        measureText: measureText ?? measureTextInDom,
      }),
    [world, layout, viewport, drawMin, selectedId, hoverRing, skipGrab, measureText],
  );

  return (
    <div className={'bl-layer' + (className ? ' ' + className : '')} style={style} {...handlers}>
      {field.items.map((it) => (
        <div
          key={it.id}
          data-id={it.id}
          className={it.className}
          style={it.style as CSSProperties}
        >
          {renderBubble ? renderBubble(it.id, it) : <BubbleShell draw={it} />}
        </div>
      ))}
      {/* ★ 角は泡の中ではなく層の兄弟。中に置くと遠い泡の opacity に薄まる */}
      <div
        className="bl-hnd"
        style={
          field.handle
            ? ({ display: 'block', transform: field.handle.transform, zIndex: field.handle.zIndex } as CSSProperties)
            : ({ display: 'none' } as CSSProperties)
        }
      />
    </div>
  );
}

/** ラボと同じ見本の中身。`renderBubble` を渡さないときに使われる */
export function BubbleShell({ draw }: { readonly draw: BubbleDraw }) {
  if (draw.implicit) {
    return (
      <>
        <div className="fr" />
        <div className="lb">{draw.label}</div>
        <div className="rg rt" />
        <div className="rg rb" />
        <div className="rg rl" />
        <div className="rg rr" />
      </>
    );
  }
  return (
    <>
      <div className="hd" />
      <div className="ttl">{draw.title}</div>
      <div className="bd" />
      <div className="inner" />
      <div className="mk">{draw.mark}</div>
    </>
  );
}
