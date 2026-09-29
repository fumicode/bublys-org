'use client';
/** アクティビティ 1 件 ── 入れ物と地図（開催場所）を、詳細の見た目に繋ぐ */
import { FC } from "react";
import { ObjectView, useFocusedObject } from "@bublys-org/bubbles-ui";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { selectSpotById } from "@bublys-org/map-libs";
import { ActivityDetailView } from "../ui/ActivityDetailView.js";
import { selectActivityById, updateActivity } from "../slice/activity-slice.js";

export const ActivityDetail: FC<{ activityId: string }> = ({ activityId }) => {
  const dispatch = useAppDispatch();
  const activity = useAppSelector(selectActivityById(activityId));
  /**
   * ★ **場所は地図に聞く。** 名前をこちらに持たないので、地図で直せばここも直る。
   *   `spotId` が空文字でもセレクタは動く（見つからないだけ）。
   */
  const spot = useAppSelector(selectSpotById(activity?.spotId ?? ""));
  const { setFocusedObjectId } = useFocusedObject();

  if (!activity) {
    return <div style={{ padding: 12, color: "#666" }}>このアクティビティは見つかりませんでした。</div>;
  }

  return (
    <ActivityDetailView
      activity={activity}
      spot={
        spot && (
          /* 開催場所は地点そのもの。掴んで運べるし、ダブルクリックで地点の泡が開く */
          <ObjectView object={spot} label={spot.name} onClick={() => setFocusedObjectId(spot.id)}>
            <span>{spot.name}</span>
          </ObjectView>
        )
      }
      onNameChange={(name) => dispatch(updateActivity(activity.withName(name).toPlain()))}
      onDescriptionChange={(d) => dispatch(updateActivity(activity.withDescription(d).toPlain()))}
      onFocus={() => spot && setFocusedObjectId(spot.id)}
    />
  );
};
