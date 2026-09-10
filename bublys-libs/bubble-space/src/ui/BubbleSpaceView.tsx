"use client";
import type React from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";
import styled from "styled-components";
import type { BubbleNode } from "../domain/types.js";
import type { Placement, Resolved, RibbonPiece } from "../domain/resolve.js";
import type { Rect } from "../domain/geometry.js";
import type { Space } from "../domain/space.js";
import { ribbonPath, threadPath, seamLine } from "./ribbon-path.js";

export type BubbleSpaceViewProps = {
  space: Space;
  resolved: Resolved;
  /** 泡の中身は呼び出し側が描く。空間はレイアウトだけを引き受ける。 */
  renderBubble: (node: BubbleNode, placement: Placement) => ReactNode;
  /** ヘッダの右側に置くもの（閉じるボタンなど） */
  renderHeaderExtra?: (node: BubbleNode, placement: Placement) => ReactNode;
  containerRef?: RefObject<HTMLDivElement | null>;
  selectedId?: string;
  magnet?: { rect: Rect; label: string } | null;
  showAnchors?: boolean;
  /** ドラッグ中は CSS トランジションを切る */
  dragging?: boolean;
  backdrop?: string;
  /** ヘッダを掴んだとき。中身の操作を邪魔しないよう、ドラッグはヘッダからだけ始まる。 */
  onBubblePointerDown?: (id: string, e: ReactPointerEvent<HTMLDivElement>) => void;
  onBubbleSelect?: (id: string) => void;
  onResizePointerDown?: (id: string, e: ReactPointerEvent<HTMLDivElement>) => void;
  onBackgroundPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onBubbleDoubleClick?: (id: string) => void;
};

/**
 * 解決された Placement を DOM に落とすだけの表示層。
 * ★ レンズの出力は translate + scale + opacity に収まるので、Canvas と同じ式が DOM で動く。
 */
export function BubbleSpaceView({
  space, resolved, renderBubble, renderHeaderExtra, containerRef, selectedId, magnet,
  showAnchors = false, dragging = false, backdrop,
  onBubblePointerDown, onBubbleSelect, onResizePointerDown, onBackgroundPointerDown,
  onBubbleDoubleClick,
}: BubbleSpaceViewProps) {
  return (
    <StyledSurface
      ref={containerRef}
      $dragging={dragging}
      style={backdrop ? { background: backdrop } : undefined}
      onPointerDown={onBackgroundPointerDown}
    >
      {resolved.ribbons.map((r) => (
        <RibbonSvg key={r.relationId} piece={r} />
      ))}

      {resolved.placements.map((p) => {
        const node = space.bubble(p.id);
        if (!node) return null;
        if (p.opacity < 0.03 || p.scale < 0.02) return null;
        const style: CSSProperties = {
          width: p.w,
          height: p.h,
          transform: `translate3d(${p.x}px, ${p.y}px, 0) scale(${p.scale})`,
          zIndex: p.zIndex,
          opacity: p.opacity,
        };
        return (
          <StyledBubble
            key={p.id}
            style={style}
            $selected={p.id === selectedId}
            $hue={node.hue ?? 210}
            data-bubble-id={p.id}
            onPointerDown={(e) => {
              e.stopPropagation();
              onBubbleSelect?.(p.id);
            }}
            onDoubleClick={() => onBubbleDoubleClick?.(p.id)}
          >
            <div
              className="e-head"
              onPointerDown={(e) => {
                e.stopPropagation();
                onBubblePointerDown?.(p.id, e);
              }}
            >
              <span className="e-title">{node.title}</span>
              {renderHeaderExtra?.(node, p)}
            </div>
            <div className="e-content">{renderBubble(node, p)}</div>
            {!p.sizedByAnchor && p.id === selectedId && (
              <StyledHandle
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onResizePointerDown?.(p.id, e);
                }}
              />
            )}
          </StyledBubble>
        );
      })}

      {showAnchors &&
        resolved.placements
          .filter((p) => p.anchorRect)
          .map((p) => (
            <StyledAnchor
              key={`a-${p.id}`}
              style={{
                transform: `translate3d(${p.anchorRect!.x}px, ${p.anchorRect!.y}px, 0)`,
                width: p.anchorRect!.w,
                height: p.anchorRect!.h,
                zIndex: p.zIndex,
              }}
            />
          ))}

      {magnet && (
        <StyledMagnet
          style={{
            transform: `translate3d(${magnet.rect.x}px, ${magnet.rect.y}px, 0)`,
            width: magnet.rect.w,
            height: magnet.rect.h,
          }}
        >
          <span>{magnet.label}</span>
        </StyledMagnet>
      )}
    </StyledSurface>
  );
}

