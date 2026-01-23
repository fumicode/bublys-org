"use client";

import { forwardRef } from "react";
import styled, { keyframes } from "styled-components";
import { CursorSpellEffect, CursorSpellEffectHandle } from "../../Spell/ui/CursorSpellEffect";

export type FlameEffectOverlayHandle = CursorSpellEffectHandle;

type FlameEffectOverlayProps = {
  isActive: boolean;
};

/**
 * MagicWandモード中にカーソル周りに表示する炎エフェクト
 */
export const FlameEffectOverlay = forwardRef<FlameEffectOverlayHandle, FlameEffectOverlayProps>(
  ({ isActive }, ref) => {
    return (
      <CursorSpellEffect ref={ref} isActive={isActive}>
        <StyledFlameVisual>
          <div className="core" />
          <div className="glow" />
        </StyledFlameVisual>
      </CursorSpellEffect>
    );
  }
);

FlameEffectOverlay.displayName = "FlameEffectOverlay";

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.15); opacity: 1; }
`;

const StyledFlameVisual = styled.div`
  transform: translate(-50%, -50%);

  /* グロー効果 */
  .glow {
    position: absolute;
    width: 32px;
    height: 32px;
    left: -16px;
    top: -16px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(255, 80, 40, 0.6) 0%,
      rgba(255, 40, 0, 0.3) 40%,
      transparent 70%
    );
    animation: ${pulse} 0.4s ease-in-out infinite;
  }

  /* 中心のコア */
  .core {
    position: absolute;
    width: 12px;
    height: 12px;
    left: -6px;
    top: -6px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      #ffcc00 0%,
      #ff6600 60%,
      #ff3300 100%
    );
    box-shadow: 0 0 8px #ff4400;
  }
`;
