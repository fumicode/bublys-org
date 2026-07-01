import { FC, useMemo, useState, useContext, useLayoutEffect, memo, useCallback } from "react";
import styled from "styled-components";
import { Bubble } from "../Bubble.domain.js";
import { Point2, Vec2, CoordinateSystem, SmartRect, Layer } from "@bublys-org/bubbles-ui-util";
import { useMyRectObserver } from "../hooks/useMyRect.js";
import { useBubbleDrag } from "../hooks/useBubbleDrag.js";
import { useBubbleResize } from "../hooks/useBubbleResize.js";
import { useAppDispatch } from "@bublys-org/state-management";
import { renderBubble, updateBubble, finishBubbleAnimation, focusBubble } from "../state/bubbles-slice.js";
import { BubblesContext } from "../bubble-routing/BubbleRouting.js";
import { useBubbleRefsOptional } from "../context/BubbleRefsContext.js";
import { measureViewport } from "../utils/measure-viewport.js";
import { useUniverseId } from "../context/UniverseContext.js";
import { CloseIcon, ToggleSizeIcon, LayerUpIcon, LayerDownIcon } from "./BubbleIcons.js";
import { BubbleSkeleton } from "./BubbleSkeleton.js";

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
 *
 * 文法: 各セグメントは `<name>` または `<name>@<snapshot>` で、`@<snapshot>` は
 * 「at this snapshot」を表すスナップショット指定子（universe@<node> 等）。
 * @ とその後ろを専用スタイルで描き、name と区別する。
 */
const splitAtSnapshot = (segment: string): { name: string; snapshot: string | null } => {
  const i = segment.indexOf("@");
  if (i < 0) return { name: segment, snapshot: null };
  return { name: segment.slice(0, i), snapshot: segment.slice(i + 1) };
};

