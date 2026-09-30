'use client';
/**
 * 予定 1 件の札 ── **一覧の中で 1 つの泡になる**中身。
 *
 * > 札は読むもの。**直すのは開いてから。**
 *
 * ★ 前は表の行で、時刻も題名も金額もその場で打てた。打てること自体は良かったが、
 *   **行は泡ではない**ので掴めず、隣に開けず、指すこともできなかった
 *   ── バブリどうしの繋がりは「掴んで渡す」で出来ているので、
 *   繋がれない中身は、この空間では半人前になる。
 * ★ だから札は**打てる所を持たない**。1 行に欄が 4 つ並んでいると、
 *   掴もうとして欄に入ってしまう ── 掴むものと打つものは、同じ面に置かない。
 */
import { ComponentPropsWithoutRef, FC } from "react";
import styled from "styled-components";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { ItineraryItem_予定 } from "../domain/ItineraryItem.domain.js";

export type ItineraryItemCardProps = {
  item: ItineraryItem_予定;
  /** 立ち寄り先の名前（持ち主に訊いたもの） */
  placeName?: string;
  /** いま指されているか */
  focused?: boolean;
  /** 押したとき ── 立ち寄り先を「指したもの」にする */
  onFocus?: () => void;
};

export const ItineraryItemCard: FC<ItineraryItemCardProps> = ({
  item,
  placeName,
  focused,
  onFocus,
}) => (
  <StyledCard data-focused={focused ? "on" : "off"}>
    <ObjectView
      type="ItineraryItem"
      id={item.id}
      url={`itinerary-items/${item.id}`}
      label={item.title}
      openingPosition="bubble-side-right"
      draggable
      fullWidth
      onClick={onFocus}
    >
      <span className="e-body">
        <span className="e-time">
          <span>{item.timeLabel.split(" - ")[0]}</span>
          <span className="e-time-end">{item.timeLabel.split(" - ")[1]}</span>
        </span>
        <span
          className="e-kind"
          style={{ background: ItineraryItem_予定.kindColor(item.kind) }}
          title={ItineraryItem_予定.kindLabel(item.kind)}
        />
        <span className="e-text">
          <span className="e-title">{item.title}</span>
          {placeName && <span className="e-place">{placeName}</span>}
        </span>
        <span className="e-cost">{item.costLabel}</span>
        {/* もとがあるものは、外せば盤に戻る ── 札の上では言うだけ（外すのは詳細で） */}
        {item.from && <span className="e-from" title="メモから来た予定">↩</span>}
      </span>
    </ObjectView>
  </StyledCard>
);

const StyledCard = styled.div<ComponentPropsWithoutRef<'div'>>`
  display: flex;
  align-items: center;
  height: 100%;
  padding: 4px 8px;
  box-sizing: border-box;
  border-radius: 8px;
  font: 12px/1.5 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  color: #1b2029;

  /* 指されているものは光る ── 地図のピン・アクティビティの札と同じ色 */
  &[data-focused='on'] { background: #fffbe6; box-shadow: inset 0 0 0 2px #f0b429; }

  .e-body { display: flex; align-items: center; gap: 6px; width: 100%; min-width: 0; }

  .e-time {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    width: 46px;
    color: #4a5568;
    font-variant-numeric: tabular-nums;
  }
  .e-time-end { color: #9aa1ab; }

  .e-kind { flex-shrink: 0; width: 4px; align-self: stretch; border-radius: 2px; }

  .e-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .e-title { font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .e-place { color: #6b7280; font-size: 0.85em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .e-cost { flex-shrink: 0; color: #4a5568; font-variant-numeric: tabular-nums; }
  .e-from { flex-shrink: 0; color: #9aa1ab; font-size: 0.9em; }
`;
