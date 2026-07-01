'use client';

import { FC, Fragment } from "react";
import styled from "styled-components";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { ShiftLeaderRule } from "../domain/index.js";
import { leaderRoleStyle } from "./LeaderBadges.js";

type LeaderRulesViewProps = {
  /** 描画する宣言的ルール（解決済み） */
  rules: ShiftLeaderRule[];
  /** スタッフID → 表示名（未解決は ID をそのまま） */
  nameOf: (staffId: string) => string;
  /**
   * ルール可視化バブルの URL を作る（ロールキー）。渡すと各ルールが ObjectView になり、
   * ダブルクリックでそのルールの図バブルを開ける（展開・data-url・opener は ObjectView に一任）。
   * 省略時は表示専用。URL スキームは app 層の関心事なので注入で受ける。
   */
  ruleBubbleUrl?: (ruleKey: string) => string;
};

/**
 * 責任者の宣言的ルールを「人が読める1文」で描画する。
 * ルールが label・shiftName・leaderStaffIds・minCount を全部持っているので、名前を解決すれば
 * そのまま文章化できる（例: 「早責: 早番に 山本 由美・小林 恵 のうちいずれか1人」）。
 * footer の ◯/✕ も相方裏コマンドも同じ ShiftLeaderRule から導出されるので、ここはその
 * 「定義そのもの」の表示。
 */
export const LeaderRulesView: FC<LeaderRulesViewProps> = ({
  rules,
  nameOf,
  ruleBubbleUrl,
}) => {
  if (rules.length === 0) return null;

  const clickable = !!ruleBubbleUrl;

  return (
    <StyledRules>
      <span className="e-rules-title">📋 ルール</span>
      <ul className="e-rules-list">
        {rules.map((rule) => {
          const names = rule.leaderStaffIds.map(nameOf);
          const who = names.length > 0 ? names.join("・") : "（該当者なし）";
          const quota =
            rule.minCount <= 1 ? "のうちいずれか1人" : `のうち最低${rule.minCount}人`;
          const row = (
            <li
              className={`e-rule${clickable ? " is-clickable" : ""}`}
              title={clickable ? `${rule.label}のルールを図で見る（ダブルクリック）` : undefined}
            >
              <span className="e-rule-chip" style={leaderRoleStyle(rule.key)}>
                {rule.label}
              </span>
              <span className="e-rule-text">
                {rule.shiftName}に <strong>{who}</strong> {quota}
              </span>
            </li>
          );
          // ObjectView が data-url・ダブルクリック展開・opener（origin-side で近くに出す）を担う。
          return clickable && ruleBubbleUrl ? (
            <ObjectView
              key={rule.key}
              url={ruleBubbleUrl(rule.key)}
              openingPosition="origin-side"
              draggable={false}
            >
              {row}
            </ObjectView>
          ) : (
            <Fragment key={rule.key}>{row}</Fragment>
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
    border-radius: 4px;
    padding: 1px 3px;
  }
  .e-rule.is-clickable {
    cursor: pointer;
  }
  .e-rule.is-clickable:hover {
    background: #eceff1;
  }

  /* 責任者チップ。配色は leaderRoleStyle（ロールキー→色）を inline で当てる */
  .e-rule-chip {
    flex-shrink: 0;
    font-weight: bold;
    line-height: 1;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .e-rule-text {
    color: #455a64;
    strong {
      color: #263238;
    }
  }
`;
