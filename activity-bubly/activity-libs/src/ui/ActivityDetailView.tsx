'use client';
/** アクティビティ 1 件の詳細。画像の札に当たるもの */
import { ComponentPropsWithoutRef, FC, ReactNode } from "react";
import styled from "styled-components";
import { EditableText } from "@bublys-org/bubbles-ui";
import { Activity_アクティビティ } from "../domain/Activity.domain.js";

export type ActivityDetailViewProps = {
  activity: Activity_アクティビティ;
  /** 開催場所（地図の地点を指す `ObjectView`。作るのは feature 層） */
  spot?: ReactNode;
  onNameChange?: (name: string) => void;
  onDescriptionChange?: (description: string) => void;
  onFocus?: () => void;
};

export const ActivityDetailView: FC<ActivityDetailViewProps> = ({
  activity,
  spot,
  onNameChange,
  onDescriptionChange,
  onFocus,
}) => (
  <StyledDetail onClick={onFocus}>
    <h3 className="e-name">
      <EditableText value={activity.name} onSave={(v) => onNameChange?.(v)} />
      <span className="e-rating">★ {activity.rating.toFixed(1)}（{activity.reviewCount}件）</span>
    </h3>

    <dl className="e-rows">
      <dt>所要時間</dt>
      <dd>{activity.durationLabel}</dd>
      <dt>料金</dt>
      <dd>{activity.priceLabel}</dd>
      <dt>開催場所</dt>
      <dd>{spot ?? "—"}</dd>
    </dl>

    <p className="e-description">
      <EditableText value={activity.description} onSave={(v) => onDescriptionChange?.(v)} />
    </p>

    {/*
      ★ ここに「旅程に追加」の口は置かない。**押す相手（どの旅程か）をここが知ってしまう**と、
        アクティビティが旅程に依存して一方通行が崩れる。代わりに掴んで落とす
        ── 運ぶ仕組みは OS が持っているので、こちらは「掴める」とだけ言えばよい。
    */}
    <p className="e-hint">掴んで旅程に落とすと、その日の予定に入ります。</p>
  </StyledDetail>
);

const StyledDetail = styled.div<ComponentPropsWithoutRef<'div'>>`
  padding: 12px 14px;
  font: 13px/1.6 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  color: #1b2029;

  .e-name { margin: 0 0 10px; font-size: 15px; display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .e-rating { color: #e0a800; font-size: 0.8em; font-weight: normal; }

  .e-rows { display: grid; grid-template-columns: 5.5em 1fr; gap: 2px 10px; margin: 0 0 10px; }
  dt { color: #666; }
  dd { margin: 0; min-width: 0; }

  .e-description { margin: 0; color: #333; }
  .e-hint { margin: 12px 0 0; color: #666; font-size: 0.85em; }
`;
