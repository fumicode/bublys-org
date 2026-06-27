import React, { FC, ReactNode, useEffect, useRef, useLayoutEffect, memo, useMemo, useState } from "react";
import styled from "styled-components";
import { useAppSelector } from "@bublys-org/state-management";
import { Bubble } from "../Bubble.domain.js";
import { Point2, Layer, CoordinateSystem, SmartRect } from "@bublys-org/bubbles-ui-util";
import { BubbleView } from "./BubbleView.js";
import { UniverseBubbleView } from "./UniverseBubbleView.js";
import { LinkBubbleView } from "./LinkBubbleView.js";
import { BubbleContent } from "./BubbleContent.js";
import { UniverseContext } from "../context/UniverseContext.js";
import {
  makeSelectValidBubbleRelationIds,
  makeSelectGlobalCoordinateSystem,
  makeSelectSurfaceLeftTop,
  makeSelectUniverseDimensions,
  selectIsLayerAnimating,
  makeSelectBubbleByIdInUniverse,
  makeSelectFocusedBubbleId,
  ROOT_UNIVERSE_ID,
} from "../state/index.js";

/**
 * 個別バブルを自分でReduxから取得するラッパーコンポーネント
 */
type ConnectedBubbleViewProps = {
  universeId: string;
  bubbleId: string;
  layerIndex: number;
  zIndex: number;
  isFocused: boolean;
  vanishingPoint: Point2;
  surfaceLayer: Layer;
  hasLeftLink?: boolean;
  renderBubbleContent: (bubble: Bubble) => ReactNode;
  onBubbleClick?: (name: string) => void;
  onBubbleClose?: (bubble: Bubble) => void;
  onBubbleMove?: (bubble: Bubble) => void;
  onBubbleResize?: (bubble: Bubble) => void;
  onBubbleLayerDown?: (bubble: Bubble) => void;
  onBubbleLayerUp?: (bubble: Bubble) => void;
  onDebugRects?: (rects: SmartRect[]) => void;
};

const ConnectedBubbleView: FC<ConnectedBubbleViewProps> = memo(function ConnectedBubbleView({
  universeId,
  bubbleId,
  layerIndex,
  zIndex,
  isFocused,
  vanishingPoint,
  surfaceLayer,
  hasLeftLink,
  renderBubbleContent,
  onBubbleClick,
  onBubbleClose,
  onBubbleMove,
  onBubbleResize,
  onBubbleLayerDown,
  onBubbleLayerUp,
  onDebugRects,
})  {
  const selectBubble = useMemo(() => makeSelectBubbleByIdInUniverse(universeId, bubbleId), [universeId, bubbleId]);
  const bubble = useAppSelector(selectBubble);

  if (!bubble) return null;

  // bubble.position は layer-local 座標。surface レイヤーで universe 座標へ写す
  const pos = surfaceLayer.place(bubble.position || { x: 0, y: 0 });

  // fillsContainer な窓型バブル（universe / iframe / 等）は専用シェルで描く。
  // 透明な content と窓っぽいヘッダーで「親が透けて見える窓」として表現する。
  if (bubble.fillsContainer) {
    return (
      <UniverseBubbleView
        bubble={bubble}
        position={pos}
        layerIndex={layerIndex}
        zIndex={zIndex}
        isFocused={isFocused}
        vanishingPoint={vanishingPoint}
        onClick={() => onBubbleClick?.(bubble.url)}
        onCloseClick={() => onBubbleClose?.(bubble)}
        onResize={(updated) => onBubbleResize?.(updated)}
        onLayerDownClick={() => onBubbleLayerDown?.(bubble)}
        onLayerUpClick={() => onBubbleLayerUp?.(bubble)}
        onDebugRects={onDebugRects}
      >
        {renderBubbleContent(bubble)}
      </UniverseBubbleView>
    );
  }

  return (
    <BubbleView
      bubble={bubble}
      position={pos}
      layerIndex={layerIndex}
      zIndex={zIndex}
      isFocused={isFocused}
      vanishingPoint={vanishingPoint}
      contentBackground={bubble.contentBackground ?? "white"}
      hasLeftLink={hasLeftLink}
      onClick={() => onBubbleClick?.(bubble.url)}
      onCloseClick={() => onBubbleClose?.(bubble)}
      onMove={(updated) => onBubbleMove?.(updated)}
      onResize={(updated) => onBubbleResize?.(updated)}
      onLayerDownClick={() => onBubbleLayerDown?.(bubble)}
      onLayerUpClick={() => onBubbleLayerUp?.(bubble)}
      onDebugRects={onDebugRects}
    >
      {renderBubbleContent(bubble)}
    </BubbleView>
  );
});

