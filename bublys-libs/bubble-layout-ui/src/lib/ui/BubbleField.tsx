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
import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from 'react';
import type { BubbleId, BubbleWorld, DropMarks, Layout, Viewport } from '@bublys-org/bubble-layout';
import { drawField } from './draw.js';
import type { BandSpot, BubbleDraw, MeasureText } from './draw.js';
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
  /** 掴んでいる泡そのもの（箱の縁で切らないのはこれだけ） */
  readonly grabbedId?: BubbleId | null;
  /** 補間しない泡（装いが出入りする泡）。`draw.ts` の註 */
  readonly noTween?: ReadonlySet<BubbleId> | null;
  /** 泡の中身。渡さなければラボと同じ見本（ヘッダ・題名・行・印） */
  readonly renderBubble?: (id: BubbleId, draw: BubbleDraw) => ReactNode;
  /** 字幅の測り方を差し替える（テスト用） */
  readonly measureText?: MeasureText;
  readonly onPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  readonly onPointerMove?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  readonly onPointerUp?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  readonly onPointerCancel?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  /** 捕まえたポインタが外れた（離しを取りこぼしたときの受け皿。ラボと同じ） */
  readonly onLostPointerCapture?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  readonly onWheel?: (e: React.WheelEvent<HTMLDivElement>) => void;
  readonly onDoubleClick?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  /** 当たり判定が使う層の要素（`useBubbleInput` に渡したものと同じ ref） */
  readonly layerRef?: RefObject<HTMLDivElement | null>;
  /** 掴んでいる間か（滑らかさを切る） */
  readonly dragging?: boolean;
  /** いま離したらどうなるか（`useBubbleInput` の marks） */
  readonly marks?: DropMarks | null;
  /**
   * **どこから開いたか。** 渡すと、開いた元との間に帯（錐台）を描く。
   * 渡さなければ描かない ── 関係を持つのは海の側（`BubbleSpace`）の仕事。
   */
  readonly openerOf?: ReadonlyMap<BubbleId, BubbleId | null> | null;
  /** 帯の出どころ（押されたもの）。無ければ `openerOf` から出る */
  readonly originOf?: ReadonlyMap<BubbleId, BubbleId | null> | null;
  /** 押されたのが泡の中の一点だったとき、その場所（箱に対する割合） */
  readonly originSpotOf?: ReadonlyMap<BubbleId, BandSpot> | null;
  /**
   * 帯の出し方。既定は `hover` ── **両端のどちらかに触れているときだけ**見せる
   * （旧い海と同じ。いつも出していると、開いた先が増えるほど海が塗り潰される）。
   */
  readonly bandDisplay?: 'hover' | 'always' | 'none';
  readonly className?: string;
  readonly style?: CSSProperties;
}

export function BubbleField(props: BubbleFieldProps) {
  const {
    world, layout, viewport, drawMin, selectedId, hoverRing, skipGrab, grabbedId, noTween, dragging,
    renderBubble, measureText, layerRef, marks, openerOf, originOf, originSpotOf, bandDisplay = 'hover',
    className, style, ...handlers
  } = props;

  /**
   * いま触れている泡。**帯の見せ方にしか使わない**ので、ここで持つ（世界には書かない）。
   * 出入りは層 1 枚で受けて、`data-id` を持つ先祖を辿る ── 泡ごとに handler は付けない。
   */
  const [hoveredId, setHoveredId] = useState<BubbleId | null>(null);
  const noteHover = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement | null)?.closest?.('[data-id]') as HTMLElement | null;
    setHoveredId(el?.dataset.id ?? null);
  }, []);

  const field = useMemo(
    () =>
      drawField({
        world, layout, viewport, drawMin,
        selectedId, hoverRing, skipGrab, grabbedId, noTween, openerOf, originOf, originSpotOf, hoveredId,
        measureText: measureText ?? measureTextInDom,
      }),
    [world, layout, viewport, drawMin, selectedId, hoverRing, skipGrab, grabbedId, noTween, openerOf, originOf, originSpotOf, hoveredId, measureText],
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
      onPointerOver={noteHover}
      onPointerOut={noteHover}
      {...handlers}
    >
      {/*
        ★ **泡は1枚の「留め」に包む。** 箱に留める泡（一覧の札など）では、この留めが
          箱そのもの（大きさ ＋ overflow:hidden）になって中身を切る ── 切り取りを
          札ではなく**箱の側**に置くため（`draw.ts` の註）。留めない泡では
          大きさを持たない素通しで、何も変わらない。
        ★ **いつも包む。** 留める／留めないで入れ子の形を変えると、React が作り直して
          出現アニメ（`bl-in`）が鳴り直す。形は変えず、中身（style）だけ変える。
      */}
      {/*
        ★ **帯は泡の兄弟。** 泡の中に描くと、遠い泡の薄まり（opacity）に一緒に巻き込まれるし、
          留め（`bl-hold`）の切り取りにも掛かる。開いた先のすぐ下（z は 1 つ下）に置く。
      */}
      {(bandDisplay === 'none' ? [] : field.bands).map((b) => (
        <svg
          key={b.id}
          className="bl-band"
          style={{
            zIndex: b.zIndex,
            opacity: bandDisplay === 'always' || b.on ? 1 : 0,
          } as CSSProperties}
          width={viewport.w}
          height={viewport.h}
        >
          <path d={b.path} fill={`hsla(${b.hue}, 50%, 50%, 0.3)`} />
        </svg>
      ))}
      {dom.map((it) => (
        <div key={it.id} className="bl-hold" style={it.hold as CSSProperties}>
          <div
            data-id={it.id}
            className={it.className}
            style={it.style as CSSProperties}
          >
            {renderBubble ? renderBubble(it.id, it) : <BubbleShell draw={it} />}
          </div>
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
