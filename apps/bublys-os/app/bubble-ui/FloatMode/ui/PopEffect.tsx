"use client";

import { FC, useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";

type PopEffectProps = {
  /** エフェクトの中心位置 */
  position: { x: number; y: number };
  /** エフェクトのサイズ（バブルのサイズに合わせる） */
  size: { width: number; height: number };
  /** アニメーション完了時のコールバック */
  onComplete?: () => void;
};

/**
 * 泡がはじけるエフェクト
 * FloatMode解除時にバブルの位置に表示される
 */
export const PopEffect: FC<PopEffectProps> = ({
  position,
  size,
  onComplete,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 400); // アニメーション時間

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <StyledPopEffect
      style={{
        left: position.x - 8,
        top: position.y - 8,
        width: size.width + 16,
        height: size.height + 16,
      }}
    >
      <div className="e-pop-ring e-ring-1" />
      <div className="e-pop-ring e-ring-2" />
      <div className="e-pop-ring e-ring-3" />
    </StyledPopEffect>
  );
};

const popRing = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  100% {
    transform: scale(1.3);
    opacity: 0;
  }
`;

type StyledPopEffectProps = React.HTMLAttributes<HTMLDivElement>;

const StyledPopEffect = styled.div<StyledPopEffectProps>`
  position: absolute;
  pointer-events: none;
  z-index: 9999;
  border-radius: 24px;

  .e-pop-ring {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: inherit;
    border: 2px solid rgba(255, 255, 255, 0.5);
    animation: ${popRing} 0.4s ease-out forwards;
  }

  .e-ring-1 {
    animation-delay: 0s;
  }

  .e-ring-2 {
    animation-delay: 0.08s;
  }

  .e-ring-3 {
    animation-delay: 0.16s;
  }
`;
