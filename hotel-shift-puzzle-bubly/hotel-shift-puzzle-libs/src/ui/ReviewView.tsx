'use client';

import { FC, useEffect, useState } from "react";
import styled from "styled-components";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { WorkingDay, ConfirmedSchedule } from "../domain/index.js";
import { formatConfirmedAt } from "./formatConfirmedAt.js";
import { dayStripOf } from "./review/dayStrip.js";
import { ReviewDayScale, ReviewDayStrip, ReviewMark } from "./review/ReviewDayStrip.js";
import { VIOLATION_STRONG } from "./schedule-grid/cellSymbols.js";

type ScheduleReportViewProps = {
  report: ConfirmedSchedule;
  /** staffId → 表示名（解決済み。無ければ staffId を出す） */
  nameOf: (staffId: string) => string;
  /** 配慮メモ欄の編集（保存はシェル経由で feature 層が担う）。省略すると読むだけ */
  onChangeNote?: (staffId: string, text: string) => void;
  /** タイトルの変更（空にすると既定の "{年}年{月}" に戻る）。省略すると読むだけ */
  onRename?: (title: string) => void;
  /** 譲歩・繁忙日の重み（倍率）の変更。★が再計算される。省略すると読むだけ */
  onChangeWeights?: (compromiseWeight: number, busyDayWeight: number) => void;
  /** 確定した時刻（epoch ms） */
  confirmedAt?: number;
};

/**
 * 確定版の振り返りの表示（プレゼンテーショナル）。
 * スタッフごとに1行（1〜末日の帯＋★）にまとめる。帯には「いつ無理を引き受けてくれたか」を
 * 勤務表と同じ色で置く（譲歩＝違反の赤い帯、繁忙日に出勤＝淡い藍の地。review/dayStrip.ts）。
 * 重みは「譲歩1件で★2・繁忙日1回で★1」という★の定義の文の中の数字を ＋− で変える。
 * 行をクリックして展開すると、譲歩（#87）・繁忙日対応（#88）の詳細と配慮メモが出る
 * （複数行を同時に展開できる）。
 *
 * 振り返りは独立したバブルを持たず、確定版を持つ勤務表の中（書ける）と、成果木の詳細欄
 * （読むだけ）に同じ部品で出る（#231）。編集の口を渡さなければ読むだけになる。
 * 確定版に取り消しは無いので、削除の口は持たない。
 */
