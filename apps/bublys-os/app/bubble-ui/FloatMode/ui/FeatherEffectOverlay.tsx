"use client";

import { useRef, useImperativeHandle, forwardRef } from "react";
import styled, { keyframes } from "styled-components";

type StyledFeatherContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.RefObject<HTMLDivElement | null>;
};

export type FeatherEffectOverlayHandle = {
  updatePosition: (x: number, y: number) => void;
};

type FeatherEffectOverlayProps = {
  isActive: boolean;
};

/**
 * FloatMode中にカーソル周りに表示する羽エフェクト
 * DOM直接操作でカーソル位置を更新（パフォーマンス最適化）
 */
export const FeatherEffectOverlay = forwardRef<FeatherEffectOverlayHandle, FeatherEffectOverlayProps>(
  ({ isActive }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      updatePosition: (x: number, y: number) => {
        if (containerRef.current) {
          containerRef.current.style.left = `${x}px`;
          containerRef.current.style.top = `${y}px`;
        }
      },
    }));

    if (!isActive) return null;

    return (
      <StyledFeatherContainer ref={containerRef}>
        <div className="feather">
          <svg viewBox="0 0 32 32" width="28" height="28">
            {/* 羽の軸 */}
            <path
              className="shaft"
              d="M16 28 L16 8"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            {/* 左側の羽毛 */}
            <path
              className="vane-left"
              d="M16 8 Q8 12 6 18 Q10 16 16 14 Q10 18 8 24 Q12 20 16 18 Q12 22 11 26 Q14 23 16 21"
              fill="currentColor"
              opacity="0.7"
            />
            {/* 右側の羽毛 */}
            <path
              className="vane-right"
              d="M16 8 Q24 12 26 18 Q22 16 16 14 Q22 18 24 24 Q20 20 16 18 Q20 22 21 26 Q18 23 16 21"
              fill="currentColor"
              opacity="0.7"
            />
            {/* 先端のハイライト */}
            <circle cx="16" cy="6" r="2" fill="currentColor" opacity="0.5" />
          </svg>
        </div>
        <div className="glow" />
      </StyledFeatherContainer>
    );
  }
);

FeatherEffectOverlay.displayName = "FeatherEffectOverlay";

const float = keyframes`
  0%, 100% { transform: translate(-50%, -50%) rotate(-15deg); }
  50% { transform: translate(-50%, -50%) rotate(15deg); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.2); opacity: 0.6; }
`;

const StyledFeatherContainer = styled.div<StyledFeatherContainerProps>`
  position: fixed;
  pointer-events: none;
  z-index: 99999;

  /* 羽のコンテナ */
  .feather {
    position: absolute;
    left: 4px;
    top: -20px;
    color: rgba(255, 255, 255, 0.9);
    filter: drop-shadow(0 2px 4px rgba(100, 150, 200, 0.5));
    animation: ${float} 1.5s ease-in-out infinite;
  }

  /* グロー効果 */
  .glow {
    position: absolute;
    width: 40px;
    height: 40px;
    left: -20px;
    top: -20px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(200, 220, 255, 0.5) 0%,
      rgba(180, 200, 255, 0.3) 40%,
      transparent 70%
    );
    animation: ${pulse} 1s ease-in-out infinite;
  }
`;
