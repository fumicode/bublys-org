'use client';

import { FC } from "react";
import styled from "styled-components";
import { ShiftLeaderRule } from "../domain/index.js";

type LeaderRulesViewProps = {
  /** 描画する宣言的ルール（解決済み） */
  rules: ShiftLeaderRule[];
  /** スタッフID → 表示名（未解決は ID をそのまま） */
  nameOf: (staffId: string) => string;
};

/**
 * 責任者の宣言的ルールを「人が読める1文」で描画する。
 * ルールが label・shiftName・leaderStaffIds・minCount を全部持っているので、名前を解決すれば
 * そのまま文章化できる（例: 「早責: 早番に 山本 由美・小林 恵 のうちいずれか1人」）。
 * footer の ◯/✕ も相方裏コマンドも同じ ShiftLeaderRule から導出されるので、ここはその
 * 「定義そのもの」の表示。
 */
export const LeaderRulesView: FC<LeaderRulesViewProps> = ({ rules, nameOf }) => {
  if (rules.length === 0) return null;

  return (
    <StyledRules>
      <span className="e-rules-title">📋 ルール</span>
      <ul className="e-rules-list">
        {rules.map((rule) => {
          const names = rule.leaderStaffIds.map(nameOf);
          const who = names.length > 0 ? names.join("・") : "（該当者なし）";
          const quota =
            rule.minCount <= 1 ? "のうちいずれか1人" : `のうち最低${rule.minCount}人`;
          return (
            <li key={rule.key} className="e-rule">
              <span className={`e-rule-chip is-${rule.key}`}>{rule.label}</span>
              <span className="e-rule-text">
                {rule.shiftName}に <strong>{who}</strong> {quota}
              </span>
            </li>
          );
        })}
      </ul>
    </StyledRules>
  );
};

const StyledRules = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 10px;
  background: #fafafa;
  border: 1px solid #eceff1;
  border-radius: 8px;
  font-size: 0.8em;

  .e-rules-title {
    flex-shrink: 0;
    font-weight: 600;
    color: #607d8b;
    line-height: 1.6;
  }

  .e-rules-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .e-rule {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* 責任者チップ。名前バッジ／footer と同じ色味で揃える（早番=青・遅番=紫） */
  .e-rule-chip {
    flex-shrink: 0;
    font-weight: bold;
    line-height: 1;
    padding: 2px 6px;
    border-radius: 4px;

    &.is-early {
      background: #e3f2fd;
      color: #1565c0;
      border: 1px solid #90caf9;
    }
    &.is-night {
      background: #ede7f6;
      color: #5e35b1;
      border: 1px solid #b39ddb;
    }
  }

  .e-rule-text {
    color: #455a64;
    strong {
      color: #263238;
    }
  }
`;
