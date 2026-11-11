'use client';

import { FC, useMemo, useState } from "react";
import styled from "styled-components";
import { Button, IconButton, MenuItem, TextField } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import { ObjectView } from "@bublys-org/bubbles-ui";
import {
  MonthlyStaffSchedule,
  type SchedulePeriod,
  type Store,
  type WorkingDay,
} from "../domain/index.js";

type ScheduleListViewProps = {
  schedules: MonthlyStaffSchedule[];
  /** その月の確定版を持っている勤務表（🏁 を出す） */
  confirmedScheduleIds?: ReadonlySet<string>;
  /** 取り込んでいない前月の確定版がある勤務表（「新しい確定版あり」を添える） */
  pendingScheduleIds?: ReadonlySet<string>;
  /** 勤務表を作れる店舗（記録された店舗と、記録が無いが勤務表が指している店舗） */
  stores: readonly Store[];
  /** storeId → 表示名 */
  storeNameOf?: (storeId: string) => string;
  /** 今日（期の選択肢の真ん中） */
  today: WorkingDay;
  onCreate: (params: { storeId: string; period: SchedulePeriod }) => void;
  onRemove: (id: string) => void;
};

/** 期の選択肢：今日を含む期の前3期〜後12期。初期値は次の期（ふつうは次の期の勤務表を作る） */
const PERIODS_BEFORE = 3;
const PERIODS_AFTER = 12;

export const ScheduleListView: FC<ScheduleListViewProps> = ({
  schedules,
  confirmedScheduleIds,
  pendingScheduleIds,
  stores,
  storeNameOf,
  today,
  onCreate,
  onRemove,
}) => {
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const store = stores.find((s) => s.id === storeId) ?? stores[0];
  // 期の選択肢は店舗の区切り方が出す（暦月なら月、4週なら起算日から数えた期）
  const periods = useMemo(
    () => (store ? store.periodRule.periodsAround(today, PERIODS_BEFORE, PERIODS_AFTER) : []),
    [store, today]
  );
  const [periodKey, setPeriodKey] = useState<string | undefined>(undefined);
  const period =
    periods.find((p) => p.key === periodKey) ?? periods[PERIODS_BEFORE + 1] ?? periods[0];

  const handleCreate = () => {
    if (store && period) onCreate({ storeId: store.id, period });
  };

  return (
    <StyledContainer>
      <ul className="e-list">
        {schedules.length === 0 ? (
          <li className="e-empty">勤務表がありません</li>
        ) : (
          schedules.map((schedule) => (
            <li key={schedule.id} className="e-item">
              {/* ObjectView: ダブルクリックで勤務表グリッドを開く / ドラッグでポケットへ */}
              <ObjectView
                object={schedule}
                label={schedule.period.label}
                draggable={true}
                openingPosition="bubble-side-right"
                fullWidth={true}
              >
                <div className="e-content">
                  <CalendarMonthIcon fontSize="small" className="e-icon" />
                  <div className="e-text">
                    <div className="e-title">
                      {schedule.period.label}
                      {confirmedScheduleIds?.has(schedule.id) && (
                        <span className="e-confirmed" title="この月の確定版を持っています">
                          🏁 確定版
                        </span>
                      )}
                    </div>
                    <div className="e-meta">
                      {storeNameOf?.(schedule.storeId) ?? schedule.storeId} ・{" "}
                      {schedule.assignments.length}件の割当
                    </div>
                    {(schedule.precedingTail?.lastDay || pendingScheduleIds?.has(schedule.id)) && (
                      <div className="e-inheritance">
                        {schedule.precedingTail?.lastDay && (
                          <span title="勤務表は、前月の確定版から引き継いで始まります">
                            ← {schedule.period.previous().label}の確定版から引き継ぎ
                          </span>
                        )}
                        {pendingScheduleIds?.has(schedule.id) && (
                          <span className="e-pending" title="勤務表を開くと取り込めます">
                            新しい確定版あり
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </ObjectView>
              <IconButton
                className="e-remove"
                size="small"
                aria-label="削除"
                onClick={() => onRemove(schedule.id)}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </li>
          ))
        )}
      </ul>

      <div className="e-create">
        <h4>新しい勤務表を作成</h4>
        <div className="e-fields">
          <TextField
            select
            className="e-store"
            variant="standard"
            size="small"
            label="店舗"
            value={store?.id ?? ""}
            onChange={(e) => {
              setStoreId(e.target.value);
              setPeriodKey(undefined);
            }}
          >
            {stores.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            className="e-period"
            variant="standard"
            size="small"
            label="期"
            value={period?.key ?? ""}
            onChange={(e) => setPeriodKey(e.target.value)}
          >
            {periods.map((p) => (
              <MenuItem key={p.key} value={p.key}>
                {p.label}
              </MenuItem>
            ))}
          </TextField>
        </div>
        <Button
          className="e-add"
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          disabled={!store || !period}
        >
          作成
        </Button>
      </div>
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 8px;
  min-width: 280px;

  .e-list {
    list-style: none;
    padding: 0;
    margin: 0 0 12px 0;
  }

  .e-empty {
    padding: 12px;
    text-align: center;
    color: #999;
  }

  .e-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    border-bottom: 1px solid #eee;

    &:last-child {
      border-bottom: none;
    }

    .e-content {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }
    .e-icon {
      color: #666;
      flex-shrink: 0;
    }
    .e-title {
      font-weight: bold;
    }
    .e-meta {
      font-size: 0.82em;
      color: #777;
    }
    .e-confirmed {
      margin-left: 6px;
      font-size: 0.75em;
      font-weight: normal;
      color: #8d6e00;
      border: 1px solid #ffe082;
      background: #fffde7;
      border-radius: 999px;
      padding: 0 6px;
    }
    .e-inheritance {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 0.78em;
      color: #8d6e00;
    }
    .e-pending {
      color: #e65100;
    }
    .e-remove {
      color: #b0b0b0;
      flex-shrink: 0;

      &:hover {
        color: #d32f2f;
      }
    }
  }

  .e-create {
    border-top: 1px solid #eee;
    padding-top: 8px;

    h4 {
      margin: 0 0 8px 0;
      font-size: 0.9em;
      color: #555;
    }

    .e-fields {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;

      .e-store {
        flex: 1;
        min-width: 100px;
      }
      .e-period {
        flex: 1;
        min-width: 140px;
      }
    }

    .e-add {
      text-transform: none;
    }
  }
`;
