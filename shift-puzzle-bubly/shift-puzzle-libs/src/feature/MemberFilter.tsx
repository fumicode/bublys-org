'use client';

import { FC, useState, useContext } from "react";
import styled from "styled-components";
import { Button, Checkbox, FormControlLabel } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { createDefaultTimeSlots, DAY_TYPE_ORDER } from "../data/sampleData.js";
import { MemberFilterCriteria as MemberFilterType, stringifyMemberFilter } from "./MemberCollection.js";
import { type DayType } from "../domain/index.js";

// 局一覧（マスターデータとして定義）
const DEPARTMENTS = ["企画局", "広報局", "技術局", "総務局"];

type MemberFilterProps = {
  initialFilter?: MemberFilterType;
};

export const MemberFilter: FC<MemberFilterProps> = ({ initialFilter }) => {
  const { openBubble } = useContext(BubblesContext);
  const timeSlots = createDefaultTimeSlots();

  // 局フィルターの選択状態
  const [selectedDepartment, setSelectedDepartment] = useState<string>(
    initialFilter?.department ?? ''
  );

  // 時間帯フィルターの選択状態
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>(
    initialFilter?.availableAt ?? []
  );

  const handleTimeSlotToggle = (slotId: string) => {
    setSelectedTimeSlots((prev) =>
      prev.includes(slotId)
        ? prev.filter((id) => id !== slotId)
        : [...prev, slotId]
    );
  };

  // dayTypeごとに「全選択」
  const handleSelectDayType = (dayType: string) => {
    const slotsForDayType = timeSlots.filter((s) => s.dayType === dayType).map((s) => s.id);
    const allSelected = slotsForDayType.every((id) => selectedTimeSlots.includes(id));

    if (allSelected) {
      setSelectedTimeSlots((prev) => prev.filter((id) => !slotsForDayType.includes(id)));
    } else {
      setSelectedTimeSlots((prev) => [...new Set([...prev, ...slotsForDayType])]);
    }
  };

  // 検索ボタンクリック
  const handleSearch = () => {
    const filter: MemberFilterType = {};

    if (selectedDepartment) {
      filter.department = selectedDepartment;
    }
    if (selectedTimeSlots.length > 0) {
      filter.availableAt = selectedTimeSlots;
    }

    const query = stringifyMemberFilter(filter);
    openBubble(`shift-puzzle/members${query}`, 'root');
  };

  const hasSelection = selectedDepartment || selectedTimeSlots.length > 0;

  // dayTypeごとにグループ化
  const slotsByDayType = timeSlots.reduce((acc, slot) => {
    if (!acc[slot.dayType]) {
      acc[slot.dayType] = [];
    }
    acc[slot.dayType].push(slot);
    return acc;
  }, {} as Record<DayType, ReturnType<typeof createDefaultTimeSlots>>);

  const dayTypes = DAY_TYPE_ORDER.filter((dt) => slotsByDayType[dt]);

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

      {/* 参加可能日程フィルター */}
      <section className="e-section">
        <h4>参加可能日程（AND条件）</h4>
        <p className="e-hint">選択した全ての時間帯に参加可能な局員を検索</p>
        <div className="e-timeslots">
          {dayTypes.map((dayType) => {
            const slots = slotsByDayType[dayType];
            const allSelected = slots.every((s) => selectedTimeSlots.includes(s.id));
            const someSelected = slots.some((s) => selectedTimeSlots.includes(s.id));

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
                <div className="e-slots">
                  {slots.map((slot) => (
                    <FormControlLabel
                      key={slot.id}
                      control={
                        <Checkbox
                          checked={selectedTimeSlots.includes(slot.id)}
                          onChange={() => handleTimeSlotToggle(slot.id)}
                          size="small"
                        />
                      }
                      label={
                        <span>
                          {slot.label.split(' ').slice(1).join(' ')}
                        </span>
                      }
                      className="e-slot-item"
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

  .e-timeslots {
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

    .e-slots {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-left: 24px;
      margin-top: 4px;
    }

    .e-slot-item {
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
