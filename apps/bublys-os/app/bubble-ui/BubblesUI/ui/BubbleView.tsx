import { FC, useEffect, useMemo, useRef, useState, useContext, useLayoutEffect, memo } from "react";
import styled from "styled-components";
import { Bubble, Point2, Vec2, CoordinateSystem } from "@bublys-org/bubbles-ui";
import { usePositionDebugger } from "../../PositionDebugger/domain/PositionDebuggerContext";

/**
 * 泡っぽい閉じるボタンのSVGアイコン
 */
const CloseIcon: FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.15" />
    <path
      d="M8 8L16 16M16 8L8 16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 最大化/縮小トグルボタンのSVGアイコン
 */
const ToggleSizeIcon: FC<{ size?: number; isMaximized: boolean }> = ({ size = 18, isMaximized }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.15" />
    {isMaximized ? (
      // 縮小アイコン（内向き矢印）
      <>
        <path d="M8 8L10 10M16 16L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M16 8L14 10M8 16L10 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ) : (
      // 最大化アイコン（四角）
      <rect x="7" y="7" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
    )}
  </svg>
);
import { useMyRectObserver } from "../../01_Utils/01_useMyRect";
import { useAppDispatch } from "@bublys-org/state-management";
import { renderBubble, updateBubble, finishBubbleAnimation } from "@bublys-org/bubbles-ui-state";
import { SmartRect } from "@bublys-org/bubbles-ui";
import { BubblesContext } from "../domain/BubblesContext";
import { useBubbleRefsOptional } from "../domain/BubbleRefsContext";
//import { SmartRectView } from "../../PositionDebugger/ui/SmartRectView";

/**
 * 長いslug（UUIDなど）を省略表示する
 * 20文字以上の場合: 前2文字 + ... + 後4文字
 */
const abbreviateSlug = (slug: string): { text: string; isAbbreviated: boolean } => {
  if (slug.length >= 20) {
    return {
      text: `${slug.slice(0, 2)}…${slug.slice(-4)}`,
      isAbbreviated: true,
    };
  }
  return { text: slug, isAbbreviated: false };
};

/**
 * URLをパースしてスタイル付きで表示するコンポーネント
 * memo化して不要な再レンダリングを防止
 * CSSのdirection:rtlで右端から表示（強制リフローを完全に回避）
 */
