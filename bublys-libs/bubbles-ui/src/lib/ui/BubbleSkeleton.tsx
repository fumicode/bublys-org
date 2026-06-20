"use client";
import { FC } from "react";
import styled from "styled-components";
import { Bubble } from "../Bubble.domain.js";

type BubbleSkeletonProps = {
  bubble: Bubble;
};

export const BubbleSkeleton: FC<BubbleSkeletonProps> = ({ bubble }) => (
  <StyledSkeleton>
    <span className="e-type">{bubble.type}</span>
    <span className="e-url">{bubble.url}</span>
  </StyledSkeleton>
);

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
