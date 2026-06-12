'use client';

import { FC, useState, useContext, useMemo } from "react";
import styled from "styled-components";
import {
  Button,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { useAppSelector } from "@bublys-org/state-management";
import { selectHotelShiftPuzzleMemberList } from "../slice/index.js";
import { MemberFilterCriteria as MemberFilterType, stringifyMemberFilter } from "./MemberCollection.js";
import { type DayType } from "../domain/index.js";

const DAY_TYPES: DayType[] = ['準準備日', '準備日', '1日目', '2日目', '片付け日'];

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// 6:00〜24:00 を30分刻み
const TIME_OPTIONS = Array.from({ length: 37 }, (_, i) => {
  const min = 360 + i * 30;
  return { label: minutesToTime(min), value: min };
});

type MemberFilterProps = {
  initialFilter?: MemberFilterType;
};

export const MemberFilter: FC<MemberFilterProps> = ({ initialFilter }) => {
  const { openBubble } = useContext(BubblesContext);
  const memberList = useAppSelector(selectHotelShiftPuzzleMemberList);

  const departments = useMemo(
    () => [...new Set(memberList.map(m => m.department))].sort(),
    [memberList],
  );

  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(
    initialFilter?.departments ?? [],
  );
  const [memberType, setMemberType] = useState<'all' | 'new' | 'veteran'>(
    initialFilter?.newMemberOnly ? 'new' : initialFilter?.veteranOnly ? 'veteran' : 'all',
  );
  const [availableAtDayType, setAvailableAtDayType] = useState<DayType | ''>(
    initialFilter?.availableAt?.dayType ?? '',
  );
  const [availableAtStart, setAvailableAtStart] = useState<number>(
    initialFilter?.availableAt?.startMinute ?? 600,
  );
  const [availableAtEnd, setAvailableAtEnd] = useState<number>(
    initialFilter?.availableAt?.endMinute ?? 840,
  );

  const hasSelection = selectedDepartments.length > 0 || memberType !== 'all' || availableAtDayType;

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const handleSearch = () => {
    const filter: MemberFilterType = {};
    if (selectedDepartments.length > 0) filter.departments = selectedDepartments;
    if (memberType === 'new') filter.newMemberOnly = true;
    if (memberType === 'veteran') filter.veteranOnly = true;
    if (availableAtDayType) {
      filter.availableAt = {
        dayType: availableAtDayType,
        startMinute: availableAtStart,
        endMinute: availableAtEnd,
      };
    }
    const query = stringifyMemberFilter(filter);
    openBubble(`hotel-shift-puzzle/members${query}`, 'root');
  };

  return (
    <StyledContainer>
      <h3>局員絞り込み検索</h3>

      {/* 所属局 */}
      <section className="e-section">
        <h4>所属局</h4>
        <div className="e-dept-list">
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedDepartments.length === 0}
                onChange={() => setSelectedDepartments([])}
                size="small"
              />
            }
            label="すべて"
          />
          {departments.map((dept) => (
            <FormControlLabel
              key={dept}
              control={
                <Checkbox
                  checked={selectedDepartments.includes(dept)}
                  onChange={() => toggleDepartment(dept)}
                  size="small"
                />
              }
              label={dept}
            />
          ))}
        </div>
      </section>

      {/* 新入生 / 経験者 */}
      <section className="e-section">
        <h4>新入生 / 経験者</h4>
        <div className="e-dept-list">
          <FormControlLabel
            control={
              <Checkbox
                checked={memberType === 'all'}
                onChange={() => setMemberType('all')}
                size="small"
              />
            }
            label="すべて"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={memberType === 'new'}
                onChange={() => setMemberType('new')}
                size="small"
              />
            }
            label="新入生のみ"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={memberType === 'veteran'}
                onChange={() => setMemberType('veteran')}
                size="small"
              />
            }
            label="経験者のみ"
          />
        </div>
      </section>

      {/* 参加可能時間帯 */}
      <section className="e-section">
        <h4>参加可能時間帯</h4>
        <p className="e-hint">指定した時間帯を完全にカバーできる局員を検索</p>
        <div className="e-time-filter">
          <FormControl size="small" className="e-daytype-select">
            <InputLabel>日付種別</InputLabel>
            <Select
              value={availableAtDayType}
              label="日付種別"
              onChange={(e) => setAvailableAtDayType(e.target.value as DayType | '')}
            >
              <MenuItem value=""><em>指定しない</em></MenuItem>
              {DAY_TYPES.map((dt) => (
                <MenuItem key={dt} value={dt}>{dt}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {availableAtDayType && (
            <div className="e-time-range">
              <FormControl size="small" className="e-time-select">
                <InputLabel>開始</InputLabel>
                <Select
                  value={availableAtStart}
                  label="開始"
                  onChange={(e) => setAvailableAtStart(Number(e.target.value))}
                >
                  {TIME_OPTIONS.map(({ label, value }) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <span className="e-range-sep">〜</span>
              <FormControl size="small" className="e-time-select">
                <InputLabel>終了</InputLabel>
                <Select
                  value={availableAtEnd}
                  label="終了"
                  onChange={(e) => setAvailableAtEnd(Number(e.target.value))}
                >
                  {TIME_OPTIONS.map(({ label, value }) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          )}
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

  .e-time-filter {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .e-daytype-select {
    min-width: 140px;
  }

  .e-time-range {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .e-time-select {
    min-width: 100px;
  }

  .e-range-sep {
    font-size: 1em;
    color: #555;
  }

  .e-actions {
    margin-top: 20px;

    button {
      text-transform: none;
      font-size: 1em;
    }
  }
`;
