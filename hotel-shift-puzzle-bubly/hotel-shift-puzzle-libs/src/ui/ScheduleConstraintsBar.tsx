'use client';

/**
 * ScheduleConstraintsBar — 勤務表に効く制約を「動的アイコン」で並べるバー。
 *
 * 制約を向きで3グループに分けて表示する:
 *   - 稼働日ごと（縦↕）: 責任者ルール（早責/予責/夜責）＋ 休み上限（1日 N 人まで）
 *   - 人ごと（横↔）    : 休日（月 N 日以上）＋ 連勤（N 連勤まで）＋ 勤務間インターバル（遅番明け）
 *   - 全体             : 希望（できるだけ希望に沿う）
 *
 * 責任者アイコンは、スタッフ名右の責任者バッジ（LeaderBadges）と同じく、単クリックで
 * その関係者を選択してフォーカス/解決モードに入る（onSelectRule）。ダブルクリックでは
 * ObjectView 経由で schedule-leader-rule バブルを開く（既存動作を維持）。
 */
import { FC, Fragment, ReactNode } from "react";
import styled from "styled-components";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { SCHEDULE_LEADER_RULE_VIEW_TYPE } from "./viewObjectTypes.js";
import { ShiftIntervalRule, ShiftLeaderRule } from "../domain/index.js";
import { leaderRoleColor } from "./LeaderBadges.js";
import { SHIFT_BG, SHIFT_FG } from "./schedule-grid/constants.js";
import { IconColor, IconFrame, IconCaption } from "./constraint-icons/common.js";
import { LeaderConstraintIcon } from "./constraint-icons/LeaderConstraintIcon.js";
import { MaxDayOffPerDayIcon } from "./constraint-icons/MaxDayOffPerDayIcon.js";
import { MinMonthlyDayOffIcon } from "./constraint-icons/MinMonthlyDayOffIcon.js";
import { MaxConsecutiveIcon } from "./constraint-icons/MaxConsecutiveIcon.js";
import { ShiftIntervalIcon } from "./constraint-icons/ShiftIntervalIcon.js";
import { WishIcon } from "./constraint-icons/WishIcon.js";

type ScheduleConstraintsBarProps = {
  /** 責任者ルール（解決済み） */
  leaderRules: ShiftLeaderRule[];
  /**
   * スタッフID → 表示名（tooltip 用）。
   * 担当者は勤務表ごとに決まる（名簿は勤務表が生まれるときに焼き付く）ので、
   * グローバルの制約セットを描くときは渡さない。渡さなければ ID をそのまま出す。
   */
  nameOf?: (staffId: string) => string;
  /** 担当勤務帯名 → 色（アイコンの流れを勤務帯色で塗る）。未解決は既定グレー。 */
  shiftColorOf?: (shiftName: string) => IconColor;
  /** 責任者アイコンの単クリック: その関係者を選択（フォーカス/解決モード）。 */
  onSelectRule?: (staffIds: string[]) => void;
  /** 現在フォーカス中（選択中）のスタッフID。ルールの関係者が全員含まれればそのアイコンを強調する。 */
  selectedStaffIds?: Set<string>;
  /** 責任者ルールの図バブル URL（ダブルクリックで開く）。省略時は開かない。 */
  ruleBubbleUrl?: (ruleKey: string) => string;
  /** 責任者ルールを新規追加する。渡すと「＋」が出る。 */
  onAddRule?: () => void;
  /** 連勤上限（日数） */
  maxConsecutive: number;
  /** 月の最低休日数 */
  minDayOff: number;
  /** 1日に休める人数の上限 */
  maxPerDay: number;
  /** シフト希望チェックが有効か */
  checkShiftWish: boolean;
  /** 勤務間インターバルのルール（「遅番の翌日は早番・中番に入れない」など） */
  intervalRules?: ShiftIntervalRule[];
  /** 勤務間インターバルの図バブル URL（ダブルクリックで開く）。省略時は開かない。 */
  intervalRuleBubbleUrl?: (ruleKey: string) => string;
};

const DEFAULT_SHIFT_COLOR: IconColor = { bg: "#eceff1", fg: "#455a64" };

