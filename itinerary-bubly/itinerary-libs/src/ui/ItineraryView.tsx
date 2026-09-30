'use client';
/**
 * 旅程の見た目 ── 日の見出しと、その日の予定の並び。
 *
 * ★ **面ぜんぶが受け皿**（ポケットと同じ決まり）。アクティビティや地点を、行の上でも
 *   余白でも、どこに落としても入る ── 「どこに落とせばよいか」を覚えさせない。
 * ★ ここは何も覚えない。落ちてきたものは「これが落ちた」と外へ言うだけで、
 *   予定に直すのは集約の仕事。
 */
import {
  ComponentPropsWithoutRef,
  DragEvent as ReactDragEvent,
  FC,
  ReactNode,
  useEffect,
  useState,
} from "react";
import styled from "styled-components";
import { EditableText } from "@bublys-org/bubbles-ui";
import { Itinerary_旅程 } from "../domain/Itinerary.domain.js";
import { ItineraryItem_予定, formatMin, parseMin, type ObjectRef } from "../domain/ItineraryItem.domain.js";

export type ItineraryViewProps = {
  itinerary: Itinerary_旅程;
  /** いま見ている日 */
  date: string;
  onSelectDate?: (date: string) => void;
  onTitleChange?: (title: string) => void;
  /** 予定の行を押したとき（立ち寄り先を「指したもの」にする） */
  onFocusItem?: (item: ItineraryItem_予定) => void;
  /** いま指されているものの id（行が光る） */
  focusedObjectId?: string | null;
  onItemTitleChange?: (item: ItineraryItem_予定, title: string) => void;
  /** 始まりを動かす（長さはそのまま。決まりは集約が持つ） */
  onItemStartChange?: (item: ItineraryItem_予定, startMin: number) => void;
  /** 終わりを動かす（長さが変わる） */
  onItemEndChange?: (item: ItineraryItem_予定, endMin: number) => void;
  onItemCostChange?: (item: ItineraryItem_予定, cost: number) => void;
  onRemoveItem?: (item: ItineraryItem_予定) => void;
  /** 落ちてきたものを受ける。受けられたら true を返す */
  onDropPayload?: (e: ReactDragEvent) => boolean;
  /** 受け取れる型かどうか（`dragover` では中身が読めないので型だけ見る） */
  canAccept?: (e: ReactDragEvent) => boolean;
  /**
   * 立ち寄り先の名前。**引くのは feature 層の仕事**（持ち主に訊く）。
   * ここは受け取って出すだけで、相手が誰なのかは知らない。
   */
  nameOfRef?: (ref: ObjectRef) => string | undefined;
  /** 並びの上に出す口 */
  head?: ReactNode;
};

