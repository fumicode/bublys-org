'use client';

/**
 * NumberField — 「入力中は保存せず、確定したときに1回だけ保存する」数値欄。
 * 保存の約束は useNumberDraft にある（文の中の数・図の中の数と同じもの）。
 */
import { FC } from "react";
import { TextField } from "@mui/material";
import styled from "styled-components";
import { useNumberDraft } from "./useNumberDraft.js";

type NumberFieldProps = {
  label: string;
  /** 数の後ろに添える単位（「日まで」「人まで」など） */
  unit?: string;
  value: number;
  min?: number;
  disabled?: boolean;
  onCommit: (value: number) => void;
};

export const NumberField: FC<NumberFieldProps> = ({
  label,
  unit,
  value,
  min = 1,
  disabled,
  onCommit,
}) => {
  const { inputProps } = useNumberDraft(value, onCommit);

  return (
    <StyledLabel>
      <TextField
        variant="standard"
        size="small"
        type="number"
        label={label}
        {...inputProps}
        inputProps={{ min }}
        disabled={disabled}
      />
      {unit && <span className="e-unit">{unit}</span>}
    </StyledLabel>
  );
};

const StyledLabel = styled.label`
  display: inline-flex;
  align-items: flex-end;
  gap: 4px;

  .MuiTextField-root {
    width: 72px;
  }

  .e-unit {
    font-size: 0.78em;
    color: #888;
    padding-bottom: 4px;
  }
`;
