'use client';

import { CSSProperties, FC, Fragment } from "react";
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
   * バッジをクリックしたときに、そのルールの関係者ID群を渡すコールバック。渡すとバッジが
   * クリック可能になり、押すと関係者を（表の中で）選択・強調して操作対象にできる。
   * 省略時は表示専用（別バブルは開かない）。
   */
  onSelectRule?: (staffIds: string[]) => void;
};

/**
 * スタッフ名の横に出す責任者バッジ（早責/夜責 …）。
 * 早責・夜責などの違いはルール（ShiftLeaderRule）のキー/ラベルだけで、描画は共通コード。
 * 勤務表グリッドと稼働日ビューの両方がこれを使う。
 */
export const LeaderBadges: FC<LeaderBadgesProps> = ({
  rules,
  staffId,
  onSelectRule,
}) => {
  const myRules = rules.filter((r) => r.leaderStaffIds.includes(staffId));
  const clickable = !!onSelectRule;

  return (
    <>
      {myRules.map((rule) => {
        const badge = (
          <span
            className={`e-leader-badge${clickable ? " is-clickable" : ""}`}
            style={leaderRoleStyle(rule.key)}
            title={
              clickable
                ? `${rule.label}の関係者を選択（クリック）`
                : `${rule.label}（${rule.shiftName}責任者）`
            }
          >
            {rule.label}
          </span>
        );
        // バッジは「スタッフ展開(.e-staff の onClick)」「スタッフ詳細(外側 ObjectView の dblclick)」の
        // 内側にあるので、クリック/ダブルクリックを止めてバッジ自身の選択だけを起こす。
        return clickable && onSelectRule ? (
          <span
            key={rule.key}
            style={{ display: "inline-flex" }}
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectRule(rule.leaderStaffIds);
            }}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            {badge}
          </span>
        ) : (
          <Fragment key={rule.key}>{badge}</Fragment>
        );
      })}
    </>
  );
};
