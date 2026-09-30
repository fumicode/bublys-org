'use client';
/**
 * 旅程 ── **その日の予定を並べる空間**。
 *
 * > 予定 1 件は、表の行ではなく**泡**。
 *
 * ★ 前は表だった。その場で打てるのは良かったが、行は泡ではないので
 *   **掴めず、隣に開けず、指せなかった** ── この空間の繋がりは「掴んで渡す」で
 *   出来ているので、繋がれない中身は半人前になる。
 *   いまは 1 件ずつが札の泡で、直すのは開いた先（`ItineraryItemDetail`）。
 * ★ 並べ方（縦に並ぶ／奥に重なる）は器（`ListSpace`）に任せる ── 件数が増えても
 *   自分で畳み方を決めなくてよい。
 * ★ **面ぜんぶが受け皿**（ポケットと同じ決まり）。落としたものは予定になる。
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
import { ListSpace } from "@bublys-org/bubble-layout-feature";
import { Itinerary_旅程 } from "../domain/Itinerary.domain.js";

/** 札 1 枚の高さ（中身の数）。時刻 2 段・題名・場所が読める丈 */
export const ITEM_CARD_HEIGHT = 46;

/** 見出しの丈（題名の段＋日と合計の段）。**測らずに決める**（器の決まり） */
const HEAD_HEIGHT = 56;

export type ItineraryViewProps = {
  itinerary: Itinerary_旅程;
  /**
   * いま見ている日。**まだ 1 日も無いことがある**
   * ── 日を作るのはメモの仕事なので、渡される前は器だけ。
   */
  date?: string;
  onSelectDate?: (date: string) => void;
  onTitleChange?: (title: string) => void;
  /** 落ちてきたものを受ける。受けられたら true を返す */
  onDropPayload?: (e: ReactDragEvent) => boolean;
  /** 受け取れる型かどうか（`dragover` では中身が読めないので型だけ見る） */
  canAccept?: (e: ReactDragEvent) => boolean;
  /** 見出しに置く口 */
  head?: ReactNode;
  /**
   * **予定の札が、掴まれて外の空間へ出て行った。**
   *
   * ★ 渡さないと、出した札は次の走りで一覧に生え直す（顔ぶれを決めているのは
   *   旅程なので「足りない」と数えられる）── 掴んでも出せない、という形で出る。
   */
  onItemLeave?: (itemId: string) => void;
};

export const ItineraryView: FC<ItineraryViewProps> = ({
  itinerary,
  date,
  onSelectDate,
  onTitleChange,
  onDropPayload,
  canAccept,
  head,
  onItemLeave,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState(itinerary.title);
  useEffect(() => setTitle(itinerary.title), [itinerary.title]);

  const day = date ? itinerary.day(date) : undefined;
  const members = (day?.items ?? []).map((i) => `itinerary-items/${i.id}/card`);

  const handleDragOver = (e: ReactDragEvent) => {
    if (!onDropPayload || !canAccept?.(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  };
  const handleDragLeave = (e: ReactDragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragOver(false);
  };
  const handleDrop = (e: ReactDragEvent) => {
    setDragOver(false);
    if (onDropPayload?.(e)) {
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
      {/*
        ★ 見出しは**器の口として渡す**（`head`）。上に自分で置くと、
          並びは自分の箱いっぱいに広がるので**札が見出しに被る**（実測で踏んだ）。
          器は口のぶんだけ並びの始端を空けてくれる。
        ★ 丈も渡す ── 器の既定はボタン 1 つぶんで、題名と日と合計の 2 段は入らない。
      */}
      <ListSpace
        members={members}
        itemHeight={ITEM_CARD_HEIGHT}
        headHeight={HEAD_HEIGHT}
        /**
         * ★ **すぐ隣に出されたときだけ伝える。**
         *   隣（＝旅程が居るのと同じ空間＝本計画づくりの場）に出したのは「剥がした」。
         *   もっと外の海へ持ち出したのは、ほかの一覧と同じで**増えるだけ** ──
         *   一覧からは減らさない（そちらでは何も伝えない）。
         */
        onLeave={(url, at) => {
          if (!at.beside) return;
          onItemLeave?.(url.replace(/^itinerary-items\//, "").replace(/\/card$/, ""));
        }}
        head={
          <div className="e-head">
            <div className="e-line">
              <input
                className="e-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => title.trim() && title !== itinerary.title && onTitleChange?.(title.trim())}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
              {head}
            </div>
            <div className="e-line">
              {itinerary.dates.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`e-date ${d === date ? "is-current" : ""}`}
                  onClick={() => onSelectDate?.(d)}
                >
                  {shortDate(d)}
                </button>
              ))}
              <span className="e-total">
                この日 <strong>¥{(day?.totalCost ?? 0).toLocaleString("ja-JP")}</strong>
                <span className="e-all">／全体 ¥{itinerary.totalCost.toLocaleString("ja-JP")}</span>
              </span>
            </div>
          </div>
        }
      />
      {members.length === 0 && (
        <p className="e-empty">
          {itinerary.dates.length === 0
            ? "まだ空です。メモを掴んでここへ落とすと、書いたものが日ごとに入ります。"
            : "この日はまだ何もありません。メモや地点を掴んで落としてください。"}
        </p>
      )}
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
  padding: 8px 10px;
  font: 12px/1.5 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  color: #1b2029;
  border-radius: 10px;
  position: relative;

  /* 受け取れるものを掴んで来たら、面ぜんぶが受け皿だと判るようにする */
  &[data-drag-over='on'] {
    box-shadow: inset 0 0 0 2px #1f6fd0;
    background: rgba(31, 111, 208, 0.06);
  }

  .e-head { display: flex; flex-direction: column; gap: 3px; width: 100%; }
  .e-line { display: flex; align-items: center; gap: 4px; }

  .e-title {
    flex: 1; min-width: 0;
    font: inherit; font-size: 14px; font-weight: bold; color: inherit;
    background: transparent; border: 1px solid transparent; border-radius: 4px; padding: 1px 4px;
  }
  .e-title:hover { border-color: rgba(0, 0, 0, 0.18); }
  .e-title:focus { outline: none; border-color: #1f6fd0; background: #fff; }

  .e-date {
    padding: 2px 9px;
    border: 1px solid rgba(0, 0, 0, 0.14);
    border-radius: 11px;
    background: #fff;
    font-size: 11px;
    cursor: pointer;
    color: #1b2029;
  }
  .e-date.is-current { background: #1f6fd0; border-color: #1f6fd0; color: #fff; font-weight: bold; }
  .e-total { margin-left: auto; color: #4a5568; font-variant-numeric: tabular-nums; white-space: nowrap; font-size: 11px; }
  .e-all { color: #9aa1ab; margin-left: 6px; }

  .e-empty {
    position: absolute;
    left: 10px;
    top: 66px;
    margin: 0;
    color: #888;
    pointer-events: none;
  }
`;
