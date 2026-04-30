import React, { FC, useRef, useLayoutEffect, useEffect, useCallback, memo, useMemo, useState } from "react";
import styled from "styled-components";
import {
  Bubble,
  Point2,
  Vec2,
  CoordinateSystem,
  SmartRect,
  BubbleView,
  LinkBubbleView,
  selectValidBubbleRelationIds,
  selectGlobalCoordinateSystem,
  selectSurfaceLeftTop,
  selectIsLayerAnimating,
  makeSelectBubbleById,
} from "@bublys-org/bubbles-ui";
import { useAppSelector } from "@bublys-org/state-management";
import { BubbleContent } from "./BubbleContent";
import { usePositionDebugger } from "@bublys-org/bubbles-ui/debug";

/**
 * 個別バブルを自分でReduxから取得するラッパーコンポーネント
 * このバブルが変わった時だけ再レンダリングされる
 */
type ConnectedBubbleViewProps = {
  bubbleId: string;
  layerIndex: number;
  zIndex: number;
  vanishingPoint: Point2;
  surfaceLeftTop: Point2;
  hasLeftLink?: boolean;
  onBubbleClick?: (name: string) => void;
  onBubbleClose?: (bubble: Bubble) => void;
  onBubbleMove?: (bubble: Bubble) => void;
  onBubbleResize?: (bubble: Bubble) => void;
  onBubbleLayerDown?: (bubble: Bubble) => void;
  onBubbleLayerUp?: (bubble: Bubble) => void;
  onDebugRects?: (rects: SmartRect[]) => void;
};

const ConnectedBubbleView: FC<ConnectedBubbleViewProps> = memo(function ConnectedBubbleView({
  bubbleId,
  layerIndex,
  zIndex,
  vanishingPoint,
  surfaceLeftTop,
  hasLeftLink,
  onBubbleClick,
  onBubbleClose,
  onBubbleMove,
  onBubbleResize,
  onBubbleLayerDown,
  onBubbleLayerUp,
  onDebugRects,
})  {
  // このバブル専用のセレクターを使用
  const selectBubble = useMemo(() => makeSelectBubbleById(bubbleId), [bubbleId]);
  const bubble = useAppSelector(selectBubble);

  if (!bubble) return null;

  const pos = new Vec2(bubble.position || { x: 0, y: 0 }).add(surfaceLeftTop);

  return (
    <BubbleView
      bubble={bubble}
      position={pos}
      layerIndex={layerIndex}
      zIndex={zIndex}
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
      <BubbleContent bubble={bubble} />
    </BubbleView>
  );
});

/**
 * 個別のLinkBubbleを自分でReduxから取得するラッパーコンポーネント
 * opener/openeeが変わった時だけ再レンダリングされる
 */
type ConnectedLinkBubbleViewProps = {
  openerId: string;
  openeeId: string;
  coordinateSystem: CoordinateSystem;
  linkZIndex: number;
};