export const ItineraryView: FC<ItineraryViewProps> = ({
  itinerary,
  date,
  onSelectDate,
  onTitleChange,
  onFocusItem,
  focusedObjectId,
  onItemTitleChange,
  onItemStartChange,
  onItemEndChange,
  onItemCostChange,
  onRemoveItem,
  onDropPayload,
  canAccept,
  nameOfRef,
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
        {(day?.items ?? []).map((item) => (
          <ItineraryRow
            key={item.id}
            item={item}
            focused={!!item.ref && item.ref.id === focusedObjectId}
            placeName={item.ref ? nameOfRef?.(item.ref) : undefined}
            onFocus={() => onFocusItem?.(item)}
            onTitleChange={onItemTitleChange && ((v) => onItemTitleChange(item, v))}
            onStartChange={onItemStartChange && ((v) => onItemStartChange(item, v))}
            onEndChange={onItemEndChange && ((v) => onItemEndChange(item, v))}
            onCostChange={onItemCostChange && ((v) => onItemCostChange(item, v))}
            onRemove={onRemoveItem && (() => onRemoveItem(item))}
          />
        ))}
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

/**
 * 予定 1 行 ── **打てる欄で作る**。
 *
 * ★ 前は字を押すと入れ替わる形（`EditableText`）だった。1 行に 4 つも並ぶと、
 *   どこが打てるのか分からないうえ、押すたびに欄が生えて行の幅が変わっていた。
 *   **最初から欄にして、囲みは触れたときだけ出す**ほうが、見た目は静かで手数も少ない。
 * ★ 時刻は `type="time"`。打つのも選ぶのも端末の作法に任せられるし、
 *   **読めない字を打てない** ── 前は「830」と打つと、黙って何も起きなかった。
 * ★ 字の欄は**打っている間は覚えておき、離れたときに渡す**。1 文字ごとに渡すと、
 *   集約が 1 文字ごとに作り直されて世界線が文字数ぶんの節で埋まる。
 */
const ItineraryRow: FC<{
  item: ItineraryItem_予定;
  focused: boolean;
  placeName?: string;
  onFocus?: () => void;
  onTitleChange?: (title: string) => void;
  onStartChange?: (startMin: number) => void;
  onEndChange?: (endMin: number) => void;
  onCostChange?: (cost: number) => void;
  onRemove?: () => void;
}> = ({ item, focused, placeName, onFocus, onTitleChange, onStartChange, onEndChange, onCostChange, onRemove }) => {
  const [title, setTitle] = useState(item.title);
  const [cost, setCost] = useState(String(item.cost));

  // 外で変わったら（世界線を戻した、ほかから直した）欄も合わせる
  useEffect(() => setTitle(item.title), [item.title]);
  useEffect(() => setCost(String(item.cost)), [item.cost]);

  const commitTitle = () => {
    const next = title.trim();
    if (!next) {
      // 名の無い予定は作らない。空にしたら元へ戻す
      setTitle(item.title);
      return;
    }
    if (next !== item.title) onTitleChange?.(next);
  };

  const commitCost = () => {
    const next = Number(cost);
    if (!Number.isFinite(next)) {
      setCost(String(item.cost));
      return;
    }
    if (next !== item.cost) onCostChange?.(next);
  };

  return (
    <li className={`e-item ${focused ? "is-focused" : ""}`} onClick={onFocus}>
      <span className="e-time">
        <input
          type="time"
          className="e-field e-time-field"
          value={formatMin(item.startMin)}
          disabled={!onStartChange}
          title="始まり（動かすと予定ごと動く）"
          onChange={(e) => {
            const v = parseMin(e.target.value);
            if (v !== undefined) onStartChange?.(v);
          }}
        />
        <input
          type="time"
          className="e-field e-time-field"
          value={formatMin(item.endMin)}
          disabled={!onEndChange}
          title="終わり（動かすと長さが変わる）"
          onChange={(e) => {
            const v = parseMin(e.target.value);
            if (v !== undefined) onEndChange?.(v);
          }}
        />
      </span>

      <span
        className="e-kind"
        style={{ background: ItineraryItem_予定.kindColor(item.kind) }}
        title={ItineraryItem_予定.kindLabel(item.kind)}
      />

      <span className="e-body">
        <input
          type="text"
          className="e-field e-title-field"
          value={title}
          disabled={!onTitleChange}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setTitle(item.title);
          }}
        />
        {placeName && <span className="e-spot">{placeName}</span>}
      </span>

      {/* 但し書きのある費用（宿泊費別など）は別勘定なので、打たせない */}
      {item.costNote ? (
        <span className="e-cost e-cost-note" title="別勘定">{item.costNote}</span>
      ) : (
        <span className="e-cost">
          <span className="e-yen">¥</span>
          <input
            type="number"
            min={0}
            step={10}
            className="e-field e-cost-field"
            value={cost}
            disabled={!onCostChange}
            onChange={(e) => setCost(e.target.value)}
            onBlur={commitCost}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setCost(String(item.cost));
            }}
          />
        </span>
      )}

      {onRemove && (
        <button
          type="button"
          className="e-remove"
          title="この予定を外す"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ✕
        </button>
      )}
    </li>
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

  /*
   * **欄は、触れるまで欄に見えない。**
   * 1 行に 4 つ並ぶので、全部に囲みを出すと表が線だらけになる。
   * 触れた・入れた所だけ囲む ── 打てることは、触れれば判る。
   */
  .e-field {
    font: inherit;
    color: inherit;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 1px 3px;
    min-width: 0;
  }
  .e-field:hover:not(:disabled) { border-color: rgba(0, 0, 0, 0.18); }
  .e-field:focus {
    outline: none;
    border-color: #1f6fd0;
    background: #fff;
  }
  .e-field:disabled { border-color: transparent; }

  .e-time {
    flex-shrink: 0;
    width: 74px;
    color: #444;
    display: flex;
    flex-direction: column;
    font-variant-numeric: tabular-nums;
  }
  .e-time-field { width: 100%; }
  /*
   * 端末が出す小さな時計の絵は消す。11px の行では読めない大きさのうえ、
   * 欄の幅を 20px 近く食う ── 打つのと上下キーはそのまま効く。
   */
  .e-time-field::-webkit-calendar-picker-indicator { display: none; }
  .e-kind { flex-shrink: 0; width: 4px; align-self: stretch; border-radius: 2px; }
  .e-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .e-title-field { width: 100%; }
  .e-spot { color: #666; font-size: 0.85em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .e-cost {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    color: #444;
    font-variant-numeric: tabular-nums;
  }
  .e-yen { color: #888; }
  .e-cost-field {
    width: 54px;
    text-align: right;
    /* 上下の小さな矢印は出さない ── 金額は打つもので、1 ずつ回すものではない */
    -moz-appearance: textfield;
  }
  .e-cost-field::-webkit-outer-spin-button,
  .e-cost-field::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .e-cost-note { color: #888; font-size: 0.9em; }
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
