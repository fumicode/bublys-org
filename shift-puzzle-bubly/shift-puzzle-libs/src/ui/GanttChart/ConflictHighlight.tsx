'use client';
import React from 'react';
import styled from 'styled-components';
import type { ConstraintViolation } from '@bublys-org/shift-puzzle-model';

interface ConflictHighlightProps {
  violation: ConstraintViolation;
  left: number;
  width: number;
  rowHeight: number;
}

/** 制約違反を視覚的にハイライト表示するオーバーレイ */
export const ConflictHighlight: React.FC<ConflictHighlightProps> = ({
  violation,
  left,
  width,
  rowHeight,
}) => {
  const color = violationColor(violation.type);
  return (
    <StyledHighlight
      style={{ left, width, height: rowHeight - 8, top: 4, borderColor: color, backgroundColor: `${color}22` }}
      title={violation.message}
    />
  );
};

function violationColor(type: ConstraintViolation['type']): string {
  switch (type) {
    case 'duplicate_member_in_timeslot': return '#f44336';
    case 'outside_availability':         return '#ff9800';
    case 'skill_mismatch':               return '#ffc107';
    default:                             return '#9e9e9e';
  }
}

const StyledHighlight = styled.div`
  position: absolute;
  border-radius: 3px;
  border: 2px solid;
  pointer-events: none;
  z-index: 4;
` as React.FC<React.HTMLAttributes<HTMLDivElement>>;
