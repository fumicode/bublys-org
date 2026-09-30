'use client';
/** 宿 1 軒の札 ── 一覧や、ほかのバブリの中に置かれる小さな姿 */
import { FC } from "react";
import styled from "styled-components";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { Lodging_宿 } from "../domain/Lodging.domain.js";

export const LodgingCard: FC<{ lodging: Lodging_宿 }> = ({ lodging }) => (
  <StyledLodging>
    <ObjectView
      type="Lodging"
      url={`lodgings/${lodging.id}`}
      label={lodging.name}
      openingPosition="bubble-side-right"
      draggable
      fullWidth
    >
      <span className="e-body">
        <span className="e-name">{lodging.name}</span>
        {lodging.kind && <span className="e-kind">{lodging.kind}</span>}
        <span className="e-place">{lodging.placeLabel}</span>
      </span>
    </ObjectView>
  </StyledLodging>
);

const StyledLodging = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
  padding: 6px 10px;
  box-sizing: border-box;
  font: 13px/1.5 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  color: #1b2029;

  .e-body { display: flex; align-items: center; gap: 8px; width: 100%; min-width: 0; }
  .e-name { flex: 1; min-width: 0; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .e-kind { flex-shrink: 0; padding: 0 6px; border-radius: 8px; background: #edf2f7; color: #4a5568; font-size: 0.75em; }
  .e-place { flex-shrink: 0; color: #718096; font-size: 0.8em; }
`;