const StyledUrl: FC<{ url: string }> = memo(({ url }) => {
  const segments = useMemo(() => url.split("/").filter(Boolean), [url]);

  return (
    <div className="e-styled-url">
      <div className="e-styled-url-inner">
        {segments.map((segment, index) => {
          const { name, snapshot } = splitAtSnapshot(segment);
          const { text: nameText, isAbbreviated: nameAbbr } = abbreviateSlug(name);
          const snapshotAbbr = snapshot !== null ? abbreviateSlug(snapshot) : null;
          return (
            <span key={index} className="e-url-segment">
              {index > 0 && <span className="e-url-separator">/</span>}
              <span
                className={`e-url-slug ${nameAbbr ? "e-abbreviated" : ""}`}
                title={nameAbbr ? name : undefined}
              >
                {nameText}
              </span>
              {snapshot !== null && snapshotAbbr !== null && (
                <span
                  className="e-url-snapshot"
                  title={snapshotAbbr.isAbbreviated ? snapshot : undefined}
                >
                  <span className="e-url-at">@</span>
                  <span className="e-url-snapshot-node">{snapshotAbbr.text}</span>
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
});

const HEADER_PROXIMITY_THRESHOLD = 40;

type BubbleProps = {
  bubble: Bubble;

  position?: Point2; // 位置を指定するためのオプション rectのほうが優先される
  vanishingPoint?: Point2; // バニシングポイントを指定するためのオプション

  layerIndex?: number;
  zIndex?: number;
  isFocused?: boolean;
  contentBackground?: string; // コンテンツ背景色（デフォルト: white）
  hasLeftLink?: boolean; // 左側にリンクバブルが接続されているか（左角丸を無効化）
  lightweightMode?: boolean; // 軽量モード: box-shadow・transition・backdrop-filter を省略

  children?: React.ReactNode; // Bubbleか、Layoutか、Panelか。 Panelが最もベーシック
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void; // クリックイベントハンドラ
  onCloseClick?: (bubble: Bubble) => void;
  onMove?: (bubble: Bubble) => void;
  onLayerDownClick?: (bubble: Bubble) => void;
  onLayerUpClick?: (bubble: Bubble) => void;
  onResize?: (bubble: Bubble) => void;

  // デバッグ用コールバック（オプション）
  onDebugRects?: (rects: SmartRect[]) => void;
};

const BubbleViewInner: FC<BubbleProps> = ({
  bubble,
  children,
  layerIndex,
  zIndex,
  isFocused = false,
  contentBackground = "white",
  hasLeftLink = false,
  lightweightMode = false,
  position,
  vanishingPoint,
  onClick,
  onCloseClick,
  onLayerDownClick,
  onLayerUpClick,
  onMove,
  onResize,
  onDebugRects,
}) => {
  position = position || { x: 0, y: 0 };
  vanishingPoint = vanishingPoint || new Vec2({ x: 0, y: 0 });

  const vanishingPointRelative = useMemo(
    () => new Vec2(vanishingPoint).subtract(position),
    [vanishingPoint, position]
  );

  const dispatch = useAppDispatch();
  const universeId = useUniverseId();
  const { pageSize, surfaceLeftTop } = useContext(BubblesContext);
  const bubbleRefs = useBubbleRefsOptional();

  const { ref, notifyRendered} = useMyRectObserver({
    onRectChanged: (rect: SmartRect) => {
      const updated = bubble.rendered(rect);
      dispatch(renderBubble(updated.toJSON(), universeId));

      onDebugRects?.([rect]);
    }
  });

  const { onDragStart } = useBubbleDrag({ bubble, ref, layerIndex, vanishingPoint });
  const { onResizeStart } = useBubbleResize({ bubble, ref });

  const [isMouseNearTop, setIsMouseNearTop] = useState(false);
  const [headerOffset, setHeaderOffset] = useState(0);

  const isHeaderVisible = isFocused || isMouseNearTop;

  const updateHeaderSafeZone = () => {
    const bubbleRect = ref.current?.getBoundingClientRect();
    if (!bubbleRect) return;
    const headerEl = ref.current?.querySelector('.e-bubble-header');
    const headerHeight = headerEl?.getBoundingClientRect().height ?? 48;
    const headerTopInViewport = bubbleRect.top - headerHeight;
    setHeaderOffset(Math.max(0, -headerTopInViewport));
  };

  useLayoutEffect(() => {
    if (isFocused) updateHeaderSafeZone();
  }, [isFocused]);

  const isMaximized = bubble.isMaximized;

  const handleToggleSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMaximized) {
      // 最大化を解除。通常は fit-content、fillsContainer な窓は既定の窓サイズに戻る。
      const resizedBubble = bubble.restore();
      dispatch(updateBubble(resizedBubble.toJSON(), universeId));
      onResize?.(resizedBubble);
    } else {
      // 最大化: ユーザーに今見えている viewport の surface 領域いっぱいに広げる。
      if (!pageSize) return;
      const viewport = measureViewport();
      if (!viewport) return;

      const surfaceLayer = new Layer(
        0,
        surfaceLeftTop,
        vanishingPoint || { x: 0, y: 0 },
      );
      const visible = viewport.visibleRegion();

      // visible.origin = viewport 左上の universe 座標(= スクロール量)。
      // surface レイヤーでは position(layer-local) = visible.origin になる
      // （place(visible.origin) = visible.origin + surfaceOrigin = surface 枠の左上）。
      const newPosition = visible.origin;

      // サイズ = 可視ピクセルから surface インセット(= レイヤー原点)を引いた分
      const availableWidth = visible.size.width - surfaceLayer.surfaceOrigin.x;
      const availableHeight = visible.size.height - surfaceLayer.surfaceOrigin.y;

      const resizedBubble = bubble.maximizeTo({ width: availableWidth, height: availableHeight }).moveTo(newPosition);
      dispatch(updateBubble(resizedBubble.toJSON(), universeId));
      onResize?.(resizedBubble);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // UrledPlace内のクリックはpopChildがフォーカスを担うためスキップ
    if ((e.target as Element).closest('[data-url]')) return;
    dispatch(focusBubble(bubble.id, universeId));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setIsMouseNearTop(e.clientY - rect.top < HEADER_PROXIMITY_THRESHOLD);
    updateHeaderSafeZone();
  };

  const handleMouseLeave = () => {
    setIsMouseNearTop(false);
  };

  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLHeadingElement>) => {
    dispatch(focusBubble(bubble.id, universeId));
    if (!onMove) return;
    onDragStart(e);
  };

  const handleFocus = useCallback(() => {
    dispatch(focusBubble(bubble.id, universeId));
  }, [bubble.id, universeId, dispatch]);

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

  return (
    <StyledBubble
      ref={ref}
      data-bubble-id={bubble.id}
      style={{ left: position ? `${position.x}px` : 0, top: position ? `${position.y}px` : 0 }}
      colorHue={bubble.colorHue}
      zIndex={isFocused ? 100 : zIndex}
      layerIndex={layerIndex}
      transformOrigin={vanishingPointRelative}
      headerVisible={isHeaderVisible}
      headerOffset={headerOffset}
      onClick={onClick}
      onFocus={handleFocus}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTransitionEnd={() => {
        notifyRendered();
        dispatch(finishBubbleAnimation(bubble.id));
      }}
      width={bubble.size ? `${bubble.size.width}px` : undefined}
      height={bubble.size ? `${bubble.size.height}px` : undefined}
      contentBackground={contentBackground}
      hasLeftLink={hasLeftLink}
      fillsContainer={bubble.fillsContainer}
      lightweightMode={lightweightMode}
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
            {onLayerDownClick && (
              <button
                className="e-bubble-button e-layer-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLayerDownClick(bubble);
                }}
                title="奥のレイヤーへ"
              >
                <LayerUpIcon size={20} />
              </button>
            )}
            {onLayerUpClick && (
              <button
                className="e-bubble-button e-layer-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLayerUpClick(bubble);
                }}
                title="手前のレイヤーへ"
              >
                <LayerDownIcon size={20} />
              </button>
            )}
          </div>
          <h1 className="e-bubble-name">{bubble.type}</h1>
        </div>
      </header>

      <main className="e-bubble-content">
        {(layerIndex ?? 0) >= 3 && !isFocused ? <BubbleSkeleton bubble={bubble} /> : children}<br />
      </main>

      {/* 右下リサイズハンドル — ユーザーがサイズを決められる状態への入り口 */}
      <div
        className="e-resize-handle"
        onMouseDown={onResizeStart}
        title="サイズ調整"
      />
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
      prevBubble.url === nextBubble.url &&
      prevBubble.type === nextBubble.type &&
      prevBubble.colorHue === nextBubble.colorHue &&
      prevBubble.size?.width === nextBubble.size?.width &&
      prevBubble.size?.height === nextBubble.size?.height &&
      prevBubble.isMaximized === nextBubble.isMaximized &&
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
      prevProps.isFocused !== nextProps.isFocused ||
      prevProps.contentBackground !== nextProps.contentBackground ||
      prevProps.hasLeftLink !== nextProps.hasLeftLink ||
      prevProps.lightweightMode !== nextProps.lightweightMode) {
    return false;
  }

  // コールバック関数は変わっても再レンダリング不要
  return true;
});

