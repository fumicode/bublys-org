'use client';

import { FC, useState, useContext } from "react";
import styled from "styled-components";
import { Button, ToggleButton, ToggleButtonGroup, Checkbox, FormControlLabel } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { BubblesContext } from "../../bubble-ui/BubblesUI/domain/BubblesContext";
import { TimeSlot_時間帯 } from "../domain";
import { StaffFilter as StaffFilterType, stringifyStaffFilter } from "./StaffCollection";

type StaffFilterProps = {
  // 初期フィルター（URLから復元した場合など）
  initialFilter?: StaffFilterType;
};

export const StaffFilter: FC<StaffFilterProps> = ({ initialFilter }) => {
  const { openBubble } = useContext(BubblesContext);
  const timeSlots = TimeSlot_時間帯.createDefaultTimeSlots();

  // スキルフィルターの選択状態
  const getInitialSkillFilters = (): string[] => {
    const selected: string[] = [];
    if (initialFilter?.pc) selected.push('pc');
    if (initialFilter?.zoom) selected.push('zoom');
    if (initialFilter?.english) selected.push('english');
    if (initialFilter?.eventExperience) selected.push('eventExperience');
    return selected;
  };

  const [selectedSkills, setSelectedSkills] = useState<string[]>(getInitialSkillFilters);

  // 時間帯フィルターの選択状態
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>(
    initialFilter?.availableAt ?? []
  );

  const handleSkillToggle = (_event: React.MouseEvent<HTMLElement>, newSkills: string[]) => {
    setSelectedSkills(newSkills);
  };

  const handleTimeSlotToggle = (slotId: string) => {
    setSelectedTimeSlots((prev) =>
      prev.includes(slotId)
        ? prev.filter((id) => id !== slotId)
        : [...prev, slotId]
    );
  };

  // 日付ごとに「全選択」
  const handleSelectDate = (date: string) => {
    const slotsForDate = timeSlots.filter((s) => s.date === date).map((s) => s.id);
    const allSelected = slotsForDate.every((id) => selectedTimeSlots.includes(id));

    if (allSelected) {
      // 全解除
      setSelectedTimeSlots((prev) => prev.filter((id) => !slotsForDate.includes(id)));
    } else {
      // 全選択
      setSelectedTimeSlots((prev) => [...new Set([...prev, ...slotsForDate])]);
    }
  };

  // 検索ボタンクリック
  const handleSearch = () => {
    const filter: StaffFilterType = {};

    if (selectedSkills.includes('pc')) {
      filter.pc = { level: 'intermediate', operator: '>=' };
    }
    if (selectedSkills.includes('zoom')) {
      filter.zoom = { level: 'intermediate', operator: '>=' };
    }
    if (selectedSkills.includes('english')) {
      filter.english = true;
    }
    if (selectedSkills.includes('eventExperience')) {
      filter.eventExperience = true;
    }
    if (selectedTimeSlots.length > 0) {
      filter.availableAt = selectedTimeSlots;
    }

    const query = stringifyStaffFilter(filter);
    openBubble(`gakkai-shift/staffs${query}`, 'root');
  };

  const hasSelection = selectedSkills.length > 0 || selectedTimeSlots.length > 0;

  // 日付ごとにグループ化
  const slotsByDate = timeSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot_時間帯[]>);

  const dates = Object.keys(slotsByDate).sort();

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${month}/${day}(${weekday})`;
  };

  return (
    <StyledContainer>
      <h3>スタッフ絞り込み検索</h3>

      {/* スキルフィルター */}
      <section className="e-section">
        <h4>スキル条件</h4>
        <ToggleButtonGroup
          value={selectedSkills}
          onChange={handleSkillToggle}
          size="small"
          className="e-skill-toggles"
        >
          <ToggleButton value="pc">PC中級+</ToggleButton>
          <ToggleButton value="zoom">Zoom中級+</ToggleButton>
          <ToggleButton value="english">英語可</ToggleButton>
          <ToggleButton value="eventExperience">経験あり</ToggleButton>
        </ToggleButtonGroup>
      </section>

      {/* 参加可能日程フィルター */}
      <section className="e-section">
        <h4>参加可能日程（AND条件）</h4>
        <p className="e-hint">選択した全ての時間帯に参加可能なスタッフを検索</p>
        <div className="e-timeslots">
          {dates.map((date) => {
            const slots = slotsByDate[date];
            const allSelected = slots.every((s) => selectedTimeSlots.includes(s.id));
            const someSelected = slots.some((s) => selectedTimeSlots.includes(s.id));

            return (
              <div key={date} className="e-date-group">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={() => handleSelectDate(date)}
                      size="small"
                    />
                  }
                  label={<span className="e-date-label">{formatDate(date)}</span>}
                  className="e-date-header"
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
                        <span className={slot.isOrientation ? 'e-orientation' : ''}>
                          {TimeSlot_時間帯.getPeriodLabel(slot.period)}
                          {slot.isOrientation && ' (オリエン)'}
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

  .e-skill-toggles {
    flex-wrap: wrap;

    .MuiToggleButton-root {
      font-size: 0.8em;
      padding: 6px 12px;
      text-transform: none;

      &.Mui-selected {
        background-color: #1976d2;
        color: white;

        &:hover {
          background-color: #1565c0;
        }
      }
    }
  }

  .e-timeslots {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .e-date-group {
    padding: 8px;
    background-color: #f5f5f5;
    border-radius: 4px;

    .e-date-header {
      margin: 0;

      .e-date-label {
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

      .e-orientation {
        color: #e65100;
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
