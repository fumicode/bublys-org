'use client';

import { FC } from "react";
import styled from "styled-components";
import { Button } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditNoteIcon from "@mui/icons-material/EditNote";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { Staff } from "../domain/index.js";

/** その月の希望の状態。未入力 → 下書き → 提出済み と進む */
export type ShiftWishStatus = "empty" | "draft" | "submitted";

/** 募集中の月1つぶんの状況（自分の希望がどこまで進んでいるか） */
export type ShiftWishMonthSummary = {
  year: number;
  /** 1-12 */
  month: number;
  status: ShiftWishStatus;
  /** 何日ぶん希望を入れたか */
  filledDays: number;
  /** 提出した時刻（ISO文字列）。未提出は null */
  submittedAt: string | null;
};

type ShiftWishListViewProps = {
  staffList: Staff[];
  /** この端末で選ばれている「自分」。未設定なら人を選ぶところから始まる */
  currentStaff: Staff | null;
  onSelectStaff: (staffId: string) => void;
  /** 「自分」の選択を解除して選び直す */
  onClearStaff: () => void;
  /** 希望を出す月（勤務表がある月）と、自分の進み具合 */
  months: ShiftWishMonthSummary[];
  onOpenWish: (year: number, month: number) => void;
};

const STATUS_LABEL: Record<ShiftWishStatus, string> = {
  empty: "未入力",
  draft: "下書き",
  submitted: "提出済み",
};

const StatusIcon: FC<{ status: ShiftWishStatus }> = ({ status }) => {
  if (status === "submitted") return <CheckCircleIcon fontSize="small" />;
  if (status === "draft") return <EditNoteIcon fontSize="small" />;
  return <RadioButtonUncheckedIcon fontSize="small" />;
};

/** 提出時刻を「5/20 18:03」のように短く出す */
const submittedLabel = (iso: string): string => {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return `${at.getMonth() + 1}/${at.getDate()} ${String(at.getHours()).padStart(2, "0")}:${String(
    at.getMinutes()
  ).padStart(2, "0")}`;
};

/**
 * スタッフ本人のシフト希望の入口。
 *
 * 「自分は誰か」をこの端末で1回選び、あとは募集中の月（＝勤務表がある月）が並ぶだけ。
 * 各月のカードから、その月の希望入力表を開く。
 */
export const ShiftWishListView: FC<ShiftWishListViewProps> = ({
  staffList,
  currentStaff,
  onSelectStaff,
  onClearStaff,
  months,
  onOpenWish,
}) => {
  if (!currentStaff) {
    return (
      <StyledContainer>
        <div className="e-header">
          <h3>シフト希望</h3>
          <p className="e-note">
            まず「自分」を選んでください。この端末に覚えておきます（あとから変更できます）。
          </p>
        </div>
        <ul className="e-staffs">
          {staffList.length === 0 ? (
            <li className="e-empty">スタッフがいません</li>
          ) : (
            staffList.map((staff) => (
              <li key={staff.id}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => onSelectStaff(staff.id)}
                >
                  {staff.name}
                </Button>
              </li>
            ))
          )}
        </ul>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>
          シフト希望 <span className="e-sub">{currentStaff.name} さん</span>
        </h3>
        <p className="e-note">
          希望を出す月を選んで入力します。提出すると内容が確定します（取り下げれば直せます）。
        </p>
      </div>

      <ul className="e-months">
        {months.length === 0 ? (
          <li className="e-empty">
            希望を出せる月がありません（勤務表が作られると、その月がここに並びます）
          </li>
        ) : (
          months.map((m) => (
            <li key={`${m.year}-${m.month}`} className={`e-month is-${m.status}`}>
              <div className="e-month-head">
                <span className="e-status-icon">
                  <StatusIcon status={m.status} />
                </span>
                <span className="e-month-label">
                  {m.year}年{m.month}月
                </span>
              </div>
              <div className="e-month-status">
                {STATUS_LABEL[m.status]}
                {m.status === "draft" && `・${m.filledDays}日ぶん`}
                {m.status === "submitted" &&
                  m.submittedAt &&
                  `・${submittedLabel(m.submittedAt)}`}
              </div>
              <Button
                size="small"
                variant={m.status === "submitted" ? "text" : "contained"}
                startIcon={<EditIcon fontSize="small" />}
                onClick={() => onOpenWish(m.year, m.month)}
              >
                {m.status === "submitted" ? "内容を見る" : "入力する"}
              </Button>
            </li>
          ))
        )}
      </ul>

      <div className="e-footer">
        <Button size="small" onClick={onClearStaff}>
          自分を選び直す
        </Button>
      </div>
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 8px;
  min-width: 260px;

  .e-header {
    margin-bottom: 8px;
    h3 {
      margin: 0;
    }
    .e-sub {
      font-weight: normal;
      font-size: 0.8em;
      color: #777;
    }
    .e-note {
      margin: 4px 0 0;
      font-size: 0.78em;
      color: #888;
    }
  }

  .e-staffs {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .e-months {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .e-month {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "head button"
      "status button";
    align-items: center;
    gap: 0 8px;
    padding: 6px 8px;
    border: 1px solid #eee;
    border-radius: 4px;

    &.is-submitted {
      background: #f1f8e9;
      border-color: #dcedc8;
    }
    &.is-draft {
      background: #fffdf5;
      border-color: #f2ead6;
    }
  }

  .e-month-head {
    grid-area: head;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .e-status-icon {
    display: inline-flex;
    color: #9e9e9e;
    .is-submitted & {
      color: #558b2f;
    }
    .is-draft & {
      color: #c8a415;
    }
  }
  .e-month-label {
    font-weight: bold;
  }
  .e-month-status {
    grid-area: status;
    font-size: 0.78em;
    color: #888;
  }
  .e-month button {
    grid-area: button;
  }

  .e-empty {
    color: #999;
    font-size: 0.85em;
  }

  .e-footer {
    margin-top: 8px;
    border-top: 1px solid #f0f0f0;
    padding-top: 4px;
  }
`;
