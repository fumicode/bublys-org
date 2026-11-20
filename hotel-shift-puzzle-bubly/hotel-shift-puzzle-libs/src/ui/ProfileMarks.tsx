'use client';

import { FC, Fragment } from "react";
import { css } from "styled-components";
import type { ProfileMark, StaffProfile } from "../domain/index.js";
import { leaderRoleStyle } from "./leaderRoleColors.js";
import { DayOffStyleIcon } from "./constraint-icons/DayOffStyleIcon.js";

type ProfileMarksProps = {
  marks: readonly ProfileMark[];
  onSelectRule?: (staffIds: string[]) => void;
};

/**
 * スタッフ名の横に出す記号（#236）。
 *
 * 記号の種類ごとの描き方:
 *   - emojiTag    … 絵文字タグ（🔰 など。ツールチップでラベル）
 *   - leader      … 責任者のバッジ（役割ごとの色。押すと関係者を選ぶ）
 *   - dayOffStyle … 休みの形のアイコン
 */
export const ProfileMarks: FC<ProfileMarksProps> = ({ marks, onSelectRule }) => (
  <>
    {marks.map((mark) => {
      switch (mark.kind) {
        case "emojiTag":
          return (
            <span
              key={`tag:${mark.emoji}`}
              className="e-profile-symbol"
              title={mark.label ?? mark.emoji}
            >
              {mark.emoji}
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
 * 名前の横の記号を並べる（絵文字タグ → 責任者 → 休みの形）。
 * 勤務表・日別バブル・名簿の名前の横は、どれもこれで描く。
 * 責任者バッジが複数あるときは縦に重ねる。
 */
export const ProfileMarkGroups: FC<{
  profile: StaffProfile;
  onSelectRule?: (staffIds: string[]) => void;
}> = ({ profile, onSelectRule }) => {
  const leaders = profile.leaderMarks;
  const others = profile.marks.filter((m) => m.kind !== "leader");
  return (
    <span className="e-profile-groups">
      <ProfileMarks marks={others} onSelectRule={onSelectRule} />
      {leaders.length > 0 && (
        <span className={`e-leader-stack${leaders.length > 1 ? " is-stacked" : ""}`}>
          <ProfileMarks marks={leaders} onSelectRule={onSelectRule} />
        </span>
      )}
    </span>
  );
};

/**
 * 名前の横の記号の見た目。勤務表・日別バブル・名簿で同じにするため、
 * 置き場所の styled に差し込む。
 */
export const profileMarkStyles = css`
  .e-profile-groups {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .e-profile-symbol {
    flex-shrink: 0;
    font-size: 0.85em;
    line-height: 1;
    cursor: help;
  }
  .e-day-off-style-icon {
    flex-shrink: 0;
    display: inline-flex;
    cursor: help;
  }
  .e-leader-stack {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    &.is-stacked {
      flex-direction: column;
      align-items: flex-start;
      gap: 1px;
    }
  }
`;
