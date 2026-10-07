"use client";
import { FC, memo } from "react";
import styled from "styled-components";
import { Bubble } from "../Bubble.domain.js";
import { CoordinateSystem } from "@bublys-org/bubbles-ui-util";

/**
 * これより縮んだら中身が読めない。読めない中身を描いても重いだけなので、骨（種類と URL）だけにする。
 * 縮めない奥行き（DepthStyle.scaleDecayRate = 0）なら、どの深さでも中身を描く。
 */
const READABLE_SCALE = 0.85;

export function isTooSmallToRead(layerIndex: number): boolean {
  return CoordinateSystem.fromLayerIndex(layerIndex).scale < READABLE_SCALE;
}

type BubbleSkeletonProps = {
  bubble: Bubble;
};

export const BubbleSkeleton: FC<BubbleSkeletonProps> = memo(({ bubble }) => (
  <StyledSkeleton>
    <span className="e-type">{bubble.type}</span>
    <span className="e-url">{bubble.url}</span>
  </StyledSkeleton>
));

const StyledSkeleton = styled.div`
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  .e-type {
    font-size: 0.85em;
    font-weight: 600;
    color: inherit;
    opacity: 0.65;
  }

  .e-url {
    font-size: 0.75em;
    color: inherit;
    opacity: 0.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
  }
`;
