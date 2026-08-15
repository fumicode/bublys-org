'use client';

import { FC, useEffect, useState } from "react";
import styled from "styled-components";
import HandshakeIcon from "@mui/icons-material/Handshake";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { WorkingDay, ScheduleReport } from "../domain/index.js";

// スコアバーのセグメント色。譲歩・繁忙日アイコンと同じ色を流用し、凡例としても機能させる。
const COMPROMISE_COLOR = "#6d4c41";
const BUSY_DAY_COLOR = "#e64a19";

type ScheduleReportViewProps = {
  report: ScheduleReport;
  /** staffId → 表示名（解決済み。無ければ staffId を出す） */
  nameOf: (staffId: string) => string;
  /** 配慮メモ欄の編集（保存はシェル経由で feature 層が担う） */
  onChangeNote: (staffId: string, text: string) => void;
  /** タイトルの変更（空にすると既定の "{年}年{月}" に戻る） */
  onRename: (title: string) => void;
  /** 譲歩・繁忙日の重み（倍率）の変更。貢献度スコアが再計算される */
  onChangeWeights: (compromiseWeight: number, busyDayWeight: number) => void;
  /** レポートの削除。渡すと見出しに削除ボタンが出る */
  onDelete?: () => void;
};

/**
 * シフト完成レポートの表示（プレゼンテーショナル）。
 * スタッフごとに1行（貢献度スコア＋譲歩/繁忙日の内訳を色分けしたバー）にまとめる。
 * 行をクリックして展開すると、譲歩（#87）・繁忙日対応（#88）の詳細と配慮メモの編集欄が出る
 * （複数行を同時に展開できる）。
 */