/**
 * 個別のLinkBubbleを自分でReduxから取得するラッパーコンポーネント
 */
type ConnectedLinkBubbleViewProps = {
  universeId: string;
  openerId: string;
  openeeId: string;
  coordinateSystem: CoordinateSystem;
  linkZIndex: number;
};

const ConnectedLinkBubbleView: FC<ConnectedLinkBubbleViewProps> = memo(function ConnectedLinkBubbleView({
  universeId,
  openerId,
  openeeId,
  coordinateSystem,
  linkZIndex,
}) {
  const selectOpener = useMemo(() => makeSelectBubbleByIdInUniverse(universeId, openerId), [universeId, openerId]);
  const selectOpenee = useMemo(() => makeSelectBubbleByIdInUniverse(universeId, openeeId), [universeId, openeeId]);
  const opener = useAppSelector(selectOpener);
  const openee = useAppSelector(selectOpenee);

  if (!opener || !openee) return null;

  return (
    <LinkBubbleView
      opener={opener}
      openee={openee}
      coordinateSystem={coordinateSystem}
      linkZIndex={linkZIndex}
    />
  );
});

export type BubblesLayeredViewProps = {
  bubbleLayers: string[][];
  /** この universe の ID（省略時 root）。ネストした universe で別 ID を渡す */
  universeId?: string;
  vanishingPoint?: Point2;
  renderBubbleContent?: (bubble: Bubble) => ReactNode;
  onBubbleClick?: (name: string) => void;
  onBubbleClose?: (bubble: Bubble) => void;
  onBubbleMove?: (bubble: Bubble) => void;
  onBubbleResize?: (bubble: Bubble) => void;
  onBubbleLayerDown?: (bubble: Bubble) => void;
  onBubbleLayerUp?: (bubble: Bubble) => void;
  onCoordinateSystemReady?: (coordinateSystem: CoordinateSystem) => void;
  onDebugRects?: (rects: SmartRect[]) => void;
};

const defaultRenderBubbleContent = (bubble: Bubble): ReactNode => (
  <BubbleContent bubble={bubble} />
);

