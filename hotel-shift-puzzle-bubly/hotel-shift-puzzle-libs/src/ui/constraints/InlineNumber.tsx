'use client';

/**
 * InlineNumber — 文の中の数。押すとその場で入力欄になり、確定（blur / Enter）で1回だけ保存する。
 * onCommit を渡さなければただの数（読むだけ）。
 */
import type { FC, HTMLAttributes, InputHTMLAttributes } from "react";
import styled from "styled-components";
import { useNumberDraft } from "./useNumberDraft.js";

type InlineNumberProps = {
  value: number;
  min?: number;
  onCommit?: (value: number) => void;
};

export const InlineNumber: FC<InlineNumberProps> = ({ value, min = 1, onCommit }) => {
  const { editing, start, inputProps } = useNumberDraft(value, (n) => onCommit?.(n));

  if (!onCommit) return <StyledValue>{value}</StyledValue>;
  if (editing) {
    return (
      <StyledInput
        type="number"
        min={min}
        autoFocus
        onFocus={(e) => e.target.select()}
        {...inputProps}
      />
    );
  }
  return (
    <StyledValue
      className="is-editable"
      role="button"
      tabIndex={0}
      title="押して数を変える"
      onClick={start}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") start();
      }}
    >
      {value}
    </StyledValue>
  );
};

// export しない styled も intrinsic props（children 等）を保つため型注釈を明示する（common.tsx と同じ）
const StyledValue = styled.span<HTMLAttributes<HTMLSpanElement>>`
  font-weight: 700;
  padding: 0 2px;

  &.is-editable {
    cursor: pointer;
    border-bottom: 1px dashed #90a4ae;
    &:hover {
      background: #eef1f4;
    }
  }
`;

const StyledInput = styled.input<InputHTMLAttributes<HTMLInputElement>>`
  width: 3em;
  font: inherit;
  font-weight: 700;
  text-align: center;
`;
