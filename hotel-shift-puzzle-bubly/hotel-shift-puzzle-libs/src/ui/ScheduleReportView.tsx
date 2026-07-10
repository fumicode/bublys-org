'use client';

import { FC, useEffect, useState } from "react";
import styled from "styled-components";
import HandshakeIcon from "@mui/icons-material/Handshake";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { WorkingDay, ScheduleReport } from "../domain/index.js";

type ScheduleReportViewProps = {
  report: ScheduleReport;
  /** staffId → 表示名（解決済み。無ければ staffId を出す） */
  nameOf: (staffId: string) => string;
  /** 配慮メモ欄の編集（保存はシェル経由で feature 層が担う） */
  onChangeNote: (staffId: string, text: string) => void;
  /** タイトルの変更（空にすると既定の "{年}年{月}" に戻る） */
  onRename: (title: string) => void;
  /** レポートの削除。渡すと見出しに削除ボタンが出る */
  onDelete?: () => void;
};

/**
 * シフト完成レポートの表示（プレゼンテーショナル）。
 * 妥協してくれた人（#87）・繁忙日に入ってくれた人（#88）・貢献度スコア（#89）を並べ、
 * 最後にスタッフごとの自由記述の配慮メモ欄を置く。
 */
export const ScheduleReportView: FC<ScheduleReportViewProps> = ({
  report,
  nameOf,
  onChangeNote,
  onRename,
  onDelete,
}) => {
  const dayLabel = (dayKey: string) => WorkingDay.fromKey(dayKey).label;
  // 月単位の違反（休日不足など）は dayKeys が空。1日なら単日、複数日なら範囲で示す。
  const dayRangeLabel = (dayKeys: string[]) => {
    if (dayKeys.length === 0) return null;
    const first = dayLabel(dayKeys[0]);
    const last = dayLabel(dayKeys[dayKeys.length - 1]);
    return dayKeys.length === 1 ? first : `${first}〜${last}`;
  };

  // 配慮メモは対象スタッフをトグルで1人選び、その人の分だけ編集欄を出す。
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // タイトル編集（世界線ビューの nameable 入力と同じ素直な制御 input。IME は触らない）。
  // report が別のレポートに切り替わったとき（同じコンポーネントインスタンスの再利用時）は
  // 下書きを同期し直す。
  const [titleDraft, setTitleDraft] = useState(report.title);
  useEffect(() => {
    setTitleDraft(report.title);
  }, [report.id, report.title]);
  const commitTitle = () => onRename(titleDraft);

  const compromisesByStaff = new Map<string, typeof report.compromises>();
  for (const c of report.compromises) {
    const list = compromisesByStaff.get(c.staffId) ?? [];
    list.push(c);
    compromisesByStaff.set(c.staffId, list);
  }

  const busyDayCountByStaff = new Map<string, number>();
  for (const day of report.busyDayContributions) {
    for (const staffId of day.workedStaffIds) {
      busyDayCountByStaff.set(staffId, (busyDayCountByStaff.get(staffId) ?? 0) + 1);
    }
  }

  const maxScore = Math.max(1, ...report.contributionScores.map((s) => s.score));

  return (
    <StyledWrap>
      <div className="e-head">
        <span className="e-kicker">シフト完成レポート</span>
        <div className="e-title-row">
          <input
            className="e-title-input"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return; // IME確定のEnterでは確定しない
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            placeholder={`${report.year}年${report.month}月`}
          />
          {onDelete && (
            <button
              type="button"
              className="e-delete"
              aria-label="レポートを削除"
              title="このレポートを削除"
              onClick={onDelete}
            >
              <DeleteOutlineIcon fontSize="small" />
            </button>
          )}
        </div>
        <span className="e-sub">
          {report.year}年{report.month}月 / {report.storeId}
        </span>
      </div>

      {/* #87 妥協してくれた人 */}
      <section className="e-section">
        <h4>
          <HandshakeIcon fontSize="small" className="e-icon e-icon-compromise" />
          妥協してくれた人
        </h4>
        {compromisesByStaff.size === 0 ? (
          <p className="e-empty">連勤・休日・希望などのルール違反はありませんでした。</p>
        ) : (
          <ul className="e-compromise-list">
            {Array.from(compromisesByStaff.entries()).map(([staffId, entries]) => (
              <li key={staffId} className="e-compromise-item">
                <div className="e-compromise-head">
                  <span className="e-name">{nameOf(staffId)}</span>
                  <span className="e-badge">{entries.length}件</span>
                </div>
                <ul className="e-compromise-days">
                  {entries.map((e, i) => {
                    const range = dayRangeLabel(e.dayKeys);
                    return (
                      <li key={i}>
                        <span className="e-compromise-tag">{e.label}</span>
                        {range && <span className="e-compromise-range">{range}: </span>}
                        {e.message}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* #88 繁忙日に入ってくれた人 */}
      <section className="e-section">
        <h4>
          <LocalFireDepartmentIcon fontSize="small" className="e-icon e-icon-busy" />
          繁忙日に入ってくれた人
        </h4>
        {report.busyDayContributions.length === 0 ? (
          <p className="e-empty">繁忙日はありませんでした。</p>
        ) : (
          <ul className="e-busy-list">
            {report.busyDayContributions.map((day) => (
              <li key={day.dayKey} className="e-busy-item">
                <span className="e-busy-day">
                  {dayLabel(day.dayKey)}（必要{day.requiredCount}人）
                </span>
                <span className="e-busy-names">
                  {day.workedStaffIds.length === 0
                    ? "出勤者なし"
                    : day.workedStaffIds.map((id) => nameOf(id)).join("・")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* #89 貢献度スコア */}
      <section className="e-section">
        <h4>
          <EmojiEventsIcon fontSize="small" className="e-icon e-icon-score" />
          貢献度スコア
        </h4>
        {report.contributionScores.length === 0 ? (
          <p className="e-empty">対象スタッフがいません。</p>
        ) : (
          <ul className="e-score-list">
            {report.contributionScores.map((s, rank) => (
              <li key={s.staffId} className="e-score-item">
                <span className="e-rank">{rank + 1}</span>
                <span className="e-score-name">{nameOf(s.staffId)}</span>
                <div className="e-score-bar-track">
                  <div
                    className="e-score-bar"
                    style={{ width: `${(s.score / maxScore) * 100}%` }}
                  />
                </div>
                <span className="e-score-value">{s.score}</span>
                <span className="e-score-detail">
                  妥協{s.compromiseCount}・繁忙{s.busyDayCount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 配慮メモ（自由記述、確定後も編集可）。人物をトグルで1人選んでからコメントする。 */}
      <section className="e-section">
        <h4>配慮メモ</h4>
        <p className="e-hint">制約からは算出できない配慮を、次回のために書き残せます。</p>
        <div className="e-note-toggles">
          {report.contributionScores.map((s) => {
            const hasNote = report.noteFor(s.staffId).trim().length > 0;
            const active = selectedStaffId === s.staffId;
            return (
              <button
                key={s.staffId}
                type="button"
                className={`e-note-toggle${active ? " is-active" : ""}${
                  hasNote ? " has-note" : ""
                }`}
                onClick={() => setSelectedStaffId(active ? null : s.staffId)}
              >
                {nameOf(s.staffId)}
                {hasNote && <span className="e-note-dot" />}
              </button>
            );
          })}
        </div>
        {selectedStaffId ? (
          <div className="e-note-editor">
            <span className="e-note-name">{nameOf(selectedStaffId)}へのメモ</span>
            <textarea
              className="e-note-input"
              rows={3}
              autoFocus
              placeholder="例: 来月は休み希望を優先してあげたい"
              value={report.noteFor(selectedStaffId)}
              onChange={(e) => onChangeNote(selectedStaffId, e.target.value)}
              data-busy={busyDayCountByStaff.get(selectedStaffId) ?? 0}
            />
          </div>
        ) : (
          <p className="e-empty">上の名前をクリックすると、その人への配慮メモを書けます。</p>
        )}
      </section>
    </StyledWrap>
  );
};

const StyledWrap = styled.div`
  min-width: 320px;
  max-width: 480px;

  .e-head {
    margin-bottom: 12px;

    .e-kicker {
      display: block;
      font-size: 0.72em;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .e-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .e-title-input {
      flex: 1;
      min-width: 0;
      border: 1px solid transparent;
      border-radius: 6px;
      background: transparent;
      padding: 2px 6px;
      margin-left: -6px;
      font-size: 1.15em;
      font-weight: bold;
      color: inherit;
      font-family: inherit;

      &:hover {
        border-color: #dcdcdc;
      }
      &:focus {
        outline: none;
        border-color: #90a4ae;
        background: #fff;
      }
    }

    .e-delete {
      flex-shrink: 0;
      border: none;
      background: transparent;
      color: #b0b0b0;
      border-radius: 6px;
      padding: 4px;
      cursor: pointer;
      display: flex;

      &:hover {
        color: #d32f2f;
        background: #ffebee;
      }
    }

    .e-sub {
      display: block;
      font-weight: normal;
      font-size: 0.8em;
      color: #777;
    }
  }

  .e-section {
    margin-bottom: 16px;

    h4 {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0 0 6px;
      font-size: 0.9em;
    }
    .e-icon-compromise {
      color: #6d4c41;
    }
    .e-icon-busy {
      color: #e64a19;
    }
    .e-icon-score {
      color: #f9a825;
    }
    .e-hint {
      margin: 0 0 6px;
      font-size: 0.78em;
      color: #888;
    }
    .e-empty {
      margin: 0;
      font-size: 0.85em;
      color: #999;
    }
  }

  .e-compromise-list,
  .e-busy-list,
  .e-score-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .e-compromise-item {
    padding: 6px 0;
    border-bottom: 1px solid #eee;

    &:last-child {
      border-bottom: none;
    }

    .e-compromise-head {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .e-name {
      font-weight: bold;
    }
    .e-badge {
      border-radius: 999px;
      background: #efebe9;
      color: #6d4c41;
      font-size: 0.75em;
      padding: 1px 8px;
    }
    .e-compromise-days {
      list-style: none;
      margin: 4px 0 0;
      padding: 0 0 0 4px;
      font-size: 0.8em;
      color: #555;

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
    }
  }

  .e-busy-item {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 0;
    font-size: 0.85em;
    border-bottom: 1px solid #eee;

    &:last-child {
      border-bottom: none;
    }

    .e-busy-day {
      color: #d84315;
      flex-shrink: 0;
    }
    .e-busy-names {
      text-align: right;
      color: #444;
    }
  }

  .e-score-item {
    display: grid;
    grid-template-columns: 18px 64px 1fr 28px auto;
    align-items: center;
    gap: 6px;
    padding: 4px 0;
    font-size: 0.82em;

    .e-rank {
      color: #999;
      text-align: center;
    }
    .e-score-name {
      font-weight: bold;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .e-score-bar-track {
      height: 8px;
      background: #f5f5f5;
      border-radius: 4px;
      overflow: hidden;
    }
    .e-score-bar {
      height: 100%;
      background: linear-gradient(90deg, #ffd54f, #f9a825);
    }
    .e-score-value {
      text-align: right;
      font-weight: bold;
      color: #f57f17;
    }
    .e-score-detail {
      color: #999;
      font-size: 0.85em;
    }
  }

  .e-note-toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }

  .e-note-toggle {
    position: relative;
    border: 1px solid #cfd8dc;
    border-radius: 999px;
    background: #fff;
    color: #37474f;
    font-size: 0.8em;
    padding: 4px 12px 4px 10px;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;

    &:hover {
      background: #eceff1;
      border-color: #90a4ae;
    }

    &.is-active {
      background: #e8eaf6;
      border-color: #3949ab;
      color: #3949ab;
      font-weight: bold;
    }

    &.has-note .e-note-dot {
      display: inline-block;
    }

    .e-note-dot {
      display: none;
      width: 6px;
      height: 6px;
      margin-left: 5px;
      border-radius: 50%;
      background: #f9a825;
      vertical-align: middle;
    }
  }

  .e-note-editor {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .e-note-name {
      font-size: 0.82em;
      font-weight: bold;
    }
    .e-note-input {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #dcdcdc;
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 0.82em;
      font-family: inherit;
      resize: vertical;

      &:focus {
        outline: none;
        border-color: #90a4ae;
      }
    }
  }
`;