export const ScheduleReportView: FC<ScheduleReportViewProps> = ({
  report,
  nameOf,
  onChangeNote,
  onRename,
  onChangeWeights,
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

  // 行の展開状態。クリックした行だけをトグルし、複数行を同時に開ける。
  const [expandedStaffIds, setExpandedStaffIds] = useState<Set<string>>(new Set());
  const toggleExpanded = (staffId: string) => {
    setExpandedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });
  };

  // タイトル編集（世界線ビューの nameable 入力と同じ素直な制御 input。IME は触らない）。
  // report が別のレポートに切り替わったとき（同じコンポーネントインスタンスの再利用時）は
  // 下書きを同期し直す。
  const [titleDraft, setTitleDraft] = useState(report.title);
  useEffect(() => {
    setTitleDraft(report.title);
  }, [report.id, report.title]);
  const commitTitle = () => onRename(titleDraft);

  // 重み編集（同じく下書き→blur/Enterで確定。数値のみ・0未満は入力させない）。
  const [compromiseWeightDraft, setCompromiseWeightDraft] = useState(String(report.compromiseWeight));
  const [busyDayWeightDraft, setBusyDayWeightDraft] = useState(String(report.busyDayWeight));
  useEffect(() => {
    setCompromiseWeightDraft(String(report.compromiseWeight));
    setBusyDayWeightDraft(String(report.busyDayWeight));
  }, [report.id, report.compromiseWeight, report.busyDayWeight]);
  const commitWeights = () => {
    const w1 = Number(compromiseWeightDraft);
    const w2 = Number(busyDayWeightDraft);
    onChangeWeights(Number.isFinite(w1) ? w1 : report.compromiseWeight, Number.isFinite(w2) ? w2 : report.busyDayWeight);
  };

  const compromisesByStaff = new Map<string, typeof report.compromises>();
  for (const c of report.compromises) {
    const list = compromisesByStaff.get(c.staffId) ?? [];
    list.push(c);
    compromisesByStaff.set(c.staffId, list);
  }

  const busyDaysByStaff = new Map<string, typeof report.busyDayContributions>();
  for (const day of report.busyDayContributions) {
    for (const staffId of day.workedStaffIds) {
      const list = busyDaysByStaff.get(staffId) ?? [];
      list.push(day);
      busyDaysByStaff.set(staffId, list);
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

      {/* 貢献度: #87譲歩・#88繁忙日対応・#89スコアを人ごとに1行へ統合。展開すると詳細＋配慮メモ */}
      <section className="e-section">
        <h4>
          <EmojiEventsIcon fontSize="small" className="e-icon e-icon-score" />
          貢献度
        </h4>
        <div className="e-legend">
          <label className="e-legend-item">
            <HandshakeIcon fontSize="inherit" className="e-icon-compromise" /> 譲歩 ×
            <input
              type="number"
              className="e-weight-input"
              min={0}
              step={0.5}
              value={compromiseWeightDraft}
              onChange={(e) => setCompromiseWeightDraft(e.target.value)}
              onBlur={commitWeights}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              aria-label="譲歩の重み"
            />
          </label>
          <label className="e-legend-item">
            <LocalFireDepartmentIcon fontSize="inherit" className="e-icon-busy" /> 繁忙日 ×
            <input
              type="number"
              className="e-weight-input"
              min={0}
              step={0.5}
              value={busyDayWeightDraft}
              onChange={(e) => setBusyDayWeightDraft(e.target.value)}
              onBlur={commitWeights}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              aria-label="繁忙日の重み"
            />
          </label>
        </div>
        <p className="e-hint">
          重みはこのレポート限定の設定です。
        </p>

        {report.contributionScores.length === 0 ? (
          <p className="e-empty">対象スタッフがいません。</p>
        ) : (
          <ul className="e-person-list">
            {report.contributionScores.map((s) => {
              const expanded = expandedStaffIds.has(s.staffId);
              const hasNote = report.noteFor(s.staffId).trim().length > 0;
              const compromisePortion = s.compromiseCount * report.compromiseWeight;
              const busyDayPortion = s.busyDayCount * report.busyDayWeight;
              const compromises = compromisesByStaff.get(s.staffId) ?? [];
              const busyDays = busyDaysByStaff.get(s.staffId) ?? [];

              return (
                <li key={s.staffId} className="e-person">
                  <button
                    type="button"
                    className="e-person-row"
                    onClick={() => toggleExpanded(s.staffId)}
                    aria-expanded={expanded}
                  >
                    <ChevronRightIcon
                      fontSize="small"
                      className={`e-chevron${expanded ? " is-expanded" : ""}`}
                    />
                    <span className="e-person-name">
                      {nameOf(s.staffId)}
                      {hasNote && <span className="e-note-dot" />}
                    </span>
                    <div className="e-score-bar-track">
                      {compromisePortion > 0 && (
                        <div
                          className="e-score-bar-segment"
                          style={{
                            width: `${(compromisePortion / maxScore) * 100}%`,
                            background: COMPROMISE_COLOR,
                          }}
                        />
                      )}
                      {busyDayPortion > 0 && (
                        <div
                          className="e-score-bar-segment"
                          style={{
                            width: `${(busyDayPortion / maxScore) * 100}%`,
                            background: BUSY_DAY_COLOR,
                          }}
                        />
                      )}
                    </div>
                    <span className="e-score-value">{s.score}</span>
                  </button>

                  {expanded && (
                    <div className="e-person-detail">
                      <div className="e-detail-block">
                        <span className="e-detail-label">
                          <HandshakeIcon fontSize="inherit" className="e-icon-compromise" /> 譲歩
                        </span>
                        {compromises.length === 0 ? (
                          <p className="e-empty">特になし</p>
                        ) : (
                          <ul className="e-compromise-days">
                            {compromises.map((c, i) => {
                              const range = dayRangeLabel(c.dayKeys);
                              return (
                                <li key={i}>
                                  <span className="e-compromise-tag">{c.label}</span>
                                  {range && (
                                    <span className="e-compromise-range">{range}: </span>
                                  )}
                                  {c.message}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>

                      <div className="e-detail-block">
                        <span className="e-detail-label">
                          <LocalFireDepartmentIcon fontSize="inherit" className="e-icon-busy" />{" "}
                          繁忙日対応
                        </span>
                        {busyDays.length === 0 ? (
                          <p className="e-empty">特になし</p>
                        ) : (
                          <ul className="e-busy-days">
                            {busyDays.map((day) => (
                              <li key={day.dayKey}>
                                {dayLabel(day.dayKey)}（必要{day.requiredCount}人）
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="e-detail-block">
                        <span className="e-detail-label">配慮メモ</span>
                        <textarea
                          className="e-note-input"
                          rows={3}
                          placeholder="例: 来月は休み希望を優先してあげたい"
                          value={report.noteFor(s.staffId)}
                          onChange={(e) => onChangeNote(s.staffId, e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
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
    .e-icon-score {
      color: #f9a825;
    }
    .e-icon-compromise {
      color: ${COMPROMISE_COLOR};
    }
    .e-icon-busy {
      color: ${BUSY_DAY_COLOR};
    }
    .e-empty {
      margin: 0;
      font-size: 0.85em;
      color: #999;
    }
  }

  .e-legend {
    display: flex;
    gap: 14px;
    margin: 0 0 4px;
    font-size: 0.78em;
    color: #666;

    .e-legend-item {
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    .e-weight-input {
      width: 3.2em;
      border: 1px solid #dcdcdc;
      border-radius: 4px;
      padding: 1px 4px;
      font-size: 1em;
      font-family: inherit;
      color: inherit;
      background: #fff;

      &:focus {
        outline: none;
        border-color: #90a4ae;
      }
    }
  }

  .e-hint {
    margin: 0 0 8px;
    font-size: 0.74em;
    color: #999;
  }

  .e-person-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .e-person {
    border-bottom: 1px solid #eee;

    &:last-child {
      border-bottom: none;
    }
  }

  .e-person-row {
    display: grid;
    grid-template-columns: 20px 96px 1fr 24px;
    align-items: center;
    gap: 8px;
    width: 100%;
    box-sizing: border-box;
    border: none;
    background: transparent;
    padding: 6px 2px;
    font: inherit;
    font-size: 0.85em;
    color: inherit;
    text-align: left;
    cursor: pointer;
    border-radius: 6px;

    &:hover {
      background: #f7f7f7;
    }

    .e-chevron {
      color: #999;
      transition: transform 0.12s ease;

      &.is-expanded {
        transform: rotate(90deg);
      }
    }

    .e-person-name {
      font-weight: bold;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .e-note-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      margin-left: 5px;
      border-radius: 50%;
      background: #f9a825;
      vertical-align: middle;
    }

    .e-score-bar-track {
      display: flex;
      height: 8px;
      background: #f5f5f5;
      border-radius: 4px;
      overflow: hidden;
    }
    .e-score-bar-segment {
      height: 100%;
    }

    .e-score-value {
      text-align: right;
      font-weight: bold;
      color: #555;
    }
  }

  .e-person-detail {
    padding: 4px 4px 12px 28px;

    .e-detail-block {
      margin-bottom: 10px;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .e-detail-label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.78em;
      font-weight: bold;
      color: #666;
      margin-bottom: 4px;
    }
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
    color: ${COMPROMISE_COLOR};
    font-size: 0.85em;
    padding: 0 5px;
    margin-right: 4px;
  }
  .e-compromise-range {
    color: #888;
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
`;
