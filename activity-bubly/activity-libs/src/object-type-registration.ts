/**
 * activity バブリが自分で名乗る ── 型（アイコン）・形（スキーマ）・開く先・見分け方。
 */
import {
  registerObjectType,
  registerObjectBubble,
  registerObjectUrl,
  registerObjectIdentity,
  registerObjectResolver,
} from "@bublys-org/bubbles-ui";
import { registerSchema } from "@bublys-org/domain-registry/schema";
import HikingIcon from "@mui/icons-material/Hiking";
import React from "react";
import { ACTIVITY_SHAPE, Activity_アクティビティ } from "./domain/Activity.domain.js";
import type { ActivityState } from "./slice/activity-slice.js";

registerObjectType("Activity", React.createElement(HikingIcon, { fontSize: "small" }));
registerObjectUrl("Activity", (id) => `activities/${id}`);
registerObjectBubble("Activity", { openingPosition: "bubble-side-right" });
registerObjectIdentity("Activity", {
  class: Activity_アクティビティ,
  getId: (obj) => (obj as Activity_アクティビティ).id,
});

/** 中身を訊かれたら答える（`map-libs` の同名ファイルの註） */
registerObjectResolver("Activity", (id, state) =>
  (state as { activity?: ActivityState }).activity?.activityList?.find((a) => a.id === id),
);

registerSchema("Activity", ACTIVITY_SHAPE);
