"use client";

import { FC, memo } from "react";
import styled, { keyframes } from "styled-components";

type StyledFlameContainerProps = React.HTMLAttributes<HTMLDivElement>;

type FlameEffectOverlayProps = {
  cursorPosition: { x: number; y: number } | null;
  isActive: boolean;
};

/**
 * MagicWandモード中にカーソル周りに表示する炎エフェクト
 */
export const FlameEffectOverlay: FC<FlameEffectOverlayProps> = memo(
  ({ cursorPosition, isActive }) => {
    if (!isActive || !cursorPosition) return null;

    return (
      <StyledFlameContainer
        style={{
          left: cursorPosition.x,
          top: cursorPosition.y,
        }}
      >
        <div className="flame flame-1" />
        <div className="flame flame-2" />
        <div className="flame flame-3" />
        <div className="flame flame-4" />
      </StyledFlameContainer>
    );
  }
);

FlameEffectOverlay.displayName = "FlameEffectOverlay";

const flicker = keyframes`
  0%, 100% {
    transform: scaleY(1) scaleX(1) rotate(0deg);
    opacity: 0.8;
  }
  25% {
    transform: scaleY(1.15) scaleX(0.95) rotate(-3deg);
    opacity: 1;
  }
  50% {
    transform: scaleY(0.9) scaleX(1.05) rotate(3deg);
    opacity: 0.85;
  }
  75% {
    transform: scaleY(1.1) scaleX(0.9) rotate(-2deg);
    opacity: 0.9;
  }
`;

const rise = keyframes`
  0% {
    transform: translateY(0) scale(1);
    opacity: 0.9;
  }
  100% {
    transform: translateY(-10px) scale(0.8);
    opacity: 0;
  }
`;

const StyledFlameContainer = styled.div<StyledFlameContainerProps>`
  position: fixed;
  pointer-events: none;
  z-index: 99999;
  transform: translate(-50%, -50%);

  .flame {
    position: absolute;
    border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
    transform-origin: bottom center;
  }

  /* メインの炎 - オレンジ */
  .flame-1 {
    width: 24px;
    height: 32px;
    background: radial-gradient(
      ellipse at bottom,
      #ff6b35 0%,
      #ff4500 50%,
      transparent 80%
    );
    left: -12px;
    top: -28px;
    animation: ${flicker} 0.25s ease-in-out infinite;
  }

  /* 内側の炎 - 黄色 */
  .flame-2 {
    width: 16px;
    height: 22px;
    background: radial-gradient(
      ellipse at bottom,
      #ffcc00 0%,
      #ff8c00 60%,
      transparent 90%
    );
    left: -8px;
    top: -20px;
    animation: ${flicker} 0.2s ease-in-out infinite;
    animation-delay: 0.05s;
  }

  /* 外側の炎 - 赤 */
  .flame-3 {
    width: 28px;
    height: 36px;
    background: radial-gradient(
      ellipse at bottom,
      rgba(255, 69, 0, 0.6) 0%,
      rgba(204, 0, 0, 0.4) 50%,
      transparent 80%
    );
    left: -14px;
    top: -32px;
    animation: ${flicker} 0.3s ease-in-out infinite;
    animation-delay: 0.1s;
  }

  /* 火の粉 */
  .flame-4 {
    width: 6px;
    height: 6px;
    background: #ffcc00;
    border-radius: 50%;
    left: 0px;
    top: -35px;
    animation: ${rise} 0.6s ease-out infinite;
    box-shadow: 0 0 4px #ff6b35;
  }
`;
