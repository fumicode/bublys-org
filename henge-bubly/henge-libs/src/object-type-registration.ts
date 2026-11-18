/**
 * 化バブリが自分の型を名乗る。
 *
 * ★ 型名はレジストリ**全体で**共有される（モジュール単位のグローバル）ので、
 *   他のバブリと被らない名前にする。囲碁が `IgoGame` と `SekaisenIgoGame` の
 *   衝突で踏んだのと同じ所。
 */
import { registerObjectType } from "@bublys-org/bubbles-ui";
import TransformIcon from "@mui/icons-material/Transform";
import React from "react";

/** 掴んで運ぶときの型名 */
export const HENGE_GAME_OBJECT_TYPE = "HengeGame";

registerObjectType(
  HENGE_GAME_OBJECT_TYPE,
  React.createElement(TransformIcon, { fontSize: "small" }),
);
