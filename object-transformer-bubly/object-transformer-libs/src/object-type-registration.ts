/**
 * object-transformer 固有のオブジェクト型をレジストリに登録する
 *
 * 登録しないと ObjectView からドラッグはできても、宇宙やポケットが
 * 「知らない型」として受け取らない（受け入れ側は登録済みの型しか見ない）。
 */
import { registerObjectType } from "@bublys-org/bubbles-ui";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import React from "react";

/** 変換のマッピングルール */
registerObjectType("MappingRule", React.createElement(SwapHorizIcon, { fontSize: "small" }));
