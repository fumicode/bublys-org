'use client';

import { FC, useState } from "react";
import styled from "styled-components";
import { Staff, ScheduleReport, WorkingDay, type CompromiseEntry, type BusyDayEntry } from "../domain/index.js";
import PersonIcon from "@mui/icons-material/Person";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import AssessmentIcon from "@mui/icons-material/Assessment";
import HandshakeIcon from "@mui/icons-material/Handshake";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import { IconButton, TextField } from "@mui/material";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { ShiftWishStatusIcon } from "./ShiftWishStatusIcon.js";
import {
  collectedAtLabel,
  WISH_STATUS_LABEL,
  type ShiftWishMonthSummary,
} from "./shiftWishStatus.js";
import { STAFF_SHIFT_WISH_SHEET_VIEW_TYPE } from "./viewObjectTypes.js";

/** 参照レポート（紐づけ済みの ScheduleReport）のうち、このスタッフに関する部分だけの読み取り専用サマリ */
export type StaffLinkedReportSummary = {
  report: ScheduleReport;
  score: number;
  compromises: CompromiseEntry[];
  busyDays: BusyDayEntry[];
  note: string;
};

type StaffDetailViewProps = {
  staff: Staff;
  /** 部署を変更する */
  onChangeDepartment?: (department: string) => void;
  /** 希望を集める月（勤務表がある月）と、この人の回収状況 */
  shiftWishMonths?: ShiftWishMonthSummary[];
  /**
   * この人の希望入力表バブルの URL。渡すと「シフト希望」欄が出る。ObjectView に渡すだけで
   * ダブルクリック展開・ドラッグ・data-url は ObjectView が担う（URL スキームは app 層）。
   */
  shiftWishUrl?: (year: number, month: number) => string;
  /** このスタッフに関する参照レポートの評価（貢献度スコア・譲歩/繁忙日・配慮メモ）。読み取り専用 */
  linkedReportSummaries?: StaffLinkedReportSummary[];
};

