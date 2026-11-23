'use client';

import { FC } from "react";
import styled from "styled-components";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { SCHEDULE_TYPE } from "../objects/hotelObjects.js";
import { ScheduleWorld } from "./ScheduleWorld.js";
import { useConfirmedVersion } from "./confirmedVersion.js";
import { ConfirmedReview } from "./ConfirmedReview.js";

type ConfirmedReviewPanelProps = {
  scheduleId: string;
  /** 勤務表を開くバブルの URL。ヘッダーの勤務表名から開く */
  scheduleUrl?: string;
};

/**
 * 振り返りバブル — 確定版の振り返りを独立したバブルとして表示する。
 *
 * 勤務表の中にインラインで表示していた振り返り（ConfirmedReview）を、スクロールなしに
 * 見渡せるよう独立したバブルにしたもの。ヘッダーに「○年○月の勤務表」を ObjectView で
 * 置き、ダブルクリックで勤務表が開く。
 */
export const ConfirmedReviewPanel: FC<ConfirmedReviewPanelProps> = ({
  scheduleId,
  scheduleUrl,
}) => {
  const confirmed = useConfirmedVersion(scheduleId);
  if (!confirmed) {
    return (
      <div style={{ padding: 16, color: "#888" }}>
        この勤務表にはまだ確定版がありません。
      </div>
    );
  }
  return (
    <ScheduleWorld scheduleId={scheduleId}>
      <StyledPanel>
        {scheduleUrl && (
          <ObjectView
            type={SCHEDULE_TYPE}
            id={scheduleId}
            url={scheduleUrl}
            label={`${confirmed.period.label}の勤務表`}
            openingPosition="bubble-side-right"
          >
            <div className="p-header">
              {confirmed.period.label}の勤務表
            </div>
          </ObjectView>
        )}
        {!scheduleUrl && (
          <div className="p-header is-plain">
            {confirmed.period.label}の振り返り
          </div>
        )}
        <ConfirmedReview report={confirmed} editable />
      </StyledPanel>
    </ScheduleWorld>
  );
};

const StyledPanel = styled.div`
  display: flex;
  flex-direction: column;

  .p-header {
    padding: 8px 12px;
    font-size: 0.85em;
    font-weight: 600;
    color: #37474f;
    border-bottom: 1px solid #e0e0e0;
    cursor: pointer;
    transition: background 0.1s;

    &:hover {
      background: #f5f5f5;
    }

    &.is-plain {
      cursor: default;
      &:hover {
        background: transparent;
      }
    }
  }
`;
