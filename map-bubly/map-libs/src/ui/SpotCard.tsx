'use client';
/**
 * 地点 1 つの札 ── 一覧や、ほかのバブリの中に置かれる小さな姿。
 *
 * > **指したものは、どこに写っていても一緒に光る。**
 *
 * ★ 指すことは OS の文脈（`useFocusedObject`）に預ける。札が自前の「選択中」を持つと、
 *   同じ地点が地図のピンと一覧の札の 2 か所に写っているのに、**片方だけ光る**
 *   ── 同じものだと分からなくなる。
 * ★ 押したら指す。地図のピン・旅程の行・一覧の札、どれを押しても同じ所へ書くので、
 *   **3 つが一覧を介して繋がる**（指しているのは id 1 つ）。
 */
import { ComponentPropsWithoutRef, FC } from "react";
import styled from "styled-components";
import { ObjectView, useFocusedObject } from "@bublys-org/bubbles-ui";
import { Spot_地点 } from "../domain/Spot.domain.js";

export const SpotCard: FC<{ spot: Spot_地点 }> = ({ spot }) => {
  const { focusedObjectId, setFocusedObjectId } = useFocusedObject();
  return (
  <StyledSpot
    className={focusedObjectId === spot.id ? "is-focused" : ""}
    onClick={() => setFocusedObjectId(spot.id)}
  >
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
};

const StyledSpot = styled.div<ComponentPropsWithoutRef<'div'>>`
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

  /* 指されている札。旅程の行と同じ色で光る ── 同じものだと見て分かるように */
  &.is-focused {
    background: #fffbe6;
    box-shadow: inset 0 0 0 2px #f0b429;
    border-radius: 6px;
  }
`;
