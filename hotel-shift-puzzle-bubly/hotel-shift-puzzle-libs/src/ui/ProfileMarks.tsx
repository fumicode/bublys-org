'use client';

import { FC, Fragment } from "react";
import { css } from "styled-components";
import type { ProfileMark, StaffProfile } from "../domain/index.js";
import { leaderRoleStyle } from "./leaderRoleColors.js";
import { DayOffStyleIcon } from "./constraint-icons/DayOffStyleIcon.js";

type ProfileMarksProps = {
  /** スタッフプロファイルの記号（StaffProfile.marks。分類の順に並んでいる） */
  marks: readonly ProfileMark[];
  /**
   * 責任者の記号を押したときに、そのルールの関係者ID群を渡す。渡すと押せるようになり、
   * 押すと関係者を（表の中で）選択・強調できる。省略時は表示だけ。
   */
  onSelectRule?: (staffIds: string[]) => void;
};

/**
 * スタッフ名の横に出す記号（スタッフプロファイル。#236）。
 *
 * ルール: **名前の横はこの1か所から描く。** 何を出すかは StaffProfile.marks が決める
 * （記号のある値だけを分類の順に）。ここは記号の種類ごとの描き方だけを持つ:
 *   - symbol      … 辞書の値の記号（🔰 など）をそのまま。framed なら文字を囲む（.e-profile-badge）
 *   - leader      … 責任者のバッジ（役割ごとの色。押すと関係者を選ぶ）
 *   - dayOffStyle … 休みの形のアイコン
 *
 * 記号そのものの見た目は {@link profileMarkStyles} を置き場所の styled に差し込む。
 * 並べ方（縦に積む・横に並べる）は置き場所が決める。
 */
export const ProfileMarks: FC<ProfileMarksProps> = ({ marks, onSelectRule }) => (
  <>
    {marks.map((mark) => {
      switch (mark.kind) {
        case "symbol":
          return (
            <span
              key={`symbol:${mark.label}`}
              className={mark.framed ? "e-profile-badge" : "e-profile-symbol"}
              title={mark.label}
            >
              {mark.text}
            </span>
          );
        case "leader":
          return (
            <LeaderMark key={`leader:${mark.ruleKey}`} mark={mark} onSelectRule={onSelectRule} />
          );
        case "dayOffStyle":
          return (
            <span
              key="dayOffStyle"
              className="e-day-off-style-icon"
              title={`休みの形：${mark.style.label}。自動シフトはこの形に沿って休みを置きます`}
            >
              <DayOffStyleIcon dayOffStyle={mark.style} />
            </span>
          );
      }
    })}
  </>
);

const LeaderMark: FC<{
  mark: Extract<ProfileMark, { kind: "leader" }>;
  onSelectRule?: (staffIds: string[]) => void;
}> = ({ mark, onSelectRule }) => {
  const clickable = !!onSelectRule;
  const badge = (
    <span
      className={`e-leader-badge${clickable ? " is-clickable" : ""}`}
      style={leaderRoleStyle(mark.ruleKey)}
      title={
        clickable
          ? `${mark.label}の関係者を選択（クリック）`
          : `${mark.label}（${mark.shiftName}責任者）`
      }
    >
      {mark.label}
    </span>
  );
  if (!onSelectRule) return <Fragment>{badge}</Fragment>;
  // バッジは「スタッフ詳細（外側 ObjectView の dblclick）」の内側にあるので、
  // クリック／ダブルクリックを止めてバッジ自身の選択だけを起こす。
  return (
    <span
      style={{ display: "inline-flex" }}
      role="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelectRule([...mark.staffIds]);
      }}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {badge}
    </span>
  );
};

/**
 * 名前の横の記号を、分類を横に・同じ分類を縦に並べる（StaffProfile.markGroups）。
 * 勤務表・日別バブル・名簿の名前の横は、どれもこれで描く。
 */
export const ProfileMarkGroups: FC<{
  profile: StaffProfile;
  onSelectRule?: (staffIds: string[]) => void;
}> = ({ profile, onSelectRule }) => (
  <span className="e-profile-groups">
    {profile.markGroups.map((g) => (
      <span key={g.category} className="e-profile-group">
        <ProfileMarks marks={g.marks} onSelectRule={onSelectRule} />
      </span>
    ))}
  </span>
);

/**
 * 名前の横の記号の見た目。勤務表・日別バブル・名簿・プロファイルの表で同じにするため、
 * 置き場所の styled に差し込む（責任者のバッジの見た目は置き場所ごとに既にあるので含めない）。
 */
export const profileMarkStyles = css`
  /* 分類を横に並べ、同じ分類の中は縦に積む */
  .e-profile-groups {
    display: inline-flex;
    align-items: flex-start;
    gap: 3px;
  }
  .e-profile-group {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
  }
  .e-profile-symbol {
    flex-shrink: 0;
    font-size: 0.85em;
    line-height: 1;
    cursor: help;
  }
  /* 文字を囲む記号（責任者のバッジと同じ形。色は付けない） */
  .e-profile-badge {
    flex-shrink: 0;
    font-size: 0.6em;
    font-weight: bold;
    line-height: 1.1;
    padding: 1px 3px;
    border-radius: 3px;
    border: 1px solid #b0bec5;
    background: #fff;
    color: #455a64;
    white-space: nowrap;
    cursor: help;
  }
  .e-day-off-style-icon {
    flex-shrink: 0;
    display: inline-flex;
    cursor: help;
  }
`;
