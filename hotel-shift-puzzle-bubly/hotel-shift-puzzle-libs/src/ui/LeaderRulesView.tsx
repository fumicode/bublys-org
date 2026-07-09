'use client';

import { FC, Fragment } from "react";
import styled from "styled-components";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { ShiftLeaderRule } from "../domain/index.js";
import { leaderRoleStyle } from "./LeaderBadges.js";

/** 責任者以外のルール（連勤・希望・休日など）の1行ぶん。 */
export type OtherRule = {
  /** 一意キー */
  key: string;
  /** 短いラベル（チップに出す。例: "連勤" / "希望"） */
  label: string;
  /** 人が読める1文（例: "連勤は最大5日まで"） */
  text: string;
};

type LeaderRulesViewProps = {
  /** 描画する責任者ルール（解決済み） */
  rules: ShiftLeaderRule[];
  /** スタッフID → 表示名（未解決は ID をそのまま） */
  nameOf: (staffId: string) => string;
  /**
   * ルール可視化バブルの URL を作る（ロールキー）。渡すと各責任者ルールが ObjectView になり、
   * ダブルクリックでそのルールの図バブルを開ける（展開・data-url・opener は ObjectView に一任）。
   * 省略時は表示専用。URL スキームは app 層の関心事なので注入で受ける。
   */
  ruleBubbleUrl?: (ruleKey: string) => string;
  /** 責任者以外のルール（連勤・希望・休日など）。責任者ルールの下に文章で並べる。 */
  otherRules?: OtherRule[];
  /**
   * 責任者ルールを新規追加する。渡すと末尾に「＋ 責任者ルールを追加」ボタンが出る。
   * 追加は勤務表ごとの制約なので、どの勤務表かは feature 層が閉じ込めて注入する。
   */
  onAddRule?: () => void;
};

/**
 * 勤務表に効いている「すべてのルール」を勤務表の上に1文ずつ並べて描く。
 *   - 責任者ルール（早責/予責/夜責）: label・shiftName・leaderStaffIds・minCount から文章化。
 *     クリックで OR 図バブルを開ける。footer の ◯/✕ も同じ ShiftLeaderRule から導出。
 *   - その他のルール（連勤上限・希望・月最低休日・1日の休み上限）: otherRules を文章で表示。
 */
export const LeaderRulesView: FC<LeaderRulesViewProps> = ({
  rules,
  nameOf,
  ruleBubbleUrl,
  otherRules = [],
  onAddRule,
}) => {
  if (rules.length === 0 && otherRules.length === 0 && !onAddRule) return null;

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

        {/* 責任者以外のルール（連勤・希望・休日など）を文章で並べる */}
        {otherRules.map((r) => (
          <li key={r.key} className="e-rule">
            <span className="e-rule-chip is-other">{r.label}</span>
            <span className="e-rule-text">{r.text}</span>
          </li>
        ))}

        {/* 責任者ルールを後から足す */}
        {onAddRule && (
          <li className="e-rule">
            <button type="button" className="e-add-rule" onClick={onAddRule}>
              ＋ 責任者ルールを追加
            </button>
          </li>
        )}
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
  /* 責任者以外のルール（連勤・希望など）の中立チップ */
  .e-rule-chip.is-other {
    background: #eceff1;
    color: #546e7a;
    border: 1px solid #cfd8dc;
  }

  .e-rule-text {
    color: #455a64;
    strong {
      color: #263238;
    }
  }

  /* 責任者ルールを追加するボタン（ルール一覧の末尾） */
  .e-add-rule {
    border: 1px dashed #b0bec5;
    border-radius: 6px;
    background: #fff;
    color: #546e7a;
    font-size: 0.95em;
    padding: 2px 8px;
    cursor: pointer;
    &:hover {
      background: #eceff1;
      border-color: #78909c;
      color: #37474f;
    }
  }
`;
