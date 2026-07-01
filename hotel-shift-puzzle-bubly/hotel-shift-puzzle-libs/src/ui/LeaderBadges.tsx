'use client';

import { CSSProperties, FC, Fragment } from "react";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { ShiftLeaderRule } from "../domain/index.js";

/**
 * 責任者ロールの色（ロールキー → 配色）。バッジもルール表示チップもここを共有する。
 * 役割を増やすときの色はここに1エントリ足すだけ（無ければ既定のグレー）。
 */
const ROLE_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  early: { bg: "#e3f2fd", fg: "#1565c0", border: "#90caf9" }, // 早番＝青
  reservation: { bg: "#e0f2f1", fg: "#00796b", border: "#80cbc4" }, // 予責＝ティール
  night: { bg: "#ede7f6", fg: "#5e35b1", border: "#b39ddb" }, // 遅番＝紫
};
const DEFAULT_ROLE_COLOR = { bg: "#eceff1", fg: "#455a64", border: "#cfd8dc" };

/** ロールキーに対応する配色（未登録は既定グレー）。 */
export const leaderRoleColor = (key: string) => ROLE_COLORS[key] ?? DEFAULT_ROLE_COLOR;

/** ロールキーに対応するバッジ/チップの inline スタイル。 */
export const leaderRoleStyle = (key: string): CSSProperties => {
  const c = leaderRoleColor(key);
  return { background: c.bg, color: c.fg, border: `1px solid ${c.border}` };
};

type LeaderBadgesProps = {
  /** 解決済みの責任者ルール（早責/夜責 など） */
  rules: ShiftLeaderRule[];
  /** バッジを出す対象スタッフ */
  staffId: string;
  /**
   * 抽出バブルの URL を作る（そのルールの関係者ID群）。渡すとバッジが ObjectView になり、
   * ダブルクリックで関係者だけの抽出バブルを開ける（展開・data-url・opener は ObjectView に一任）。
   * 省略時は表示専用。URL スキームは app 層の関心事なので注入で受ける。
   */
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
  extractBubbleUrl,
}) => {
  const myRules = rules.filter((r) => r.leaderStaffIds.includes(staffId));
  const clickable = !!extractBubbleUrl;

  return (
    <>
      {myRules.map((rule) => {
        const badge = (
          <span
            className={`e-leader-badge${clickable ? " is-clickable" : ""}`}
            style={leaderRoleStyle(rule.key)}
            title={
              clickable
                ? `${rule.label}の関係者だけを抽出（ダブルクリック）`
                : `${rule.label}（${rule.shiftName}責任者）`
            }
          >
            {rule.label}
          </span>
        );
        // ObjectView が data-url・ダブルクリック展開・opener（origin-side で近くに出す）を担う。
        // バッジは「スタッフ展開(.e-staff の onClick)」「スタッフ詳細(外側 ObjectView の dblclick)」の
        // 内側にあるので、クリック/ダブルクリックを止めてバッジ自身の抽出だけを起こす。
        return clickable && extractBubbleUrl ? (
          <span
            key={rule.key}
            style={{ display: "inline-flex" }}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <ObjectView
              url={extractBubbleUrl(rule.leaderStaffIds)}
              openingPosition="origin-side"
              draggable={false}
            >
              {badge}
            </ObjectView>
          </span>
        ) : (
          <Fragment key={rule.key}>{badge}</Fragment>
        );
      })}
    </>
  );
};