/** 勤務帯ID から色を引く（早番＝青 …）。ScheduleGrid から shiftColorOf 経由で使う。 */
export const shiftColorById = (shiftId: string | undefined): IconColor => ({
  bg: (shiftId && SHIFT_BG[shiftId]) || DEFAULT_SHIFT_COLOR.bg,
  fg: (shiftId && SHIFT_FG[shiftId]) || DEFAULT_SHIFT_COLOR.fg,
});

/**
 * 勤務帯の並びから `shiftColorOf`（担当勤務帯名 → 色）を作る。
 *
 * 責任者ルールが持つのは勤務帯の**名前**だけなので、色を引くには名前→ID の解決が要る。
 * 同じ名前の勤務帯が時刻違いで複数あるときは**先頭（開始時刻昇順の最初）を代表**にする。
 * 色の真実（SHIFT_BG / SHIFT_FG）がこのファイルにあるので、解決もここに置く
 * （呼び出し側で書き写すと、勤務表とグローバルで色が食い違いうる）。
 */
export const shiftColorOfNames = (
  shifts: readonly { id: string; name: string }[]
): ((shiftName: string) => IconColor) => {
  const idByName = new Map<string, string>();
  for (const w of shifts) if (!idByName.has(w.name)) idByName.set(w.name, w.id);
  return (shiftName: string) => shiftColorById(idByName.get(shiftName));
};

