'use client';

import { DragEvent, FC, useState } from "react";
import type { HTMLAttributes } from "react";
import styled from "styled-components";
import AssessmentIcon from "@mui/icons-material/Assessment";
import { ObjectView, parseDragPayload } from "@bublys-org/bubbles-ui";
import { ScheduleReport } from "../domain/index.js";

type LinkedReportsViewProps = {
  /** この勤務表の参照レポート（紐づけは1つだけ）。無ければ undefined */
  report: ScheduleReport | undefined;
  /**
   * 紐づけられるレポート（同じ店舗の前月のもの。新しい順）。
   * 渡すと「選んで紐づける」プルダウンが出る。今の参照レポートは含めなくてよい（ここで除く）。
   */
  candidates?: ScheduleReport[];
  /** プルダウンでレポートを選んだとき呼ぶ（今の参照レポートと置き換わる） */
  onLink?: (reportId: string) => void;
  /**
   * レポートの URL をドロップしたとき呼ぶ。渡すとエリアが drop を受け付け、
   * そのレポートを紐づけられる。dropAcceptTypes と併せて指定する。
   */
  onDropUrl?: (url: string) => void;
  /** 受け付けるドラッグ型（ScheduleReport の drag type）。 */
  dropAcceptTypes?: string[];
  /** 紐づけを外すとき呼ぶ。渡すとバッジに × が付く。 */
  onUnlink?: (reportId: string) => void;
};

/** 参照レポートが勤務表のどこに効くか（ラベルの説明に出す） */
const EFFECT_HINT =
  "参照レポートの貢献度スコアが高い人ほど、自動シフトで休みを優先して取れます（スコアは各スタッフ名の横に出ます）。";

/**
 * 勤務表の参照レポートを表示・紐づけする（プレゼンテーショナル）。
 *
 * 紐づけ方は2通り。主にはプルダウンで選ぶ（候補は同じ店舗の前月のレポート）。
 * レポートをドラッグして落としてもよい（責任者ルールに Staff をドロップで追加する
 * {@link LeaderRuleDiagram} と同じ drop パターン: dragover で型だけ判定→drop で parseDragPayload）。
 * 紐づけは1つなので、どちらで紐づけても今のものと置き換わる。
 * バッジはダブルクリックでレポートバブルを開く（ObjectView の既定挙動）。
 */
export const LinkedReportsView: FC<LinkedReportsViewProps> = ({
  report,
  candidates = [],
  onLink,
  onDropUrl,
  dropAcceptTypes,
  onUnlink,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const droppable = !!onDropUrl;
  const choices = candidates.filter((c) => c.id !== report?.id);

  const handleDragOver = (e: DragEvent) => {
    if (!onDropUrl) return;
    const types = Array.from(e.dataTransfer.types);
    if (!(dropAcceptTypes ?? []).some((t) => types.includes(t))) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!dragOver) setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: DragEvent) => {
    const payload = parseDragPayload(e, { acceptTypes: dropAcceptTypes });
    if (!payload || !onDropUrl) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    onDropUrl(payload.url);
  };

  if (!report && !droppable && !onLink) return null;

  return (
    <StyledWrap
      className={droppable && dragOver ? "is-dragover" : undefined}
      onDragOver={droppable ? handleDragOver : undefined}
      onDragLeave={droppable ? handleDragLeave : undefined}
      onDrop={droppable ? handleDrop : undefined}
    >
      <span className="e-label" title={EFFECT_HINT}>
        <AssessmentIcon fontSize="inherit" className="e-icon" />
        参照レポート
      </span>
      {report && (
        <span className="e-chip" title={EFFECT_HINT}>
          <ObjectView
            object={report}
            label={report.title}
            draggable={false}
            openingPosition="origin-side"
          >
            <span className="e-chip-text">{report.title}</span>
          </ObjectView>
          {onUnlink && (
            <button
              type="button"
              className="e-unlink"
              onClick={() => onUnlink(report.id)}
              title={`「${report.title}」の紐づけを外す`}
              aria-label={`「${report.title}」の紐づけを外す`}
            >
              ×
            </button>
          )}
        </span>
      )}
      {onLink && choices.length > 0 && (
        <select
          className="e-pick"
          value=""
          onChange={(e) => {
            if (e.target.value) onLink(e.target.value);
          }}
          title="同じ店舗の、前月のレポートから選べます"
          aria-label={report ? "参照レポートを変える" : "参照レポートを選んで紐づける"}
        >
          <option value="">{report ? "変える…" : "＋ 選んで紐づける"}</option>
          {choices.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title === ScheduleReport.defaultTitle(c.year, c.month)
                ? c.title
                : `${c.title}（${c.year}年${c.month}月）`}
            </option>
          ))}
        </select>
      )}
      {!report && choices.length === 0 && (
        <span className="e-hint">
          {droppable ? "紐づけられるレポートがありません（同じ店舗の前月のもの）" : "なし"}
        </span>
      )}
    </StyledWrap>
  );
};

/**
 * ヘッダ行（可能勤務帯の右）にインラインで並ぶ想定なので、独立行だった頃の
 * margin-bottom は持たない（縦を食わないようにする）。
 */
const StyledWrap = styled.div<HTMLAttributes<HTMLDivElement>>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border-radius: 8px;
  min-width: 0;
  outline: 2px dashed transparent;
  outline-offset: -3px;
  transition: outline-color 0.12s ease, background 0.12s ease;

  &.is-dragover {
    outline-color: #f9a825;
    background: rgba(249, 168, 37, 0.08);
  }

  .e-label {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 0.75em;
    color: #999;
    flex-shrink: 0;

    .e-icon {
      color: #f9a825;
    }
  }

  .e-hint {
    font-size: 0.78em;
    color: #bbb;
  }

  .e-pick {
    font-size: 0.78em;
    color: #8d6e00;
    border: 1px dashed #f9a825;
    border-radius: 999px;
    background: #fff;
    padding: 1px 6px;
    cursor: pointer;
    max-width: 14em;

    &:hover {
      background: #fffde7;
    }
  }

  .e-chip {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    border: 1px solid #ffe082;
    background: #fffde7;
    border-radius: 999px;
    padding: 2px 4px 2px 8px;
    font-size: 0.78em;
    color: #8d6e00;

    .e-chip-text {
      max-width: 12em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .e-unlink {
    flex-shrink: 0;
    border: none;
    background: transparent;
    color: currentColor;
    opacity: 0.7;
    font-size: 1.05em;
    line-height: 1;
    padding: 0 4px;
    cursor: pointer;

    &:hover {
      opacity: 1;
    }
  }
`;