export const BubblesLayeredView: FC<BubblesLayeredViewProps> = ({
  bubbleLayers,
  universeId = ROOT_UNIVERSE_ID,
  vanishingPoint,
  renderBubbleContent = defaultRenderBubbleContent,
  onBubbleClick,
  onBubbleClose,
  onBubbleMove,
  onBubbleResize,
  onBubbleLayerDown,
  onBubbleLayerUp,
  onCoordinateSystemReady,
  onDebugRects,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const universeRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    let lastVanishingPoint = { x: 0, y: 0 };
    let coordinateSystemEmitted = false;

    const updateOnViewportChange = () => {
      if (!viewportRef.current) return;

      const currentVanishingPoint = vanishingPoint || { x: 0, y: 0 };

      // CoordinateSystem は universe 座標系を表現する。offset は常に 0
      // （universe 起点 = 「global」起点）。vanishingPoint は universe 座標で指定。
      if (
        coordinateSystemEmitted &&
        currentVanishingPoint.x === lastVanishingPoint.x &&
        currentVanishingPoint.y === lastVanishingPoint.y
      ) {
        return;
      }
      lastVanishingPoint = currentVanishingPoint;
      coordinateSystemEmitted = true;

      const coordinateSystem = new CoordinateSystem(
        0,
        { x: 0, y: 0 },
        currentVanishingPoint
      );
      onCoordinateSystemReady?.(coordinateSystem);
    };

    updateOnViewportChange();

    const resizeObserver = new ResizeObserver(() => {
      updateOnViewportChange();
    });

    if (viewportRef.current) {
      resizeObserver.observe(viewportRef.current);
    }

    let rafId: number | null = null;
    const handleResize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        updateOnViewportChange();
        rafId = null;
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [onCoordinateSystemReady, vanishingPoint]);

  /**
   * universe バブルの shell / 中身は pointer-events: none で「クリック貫通」だが、
   * その副作用としてホイールでネイティブスクロールも効かなくなっている。
   * ここで window レベルの wheel listener を 1 個だけ立てて、wheel 位置に
   * universe バブルの shell があれば、その中の StyledViewport を scrollBy で
   * 手動スクロールする（root の listener 1 個でネスト含めて全部を肩代わりする）。
   *
   * 注: document.elementsFromPoint は実装上 pointer-events: none を尊重して
   * none の shell を返してくれないので、全 shell を querySelectorAll で取って
   * 個別に getBoundingClientRect で hit-test する。
   *
   * 「最前面の shell」の選び方:
   *  - ネスト: 子 shell は親 shell の子孫。同じ点で複数マッチしたら、子が前面。
   *    → 「他のマッチ shell を contains しているもの」は除外
   *  - 兄弟: 同階層に並ぶ universe バブルは layer 0 が最前面（z-index 高い）。
   *    DOM 上は layer 0 が先頭に来る（renderedBubbles の生成順）ので、leaves の
   *    中で「DOM 順で最初」を採用する
   */
  useEffect(() => {
    if (universeId !== ROOT_UNIVERSE_ID) return;

    // 直近 hit-test 結果と「その時の target shell の矩形」をキャッシュ。
    // 次の wheel 位置が同じ矩形内なら hit-test を完全スキップして
    // getBoundingClientRect を呼ばずに済む（世界線グラフ等で DOM が大きいときの
    // layout 強制が wheel ごとに走らないように）。
    let cachedTarget: HTMLElement | null = null;
    let cachedViewport: HTMLElement | null = null;
    let cachedRect: { left: number; right: number; top: number; bottom: number } | null = null;
    let cachedAt = 0;
    // 矩形は drag やリサイズで動きうるので、しばらく経ったら再検証する保険。
    const CACHE_TTL_MS = 500;

    const onWheel = (e: WheelEvent) => {
      // wheel target が root viewport の DOM サブツリー外（例: 世界線グラフパネル、
      // サイドバー、その他 position:fixed のオーバーレイ）なら、こちらでは横取り
      // しない。これにより overlay 側の自前 overflow:auto を尊重する。
      const root = viewportRef.current;
      if (!root || !(e.target instanceof Node) || !root.contains(e.target)) return;

      const now = performance.now();
      let target: HTMLElement | null;
      let viewport: HTMLElement | null;

      const cacheHit =
        cachedTarget &&
        cachedTarget.isConnected &&
        cachedViewport &&
        cachedViewport.isConnected &&
        cachedRect &&
        now - cachedAt < CACHE_TTL_MS &&
        e.clientX >= cachedRect.left &&
        e.clientX <= cachedRect.right &&
        e.clientY >= cachedRect.top &&
        e.clientY <= cachedRect.bottom;

      if (cacheHit) {
        target = cachedTarget;
        viewport = cachedViewport;
      } else {
        const shells = Array.from(
          root.querySelectorAll<HTMLElement>('[data-window-style="universe"]'),
        );
        const rects = new Map<HTMLElement, DOMRect>();
        const matching = shells.filter((shell) => {
          const r = shell.getBoundingClientRect();
          rects.set(shell, r);
          return (
            e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
          );
        });
        // 内側に別の matching shell を持つもの（= 親）を除外
        const leaves = matching.filter(
          (shell) => !matching.some((other) => other !== shell && shell.contains(other)),
        );
        target = leaves[0] ?? null;
        viewport = target ? target.querySelector<HTMLElement>('[class*="StyledViewport"]') : null;
        cachedTarget = target;
        cachedViewport = viewport;
        const r = target ? rects.get(target) ?? null : null;
        cachedRect = r
          ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
          : null;
        cachedAt = now;
      }

      if (!target || !viewport) return;
      viewport.scrollLeft += e.deltaX;
      viewport.scrollTop += e.deltaY;
      e.preventDefault();
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [universeId]);

  const [showSurfaceBorder, setShowSurfaceBorder] = useState(false);
  const focusedBubbleId = useAppSelector(makeSelectFocusedBubbleId(universeId));
  const relationIds = useAppSelector(makeSelectValidBubbleRelationIds(universeId));
  const surfaceLeftTop = useAppSelector(makeSelectSurfaceLeftTop(universeId));
  const coordinateSystem = useAppSelector(makeSelectGlobalCoordinateSystem(universeId));
  const isLayerAnimating = useAppSelector(selectIsLayerAnimating);

  const undergroundVanishingPoint: Point2 = vanishingPoint || {
    x: 20,
    y: 10,
  };

  const baseZIndex = 100;

  const bubbleIdToZIndex: Record<string, number> = useMemo(() => {
    const result: Record<string, number> = {};
    bubbleLayers.forEach((layer, layerIndex) => {
      const zIndex = baseZIndex - layerIndex;
      layer.forEach((bubbleId) => {
        result[bubbleId] = zIndex;
      });
    });
    return result;
  }, [bubbleLayers]);

  const openeeIds = useMemo(() => {
    return new Set(relationIds.map(r => r.openeeId));
  }, [relationIds]);

  // surface（最前面）レイヤー。bubble.position(layer-local) ⇄ universe 変換を担う
  const surfaceLayer = useMemo(
    () => new Layer(0, surfaceLeftTop, coordinateSystem.vanishingPoint),
    [surfaceLeftTop, coordinateSystem],
  );

  const renderedBubbles = bubbleLayers
    .map((layer, layerIndex) =>
      layer.map((bubbleId) => {
        const zIndex = baseZIndex - layerIndex;
        const hasLeftLink = openeeIds.has(bubbleId);
        const isFocused = focusedBubbleId === bubbleId;

        return (
          <ConnectedBubbleView
            key={bubbleId}
            universeId={universeId}
            bubbleId={bubbleId}
            layerIndex={layerIndex}
            zIndex={zIndex}
            isFocused={isFocused}
            vanishingPoint={undergroundVanishingPoint}
            surfaceLayer={surfaceLayer}
            hasLeftLink={hasLeftLink}
            renderBubbleContent={renderBubbleContent}
            onBubbleClick={onBubbleClick}
            onBubbleClose={onBubbleClose}
            onBubbleMove={onBubbleMove}
            onBubbleResize={onBubbleResize}
            onBubbleLayerDown={onBubbleLayerDown}
            onBubbleLayerUp={onBubbleLayerUp}
            onDebugRects={onDebugRects}
          />
        );
      })
    )
    .flat();

  const universeContextValue = useMemo(() => ({ universeId, universeRef }), [universeId]);

  const isNested = universeId !== ROOT_UNIVERSE_ID;
  const universeSize = useAppSelector(makeSelectUniverseDimensions(universeId));

  return (
    <UniverseContext.Provider value={universeContextValue}>
      <StyledFrame $nested={isNested}>
        <StyledViewport ref={viewportRef} $nested={isNested}>
          <StyledUniverse
            ref={universeRef}
            $nested={isNested}
            $width={universeSize.width}
            $height={universeSize.height}
          >
            {renderedBubbles}

            {!isLayerAnimating &&
              relationIds.map(({ openerId, openeeId }) => {
                const linkZIndex = bubbleIdToZIndex[openeeId] - 1;

                return(
                  <ConnectedLinkBubbleView
                    key={`${openerId}_${openeeId}`}
                    universeId={universeId}
                    openerId={openerId}
                    openeeId={openeeId}
                    coordinateSystem={coordinateSystem}
                    linkZIndex={linkZIndex}
                  />
                );
              })
            }
          </StyledUniverse>
        </StyledViewport>

        <StyledHeadsUpDisplay
          surface={{ leftTop: surfaceLeftTop }}
          surfaceZIndex={baseZIndex - 2}
        >
          <div className="e-underground-curtain"></div>
          <div className="e-debug-visualizations">
            <div className={`e-surface-border ${showSurfaceBorder ? '' : 'is-hidden'}`}></div>
            <button
              className="e-surface-border-toggle"
              onClick={() => setShowSurfaceBorder((v) => !v)}
            >
              {showSurfaceBorder ? '◻' : '◼'}
            </button>
          </div>
        </StyledHeadsUpDisplay>
      </StyledFrame>
    </UniverseContext.Provider>
  );
};


type DivProps = React.HTMLAttributes<HTMLDivElement>;
type DivPropsWithRef = DivProps & { ref: React.RefObject<HTMLDivElement | null> };

const StyledFrame = styled.div<DivProps & { $nested?: boolean }>`
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  z-index: 0;

  /* root も nested も背景なし。「夜空」backdrop は外側（BublysUI 側）が 1 段だけ塗り、
     全 universe バブルはその backdrop に対する「窓」として透明に振る舞う。 */
  background: transparent;

  /* ネスト universe の「背景」はマウスイベントを取らない（中のバブルは個別に
     auto を保つ）。クリックが空 universe 領域を貫通し、親 universe に届く。
     root は据え置きでスクロール・ホイール・パン可能。 */
  ${({ $nested }) => $nested && `pointer-events: none;`}
`;

const StyledViewport = styled.div<DivPropsWithRef & { $nested?: boolean }>`
  position: absolute;
  inset: 0;
  overflow: auto;
  /* nested は pointer-events: none。空白領域は奥に貫通するが、内側のバブル（auto）
     上でホイールを回すと、その wheel イベントが祖先の overflow:auto まで届いて
     ネイティブにスクロールが起きる。
     ※ スクロールバー自体は pointer-events: none のためつまめない（overlay として
     表示はされる）。明示的に touchable にしたい場合は別の DOM 層が要る。 */
  ${({ $nested }) => $nested && `pointer-events: none;`}
`;

const StyledUniverse = styled.div.attrs({ 'data-bubble-universe': '' })<
  DivPropsWithRef & { $nested?: boolean; $width: number; $height: number }
>`
  position: relative;
  /* スクロール可能領域はバブル配置から動的に算出される（最低値 + 各バブル右下端
     + 100px padding）。何も無い void に scroll で迷い込んでバブルを見失う事態を防ぐ。 */
  width: ${({ $width }) => $width}px;
  height: ${({ $height }) => $height}px;
  /* ネストされた universe では universe 自体も透過。直接の子（個別バブル）は
     default の pointer-events: auto を持つので、バブルの本体・ヘッダーは
     これまで通りクリック/ドラッグできる。 */
  ${({ $nested }) => $nested && `pointer-events: none;`}
`;

type StyledHeadsUpDisplayProps = {
  surface: { leftTop: Point2 };
  surfaceZIndex?: number;
  children?: React.ReactNode;
};

const StyledHeadsUpDisplay = styled.div<StyledHeadsUpDisplayProps>`
  position: absolute;
  inset: 0;
  pointer-events: none;

  > .e-underground-curtain {
    position: absolute;
    top: 0;
    left: 0;
    z-index: ${({ surfaceZIndex }) => surfaceZIndex || 0};
    width: 100%;
    height: 100%;
  }

  > .e-debug-visualizations {
    .e-surface-border {
      position: absolute;
      top: ${({ surface }) => surface.leftTop.y}px;
      left: ${({ surface }) => surface.leftTop.x}px;
      width: calc(100% - ${({ surface }) => surface.leftTop.x}px);
      height: calc(100% - ${({ surface }) => surface.leftTop.y}px);
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(1px);
      box-shadow:
        0 4px 30px rgba(0, 0, 0, 0.05),
        inset 0 0 20px rgba(255, 255, 255, 0.05);
      z-index: ${({ surfaceZIndex }) => surfaceZIndex || 0};
      transform-origin: left bottom;
      transition: transform 0.35s ease, opacity 0.35s ease;

      &.is-hidden {
        transform: scale(0);
        opacity: 0;
      }
    }

    .e-surface-border-toggle {
      position: absolute;
      bottom: 8px;
      left: ${({ surface }) => surface.leftTop.x + 8}px;
      z-index: ${({ surfaceZIndex }) => (surfaceZIndex || 0) + 1};
      width: 24px;
      height: 24px;
      padding: 0;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.5);
      font-size: 12px;
      line-height: 1;
      cursor: pointer;
      opacity: 0.4;
      transition: opacity 0.2s;
      pointer-events: auto;

      &:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.2);
      }
    }
  }
`;
