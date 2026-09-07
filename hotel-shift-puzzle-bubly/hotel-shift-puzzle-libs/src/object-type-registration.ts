/**
 * このバブリのオブジェクト型を登録する（副作用）。
 *
 * 型の定義は objects/hotelObjects.ts に1箇所集約。ここでは登録を実行するだけ。
 *
 * それに加えて、世界線には保存されないが画面の上ではひとつの「もの」として振る舞う型
 * （勤務日・責任者ルール）も登録する。ObjectView の約束（ドラッグでき、ダブルクリックで
 * バブルが開く）を満たすにはドラッグ種別が要るため。名前は ui/viewObjectTypes.ts。
 */
import React from "react";
import EventIcon from "@mui/icons-material/Event";
import GppGoodIcon from "@mui/icons-material/GppGood";
import { registerObjectType } from "@bublys-org/bubbles-ui";
import { registerObjects } from "./objects/framework.js";
import { HOTEL_OBJECTS } from "./objects/hotelObjects.js";
import {
  SCHEDULE_DAY_VIEW_TYPE,
  SCHEDULE_LEADER_RULE_VIEW_TYPE,
} from "./ui/viewObjectTypes.js";

registerObjects(HOTEL_OBJECTS);

registerObjectType(
  SCHEDULE_DAY_VIEW_TYPE,
  React.createElement(EventIcon, { fontSize: "small" })
);
registerObjectType(
  SCHEDULE_LEADER_RULE_VIEW_TYPE,
  React.createElement(GppGoodIcon, { fontSize: "small" })
);
