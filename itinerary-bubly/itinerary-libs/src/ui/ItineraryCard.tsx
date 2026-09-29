'use client';
/** 旅程 1 件の札 ── 一覧の中の泡 */
import { ComponentPropsWithoutRef, FC } from "react";
import styled from "styled-components";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { Itinerary_旅程 } from "../domain/Itinerary.domain.js";

export const ItineraryCard: FC<{ itinerary: Itinerary_旅程 }> = ({ itinerary }) => {
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
`;
