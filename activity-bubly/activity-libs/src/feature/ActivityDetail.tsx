'use client';
/**
 * アクティビティ 1 件 ── 入れ物と、開催場所を、詳細の見た目に繋ぐ。
 *
 * ★ **開催場所の持ち主を名指ししない。** 前は `selectSpotById` を地図から
 *   import していたので、地図が無いとアクティビティが成り立たなかった。
 *   いまは指（`place`）が型も持っているので、その持ち主に訊けばよい。
 */
import { FC } from "react";
import { ObjectView, resolveObjectPlain, useFocusedObject } from "@bublys-org/bubbles-ui";
import { getSchema, readRoleText } from "@bublys-org/domain-registry/schema";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { ActivityDetailView } from "../ui/ActivityDetailView.js";
import { selectActivityById, updateActivity } from "../slice/activity-slice.js";

export const ActivityDetail: FC<{ activityId: string }> = ({ activityId }) => {
  const dispatch = useAppDispatch();
  const activity = useAppSelector(selectActivityById(activityId));
  const place = activity?.place;

  /** 場所の名前 ── **持ち主に訊く**。相手の側で直せばここも直る */
  const placeName = useAppSelector((state) =>
    place
      ? readRoleText(getSchema(place.type), resolveObjectPlain(place.type, place.id, state), "title")
      : undefined,
  );
  const { setFocusedObjectId } = useFocusedObject();

  if (!activity) {
    return <div style={{ padding: 12, color: "#666" }}>このアクティビティは見つかりませんでした。</div>;
  }

  return (
    <ActivityDetailView
      activity={activity}
      spot={
        place &&
        placeName && (
          /* 開催場所は場所そのもの。掴んで運べるし、ダブルクリックでその泡が開く */
          <ObjectView
            type={place.type}
            id={place.id}
            label={placeName}
            openingPosition="bubble-side-right"
            onClick={() => setFocusedObjectId(place.id)}
          >
            <span>{placeName}</span>
          </ObjectView>
        )
      }
      onNameChange={(name) => dispatch(updateActivity(activity.withName(name).toPlain()))}
      onDescriptionChange={(d) => dispatch(updateActivity(activity.withDescription(d).toPlain()))}
      onFocus={() => place && setFocusedObjectId(place.id)}
    />
  );
};
