'use client';

import { FC } from "react";
import styled from "styled-components";
import AssessmentIcon from "@mui/icons-material/Assessment";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { ScheduleReport } from "../domain/index.js";

type ScheduleReportListViewProps = {
  /** 年月降順（新しい順） */
  reports: ScheduleReport[];
};

/**
 * シフト完成レポートの一覧（プレゼンテーショナル）。次回シフト作成前に、過去の
 * 譲歩・繁忙日対応・貢献度スコアを参照する入口になる。開くだけで、内容の自動反映は行わない。
 */
export const ScheduleReportListView: FC<ScheduleReportListViewProps> = ({ reports }) => {
  return (
    <StyledContainer>
      <div className="e-header">
        <h3>シフト完成レポート一覧 ({reports.length})</h3>
        <p className="e-hint">
          過去のレポートを開いて、譲歩してくれた人・繁忙日対応・配慮メモを参照できます。
        </p>
      </div>
      <ul className="e-list">
        {reports.length === 0 ? (
          <li className="e-empty">まだレポートがありません。勤務表の世界線ビューから確定すると作成されます。</li>
        ) : (
          reports.map((report) => (
            <li key={report.id} className="e-item">
              <ObjectView
                object={report}
                label={`${report.year}年${report.month}月`}
                draggable={true}
                openingPosition="bubble-side-right"
                fullWidth={true}
              >
                <div className="e-content">
                  <AssessmentIcon fontSize="small" className="e-icon" />
                  <div className="e-text">
                    <div className="e-title">
                      {report.year}年{report.month}月
                    </div>
                    <div className="e-meta">
                      {report.storeId} ・ 譲歩{report.compromises.length}件 ・ 繁忙日
                      {report.busyDayContributions.length}日
                    </div>
                  </div>
                </div>
              </ObjectView>
            </li>
          ))
        )}
      </ul>
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 8px;
  min-width: 300px;

  .e-header {
    margin-bottom: 8px;

    h3 {
      margin: 0 0 4px;
    }
    .e-hint {
      margin: 0;
      font-size: 0.78em;
      color: #888;
    }
  }

  .e-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .e-empty {
    padding: 12px;
    text-align: center;
    color: #999;
    font-size: 0.85em;
  }

  .e-item {
    padding: 4px 0;
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
      color: #f57f17;
      flex-shrink: 0;
    }
    .e-title {
      font-weight: bold;
    }
    .e-meta {
      font-size: 0.8em;
      color: #777;
    }
  }
`;
