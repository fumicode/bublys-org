'use client';

/**
 * NumberField — 「入力中は保存せず、確定したときに1回だけ保存する」数値欄。
 *
 * 制約の値は世界線に載る。打鍵ごとに保存すると、1つの数を直すだけで世界線に
 * ノードが何個も生える。だから入力中はドラフトに溜め、blur か Enter で1回だけ commit する。
 *
 * 外から値が変わったら（時間移動で過去の値に戻ったときなど）ドラフトを捨てて追随する。
 * 追随しないと、巻き戻したのに入力欄だけ古い打鍵が残って見える。
 */
import { FC, useEffect, useState } from "react";
import { TextField } from "@mui/material";
import styled from "styled-components";

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
  const [draft, setDraft] = useState<string | null>(null);

  // 外から値が変わったらドラフトを捨てる（時間移動で値が変わるため）
  useEffect(() => {
    setDraft(null);
  }, [value]);

  const commit = () => {
    if (draft === null) return;
    const n = parseInt(draft, 10);
    // 同じ値なら呼ばない（同じ内容のノードを世界線に積まない）
    if (!Number.isNaN(n) && n !== value) onCommit(n);
    setDraft(null);
  };

  return (
    <StyledLabel>
      <TextField
        variant="standard"
        size="small"
        type="number"
        label={label}
        value={draft ?? value}
        inputProps={{ min }}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          // 日本語入力の変換確定 Enter は確定ではない
          if (e.key === "Enter" && !e.nativeEvent.isComposing) commit();
          if (e.key === "Escape") setDraft(null);
        }}
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
