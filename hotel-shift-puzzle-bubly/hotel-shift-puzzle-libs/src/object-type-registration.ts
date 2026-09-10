/**
 * このバブリのオブジェクト型を登録する（副作用）。
 *
 * 型の定義は objects/hotelObjects.ts に1箇所集約。ここでは登録を実行するだけ。
 *
 * それに加えて、世界線には保存されないが画面の上ではひとつの「もの」として振る舞う型
 * （シフト希望の月・入力表）も登録する。ObjectView の約束（ドラッグでき、ダブルクリックで
 * バブルが開く）を満たすにはドラッグ種別が要るため。名前は ui/viewObjectTypes.ts。
 */
import React from "react";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { registerObjectType } from "@bublys-org/bubbles-ui";
import { registerObjects } from "./objects/framework.js";
import { HOTEL_OBJECTS } from "./objects/hotelObjects.js";
import {
  SHIFT_WISH_MONTH_VIEW_TYPE,
  STAFF_SHIFT_WISH_SHEET_VIEW_TYPE,
} from "./ui/viewObjectTypes.js";

registerObjects(HOTEL_OBJECTS);

registerObjectType(
  SHIFT_WISH_MONTH_VIEW_TYPE,
  React.createElement(EditCalendarIcon, { fontSize: "small" })
);
registerObjectType(
  STAFF_SHIFT_WISH_SHEET_VIEW_TYPE,
  React.createElement(EditNoteIcon, { fontSize: "small" })
);
