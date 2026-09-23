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
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from 'react';
import type { BubbleId, BubbleWorld, DropMarks, Layout, Viewport } from '@bublys-org/bubble-layout';
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
  /** 当たり判定が使う層の要素（`useBubbleInput` に渡したものと同じ ref） */
  readonly layerRef?: RefObject<HTMLDivElement | null>;
  /** 掴んでいる間か（滑らかさを切る） */
  readonly dragging?: boolean;
  /** いま離したらどうなるか（`useBubbleInput` の marks） */
  readonly marks?: DropMarks | null;
  readonly className?: string;
  readonly style?: CSSProperties;
}

export function BubbleField(props: BubbleFieldProps) {
  const {
    world, layout, viewport, drawMin, selectedId, hoverRing, skipGrab, dragging,
    renderBubble, measureText, layerRef, marks, className, style, ...handlers
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

  /**
   * ★ **DOM の並びは動かさない。前後は z-index でつける。**
   *
   *   `field.items` は描く順（奥 → 手前）だが、焦点が動くたび・札を選ぶたびに
   *   その順は入れ替わる。そのまま DOM の並びにすると React が要素を差し替え直し、
   *   **CSS のアニメーションが鳴り直して画面がちらつく**
   *   （実測：一覧で札を1枚選ぶだけで `bl-in` が 4 回鳴り、DOM の出し入れが 4 回）。
   *   前後はもともと `zIndex` に入れてあるので、DOM の並びは id で固定してよい。
   */
  const dom = useMemo(
    () => [...field.items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    [field.items],
  );

  return (
    <div
      ref={layerRef}
      // 掴んでいる間は `bl-live` ── 滑らかさを切る（カーソルより遅れないように）
      className={'bl-layer' + (dragging ? ' bl-live' : '') + (className ? ' ' + className : '')}
      style={style}
      {...handlers}
    >
      {dom.map((it) => (
        <div
          key={it.id}
          data-id={it.id}
          className={it.className}
          style={it.style as CSSProperties}
        >
          {renderBubble ? renderBubble(it.id, it) : <BubbleShell draw={it} />}
        </div>
      ))}
      <DropMarksView marks={marks ?? null} />
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

/** いま離したらどうなるか（入るマス・差し込まれる位置）。lab.html 1098-1130 行 renderMarks の要る所だけ */
export function DropMarksView({ marks }: { readonly marks: DropMarks | null }) {
  if (!marks) return null;
  const px = (v: number) => v.toFixed(1) + 'px';
  return (
    <div className="bl-marks">
      {marks.rect && (
        <div className="mk-cell" style={{ left: px(marks.rect.x), top: px(marks.rect.y), width: px(Math.max(0, marks.rect.w)), height: px(Math.max(0, marks.rect.h)) }} />
      )}
      {marks.line && (
        <div
          className="mk-line"
          style={
            marks.line.axis === 'x'
              ? { left: px(marks.line.at - 1.5), top: px(marks.line.from), width: '3px', height: px(marks.line.to - marks.line.from) }
              : { left: px(marks.line.from), top: px(marks.line.at - 1.5), width: px(marks.line.to - marks.line.from), height: '3px' }
          }
        />
      )}
    </div>
  );
}
