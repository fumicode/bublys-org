'use client';
/** 地点 1 つの詳細。名前と種類と、どこに在るか */
import { ComponentPropsWithoutRef, FC } from "react";
import styled from "styled-components";
import { EditableText, useFocusedObject } from "@bublys-org/bubbles-ui";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { Spot_地点 } from "../domain/Spot.domain.js";
import { selectSpotById, updateSpot } from "../slice/map-slice.js";

export const SpotDetail: FC<{ spotId: string }> = ({ spotId }) => {
  const dispatch = useAppDispatch();
  const spot = useAppSelector(selectSpotById(spotId));
  const { setFocusedObjectId } = useFocusedObject();

  if (!spot) return <StyledSpotDetail>この地点は見つかりませんでした。</StyledSpotDetail>;

  return (
    <StyledSpotDetail onClick={() => setFocusedObjectId(spot.id)}>
      <div className="e-head">
        <span className="e-dot" style={{ background: Spot_地点.categoryColor(spot.category) }} />
        <h3 className="e-name">
          <EditableText
            value={spot.name}
            onSave={(name) => dispatch(updateSpot(spot.withName(name).toPlain()))}
          />
        </h3>
      </div>
      <dl className="e-rows">
        <dt>種類</dt>
        <dd>{Spot_地点.categoryLabel(spot.category)}</dd>
        <dt>緯度</dt>
        <dd>{spot.lat.toFixed(4)}</dd>
        <dt>経度</dt>
        <dd>{spot.lng.toFixed(4)}</dd>
      </dl>
      <p className="e-hint">掴んで旅程に落とすと、立ち寄り先として予定に入ります。</p>
    </StyledSpotDetail>
  );
};

const StyledSpotDetail = styled.div<ComponentPropsWithoutRef<'div'>>`
  padding: 12px 14px;
  font: 13px/1.6 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  color: #1b2029;

  .e-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .e-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
  .e-name { margin: 0; font-size: 15px; }

  .e-rows { display: grid; grid-template-columns: 4em 1fr; gap: 2px 10px; margin: 0; }
  dt { color: #666; }
  dd { margin: 0; }

  .e-hint { margin: 12px 0 0; color: #666; font-size: 0.85em; }
`;
