'use client';

import { FC, useState } from "react";
import styled from "styled-components";
import { Staff, ScheduleReport, type CompromiseEntry, type BusyDayEntry } from "../domain/index.js";
import PersonIcon from "@mui/icons-material/Person";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import AssessmentIcon from "@mui/icons-material/Assessment";
import HandshakeIcon from "@mui/icons-material/Handshake";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import { IconButton, TextField } from "@mui/material";
import { ObjectView } from "@bublys-org/bubbles-ui";

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
  /** 指定した年月のシフト希望エディタを開く */
  onOpenWish?: (year: number, month: number) => void;
  /** このスタッフに関する参照レポートの評価（貢献度スコア・妥協/繁忙日・配慮メモ）。読み取り専用 */
  linkedReportSummaries?: StaffLinkedReportSummary[];
};

export const StaffDetailView: FC<StaffDetailViewProps> = ({
  staff,
  onChangeDepartment,
  onOpenWish,
  linkedReportSummaries = [],
}) => {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(6);
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

      {onOpenWish && (
        <section className="e-section">
          <h4>シフト希望</h4>
          <div className="e-wish">
            <label>
              年
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </label>
            <label>
              月
              <input
                type="number"
                min={1}
                max={12}
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              />
            </label>
            <button type="button" onClick={() => onOpenWish(year, month)}>
              この月の希望を編集
            </button>
          </div>
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
                <div className="e-linked-report-counts">
                  {compromises.length > 0 && (
                    <span className="e-count-item">
                      <HandshakeIcon fontSize="inherit" className="e-icon-compromise" />
                      妥協 {compromises.length}件
                    </span>
                  )}
                  {busyDays.length > 0 && (
                    <span className="e-count-item">
                      <LocalFireDepartmentIcon fontSize="inherit" className="e-icon-busy" />
                      繁忙日対応 {busyDays.length}件
                    </span>
                  )}
                </div>
                {note && <p className="e-linked-report-note">{note}</p>}
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

  .e-wish {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    label {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.85em;
      color: #555;
    }
    input {
      width: 64px;
      padding: 2px 4px;
    }
    button {
      border: 1px solid #cfd8dc;
      border-radius: 6px;
      background: #fff;
      color: #37474f;
      font-size: 0.85em;
      padding: 4px 10px;
      cursor: pointer;

      &:hover {
        background: #eceff1;
        border-color: #90a4ae;
      }
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

  .e-linked-report-counts {
    display: flex;
    gap: 12px;
    margin-top: 2px;
    font-size: 0.78em;
    color: #666;
  }

  .e-count-item {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }

  .e-icon-compromise {
    color: #6d4c41;
  }

  .e-icon-busy {
    color: #e64a19;
  }

  .e-linked-report-note {
    margin: 4px 0 0;
    font-size: 0.8em;
    color: #555;
    white-space: pre-wrap;
  }
`;
