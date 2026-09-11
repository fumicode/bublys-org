/**
 * ekikyo 固有のオブジェクト型をレジストリに登録する
 *
 * 登録しないと ObjectView からドラッグはできても、宇宙やポケットが
 * 「知らない型」として受け取らない（受け入れ側は登録済みの型しか見ない）。
 */
import { registerObjectType } from "@bublys-org/bubbles-ui";
import ExploreIcon from "@mui/icons-material/Explore";
import React from "react";

/** 九星（一白・二黒…） */
registerObjectType("Kyusei", React.createElement(ExploreIcon, { fontSize: "small" }));
