'use client';

import { FC, useState, useContext } from "react";
import styled from "styled-components";
import { Button, Checkbox, FormControlLabel } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { createDefaultShifts, DAY_TYPE_ORDER } from "../data/sampleData.js";
import { MemberFilterCriteria as MemberFilterType, stringifyMemberFilter } from "./MemberCollection.js";
import { type DayType, type Shift } from "../domain/index.js";

// 局一覧（マスターデータとして定義）
const DEPARTMENTS = ["企画局", "広報局", "技術局", "総務局"];

type MemberFilterProps = {
  initialFilter?: MemberFilterType;
};

export const MemberFilter: FC<MemberFilterProps> = ({ initialFilter }) => {
  const { openBubble } = useContext(BubblesContext);
  const shifts = createDefaultShifts();

  // 局フィルターの選択状態
  const [selectedDepartment, setSelectedDepartment] = useState<string>(
    initialFilter?.department ?? ''
  );

  // シフトフィルターの選択状態
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>(
    initialFilter?.availableFor ?? []
  );

  const handleShiftToggle = (shiftId: string) => {
    setSelectedShiftIds((prev) =>
      prev.includes(shiftId)
        ? prev.filter((id) => id !== shiftId)
        : [...prev, shiftId]
    );
  };

  // dayTypeごとに「全選択」
  const handleSelectDayType = (dayType: string) => {
    const shiftsForDayType = shifts.filter((s) => s.dayType === dayType).map((s) => s.id);
    const allSelected = shiftsForDayType.every((id) => selectedShiftIds.includes(id));

    if (allSelected) {
      setSelectedShiftIds((prev) => prev.filter((id) => !shiftsForDayType.includes(id)));
    } else {
      setSelectedShiftIds((prev) => [...new Set([...prev, ...shiftsForDayType])]);
    }
  };

  // 検索ボタンクリック
  const handleSearch = () => {
    const filter: MemberFilterType = {};

    if (selectedDepartment) {
      filter.department = selectedDepartment;
    }
    if (selectedShiftIds.length > 0) {
      filter.availableFor = selectedShiftIds;
    }

    const query = stringifyMemberFilter(filter);
    openBubble(`shift-puzzle/members${query}`, 'root');
  };

  const hasSelection = selectedDepartment || selectedShiftIds.length > 0;

  // dayTypeごとにグループ化
  const shiftsByDayType = shifts.reduce((acc, shift) => {
    if (!acc[shift.dayType]) {
      acc[shift.dayType] = [];
    }
    acc[shift.dayType].push(shift);
    return acc;
  }, {} as Record<DayType, Shift[]>);

  const dayTypes = DAY_TYPE_ORDER.filter((dt) => shiftsByDayType[dt]);

  return (
    <StyledContainer>
      <h3>局員絞り込み検索</h3>

      {/* 局フィルター */}
      <section className="e-section">
        <h4>所属局</h4>
        <div className="e-dept-list">
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedDepartment === ''}
                onChange={() => setSelectedDepartment('')}
                size="small"
              />
            }
            label="すべて"
          />
          {DEPARTMENTS.map((dept) => (
            <FormControlLabel
              key={dept}
              control={
                <Checkbox
                  checked={selectedDepartment === dept}
                  onChange={() => setSelectedDepartment(selectedDepartment === dept ? '' : dept)}
                  size="small"
                />
              }
              label={dept}
            />
          ))}
        </div>
      </section>

      {/* 参加可能シフトフィルター */}
      <section className="e-section">
        <h4>参加可能シフト（AND条件）</h4>
        <p className="e-hint">選択した全てのシフトに参加可能な局員を検索</p>
        <div className="e-shifts">
          {dayTypes.map((dayType) => {
            const dayShifts = shiftsByDayType[dayType];
            const allSelected = dayShifts.every((s) => selectedShiftIds.includes(s.id));
            const someSelected = dayShifts.some((s) => selectedShiftIds.includes(s.id));

            return (
              <div key={dayType} className="e-daytype-group">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={() => handleSelectDayType(dayType)}
                      size="small"
                    />
                  }
                  label={<span className="e-daytype-label">{dayType}</span>}
                  className="e-daytype-header"
                />
                <div className="e-shift-list">
                  {dayShifts.map((shift) => (
                    <FormControlLabel
                      key={shift.id}
                      control={
                        <Checkbox
                          checked={selectedShiftIds.includes(shift.id)}
                          onChange={() => handleShiftToggle(shift.id)}
                          size="small"
                        />
                      }
                      label={
                        <span>
                          {shift.taskName ?? shift.taskId} {shift.startTime}–{shift.endTime}
                        </span>
                      }
                      className="e-shift-item"
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 検索ボタン */}
      <div className="e-actions">
        <Button
          variant="contained"
          size="large"
          startIcon={<SearchIcon />}
          onClick={handleSearch}
          disabled={!hasSelection}
          fullWidth
        >
          検索
        </Button>
      </div>
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 16px;

  h3 {
    margin: 0 0 16px 0;
  }

  .e-section {
    margin-bottom: 20px;

    h4 {
      margin: 0 0 8px 0;
      font-size: 0.9em;
      color: #333;
    }

    .e-hint {
      margin: 0 0 8px 0;
      font-size: 0.8em;
      color: #666;
    }
  }

  .e-dept-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .e-shifts {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .e-daytype-group {
    padding: 8px;
    background-color: #f5f5f5;
    border-radius: 4px;

    .e-daytype-header {
      margin: 0;

      .e-daytype-label {
        font-weight: bold;
        font-size: 0.9em;
      }
    }

    .e-shift-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-left: 24px;
      margin-top: 4px;
    }

    .e-shift-item {
      margin: 0;

      .MuiFormControlLabel-label {
        font-size: 0.8em;
      }
    }
  }

  .e-actions {
    margin-top: 20px;

    button {
      text-transform: none;
      font-size: 1em;
    }
  }
`;