const StyledUrl: FC<{ url: string }> = memo(({ url }) => {
  const segments = useMemo(() => url.split("/").filter(Boolean), [url]);

  return (
    <div className="e-styled-url">
      <div className="e-styled-url-inner">
        {segments.map((segment, index) => {
          const { text, isAbbreviated } = abbreviateSlug(segment);
          return (
            <span key={index} className="e-url-segment">
              {index > 0 && <span className="e-url-separator">/</span>}
              <span
                className={`e-url-slug ${isAbbreviated ? "e-abbreviated" : ""}`}
                title={isAbbreviated ? segment : undefined}
              >
                {text}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
});

type BubbleProps = {
  bubble: Bubble;

  position?: Point2; // 位置を指定するためのオプション rectのほうが優先される
  vanishingPoint?: Point2; // バニシングポイントを指定するためのオプション

  layerIndex?: number;
  zIndex?: number;
  contentBackground?: string; // コンテンツ背景色（デフォルト: white）
  hasLeftLink?: boolean; // 左側にリンクバブルが接続されているか（左角丸を無効化）
  isLayerHovered?: boolean; // このレイヤーがホバーされているか

  children?: React.ReactNode; // Bubbleか、Layoutか、Panelか。 Panelが最もベーシック
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void; // クリックイベントハンドラ
  onCloseClick?: (bubble: Bubble) => void;
  onMove?: (bubble: Bubble) => void;
  onLayerDownClick?: (bubble: Bubble) => void;
  onLayerUpClick?: (bubble: Bubble) => void;
  onResize?: (bubble: Bubble) => void;
};

const BubbleViewInner: FC<BubbleProps> = ({
  bubble,
  children,
  layerIndex,
  zIndex,
  contentBackground = "white",
  hasLeftLink = false,
  isLayerHovered = false,
  position,
  vanishingPoint,
  onClick,
  onCloseClick,
  onLayerDownClick,
  onLayerUpClick,
  onMove,
  onResize,
}) => {
  position = position || { x: 0, y: 0 };
  vanishingPoint = vanishingPoint || new Vec2({ x: 0, y: 0 });

  const vanishingPointRelative = useMemo(
    () => new Vec2(vanishingPoint).subtract(position),
    [vanishingPoint, position]
  );

  const { addRects } = usePositionDebugger();
  const dispatch = useAppDispatch();
  const { coordinateSystem, pageSize, surfaceLeftTop } = useContext(BubblesContext);
  const bubbleRefs = useBubbleRefsOptional();

  // ドラッグハンドラ用に最新値を保持
  const surfaceLeftTopRef = useRef(surfaceLeftTop);
  surfaceLeftTopRef.current = surfaceLeftTop;
  const vanishingPointRef = useRef(vanishingPoint);
  vanishingPointRef.current = vanishingPoint;

  const { ref, notifyRendered} = useMyRectObserver({ 
    onRectChanged: (rect: SmartRect) => {
      const updated = bubble.rendered(rect);
      dispatch(renderBubble(updated.toJSON()));

      addRects([rect])
    }
  });

  const [isFocused, setIsFocused] = useState(false);

  // レイヤーが変わったらフォーカスを解除する
  useEffect(() => {
    setIsFocused(false);
  }, [layerIndex]);

  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartMouseRef = useRef<{ x: number; y: number } | null>(null);
  const currentDragPosRef = useRef<{ x: number; y: number } | null>(null);

  const endDrag = () => {
    // ドラッグ終了時のみRedux更新（パフォーマンス最適化）
    if (currentDragPosRef.current) {
      dispatch(updateBubble(bubble.moveTo(currentDragPosRef.current).toJSON()));
    }
    // インラインスタイルをクリア（styled-componentsに制御を戻す）
    if (ref.current) {
      ref.current.style.transition = '';
      ref.current.style.transformOrigin = '';
      ref.current.style.left = '';
      ref.current.style.top = '';
    }
    dragStartPosRef.current = null;
    dragStartMouseRef.current = null;
    currentDragPosRef.current = null;
    document.removeEventListener("mousemove", handleDragging);
    document.removeEventListener("mouseup", endDrag);
  };

  const handleDragging = (e: MouseEvent) => {
    if (!dragStartPosRef.current || !dragStartMouseRef.current || !ref.current) return;
    const screenDelta = {
      x: e.clientX - dragStartMouseRef.current.x,
      y: e.clientY - dragStartMouseRef.current.y,
    };

    // CoordinateSystemを使ってスクリーン座標→ローカル座標の変換を行う
    const coordSystem = CoordinateSystem.fromLayerIndex(layerIndex || 0)
      .withVanishingPoint(vanishingPointRef.current || { x: 0, y: 0 });

    // スクリーン座標でのマウス移動量をローカル座標系での移動量に変換
    const localDelta = coordSystem.transformScreenDeltaToLocal(screenDelta);
    const newPos = {
      x: dragStartPosRef.current.x + localDelta.x,
      y: dragStartPosRef.current.y + localDelta.y,
    };

    // ドラッグ中はDOM直接操作（Redux更新を避けてパフォーマンス向上）
    currentDragPosRef.current = newPos;
    const offset = surfaceLeftTopRef.current;
    const screenPos = {
      x: newPos.x + offset.x,
      y: newPos.y + offset.y,
    };
    ref.current.style.left = `${screenPos.x}px`;
    ref.current.style.top = `${screenPos.y}px`;
    ref.current.style.transition = 'none'; // ドラッグ中はトランジション無効

    // transform-originも更新（vanishingPointとの相対位置を維持）
    // これがないと、Redux更新後にtransform-originが再計算されて位置がズレる
    const newTransformOrigin = coordSystem.calculateTransformOrigin(screenPos);
    ref.current.style.transformOrigin = `${newTransformOrigin.x}px ${newTransformOrigin.y}px`;
  };

  const isMaximized = !!bubble.size;

  const handleToggleSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMaximized) {
      // フィットに戻す
      const resizedBubble = Bubble.fromJSON({ ...bubble.toJSON(), size: undefined });
      dispatch(updateBubble(resizedBubble.toJSON()));
      onResize?.(resizedBubble);
    } else {
      // 最大化
      if (!pageSize) return;
      const globalCoordinateSystem = coordinateSystem;
      const availableWidth = pageSize.width - globalCoordinateSystem.offset.x - surfaceLeftTop.x;
      const availableHeight = pageSize.height - globalCoordinateSystem.offset.y - surfaceLeftTop.y;
      const newPosition = { x: 0, y: 0 };

      const resizedBubble = bubble.resizeTo({ width: availableWidth, height: availableHeight }).moveTo(newPosition);
      dispatch(updateBubble(resizedBubble.toJSON()));
      onResize?.(resizedBubble);
    }
  };

  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLHeadingElement>) => {
    setIsFocused(true); // ヘッダークリックで最前面に
    if (!onMove) return;
    e.stopPropagation();
    dragStartPosRef.current = { ...bubble.position };
    dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
    document.addEventListener("mousemove", handleDragging);
    document.addEventListener("mouseup", endDrag);
  };

  const handleMouseLeave = () => {
    setIsFocused(false);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleDragging);
      document.removeEventListener("mouseup", endDrag);
    };
  }, []);

  // DOM参照をContextに登録
  useLayoutEffect(() => {
    if (ref.current && bubbleRefs) {
      bubbleRefs.registerBubbleRef(bubble.id, ref.current);
    }
    return () => {
      if (bubbleRefs) {
        bubbleRefs.unregisterBubbleRef(bubble.id);
      }
    };
  }, [bubble.id, bubbleRefs, ref]);

  // レイヤーホバー時またはフォーカス時は最前面に
  const effectiveZIndex = isFocused ? 200 : isLayerHovered ? 150 : zIndex;

  return (
    <StyledBubble
      ref={ref}
      data-bubble-id={bubble.id}
      colorHue={bubble.colorHue}
      zIndex={effectiveZIndex}
      layerIndex={layerIndex}
      position={position}
      transformOrigin={vanishingPointRelative}
      onClick={onClick}
      onMouseLeave={handleMouseLeave}
      onTransitionEnd={() => {
        notifyRendered();
        dispatch(finishBubbleAnimation(bubble.id));
      }}
      width={bubble.size ? `${bubble.size.width}px` : undefined}
      height={bubble.size ? `${bubble.size.height}px` : undefined}
      contentBackground={contentBackground}
      hasLeftLink={hasLeftLink}
      isFocused={isFocused}
      isLayerHovered={isLayerHovered}
    >
      <header className="e-bubble-header" onMouseDown={handleHeaderMouseDown}>
        <div
          className="e-address-bar"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <StyledUrl url={bubble.url} />
        </div>
        <div className="e-header-content">
          <div className="e-header-buttons">
            {onCloseClick && (
              <button
                className="e-bubble-button e-close-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseClick?.(bubble);
                }}
              >
                <CloseIcon size={20} />
              </button>
            )}
            <button
              className="e-bubble-button e-toggle-size-button"
              onClick={handleToggleSize}
              title={isMaximized ? "フィット" : "最大化"}
            >
              <ToggleSizeIcon size={20} isMaximized={isMaximized} />
            </button>
          </div>
          <h1 className="e-bubble-name">{bubble.type}</h1>
        </div>
      </header>

      <main className="e-bubble-content">
        {/* 
        Type: {bubble.type}
        #{bubble.id}
        <br />
        <br /> */}
        {/* <div style={{backgroundColor: `hsl(${bubble.colorHue}, 50%, 50%)`}}></div>
        ({bubble?.position?.x},{bubble?.position?.y})<br />
        [{bubble.renderedRect?.width}x{bubble.renderedRect?.height}] */}
        {children}<br />
        {/* #{bubble.id} */}
      </main>

      {
        // bubble.renderedRect && (
        //   <SmartRectView rect={bubble.renderedRect} />
        // )
      }
      {/* {bubble.renderedRect && ( // デバッグ用矩形
        <div className="e-debug-rect"
          style={{ width: bubble.renderedRect.width  , height: bubble.renderedRect.height  }}>
        </div>
      )} */}

    </StyledBubble>
  );
};

