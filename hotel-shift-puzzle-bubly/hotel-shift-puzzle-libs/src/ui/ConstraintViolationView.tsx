'use client';

import { FC } from "react";
import styled from "styled-components";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { ConstraintViolation } from "../domain/index.js";

type ConstraintViolationViewProps = {
  violation: ConstraintViolation;
  /** 違反スタッフの表示名（解決済み。無ければ staffId を出す） */
  staffName?: string;
};

/**
 * 制約違反の詳細表示（純粋）。
 * 誰の・どの連勤範囲が・どの制約に違反しているかを示す。
 */
export const ConstraintViolationView: FC<ConstraintViolationViewProps> = ({
  violation,
  staffName,
}) => {
  const days = violation.days;
  const first = days[0];
  const last = days[days.length - 1];

  return (
    <StyledWrap>
      <div className="e-head">
        <WarningAmberIcon className="e-icon" fontSize="small" />
        <h3>制約違反</h3>
      </div>

      <dl className="e-detail">
        <dt>スタッフ</dt>
        <dd>{staffName ?? violation.staffId}</dd>

        <dt>内容</dt>
        <dd className="e-message">{violation.message}</dd>

        <dt>範囲</dt>
        <dd>
          {first && last
            ? `${first.label} 〜 ${last.label}（${days.length}日間）`
            : "—"}
        </dd>
      </dl>

      <div className="e-days">
        {days.map((d) => (
          <span key={d.key} className="e-day">
            {d.label}
          </span>
        ))}
      </div>
    </StyledWrap>
  );
};

const StyledWrap = styled.div`
  min-width: 220px;

  .e-head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;

    .e-icon {
      color: #e53935;
    }
    h3 {
      margin: 0;
      color: #c62828;
    }
  }

  .e-detail {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 12px;
    margin: 0 0 10px;

    dt {
      color: #888;
      font-size: 0.85em;
    }
    dd {
      margin: 0;
    }
    .e-message {
      font-weight: bold;
      color: #c62828;
    }
  }

  .e-days {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;

    .e-day {
      border: 1px solid #ef9a9a;
      background: #ffebee;
      color: #c62828;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 0.8em;
    }
  }
`;
