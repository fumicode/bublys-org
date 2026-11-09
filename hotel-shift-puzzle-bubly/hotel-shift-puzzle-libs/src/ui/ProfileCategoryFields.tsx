'use client';

import { FC, Fragment, ReactNode, useEffect, useState, type KeyboardEvent } from "react";
import { css } from "styled-components";
import {
  type DayOffStyle,
  type ProfileCategoryKey,
  type ShiftLeaderRule,
  type Staff,
  type StaffProfileDictionary,
} from "../domain/index.js";
import { DayOffStyleSelect } from "./DayOffStyleSelect.js";
import {
  ProfileItemSelect,
  profileItemSelectStyles,
  profileValueText,
} from "./ProfileItemSelect.js";
import { leaderRoleStyle } from "./leaderRoleColors.js";

export type ProfileCategoryFieldsProps = {
  category: ProfileCategoryKey;
  staff: Staff;
  dictionary?: StaffProfileDictionary;
  /**
   * その項目の値。value は自分の値（勤務表では上書き。undefined＝既定のまま）、
   * inherited は勤務表で直すときの既定値（スタッフの店舗での値）。省略時は店舗での値
   */
  profileValuesOf?: (itemId: string) => {
    value: readonly string[] | undefined;
    inherited?: readonly string[];
  };
  /** 辞書の項目の値を変える。勤務表では undefined で上書きを外す。省略すると読むだけ */
  onChangeProfileValues?: (itemId: string, valueIds: readonly string[] | undefined) => void;
  /** 所属（基本情報）。onChange を渡すと直せる（店舗での値だけ） */
  department?: { value: string; onChange?: (department: string) => void };
  /** 休みの形（勤務スタイル）。inherited は勤務表で直すときの既定値 */
  dayOffStyle?: {
    value: DayOffStyle | undefined;
    inherited?: DayOffStyle;
    onChange?: (style: DayOffStyle | undefined) => void;
  };
  /** 責任者（役割・責任）。勤務表で直すときだけ渡す（責任者は勤務表ごとに決める） */
  leaderRules?: readonly ShiftLeaderRule[];
  /** その役割の責任者にする／外す（その勤務表の制約セット。制約バブルと同じ値） */
  onToggleLeader?: (ruleKey: string) => void;
};

/**
 * スタッフプロファイルの分類1つぶんの編集欄（#236）。
 *
 * ルール: **プロファイルを直す欄はこれ1つ。** 置き場所は3つあり、どこでも同じ欄で直す:
 *   - スタッフプロファイルの表の ✎（店舗での既定値）
 *   - 勤務スタッフの表の ✎（その勤務表での値）
 *   - スタッフ詳細（勤務表の中の1人。その勤務表での値）
 * どの値を直すか（店舗／勤務表）は、渡す値と onChange で決まる（この欄は知らない）。
 * 組み込みの項目（所属・責任者・休みの形）も、その分類の中に辞書の項目と並べる。
 */
export const ProfileCategoryFields: FC<ProfileCategoryFieldsProps> = ({
  category,
  staff,
  dictionary,
  profileValuesOf,
  onChangeProfileValues,
  department,
  dayOffStyle,
  leaderRules,
  onToggleLeader,
}) => {
  const rows: ReactNode[] = [];

  if (category === "basic" && department) {
    rows.push(
      <Fragment key=":department">
        <dt>所属</dt>
        <dd>
          {department.onChange ? (
            <CommitInput
              className="e-text-input"
              value={department.value}
              placeholder="（未設定）"
              onCommit={department.onChange}
            />
          ) : (
            department.value || "（未設定）"
          )}
        </dd>
      </Fragment>
    );
  }

  if (category === "role" && leaderRules) {
    rows.push(
      <Fragment key=":leaders">
        <dt>責任者</dt>
        <dd className="e-leaders">
          {leaderRules.length === 0
            ? "（この勤務表に責任者の役割がありません）"
            : leaderRules.map((rule) => (
                <label key={rule.key} className="e-profile-check">
                  <input
                    type="checkbox"
                    checked={rule.leaderStaffIds.includes(staff.id)}
                    disabled={!onToggleLeader}
                    onChange={() => onToggleLeader?.(rule.key)}
                  />
                  <span className="e-leader-badge" style={leaderRoleStyle(rule.key)}>
                    {rule.label}
                  </span>
                </label>
              ))}
        </dd>
      </Fragment>
    );
  }

  if (category === "workStyle" && dayOffStyle) {
    const overridden = dayOffStyle.inherited !== undefined && dayOffStyle.value !== undefined;
    const shown = dayOffStyle.value ?? dayOffStyle.inherited ?? staff.dayOffStyle;
    rows.push(
      <Fragment key=":dayOffStyle">
        <dt>休みの形</dt>
        <dd>
          {dayOffStyle.onChange ? (
            <DayOffStyleSelect
              className={`e-day-off-style${overridden ? " is-overridden" : ""}`}
              value={dayOffStyle.value}
              inherited={dayOffStyle.inherited}
              onChange={dayOffStyle.onChange}
              title="自動シフトが休みを置くときの形"
            />
          ) : (
            shown.label
          )}
        </dd>
      </Fragment>
    );
  }

  for (const item of dictionary?.itemsIn(category) ?? []) {
    const { value, inherited } = profileValuesOf?.(item.id) ?? {
      value: staff.profile.valueIdsOf(item.id),
    };
    rows.push(
      <Fragment key={item.id}>
        <dt>{item.name}</dt>
        <dd>
          {onChangeProfileValues ? (
            <ProfileItemSelect
              className="e-profile-select"
              item={item}
              value={value}
              inherited={inherited}
              onChange={(ids) => onChangeProfileValues(item.id, ids)}
            />
          ) : (
            item.resolve(value ?? inherited ?? []).map(profileValueText).join("・") || "（未設定）"
          )}
        </dd>
      </Fragment>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="e-profile-empty">
        この分類の項目はまだありません（スタッフプロファイルの辞書で足せます）。
      </p>
    );
  }
  return <dl className="e-profile-fields">{rows}</dl>;
};

/** 確定したときだけ onCommit を呼ぶ入力欄（フォーカスが外れた・Enter）。Escape で元に戻す */
const CommitInput: FC<{
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  placeholder?: string;
}> = ({ value, onCommit, ...rest }) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    const next = draft.trim();
    if (next !== value) onCommit(next);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) e.currentTarget.blur();
    if (e.key === "Escape") setDraft(value);
  };
  return (
    <input
      {...rest}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
    />
  );
};

/** ProfileCategoryFields の見た目。置き場所（スタッフ詳細・表の編集欄）の styled に差し込む */
export const profileCategoryFieldsStyles = css`
  .e-profile-fields {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 6px 12px;
    margin: 0;

    dt {
      color: #666;
      font-size: 0.85em;
      white-space: nowrap;
    }
    dd {
      margin: 0;
    }
  }
  .e-profile-empty {
    margin: 0;
    font-size: 0.8em;
    color: #90a4ae;
  }
  .e-text-input {
    border: 1px solid #cfd8dc;
    border-radius: 4px;
    padding: 2px 6px;
    font: inherit;
    min-width: 8em;
  }
  .e-leaders {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
  }
  .e-leader-badge {
    font-size: 0.75em;
    font-weight: bold;
    padding: 1px 4px;
    border-radius: 3px;
  }
  .e-day-off-style {
    font-size: 0.85em;
  }
  .e-day-off-style.is-overridden {
    color: #00695c;
    font-weight: bold;
  }
  ${profileItemSelectStyles}
`;
