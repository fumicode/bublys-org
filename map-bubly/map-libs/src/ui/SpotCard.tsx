'use client';
/** 地点 1 つの札 ── 一覧や、ほかのバブリの中に置かれる小さな姿 */
import { FC } from "react";
import styled from "styled-components";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { Spot_地点 } from "../domain/Spot.domain.js";

export const SpotCard: FC<{ spot: Spot_地点 }> = ({ spot }) => (
  <StyledSpot>
    <ObjectView
      type="Spot"
      url={`spots/${spot.id}`}
      label={spot.name}
      openingPosition="bubble-side-right"
      draggable
      fullWidth
    >
      <span className="e-body">
        <span className="e-dot" style={{ background: Spot_地点.categoryColor(spot.category) }} />
        <span className="e-name">{spot.name}</span>
        <span className="e-category">{Spot_地点.categoryLabel(spot.category)}</span>
      </span>
    </ObjectView>
  </StyledSpot>
);

const StyledSpot = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
  padding: 6px 10px;
  box-sizing: border-box;
  font: 13px/1.5 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  color: #1b2029;

  .e-body { display: flex; align-items: center; gap: 8px; width: 100%; min-width: 0; }
  .e-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .e-name { flex: 1; min-width: 0; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .e-category { flex-shrink: 0; color: #666; font-size: 0.8em; }
`;
