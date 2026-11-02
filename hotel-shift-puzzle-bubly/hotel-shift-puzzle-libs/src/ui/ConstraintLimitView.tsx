'use client';

/**
 * ConstraintLimitView — 制約1つを大きく見せて、その場で直すビュー。
 *
 * バーの小さいアイコンと**同じ図**（同じ spec の render）を大きく描く。別に「大きい版」を
 * 作らないので、図の意味が2つに割れない。
 *
 * 見せるのは図と1文だけ（例: 図の下に「連勤は最大 5 日まで」）。数は図の中の「≤5」と
 * 文の中の「5」の2か所にあり、どちらも押せばその場で変えられる。
 *
 * 約束は責任者ルールの図（LeaderRuleDiagram）と同じ：**onCommit を渡された項目だけが
 * 編集できる**。渡さなければ読むだけの図になるので、グローバルでも勤務表でも、
 * 読み取り専用でもこの1つで賄える。
 */
import { FC } from "react";
import styled from "styled-components";
import { Switch } from "@mui/material";
import type { LimitSpec } from "./constraint-icons/limitSpecs.js";
import { InlineNumber } from "./constraints/InlineNumber.js";

const BIG_ICON_SIZE = 180;

type ConstraintLimitViewProps = {
  spec: LimitSpec;
  value: number | boolean;
  /** 渡されたときだけ直せる。省略すると読むだけの図 */
  onCommit?: (value: number | boolean) => void;
};

export const ConstraintLimitView: FC<ConstraintLimitViewProps> = ({
  spec,
  value,
  onCommit,
}) => (
  <StyledContainer>
    {spec.kind === "number" ? (
      <>
        {spec.render(value, BIG_ICON_SIZE, onCommit)}
        <p className="e-sentence">
          {spec.label}
          <InlineNumber value={typeof value === "number" ? value : 0} onCommit={onCommit} />
          {spec.unit}
        </p>
      </>
    ) : (
      <>
        {spec.render(value, BIG_ICON_SIZE)}
        {onCommit ? (
          <label className="e-switch">
            <Switch
              size="small"
              checked={value === true}
              onChange={(e) => onCommit(e.target.checked)}
            />
            <span>{spec.label}</span>
          </label>
        ) : (
          <p className="e-sentence">{spec.describe(value)}</p>
        )}
      </>
    )}
  </StyledContainer>
);

const StyledContainer = styled.div`
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  .e-sentence {
    margin: 0;
    font-size: 0.9em;
    color: #455a64;
    text-align: center;
  }

  .e-switch {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 0.85em;
    color: #555;
  }
`;
