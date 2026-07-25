'use client';

import { FC } from "react";
import styled from "styled-components";
import type {
  ScheduleEditEntryPlain,
  ScheduleEditKind,
} from "../domain/index.js";

const CONCESSION_COLOR = "#6d4c41";
const RESOLVED_COLOR = "#2e7d32";

type ScheduleEditLogViewProps = {
  entries: ScheduleEditEntryPlain[];
  concessionsOnly: boolean;
  onToggleConcessionsOnly: (v: boolean) => void;
  staffNameOf?: (staffId: string) => string;
};

const KIND_LABEL: Record<ScheduleEditKind, string> = {
  setCell: "セル",
  autoStep: "自動一手",
  constraintEdit: "制約",
  requiredEdit: "必要人数",
  candidate: "比較案",
};

function formatShortTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

/**
 * 勤務表の操作履歴（ノウハウ）表示。プレゼンテーショナル。
 * 古い順（継承を読む向き）で並べる。
 */
export const ScheduleEditLogView: FC<ScheduleEditLogViewProps> = ({
  entries,
  concessionsOnly,
  onToggleConcessionsOnly,
  staffNameOf,
}) => {
  // append 順（古い→新しい）のまま表示。継承を読む向き。
  const ordered = entries;

  return (
    <StyledWrap>
      <div className="e-head">
        <span className="e-kicker">操作の記録</span>
        <h3 className="e-title">操作履歴</h3>
        <label className="e-filter">
          <input
            type="checkbox"
            checked={concessionsOnly}
            onChange={(e) => onToggleConcessionsOnly(e.target.checked)}
          />
          譲歩だけ
        </label>
      </div>

      {ordered.length === 0 ? (
        <p className="e-empty">
          まだ操作が記録されていません。セルを編集するとここに残ります。
        </p>
      ) : (
        <ul className="e-list">
          {ordered.map((entry) => {
            const { concessions, newlyResolved } = entry.constraintDelta;
            return (
              <li key={entry.id} className="e-row">
                <div className="e-row-main">
                  <span className="e-summary">{entry.summary}</span>
                  <span
                    className={`e-actor ${
                      entry.actor === "human" ? "is-human" : "is-auto"
                    }`}
                  >
                    {entry.actor === "human" ? "人間" : "自動"}
                  </span>
                  {entry.source === "suggestion" && (
                    <span className="e-source">この一手を選んだ</span>
                  )}
                  {entry.rejectedSuggestionId && (
                    <span className="e-source is-diverged">見通しと異なる判断</span>
                  )}
                  <span className="e-kind">{KIND_LABEL[entry.kind] ?? entry.kind}</span>
                  <span className="e-time">{formatShortTime(entry.at)}</span>
                </div>
                {(concessions.length > 0 || newlyResolved.length > 0) && (
                  <div className="e-tags">
                    {concessions.length > 0 && (
                      <span
                        className="e-tag e-tag-concession"
                        title={concessions.map((c) => c.message).join(" / ")}
                      >
                        譲歩{concessions.length}
                      </span>
                    )}
                    {concessions.map((c, i) => (
                      <span key={`c-${i}`} className="e-tag e-tag-concession-msg">
                        {staffNameOf && c.staffId
                          ? `${staffNameOf(c.staffId)}: `
                          : ""}
                        {c.message}
                      </span>
                    ))}
                    {newlyResolved.length > 0 && (
                      <span className="e-tag e-tag-resolved">
                        解消{newlyResolved.length}
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </StyledWrap>
  );
};

const StyledWrap = styled.div`
  min-width: 280px;
  max-width: 420px;
  padding: 4px 2px 8px;

  .e-head {
    margin-bottom: 10px;

    .e-kicker {
      display: block;
      font-size: 0.72em;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .e-title {
      margin: 2px 0 8px;
      font-size: 1.1em;
      font-weight: bold;
    }

    .e-filter {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82em;
      color: #555;
      cursor: pointer;
      user-select: none;
    }
  }

  .e-empty {
    margin: 8px 0 0;
    font-size: 0.85em;
    color: #999;
    line-height: 1.5;
  }

  .e-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .e-row {
    border-bottom: 1px solid #eee;
    padding: 8px 2px;

    &:last-child {
      border-bottom: none;
    }
  }

  .e-row-main {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px 8px;
    font-size: 0.85em;
  }

  .e-summary {
    flex: 1 1 100%;
    font-weight: 600;
    color: #333;
    line-height: 1.35;
  }

  .e-actor {
    flex-shrink: 0;
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 0.78em;
    font-weight: 600;

    &.is-human {
      background: #e3f2fd;
      color: #1565c0;
    }
    &.is-auto {
      background: #f3e5f5;
      color: #6a1b9a;
    }
  }

  .e-source {
    border-radius: 4px;
    background: #e8f5e9;
    color: #2e7d32;
    padding: 1px 6px;
    font-size: 0.74em;
  }

  .e-source.is-diverged {
    background: #fff3e0;
    color: #e65100;
  }

  .e-kind {
    flex-shrink: 0;
    font-size: 0.78em;
    color: #777;
  }

  .e-time {
    flex-shrink: 0;
    margin-left: auto;
    font-size: 0.76em;
    color: #999;
    font-variant-numeric: tabular-nums;
  }

  .e-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
  }

  .e-tag {
    display: inline-block;
    max-width: 100%;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 0.74em;
    line-height: 1.35;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .e-tag-concession {
    background: #efebe9;
    color: ${CONCESSION_COLOR};
    font-weight: 600;
  }

  .e-tag-concession-msg {
    background: #f5f5f5;
    color: #555;
  }

  .e-tag-resolved {
    background: #e8f5e9;
    color: ${RESOLVED_COLOR};
    font-weight: 600;
  }
`;