export const ScheduleConstraintsBar: FC<ScheduleConstraintsBarProps> = ({
  leaderRules,
  nameOf,
  shiftColorOf,
  onSelectRule,
  selectedStaffIds,
  ruleBubbleUrl,
  onAddRule,
  maxConsecutive,
  minDayOff,
  maxPerDay,
  checkShiftWish,
  intervalRules = [],
  intervalRuleBubbleUrl,
}) => {
  // 責任者アイコン1つ（単クリック=選択 / ダブルクリック=図バブル）
  const renderLeader = (rule: ShiftLeaderRule): ReactNode => {
    const color = shiftColorOf?.(rule.shiftName) ?? DEFAULT_SHIFT_COLOR;
    const chip = leaderRoleColor(rule.key);
    const who =
      rule.leaderStaffIds.length > 0
        ? rule.leaderStaffIds.map((id) => nameOf?.(id) ?? id).join("・")
        : "（該当者なし）";
    const quota =
      rule.minCount <= 1 ? "のうちいずれか1人" : `のうち最低${rule.minCount}人`;
    const title = `${rule.label}: ${rule.shiftName}に ${who} ${quota}`;

    // この制約にフォーカス中か＝関係者が全員いま選択されている（selectRuleStaff の判定と同じ）。
    const focused =
      rule.leaderStaffIds.length > 0 &&
      !!selectedStaffIds &&
      rule.leaderStaffIds.every((id) => selectedStaffIds.has(id));

    const frame = (
      <IconFrame
        className={`${onSelectRule ? "is-clickable" : ""}${focused ? " is-focused" : ""}`}
        style={{ ["--focus" as string]: chip.fg }}
        title={title}
        role={onSelectRule ? "button" : undefined}
        onClick={
          onSelectRule
            ? (e) => {
                e.stopPropagation();
                onSelectRule(rule.leaderStaffIds);
              }
            : undefined
        }
      >
        <LeaderConstraintIcon
          count={rule.leaderStaffIds.length}
          minCount={rule.minCount}
          color={color}
        />
        <IconCaption
          style={
            focused
              ? {
                  color: chip.fg,
                  fontWeight: 700,
                  background: chip.bg,
                  border: `1px solid ${chip.border}`,
                  borderRadius: 4,
                  padding: "0 5px",
                }
              : { color: chip.fg, fontWeight: 700 }
          }
        >
          {rule.label}
        </IconCaption>
      </IconFrame>
    );

    // ダブルクリックで図バブルを開く（ObjectView）。単クリックの選択は内側で stopPropagation 済み。
    return ruleBubbleUrl ? (
      <ObjectView
        key={rule.key}
        type={SCHEDULE_LEADER_RULE_VIEW_TYPE}
        url={ruleBubbleUrl(rule.key)}
        label={rule.label}
        openingPosition="origin-side"
      >
        {frame}
      </ObjectView>
    ) : (
      <Fragment key={rule.key}>{frame}</Fragment>
    );
  };

  // 勤務間インターバルのアイコン1つ（ダブルクリック=図バブル）。
  // ルール自身が describe() で自己記述するので、ツールチップも表示もそこから導く
  // （同じ文をここで書き直さない）。
  const renderInterval = (rule: ShiftIntervalRule): ReactNode => {
    const frame = (
      <IconFrame
        className={intervalRuleBubbleUrl ? "is-clickable" : ""}
        title={`${rule.describe()}${
          intervalRuleBubbleUrl ? "（ダブルクリックで詳細）" : ""
        }`}
      >
        <ShiftIntervalIcon
          fromShiftName={rule.fromShiftName}
          forbiddenShiftNames={rule.forbiddenNextShiftNames}
          restHours={rule.minRestHours}
          colorOf={(name) => shiftColorOf?.(name) ?? DEFAULT_SHIFT_COLOR}
        />
        <IconCaption>{rule.label}</IconCaption>
      </IconFrame>
    );

    return intervalRuleBubbleUrl ? (
      <ObjectView
        key={rule.key}
        url={intervalRuleBubbleUrl(rule.key)}
        openingPosition="origin-side"
        draggable={false}
      >
        {frame}
      </ObjectView>
    ) : (
      <Fragment key={rule.key}>{frame}</Fragment>
    );
  };

  return (
    <StyledBar>
      {/* 稼働日ごと（縦） */}
      <div className="e-group">
        <span className="e-group-label">稼働日ごと<span className="e-axis">↕</span></span>
        <div className="e-icons">
          {leaderRules.map(renderLeader)}
          <IconFrame title={`1日に休めるのは${maxPerDay}人まで`}>
            <MaxDayOffPerDayIcon max={maxPerDay} />
            <IconCaption>休み上限</IconCaption>
          </IconFrame>
          {onAddRule && (
            <button
              type="button"
              className="e-add-rule"
              onClick={onAddRule}
              title="責任者ルールを追加"
            >
              ＋
            </button>
          )}
        </div>
      </div>

      {/* 人ごと（横） */}
      <div className="e-group">
        <span className="e-group-label">人ごと<span className="e-axis">↔</span></span>
        <div className="e-icons">
          <IconFrame title={`月に${minDayOff}日以上休む`}>
            <MinMonthlyDayOffIcon min={minDayOff} />
            <IconCaption>休日</IconCaption>
          </IconFrame>
          <IconFrame title={`連勤は最大${maxConsecutive}日まで`}>
            <MaxConsecutiveIcon max={maxConsecutive} />
            <IconCaption>連勤</IconCaption>
          </IconFrame>
          {intervalRules.map(renderInterval)}
        </div>
      </div>

      {/* 全体 */}
      <div className="e-group">
        <span className="e-group-label">全体</span>
        <div className="e-icons">
          <IconFrame title="できるだけシフト希望に沿う">
            <WishIcon on={checkShiftWish} />
            <IconCaption>希望</IconCaption>
          </IconFrame>
        </div>
      </div>
    </StyledBar>
  );
};

const StyledBar = styled.div`
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: 8px 10px;
  background: #fafafa;
  border: 1px solid #eceff1;
  border-radius: 8px;

  .e-group {
    display: flex;
    flex-direction: column;
    gap: 4px;

    /* グループ間の仕切り */
    &:not(:last-child) {
      padding-right: 10px;
      border-right: 1px dashed #dfe4e7;
    }
  }

  .e-group-label {
    font-size: 0.72em;
    font-weight: 700;
    color: #607d8b;
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .e-axis {
    color: #90a4ae;
    font-size: 1.1em;
  }

  .e-icons {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    flex-wrap: wrap;
  }

  /* 責任者ルール追加ボタン */
  .e-add-rule {
    align-self: center;
    width: 32px;
    height: 32px;
    border: 1px dashed #b0bec5;
    border-radius: 8px;
    background: #fff;
    color: #546e7a;
    font-size: 1.1em;
    cursor: pointer;
    &:hover {
      background: #eceff1;
      border-color: #78909c;
      color: #37474f;
    }
  }
`;
