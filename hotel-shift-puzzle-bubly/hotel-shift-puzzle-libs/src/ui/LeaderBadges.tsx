'use client';

import { FC, Fragment } from "react";
import { UrledPlace } from "@bublys-org/bubbles-ui";
import { ShiftLeaderRule } from "../domain/index.js";

type LeaderBadgesProps = {
  /** 解決済みの責任者ルール（早責/夜責 など） */
  rules: ShiftLeaderRule[];
  /** バッジを出す対象スタッフ */
  staffId: string;
  /**
   * 指定するとバッジがクリック可能になり、押すとそのルールの関係者だけを抽出する。
   * 省略時は表示専用。
   */
  onOpenExtract?: (staffIds: string[]) => void;
  /** 抽出バブルの URL（クリック可能時の data-url アンカー。link bubble がバッジから伸びる） */
  extractBubbleUrl?: (staffIds: string[]) => string;
};

/**
 * スタッフ名の横に出す責任者バッジ（早責/夜責 …）。
 * 早責・夜責などの違いはルール（ShiftLeaderRule）のキー/ラベルだけで、描画は共通コード。
 * 勤務表グリッドと稼働日ビューの両方がこれを使う。
 */
export const LeaderBadges: FC<LeaderBadgesProps> = ({
  rules,
  staffId,
  onOpenExtract,
  extractBubbleUrl,
}) => {
  const myRules = rules.filter((r) => r.leaderStaffIds.includes(staffId));
  const clickable = !!onOpenExtract;

  return (
    <>
      {myRules.map((rule) => {
        const badge = (
          <span
            className={`e-leader-badge is-${rule.key}${clickable ? " is-clickable" : ""}`}
            title={
              clickable
                ? `${rule.label}の関係者だけを抽出`
                : `${rule.label}（${rule.shiftName}責任者）`
            }
            role={clickable ? "button" : undefined}
            onClick={
              clickable
                ? (e) => {
                    e.stopPropagation(); // 行展開やスタッフ展開はしない
                    onOpenExtract(rule.leaderStaffIds);
                  }
                : undefined
            }
          >
            {rule.label}
          </span>
        );
        // data-url を埋めると、抽出バブルがこのバッジから link bubble で伸びる
        return clickable && extractBubbleUrl ? (
          <UrledPlace key={rule.key} url={extractBubbleUrl(rule.leaderStaffIds)}>
            {badge}
          </UrledPlace>
        ) : (
          <Fragment key={rule.key}>{badge}</Fragment>
        );
      })}
    </>
  );
};
