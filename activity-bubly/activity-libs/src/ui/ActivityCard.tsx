'use client';
/**
 * アクティビティ 1 件の札 ── 一覧の中で 1 つの泡になる中身。
 *
 * ★ 掴めるのが要（`ObjectView`）。**旅程に落とすと予定になる**ので、札そのものが
 *   「旅程へ持って行けるもの」でなければならない。
 */
import { ComponentPropsWithoutRef, FC } from "react";
import styled from "styled-components";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { Activity_アクティビティ } from "../domain/Activity.domain.js";

export type ActivityCardProps = {
  activity: Activity_アクティビティ;
  /** 開催場所の名前（地図が持っている。引くのは feature 層の仕事） */
  spotName?: string;
  /** いま指されているか（地図のピンと同時に光る） */
  focused?: boolean;
  /** 押したとき ── 開催場所を「指したもの」にする */
  onFocus?: () => void;
};

export const ActivityCard: FC<ActivityCardProps> = ({ activity, spotName, focused, onFocus }) => (
  <StyledCard data-focused={focused ? "on" : "off"}>
    <ObjectView
      type="Activity"
      url={`activities/${activity.id}`}
      label={activity.name}
      openingPosition="bubble-side-right"
      draggable
      fullWidth
      onClick={onFocus}
    >
      <span className="e-body">
        <span className="e-text">
          <span className="e-name">{activity.name}</span>
          <span className="e-meta">
            {spotName && <span className="e-spot">{spotName}</span>}
            <span>{activity.durationLabel}</span>
            <span>{activity.priceLabel}</span>
          </span>
        </span>
        <span className="e-rating">★ {activity.rating.toFixed(1)}</span>
      </span>
    </ObjectView>
  </StyledCard>
);

const StyledCard = styled.div<ComponentPropsWithoutRef<'div'>>`
  display: flex;
  align-items: center;
  height: 100%;
  padding: 6px 10px;
  box-sizing: border-box;
  font: 13px/1.5 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  color: #1b2029;
  border-radius: 10px;

  /* 指されているものは光る ── 地図のピンと同じ色で（同じことの合図なので） */
  &[data-focused='on'] {
    background: #fffbe6;
    box-shadow: inset 0 0 0 2px #f0b429;
  }

  .e-body { display: flex; align-items: center; gap: 8px; width: 100%; min-width: 0; }
  .e-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .e-name { font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .e-meta { display: flex; gap: 8px; color: #666; font-size: 0.8em; white-space: nowrap; overflow: hidden; }
  .e-spot { overflow: hidden; text-overflow: ellipsis; }
  .e-rating { flex-shrink: 0; color: #e0a800; font-weight: bold; font-size: 0.85em; }
`;