//div のpropsに合わせて
type StyledBubbleProp = React.HTMLAttributes<HTMLDivElement> & {
  layerIndex?: number; // レイヤーのインデックス = zIndex * -1
  zIndex?: number; // = - layerIndex

  transformOrigin?: Vec2; // バニシングポイントを基準に変形するためのオプション

  colorHue: number;
  width?: string; // 幅を指定するためのオプション
  height?: string; // 高さを指定するためのオプション
  contentBackground?: string; // コンテンツ背景色
  hasLeftLink?: boolean; // 左側にリンクバブルが接続されているか
  fillsContainer?: boolean; // 中身が自前のviewportを持つ窓型コンテンツ（スクロール抑止）
  lightweightMode?: boolean; // 軽量モード
  headerVisible?: boolean;
  headerOffset?: number; // バブル上端がビューポート外にかかる場合のヘッダー押し下げ量(px)

  ref: React.RefObject<HTMLDivElement | null>;
};

const StyledBubble = styled.div<StyledBubbleProp>`
  position: absolute;

  /* pointer-events は CSS で inherited なので、ネスト universe の none を
     継承しないようにバブル自身は常に auto を明示する。 */
  pointer-events: auto;

  width: ${({ width }) => (width ? width : "fit-content")};
  height: ${({ height }) => (height ? height : "auto")};

  z-index: ${({ zIndex }) => (zIndex !== undefined ? zIndex : 0)};

  transition-property: left top transform;
  transition: ${({ lightweightMode }) => lightweightMode ? 'none' : '0.3s ease-in-out'};

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

  // 通常モードは泡っぽいグラデーション背景、軽量モードは単色（アルファ合成コスト削減）
  background: ${({ lightweightMode, colorHue }) => lightweightMode
    ? `hsl(${colorHue}, 35%, 50%)`
    : `linear-gradient(
        145deg,
        hsla(${colorHue}, 60%, 70%, 0.6) 0%,
        hsla(${colorHue}, 50%, 60%, 0.5) 30%,
        hsla(${colorHue}, 45%, 55%, 0.45) 70%,
        hsla(${colorHue}, 55%, 65%, 0.55) 100%
      )`
  };

  box-shadow: ${({ lightweightMode, colorHue }) => lightweightMode
    ? 'none'
    : `0 8px 32px hsla(${colorHue}, 50%, 30%, 0.3),
       0 2px 8px hsla(0, 0%, 0%, 0.1),
       inset 0 2px 4px hsla(0, 0%, 100%, 0.4),
       inset 0 -1px 2px hsla(${colorHue}, 50%, 30%, 0.2)`
  };

  border: 1px solid hsla(0, 0%, 100%, 0.3);
  border-radius: ${({ hasLeftLink }) => hasLeftLink ? '0 24px 24px 0' : '24px'};

  display: flex;
  flex-direction: column;

  // ガラスのような光沢エフェクト（疑似要素）— 軽量モードでは非表示
  &::before {
    content: ${({ lightweightMode }) => lightweightMode ? 'none' : "''"} ;
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

  /* キーボードフォーカス時もヘッダーを表示（アクセシビリティ）。
     :focus-within ではなく :has(:focus-visible) を使うことで、
     マウスクリックによる一時的なフォーカスではトリガーされない。
     transform は JS 管理（headerOffset 込み）なので上書きしない。 */
  &:has(:focus-visible) >.e-bubble-header {
    opacity: 1;
    pointer-events: auto;
  }

  >.e-bubble-header {
    cursor: move;
    user-select: none;
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    z-index: 1;
    padding: 8px 12px;
    border-radius: 16px;
    background: hsla(${({ colorHue }) => colorHue}, 45%, 20%, 0.7);
    backdrop-filter: blur(8px);
    border: 1px solid hsla(${({ colorHue }) => colorHue}, 50%, 50%, 0.35);
    color: hsla(0, 0%, 100%, 0.9);

    opacity: ${({ headerVisible }) => headerVisible ? 1 : 0};
    pointer-events: ${({ headerVisible }) => headerVisible ? 'auto' : 'none'};
    transform: ${({ headerVisible, headerOffset = 0 }) =>
      headerVisible ? `translateY(${headerOffset}px)` : `translateY(${headerOffset + 6}px)`};
    transition: opacity 0.15s ease, transform 0.15s ease;

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

      &.e-layer-button:hover {
        color: hsla(270, 70%, 50%, 1);
      }
    }

    .e-bubble-name {
      flex: 1;
      background: ${({ lightweightMode }) => lightweightMode
        ? 'hsla(0, 0%, 100%, 0.3)'
        : 'linear-gradient(135deg, hsla(0, 0%, 100%, 0.5) 0%, hsla(0, 0%, 100%, 0.3) 100%)'
      };
      padding: 6px 16px;
      border-radius: 16px;
      font-size: 1em;
      font-weight: 600;
      text-align: center;
      margin: 0;
      color: hsla(0, 0%, 20%, 0.9);
      box-shadow: ${({ lightweightMode }) => lightweightMode ? 'none' : 'inset 0 1px 2px hsla(0, 0%, 100%, 0.5)'};
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

        // "@<snapshot>" は git の HEAD@{N} / docker の image@digest と同じ
        // 「at this snapshot」イデオム。pill 状にまとめてスナップショット指定子
        // であることを視覚的に明示する。
        .e-url-snapshot {
          display: inline-flex;
          align-items: baseline;
          margin-left: 3px;
          padding: 1px 6px 1px 4px;
          border-radius: 8px;
          background: hsla(220, 60%, 88%, 0.55);
          border: 1px solid hsla(220, 50%, 70%, 0.35);
          font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
          font-size: 0.82em;
          line-height: 1.4;
          cursor: help;
        }

        .e-url-at {
          color: hsla(220, 60%, 45%, 0.85);
          font-weight: 700;
          margin-right: 2px;
        }

        .e-url-snapshot-node {
          color: hsla(220, 40%, 28%, 0.9);
          letter-spacing: 0.02em;
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
    // 窓型コンテンツ（universeなど）は自前のviewportを持つので、外側の
    // .e-bubble-content はスクロールしない（二重スクロールバーを避ける）。
    overflow: ${({ fillsContainer }) => (fillsContainer ? "hidden" : "auto")};
    padding: 16px;
    font-size: 1em;
    background: ${({ lightweightMode, contentBackground }) => lightweightMode
      ? (contentBackground || 'hsla(0, 0%, 100%, 0.95)')
      : `linear-gradient(
          180deg,
          ${contentBackground || 'hsla(0, 0%, 100%, 0.95)'} 0%,
          ${contentBackground || 'hsla(0, 0%, 98%, 0.9)'} 100%
        )`
    };
    border-radius: 16px;
    margin: 12px;
    box-shadow:
      inset 0 2px 4px hsla(0, 0%, 0%, 0.05),
      0 1px 2px hsla(0, 0%, 100%, 0.5);
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

  /* 右下リサイズハンドル: 普段は透明、ホバー時に薄く現れる「斜線つまみ」。 */
  > .e-resize-handle {
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
    z-index: 5;
    opacity: 0;
    transition: opacity 0.15s ease;
    /* 斜線 2 本（macOS 風のつまみ） */
    background:
      linear-gradient(135deg, transparent 0%, transparent 45%, hsla(0, 0%, 30%, 0.45) 45%, hsla(0, 0%, 30%, 0.45) 55%, transparent 55%) no-repeat,
      linear-gradient(135deg, transparent 0%, transparent 65%, hsla(0, 0%, 30%, 0.30) 65%, hsla(0, 0%, 30%, 0.30) 75%, transparent 75%) no-repeat;
  }

  &:hover > .e-resize-handle {
    opacity: 1;
  }
`;