export const ReviewView: FC<ScheduleReportViewProps> = ({
  report,
  nameOf,
  onChangeNote,
  onRename,
  onChangeWeights,
  confirmedAt,
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
  // report が別の確定版に切り替わったとき（同じコンポーネントインスタンスの再利用時）は
  // 下書きを同期し直す。
  const [titleDraft, setTitleDraft] = useState(report.title);
  useEffect(() => {
    setTitleDraft(report.title);
  }, [report.id, report.title]);
  const commitTitle = () => onRename?.(titleDraft);

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

  // 重みは ★ の定義の文の中の数字。＋− で1ずつ変え、0 より下げない
  const stepWeight = (which: "compromise" | "busy", delta: number) => {
    const c = report.compromiseWeight;
    const b = report.busyDayWeight;
    onChangeWeights?.(
      which === "compromise" ? Math.max(0, c + delta) : c,
      which === "busy" ? Math.max(0, b + delta) : b
    );
  };
  const weightControl = (which: "compromise" | "busy", label: string) => {
    const value = which === "compromise" ? report.compromiseWeight : report.busyDayWeight;
    if (!onChangeWeights) return <span className="e-weight-value">{value}</span>;
    return (
      <span className="e-stepper">
        <button
          type="button"
          onClick={() => stepWeight(which, -1)}
          disabled={value <= 0}
          aria-label={`${label}の重みを1下げる`}
        >
          −
        </button>
        <span className="e-weight-value">{value}</span>
        <button type="button" onClick={() => stepWeight(which, 1)} aria-label={`${label}の重みを1上げる`}>
          ＋
        </button>
      </span>
    );
  };
  const dayCount = new Date(report.year, report.month, 0).getDate();

  return (
    <StyledWrap>
      <div className="e-head">
        <div className="e-title-row">
          {onRename ? (
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
          ) : (
            <span className="e-title-text">{report.title}</span>
          )}
        </div>
        <span className="e-sub">
          {report.year}年{report.month}月 / {report.storeId}
          {confirmedAt !== undefined && (
            <span className="e-confirmed-at"> ・ 確定 {formatConfirmedAt(confirmedAt)}</span>
          )}
        </span>
      </div>

      {/* ★: 人ごとに1行（日別の帯＋★）。展開すると譲歩・繁忙日の詳細＋配慮メモ */}
      <section className="e-section">
        <p
          className="e-rule"
          title="★はその月に無理を引き受けてくれたことを称える数です。★が高い人ほど、翌月の自動シフトで休みを先に置けます（制約欄の「★優先」）"
        >
          譲歩1件で★{weightControl("compromise", "譲歩")}・繁忙日1回で★{weightControl("busy", "繁忙日")}
        </p>
        <p className="e-legend">
          <ReviewMark kind="compromise" /> 譲歩（その人が飲んでくれた違反）
          <ReviewMark kind="busy" /> 繁忙日に出勤
        </p>

        {report.stars.length === 0 ? (
          <p className="e-empty">対象スタッフがいません。</p>
        ) : (
          <ul className="e-person-list">
            <li className="e-scale-row" aria-hidden>
              <span />
              <span />
              <ReviewDayScale dayCount={dayCount} />
            </li>
            {report.stars.map((s) => {
              const expanded = expandedStaffIds.has(s.staffId);
              const hasNote = report.noteFor(s.staffId).trim().length > 0;
              const strip = dayStripOf({
                year: report.year,
                month: report.month,
                staffId: s.staffId,
                compromises: report.compromises,
                busyDayContributions: report.busyDayContributions,
              });
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
                    <ReviewDayStrip strip={strip} />
                    <span className="e-monthly" title="日に紐づかない譲歩（月の休日不足など）。中身は行を開くと読めます">
                      {strip.monthlyCount > 0 && (
                        <>
                          <ReviewMark kind="compromise" />
                          {strip.monthlyCount > 1 && strip.monthlyCount}
                        </>
                      )}
                    </span>
                    <span
                      className="e-score-value"
                      aria-label={`星${s.score}`}
                      title={`★${s.score}（譲歩${s.compromiseCount}件・繁忙日${s.busyDayCount}回）`}
                    >
                      {s.score > 0 ? `★${s.score}` : "—"}
                    </span>
                  </button>

                  {expanded && (
                    <div className="e-person-detail">
                      <div className="e-detail-block">
                        <span className="e-detail-label">譲歩</span>
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
                        <span className="e-detail-label">繁忙日に出勤</span>
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
                        {onChangeNote ? (
                          <textarea
                            className="e-note-input"
                            rows={3}
                            placeholder="例: 来月は休み希望を優先してあげたい"
                            value={report.noteFor(s.staffId)}
                            onChange={(e) => onChangeNote(s.staffId, e.target.value)}
                          />
                        ) : hasNote ? (
                          <p className="e-note-text">{report.noteFor(s.staffId)}</p>
                        ) : (
                          <p className="e-empty">特になし</p>
                        )}
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

    .e-title-text {
      flex: 1;
      min-width: 0;
      font-size: 1.15em;
      font-weight: bold;
    }

    .e-sub {
      display: block;
      font-weight: normal;
      font-size: 0.8em;
      color: #777;
    }
    .e-confirmed-at {
      font-size: 0.9em;
      color: #999;
    }
  }

  .e-section {
    margin-bottom: 16px;

    .e-empty {
      margin: 0;
      font-size: 0.85em;
      color: #999;
    }
  }

  /* ★の定義の文。数字の ＋− で重みを変える */
  .e-rule {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
    margin: 0 0 6px;
    font-size: 0.85em;
    color: #444;
  }
  .e-weight-value {
    font-weight: bold;
    min-width: 1.2em;
    text-align: center;
  }
  .e-stepper {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    margin-right: 4px;

    button {
      width: 18px;
      height: 18px;
      padding: 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #fff;
      color: #555;
      font-size: 0.9em;
      line-height: 1;
      cursor: pointer;

      &:hover:not(:disabled) {
        background: #f5f5f5;
      }
      &:disabled {
        opacity: 0.4;
        cursor: default;
      }
    }
  }

  /* 帯の印の凡例（帯と同じ形の印を並べる） */
  .e-legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    margin: 0 0 8px;
    font-size: 0.74em;
    color: #888;
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
    grid-template-columns: 20px 72px max-content 24px 1fr;
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

    .e-monthly {
      display: inline-flex;
      align-items: center;
      gap: 1px;
      font-size: 0.8em;
      color: ${VIOLATION_STRONG};
    }

    .e-score-value {
      text-align: right;
      font-weight: bold;
      color: #555;
    }
  }

  /* 目盛りの行。帯と同じ列に揃える */
  .e-scale-row {
    display: grid;
    grid-template-columns: 20px 72px max-content;
    gap: 8px;
    padding: 0 2px;
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
    background: #ffebee;
    color: ${VIOLATION_STRONG};
    font-size: 0.85em;
    padding: 0 5px;
    margin-right: 4px;
  }
  .e-compromise-range {
    color: #888;
  }

  .e-note-text {
    margin: 0;
    font-size: 0.82em;
    white-space: pre-wrap;
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
