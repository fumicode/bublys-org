'use client';
/**
 * 旅程の見た目 ── 日の見出しと、その日の予定の並び。
 *
 * ★ **面ぜんぶが受け皿**（ポケットと同じ決まり）。アクティビティや地点を、行の上でも
 *   余白でも、どこに落としても入る ── 「どこに落とせばよいか」を覚えさせない。
 * ★ ここは何も覚えない。落ちてきたものは「これが落ちた」と外へ言うだけで、
 *   予定に直すのは集約の仕事。
 */
import { ComponentPropsWithoutRef, DragEvent as ReactDragEvent, FC, ReactNode, useState } from "react";
import styled from "styled-components";
import { EditableText } from "@bublys-org/bubbles-ui";
import { Itinerary_旅程 } from "../domain/Itinerary.domain.js";
import { ItineraryItem_予定, formatMin, parseMin } from "../domain/ItineraryItem.domain.js";

export type ItineraryViewProps = {
  itinerary: Itinerary_旅程;
  /** いま見ている日 */
  date: string;
  onSelectDate?: (date: string) => void;
  onTitleChange?: (title: string) => void;
  /** 予定の行を押したとき（開催場所を「指したもの」にする） */
  onFocusItem?: (item: ItineraryItem_予定) => void;
  /** いま指されている地点（行が光る） */
  focusedSpotId?: string | null;
  onItemTitleChange?: (item: ItineraryItem_予定, title: string) => void;
  onItemTimeChange?: (item: ItineraryItem_予定, startMin: number, endMin: number) => void;
  onRemoveItem?: (item: ItineraryItem_予定) => void;
  /** 落ちてきたものを受ける。受けられたら true を返す */
  onDropPayload?: (e: ReactDragEvent) => boolean;
  /** 受け取れる型かどうか（`dragover` では中身が読めないので型だけ見る） */
  canAccept?: (e: ReactDragEvent) => boolean;
  /** 日ごとの場所の名前（地図から引いたもの） */
  spotNameOf?: (spotId: string) => string | undefined;
  /** 並びの上に出す口 */
  head?: ReactNode;
};

