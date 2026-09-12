'use client';

/**
 * ConstraintLimitView — 制約1つを大きく見せて、その場で直すビュー。
 *
 * バーの小さいアイコンと**同じ図**（同じ spec の render）を大きく描く。別に「大きい版」を
 * 作らないので、図の意味が2つに割れない。
 *
 * 約束は責任者ルールの図（LeaderRuleDiagram）と同じ：**onCommit を渡された項目だけが
 * 編集できる**。渡さなければ読むだけの図になるので、グローバルでも勤務表でも、
 * 読み取り専用でもこの1つで賄える。
 */
import { FC } from "react";
import styled from "styled-components";
import { Switch } from "@mui/material";
import type { LimitSpec } from "./constraint-icons/limitSpecs.js";
import { NumberField } from "./constraints/NumberField.js";

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
    <figure className="e-figure">
      {spec.render(value, BIG_ICON_SIZE)}
      <figcaption className="e-caption">{spec.caption}</figcaption>
    </figure>

    <p className="e-describe">{spec.describe(value)}</p>

    {onCommit &&
      (spec.kind === "number" ? (
        <NumberField
          label={spec.label}
          unit={spec.unit}
          value={typeof value === "number" ? value : 0}
          onCommit={(n) => onCommit(n)}
        />
      ) : (
        <label className="e-switch">
          <Switch
            size="small"
            checked={value === true}
            onChange={(e) => onCommit(e.target.checked)}
          />
          <span>{spec.label}</span>
        </label>
      ))}
  </StyledContainer>
);

const StyledContainer = styled.div`
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  .e-figure {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .e-caption {
    font-size: 0.85em;
    font-weight: 600;
    color: #546e7a;
  }

  .e-describe {
    margin: 0;
    font-size: 0.85em;
    color: #666;
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