// React.memoでメモ化（ドラッグ中に他のバブルが不要に再レンダリングされるのを防ぐ）
// カスタム比較関数でビジュアルに影響するpropsのみ比較（コールバックは除外）
export const BubbleView = memo(BubbleViewInner, (prevProps, nextProps) => {
  // bubble自体が変わった場合（位置以外の属性変更）は再レンダリング
  if (prevProps.bubble !== nextProps.bubble) {
    // 位置だけが変わった場合はドラッグ中なので再レンダリング不要（DOM直接操作）
    const prevBubble = prevProps.bubble;
    const nextBubble = nextProps.bubble;
    const onlyPositionChanged =
      prevBubble.id === nextBubble.id &&
      prevBubble.type === nextBubble.type &&
      prevBubble.colorHue === nextBubble.colorHue &&
      prevBubble.size?.width === nextBubble.size?.width &&
      prevBubble.size?.height === nextBubble.size?.height &&
      prevBubble.contentBackground === nextBubble.contentBackground;

    if (!onlyPositionChanged) {
      return false; // 再レンダリングが必要
    }
  }

  // position（surfaceLeftTop適用後）が変わった場合も再レンダリング
  if (prevProps.position?.x !== nextProps.position?.x ||
      prevProps.position?.y !== nextProps.position?.y) {
    return false;
  }

  // その他のビジュアルに影響するprops
  // 注: childrenの比較は削除。React要素は毎回新しい参照になるため浅い比較では機能しない。
  // BubbleContentがmemo化されているので、BubbleView自体が再レンダリングされても
  // BubbleContent内部は再レンダリングされない。
  if (prevProps.layerIndex !== nextProps.layerIndex ||
      prevProps.zIndex !== nextProps.zIndex ||
      prevProps.contentBackground !== nextProps.contentBackground ||
      prevProps.hasLeftLink !== nextProps.hasLeftLink ||
      prevProps.isLayerHovered !== nextProps.isLayerHovered) {
    return false;
  }

  // コールバック関数は変わっても再レンダリング不要
  return true;
});