function RibbonSvg({ piece }: { piece: RibbonPiece }) {
  const common = { position: "absolute" as const, inset: 0, pointerEvents: "none" as const, zIndex: piece.zIndex };
  if (piece.style === "seam") {
    const l = seamLine(piece.hostRect ?? piece.from, piece.to, piece.side ?? "e");
    return (
      <svg style={common} width="100%" height="100%">
        <line {...l} stroke={`hsla(${piece.hue},70%,55%,.65)`} strokeWidth={3} />
      </svg>
    );
  }
  if (piece.style === "thread") {
    return (
      <svg style={common} width="100%" height="100%">
        <path d={threadPath(piece.from, piece.to)} fill="none"
          stroke={`hsla(${piece.hue},70%,58%,.75)`} strokeWidth={1.6} strokeDasharray="6 5" />
        <circle cx={piece.to.x + piece.to.w / 2} cy={piece.to.y + piece.to.h / 2} r={3.2}
          fill={`hsla(${piece.hue},70%,58%,.9)`} />
      </svg>
    );
  }
  return (
    <svg style={{ ...common, opacity: piece.opacity }} width="100%" height="100%">
      <path d={ribbonPath(piece.from, piece.to)}
        fill={`hsla(${piece.hue},55%,50%,.22)`}
        stroke={`hsla(${piece.hue},60%,62%,.45)`} strokeWidth={1} />
    </svg>
  );
}

// styled-components v5 + React 19 の型回避（リポジトリの他ライブラリと同じ流儀）
type DivProps = React.HTMLAttributes<HTMLDivElement>;
type DivPropsWithRef = DivProps & { ref?: React.RefObject<HTMLDivElement | null> };

const StyledSurface = styled.div<DivPropsWithRef & { $dragging: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: radial-gradient(circle at 50% 45%, #141a2b 0%, #080a11 75%);
  touch-action: none;
  user-select: ${(p) => (p.$dragging ? "none" : "auto")};

  --bs-transition: ${(p) =>
    p.$dragging ? "none" : "transform .26s cubic-bezier(.22,.61,.36,1), opacity .26s ease, width .26s ease, height .26s ease"};
`;

const StyledBubble = styled.div<DivProps & { $selected: boolean; $hue: number }>`
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  transition: var(--bs-transition);
  border-radius: 10px;
  background: hsl(${(p) => p.$hue} 30% 13%);
  border: 1px solid ${(p) => (p.$selected ? "#6ee7ff" : `hsl(${p.$hue} 62% 58% / .8)`)};
  box-shadow: 0 8px 26px -10px rgba(0, 0, 0, 0.75);
  color: #e6ebf5;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  > .e-head {
    flex: 0 0 auto;
    height: 24px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 8px;
    background: hsl(${(p) => p.$hue} 55% 42% / 0.55);
    font-size: 12px;
    font-weight: 600;
    cursor: grab;
    user-select: none;

    > .e-title {
      flex: 1 1 auto;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  > .e-content {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
  }
`;

const StyledHandle = styled.div<DivProps>`
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: #6ee7ff;
  cursor: nwse-resize;
`;

const StyledAnchor = styled.div<DivProps>`
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  pointer-events: none;
  border: 1px dashed rgba(110, 231, 255, 0.5);
  border-radius: 5px;
  transition: var(--bs-transition);
`;

const StyledMagnet = styled.div<DivProps>`
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  pointer-events: none;
  z-index: 99999;
  border: 2px dashed #6ee7ff;
  border-radius: 7px;
  box-shadow: 0 0 16px rgba(110, 231, 255, 0.55);

  > span {
    position: absolute;
    left: 0;
    bottom: 100%;
    margin-bottom: 5px;
    color: #6ee7ff;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }
`;
