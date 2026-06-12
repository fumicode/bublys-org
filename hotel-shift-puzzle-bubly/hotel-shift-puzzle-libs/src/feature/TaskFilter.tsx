'use client';

import { FC, useState, useContext, useMemo } from "react";
import styled from "styled-components";
import { Button, Checkbox, FormControlLabel } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { createDefaultShifts, DAY_TYPE_ORDER } from "../data/sampleData.js";
import { type TaskFilterCriteria, stringifyTaskFilter } from "./TaskCollection.js";

// 6:00〜24:00 を30分刻み
const TIME_OPTIONS = Array.from({ length: 37 }, (_, i) => {
  const min = 360 + i * 30;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

type TaskFilterProps = {
  initialFilter?: TaskFilterCriteria;
};

export const TaskFilter: FC<TaskFilterProps> = ({ initialFilter }) => {
  const { openBubble } = useContext(BubblesContext);

  const shifts = useMemo(() => createDefaultShifts(), []);

  // シフトマスターから所属局一覧を導出
  const departments = useMemo(() => {
    const depts = new Set<string>();
    shifts.forEach((s) => { if (s.responsibleDepartment) depts.add(s.responsibleDepartment); });
    return [...depts].sort();
  }, [shifts]);

  const [selectedDayTypes, setSelectedDayTypes] = useState<string[]>(
    initialFilter?.dayTypes ?? [],
  );
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(
    initialFilter?.departments ?? [],
  );
  const [startTime, setStartTime] = useState<string>(
    initialFilter?.timeRange?.startTime ?? '',
  );
  const [endTime, setEndTime] = useState<string>(
    initialFilter?.timeRange?.endTime ?? '',
  );

  const hasTimeRange = startTime !== '' && endTime !== '';

  const toggleDayType = (dt: string) => {
    setSelectedDayTypes((prev) =>
      prev.includes(dt) ? prev.filter((d) => d !== dt) : [...prev, dt],
    );
  };

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept],
    );
  };

  const handleSearch = () => {
    const filter: TaskFilterCriteria = {};
    if (selectedDayTypes.length > 0) filter.dayTypes = selectedDayTypes;
    if (selectedDepartments.length > 0) filter.departments = selectedDepartments;
    if (hasTimeRange) filter.timeRange = { startTime, endTime };
    const query = stringifyTaskFilter(filter);
    openBubble(`hotel-shift-puzzle/tasks${query}`, 'root');
  };

  const handleReset = () => {
    openBubble('hotel-shift-puzzle/tasks', 'root');
  };

  return (
    <StyledContainer>
      <h3>タスク絞り込み検索</h3>

      {/* 日程フィルター */}
      <section className="e-section">
        <h4>日程</h4>
        <div className="e-check-list">
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedDayTypes.length === 0}
                onChange={() => setSelectedDayTypes([])}
                size="small"
              />
            }
            label="すべて"
          />
          {DAY_TYPE_ORDER.map((dt) => (
            <FormControlLabel
              key={dt}
              control={
                <Checkbox
                  checked={selectedDayTypes.includes(dt)}
                  onChange={() => toggleDayType(dt)}
                  size="small"
                />
              }
              label={dt}
            />
          ))}
        </div>
      </section>

      {/* 所属局フィルター */}
      <section className="e-section">
        <h4>所属局</h4>
        <div className="e-check-list">
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

      {/* 時間帯フィルター */}
      <section className="e-section">
        <h4>時間帯</h4>
        <p className="e-hint">シフトがこの時間帯とオーバーラップするタスクを抽出</p>
        <div className="e-time-range">
          <select
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="e-time-select"
          >
            <option value="">指定しない</option>
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <span className="e-sep">〜</span>
          <select
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="e-time-select"
            disabled={!startTime}
          >
            <option value="">指定しない</option>
            {TIME_OPTIONS.filter((t) => !startTime || t > startTime).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </section>

      {/* ボタン */}
      <div className="e-actions">
        <Button variant="outlined" size="small" onClick={handleReset}>
          リセット
        </Button>
        <Button
          variant="contained"
          size="medium"
          startIcon={<SearchIcon />}
          onClick={handleSearch}
          sx={{ flex: 1, textTransform: 'none' }}
        >
          検索
        </Button>
      </div>
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 16px;
  overflow-y: auto;

  h3 {
    margin: 0 0 16px 0;
    font-size: 1.05em;
  }

  .e-section {
    margin-bottom: 20px;

    h4 {
      margin: 0 0 8px 0;
      font-size: 0.9em;
      color: #333;
      border-bottom: 1px solid #eee;
      padding-bottom: 4px;
    }

    .e-hint {
      margin: 0 0 8px 0;
      font-size: 0.8em;
      color: #666;
    }
  }

  .e-check-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0;

    .MuiFormControlLabel-root {
      margin-right: 8px;

      .MuiFormControlLabel-label {
        font-size: 0.88em;
      }
    }
  }

  .e-time-range {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .e-time-select {
    padding: 5px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.88em;
    outline: none;

    &:focus {
      border-color: #1976d2;
    }

    &:disabled {
      background: #f5f5f5;
      color: #aaa;
    }
  }

  .e-sep {
    color: #666;
  }

  .e-actions {
    display: flex;
    gap: 8px;
    margin-top: 24px;

    button {
      text-transform: none;
    }
  }
`;
