'use client';

import { DragEvent, FC, useState } from "react";
import type { HTMLAttributes } from "react";
import styled from "styled-components";
import AssessmentIcon from "@mui/icons-material/Assessment";
import { ObjectView, parseDragPayload } from "@bublys-org/bubbles-ui";
import { ScheduleReport } from "../domain/index.js";
import { formatConfirmedAt } from "./formatConfirmedAt.js";

/** 参照レポートの候補1件（確定時刻つき。同じ月に確定が複数あるとき見分ける手がかり） */
export type ReferenceOption = {
  report: ScheduleReport;
  /** 確定した時刻（epoch ms）。分からなければ undefined */
  confirmedAt?: number;
};

type LinkedReportsViewProps = {
  /** この勤務表の参照レポート（紐づけは1つだけ）。無ければ undefined */
  linked: ReferenceOption | undefined;
  /**
   * 紐づけられるレポート（同じ店舗の前月の確定。確定の新しい順）。
   * 渡すと「選んで紐づける」プルダウンが出る。今の参照レポートは含めなくてよい（ここで除く）。
   */
  candidates?: ReferenceOption[];
  /** 今の参照より新しい前月の確定（あれば取り込みを促す。勝手には差し替えない） */
  newer?: ReferenceOption;
  /** レポートを選んだとき呼ぶ（今の参照レポートと置き換わる） */
  onLink?: (reportId: string) => void;
  /**
   * レポートの URL をドロップしたとき呼ぶ。渡すとエリアが drop を受け付け、
   * そのレポートを紐づけられる。dropAcceptTypes と併せて指定する。
   */
  onDropUrl?: (url: string) => void;
  /** 受け付けるドラッグ型（ScheduleReport の drag type）。 */
  dropAcceptTypes?: string[];
  /** 紐づけを外すとき呼ぶ。渡すとバッジに × が付く。 */
  onUnlink?: () => void;
  /** 紐づけ中（確定版の読み出しは非同期） */
  busy?: boolean;
};

/** 参照レポートが勤務表のどこに効くか（ラベルの説明に出す） */
const EFFECT_HINT =
  "参照レポートは前月の確定版です。その確定版の月末が、この勤務表の月初につながります（連勤・遅番明けを月を跨いで数えます）。" +
  "貢献度（★）を休みの優先度に使うかは、制約欄の「★優先」で切り替えます。";

const optionLabel = ({ report, confirmedAt }: ReferenceOption): string => {
  const title =
    report.title === ScheduleReport.defaultTitle(report.year, report.month)
      ? report.title
      : `${report.title}（${report.year}年${report.month}月）`;
  const at = formatConfirmedAt(confirmedAt);
  return at ? `${title} ・ 確定 ${at}` : title;
};

/**
 * 勤務表の参照レポートを表示・紐づけする（プレゼンテーショナル）。
 *
 * 参照レポートにできるのは同じ店舗の前月の確定だけなので、参照レポートを選ぶことが
 * そのまま「この勤務表がどの前月の確定版から続くか」を選ぶことになる。
 * 紐づけ方は2通り。主にはプルダウンで選ぶ（紐づいていればバッジの ▾ から選び直す。
 * 紐づけは1つなので、選び直しの入口は今のレポートの表示そのものに置く）。レポートをドラッグして落としてもよい
 * （責任者ルールに Staff をドロップで追加する {@link LeaderRuleDiagram} と同じ drop パターン:
 * dragover で型だけ判定→drop で parseDragPayload）。紐づけは1つなので、どちらでも置き換わる。
 * バッジはダブルクリックでレポートバブルを開く（ObjectView の既定挙動）。
 * 確定日時は、同じ月に確定が複数あるとき見分けられるよう小さく添える。
 */
export const LinkedReportsView: FC<LinkedReportsViewProps> = ({
  linked,
  candidates = [],
  newer,
  onLink,
  onDropUrl,
  dropAcceptTypes,
  onUnlink,
  busy = false,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const droppable = !!onDropUrl;
  const report = linked?.report;
  const choices = candidates.filter((c) => c.report.id !== report?.id);
  // 選び直しの選択肢：今のレポートも含めて並べ、今のものを選択状態にする
  // （候補から外れた古い紐づけでも、今のものとして見えるよう先頭に足す）
  const switchOptions =
    linked && !candidates.some((c) => c.report.id === linked.report.id)
      ? [linked, ...candidates]
      : candidates;

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
      {linked && report && (
        <span className="e-chip" title={EFFECT_HINT}>
          <ObjectView
            object={report}
            label={report.title}
            draggable={false}
            openingPosition="origin-side"
          >
            <span className="e-chip-text">{report.title}</span>
          </ObjectView>
          {linked.confirmedAt !== undefined && (
            <span className="e-at">確定 {formatConfirmedAt(linked.confirmedAt)}</span>
          )}
          {onLink && choices.length > 0 && (
            <span className="e-switch" title="ほかの前月の確定に選び直す">
              ▾
              <select
                className="e-switch-select"
                value={linked.report.id}
                disabled={busy}
                onChange={(e) => {
                  if (e.target.value && e.target.value !== linked.report.id) onLink(e.target.value);
                }}
                aria-label="参照レポートを選び直す"
              >
                {switchOptions.map((c) => (
                  <option key={c.report.id} value={c.report.id}>
                    {optionLabel(c)}
                  </option>
                ))}
              </select>
            </span>
          )}
          {onUnlink && (
            <button
              type="button"
              className="e-unlink"
              onClick={onUnlink}
              disabled={busy}
              title={`「${report.title}」の紐づけを外す（前月とのつなぎも外れ、今月1日から数えます）`}
              aria-label={`「${report.title}」の紐づけを外す`}
            >
              ×
            </button>
          )}
        </span>
      )}
      {!report && onLink && choices.length > 0 && (
        <select
          className="e-pick"
          value=""
          disabled={busy}
          onChange={(e) => {
            if (e.target.value) onLink(e.target.value);
          }}
          title="同じ店舗の、前月の確定から選べます"
          aria-label="参照レポートを選んで紐づける"
        >
          <option value="">＋ 選んで紐づける</option>
          {choices.map((c) => (
            <option key={c.report.id} value={c.report.id}>
              {optionLabel(c)}
            </option>
          ))}
        </select>
      )}
      {!report && choices.length === 0 && (
        <span className="e-hint">
          {droppable ? "紐づけられるレポートがありません（同じ店舗の前月の確定）" : "なし"}
        </span>
      )}
      {newer && onLink && (
        <span className="e-newer">
          新しい確定版（{newer.report.title}）
          <button
            type="button"
            className="e-take"
            disabled={busy}
            onClick={() => onLink(newer.report.id)}
          >
            取り込む
          </button>
        </span>
      )}
      {busy && <span className="e-hint">読み込み中…</span>}
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

  .e-at {
    margin-left: 2px;
    font-size: 0.85em;
    color: #b0a060;
    white-space: nowrap;
  }

  /* 選び直しの ▾。透明な select を重ねて、▾ を押すとそのまま選択肢が開くようにする */
  .e-switch {
    position: relative;
    display: inline-flex;
    align-items: center;
    padding: 0 3px;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      background: #fff3c4;
    }
  }

  .e-switch-select {
    position: absolute;
    inset: 0;
    width: 100%;
    opacity: 0;
    cursor: pointer;
    font-size: 1em;
  }

  .e-newer {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75em;
    color: #e65100;
    background: #fff3e0;
    border-radius: 4px;
    padding: 1px 6px;
  }

  .e-take {
    font-size: 1em;
    cursor: pointer;
  }
`;