export const StaffDetailView: FC<StaffDetailViewProps> = ({
  staff,
  onChangeDepartment,
  shiftWishMonths = [],
  shiftWishUrl,
  linkedReportSummaries = [],
}) => {
  const [editingDept, setEditingDept] = useState(false);
  const [deptValue, setDeptValue] = useState("");

  const startEditDept = () => {
    setDeptValue(staff.department);
    setEditingDept(true);
  };

  const commitDept = () => {
    onChangeDepartment?.(deptValue.trim());
    setEditingDept(false);
  };

  const cancelDept = () => {
    setEditingDept(false);
  };

  const dayLabel = (dayKey: string) => WorkingDay.fromKey(dayKey).label;
  // 月単位の違反（休日不足など）は dayKeys が空。1日なら単日、複数日なら範囲で示す。
  const dayRangeLabel = (dayKeys: string[]) => {
    if (dayKeys.length === 0) return null;
    const first = dayLabel(dayKeys[0]);
    const last = dayLabel(dayKeys[dayKeys.length - 1]);
    return dayKeys.length === 1 ? first : `${first}〜${last}`;
  };

  return (
    <StyledStaffDetail>
      <div className="e-header">
        <PersonIcon className="e-avatar" />
        <div className="e-title">
          {/* ObjectView: 詳細自身もダブルクリック展開 / ドラッグでポケットへ */}
          <ObjectView
            object={staff}
            label={staff.name}
            draggable={true}
            openingPosition="bubble-side-left"
          >
            <h3 className="e-name">{staff.name}</h3>
          </ObjectView>
        </div>
      </div>

      <section className="e-section">
        <h4>基本情報</h4>
        <dl className="e-dl">
          <dt>ID</dt>
          <dd>{staff.id}</dd>
          <dt>名前</dt>
          <dd>{staff.name}</dd>
          <dt>部署</dt>
          <dd className="e-dept-row">
            {editingDept ? (
              <>
                <TextField
                  variant="standard"
                  size="small"
                  autoFocus
                  value={deptValue}
                  onChange={(e) => setDeptValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitDept();
                    if (e.key === "Escape") cancelDept();
                  }}
                  sx={{ flex: 1 }}
                />
                <IconButton size="small" aria-label="保存" onClick={commitDept}>
                  <CheckIcon fontSize="small" sx={{ color: "#2e7d32" }} />
                </IconButton>
                <IconButton size="small" aria-label="キャンセル" onClick={cancelDept}>
                  <CloseIcon fontSize="small" sx={{ color: "#999" }} />
                </IconButton>
              </>
            ) : (
              <>
                <span className="e-dept-label">
                  {staff.department || "（未設定）"}
                </span>
                {onChangeDepartment && (
                  <IconButton
                    size="small"
                    aria-label="部署を編集"
                    onClick={startEditDept}
                    sx={{ color: "#b0b0b0", "&:hover": { color: "#1976d2" } }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
              </>
            )}
          </dd>
        </dl>
      </section>

      {shiftWishUrl && (
        <section className="e-section">
          <h4>シフト希望</h4>
          {/* 対象の月は「勤務表がある月」で決まる（＝いま組もうとしている月）。
              年月を手で入れさせず、開ける月だけを並べる。 */}
          <ul className="e-wish-months">
            {shiftWishMonths.length === 0 ? (
              <li className="e-empty">
                希望を集める月がありません（勤務表が作られると、その月がここに並びます）
              </li>
            ) : (
              shiftWishMonths.map((m) => (
                <li key={`${m.year}-${m.month}`}>
                  {/* ObjectView: ダブルクリックでその月の入力表 / ドラッグでポケットへ */}
                  <ObjectView
                    type={STAFF_SHIFT_WISH_SHEET_VIEW_TYPE}
                    url={shiftWishUrl(m.year, m.month)}
                    label={`${staff.name}のシフト希望（${m.year}年${m.month}月）`}
                    openingPosition="bubble-side-right"
                    fullWidth
                  >
                    <span
                      className={`e-wish-month is-${m.status}`}
                      title={`ダブルクリックで${m.year}年${m.month}月の入力表を開く`}
                    >
                      <span className="e-status-icon">
                        <ShiftWishStatusIcon status={m.status} />
                      </span>
                      <span className="e-wish-month-label">
                        {m.year}年{m.month}月
                      </span>
                      <span className="e-wish-month-status">
                        {WISH_STATUS_LABEL[m.status]}
                        {m.status === "draft" && `・${m.filledDays}日ぶん`}
                        {m.status === "collected" &&
                          m.collectedAt &&
                          `・${collectedAtLabel(m.collectedAt)}`}
                      </span>
                    </span>
                  </ObjectView>
                </li>
              ))
            )}
          </ul>
        </section>
      )}

      {linkedReportSummaries.length > 0 && (
        <section className="e-section">
          <h4>参照レポートでの評価</h4>
          <ul className="e-linked-reports">
            {linkedReportSummaries.map(({ report, score, compromises, busyDays, note }) => (
              <li key={report.id} className="e-linked-report">
                <div className="e-linked-report-head">
                  <ObjectView
                    object={report}
                    label={report.title}
                    draggable={false}
                    openingPosition="bubble-side-right"
                  >
                    <span className="e-linked-report-title">
                      <AssessmentIcon fontSize="inherit" className="e-icon-report" />
                      {report.title}
                    </span>
                  </ObjectView>
                  <span className="e-linked-report-score">スコア {score}</span>
                </div>
                {compromises.length > 0 && (
                  <div className="e-detail-block">
                    <span className="e-detail-label">
                      <HandshakeIcon fontSize="inherit" className="e-icon-compromise" /> 譲歩
                    </span>
                    <ul className="e-compromise-days">
                      {compromises.map((c, i) => {
                        const range = dayRangeLabel(c.dayKeys);
                        return (
                          <li key={i}>
                            <span className="e-compromise-tag">{c.label}</span>
                            {range && <span className="e-compromise-range">{range}: </span>}
                            {c.message}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {busyDays.length > 0 && (
                  <div className="e-detail-block">
                    <span className="e-detail-label">
                      <LocalFireDepartmentIcon fontSize="inherit" className="e-icon-busy" /> 繁忙日対応
                    </span>
                    <ul className="e-busy-days">
                      {busyDays.map((day) => (
                        <li key={day.dayKey}>
                          {dayLabel(day.dayKey)}（必要{day.requiredCount}人）
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {note && (
                  <div className="e-detail-block">
                    <span className="e-detail-label">配慮メモ</span>
                    <p className="e-linked-report-note">{note}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </StyledStaffDetail>
  );
};

const StyledStaffDetail = styled.div`
  padding: 16px;

  .e-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #eee;
  }

  .e-avatar {
    font-size: 48px;
    color: #666;
  }

  .e-title {
    flex: 1;
  }

  .e-name {
    margin: 0;
    font-size: 1.25em;
  }

  .e-section {
    margin-bottom: 16px;

    h4 {
      margin: 0 0 8px 0;
      font-size: 0.9em;
      color: #666;
      border-bottom: 1px solid #eee;
      padding-bottom: 4px;
    }
  }

  .e-dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 12px;
    margin: 0;

    dt {
      color: #666;
      font-size: 0.9em;
    }

    dd {
      margin: 0;
    }

    .e-dept-row {
      display: flex;
      align-items: center;
      gap: 4px;

      .e-dept-label {
        flex: 1;
        color: #3949ab;
      }
    }
  }

  .e-wish-months {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .e-empty {
      color: #999;
      font-size: 0.85em;
    }
  }

  /* ObjectView は <span role="button"> を描くので、行の体裁は span 側で作る */
  .e-wish-month {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    border: 1px solid #cfd8dc;
    border-radius: 6px;
    background: #fff;
    color: #37474f;
    font-size: 0.85em;
    padding: 4px 10px;
    cursor: pointer;
    text-align: left;

    &:hover {
      background: #eceff1;
      border-color: #90a4ae;
    }
    &.is-collected {
      background: #f1f8e9;
      border-color: #dcedc8;
    }
    &.is-draft {
      background: #fffdf5;
      border-color: #f2ead6;
    }

    .e-status-icon {
      display: inline-flex;
      color: #9e9e9e;
    }
    &.is-collected .e-status-icon {
      color: #558b2f;
    }
    &.is-draft .e-status-icon {
      color: #c8a415;
    }
    .e-wish-month-label {
      font-weight: bold;
    }
    .e-wish-month-status {
      margin-left: auto;
      font-size: 0.9em;
      color: #888;
    }
  }

  .e-linked-reports {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .e-linked-report {
    padding: 6px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }
  }

  .e-linked-report-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .e-linked-report-title {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 0.85em;
    font-weight: bold;
    color: #8d6e00;
    cursor: pointer;
  }

  .e-icon-report {
    color: #f9a825;
  }

  .e-linked-report-score {
    margin-left: auto;
    font-size: 0.8em;
    font-weight: bold;
    color: #555;
    flex-shrink: 0;
  }

  .e-icon-compromise {
    color: #6d4c41;
  }

  .e-icon-busy {
    color: #e64a19;
  }

  .e-detail-block {
    margin-top: 6px;
  }

  .e-detail-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.78em;
    font-weight: bold;
    color: #666;
    margin-bottom: 2px;
  }

  .e-compromise-days,
  .e-busy-days {
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 0.8em;
    color: #555;

    li {
      padding: 2px 0;
    }
  }

  .e-compromise-tag {
    display: inline-block;
    border-radius: 4px;
    background: #efebe9;
    color: #6d4c41;
    font-size: 0.85em;
    padding: 0 5px;
    margin-right: 4px;
  }
  .e-compromise-range {
    color: #888;
  }

  .e-linked-report-note {
    margin: 0;
    font-size: 0.8em;
    color: #555;
    white-space: pre-wrap;
  }
`;
