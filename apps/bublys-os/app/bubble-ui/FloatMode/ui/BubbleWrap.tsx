"use client";

import { FC, useMemo } from "react";
import styled, { keyframes } from "styled-components";

type BubbleWrapProps = {
  /** FloatModeがアクティブかどうか */
  isActive: boolean;
  /** ふわふわのランダム性を決めるシード（バブルIDなど） */
  seed?: string;
  children: React.ReactNode;
};

/**
 * FloatMode中にバブルを泡で包み、ふわふわさせるコンポーネント
 */
export const BubbleWrap: FC<BubbleWrapProps> = ({
  isActive,
  seed = "",
  children,
}) => {
  // シードから決定論的な乱数を生成（同じバブルは同じアニメーションになる）
  const animationParams = useMemo(() => {
    const hash = simpleHash(seed);
    return {
      duration: 2 + (hash % 10) / 10, // 2.0〜2.9秒
      delay: (hash % 100) / 100, // 0〜0.99秒
      amplitude: 3 + (hash % 5), // 3〜7px
    };
  }, [seed]);

  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <StyledBubbleWrap
      $duration={animationParams.duration}
      $delay={animationParams.delay}
      $amplitude={animationParams.amplitude}
    >
      <div className="e-bubble-membrane" />
      <div className="e-bubble-content">
        {children}
      </div>
    </StyledBubbleWrap>
  );
};

/** シンプルなハッシュ関数（決定論的な乱数生成用） */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

const float = (amplitude: number) => keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-${amplitude}px);
  }
`;

type StyledBubbleWrapProps = React.HTMLAttributes<HTMLDivElement> & {
  $duration: number;
  $delay: number;
  $amplitude: number;
};

const StyledBubbleWrap = styled.div<StyledBubbleWrapProps>`
  position: relative;
  animation: ${({ $amplitude }) => float($amplitude)} ${({ $duration }) => $duration}s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}s;

  /* 泡の膜 */
  .e-bubble-membrane {
    position: absolute;
    top: -8px;
    left: -8px;
    right: -8px;
    bottom: -8px;
    border-radius: 24px;
    background: radial-gradient(
      ellipse at 30% 20%,
      rgba(255, 255, 255, 0.4) 0%,
      rgba(255, 255, 255, 0.1) 30%,
      rgba(200, 220, 255, 0.15) 60%,
      rgba(180, 200, 255, 0.1) 100%
    );
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow:
      inset 0 0 20px rgba(255, 255, 255, 0.2),
      0 4px 16px rgba(0, 0, 0, 0.1);
    pointer-events: none;
    z-index: -1;
  }

  .e-bubble-content {
    position: relative;
  }
`;