//div のpropsに合わせて
type StyledBubbleProp = React.HTMLAttributes<HTMLDivElement> & {
  position?: Point2; // 位置を指定するためのオプション
  layerIndex?: number; // レイヤーのインデックス = zIndex * -1
  zIndex?: number; // = - layerIndex

  transformOrigin?: Vec2; // バニシングポイントを基準に変形するためのオプション

  colorHue: number;
  width?: string; // 幅を指定するためのオプション
  height?: string; // 高さを指定するためのオプション
  contentBackground?: string; // コンテンツ背景色
  hasLeftLink?: boolean; // 左側にリンクバブルが接続されているか
  isFocused?: boolean; // フォーカス状態（前面表示）
  isLayerHovered?: boolean; // レイヤーがホバーされている状態

  ref: React.RefObject<HTMLDivElement | null>;
};

const StyledBubble = styled.div<StyledBubbleProp>`
  position: absolute;

  width: ${({ width }) => (width ? width : "fit-content")};
  height: ${({ height }) => (height ? height : "auto")};

  z-index: ${({ zIndex }) => (zIndex !== undefined ? zIndex : 0)};

  left: ${({ position }) => (position ? `${position.x}px` : "0")};
  top: ${({ position }) => (position ? `${position.y}px` : "0")};

  transition-property: left top transform;
  transition: 0.3s ease-in-out;

  transform-origin: ${({ transformOrigin }) =>
    transformOrigin
      ? `${transformOrigin.x}px ${transformOrigin.y}px`
      : "center center"};

  // ここで奥のレイヤーほどスケールを小さくしている。
  // CoordinateSystem.fromLayerIndex()を使用してscale計算を一箇所に凝集
  transform: scale(
    ${({ layerIndex }) => CoordinateSystem.fromLayerIndex(layerIndex ?? 0).scale}
  );

  max-height: 90vh;//FIXME:突貫対応

  // 泡っぽいグラデーション背景
  background: linear-gradient(
    145deg,
    hsla(${({ colorHue }) => colorHue}, 60%, 70%, 0.6) 0%,
    hsla(${({ colorHue }) => colorHue}, 50%, 60%, 0.5) 30%,
    hsla(${({ colorHue }) => colorHue}, 45%, 55%, 0.45) 70%,
    hsla(${({ colorHue }) => colorHue}, 55%, 65%, 0.55) 100%
  );

  // 泡っぽいシャドウと光沢
  box-shadow:
    0 8px 32px hsla(${({ colorHue }) => colorHue}, 50%, 30%, 0.3),
    0 2px 8px hsla(0, 0%, 0%, 0.1),
    inset 0 2px 4px hsla(0, 0%, 100%, 0.4),
    inset 0 -1px 2px hsla(${({ colorHue }) => colorHue}, 50%, 30%, 0.2);

  border: 1px solid hsla(0, 0%, 100%, 0.3);
  border-radius: ${({ hasLeftLink }) => hasLeftLink ? '0 24px 24px 0' : '24px'};

  display: flex;
  flex-direction: column;

  // ガラスのような光沢エフェクト（疑似要素）
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(
      to bottom,
      hsla(0, 0%, 100%, 0.2) 0%,
      hsla(0, 0%, 100%, 0.05) 50%,
      transparent 100%
    );
    border-radius: ${({ hasLeftLink }) => hasLeftLink ? '0 24px 50% 50%' : '24px 24px 50% 50%'};
    pointer-events: none;
  }

  >.e-bubble-header {
    cursor: move;
    user-select: none;
    position: relative;
    padding: 12px 16px 8px;

    .e-header-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .e-header-buttons {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }

    .e-bubble-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: linear-gradient(
        135deg,
        hsla(0, 0%, 100%, 0.7) 0%,
        hsla(0, 0%, 100%, 0.4) 100%
      );
      box-shadow:
        0 2px 6px hsla(0, 0%, 0%, 0.15),
        inset 0 1px 2px hsla(0, 0%, 100%, 0.8);
      cursor: pointer;
      color: hsla(0, 0%, 30%, 0.8);
      transition: all 0.15s ease;

      &:hover {
        background: linear-gradient(
          135deg,
          hsla(0, 0%, 100%, 0.9) 0%,
          hsla(0, 0%, 100%, 0.6) 100%
        );
        transform: scale(1.1);
        box-shadow:
          0 3px 8px hsla(0, 0%, 0%, 0.2),
          inset 0 1px 2px hsla(0, 0%, 100%, 0.9);
      }

      &:active {
        transform: scale(0.95);
      }

      &.e-close-button:hover {
        color: hsla(0, 70%, 50%, 1);
      }

      &.e-toggle-size-button:hover {
        color: hsla(210, 70%, 50%, 1);
      }
    }

    .e-bubble-name {
      flex: 1;
      background: linear-gradient(
        135deg,
        hsla(0, 0%, 100%, 0.5) 0%,
        hsla(0, 0%, 100%, 0.3) 100%
      );
      padding: 6px 16px;
      border-radius: 16px;
      font-size: 1em;
      font-weight: 600;
      text-align: center;
      margin: 0;
      color: hsla(0, 0%, 20%, 0.9);
      box-shadow: inset 0 1px 2px hsla(0, 0%, 100%, 0.5);
    }

    .e-address-bar {
      position: absolute;
      left: 50%;
      bottom: 100%;
      transform: translateX(-50%);
      margin-bottom: 8px;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s ease, visibility 0.2s ease;
      z-index: 10;

      .e-styled-url {
        max-width: 400px;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 8px 16px;
        border: none;
        border-radius: 20px;
        background: linear-gradient(
          135deg,
          hsla(200, 80%, 90%, 0.95) 0%,
          hsla(180, 70%, 95%, 0.9) 50%,
          hsla(220, 60%, 92%, 0.95) 100%
        );
        box-shadow:
          0 4px 16px hsla(200, 50%, 50%, 0.3),
          0 2px 4px hsla(0, 0%, 0%, 0.1),
          inset 0 1px 2px hsla(0, 0%, 100%, 0.8);
        font-size: 0.85em;
        scrollbar-width: none;
        -ms-overflow-style: none;
        // direction: rtlで右端から表示（JSでscrollLeftを設定する必要なし）
        direction: rtl;

        &::-webkit-scrollbar {
          display: none;
        }

        .e-styled-url-inner {
          display: flex;
          align-items: center;
          white-space: nowrap;
          // テキスト方向を通常に戻す
          direction: ltr;
        }

        .e-url-segment {
          display: inline-flex;
          align-items: center;
        }

        .e-url-separator {
          font-size: 0.75em;
          color: hsla(200, 30%, 50%, 0.5);
          margin: 0 2px;
          font-weight: 300;
        }

        .e-url-slug {
          color: hsla(200, 40%, 30%, 1);
          font-weight: 500;

          &.e-abbreviated {
            color: hsla(200, 30%, 50%, 0.8);
            font-size: 0.9em;
            cursor: help;
          }
        }
      }
    }

    &:hover .e-address-bar {
      opacity: 1;
      visibility: visible;
    }
  }

  >.e-bubble-content {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    padding: 16px;
    font-size: 1em;
    background: linear-gradient(
      180deg,
      ${({ contentBackground }) => contentBackground || "hsla(0, 0%, 100%, 0.95)"} 0%,
      ${({ contentBackground }) => contentBackground || "hsla(0, 0%, 98%, 0.9)"} 100%
    );
    border-radius: 16px;
    margin: 0 12px 12px;
    box-shadow:
      inset 0 2px 4px hsla(0, 0%, 0%, 0.05),
      0 1px 2px hsla(0, 0%, 100%, 0.5);
    // undergroundのバブル（layerIndex > 1）はコンテンツを半透明に（フォーカス時・レイヤーホバー時は除く）
    opacity: ${({ layerIndex, isFocused, isLayerHovered }) => (layerIndex && layerIndex > 1 && !isFocused && !isLayerHovered) ? 0.7 : 1};
  }

  >.e-debug-rect {
    //下中央
    display: flex;
    justify-content: center;
    align-items: end;

    border-radius: 30px;

    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    border: 1px solid blue;
    pointer-events: none;
    box-sizing: border-box;
    
  }
`;