const ConnectedLinkBubbleView: FC<ConnectedLinkBubbleViewProps> = memo(function ConnectedLinkBubbleView({
  openerId,
  openeeId,
  coordinateSystem,
  linkZIndex,
}) {
  // 各バブル専用のセレクターを使用
  const selectOpener = useMemo(() => makeSelectBubbleById(openerId), [openerId]);
  const selectOpenee = useMemo(() => makeSelectBubbleById(openeeId), [openeeId]);
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

type BubblesLayeredViewProps = {
  bubbleLayers: string[][];
  vanishingPoint?: Point2;
  onBubbleClick?: (name: string) => void;
  onBubbleClose?: (bubble: Bubble) => void;
  onBubbleMove?: (bubble: Bubble) => void;
  onBubbleResize?: (bubble: Bubble) => void;
  onBubbleLayerDown?: (bubble: Bubble) => void;
  onBubbleLayerUp?: (bubble: Bubble) => void;
  onCoordinateSystemReady?: (coordinateSystem: CoordinateSystem) => void;
  /** キャンバスズーム用ref（BubblesUIから受け取り、ドラッグ計算に使用） */
  canvasZoomRef?: React.MutableRefObject<number>;
  /** キャンバスパン用ref（BubblesUIから受け取り） */
  canvasPanRef?: React.MutableRefObject<Point2>;
};

export const BubblesLayeredView: FC<BubblesLayeredViewProps> = ({
  bubbleLayers,
  vanishingPoint,
  onBubbleClick,
  onBubbleClose,
  onBubbleMove,
  onBubbleResize,
  onBubbleLayerDown,
  onBubbleLayerUp,
  onCoordinateSystemReady,
  canvasZoomRef: externalZoomRef,
  canvasPanRef: externalPanRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // 外部refが渡されない場合のローカルfallback
  const localZoomRef = useRef(1);
  const localPanRef = useRef<Point2>({ x: 0, y: 0 });
  const zoomRef = externalZoomRef ?? localZoomRef;
  const panRef = externalPanRef ?? localPanRef;

  // Space キーによるパンモードの状態（カーソル表示用のみ）
  const [isPanMode, setIsPanMode] = useState(false);
  const isSpaceDownRef = useRef(false);

  // キャンバスのCSS transformを直接DOM更新（Reactの再レンダリングを避けてパフォーマンス向上）
  const applyCanvasTransform = useCallback(() => {
    if (!canvasRef.current) return;
    const { x, y } = panRef.current;
    const zoom = zoomRef.current;
    canvasRef.current.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
  }, [panRef, zoomRef]);

  // ── ホイールイベント（zoom / trackpad pan）──────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // バブルのコンテンツ内スクロールはキャンバス操作に変換しない
      const target = e.target as HTMLElement;
      if (target.closest('.e-bubble-content')) return;

      e.preventDefault();

      if (e.ctrlKey) {
        // ピンチジェスチャー / Ctrl+スクロール → ズーム
        const zoomFactor = Math.exp(-e.deltaY * 0.005);
        const oldZoom = zoomRef.current;
        const newZoom = Math.max(0.1, Math.min(8, oldZoom * zoomFactor));

        // カーソル位置を中心にズーム
        const rect = container.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;
        const oldPan = panRef.current;

        zoomRef.current = newZoom;
        panRef.current = {
          x: cursorX - ((cursorX - oldPan.x) / oldZoom) * newZoom,
          y: cursorY - ((cursorY - oldPan.y) / oldZoom) * newZoom,
        };
      } else {
        // 二本指スクロール → パン
        panRef.current = {
          x: panRef.current.x - e.deltaX,
          y: panRef.current.y - e.deltaY,
        };
      }

      applyCanvasTransform();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoomRef, panRef, applyCanvasTransform]);

  // ── Space キー（パンモード切替）──────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !e.repeat &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        isSpaceDownRef.current = true;
        setIsPanMode(true);
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceDownRef.current = false;
        setIsPanMode(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // ── マウスドラッグによるパン（中ボタン or Space+左ボタン）──────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const isMiddle = e.button === 1;
    const isSpaceDrag = e.button === 0 && isSpaceDownRef.current;
    if (!isMiddle && !isSpaceDrag) return;

    e.preventDefault();
    e.stopPropagation();

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startPanX = panRef.current.x;
    const startPanY = panRef.current.y;

    const handleMove = (e: MouseEvent) => {
      panRef.current = {
        x: startPanX + (e.clientX - startMouseX),
        y: startPanY + (e.clientY - startMouseY),
      };
      applyCanvasTransform();
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [panRef, applyCanvasTransform]);

  // ── CoordinateSystem の更新（コンテナ位置変更時）──────────────────────
  useLayoutEffect(() => {
    let lastOffset = { x: 0, y: 0 };
    let lastVanishingPoint = { x: 0, y: 0 };

    const updateCoordinateSystem = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const currentVanishingPoint = vanishingPoint || { x: 0, y: 0 };

        if (
          rect.left === lastOffset.x &&
          rect.top === lastOffset.y &&
          currentVanishingPoint.x === lastVanishingPoint.x &&
          currentVanishingPoint.y === lastVanishingPoint.y
        ) {
          return;
        }

        lastOffset = { x: rect.left, y: rect.top };
        lastVanishingPoint = currentVanishingPoint;

        const coordinateSystem = new CoordinateSystem(
          0,
          { x: rect.left, y: rect.top },
          currentVanishingPoint
        );
        onCoordinateSystemReady?.(coordinateSystem);
      }
    };

    updateCoordinateSystem();

    const resizeObserver = new ResizeObserver(() => {
      updateCoordinateSystem();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    let rafId: number | null = null;
    const handleResize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        updateCoordinateSystem();
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

  // ── Redux からのデータ取得 ─────────────────────────────────────────────
  const relationIds = useAppSelector(selectValidBubbleRelationIds);
  const surfaceLeftTop = useAppSelector(selectSurfaceLeftTop);
  const coordinateSystem = useAppSelector(selectGlobalCoordinateSystem);
  const isLayerAnimating = useAppSelector(selectIsLayerAnimating);

  const { addRects } = usePositionDebugger();

  const undergroundVanishingPoint: Point2 = vanishingPoint || { x: 20, y: 10 };
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

  const renderedBubbles = bubbleLayers
    .map((layer, layerIndex) =>
      layer.map((bubbleId) => {
        const zIndex = baseZIndex - layerIndex;
        const hasLeftLink = openeeIds.has(bubbleId);

        return (
          <ConnectedBubbleView
            key={bubbleId}
            bubbleId={bubbleId}
            layerIndex={layerIndex}
            zIndex={zIndex}
            vanishingPoint={undergroundVanishingPoint}
            surfaceLeftTop={surfaceLeftTop}
            hasLeftLink={hasLeftLink}
            onBubbleClick={onBubbleClick}
            onBubbleClose={onBubbleClose}
            onBubbleMove={onBubbleMove}
            onBubbleResize={onBubbleResize}
            onBubbleLayerDown={onBubbleLayerDown}
            onBubbleLayerUp={onBubbleLayerUp}
            onDebugRects={addRects}
          />
        );
      })
    )
    .flat();

  // styled-components v5 は ref を直接受け取れないため、
  // plain div を外側に置いて containerRef を持たせる
  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    >
      <StyledViewport
        isPanMode={isPanMode}
        onMouseDown={handleMouseDown}
      >
        {/* キャンバス層：CSS transform で pan/zoom を実現 */}
        <div
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transformOrigin: '0 0',
            // 初期 transform（applyCanvasTransform で直接更新される）
            transform: 'translate(0px, 0px) scale(1)',
          }}
        >
          <StyledCanvas>
            {renderedBubbles}

            {/* アニメーション中はLinkBubbleを非表示にする（位置ズレ防止） */}
            {!isLayerAnimating &&
              relationIds.map(({ openerId, openeeId }) => {
                const linkZIndex = bubbleIdToZIndex[openeeId] - 1;
                return (
                  <ConnectedLinkBubbleView
                    key={`${openerId}_${openeeId}`}
                    openerId={openerId}
                    openeeId={openeeId}
                    coordinateSystem={coordinateSystem}
                    linkZIndex={linkZIndex}
                  />
                );
              })
            }
          </StyledCanvas>
        </div>
      </StyledViewport>
    </div>
  );
};

// ── Styled Components ──────────────────────────────────────────────────────

/**
 * 画面に見えるビューポート。クリッピングと背景を担当。
 * overflow: hidden でキャンバス外のバブルを非表示にする。
 */
const StyledViewport = styled.div<React.HTMLAttributes<HTMLDivElement> & { isPanMode: boolean }>`
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  cursor: ${({ isPanMode }) => isPanMode ? 'grab' : 'default'};

  // 上品な藍色のグラデーション背景（固定。キャンバスパンに追従しない）
  background: linear-gradient(
    145deg,
    hsl(220, 35%, 18%) 0%,
    hsl(225, 40%, 22%) 40%,
    hsl(230, 35%, 20%) 100%
  );
`;

type StyledCanvasProps = {
  children?: React.ReactNode;
};

/**
 * キャンバス本体。バブルを配置する空間。
 * overflow: visible でキャンバス外への配置を許容（ビューポートがクリップする）。
 */
const StyledCanvas = styled.div<StyledCanvasProps>`
  width: 100%;
  height: 100%;
  position: relative;
  overflow: visible;
  z-index: 0;
  background: transparent;
`;
