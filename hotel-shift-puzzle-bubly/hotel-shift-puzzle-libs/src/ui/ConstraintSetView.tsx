'use client';

import { FC, useState } from "react";
import styled from "styled-components";
import { IconButton, Switch, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { ConstraintSet, ShiftLeaderRule } from "../domain/index.js";

type ConstraintSetViewProps = {
  constraintSet: ConstraintSet;
  /** 責任者ルールの「担当勤務帯」の選択肢（この制約セットが向く勤務帯セットの名前） */
  shiftNames: string[];
  /** 状態が揃うまでは編集させない */
  editable?: boolean;
  onChangeMaxConsecutiveWorkdays: (days: number) => void;
  onChangeMinMonthlyDayOff: (days: number) => void;
  onChangeMaxDayOffPerDay: (count: number) => void;
  onChangeCheckShiftWish: (check: boolean) => void;
  onAddRule: () => void;
  onRemoveRule: (ruleKey: string) => void;
  onChangeRuleLabel: (ruleKey: string, label: string) => void;
  onChangeRuleShift: (ruleKey: string, shiftName: string) => void;
  onChangeRuleMinCount: (ruleKey: string, minCount: number) => void;
  /**
   * 責任者の担当者（`leaderStaffIds`）の表示名。渡されたときだけ担当者を出す。
   * 担当者は勤務表ごとに決まる（グローバルのテンプレートでは空）ので、ここでは編集しない。
   */
  staffNameOf?: (staffId: string) => string;
};

/**
 * 制約セット（勤務表が満たすべき制約をひとまとめ）を編集するビュー。
 *
 * グローバルのテンプレートと、勤務表ごとの独自セットの**どちらにも使える**
 * （どちらも同じ `ConstraintSet`）。責任者の担当者だけは勤務表ごとの話なので、
 * ここでは読み取り専用にして、勤務表側（責任者ルールの図バブル）に任せる。
 */
export const ConstraintSetView: FC<ConstraintSetViewProps> = ({
  constraintSet,
  shiftNames,
  editable = true,
  onChangeMaxConsecutiveWorkdays,
  onChangeMinMonthlyDayOff,
  onChangeMaxDayOffPerDay,
  onChangeCheckShiftWish,
  onAddRule,
  onRemoveRule,
  onChangeRuleLabel,
  onChangeRuleShift,
  onChangeRuleMinCount,
  staffNameOf,
}) => {
  const rules = constraintSet.leaderRules;

  return (
    <StyledContainer>
      <section className="e-limits">
        <NumberField
          label="連勤上限"
          unit="日まで"
          value={constraintSet.maxConsecutiveWorkdays}
          disabled={!editable}
          onCommit={onChangeMaxConsecutiveWorkdays}
        />
        <NumberField
          label="月の最低休日"
          unit="日以上"
          value={constraintSet.minMonthlyDayOff}
          disabled={!editable}
          onCommit={onChangeMinMonthlyDayOff}
        />
        <NumberField
          label="1日の休み上限"
          unit="人まで"
          value={constraintSet.maxDayOffPerDay}
          disabled={!editable}
          onCommit={onChangeMaxDayOffPerDay}
        />
        <label className="e-switch">
          <Switch
            size="small"
            checked={constraintSet.checkShiftWish}
            disabled={!editable}
            onChange={(e) => onChangeCheckShiftWish(e.target.checked)}
          />
          <span>希望との食い違いを違反として見る</span>
        </label>
      </section>

      <section className="e-rules">
        <div className="e-rules-head">
          <h4>責任者ルール（このうち最低 N 人がその勤務帯に入る）</h4>
          <IconButton
            size="small"
            disabled={!editable}
            title="責任者ルールを追加"
            onClick={onAddRule}
          >
            <AddIcon fontSize="inherit" />
          </IconButton>
        </div>

        {rules.length === 0 ? (
          <p className="e-empty">責任者ルールがありません</p>
        ) : (
          <ul>
            {rules.map((rule) => (
              <li key={rule.key} className="e-rule">
                <TextField
                  className="e-rule-label"
                  variant="standard"
                  size="small"
                  label="名前"
                  defaultValue={rule.label}
                  disabled={!editable}
                  onBlur={(e) => onChangeRuleLabel(rule.key, e.target.value.trim())}
                />
                <TextField
                  className="e-rule-shift"
                  variant="standard"
                  size="small"
                  select
                  SelectProps={{ native: true }}
                  label="勤務帯"
                  value={rule.shiftName}
                  disabled={!editable}
                  onChange={(e) => onChangeRuleShift(rule.key, e.target.value)}
                >
                  {optionNames(shiftNames, rule).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </TextField>
                <TextField
                  className="e-rule-count"
                  variant="standard"
                  size="small"
                  type="number"
                  label="最低"
                  value={rule.minCount}
                  inputProps={{ min: 1 }}
                  disabled={!editable}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (!Number.isNaN(n)) onChangeRuleMinCount(rule.key, n);
                  }}
                />
                {staffNameOf && (
                  <span className="e-rule-staff">
                    {rule.leaderStaffIds.length === 0
                      ? "担当者なし"
                      : rule.leaderStaffIds.map(staffNameOf).join("・")}
                  </span>
                )}
                <IconButton
                  size="small"
                  className="e-rule-remove"
                  disabled={!editable}
                  title="このルールを削除"
                  onClick={() => onRemoveRule(rule.key)}
                >
                  <DeleteOutlineIcon fontSize="inherit" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </section>
    </StyledContainer>
  );
};

/** 選択肢。いまの値が勤務帯セットに無くても選択を失わないよう、頭に足す */
function optionNames(shiftNames: string[], rule: ShiftLeaderRule): string[] {
  return shiftNames.includes(rule.shiftName)
    ? shiftNames
    : [rule.shiftName, ...shiftNames];
}

/** 入力中は保存せず、フォーカスを外した／Enter を押したときに1回だけ確定する数値欄 */
const NumberField: FC<{
  label: string;
  unit: string;
  value: number;
  disabled?: boolean;
  onCommit: (value: number) => void;
}> = ({ label, unit, value, disabled, onCommit }) => {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const n = parseInt(draft, 10);
    if (!Number.isNaN(n)) onCommit(n);
    setDraft(null);
  };

  return (
    <label className="e-number">
      <TextField
        variant="standard"
        size="small"
        type="number"
        label={label}
        value={draft ?? value}
        inputProps={{ min: 1 }}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setDraft(null);
        }}
      />
      <span className="e-unit">{unit}</span>
    </label>
  );
};

const StyledContainer = styled.div`
  font-size: 0.9em;

  h4 {
    margin: 0;
    font-size: 0.8em;
    font-weight: normal;
    color: #888;
  }

  .e-empty {
    color: #888;
    margin: 4px 0;
  }

  .e-limits {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #eee;
  }

  .e-number {
    display: flex;
    align-items: flex-end;
    gap: 4px;

    .MuiTextField-root {
      width: 64px;
    }
  }

  .e-unit {
    font-size: 0.78em;
    color: #888;
    padding-bottom: 4px;
  }

  .e-switch {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 0.8em;
    color: #555;
  }

  .e-rules {
    margin-top: 8px;

    ul {
      list-style: none;
      margin: 4px 0 0;
      padding: 0;
    }
  }

  .e-rules-head {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .e-rule {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 2px 0;
    border-bottom: 1px solid #f4f4f4;

    .e-rule-label {
      width: 96px;
    }

    .e-rule-shift {
      width: 88px;
    }

    .e-rule-count {
      width: 52px;
    }

    .e-rule-staff {
      flex: 1 1 auto;
      min-width: 0;
      font-size: 0.78em;
      color: #888;
      padding-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .e-rule-remove {
      margin-left: auto;
    }
  }
`;