export const ItineraryView: FC<ItineraryViewProps> = ({
  itinerary,
  date,
  onSelectDate,
  onTitleChange,
  onFocusItem,
  focusedSpotId,
  onItemTitleChange,
  onItemTimeChange,
  onRemoveItem,
  onDropPayload,
  canAccept,
  spotNameOf,
  head,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const day = itinerary.day(date);

  const handleDragOver = (e: ReactDragEvent) => {
    if (!onDropPayload || !canAccept?.(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  };
  const handleDragLeave = (e: ReactDragEvent) => {
    // 中を移っただけなら消さない
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragOver(false);
  };
  const handleDrop = (e: ReactDragEvent) => {
    setDragOver(false);
    if (!onDropPayload) return;
    if (onDropPayload(e)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <StyledItinerary
      data-drag-over={dragOver ? "on" : "off"}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="e-head">
        <h3 className="e-title">
          <EditableText value={itinerary.title} onSave={(v) => onTitleChange?.(v)} />
        </h3>
        {head}
      </header>

      <nav className="e-dates">
        {itinerary.dates.map((d) => (
          <button
            key={d}
            type="button"
            className={d === date ? "is-current" : ""}
            onClick={() => onSelectDate?.(d)}
          >
            {shortDate(d)}
          </button>
        ))}
      </nav>

      <ol className="e-items">
        {(day?.items ?? []).map((item) => {
          const focused = !!item.spotId && item.spotId === focusedSpotId;
          return (
            <li
              key={item.id}
              className={`e-item ${focused ? "is-focused" : ""}`}
              onClick={() => onFocusItem?.(item)}
            >
              <span className="e-time">
                <EditableText
                  value={item.timeLabel.split(" - ")[0]}
                  onSave={(v) => {
                    const start = parseMin(v);
                    if (start === undefined) return;
                    onItemTimeChange?.(item, start, start + (item.endMin - item.startMin));
                  }}
                />
                <span className="e-time-end">{formatMin(item.endMin)}</span>
              </span>
              <span
                className="e-kind"
                style={{ background: ItineraryItem_予定.kindColor(item.kind) }}
                title={ItineraryItem_予定.kindLabel(item.kind)}
              />
              <span className="e-body">
                <span className="e-item-title">
                  <EditableText value={item.title} onSave={(v) => onItemTitleChange?.(item, v)} />
                </span>
                {item.spotId && spotNameOf?.(item.spotId) && (
                  <span className="e-spot">{spotNameOf(item.spotId)}</span>
                )}
              </span>
              <span className="e-cost">{item.costLabel}</span>
              {onRemoveItem && (
                <button
                  type="button"
                  className="e-remove"
                  title="この予定を外す"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(item);
                  }}
                >
                  ✕
                </button>
              )}
            </li>
          );
        })}
        {(day?.items.length ?? 0) === 0 && (
          <li className="e-empty">この日はまだ何もありません。アクティビティや地点を掴んで落としてください。</li>
        )}
      </ol>

      <footer className="e-foot">
        <span>この日の合計</span>
        <strong>¥{(day?.totalCost ?? 0).toLocaleString("ja-JP")}</strong>
        <span className="e-total">（全体 ¥{itinerary.totalCost.toLocaleString("ja-JP")}）</span>
      </footer>
    </StyledItinerary>
  );
};

/** `2026-05-17` → `5/17(日)` */
const shortDate = (date: string): string => {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  const week = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${week})`;
};

const StyledItinerary = styled.div<ComponentPropsWithoutRef<'div'>>`
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  font: 12px/1.5 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  color: #1b2029;
  border-radius: 10px;

  /* 受け取れるものを掴んで来たら、面ぜんぶが受け皿だと判るようにする */
  &[data-drag-over='on'] {
    box-shadow: inset 0 0 0 2px #1f6fd0;
    background: rgba(31, 111, 208, 0.06);
  }

  .e-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .e-title { margin: 0; font-size: 14px; flex: 1; min-width: 0; }

  .e-dates { display: flex; gap: 4px; margin-bottom: 6px; flex-wrap: wrap; }
  .e-dates button {
    padding: 3px 10px;
    border: 1px solid rgba(0, 0, 0, 0.14);
    border-radius: 12px;
    background: #fff;
    font-size: 11px;
    cursor: pointer;
    color: #1b2029;
  }
  .e-dates button.is-current { background: #1f6fd0; border-color: #1f6fd0; color: #fff; font-weight: bold; }

  .e-items { flex: 1; min-height: 0; overflow: auto; list-style: none; margin: 0; padding: 0; }
  .e-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 4px 4px 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 6px;
    cursor: default;
  }
  /* 指されているものは光る ── 地図のピン・アクティビティの札と同じ色 */
  .e-item.is-focused { background: #fffbe6; box-shadow: inset 0 0 0 2px #f0b429; }

  .e-time { flex-shrink: 0; width: 84px; color: #444; font-variant-numeric: tabular-nums; }
  .e-time-end::before { content: ' - '; color: #999; }
  .e-kind { flex-shrink: 0; width: 4px; align-self: stretch; border-radius: 2px; }
  .e-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .e-item-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .e-spot { color: #666; font-size: 0.85em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .e-cost { flex-shrink: 0; color: #444; font-variant-numeric: tabular-nums; }
  .e-remove {
    flex-shrink: 0;
    width: 18px; height: 18px;
    border: none; background: transparent;
    color: #999; cursor: pointer; line-height: 1;
  }
  .e-remove:hover { color: #c0392b; }

  .e-empty { padding: 14px 4px; color: #888; }

  .e-foot {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding-top: 6px;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    color: #444;
  }
  .e-total { color: #888; font-size: 0.9em; }
`;
