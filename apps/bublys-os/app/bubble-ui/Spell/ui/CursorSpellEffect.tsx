"use client";

import { useRef, useImperativeHandle, forwardRef, ReactNode } from "react";
import styled from "styled-components";

export type CursorSpellEffectHandle = {
  updatePosition: (x: number, y: number) => void;
};

type CursorSpellEffectProps = {
  isActive: boolean;
  children: ReactNode;
};

/**
 * 魔法の杖のカーソルエフェクト共通コンポーネント
 * DOM直接操作でカーソル位置を更新（パフォーマンス最適化）
 */
export const CursorSpellEffect = forwardRef<CursorSpellEffectHandle, CursorSpellEffectProps>(
  ({ isActive, children }, ref) => {
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
      <StyledCursorSpellEffect ref={containerRef}>
        {children}
      </StyledCursorSpellEffect>
    );
  }
);

CursorSpellEffect.displayName = "CursorSpellEffect";

type StyledCursorSpellEffectProps = React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.RefObject<HTMLDivElement | null>;
};

const StyledCursorSpellEffect = styled.div<StyledCursorSpellEffectProps>`
  position: fixed;
  pointer-events: none;
  z-index: 99999;
`;
