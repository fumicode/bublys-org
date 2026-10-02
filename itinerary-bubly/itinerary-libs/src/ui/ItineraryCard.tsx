'use client';
/** 旅程 1 件の札 ── 一覧の中の泡 */
import { ComponentPropsWithoutRef, FC } from "react";
import styled from "styled-components";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { Itinerary_旅程 } from "../domain/Itinerary.domain.js";

/**
 * 旅程 1 件の札。
 *
 * ★ **消す口は札に置く**（一覧の外ではなく）。消したいのは「この 1 件」なので、
 *   その 1 件の上に口がある方が、どれが消えるか間違えようがない。
 * ★ **訊かずに消す。** `window.confirm` は OS のダイアログで、この海の外に出てしまう
 *   ── 泡の中の話が泡の外に出る。訊くなら確認の泡を 1 枚開くのが筋（メモがそうしている）。
 */
export const ItineraryCard: FC<{
  itinerary: Itinerary_旅程;
  /** 消す口。渡さなければ出ない（消せない場所でも同じ札を使うため） */
  onRemove?: () => void;
}> = ({ itinerary, onRemove }) => {
  const days = itinerary.dates.length;
  const items = itinerary.days.reduce((n, d) => n + d.items.length, 0);
  return (
    <StyledCard>
      <ObjectView
        type="Itinerary"
        url={`itineraries/${itinerary.id}`}
        label={itinerary.title}
        openingPosition="bubble-side-right"
        draggable
        fullWidth
      >
        <span className="e-body">
          <span className="e-text">
            <span className="e-title">{itinerary.title}</span>
            <span className="e-meta">{days}日・{items}件</span>
          </span>
          <span className="e-cost">¥{itinerary.totalCost.toLocaleString("ja-JP")}</span>
        </span>
      </ObjectView>
      {onRemove && (
        <button
          type="button"
          className="e-remove"
          title="この旅程を消す"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ✕
        </button>
      )}
    </StyledCard>
  );
};

const StyledCard = styled.div<ComponentPropsWithoutRef<'div'>>`
  display: flex;
  align-items: center;
  height: 100%;
  padding: 6px 10px;
  box-sizing: border-box;
  font: 13px/1.5 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  color: #1b2029;

  .e-body { display: flex; align-items: center; gap: 8px; width: 100%; min-width: 0; }
  .e-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .e-title { font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .e-meta { color: #666; font-size: 0.8em; }
  .e-cost { flex-shrink: 0; color: #444; font-variant-numeric: tabular-nums; }
  .e-remove {
    flex-shrink: 0;
    width: 18px; height: 18px;
    margin-left: 4px;
    border: none; background: transparent;
    color: #999; cursor: pointer; line-height: 1;
    font-size: 12px;
  }
  .e-remove:hover { color: #d23; }
`;
